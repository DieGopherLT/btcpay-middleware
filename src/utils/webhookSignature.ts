import { createHmac, timingSafeEqual } from 'crypto';
import { BTCPayWebhookSignatureError } from './errors';

const SIGNATURE_HEADER = 'btcpay-sig';
const SIGNATURE_PREFIX = 'sha256=';

export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string
): void {
  if (!signatureHeader) {
    throw new BTCPayWebhookSignatureError(
      `verifyWebhookSignature: missing "${SIGNATURE_HEADER}" header`
    );
  }
  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    throw new BTCPayWebhookSignatureError(
      `verifyWebhookSignature: signature header must start with "${SIGNATURE_PREFIX}"`
    );
  }

  const provided = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expected = computeSignature(rawBody, secret);

  if (!safeCompareHex(provided, expected)) {
    throw new BTCPayWebhookSignatureError(
      'verifyWebhookSignature: signature mismatch'
    );
  }
}

export function computeSignature(
  rawBody: Buffer | string,
  secret: string
): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function safeCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export const WEBHOOK_SIGNATURE_HEADER = SIGNATURE_HEADER;
