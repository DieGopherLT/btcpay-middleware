import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import {
  payoutWebhook,
  resetPayoutWebhookMiddleware,
} from '@/middlewares/webhooks/payoutWebhook';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { BTCPayWebhookSignatureError, BTCPayValidationError } from '@/utils/errors';
import { WebhookEventType } from '@/constants/statuses';

const SECRET = 'super-secret';

function buildSignedRequest(payload: object, secret = SECRET): Partial<Request> {
  const raw = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
  return {
    body: raw,
    headers: { 'btcpay-sig': sig },
  };
}

function buildResponse(): Partial<Response> {
  const res: Partial<Response> = { locals: {} };
  res.status = jest.fn(() => res as Response);
  res.json = jest.fn(() => res as Response);
  return res;
}

describe('payoutWebhook middleware', () => {
  beforeEach(() => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'apikey',
      storeId: 'store-1',
      webhookSecret: SECRET,
      errorHandling: 'next',
      onError: undefined,
    });
    resetPayoutWebhookMiddleware();
  });

  afterEach(() => {
    BTCPayConfiguration.reset();
  });

  it('dispatches each payout event to its callback', async () => {
    const onPayoutCreated = jest.fn();
    const onPayoutApproved = jest.fn();
    const onPayoutUpdated = jest.fn();

    const middleware = payoutWebhook({
      onPayoutCreated,
      onPayoutApproved,
      onPayoutUpdated,
    });

    const cases: Array<[WebhookEventType, jest.Mock]> = [
      [WebhookEventType.PAYOUT_CREATED, onPayoutCreated],
      [WebhookEventType.PAYOUT_APPROVED, onPayoutApproved],
      [WebhookEventType.PAYOUT_UPDATED, onPayoutUpdated],
    ];

    for (const [type, cb] of cases) {
      const payload = {
        type,
        payoutId: 'payout-1',
        storeId: 'store-1',
        deliveryId: 'd-1',
        webhookId: 'w-1',
        originalDeliveryId: 'd-1',
        isRedelivery: false,
        timestamp: 0,
      };
      const req = buildSignedRequest(payload);
      const res = buildResponse();
      await middleware(req as Request, res as Response, jest.fn());
      expect(cb).toHaveBeenCalledWith(payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
    }
  });

  it('forwards a BTCPayWebhookSignatureError when signature is invalid', async () => {
    const onPayoutUpdated = jest.fn();
    const middleware = payoutWebhook({ onPayoutUpdated });
    const req = buildSignedRequest(
      { type: WebhookEventType.PAYOUT_UPDATED, payoutId: 'payout-1' },
      'wrong-secret'
    );
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onPayoutUpdated).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(BTCPayWebhookSignatureError));
  });

  it('forwards BTCPayValidationError when raw body is missing and secret is set', async () => {
    const middleware = payoutWebhook({ onPayoutCreated: jest.fn() });
    const req: Partial<Request> = {
      body: { type: WebhookEventType.PAYOUT_CREATED },
      headers: { 'btcpay-sig': 'sha256=ignored' },
    };
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
  });

  it('skips signature check when no secret is configured', async () => {
    BTCPayConfiguration.configure({ webhookSecret: undefined });
    resetPayoutWebhookMiddleware();

    const onPayoutCreated = jest.fn();
    const middleware = payoutWebhook({ onPayoutCreated });
    const payload = { type: WebhookEventType.PAYOUT_CREATED, payoutId: 'payout-1' };
    const req: Partial<Request> = { body: payload, headers: {} };
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onPayoutCreated).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does nothing when no callback matches the event type', async () => {
    const onPayoutCreated = jest.fn();
    const middleware = payoutWebhook({ onPayoutCreated });
    const payload = {
      type: WebhookEventType.PAYOUT_UPDATED,
      payoutId: 'payout-1',
    };
    const req = buildSignedRequest(payload);
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onPayoutCreated).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('ignores unknown event types without throwing', async () => {
    const onPayoutCreated = jest.fn();
    const middleware = payoutWebhook({ onPayoutCreated });
    const payload = { type: 'SomeUnrelatedEvent', payoutId: 'payout-1' };
    const req = buildSignedRequest(payload);
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onPayoutCreated).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
