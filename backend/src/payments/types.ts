import type { CheckoutSession } from "@dilruba/shared/booking";

/**
 * Everything the booking system needs from a payment gateway. Razorpay implements it today;
 * an ICICI implementation can be added alongside it (see ./index.ts) without touching bookings.
 */
export interface PaymentProvider {
  /** Stored in payments.provider. */
  readonly name: string;

  /** Creates a gateway order for `amount` paise and returns how the browser should collect it. */
  createCheckout(input: {
    amount: number;
    receipt: string;
    description: string;
    customer: { name: string; email: string | null; phone: string };
  }): Promise<{ orderId: string; session: CheckoutSession }>;

  /**
   * Checks the browser's "payment succeeded" callback is genuine.
   * Returns the gateway's order and payment ids, or null if verification fails.
   */
  verifyCallback(body: unknown): { orderId: string; paymentId: string; method?: string } | null;

  /**
   * Checks and reads a server-to-server webhook. Returns null when the signature is invalid;
   * `event: "ignored"` for events we don't act on.
   */
  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>):
    | { event: "paid"; orderId: string; paymentId: string; amount: number; method?: string }
    | { event: "failed"; orderId: string; paymentId: string }
    | { event: "ignored" }
    | null;
}
