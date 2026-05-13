import { Request, Response, NextFunction } from 'express';
import { CreateInvoiceMiddlewareOptions } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';

const mockCreateInvoice = jest.fn();
const mockGetPaymentMethods = jest.fn();
jest.mock('@/client/BTCPayClient', () => ({
  BTCPayClient: {
    fromConfig: jest.fn(() => ({
      createInvoice: mockCreateInvoice,
      getPaymentMethods: mockGetPaymentMethods,
    })),
  },
}));

import {
  createInvoice,
  resetCreateInvoiceMiddleware,
} from '@/middlewares/createInvoice';

describe('createInvoice middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'apikey',
      storeId: 'store-1',
    });
    resetCreateInvoiceMiddleware();
    mockCreateInvoice.mockReset();
    mockGetPaymentMethods.mockReset();

    req = {
      body: { total: '100', currency: 'USD', orderId: 'order-1' },
    };
    res = { locals: {} };
    next = jest.fn();
  });

  afterEach(() => {
    BTCPayConfiguration.reset();
  });

  it('creates an invoice and calls next()', async () => {
    const options: CreateInvoiceMiddlewareOptions = {
      mapRequest: r => ({
        amount: r.body.total,
        currency: r.body.currency,
        orderId: r.body.orderId,
      }),
    };

    const apiResponse = {
      id: 'inv-1',
      storeId: 'store-1',
      amount: '100',
      currency: 'USD',
      status: 'New',
      checkoutLink: 'https://btcpay.example.com/i/inv-1',
      monitoringExpiration: 0,
      expirationTime: 0,
      createdTime: 0,
    };
    mockCreateInvoice.mockResolvedValueOnce(apiResponse);

    const middleware = createInvoice(options);
    await middleware(req as Request, res as Response, next);

    expect(mockCreateInvoice).toHaveBeenCalledWith({
      amount: '100',
      currency: 'USD',
      orderId: 'order-1',
    });
    expect(res.locals!.btcpayResponse).toEqual(apiResponse);
    expect(next).toHaveBeenCalledWith();
  });

  it('applies transformResponse to the response', async () => {
    const options: CreateInvoiceMiddlewareOptions = {
      mapRequest: r => ({ amount: r.body.total, currency: r.body.currency }),
      transformResponse: invoice => ({
        invoiceId: invoice.id,
        checkoutUrl: invoice.checkoutLink,
      }),
    };

    mockCreateInvoice.mockResolvedValueOnce({
      id: 'inv-2',
      checkoutLink: 'https://btcpay.example.com/i/inv-2',
    });

    const middleware = createInvoice(options);
    await middleware(req as Request, res as Response, next);

    expect(res.locals!.btcpayResponse).toEqual({
      invoiceId: 'inv-2',
      checkoutUrl: 'https://btcpay.example.com/i/inv-2',
    });
  });

  it('forwards to next(error) when amount is missing', async () => {
    const options: CreateInvoiceMiddlewareOptions = {
      mapRequest: () => ({ amount: undefined as unknown as string, currency: 'USD' }),
    };
    const middleware = createInvoice(options);
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('forwards to next(error) when currency is missing', async () => {
    const options: CreateInvoiceMiddlewareOptions = {
      mapRequest: () => ({ amount: '1', currency: '' }),
    };
    const middleware = createInvoice(options);
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
  });

  it('uses per-middleware onError when provided', async () => {
    const onError = jest.fn();
    const options: CreateInvoiceMiddlewareOptions = {
      mapRequest: () => ({ amount: '0', currency: '' }),
      onError,
    };
    const middleware = createInvoice(options);
    await middleware(req as Request, res as Response, next);

    expect(onError).toHaveBeenCalledWith(
      expect.any(BTCPayValidationError),
      req,
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('uses global config.onError when no per-middleware handler is provided', async () => {
    const globalOnError = jest.fn();
    BTCPayConfiguration.configure({ onError: globalOnError });
    resetCreateInvoiceMiddleware();

    const middleware = createInvoice({
      mapRequest: () => ({ amount: '0', currency: '' }),
    });
    await middleware(req as Request, res as Response, next);

    expect(globalOnError).toHaveBeenCalledWith(
      expect.any(BTCPayValidationError),
      req,
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('responds directly when errorHandling is "direct"', async () => {
    BTCPayConfiguration.configure({ errorHandling: 'direct', onError: undefined });
    resetCreateInvoiceMiddleware();

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    res.status = status as never;
    res.json = json as never;

    const middleware = createInvoice({
      mapRequest: () => ({ amount: '0', currency: '' }),
    });
    await middleware(req as Request, res as Response, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('amount and currency'),
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds with 500 INTERNAL_ERROR for non-BTCPayError when errorHandling is "direct"', async () => {
    BTCPayConfiguration.configure({ errorHandling: 'direct', onError: undefined });
    resetCreateInvoiceMiddleware();

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    res.status = status as never;
    res.json = json as never;

    mockCreateInvoice.mockRejectedValueOnce(new Error('boom'));

    const middleware = createInvoice({
      mapRequest: () => ({ amount: '1', currency: 'USD' }),
    });
    await middleware(req as Request, res as Response, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  describe('fetchPaymentMethods option', () => {
    const baseInvoice = {
      id: 'inv-pm',
      storeId: 'store-1',
      amount: '100',
      currency: 'USD',
      status: 'New',
      checkoutLink: 'https://btcpay.example.com/i/inv-pm',
      monitoringExpiration: 0,
      expirationTime: 0,
      createdTime: 0,
    };

    const paymentMethods = [
      {
        paymentMethodId: 'BTC-CHAIN',
        currency: 'BTC',
        destination: 'bc1qexample',
        paymentLink: 'bitcoin:bc1qexample?amount=0.00015',
        amount: '0.00015',
        due: '0.00015',
        rate: '64000',
        activated: true,
      },
    ];

    it('fetches payment methods and saves BTCPayInvoiceWithPaymentMethods to locals', async () => {
      mockCreateInvoice.mockResolvedValueOnce(baseInvoice);
      mockGetPaymentMethods.mockResolvedValueOnce(paymentMethods);

      const middleware = createInvoice({
        mapRequest: r => ({ amount: r.body.total, currency: r.body.currency }),
        fetchPaymentMethods: true,
      });
      await middleware(req as Request, res as Response, next);

      expect(mockGetPaymentMethods).toHaveBeenCalledWith('inv-pm');
      expect(res.locals!.btcpayResponse).toEqual({
        ...baseInvoice,
        paymentMethods,
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('passes error to next when getPaymentMethods fails', async () => {
      mockCreateInvoice.mockResolvedValueOnce(baseInvoice);
      mockGetPaymentMethods.mockRejectedValueOnce(new Error('network error'));

      const middleware = createInvoice({
        mapRequest: r => ({ amount: r.body.total, currency: r.body.currency }),
        fetchPaymentMethods: true,
      });
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.locals!.btcpayResponse).toBeUndefined();
    });

    it('does not call getPaymentMethods when fetchPaymentMethods is absent', async () => {
      mockCreateInvoice.mockResolvedValueOnce(baseInvoice);

      const middleware = createInvoice({
        mapRequest: r => ({ amount: r.body.total, currency: r.body.currency }),
      });
      await middleware(req as Request, res as Response, next);

      expect(mockGetPaymentMethods).not.toHaveBeenCalled();
      expect(res.locals!.btcpayResponse).toEqual(baseInvoice);
    });
  });
});
