import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { invoiceWebhook, resetInvoiceWebhookMiddleware } from '@/middlewares/webhooks/invoiceWebhook';
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

describe('invoiceWebhook middleware', () => {
  beforeEach(() => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'apikey',
      storeId: 'store-1',
      webhookSecret: SECRET,
      errorHandling: 'next',
      onError: undefined,
    });
    resetInvoiceWebhookMiddleware();
  });

  afterEach(() => {
    BTCPayConfiguration.reset();
  });

  it('dispatches onSettled when type is InvoiceSettled', async () => {
    const onSettled = jest.fn();
    const middleware = invoiceWebhook({ onSettled });
    const payload = {
      type: WebhookEventType.INVOICE_SETTLED,
      invoiceId: 'inv-1',
      storeId: 'store-1',
      deliveryId: 'd-1',
      webhookId: 'w-1',
      originalDeliveryId: 'd-1',
      isRedelivery: false,
      timestamp: 0,
    };
    const req = buildSignedRequest(payload);
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onSettled).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('dispatches each event to its callback', async () => {
    const onCreated = jest.fn();
    const onReceivedPayment = jest.fn();
    const onProcessing = jest.fn();
    const onPaymentSettled = jest.fn();
    const onExpired = jest.fn();
    const onInvalid = jest.fn();

    const middleware = invoiceWebhook({
      onCreated,
      onReceivedPayment,
      onProcessing,
      onPaymentSettled,
      onExpired,
      onInvalid,
    });

    const cases: Array<[WebhookEventType, jest.Mock]> = [
      [WebhookEventType.INVOICE_CREATED, onCreated],
      [WebhookEventType.INVOICE_RECEIVED_PAYMENT, onReceivedPayment],
      [WebhookEventType.INVOICE_PROCESSING, onProcessing],
      [WebhookEventType.INVOICE_PAYMENT_SETTLED, onPaymentSettled],
      [WebhookEventType.INVOICE_EXPIRED, onExpired],
      [WebhookEventType.INVOICE_INVALID, onInvalid],
    ];

    for (const [type, cb] of cases) {
      const payload = {
        type,
        invoiceId: 'inv-1',
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
    }
  });

  it('forwards a BTCPayWebhookSignatureError when signature is invalid', async () => {
    const onSettled = jest.fn();
    const middleware = invoiceWebhook({ onSettled });
    const req = buildSignedRequest(
      { type: WebhookEventType.INVOICE_SETTLED, invoiceId: 'inv-1' },
      'wrong-secret'
    );
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onSettled).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(BTCPayWebhookSignatureError));
  });

  it('forwards BTCPayValidationError when raw body is missing and secret is set', async () => {
    const middleware = invoiceWebhook({ onSettled: jest.fn() });
    const req: Partial<Request> = {
      body: { type: WebhookEventType.INVOICE_SETTLED },
      headers: { 'btcpay-sig': 'sha256=ignored' },
    };
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(BTCPayValidationError));
  });

  it('skips signature check when no secret is configured', async () => {
    BTCPayConfiguration.configure({ webhookSecret: undefined });
    resetInvoiceWebhookMiddleware();

    const onSettled = jest.fn();
    const middleware = invoiceWebhook({ onSettled });
    const payload = { type: WebhookEventType.INVOICE_SETTLED, invoiceId: 'inv-1' };
    const req: Partial<Request> = { body: payload, headers: {} };
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onSettled).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does nothing when no callback matches the event type', async () => {
    const onSettled = jest.fn();
    const middleware = invoiceWebhook({ onSettled });
    const payload = {
      type: WebhookEventType.INVOICE_CREATED,
      invoiceId: 'inv-1',
    };
    const req = buildSignedRequest(payload);
    const res = buildResponse();
    const next = jest.fn();

    await middleware(req as Request, res as Response, next);

    expect(onSettled).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
