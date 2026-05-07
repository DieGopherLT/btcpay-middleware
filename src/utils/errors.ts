export class BTCPayError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'BTCPayError';
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export class BTCPayApiError extends BTCPayError {
  constructor(message: string, statusCode: number, originalError?: unknown) {
    super(message, 'API_ERROR', statusCode, originalError);
    this.name = 'BTCPayApiError';
  }
}

export class BTCPayConfigError extends BTCPayError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'CONFIG_ERROR', undefined, originalError);
    this.name = 'BTCPayConfigError';
  }
}

export class BTCPayValidationError extends BTCPayError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'VALIDATION_ERROR', undefined, originalError);
    this.name = 'BTCPayValidationError';
  }
}

export class BTCPayNetworkError extends BTCPayError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, originalError);
    this.name = 'BTCPayNetworkError';
  }
}

export class BTCPayWebhookSignatureError extends BTCPayError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'WEBHOOK_SIGNATURE_ERROR', 401, originalError);
    this.name = 'BTCPayWebhookSignatureError';
  }
}
