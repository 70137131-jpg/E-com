import type { OrderStatus } from './commerce/types';

/**
 * The order status machine — PRD 12.5.
 *
 * Kept out of commerce/local/orders.ts on purpose: that module opens a database
 * pool at import time, so anything importing it needs DATABASE_URL. This rule is
 * pure, it is the one the server enforces rather than the UI, and it is worth
 * being able to test without a database.
 *
 * `fulfilled` and `cancelled` are terminal.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['cancelled'],
  paid: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
