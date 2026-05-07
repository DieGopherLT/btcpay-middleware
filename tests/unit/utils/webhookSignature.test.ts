import { createHmac } from 'crypto';
import {
  computeSignature,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@/utils/webhookSignature';
import { BTCPayWebhookSignatureError } from '@/utils/errors';

const SECRET = 'super-secret';
const RAW_BODY = Buffer.from('{"hello":"world"}', 'utf8');

function sign(body: Buffer | string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('webhookSignature', () => {
  it('exports the BTCPay-Sig header name in lowercase', () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe('btcpay-sig');
  });

  describe('computeSignature', () => {
    it('produces a hex SHA-256 HMAC', () => {
      const signature = computeSignature(RAW_BODY, SECRET);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('matches Node crypto reference output', () => {
      const expected = createHmac('sha256', SECRET)
        .update(RAW_BODY)
        .digest('hex');
      expect(computeSignature(RAW_BODY, SECRET)).toBe(expected);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('passes for a valid signature', () => {
      const header = sign(RAW_BODY, SECRET);
      expect(() =>
        verifyWebhookSignature(RAW_BODY, header, SECRET)
      ).not.toThrow();
    });

    it('throws when signature header is missing', () => {
      expect(() =>
        verifyWebhookSignature(RAW_BODY, undefined, SECRET)
      ).toThrow(BTCPayWebhookSignatureError);
    });

    it('throws when signature lacks sha256 prefix', () => {
      const invalid = createHmac('sha256', SECRET)
        .update(RAW_BODY)
        .digest('hex');
      expect(() =>
        verifyWebhookSignature(RAW_BODY, invalid, SECRET)
      ).toThrow(BTCPayWebhookSignatureError);
    });

    it('throws when signature does not match', () => {
      const tampered = sign(RAW_BODY, 'different-secret');
      expect(() =>
        verifyWebhookSignature(RAW_BODY, tampered, SECRET)
      ).toThrow(BTCPayWebhookSignatureError);
    });

    it('throws when body is altered', () => {
      const header = sign(RAW_BODY, SECRET);
      const altered = Buffer.from('{"hello":"WORLD"}', 'utf8');
      expect(() =>
        verifyWebhookSignature(altered, header, SECRET)
      ).toThrow(BTCPayWebhookSignatureError);
    });

    it('accepts string bodies', () => {
      const stringBody = 'plain-text-payload';
      const header = sign(stringBody, SECRET);
      expect(() =>
        verifyWebhookSignature(stringBody, header, SECRET)
      ).not.toThrow();
    });
  });
});
