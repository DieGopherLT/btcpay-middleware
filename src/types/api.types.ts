import {
  InvoiceStatus,
  InvoiceAdditionalStatus,
  InvoiceType,
  WebhookEventType,
} from '@/constants/statuses';

export interface InvoiceCheckoutOptions {
  speedPolicy?: 'HighSpeed' | 'MediumSpeed' | 'LowSpeed' | 'LowMediumSpeed';
  paymentMethods?: string[];
  defaultPaymentMethod?: string;
  lazyPaymentMethods?: boolean;
  expirationMinutes?: number;
  monitoringMinutes?: number;
  paymentTolerance?: number;
  redirectURL?: string;
  redirectAutomatically?: boolean;
  defaultLanguage?: string;
}

export interface CreateInvoiceRequest {
  amount?: string;
  currency?: string;
  orderId?: string;
  buyerEmail?: string;
  description?: string;
  additionalSearchTerms?: string[];
  checkout?: InvoiceCheckoutOptions;
  receipt?: BTCPayInvoiceReceipt;
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
  paidAmount?: string;
  currency: string;
  type?: InvoiceType | `${InvoiceType}`;
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

export interface BTCPayPaymentMethod {
  paymentMethodId: string;
  currency: string;
  destination: string;
  paymentLink: string | null;
  amount: string;
  due: string;
  rate: string;
  activated: boolean;
}

export interface BTCPayInvoiceWithPaymentMethods extends BTCPayInvoice {
  paymentMethods: BTCPayPaymentMethod[];
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
