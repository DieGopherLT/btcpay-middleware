import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { BTCPayConfigError } from '@/utils/errors';

const ENV_KEYS = [
  'BTCPAY_BASE_URL',
  'BTCPAY_API_KEY',
  'BTCPAY_STORE_ID',
  'BTCPAY_WEBHOOK_SECRET',
] as const;

const originalEnv: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe('BTCPayConfiguration singleton', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    BTCPayConfiguration.reset();
  });

  it('throws when required values are missing', () => {
    expect(() => BTCPayConfiguration.getConfig()).toThrow(BTCPayConfigError);
  });

  it('returns full config when configured explicitly', () => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'token-123',
      storeId: 'store-xyz',
      webhookSecret: 'whsec',
    });

    const config = BTCPayConfiguration.getConfig();
    expect(config.baseURL).toBe('https://btcpay.example.com');
    expect(config.apiKey).toBe('token-123');
    expect(config.storeId).toBe('store-xyz');
    expect(config.webhookSecret).toBe('whsec');
  });

  it('reads values from environment on reset', () => {
    process.env.BTCPAY_BASE_URL = 'https://env.example.com';
    process.env.BTCPAY_API_KEY = 'env-key';
    process.env.BTCPAY_STORE_ID = 'env-store';
    process.env.BTCPAY_WEBHOOK_SECRET = 'env-secret';
    BTCPayConfiguration.reset();

    const config = BTCPayConfiguration.getConfig();
    expect(config.baseURL).toBe('https://env.example.com');
    expect(config.apiKey).toBe('env-key');
    expect(config.storeId).toBe('env-store');
    expect(config.webhookSecret).toBe('env-secret');
  });

  it('configure() merges with existing values', () => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'token-1',
      storeId: 'store-1',
    });
    BTCPayConfiguration.configure({ apiKey: 'token-2' });

    const config = BTCPayConfiguration.getConfig();
    expect(config.apiKey).toBe('token-2');
    expect(config.baseURL).toBe('https://btcpay.example.com');
    expect(config.storeId).toBe('store-1');
  });

  it('throws specifically when storeId is missing', () => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: 'token',
      storeId: '',
    });
    expect(() => BTCPayConfiguration.getConfig()).toThrow(/storeId/);
  });

  it('throws specifically when apiKey is missing', () => {
    BTCPayConfiguration.configure({
      baseURL: 'https://btcpay.example.com',
      apiKey: '',
      storeId: 'store',
    });
    expect(() => BTCPayConfiguration.getConfig()).toThrow(/apiKey/);
  });

  it('throws specifically when baseURL is missing', () => {
    BTCPayConfiguration.configure({
      baseURL: '',
      apiKey: 'token',
      storeId: 'store',
    });
    expect(() => BTCPayConfiguration.getConfig()).toThrow(/baseURL/);
  });
});
