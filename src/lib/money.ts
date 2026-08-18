/**
 * The only place minor units become a human-readable string.
 *
 * PRD A1: currency is PKR, locale en-PK. Changing currency is a one-constant
 * change here. Money is integer paisa everywhere else — never a float.
 */
export const CURRENCY = 'PKR' as const;
export const LOCALE = 'en-PK' as const;

const formatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 450000 -> "Rs 4,500" */
export function formatMoney(minorUnits: number): string {
  return formatter.format(Math.round(minorUnits) / 100);
}

/** Discount percentage for the "Save X%" pill (§6.3). Display only. */
export function savingsPercent(priceCents: number, compareAtCents: number): number {
  if (compareAtCents <= priceCents) return 0;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}
