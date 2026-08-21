import 'server-only';

/**
 * Structured logging.
 *
 * The console calls this replaces were readable but not queryable: a log drain
 * could not answer "how many webhooks failed today" without regex, and nothing
 * distinguished a routine 4xx from money quietly going missing.
 *
 * In production each entry is one JSON line, which every log platform ingests
 * without configuration. In development it stays human-readable, because a wall
 * of JSON while iterating is worse than useless.
 *
 * The important part is `event`: a stable machine key. Alerts and dashboards are
 * built on those strings, so treat renaming one as a breaking change.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

/**
 * Events that mean money is at risk. Kept as a closed set so they can be
 * enumerated in an alerting rule, and so adding one is a deliberate act.
 */
export const ALERT_EVENTS = {
  /** A Stripe webhook threw. Money moved and the order may not exist. */
  WEBHOOK_FAILED: 'webhook.failed',
  /** Payment succeeded but stock could not be decremented (PRD 13.4). */
  ORDER_STOCK_CONFLICT: 'order.stock_conflict',
  /** The confirmation email did not go out. The shopper has silence. */
  EMAIL_FAILED: 'email.failed',
} as const;

export type AlertEvent = (typeof ALERT_EVENTS)[keyof typeof ALERT_EVENTS];

/**
 * Where alerts go beyond the log. Left as a seam rather than a hard Sentry
 * dependency: wire `captureException` (or PagerDuty, or a Slack webhook) here in
 * one place. A throwing handler must never take down the request that raised it.
 */
type AlertSink = (event: AlertEvent, fields: Fields) => void;
let alertSink: AlertSink | null = null;

export function setAlertSink(sink: AlertSink | null): void {
  alertSink = sink;
}

function serialise(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function emit(level: Level, event: string, fields: Fields = {}): void {
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, serialise(v)])),
  };

  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;

  if (process.env.NODE_ENV === 'production') {
    target(JSON.stringify(entry));
    return;
  }

  const detail = Object.entries(fields)
    .map(([k, v]) => `${k}=${typeof v === 'object' && v !== null ? JSON.stringify(serialise(v)) : String(v)}`)
    .join(' ');
  target(`[${level}] ${event}${detail ? ` ${detail}` : ''}`);
}

export const log = {
  debug: (event: string, fields?: Fields) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', event, fields);
  },
  info: (event: string, fields?: Fields) => emit('info', event, fields),
  warn: (event: string, fields?: Fields) => emit('warn', event, fields),
  error: (event: string, fields?: Fields) => emit('error', event, fields),

  /**
   * Something that needs a human tonight. Logged at error level with
   * `alert: true` so a drain can filter on one field, then forwarded to the
   * sink if one is registered.
   */
  alert: (event: AlertEvent, fields: Fields = {}) => {
    emit('error', event, { ...fields, alert: true });
    try {
      alertSink?.(event, fields);
    } catch (err) {
      // An alerting failure must never propagate into the caller's path — the
      // caller is usually already handling money.
      emit('error', 'alert.sink_failed', { originalEvent: event, err });
    }
  },
};
