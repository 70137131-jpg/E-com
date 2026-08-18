import 'server-only';
import { randomBytes } from 'node:crypto';
import { sign, verify } from '@/lib/signing';
import type { CreatedIntent, PaymentMetadata, PaymentProvider } from './provider';

/**
 * The mock gateway, used only when Stripe keys are absent.
 *
 * It is stateless: the "client secret" is an HMAC-signed blob carrying the same
 * metadata Stripe would hold, so /api/mock-payment/confirm can reconstruct the
 * event without a database table and without trusting the browser. Amount and
 * cart token are signed, so a tampered payload fails verification.
 */
export type MockTokenPayload = {
  paymentIntentId: string;
  amountCents: number;
  metadata: PaymentMetadata;
  issuedAt: number;
};

export const mockProvider: PaymentProvider = {
  mode: 'mock',

  async createIntent(amountCents: number, metadata: PaymentMetadata): Promise<CreatedIntent> {
    const paymentIntentId = `pi_mock_${randomBytes(12).toString('hex')}`;
    const clientSecret = sign<MockTokenPayload>({
      paymentIntentId,
      amountCents,
      metadata,
      issuedAt: Date.now(),
    });
    return { clientSecret, paymentIntentId };
  },
};

export function parseMockToken(token: string): MockTokenPayload | null {
  const payload = verify<MockTokenPayload>(token);
  if (!payload) return null;
  // Match Stripe's PaymentIntent lifetime loosely - one hour is plenty for a demo.
  if (Date.now() - payload.issuedAt > 60 * 60 * 1000) return null;
  return payload;
}

/**
 * Mirrors Stripe's test cards (PRD 9.4) so the same numbers behave the same way
 * in both modes.
 */
export function mockCardOutcome(cardNumber: string): { ok: true } | { ok: false; reason: string } {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits === '4000000000009995') {
    return { ok: false, reason: 'Your card has insufficient funds' };
  }
  if (digits === '4000000000000002') {
    return { ok: false, reason: 'Your card was declined' };
  }
  if (digits.length < 13) {
    return { ok: false, reason: 'Your card number is incomplete' };
  }
  return { ok: true };
}
