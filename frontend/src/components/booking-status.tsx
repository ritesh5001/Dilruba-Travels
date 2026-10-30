"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CircleAlert, Clock, CreditCard, Loader2, Phone } from "lucide-react";
import {
  bookingStatusLabels,
  formatINR,
  formatTravelMonth,
  type CheckoutSession,
  type PublicBooking,
} from "@dilruba/shared/booking";
import { formatDay } from "@dilruba/shared/ops";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email?: string; contact: string };
  theme: { color: string };
  handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment window. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

const statusStyles: Record<PublicBooking["status"], string> = {
  requested: "bg-amber/20 text-ink",
  awaiting_payment: "bg-amber/20 text-ink",
  confirmed: "bg-[#25d366]/15 text-[#0f7a3a]",
  completed: "bg-[#25d366]/15 text-[#0f7a3a]",
  cancelled: "bg-brand/10 text-brand",
};

export function BookingStatus() {
  const search = useSearchParams();
  const ref = (search.get("ref") ?? "").toUpperCase();
  const token = search.get("t") ?? "";
  const isNew = search.get("new") === "1";

  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payState, setPayState] = useState<{ busy: boolean; error?: string; paid?: boolean }>({ busy: false });

  const load = useCallback(async () => {
    if (!ref || !token) {
      setLoadError("This booking link is incomplete.");
      return;
    }
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(ref)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      const body = (await res.json()) as { booking?: PublicBooking; error?: string };
      if (!res.ok || !body.booking) throw new Error(body.error ?? "Booking not found");
      setBooking(body.booking);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load your booking");
    }
  }, [ref, token]);

  useEffect(() => {
    // Fetching on mount: the booking lives in the backend, keyed by the secret link.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function pay(kind: "due" | "full") {
    setPayState({ busy: true });
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(ref)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, kind }),
      });
      const body = (await res.json()) as { checkout?: CheckoutSession; error?: string };
      if (!res.ok || !body.checkout) throw new Error(body.error ?? "Couldn't start the payment");
      const checkout = body.checkout;

      if (checkout.provider === "redirect") {
        window.location.href = checkout.url;
        return;
      }

      await loadRazorpay();
      const rzp = new window.Razorpay!({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        prefill: { name: checkout.prefill.name, email: checkout.prefill.email ?? undefined, contact: checkout.prefill.contact },
        theme: { color: "#dc2025" },
        handler: async (response) => {
          setPayState({ busy: true });
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (verify.ok) {
            setPayState({ busy: false, paid: true });
          } else {
            const v = (await verify.json().catch(() => ({}))) as { error?: string };
            setPayState({ busy: false, error: v.error ?? "We couldn't confirm the payment yet. If money was deducted, it will update shortly." });
          }
          await load();
        },
        modal: { ondismiss: () => setPayState({ busy: false }) },
      });
      rzp.on("payment.failed", () => setPayState({ busy: false, error: "The payment didn't go through. No money was taken; please try again." }));
      rzp.open();
    } catch (err) {
      setPayState({ busy: false, error: err instanceof Error ? err.message : "Couldn't start the payment" });
    }
  }

  if (loadError) {
    return (
      <div className="rounded-[1.75rem] border border-line bg-white p-8 text-center">
        <CircleAlert className="mx-auto size-10 text-brand" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">We couldn&apos;t open this booking</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{loadError} The link is in the email we sent you. Or contact us and quote your booking reference.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a href={whatsappLink(`Assalamu Alaikum, I need help with booking ${ref}.`)} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="size-4" /> WhatsApp us
          </a>
          <a href={site.phoneHref} className="btn btn-outline"><Phone className="size-4" aria-hidden /> {site.phone}</a>
        </div>
      </div>
    );
  }

  if (!booking) return <BookingStatusSkeleton />;

  const travellers = `${booking.adults} adult${booking.adults === 1 ? "" : "s"}${booking.children ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}` : ""}`;
  const depositStage = booking.depositAmount !== null && booking.amountPaid < booking.depositAmount;
  const canPayFull = booking.balance !== null && booking.balance > booking.dueNow;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="rounded-[1.75rem] border border-line bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
        {isNew && booking.status === "requested" && (
          <div role="status" className="mb-6 flex gap-3 rounded-2xl bg-[#25d366]/10 p-4 text-sm">
            <CheckCircle2 className="size-5 shrink-0 text-[#0f7a3a]" aria-hidden />
            <p>
              <strong>Booking request sent.</strong> We&apos;ve emailed you a copy. Save this page or the link in that email:
              it&apos;s where you&apos;ll pay and track your booking.
            </p>
          </div>
        )}
        {payState.paid && (
          <div role="status" className="mb-6 flex gap-3 rounded-2xl bg-[#25d366]/10 p-4 text-sm">
            <CheckCircle2 className="size-5 shrink-0 text-[#0f7a3a]" aria-hidden />
            <p><strong>Payment received, JazakAllah Khair.</strong> A receipt is on its way to your email.</p>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Booking reference</p>
            <p className="font-display text-2xl font-semibold tracking-wide">{booking.reference}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[booking.status]}`}>
            {bookingStatusLabels[booking.status]}
          </span>
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Package</dt><dd className="mt-0.5 font-semibold">{booking.packageTitle}</dd></div>
          <div><dt className="text-muted">Lead traveller</dt><dd className="mt-0.5 font-semibold">{booking.name}</dd></div>
          {booking.departure ? (
            <div><dt className="text-muted">Travel dates</dt><dd className="mt-0.5 font-semibold">{formatDay(booking.departure.startDate)}{booking.departure.endDate ? ` – ${formatDay(booking.departure.endDate)}` : ""}</dd></div>
          ) : (
            <div><dt className="text-muted">Travel month</dt><dd className="mt-0.5 font-semibold">{formatTravelMonth(booking.travelMonth)}</dd></div>
          )}
          <div><dt className="text-muted">Travellers</dt><dd className="mt-0.5 font-semibold">{travellers}</dd></div>
        </dl>

        {booking.instalments.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">Payment schedule</h3>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line text-sm">
              {booking.instalments.map((i, n) => (
                <li key={n} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span>
                    <span className="font-medium">{i.label}</span>
                    <span className="block text-muted">Due {formatDay(i.dueDate)}</span>
                  </span>
                  <span className="text-right">
                    <span className="font-semibold">{formatINR(i.amount)}</span>
                    <span className={`block text-xs font-semibold ${i.state === "paid" ? "text-[#0f7a3a]" : i.state === "overdue" ? "text-brand" : "text-muted"}`}>
                      {i.state === "paid" ? "Paid" : i.state === "overdue" ? "Overdue" : i.state === "part_paid" ? "Part paid" : "Upcoming"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {booking.payments.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">Payments</h3>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line text-sm">
              {booking.payments.map((p, i) => (
                <li key={i} className="flex justify-between gap-4 px-4 py-3">
                  <span className="text-muted">
                    {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {p.method ? ` · ${p.method.replace("_", " ")}` : ""}
                  </span>
                  <span className="font-semibold">{formatINR(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="h-fit rounded-[1.75rem] bg-sand p-6">
        {booking.status === "requested" ? (
          <>
            <Clock className="size-8 text-brand" aria-hidden />
            <p className="mt-3 font-display text-xl font-semibold">We&apos;re preparing your price</p>
            <p className="mt-2 text-sm text-muted">
              Our team is checking availability for your dates. You&apos;ll get an email with your final price and a payment
              link, usually within one working day.
            </p>
          </>
        ) : (
          <>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Total price</dt><dd className="font-semibold">{formatINR(booking.totalAmount)}</dd></div>
              {booking.tcsAmount > 0 && (
                <div className="flex justify-between gap-3"><dt className="text-muted">TCS <span className="text-xs">(claim against income tax)</span></dt><dd className="font-semibold">{formatINR(booking.tcsAmount)}</dd></div>
              )}
              {booking.depositAmount !== null && (
                <div className="flex justify-between"><dt className="text-muted">Booking deposit</dt><dd className="font-semibold">{formatINR(booking.depositAmount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd className="font-semibold">{formatINR(booking.amountPaid)}</dd></div>
              {booking.refundedAmount > 0 && (
                <div className="flex justify-between"><dt className="text-muted">Refunded to you</dt><dd className="font-semibold">{formatINR(booking.refundedAmount)}</dd></div>
              )}
              {booking.status !== "cancelled" && (
                <div className="flex justify-between border-t border-line pt-3 text-base"><dt>Balance</dt><dd className="font-semibold">{formatINR(booking.balance)}</dd></div>
              )}
            </dl>

            {booking.dueNow > 0 && booking.onlinePaymentsEnabled && (
              <div className="mt-6 grid gap-2">
                <button type="button" onClick={() => pay("due")} disabled={payState.busy} className="btn btn-primary disabled:opacity-70">
                  {payState.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
                  {depositStage ? `Pay deposit ${formatINR(booking.dueNow)}` : `Pay ${formatINR(booking.dueNow)}`}
                </button>
                {canPayFull && (
                  <button type="button" onClick={() => pay("full")} disabled={payState.busy} className="btn btn-outline disabled:opacity-70">
                    Pay full balance {formatINR(booking.balance)}
                  </button>
                )}
                <p className="text-center text-xs text-muted">Secure payment by UPI, card or net banking.</p>
              </div>
            )}
            {booking.dueNow > 0 && !booking.onlinePaymentsEnabled && (
              <p className="mt-6 text-sm text-muted">
                To pay, contact us on {site.phone} for bank transfer or UPI details, quoting reference {booking.reference}.
              </p>
            )}
            {booking.balance === 0 && booking.status !== "cancelled" && (
              <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#0f7a3a]">
                <CheckCircle2 className="size-4" aria-hidden /> Fully paid
              </p>
            )}
            {payState.error && (
              <p role="alert" className="mt-4 text-sm font-medium text-brand">{payState.error}</p>
            )}
          </>
        )}
        <div className="mt-6 border-t border-line pt-5">
          <a href={whatsappLink(`Assalamu Alaikum, I have a question about booking ${booking.reference}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full">
            <WhatsAppIcon className="size-4" /> Questions? WhatsApp us
          </a>
        </div>
      </aside>
    </div>
  );
}

export function BookingStatusSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]" aria-busy="true" aria-label="Loading your booking">
      <div className="h-80 animate-pulse rounded-[1.75rem] bg-sand" />
      <div className="h-64 animate-pulse rounded-[1.75rem] bg-sand" />
    </div>
  );
}
