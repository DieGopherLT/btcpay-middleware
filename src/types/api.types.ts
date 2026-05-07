import {
  InvoiceStatus,
  InvoiceAdditionalStatus,
  WebhookEventType,
} from '@/constants/statuses';

export type InvoiceCheckoutType = 'V1' | 'V2';

export interface InvoiceCheckoutOptions {
  speedPolicy?: 'HighSpeed' | 'MediumSpeed' | 'LowSpeed' | 'LowMediumSpeed';
  paymentMethods?: string[];
  defaultPaymentMethod?: string;
  expirationMinutes?: number;
  monitoringMinutes?: number;
  paymentTolerance?: number;
  redirectURL?: string;
  redirectAutomatically?: boolean;
  defaultLanguage?: string;
  checkoutType?: InvoiceCheckoutType;
  requiresRefundEmail?: boolean;
}

export interface CreateInvoiceRequest {
  amount: number | string;
  currency: string;
  orderId?: string;
  buyerEmail?: string;
  description?: string;
  checkout?: InvoiceCheckoutOptions;
  metadata?: Record<string, unknown>;
}

export interface BTCPayInvoiceReceipt {
  enabled?: boolean;
  showQR?: boolean;
  showPayments?: boolean;
}

export interface BTCPayInvoice {
  id: string;
  storeId: string;
  amount: string;
  currency: string;
  status: InvoiceStatus | `${InvoiceStatus}`;
  additionalStatus?: InvoiceAdditionalStatus | `${InvoiceAdditionalStatus}`;
  checkoutLink: string;
  monitoringExpiration: number;
  expirationTime: number;
  createdTime: number;
  availableStatusesForManualMarking?: string[];
  archived?: boolean;
  metadata?: Record<string, unknown>;
  checkout?: InvoiceCheckoutOptions;
  receipt?: BTCPayInvoiceReceipt;
}

export interface BTCPayWebhookPayload {
  deliveryId: string;
  webhookId: string;
  originalDeliveryId: string;
  isRedelivery: boolean;
  type: WebhookEventType | `${WebhookEventType}`;
  timestamp: number;
  storeId: string;
  invoiceId: string;
  metadata?: Record<string, unknown>;
  manuallyMarked?: boolean;
  overPaid?: boolean;
  partiallyPaid?: boolean;
  paymentMethodId?: string;
  payment?: Record<string, unknown>;
}
