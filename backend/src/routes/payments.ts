import express, { Router } from "express";
import { paymentProvider } from "../payments/index.ts";
import { markOnlinePaymentFailed, markOnlinePaymentPaid } from "../services/crm.ts";

export const paymentsRouter = Router();

/** The browser reports a successful payment; we only trust it after checking the signature. */
paymentsRouter.post("/verify", express.json(), async (req, res) => {
  if (!paymentProvider) {
    res.status(503).json({ ok: false, error: "Online payment is not available" });
    return;
  }
  const verified = paymentProvider.verifyCallback(req.body);
  if (!verified) {
    res.status(400).json({ ok: false, error: "We couldn't verify this payment. If money was deducted, please contact us." });
    return;
  }
  const result = await markOnlinePaymentPaid({ ...verified, provider: paymentProvider.name });
  if (!result.found) {
    res.status(404).json({ ok: false, error: "Payment not found" });
    return;
  }
  res.json({ ok: true });
});

/**
 * Gateway-to-server notification. It's the backup for when the customer closes the tab before
 * the browser callback runs. Needs the raw body for the signature check.
 * Configure in Razorpay: Settings → Webhooks → <site>/api/payments/webhook, events payment.captured and payment.failed.
 */
paymentsRouter.post("/webhook", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
  if (!paymentProvider) {
    res.status(503).end();
    return;
  }
  const event = paymentProvider.parseWebhook(req.body as Buffer, req.headers);
  if (!event) {
    res.status(400).json({ ok: false });
    return;
  }
  if (event.event === "paid") {
    await markOnlinePaymentPaid({ orderId: event.orderId, paymentId: event.paymentId, method: event.method, provider: paymentProvider.name });
  } else if (event.event === "failed") {
    await markOnlinePaymentFailed({ orderId: event.orderId, provider: paymentProvider.name });
  }
  res.json({ ok: true });
});
