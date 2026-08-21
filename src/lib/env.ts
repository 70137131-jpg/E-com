import 'server-only';
import { BRAND_FALLBACK_NAME } from './brand';
import { stripeConfigured } from './payments/provider';

/**
 * Startup environment audit.
 *
 * Everything in this app is built to degrade: no Stripe keys falls back to the
 * mock gateway, no Resend key logs the email instead of sending it, and every
 * brand value has a fictional default (PRD A10). That is correct for a demo and
 * dangerous for a real store, because each fallback is **silent** — a deploy
 * that forgets `NEXT_PUBLIC_SITE_URL` publishes a sitemap full of localhost
 * links, and one that forgets Stripe hands out product for free.
 *
 * `DEMO_MODE=true` says "I know, that is the point". Without it a production
 * build refuses to start while any of those fallbacks are live. Handing the
 * project over is therefore: drop DEMO_MODE, read the errors, fix them.
 */

export type EnvProblem = { level: 'fatal' | 'warn'; key: string; message: string };

export const isDemoMode = (): boolean => process.env.DEMO_MODE === 'true';

function isPlaceholderSecret(value: string): boolean {
  return value.length < 32;
}

function siteUrlProblem(): EnvProblem | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    return {
      level: 'fatal',
      key: 'NEXT_PUBLIC_SITE_URL',
      message:
        'Not set. sitemap.xml, robots.txt and every canonical URL would be built against http://localhost:3000.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      level: 'fatal',
      key: 'NEXT_PUBLIC_SITE_URL',
      message: `"${raw}" is not an absolute URL. Expected e.g. https://shop.example.com (no trailing slash).`,
    };
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    return {
      level: 'fatal',
      key: 'NEXT_PUBLIC_SITE_URL',
      message: `"${raw}" is not https. Stripe and the secure cookies both require TLS in production.`,
    };
  }

  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return {
      level: 'fatal',
      key: 'NEXT_PUBLIC_SITE_URL',
      message: `Points at ${parsed.origin}. A deployed store cannot advertise localhost in its sitemap or emails.`,
    };
  }

  return null;
}

/** Every check. Pure, so it can be unit-tested without booting a server. */
export function auditEnv(): EnvProblem[] {
  const problems: EnvProblem[] = [];
  const push = (level: EnvProblem['level'], key: string, message: string) =>
    problems.push({ level, key, message });

  // --- Always required, demo or not -----------------------------------------
  if (!process.env.DATABASE_URL) {
    push('fatal', 'DATABASE_URL', 'Not set. There is no database to read or write.');
  }

  const cookieSecret = process.env.ADMIN_COOKIE_SECRET;
  if (!cookieSecret) {
    push('fatal', 'ADMIN_COOKIE_SECRET', 'Not set. Admin sessions cannot be signed.');
  } else if (isPlaceholderSecret(cookieSecret)) {
    push(
      'fatal',
      'ADMIN_COOKIE_SECRET',
      `Only ${cookieSecret.length} characters. Use 32+ random bytes — this key is the only thing standing between a guessed cookie and the admin.`,
    );
  }

  if (!process.env.ADMIN_PASSWORD) {
    push('fatal', 'ADMIN_PASSWORD', 'Not set. passwordMatches() rejects every attempt, locking /admin.');
  }

  // --- Fallbacks that are fine in a demo and not in a real store -------------
  const level = isDemoMode() ? 'warn' : 'fatal';

  const urlProblem = siteUrlProblem();
  if (urlProblem) problems.push({ ...urlProblem, level: isDemoMode() ? 'warn' : urlProblem.level });

  if (!stripeConfigured()) {
    push(
      level,
      'STRIPE_SECRET_KEY',
      'Stripe is not configured, so the mock gateway is live and orders are created without taking payment.',
    );
  }

  if (!process.env.RESEND_API_KEY) {
    push(
      level,
      'RESEND_API_KEY',
      'Not set. Order confirmations are logged to the console instead of sent — a customer would hear nothing.',
    );
  }

  if (!process.env.EMAIL_FROM) {
    push(
      level,
      'EMAIL_FROM',
      'Not set. Mail would be sent from resend.dev, which fails SPF/DKIM alignment for your domain.',
    );
  }

  if (!process.env.NEXT_PUBLIC_BRAND_NAME) {
    push(
      level,
      'NEXT_PUBLIC_BRAND_NAME',
      `Not set, so the storefront ships as "${BRAND_FALLBACK_NAME}" — a fictional business (PRD A10).`,
    );
  }

  return problems;
}

function format(problems: EnvProblem[]): string {
  return problems.map((p) => `  [${p.level.toUpperCase()}] ${p.key} — ${p.message}`).join('\n');
}

/**
 * Called once from instrumentation.ts. Throws rather than logging, because a
 * store that silently boots misconfigured is the failure this exists to stop.
 *
 * Next.js catches this as a failed instrumentation hook: the process stays up
 * but every request returns 500, so a platform health check fails the deploy
 * instead of promoting a storefront that takes no money. Verified against a
 * production build.
 */
export function assertEnv(): void {
  const problems = auditEnv();
  if (problems.length === 0) return;

  const warnings = problems.filter((p) => p.level === 'warn');
  const fatal = problems.filter((p) => p.level === 'fatal');

  if (warnings.length > 0) {
    console.warn(
      `\n[env] ${warnings.length} fallback(s) active${isDemoMode() ? ' (DEMO_MODE=true)' : ''}:\n${format(warnings)}\n`,
    );
  }

  if (fatal.length > 0) {
    throw new Error(
      `\n[env] Refusing to serve — ${fatal.length} problem(s):\n${format(fatal)}\n\n` +
        'These are fatal because DEMO_MODE is not set. Set DEMO_MODE=true to run the ' +
        'demo with its fallbacks, or fix the values above for a real deployment.\n',
    );
  }
}
