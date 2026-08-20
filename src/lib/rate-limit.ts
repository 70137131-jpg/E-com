import 'server-only';

/**
 * A small fixed-window rate limiter.
 *
 * **Read this before trusting it.** State lives in this process's memory, so the
 * limit is per instance: two instances behind a load balancer allow twice the
 * traffic, and a serverless platform that spins up a fresh isolate per request
 * effectively disables it. That is honest for a single-instance deployment and
 * useless on Vercel at scale.
 *
 * The interface is deliberately the same shape as Upstash's `@upstash/ratelimit`
 * so swapping in Redis is a change of implementation, not of call sites — see
 * PRD 17.5, where rate limiting is named as paid production work.
 *
 * It is applied where an attacker gets unlimited free attempts at a secret:
 * admin login above all, since /admin is one shared password.
 */

export type RateLimitResult = {
  ok: boolean;
  /** Attempts left in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

type Bucket = { count: number; resetAt: number };

// Survives hot reload in development, where modules are re-evaluated.
const globalForLimiter = globalThis as unknown as { __rateLimitBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = globalForLimiter.__rateLimitBuckets ?? new Map();
if (process.env.NODE_ENV !== 'production') globalForLimiter.__rateLimitBuckets = buckets;

/** Bounded so a flood of distinct keys cannot grow the map without limit. */
const MAX_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
  now: number = Date.now(),
): RateLimitResult {
  const windowMs = windowSeconds * 1000;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: windowSeconds };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfter };
  }

  return { ok: true, remaining: limit - existing.count, retryAfter };
}

/** Test seam. Never call this from application code. */
export function __resetRateLimits(): void {
  buckets.clear();
}

/**
 * Best-effort client address. `x-forwarded-for` is trivially spoofable unless
 * the platform overwrites it — Vercel, Render and Cloudflare all do — so this is
 * a throttle, not an identity.
 */
export function clientKey(headers: Headers, scope: string): string {
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}
