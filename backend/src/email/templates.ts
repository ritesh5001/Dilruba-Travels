import { bookingStatusLabels, formatINR, formatTravelMonth, type BookingStatus } from "@dilruba/shared/booking";
import { site, whatsappLink } from "@dilruba/shared/site";
import { config } from "../config.ts";
import type { Booking, Customer, Lead } from "../db/schema.ts";
import { escapeHtml as e } from "../lib/util.ts";
import type { Email } from "./send.ts";

type Rows = [label: string, value: string][];

export function bookingLink(b: Pick<Booking, "reference" | "access_token">) {
  return `${config.PUBLIC_SITE_URL}/booking?ref=${b.reference}&t=${encodeURIComponent(b.access_token)}`;
}

function adminLink(path: string) {
  return `${config.PUBLIC_SITE_URL}/admin${path}`;
}

function layout({ heading, intro, rows, button, footer }: {
  heading: string;
  intro: string;
  rows?: Rows;
  button?: { label: string; href: string };
  footer?: string;
}) {
  const table = rows?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid #ece5dc;color:#5e6573;width:42%">${e(k)}</td><td style="padding:8px 0;border-bottom:1px solid #ece5dc;color:#16181d;font-weight:600">${e(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const cta = button
    ? `<p style="margin:24px 0"><a href="${e(button.href)}" style="display:inline-block;background:#dc2025;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${e(button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#fbf6ef;font-family:Arial,Helvetica,sans-serif;color:#16181d">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #ece5dc">
<p style="margin:0 0 16px;font-weight:700;color:#dc2025;letter-spacing:.02em">${e(site.name)}</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${e(heading)}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#33363d">${intro}</p>
${table}${cta}
${footer ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#5e6573">${footer}</p>` : ""}
</div>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#5e6573;text-align:center">${e(site.legalName)} · ${e(site.phone)} · ${e(site.email)}</p>
</div></body></html>`;
}

function text(heading: string, intro: string, rows: Rows = [], link?: string) {
  return [heading, "", intro.replace(/<[^>]+>/g, ""), "", ...rows.map(([k, v]) => `${k}: ${v}`), link ? `\n${link}` : "", "", `${site.legalName} · ${site.phone}`].join("\n");
}

function build(opts: { to: string; subject: string; heading: string; intro: string; rows?: Rows; button?: { label: string; href: string }; footer?: string }): Email {
  return {
    to: opts.to,
    subject: opts.subject,
    html: layout(opts),
    text: text(opts.heading, opts.intro, opts.rows, opts.button?.href),
  };
}

function bookingRows(b: Booking): Rows {
  const rows: Rows = [
    ["Booking reference", b.reference],
    ["Package", b.package_title],
    ["Travel month", formatTravelMonth(b.travel_month)],
    ["Travellers", `${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`],
  ];
  if (b.total_amount !== null) rows.push(["Total price", formatINR(b.total_amount)]);
  if (b.deposit_amount !== null) rows.push(["Booking deposit", formatINR(b.deposit_amount)]);
  if (b.amount_paid > 0) rows.push(["Paid so far", formatINR(b.amount_paid)]);
  if (b.total_amount !== null && b.amount_paid > 0) rows.push(["Balance", formatINR(Math.max(0, b.total_amount - b.amount_paid))]);
  return rows;
}

const helpLine = `Questions? Reply to this email, call ${e(site.phone)} or <a href="${e(whatsappLink())}" style="color:#dc2025">message us on WhatsApp</a>.`;

// ---------------- Customer emails ----------------

export function bookingReceivedEmail(b: Booking, c: Customer) {
  return build({
    to: c.email!,
    subject: `Booking request received – ${b.reference}`,
    heading: `Assalamu Alaikum ${c.name.split(" ")[0]}, we've received your booking request`,
    intro:
      "Thank you for choosing Dilruba Travels. Our team will check availability for your dates and send you the final price, usually within one working day. No payment is taken until you've seen and accepted the price.",
    rows: bookingRows(b),
    button: { label: "View your booking", href: bookingLink(b) },
    footer: helpLine,
  });
}

