/**
 * The contract between the checkout form and whichever gateway is mounted.
 *
 * Two steps rather than one because Stripe's deferred-intent flow requires
 * `elements.submit()` to run *before* the PaymentIntent is created server-side,
 * and the confirm call to run after.
 */
export type PaymentHandle = {
  /** Client-side field validation. Runs before any server work. */
  validate: () => Promise<{ ok: boolean; reason?: string }>;
  /** Complete the payment. `reason` is the gateway's own wording (PRD 8.3). */
  confirm: (args: {
    clientSecret: string;
    paymentIntentId: string;
  }) => Promise<{ ok: boolean; reason?: string }>;
};

export type PaymentSectionProps = {
  totalCents: number;
  disabled: boolean;
  handleRef: React.RefObject<PaymentHandle | null>;
};
