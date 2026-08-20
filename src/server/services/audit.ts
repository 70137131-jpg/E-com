import 'server-only';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';
import { log } from '@/lib/log';

/**
 * Append-only record of admin mutations.
 *
 * Deliberately **best-effort and post-hoc**: it runs after the mutation has
 * committed, and a failure to record is logged rather than thrown. Refusing a
 * price change because the audit insert failed would be worse than the missing
 * row, and the alternative — writing the audit inside each mutation's
 * transaction — means threading a `tx` through the commerce interface, which is
 * the boundary that keeps a Shopify adapter to one file (PRD §15.1).
 *
 * The trade is worth naming: this trail is good enough to answer "who changed
 * the price and when" for an operator, and not good enough to be evidence. A
 * tamper-evident trail needs same-transaction writes and an append-only grant at
 * the database level.
 */

export type AuditAction =
  | 'order.status_changed'
  | 'variant.price_changed'
  | 'variant.stock_changed'
  | 'product.published_changed';

type Change = { from: unknown; to: unknown };

export async function recordAudit(input: {
  action: AuditAction;
  entityType: 'order' | 'variant' | 'product';
  entityId: string;
  entityLabel?: string;
  changes?: Record<string, Change>;
}): Promise<void> {
  try {
    let actorIp: string | null = null;
    try {
      const h = await headers();
      actorIp = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
    } catch {
      // headers() is unavailable outside a request scope; the row is still worth
      // writing without it.
    }

    await db.insert(auditLog).values({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel ?? null,
      // One shared admin password, so there is no person to name yet.
      actor: 'admin',
      actorIp,
      changes: input.changes ?? null,
    });
  } catch (err) {
    // Never surface to the operator: the change they made did succeed.
    log.error('audit.write_failed', { action: input.action, entityId: input.entityId, err });
  }
}

/** Only meaningful changes are recorded — a no-op edit is not history. */
export function diff<T>(from: T, to: T | undefined): Record<string, Change> | null {
  if (to === undefined || from === to) return null;
  return { value: { from, to } };
}
