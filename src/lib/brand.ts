/**
 * Brand constants. Fictional throughout (PRD A10) - nothing here belongs to a
 * real business.
 */
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'Karakoram Threads',
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
