import { config } from "../config.ts";
import { createRazorpayProvider } from "./razorpay.ts";
import type { PaymentProvider } from "./types.ts";

// To add ICICI later: write payments/icici.ts implementing PaymentProvider, add "icici" to
// PAYMENT_PROVIDER in config.ts, and return it below. Bookings, emails and the admin panel
// don't need to change. A redirect-style gateway returns { provider: "redirect", url } from
// createCheckout and confirms the payment through parseWebhook.

function createProvider(): PaymentProvider | null {
  switch (config.PAYMENT_PROVIDER) {
    case "razorpay":
      if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) return null;
      return createRazorpayProvider({
        keyId: config.RAZORPAY_KEY_ID,
        keySecret: config.RAZORPAY_KEY_SECRET,
        webhookSecret: config.RAZORPAY_WEBHOOK_SECRET,
      });
  }
}

/** Null when no gateway is configured; customers then see "pay by bank transfer" instead. */
export const paymentProvider = createProvider();

if (!paymentProvider) console.warn("No payment gateway configured: online payments are disabled.");
