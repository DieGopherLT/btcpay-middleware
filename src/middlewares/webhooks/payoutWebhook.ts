import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import {
  ExpressMiddleware,
  PayoutWebhookMiddlewareOptions,
  BTCPayPayoutWebhookPayload,
} from '@/types';
import { WebhookEventType } from '@/constants/statuses';
import {
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@/utils/webhookSignature';
import { BTCPayValidationError } from '@/utils/errors';

class PayoutWebhookMiddleware extends BaseMiddleware {
  create(options: PayoutWebhookMiddlewareOptions): ExpressMiddleware {
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

  private extractPayload(req: Request): BTCPayPayoutWebhookPayload {
    const config = BTCPayConfiguration.getConfig();
    const signature = readHeader(req, WEBHOOK_SIGNATURE_HEADER);

    if (config.webhookSecret) {
      if (!Buffer.isBuffer(req.body)) {
        throw new BTCPayValidationError(
          'payoutWebhook: raw body required for HMAC verification — mount express.raw({ type: "application/json" }) before this middleware'
        );
      }
      verifyWebhookSignature(req.body, signature, config.webhookSecret);
      return JSON.parse(req.body.toString('utf8')) as BTCPayPayoutWebhookPayload;
    }

    if (Buffer.isBuffer(req.body)) {
      return JSON.parse(req.body.toString('utf8')) as BTCPayPayoutWebhookPayload;
    }

    return req.body as BTCPayPayoutWebhookPayload;
  }

  private async dispatch(
    callbacks: Omit<PayoutWebhookMiddlewareOptions, 'onError'>,
    payload: BTCPayPayoutWebhookPayload
  ): Promise<void> {
    switch (payload.type) {
      case WebhookEventType.PAYOUT_CREATED:
        if (callbacks.onPayoutCreated) await callbacks.onPayoutCreated(payload);
        return;
      case WebhookEventType.PAYOUT_APPROVED:
        if (callbacks.onPayoutApproved) await callbacks.onPayoutApproved(payload);
        return;
      case WebhookEventType.PAYOUT_UPDATED:
        if (callbacks.onPayoutUpdated) await callbacks.onPayoutUpdated(payload);
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

let payoutWebhookMiddleware: PayoutWebhookMiddleware | null = null;

function getPayoutWebhookMiddleware(): PayoutWebhookMiddleware {
  if (!payoutWebhookMiddleware) {
    payoutWebhookMiddleware = new PayoutWebhookMiddleware();
  }
  return payoutWebhookMiddleware;
}

export function resetPayoutWebhookMiddleware(): void {
  payoutWebhookMiddleware = null;
}

export const payoutWebhook = (
  options: PayoutWebhookMiddlewareOptions
): ExpressMiddleware => getPayoutWebhookMiddleware().create(options);
