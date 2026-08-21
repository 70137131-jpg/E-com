import { describe, expect, it } from 'vitest';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_METHODS,
  isShippingMethodKey,
  shippingCostCents,
} from './shipping';

/**
 * The shipping table is specified to match the Shipping & Returns page word for
 * word (PRD 12.3). A mismatch between advertised and charged shipping is a
 * consumer-law problem, so the rates are asserted literally rather than derived.
 */
describe('shipping table (PRD 12.3)', () => {
  it('matches the published rates exactly', () => {
    expect(SHIPPING_METHODS.standard).toMatchObject({
      name: 'Standard delivery',
      estimate: '3–5 business days',
      priceCents: 25_000,
    });
    expect(SHIPPING_METHODS.express).toMatchObject({
      name: 'Express delivery',
      estimate: '1–2 business days',
      priceCents: 60_000,
    });
    expect(SHIPPING_METHODS.pickup).toMatchObject({
      name: 'Store pickup',
      estimate: 'Ready in 24 hours',
      priceCents: 0,
    });
  });

  it('puts the free-shipping threshold at PKR 5,000', () => {
    expect(FREE_SHIPPING_THRESHOLD_CENTS).toBe(500_000);
  });
});

describe('shippingCostCents', () => {
  it('charges standard below the threshold', () => {
    expect(shippingCostCents('standard', 499_999)).toBe(25_000);
  });

  it('is free at exactly the threshold, not just above it', () => {
    // "over PKR 5,000" is implemented as >=. The boundary is the whole rule.
    expect(shippingCostCents('standard', FREE_SHIPPING_THRESHOLD_CENTS)).toBe(0);
  });

  it('is free above the threshold', () => {
    expect(shippingCostCents('standard', 840_000)).toBe(0);
  });

  it('never discounts express, however large the order', () => {
    expect(shippingCostCents('express', 10_000_000)).toBe(60_000);
  });

  it('leaves pickup free at any subtotal', () => {
    expect(shippingCostCents('pickup', 0)).toBe(0);
    expect(shippingCostCents('pickup', 10_000_000)).toBe(0);
  });

  it('does not make express free by threshold leakage', () => {
    // Regression guard: the free rule is keyed on method === 'standard'.
    expect(shippingCostCents('express', FREE_SHIPPING_THRESHOLD_CENTS)).toBe(60_000);
  });
});

describe('isShippingMethodKey', () => {
  it('accepts the three real keys', () => {
    expect(isShippingMethodKey('standard')).toBe(true);
    expect(isShippingMethodKey('express')).toBe(true);
    expect(isShippingMethodKey('pickup')).toBe(true);
  });

  it('rejects anything else, so a forged key cannot reach the pricing table', () => {
    expect(isShippingMethodKey('free')).toBe(false);
    expect(isShippingMethodKey('')).toBe(false);
    expect(isShippingMethodKey('__proto__')).toBe(false);
    expect(isShippingMethodKey('constructor')).toBe(false);
  });
});
