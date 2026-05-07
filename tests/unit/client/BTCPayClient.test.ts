import axios, { AxiosError } from 'axios';
import { BTCPayClient } from '@/client/BTCPayClient';
import {
  BTCPayApiError,
  BTCPayConfigError,
  BTCPayNetworkError,
} from '@/utils/errors';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

interface MockAxiosInstance {
  post: jest.Mock;
  get: jest.Mock;
  interceptors: {
    response: { use: jest.Mock };
  };
}

function buildAxiosMock(): MockAxiosInstance {
  return {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      response: { use: jest.fn() },
    },
  };
}

describe('BTCPayClient', () => {
  let axiosMock: MockAxiosInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    axiosMock = buildAxiosMock();
    mockedAxios.create.mockReturnValue(axiosMock as never);
  });

  describe('constructor', () => {
    it('creates axios instance with token Authorization header', () => {
      new BTCPayClient({
        baseURL: 'https://btcpay.example.com',
        apiKey: 'apikey-123',
        storeId: 'store-1',
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://btcpay.example.com',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'token apikey-123',
        },
      });
    });

    it('throws when baseURL is missing', () => {
      expect(
        () =>
          new BTCPayClient({
            baseURL: '',
            apiKey: 'apikey',
            storeId: 'store',
          })
      ).toThrow(BTCPayConfigError);
    });

    it('throws when apiKey is missing', () => {
      expect(
        () =>
          new BTCPayClient({
            baseURL: 'https://btcpay.example.com',
            apiKey: '',
            storeId: 'store',
          })
      ).toThrow(BTCPayConfigError);
    });

    it('throws when storeId is missing', () => {
      expect(
        () =>
          new BTCPayClient({
            baseURL: 'https://btcpay.example.com',
            apiKey: 'apikey',
            storeId: '',
          })
      ).toThrow(BTCPayConfigError);
    });
  });

  describe('createInvoice', () => {
    it('POSTs to /api/v1/stores/:storeId/invoices with mapped body', async () => {
      const client = new BTCPayClient({
        baseURL: 'https://btcpay.example.com',
        apiKey: 'apikey-123',
        storeId: 'store-1',
      });
      const expectedInvoice = {
        id: 'inv-1',
        storeId: 'store-1',
        amount: '12.34',
        currency: 'USD',
        status: 'New',
        checkoutLink: 'https://btcpay.example.com/i/inv-1',
        monitoringExpiration: 0,
        expirationTime: 0,
        createdTime: 0,
      };
      axiosMock.post.mockResolvedValueOnce({ data: expectedInvoice });

      const result = await client.createInvoice({
        amount: 12.34,
        currency: 'USD',
        orderId: 'order-42',
        buyerEmail: 'buyer@example.com',
        description: 'A widget',
        metadata: { customField: 'value' },
      });

      expect(axiosMock.post).toHaveBeenCalledWith(
        '/api/v1/stores/store-1/invoices',
        {
          amount: 12.34,
          currency: 'USD',
          metadata: {
            customField: 'value',
            orderId: 'order-42',
            buyerEmail: 'buyer@example.com',
            itemDesc: 'A widget',
          },
        }
      );
      expect(result).toEqual(expectedInvoice);
    });

    it('forwards checkout options when provided', async () => {
      const client = new BTCPayClient({
        baseURL: 'https://btcpay.example.com',
        apiKey: 'apikey-123',
        storeId: 'store-1',
      });
      axiosMock.post.mockResolvedValueOnce({ data: {} });

      await client.createInvoice({
        amount: '5',
        currency: 'USD',
        checkout: {
          paymentMethods: ['BTC', 'BTC-LightningNetwork'],
          redirectURL: 'https://merchant.example/return',
        },
      });

      expect(axiosMock.post).toHaveBeenCalledWith(
        '/api/v1/stores/store-1/invoices',
        expect.objectContaining({
          checkout: {
            paymentMethods: ['BTC', 'BTC-LightningNetwork'],
            redirectURL: 'https://merchant.example/return',
          },
        })
      );
    });
  });

  describe('getInvoice', () => {
    it('GETs /api/v1/stores/:storeId/invoices/:invoiceId', async () => {
      const client = new BTCPayClient({
        baseURL: 'https://btcpay.example.com',
        apiKey: 'apikey-123',
        storeId: 'store-1',
      });
      const invoice = { id: 'inv-1', storeId: 'store-1', amount: '1' };
      axiosMock.get.mockResolvedValueOnce({ data: invoice });

      const result = await client.getInvoice('inv-1');

      expect(axiosMock.get).toHaveBeenCalledWith(
        '/api/v1/stores/store-1/invoices/inv-1'
      );
      expect(result).toEqual(invoice);
    });

    it('throws when invoiceId is empty', async () => {
      const client = new BTCPayClient({
        baseURL: 'https://btcpay.example.com',
        apiKey: 'apikey-123',
        storeId: 'store-1',
      });
      await expect(client.getInvoice('')).rejects.toThrow(BTCPayConfigError);
    });
  });

  describe('fromConfig', () => {
    it('builds a client from a BTCPayConfig object', () => {
      const client = BTCPayClient.fromConfig({
        baseURL: 'https://btcpay.example.com',
        apiKey: 'apikey-123',
        storeId: 'store-1',
      });
      expect(client).toBeInstanceOf(BTCPayClient);
    });
  });

  describe('response interceptor', () => {
    function getInterceptor(): (error: AxiosError) => never {
      const useMock = axiosMock.interceptors.response.use as jest.Mock;
      const call = useMock.mock.calls[0];
      return call[1] as (error: AxiosError) => never;
    }

    beforeEach(() => {
      new BTCPayClient({
        baseURL: 'https://btcpay.example.com',
        apiKey: 'apikey-123',
        storeId: 'store-1',
      });
    });

    it('converts an HTTP error response into BTCPayApiError', () => {
      const interceptor = getInterceptor();
      const error = {
        message: 'Request failed',
        response: {
          status: 400,
          data: { message: 'invoice rejected' },
        },
      } as AxiosError;

      try {
        interceptor(error);
        fail('expected interceptor to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BTCPayApiError);
        expect((err as BTCPayApiError).statusCode).toBe(400);
        expect((err as BTCPayApiError).message).toBe('invoice rejected');
      }
    });

    it('falls back to error.message when response has no message field', () => {
      const interceptor = getInterceptor();
      const error = {
        message: 'Request failed',
        response: { status: 500, data: {} },
      } as AxiosError;

      try {
        interceptor(error);
        fail('expected interceptor to throw');
      } catch (err) {
        expect((err as BTCPayApiError).message).toBe('Request failed');
      }
    });

    it('converts a network error (no response) into BTCPayNetworkError', () => {
      const interceptor = getInterceptor();
      const error = {
        message: 'ECONNREFUSED',
        request: {},
      } as AxiosError;

      try {
        interceptor(error);
        fail('expected interceptor to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BTCPayNetworkError);
        expect((err as BTCPayNetworkError).message).toContain('ECONNREFUSED');
      }
    });

    it('falls back to BTCPayNetworkError for unknown shapes', () => {
      const interceptor = getInterceptor();
      const error = { message: 'mystery' } as AxiosError;

      try {
        interceptor(error);
        fail('expected interceptor to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BTCPayNetworkError);
      }
    });
  });
});
