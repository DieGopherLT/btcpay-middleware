import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { createInvoice } from '@/middlewares/createInvoice';
import { getInvoice } from '@/middlewares/getInvoice';
import { invoiceWebhook } from '@/middlewares/webhooks/invoiceWebhook';
import { BTCPayClient } from '@/client/BTCPayClient';

export * from '@/types';
export * from '@/utils/errors';
export * from '@/constants/statuses';
export {
  verifyWebhookSignature,
  computeSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@/utils/webhookSignature';

export {
  createInvoice,
  getInvoice,
  invoiceWebhook,
  BTCPayClient,
  BTCPayConfiguration,
};

export const BTCPayMiddleware = {
  configure: BTCPayConfiguration.configure.bind(BTCPayConfiguration),
  createInvoice,
  getInvoice,
  invoiceWebhook,
};
