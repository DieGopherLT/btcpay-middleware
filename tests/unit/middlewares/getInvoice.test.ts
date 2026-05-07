import { Request, Response, NextFunction } from 'express';
import { GetInvoiceMiddlewareOptions } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';

const mockGetInvoice = jest.fn();
jest.mock('@/client/BTCPayClient', () => ({
  BTCPayClient: {
    fromConfig: jest.fn(() => ({ getInvoice: mockGetInvoice })),
  },
}));

import {
  getInvoice,
  resetGetInvoiceMiddleware,
} from '@/middlewares/getInvoice';

describe('getInvoice middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'apikey',
      storeId: 'store-1',
    });
    resetGetInvoiceMiddleware();
    mockGetInvoice.mockReset();

    req = { params: { id: 'inv-42' } };
    res = { locals: {} };
    next = jest.fn();
  });

  afterEach(() => {
    BTCPayConfiguration.reset();
  });

  it('fetches invoice by id and stores response', async () => {
    const options: GetInvoiceMiddlewareOptions = {
      mapRequest: r => (r.params as Record<string, string>).id,
    };
    const apiResponse = { id: 'inv-42', status: 'Settled' };
    mockGetInvoice.mockResolvedValueOnce(apiResponse);

    const middleware = getInvoice(options);
    await middleware(req as Request, res as Response, next);

    expect(mockGetInvoice).toHaveBeenCalledWith('inv-42');
    expect(res.locals!.btcpayResponse).toEqual(apiResponse);
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards a validation error when mapRequest returns empty', async () => {
    const options: GetInvoiceMiddlewareOptions = {
      mapRequest: () => '',
    };
    const middleware = getInvoice(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
    expect(mockGetInvoice).not.toHaveBeenCalled();
  });
});
