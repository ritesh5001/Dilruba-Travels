import { formatINR } from "@dilruba/shared/booking";
import { quoteTotal, todayIST, type PublicQuote, type QuoteStatus } from "@dilruba/shared/ops";
import { db } from "../db/index.ts";
import type { Customer, Quote } from "../db/schema.ts";
import { notifyAdmin } from "../email/send.ts";
import { leadOwner, notify } from "./notifications.ts";
import { adminQuoteResponseEmail, bookingLink } from "../email/templates.ts";
import { accessToken, bookingReference } from "../lib/util.ts";
import { addEvent } from "./crm.ts";
import { getSettings, tcsFor } from "./settings.ts";

/** A sent quote past its "valid until" date reads as expired. */
export function effectiveStatus(q: Pick<Quote, "status" | "valid_until">): QuoteStatus {
  return q.status === "sent" && q.valid_until && q.valid_until < todayIST() ? "expired" : q.status;
}

export async function toPublicQuote(q: Quote, c: Customer): Promise<PublicQuote> {
  const [departure, booking] = await Promise.all([
    q.departure_id ? db.selectFrom("departures").select(["title", "start_date", "end_date"]).where("id", "=", q.departure_id).executeTakeFirst() : undefined,
    q.booking_id ? db.selectFrom("bookings").select(["reference", "access_token"]).where("id", "=", q.booking_id).executeTakeFirst() : undefined,
  ]);
  return {
    reference: q.reference,
    status: effectiveStatus(q),
    title: q.title,
    customerName: c.name,
    travelMonth: q.travel_month,
    departure: departure ? { title: departure.title, startDate: departure.start_date, endDate: departure.end_date } : null,
    adults: q.adults,
    children: q.children,
    items: q.items,
    discount: q.discount,
    total: quoteTotal({ items: q.items, discount: q.discount }),
    deposit: q.deposit,
    inclusions: q.inclusions,
    message: q.message,
    validUntil: q.valid_until,
    bookingLink: booking ? bookingLink(booking) : null,
  };
}

/**
 * Turns a quote into a booking at the quoted price (staff, or the customer from their quote
 * page). Returns the booking id; accepting twice returns the same booking.
 */
export async function acceptQuote(quoteId: number, by: { staff?: string }) {
  // Read before the transaction: every query inside it must go through trx.
  const settings = await getSettings();
  const result = await db.transaction().execute(async (trx) => {
    const q = await trx.selectFrom("quotes").selectAll().where("id", "=", quoteId).forUpdate().executeTakeFirstOrThrow();
    if (q.booking_id) return { bookingId: q.booking_id, created: false as const, quote: q };
    const pkg = q.package_id ? await trx.selectFrom("packages").select(["category", "slug"]).where("id", "=", q.package_id).executeTakeFirst() : undefined;
    const total = quoteTotal({ items: q.items, discount: q.discount });
    const booking = await trx
      .insertInto("bookings")
      .values({
        reference: bookingReference(),
        access_token: accessToken(),
        customer_id: q.customer_id,
        lead_id: q.lead_id,
        package_category: pkg?.category ?? null,
        package_slug: pkg?.slug ?? null,
        package_title: q.title,
        travel_month: q.travel_month,
        adults: q.adults,
        children: q.children,
        total_amount: total,
        deposit_amount: q.deposit,
        tcs_amount: tcsFor(settings, pkg?.category ?? null, total),
        departure_id: q.departure_id,
        status: "awaiting_payment",
      })
      .returning(["id", "reference"])
      .executeTakeFirstOrThrow();
    await trx.updateTable("quotes").set({ status: "accepted", booking_id: booking.id, responded_at: new Date(), updated_at: new Date() }).where("id", "=", q.id).execute();
    if (q.lead_id) {
      await trx.updateTable("leads").set({ status: "converted", follow_up_at: null, follow_up_note: null, updated_at: new Date() }).where("id", "=", q.lead_id).execute();
      await addEvent(trx, { lead_id: q.lead_id, author: by.staff ?? null, body: `Quote ${q.reference} accepted${by.staff ? ` (recorded by ${by.staff})` : " by the customer online"}: booking ${booking.reference}.` });
    }
    await addEvent(trx, {
      booking_id: booking.id,
      customer_id: q.customer_id,
      author: by.staff ?? null,
      body: `Created from quote ${q.reference} at ${formatINR(total)}${by.staff ? ` by ${by.staff}` : ", accepted by the customer online"}.`,
    });
    return { bookingId: booking.id, created: true as const, quote: q };
  });
  if (result.created && !by.staff) {
    const c = await db.selectFrom("customers").selectAll().where("id", "=", result.quote.customer_id).executeTakeFirstOrThrow();
    void notifyAdmin(adminQuoteResponseEmail(result.quote, c, true, result.bookingId));
    void leadOwner(result.quote.lead_id).then((to) =>
      notify(to, { type: "quote", title: `Quote accepted by ${c.name}`, body: `${result.quote.reference} · ${result.quote.title}`, link: `/admin/bookings/${result.bookingId}` }),
    );
  }
  return result.bookingId;
}
