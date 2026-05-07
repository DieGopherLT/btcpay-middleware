import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  BTCPayApiError,
  BTCPayConfigError,
  BTCPayNetworkError,
} from '@/utils/errors';
import { BTCPayConfig } from '@/types/middleware.types';
import { CreateInvoiceRequest, BTCPayInvoice } from '@/types/api.types';

interface BTCPayClientOptions {
  baseURL: string;
  apiKey: string;
  storeId: string;
}

export class BTCPayClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly storeId: string;

  constructor(options: BTCPayClientOptions) {
    if (!options.baseURL) {
      throw new BTCPayConfigError('BTCPayClient: baseURL is required');
    }
    if (!options.apiKey) {
      throw new BTCPayConfigError('BTCPayClient: apiKey is required');
    }
    if (!options.storeId) {
      throw new BTCPayConfigError('BTCPayClient: storeId is required');
    }

    this.storeId = options.storeId;
    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${options.apiKey}`,
      },
    });

    this.setupInterceptors();
  }

  static fromConfig(config: BTCPayConfig): BTCPayClient {
    return new BTCPayClient({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      storeId: config.storeId,
    });
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<BTCPayInvoice> {
    const body = this.toGreenfieldInvoiceBody(data);
    const response = await this.axiosInstance.post<BTCPayInvoice>(
      `/api/v1/stores/${this.storeId}/invoices`,
      body
    );
    return response.data;
  }

  async getInvoice(invoiceId: string): Promise<BTCPayInvoice> {
    if (!invoiceId) {
      throw new BTCPayConfigError(
        'BTCPayClient.getInvoice: invoiceId is required'
      );
    }
    const response = await this.axiosInstance.get<BTCPayInvoice>(
      `/api/v1/stores/${this.storeId}/invoices/${invoiceId}`
    );
    return response.data;
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response) {
          const statusCode = error.response.status;
          const message = extractErrorMessage(error);
          throw new BTCPayApiError(message, statusCode, error);
        }
        if (error.request) {
          throw new BTCPayNetworkError(
            `BTCPayClient: network error — ${error.message}`,
            error
          );
        }
        throw new BTCPayNetworkError(
          `BTCPayClient: unknown error — ${error.message}`,
          error
        );
      }
    );
  }

  private toGreenfieldInvoiceBody(
    data: CreateInvoiceRequest
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = { ...(data.metadata ?? {}) };
    if (data.orderId !== undefined) metadata.orderId = data.orderId;
    if (data.buyerEmail !== undefined) metadata.buyerEmail = data.buyerEmail;
    if (data.description !== undefined) metadata.itemDesc = data.description;

    const body: Record<string, unknown> = {
      amount: data.amount,
      currency: data.currency,
      metadata,
    };
    if (data.checkout) body.checkout = data.checkout;
    return body;
  }
}

function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data as
    | { message?: string; code?: string; errors?: unknown }
    | undefined;
  if (data?.message) return data.message;
  if (data?.code) return data.code;
  return error.message;
}
