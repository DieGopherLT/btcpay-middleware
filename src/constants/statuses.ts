export enum InvoiceStatus {
  NEW = 'New',
  PROCESSING = 'Processing',
  EXPIRED = 'Expired',
  INVALID = 'Invalid',
  SETTLED = 'Settled',
}

export enum InvoiceAdditionalStatus {
  NONE = 'None',
  PAID_PARTIAL = 'PaidPartial',
  PAID_LATE = 'PaidLate',
  PAID_OVER = 'PaidOver',
  MARKED = 'Marked',
  INVALID = 'Invalid',
}

export enum InvoiceType {
  STANDARD = 'Standard',
  TOP_UP = 'TopUp',
}

export enum WebhookEventType {
  INVOICE_CREATED = 'InvoiceCreated',
  INVOICE_RECEIVED_PAYMENT = 'InvoiceReceivedPayment',
  INVOICE_PROCESSING = 'InvoiceProcessing',
  INVOICE_SETTLED = 'InvoiceSettled',
  INVOICE_PAYMENT_SETTLED = 'InvoicePaymentSettled',
  INVOICE_EXPIRED = 'InvoiceExpired',
  INVOICE_INVALID = 'InvoiceInvalid',
}

export const ALL_INVOICE_STATUSES = Object.values(InvoiceStatus);
export const ALL_WEBHOOK_EVENT_TYPES = Object.values(WebhookEventType);
