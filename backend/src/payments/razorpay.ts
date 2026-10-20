import { createHmac } from "node:crypto";
import { z } from "zod";
import { safeEqual } from "../lib/password.ts";
import type { PaymentProvider } from "./types.ts";

// https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/
// Uses the REST API directly, so there is no SDK to keep up to date.

const callbackSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

const webhookSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z.object({
            id: z.string(),
            order_id: z.string().nullable(),
            amount: z.number(),
            method: z.string().optional(),
          }),
        })
        .optional(),
    })
    .optional(),
});

function hmac(secret: string, data: string | Buffer) {
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function createRazorpayProvider(opts: { keyId: string; keySecret: string; webhookSecret?: string }): PaymentProvider {
  const auth = `Basic ${Buffer.from(`${opts.keyId}:${opts.keySecret}`).toString("base64")}`;

  return {
    name: "razorpay",

    async createCheckout({ amount, receipt, description, customer }) {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "INR", receipt, notes: { booking: receipt } }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
      const order = (await res.json()) as { id: string; amount: number };
      return {
        orderId: order.id,
        session: {
          provider: "razorpay",
          keyId: opts.keyId,
          orderId: order.id,
          amount: order.amount,
          currency: "INR",
          name: "Dilruba Travels",
          description,
          prefill: { name: customer.name, email: customer.email, contact: customer.phone },
        },
      };
    },

    verifyCallback(body) {
      const parsed = callbackSchema.safeParse(body);
      if (!parsed.success) return null;
      const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data;
      const expected = hmac(opts.keySecret, `${orderId}|${paymentId}`);
      return safeEqual(expected, signature) ? { orderId, paymentId } : null;
    },

    parseWebhook(rawBody, headers) {
      const signature = headers["x-razorpay-signature"];
      if (!opts.webhookSecret || typeof signature !== "string") return null;
      if (!safeEqual(hmac(opts.webhookSecret, rawBody), signature)) return null;

      let json: unknown;
      try {
        json = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return null;
      }
      const parsed = webhookSchema.safeParse(json);
      if (!parsed.success) return { event: "ignored" };
      const payment = parsed.data.payload?.payment?.entity;
      if (!payment?.order_id) return { event: "ignored" };

      if (parsed.data.event === "payment.captured") {
        return { event: "paid", orderId: payment.order_id, paymentId: payment.id, amount: payment.amount, method: payment.method };
      }
      if (parsed.data.event === "payment.failed") {
        return { event: "failed", orderId: payment.order_id, paymentId: payment.id };
      }
      return { event: "ignored" };
    },
  };
}
