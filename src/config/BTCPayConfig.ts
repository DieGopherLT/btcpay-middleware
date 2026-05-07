import { BTCPayConfig } from '@/types';
import { BTCPayConfigError } from '@/utils/errors';

class BTCPayConfigSingleton {
  private static instance: BTCPayConfigSingleton;
  private config: BTCPayConfig;

  private constructor() {
    this.config = BTCPayConfigSingleton.readEnvironmentConfig();
  }

  static getInstance(): BTCPayConfigSingleton {
    if (!BTCPayConfigSingleton.instance) {
      BTCPayConfigSingleton.instance = new BTCPayConfigSingleton();
    }
    return BTCPayConfigSingleton.instance;
  }

  configure(config: Partial<BTCPayConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  getConfig(): BTCPayConfig {
    if (!this.config.baseURL) {
      throw new BTCPayConfigError(
        'BTCPay baseURL is required. Either configure it or set BTCPAY_BASE_URL environment variable.'
      );
    }
    if (!this.config.apiKey) {
      throw new BTCPayConfigError(
        'BTCPay apiKey is required. Either configure it or set BTCPAY_API_KEY environment variable.'
      );
    }
    if (!this.config.storeId) {
      throw new BTCPayConfigError(
        'BTCPay storeId is required. Either configure it or set BTCPAY_STORE_ID environment variable.'
      );
    }
    return this.config;
  }

  reset(): void {
    this.config = BTCPayConfigSingleton.readEnvironmentConfig();
  }

  private static readEnvironmentConfig(): BTCPayConfig {
    return {
      baseURL: process.env.BTCPAY_BASE_URL || '',
      apiKey: process.env.BTCPAY_API_KEY || '',
      storeId: process.env.BTCPAY_STORE_ID || '',
      webhookSecret: process.env.BTCPAY_WEBHOOK_SECRET,
      errorHandling: 'next',
    };
  }
}

export const BTCPayConfiguration = BTCPayConfigSingleton.getInstance();
