import { Request, Response, NextFunction } from 'express';
import { GetPayoutMiddlewareOptions } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';

const mockGetPayout = jest.fn();
jest.mock('@/client/BTCPayClient', () => ({
  BTCPayClient: {
    fromConfig: jest.fn(() => ({ getPayout: mockGetPayout })),
  },
}));

import {
  getPayout,
  resetGetPayoutMiddleware,
} from '@/middlewares/getPayout';

describe('getPayout middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'apikey',
      storeId: 'store-1',
    });
    resetGetPayoutMiddleware();
    mockGetPayout.mockReset();

    req = { params: { id: 'payout-42' } };
    res = { locals: {} };
    next = jest.fn();
  });

  afterEach(() => {
    BTCPayConfiguration.reset();
  });

  it('fetches payout by id and stores response', async () => {
    const options: GetPayoutMiddlewareOptions = {
      mapRequest: r => (r.params as Record<string, string>).id,
    };
    const apiResponse = { id: 'payout-42', state: 'Completed' };
    mockGetPayout.mockResolvedValueOnce(apiResponse);

    const middleware = getPayout(options);
    await middleware(req as Request, res as Response, next);

    expect(mockGetPayout).toHaveBeenCalledWith('payout-42');
    expect(res.locals!.btcpayResponse).toEqual(apiResponse);
    expect(next).toHaveBeenCalledWith();
  });

  it('applies transformResponse when provided', async () => {
    const options: GetPayoutMiddlewareOptions = {
      mapRequest: r => (r.params as Record<string, string>).id,
      transformResponse: p => ({ id: p.id, status: p.state }),
    };
    mockGetPayout.mockResolvedValueOnce({ id: 'payout-42', state: 'Completed' });

    const middleware = getPayout(options);
    await middleware(req as Request, res as Response, next);

    expect(res.locals!.btcpayResponse).toEqual({ id: 'payout-42', status: 'Completed' });
  });

  it('forwards a validation error when mapRequest returns empty', async () => {
    const options: GetPayoutMiddlewareOptions = {
      mapRequest: () => '',
    };
    const middleware = getPayout(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
    expect(mockGetPayout).not.toHaveBeenCalled();
  });
});