export function paymentRequestEmail(b: Booking, c: Customer, dueNow: number) {
  const depositOnly = b.deposit_amount !== null && b.amount_paid < b.deposit_amount;
  return build({
    to: c.email!,
    subject: `Your price for ${b.package_title} – ${b.reference}`,
    heading: "Your booking price is ready",
    intro: depositOnly
      ? `Pay the booking deposit of <strong>${e(formatINR(dueNow))}</strong> online to confirm your seats. The balance can be paid later, before travel.`
      : `The amount due now is <strong>${e(formatINR(dueNow))}</strong>. You can pay securely online by card, UPI or net banking.`,
    rows: bookingRows(b),
    button: { label: `Pay ${formatINR(dueNow)} securely`, href: bookingLink(b) },
    footer: helpLine,
  });
}

export function paymentReceivedEmail(b: Booking, c: Customer, amount: number) {
  const balance = b.total_amount !== null ? Math.max(0, b.total_amount - b.amount_paid) : null;
  return build({
    to: c.email!,
    subject: `Payment received – ${formatINR(amount)} for ${b.reference}`,
    heading: "Payment received, JazakAllah Khair",
    intro:
      balance === 0
        ? `We've received your payment of <strong>${e(formatINR(amount))}</strong>. Your booking is fully paid.`
        : `We've received your payment of <strong>${e(formatINR(amount))}</strong>.${b.status === "confirmed" ? " Your booking is confirmed." : ""}`,
    rows: bookingRows(b),
    button: { label: "View your booking", href: bookingLink(b) },
    footer: `Our team will contact you about visa documents and travel details. ${helpLine}`,
  });
}

export function bookingStatusEmail(b: Booking, c: Customer, status: BookingStatus) {
  const copy: Partial<Record<BookingStatus, { subject: string; heading: string; intro: string }>> = {
    confirmed: {
      subject: `Booking confirmed – ${b.reference}`,
      heading: "Your booking is confirmed",
      intro: "Alhamdulillah, your booking is confirmed. Our team will be in touch about documents, visas and your travel plan.",
    },
    cancelled: {
      subject: `Booking cancelled – ${b.reference}`,
      heading: "Your booking has been cancelled",
      intro: "Your booking has been cancelled. If this is unexpected or you'd like to rebook, please contact us and we'll help.",
    },
    completed: {
      subject: `Thank you for travelling with us – ${b.reference}`,
      heading: "Thank you for travelling with Dilruba Travels",
      intro: "We hope your journey was blessed and comfortable. We'd love to hear your feedback, and to help with your next trip.",
    },
  };
  const c2 = copy[status];
  if (!c2) return null;
  return build({ to: c.email!, ...c2, rows: bookingRows(b), button: { label: "View your booking", href: bookingLink(b) }, footer: helpLine });
}

// ---------------- Owner alerts ----------------

export function adminNewBookingEmail(b: Booking, c: Customer) {
  return build({
    to: "",
    subject: `New booking request ${b.reference} – ${b.package_title}`,
    heading: "New booking request",
    intro: `${e(c.name)} requested a booking. Set the price in the admin panel and send the payment request.`,
    rows: [["Customer", c.name], ["Phone", c.phone], ["Email", c.email ?? "—"], ...bookingRows(b), ["Customer notes", b.customer_notes ?? "—"]],
    button: { label: "Open in admin", href: adminLink(`/bookings/${b.id}`) },
  });
}

export function adminNewLeadEmail(l: Lead, c: Customer) {
  return build({
    to: "",
    subject: `New enquiry – ${l.package_name ?? l.service} from ${c.name}`,
    heading: "New website enquiry",
    intro: `${e(c.name)} sent an enquiry from the website.`,
    rows: [
      ["Name", c.name],
      ["Phone", c.phone],
      ["Interested in", l.package_name ?? `${l.service}${l.option ? ` – ${l.option}` : ""}`],
      ["Travel month", formatTravelMonth(l.travel_month)],
      ["Travellers", l.travellers ? String(l.travellers) : "—"],
      ["Message", l.message ?? "—"],
      ["Form", l.source ?? "—"],
    ],
    button: { label: "Open in admin", href: adminLink(`/leads/${l.id}`) },
  });
}

export function adminPaymentEmail(b: Booking, c: Customer, amount: number) {
  return build({
    to: "",
    subject: `Payment received ${formatINR(amount)} – ${b.reference}`,
    heading: `${formatINR(amount)} received online`,
    intro: `${e(c.name)} paid online. Booking status: ${e(bookingStatusLabels[b.status])}.`,
    rows: [["Customer", c.name], ["Phone", c.phone], ...bookingRows(b)],
    button: { label: "Open in admin", href: adminLink(`/bookings/${b.id}`) },
  });
}
