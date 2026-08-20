import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALERT_EVENTS, setAlertSink } from '@/lib/log';
import type { Order } from '@/lib/commerce/types';

/**
 * fulfilPayment() is the only place a successful payment becomes an order, and
 * the stock-conflict branch is the one that costs money quietly: the shopper has
 * been charged for something the shop may not have.
 *
 * Reproducing a real conflict needs a commit to land between the transaction's
 * SELECT and its guarded UPDATE — a race that is flaky to force. The branch
 * itself is deterministic, so the commerce boundary is mocked and the alert
 * wiring is asserted directly.
 */
const createOrder = vi.fn();
const sendOrderConfirmation = vi.fn();

vi.mock('@/lib/commerce', () => ({
  get commerce() {
    return { createOrder };
  },
}));

vi.mock('@/lib/email/resend', () => ({
  sendOrderConfirmation: (...args: unknown[]) => sendOrderConfirmation(...args),
}));

function orderFixture(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: '1006',
    email: 'shopper@example.com',
    status: 'paid',
    stockConflict: false,
    subtotalCents: 840_000,
    shippingCents: 0,
    totalCents: 840_000,
    createdAt: new Date(),
    items: [],
    shippingAddress: {},
    shippingMethod: 'standard',
    paymentIntentId: 'pi_1',
    // The fixture only needs the fields fulfilPayment reads.
    ...overrides,
  } as unknown as Order;
}

const metadata = {
  cartToken: 'cart-1',
  email: 'shopper@example.com',
  address: {},
  shippingMethod: 'standard',
} as never;

let alerts: Array<[string, Record<string, unknown>]>;

beforeEach(() => {
  alerts = [];
  setAlertSink((event, fields) => alerts.push([event, fields]));
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  createOrder.mockReset();
  sendOrderConfirmation.mockReset();
});

afterEach(() => {
  setAlertSink(null);
  vi.restoreAllMocks();
});

describe('fulfilPayment', () => {
  it('does not alert on a clean order', async () => {
    createOrder.mockResolvedValue(orderFixture());
    const { fulfilPayment } = await import('./orders');

    await fulfilPayment('pi_1', metadata);

    expect(alerts).toHaveLength(0);
  });

  it('alerts when the order came back flagged with a stock conflict', async () => {
    createOrder.mockResolvedValue(orderFixture({ stockConflict: true, status: 'pending' }));
    const { fulfilPayment } = await import('./orders');

    await fulfilPayment('pi_1', metadata);

    expect(alerts).toHaveLength(1);
    const [event, fields] = alerts[0];
    expect(event).toBe(ALERT_EVENTS.ORDER_STOCK_CONFLICT);
    // An operator has to find the order and the money, so both must be in it.
    expect(fields).toMatchObject({
      orderNumber: '1006',
      paymentIntentId: 'pi_1',
      totalCents: 840_000,
    });
  });

  it('still sends the confirmation for a flagged order', async () => {
    // The shopper paid. Silence because of an internal conflict would be worse.
    createOrder.mockResolvedValue(orderFixture({ stockConflict: true, status: 'pending' }));
    const { fulfilPayment } = await import('./orders');

    await fulfilPayment('pi_1', metadata);

    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it('returns the order created by the commerce layer', async () => {
    const order = orderFixture();
    createOrder.mockResolvedValue(order);
    const { fulfilPayment } = await import('./orders');

    await expect(fulfilPayment('pi_1', metadata)).resolves.toBe(order);
  });
});
