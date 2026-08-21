/**
 * The only place a timestamp becomes a human-readable string.
 *
 * The store trades in one place, so "today" and every rendered date mean
 * Pakistan time regardless of where the server runs — Vercel runs functions in
 * UTC, so relying on the process clock would show a Karachi admin the wrong day
 * for five hours out of every twenty-four.
 *
 * Mirrors `money.ts`: changing the store's timezone is a one-constant change.
 */
import { LOCALE } from './money';

export const TIME_ZONE = 'Asia/Karachi' as const;

/** "20 Aug" — dashboard tables. */
export const shortDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});

/** "20 Aug 2026" — order lists. */
export const mediumDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

/** "20 August 2026" — customer-facing email. */
export const longDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

/** "20 August 2026 at 4:53 am" — single order detail. */
export const longDateTime = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
