/**
 * Shipping table — PRD §12.3. Must match /shipping-returns word for word.
 */
export const SHIPPING_METHODS = {
  standard: {
    key: 'standard',
    name: 'Standard delivery',
    estimate: '3–5 business days',
    priceCents: 25_000, // PKR 250
  },
  express: {
    key: 'express',
    name: 'Express delivery',
    estimate: '1–2 business days',
    priceCents: 60_000, // PKR 600
  },
  pickup: {
    key: 'pickup',
    name: 'Store pickup',
    estimate: 'Ready in 24 hours',
    priceCents: 0,
  },
} as const;

export type ShippingMethodKey = keyof typeof SHIPPING_METHODS;
export const SHIPPING_METHOD_KEYS = Object.keys(SHIPPING_METHODS) as ShippingMethodKey[];

export function isShippingMethodKey(value: string): value is ShippingMethodKey {
  return value in SHIPPING_METHODS;
}

/** Free standard shipping over PKR 5,000 (§12.3). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 500_000;

/**
 * The authoritative shipping cost. The client never supplies a shipping price —
 * it supplies a key, and this function turns the key plus the server-computed
 * subtotal into an amount (§10, "never trust the client").
 */
export function shippingCostCents(method: ShippingMethodKey, subtotalCents: number): number {
  if (method === 'standard' && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) return 0;
  return SHIPPING_METHODS[method].priceCents;
}

export const SUPPORTED_COUNTRIES = [
  { code: 'PK', name: 'Pakistan' },
] as const;

export const DEFAULT_COUNTRY = 'PK';

export function isSupportedCountry(code: string): boolean {
  return SUPPORTED_COUNTRIES.some((c) => c.code === code);
}
