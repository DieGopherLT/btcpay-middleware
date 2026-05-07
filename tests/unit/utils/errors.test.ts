import {
  BTCPayError,
  BTCPayApiError,
  BTCPayConfigError,
  BTCPayValidationError,
  BTCPayNetworkError,
  BTCPayWebhookSignatureError,
} from '@/utils/errors';

describe('Error classes', () => {
  describe('BTCPayError', () => {
    it('creates an error with message and code', () => {
      const error = new BTCPayError('Test message', 'TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('BTCPayError');
      expect(error.statusCode).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });

    it('creates an error with all parameters', () => {
      const original = new Error('Original');
      const error = new BTCPayError('Test', 'CODE', 400, original);
      expect(error.statusCode).toBe(400);
      expect(error.originalError).toBe(original);
    });

    it('is instance of Error', () => {
      const error = new BTCPayError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('BTCPayApiError', () => {
    it('sets API_ERROR code and statusCode', () => {
      const error = new BTCPayApiError('API failed', 500);
      expect(error.code).toBe('API_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('BTCPayApiError');
      expect(error).toBeInstanceOf(BTCPayError);
    });
  });

  describe('BTCPayConfigError', () => {
    it('sets CONFIG_ERROR code', () => {
      const error = new BTCPayConfigError('Config bad');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.statusCode).toBeUndefined();
      expect(error.name).toBe('BTCPayConfigError');
    });
  });

  describe('BTCPayValidationError', () => {
    it('sets VALIDATION_ERROR code', () => {
      const error = new BTCPayValidationError('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('BTCPayValidationError');
    });
  });

  describe('BTCPayNetworkError', () => {
    it('sets NETWORK_ERROR code', () => {
      const error = new BTCPayNetworkError('Network down');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('BTCPayNetworkError');
    });
  });

  describe('BTCPayWebhookSignatureError', () => {
    it('sets WEBHOOK_SIGNATURE_ERROR code with statusCode 401', () => {
      const error = new BTCPayWebhookSignatureError('Signature mismatch');
      expect(error.code).toBe('WEBHOOK_SIGNATURE_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('BTCPayWebhookSignatureError');
    });
  });
});
