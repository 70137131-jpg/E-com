import { describe, expect, it } from 'vitest';
import { formatMoney, savingsPercent } from './money';

/**
 * Money is integer paisa everywhere (PRD A1). These tests exist to catch the one
 * change that would be silent and expensive: someone "simplifying" formatMoney
 * into float arithmetic, or flipping the savings formula to divide by the wrong
 * side.
 */
/**
 * Intl.NumberFormat separates the currency symbol with a NON-BREAKING space
 * (U+00A0), not U+0020 — `formatMoney(450000)` is `"Rs 4,500"`. Any
 * assertion or scrape written with a normal space silently fails and looks
 * identical in the diff. Normalise, or match with \s (which does cover U+00A0).
 */
const money = (cents: number) => formatMoney(cents).replace(/ /g, ' ');

describe('formatMoney', () => {
  it('separates the symbol with a non-breaking space', () => {
    expect(formatMoney(450000)).toBe('Rs 4,500');
    expect(formatMoney(450000)).not.toBe('Rs 4,500');
  });

  it('renders minor units as whole rupees', () => {
    // The example the whole codebase is documented against.
    expect(money(450000)).toBe('Rs 4,500');
  });

  it('groups thousands', () => {
    expect(money(1_950_000)).toBe('Rs 19,500');
  });

  it('renders zero as a price, not as "Free"', () => {
    expect(money(0)).toBe('Rs 0');
  });

  it('never shows fractional paisa', () => {
    expect(money(123456)).toBe('Rs 1,235');
    expect(money(123449)).toBe('Rs 1,234');
  });

  it('rounds half away from zero rather than truncating', () => {
    // 1250 paisa = Rs 12.50 -> Rs 13. Truncation would give Rs 12 and lose a
    // rupee on every line of every order.
    expect(money(1250)).toBe('Rs 13');
  });

  it('handles a negative amount without producing garbage', () => {
    expect(formatMoney(-450000)).toContain('4,500');
  });
});

describe('savingsPercent', () => {
  it('computes the discount against the compare-at price', () => {
    // 6800 -> 5400 is the seeded sale item: 20.6% -> 21%.
    expect(savingsPercent(540000, 680000)).toBe(21);
  });

  it('returns 0 when there is no saving', () => {
    expect(savingsPercent(500000, 500000)).toBe(0);
  });

  it('returns 0 when compare-at is lower, rather than a negative badge', () => {
    expect(savingsPercent(500000, 400000)).toBe(0);
  });

  it('never divides by zero', () => {
    expect(savingsPercent(0, 0)).toBe(0);
  });
});
