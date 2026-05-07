import { Request, Response, NextFunction } from 'express';
import {
  CreateInvoiceRequest,
  BTCPayInvoice,
  BTCPayWebhookPayload,
} from './api.types';

export type ErrorHandlingMode = 'next' | 'direct';

export type ErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export interface BTCPayConfig {
  baseURL: string;
  apiKey: string;
  storeId: string;
  webhookSecret?: string;
  errorHandling?: ErrorHandlingMode;
  onError?: ErrorHandler;
}

export interface RequestMapper<T> {
  (req: Request, res: Response): T;
}

export interface ResponseTransformer<T, U> {
  (response: T): U;
}

export interface CreateInvoiceMiddlewareOptions {
  mapRequest: RequestMapper<CreateInvoiceRequest>;
  transformResponse?: ResponseTransformer<BTCPayInvoice, unknown>;
  onError?: ErrorHandler;
}

export interface GetInvoiceMiddlewareOptions {
  mapRequest: RequestMapper<string>;
  transformResponse?: ResponseTransformer<BTCPayInvoice, unknown>;
  onError?: ErrorHandler;
}

export type AsyncCallback<T> = (payload: T) => void | Promise<void>;

export interface InvoiceWebhookCallbacks {
  onCreated?: AsyncCallback<BTCPayWebhookPayload>;
  onReceivedPayment?: AsyncCallback<BTCPayWebhookPayload>;
  onProcessing?: AsyncCallback<BTCPayWebhookPayload>;
  onSettled?: AsyncCallback<BTCPayWebhookPayload>;
  onPaymentSettled?: AsyncCallback<BTCPayWebhookPayload>;
  onExpired?: AsyncCallback<BTCPayWebhookPayload>;
  onInvalid?: AsyncCallback<BTCPayWebhookPayload>;
}

export interface InvoiceWebhookMiddlewareOptions extends InvoiceWebhookCallbacks {
  onError?: ErrorHandler;
}

export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

declare global {
  namespace Express {
    interface Locals {
      btcpayResponse?: unknown;
    }
  }
}
