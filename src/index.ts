import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { createInvoice } from '@/middlewares/createInvoice';
import { getInvoice } from '@/middlewares/getInvoice';
import { invoiceWebhook } from '@/middlewares/webhooks/invoiceWebhook';
import { createPayout } from '@/middlewares/createPayout';
import { getPayout } from '@/middlewares/getPayout';
import { payoutWebhook } from '@/middlewares/webhooks/payoutWebhook';
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
  createPayout,
  getPayout,
  payoutWebhook,
  BTCPayClient,
  BTCPayConfiguration,
};

export const BTCPayMiddleware = {
  configure: BTCPayConfiguration.configure.bind(BTCPayConfiguration),
  createInvoice,
  getInvoice,
  invoiceWebhook,
  createPayout,
  getPayout,
  payoutWebhook,
};
