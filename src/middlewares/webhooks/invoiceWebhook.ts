import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import {
  ExpressMiddleware,
  InvoiceWebhookMiddlewareOptions,
  BTCPayWebhookPayload,
} from '@/types';
import { WebhookEventType } from '@/constants/statuses';
import {
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@/utils/webhookSignature';
import { BTCPayValidationError } from '@/utils/errors';

class InvoiceWebhookMiddleware extends BaseMiddleware {
  create(options: InvoiceWebhookMiddlewareOptions): ExpressMiddleware {
    const { onError, ...callbacks } = options;
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const payload = this.extractPayload(req);

        await this.dispatch(callbacks, payload);

        this.saveToLocals(res, payload);
        res.status(200).json({ status: 'ok' });
      } catch (error) {
        await this.handleError(error, req, res, next, onError);
      }
    };
  }

  private extractPayload(req: Request): BTCPayWebhookPayload {
    const config = BTCPayConfiguration.getConfig();
    const signature = readHeader(req, WEBHOOK_SIGNATURE_HEADER);

    if (config.webhookSecret) {
      if (!Buffer.isBuffer(req.body)) {
        throw new BTCPayValidationError(
          'invoiceWebhook: raw body required for HMAC verification — mount express.raw({ type: "application/json" }) before this middleware'
        );
      }
      verifyWebhookSignature(req.body, signature, config.webhookSecret);
      return JSON.parse(req.body.toString('utf8')) as BTCPayWebhookPayload;
    }

    if (Buffer.isBuffer(req.body)) {
      return JSON.parse(req.body.toString('utf8')) as BTCPayWebhookPayload;
    }

    return req.body as BTCPayWebhookPayload;
  }

  private async dispatch(
    callbacks: Omit<InvoiceWebhookMiddlewareOptions, 'onError'>,
    payload: BTCPayWebhookPayload
  ): Promise<void> {
    switch (payload.type) {
      case WebhookEventType.INVOICE_CREATED:
        if (callbacks.onCreated) await callbacks.onCreated(payload);
        return;
      case WebhookEventType.INVOICE_RECEIVED_PAYMENT:
        if (callbacks.onReceivedPayment)
          await callbacks.onReceivedPayment(payload);
        return;
      case WebhookEventType.INVOICE_PROCESSING:
        if (callbacks.onProcessing) await callbacks.onProcessing(payload);
        return;
      case WebhookEventType.INVOICE_SETTLED:
        if (callbacks.onSettled) await callbacks.onSettled(payload);
        return;
      case WebhookEventType.INVOICE_PAYMENT_SETTLED:
        if (callbacks.onPaymentSettled)
          await callbacks.onPaymentSettled(payload);
        return;
      case WebhookEventType.INVOICE_EXPIRED:
        if (callbacks.onExpired) await callbacks.onExpired(payload);
        return;
      case WebhookEventType.INVOICE_INVALID:
        if (callbacks.onInvalid) await callbacks.onInvalid(payload);
        return;
      default:
        return;
    }
  }
}

function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

let invoiceWebhookMiddleware: InvoiceWebhookMiddleware | null = null;

function getInvoiceWebhookMiddleware(): InvoiceWebhookMiddleware {
  if (!invoiceWebhookMiddleware) {
    invoiceWebhookMiddleware = new InvoiceWebhookMiddleware();
  }
  return invoiceWebhookMiddleware;
}

export function resetInvoiceWebhookMiddleware(): void {
  invoiceWebhookMiddleware = null;
}

export const invoiceWebhook = (
  options: InvoiceWebhookMiddlewareOptions
): ExpressMiddleware => getInvoiceWebhookMiddleware().create(options);
