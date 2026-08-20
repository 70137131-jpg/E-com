/**
 * Brand constants. Fictional throughout (PRD A10) - nothing here belongs to a
 * real business.
 */
/**
 * The demo's fictional name, used when NEXT_PUBLIC_BRAND_NAME is unset. Exported
 * so lib/env.ts can name it when it refuses to boot a real deployment still
 * wearing it.
 */
export const BRAND_FALLBACK_NAME = 'Karakoram Threads';

export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || BRAND_FALLBACK_NAME,
  tagline: 'Considered clothing, made in Pakistan',
  email: 'hello@karakoramthreads.pk',
  phone: '+92 21 3455 0180',
  addressLine: 'Studio 4, Zamzama Boulevard, Karachi',
  /** The collection the "continue shopping" and hero CTAs point at. */
  primaryCollection: 'everyday',
} as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}
