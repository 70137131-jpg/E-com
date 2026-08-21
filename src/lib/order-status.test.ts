import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, canTransition, isTerminal } from './order-status';
import type { OrderStatus } from './commerce/types';

const ALL: OrderStatus[] = ['pending', 'paid', 'fulfilled', 'cancelled'];

/**
 * PRD 12.5. This is enforced server-side rather than hidden in the UI, so these
 * tests are the specification: a widened table here is a real business change,
 * not a refactor.
 */
describe('canTransition', () => {
  it('allows the two moves an operator actually makes', () => {
    expect(canTransition('paid', 'fulfilled')).toBe(true);
    expect(canTransition('paid', 'cancelled')).toBe(true);
  });

  it('lets a pending order be cancelled but never fulfilled', () => {
    // pending means payment succeeded but stock could not be decremented, so
    // fulfilling it would ship goods the shop does not have.
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('pending', 'fulfilled')).toBe(false);
  });

  it('treats fulfilled and cancelled as terminal', () => {
    for (const to of ALL) {
      expect(canTransition('fulfilled', to)).toBe(false);
      expect(canTransition('cancelled', to)).toBe(false);
    }
  });

  it('refuses to move an order back to paid or pending from anywhere', () => {
    for (const from of ALL) {
      expect(canTransition(from, 'paid')).toBe(false);
      expect(canTransition(from, 'pending')).toBe(false);
    }
  });

  it('refuses a no-op transition to its own status', () => {
    for (const s of ALL) expect(canTransition(s, s)).toBe(false);
  });
});

describe('isTerminal', () => {
  it('is true only for fulfilled and cancelled', () => {
    expect(isTerminal('fulfilled')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('paid')).toBe(false);
    expect(isTerminal('pending')).toBe(false);
  });
});

describe('the table itself', () => {
  it('covers every status, so a new one cannot be silently unhandled', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...ALL].sort());
  });

  it('never targets a status outside the union', () => {
    for (const targets of Object.values(ALLOWED_TRANSITIONS)) {
      for (const t of targets) expect(ALL).toContain(t);
    }
  });
});
