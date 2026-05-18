import { Request, Response, NextFunction } from 'express';
import { CreatePayoutMiddlewareOptions, PayoutMethod } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';

const mockCreatePayout = jest.fn();
jest.mock('@/client/BTCPayClient', () => ({
  BTCPayClient: {
    fromConfig: jest.fn(() => ({
      createPayout: mockCreatePayout,
    })),
  },
}));

import {
  createPayout,
  resetCreatePayoutMiddleware,
} from '@/middlewares/createPayout';

describe('createPayout middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'apikey',
      storeId: 'store-1',
    });
    resetCreatePayoutMiddleware();
    mockCreatePayout.mockReset();

    req = {
      body: {
        wallet: 'bc1qexample',
        amount: '25.00',
        method: 'BTC-CHAIN',
        referralId: 'ref-42',
      },
    };
    res = { locals: {} };
    next = jest.fn();
  });

  afterEach(() => {
    BTCPayConfiguration.reset();
  });

  it('creates a payout and calls next()', async () => {
    const options: CreatePayoutMiddlewareOptions = {
      mapRequest: r => ({
        destination: r.body.wallet,
        amount: r.body.amount,
        payoutMethodId: r.body.method,
        metadata: { referralId: r.body.referralId },
      }),
    };

    const apiResponse = {
      id: 'payout-1',
      revision: 0,
      date: '1700000000',
      destination: 'bc1qexample',
      originalCurrency: 'USD',
      originalAmount: '25.00',
      payoutCurrency: 'BTC',
      payoutMethodId: 'BTC-CHAIN',
      state: 'AwaitingPayment',
    };
    mockCreatePayout.mockResolvedValueOnce(apiResponse);

    const middleware = createPayout(options);
    await middleware(req as Request, res as Response, next);

    expect(mockCreatePayout).toHaveBeenCalledWith({
      destination: 'bc1qexample',
      amount: '25.00',
      payoutMethodId: 'BTC-CHAIN',
      metadata: { referralId: 'ref-42' },
    });
    expect(res.locals!.btcpayResponse).toEqual(apiResponse);
    expect(next).toHaveBeenCalledWith();
  });

  it('applies transformResponse to the response', async () => {
    const options: CreatePayoutMiddlewareOptions = {
      mapRequest: r => ({
        destination: r.body.wallet,
        amount: r.body.amount,
        payoutMethodId: r.body.method,
      }),
      transformResponse: payout => ({
        payoutId: payout.id,
        state: payout.state,
      }),
    };

    mockCreatePayout.mockResolvedValueOnce({ id: 'payout-2', state: 'InProgress' });

    const middleware = createPayout(options);
    await middleware(req as Request, res as Response, next);

    expect(res.locals!.btcpayResponse).toEqual({
      payoutId: 'payout-2',
      state: 'InProgress',
    });
  });

  it('passes arbitrary metadata pass-through to the client', async () => {
    const metadata = {
      referralId: 'ref-42',
      userId: 'user-99',
      campaign: { name: 'spring-2026', tier: 3 },
    };
    const options: CreatePayoutMiddlewareOptions = {
      mapRequest: r => ({
        destination: r.body.wallet,
        amount: r.body.amount,
        payoutMethodId: r.body.method,
        metadata,
      }),
    };

    mockCreatePayout.mockResolvedValueOnce({ id: 'payout-3' });

    const middleware = createPayout(options);
    await middleware(req as Request, res as Response, next);

    expect(mockCreatePayout).toHaveBeenCalledWith(
      expect.objectContaining({ metadata })
    );
  });

  it('forwards to next(error) when destination is missing', async () => {
    const options: CreatePayoutMiddlewareOptions = {
      mapRequest: () => ({ destination: '', amount: '10', payoutMethodId: PayoutMethod.BTC_CHAIN }),
    };
    const middleware = createPayout(options);
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
    expect(mockCreatePayout).not.toHaveBeenCalled();
  });

  it('forwards to next(error) when amount is missing', async () => {
    const options: CreatePayoutMiddlewareOptions = {
      mapRequest: () => ({ destination: 'bc1q', amount: '', payoutMethodId: PayoutMethod.BTC_CHAIN }),
    };
    const middleware = createPayout(options);
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
  });

  it('forwards to next(error) when payoutMethodId is missing', async () => {
    const options: CreatePayoutMiddlewareOptions = {
      mapRequest: () => ({ destination: 'bc1q', amount: '10', payoutMethodId: '' as PayoutMethod }),
    };
    const middleware = createPayout(options);
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
  });

  it('uses per-middleware onError when provided', async () => {
    const onError = jest.fn();
    const options: CreatePayoutMiddlewareOptions = {
      mapRequest: () => ({ destination: '', amount: '10', payoutMethodId: PayoutMethod.BTC_CHAIN }),
      onError,
    };
    const middleware = createPayout(options);
    await middleware(req as Request, res as Response, next);

    expect(onError).toHaveBeenCalledWith(
      expect.any(BTCPayValidationError),
      req,
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards client errors to next when errorHandling is the default', async () => {
    mockCreatePayout.mockRejectedValueOnce(new Error('boom'));
    const middleware = createPayout({
      mapRequest: () => ({ destination: 'bc1q', amount: '10', payoutMethodId: PayoutMethod.BTC_CHAIN }),
    });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
