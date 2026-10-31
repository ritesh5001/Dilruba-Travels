import { getSettings, tcsFor } from "../services/settings.ts";
import { bookingRequestSchema, payRequestSchema } from "@dilruba/shared/booking";
import { Router } from "express";
import { db } from "../db/index.ts";
import { notifyAdmin, sendEmail } from "../email/send.ts";
import { adminNewBookingEmail, bookingReceivedEmail } from "../email/templates.ts";
import { rateLimit, safeEqual } from "../lib/auth.ts";
import { accessToken, bookingReference, parseBody } from "../lib/util.ts";
import { paymentProvider } from "../payments/index.ts";
import { todayIST } from "@dilruba/shared/ops";
import { refreshWebsite } from "../services/catalog.ts";
import { notify } from "../services/notifications.ts";
import { addEvent, applyReferral, balanceOf, dueNow, toPublicBooking, upsertCustomer } from "../services/crm.ts";

export const bookingsRouter = Router();

/** Customer submits "Book this package". Staff set the price before anything is paid. */
bookingsRouter.post(
  "/",
  rateLimit({ windowMs: 60 * 60_000, max: 10, message: "Too many booking requests. Please call or WhatsApp us." }),
  async (req, res) => {
    const data = parseBody(bookingRequestSchema, req.body, res);
    if (!data) return;
    if (data.website) {
      // Honeypot filled: look successful to the bot, store nothing.
      res.json({ ok: true, reference: "DT000000", token: "" });
      return;
    }

    const pkg = await db.selectFrom("packages").selectAll().where("category", "=", data.packageCategory).where("slug", "=", data.packageSlug).where("published", "=", true).executeTakeFirst();
    if (!pkg) return void res.status(404).json({ ok: false, error: "Package is no longer available" });
    const unitPrice = data.roomType ? pkg.room_prices[data.roomType] : null;
    const total = unitPrice == null ? null : Math.round(unitPrice * (data.adults + data.children) * 100);
    const settings = await getSettings();
    // The customer picked a fixed date: it must be an open, upcoming departure of this package
    // with enough seats, or they're told to pick another.
    let departure: { id: number; title: string; start_date: string } | undefined;
    if (data.departureId) {
      const d = await db
        .selectFrom("departures")
        .innerJoin("packages", "packages.id", "departures.package_id")
        .select(["departures.id", "departures.title", "departures.seats", "departures.start_date"])
        .select((eb) =>
          eb
            .selectFrom("bookings")
            .whereRef("bookings.departure_id", "=", "departures.id")
            .where("bookings.status", "!=", "cancelled")
            .select((s) => s.fn.coalesce(s.fn.sum<number>(s("bookings.adults", "+", s.ref("bookings.children"))), s.val(0)).as("n"))
            .as("booked"),
        )
        .where("departures.id", "=", data.departureId)
        .where("departures.status", "=", "open")
        .where("packages.category", "=", data.packageCategory)
        .where("packages.slug", "=", data.packageSlug)
        .executeTakeFirst();
      if (!d || d.start_date <= todayIST()) {
        return void res.status(409).json({ ok: false, error: "That date is no longer available. Please choose another date." });
      }
      const left = d.seats - Number(d.booked ?? 0);
      if (left < data.adults + data.children) {
        return void res.status(409).json({
          ok: false,
          error: left > 0 ? `Only ${left} seat${left === 1 ? "" : "s"} left on this date. Choose another date or fewer travellers.` : "This date is now full. Please choose another date.",
        });
      }
      departure = d;
    }

    const { booking, customer } = await db.transaction().execute(async (trx) => {
      const customer = await upsertCustomer(trx, { name: data.name, phone: data.phone, email: data.email });
      const referrer = await applyReferral(trx, customer.id, data.referralCode);
      // References are random; retry in the unlikely event of a clash.
      for (let attempt = 0; ; attempt++) {
        const reference = bookingReference();
        const exists = await trx.selectFrom("bookings").select("id").where("reference", "=", reference).executeTakeFirst();
        if (exists && attempt < 5) continue;
        const booking = await trx
          .insertInto("bookings")
          .values({
            reference,
            access_token: accessToken(),
            customer_id: customer.id,
            package_category: data.packageCategory,
            package_slug: data.packageSlug,
            package_title: pkg.title,
            travel_month: departure?.start_date.slice(0, 7) ?? data.travelMonth,
            adults: data.adults,
            children: data.children,
            customer_notes: data.notes ?? null,
            mobile: data.mobile ?? null,
            passport_number: data.passportNumber?.toUpperCase() ?? null,
            room_type: data.roomType ?? null,
            total_amount: total,
            tcs_amount: tcsFor(settings, pkg.category, total),
            departure_id: departure?.id ?? null,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        const extras = [departure && `departure: ${departure.title}`, referrer && `referred by ${referrer.name}`].filter(Boolean);
        await addEvent(trx, { booking_id: booking.id, customer_id: customer.id, body: `Booking requested on the website${extras.length ? ` (${extras.join("; ")})` : ""}.` });
        return { booking, customer };
      }
    });

    // Seats left on the website change with each booking.
    if (departure) void refreshWebsite();
    void (async () => {
      await sendEmail(bookingReceivedEmail(booking, customer));
      await notifyAdmin(adminNewBookingEmail(booking, customer));
      await notify(
        { roles: ["owner", "manager", "operations"] },
        { type: "booking", title: `New booking request: ${customer.name}`, body: `${booking.package_title} · ${booking.adults + booking.children} travellers${departure ? ` · ${departure.title}` : ""}`, link: `/admin/bookings/${booking.id}` },
      );
    })().catch((err: unknown) => console.error("[bookings] after-booking tasks failed:", err));

    res.status(201).json({ ok: true, reference: booking.reference, token: booking.access_token });
  },
);

async function findBooking(reference: unknown, token: unknown) {
  if (typeof reference !== "string" || typeof token !== "string" || !token) return null;
  const booking = await db.selectFrom("bookings").selectAll().where("reference", "=", reference.toUpperCase()).executeTakeFirst();
  if (!booking || !safeEqual(booking.access_token, token)) return null;
  return booking;
}

bookingsRouter.get("/:reference", async (req, res) => {
  const booking = await findBooking(req.params.reference, req.query.t);
  if (!booking) {
    res.status(404).json({ ok: false, error: "Booking not found. Please use the link from your email." });
    return;
  }
  const [customer, payments, instalments, departure] = await Promise.all([
    db.selectFrom("customers").selectAll().where("id", "=", booking.customer_id).executeTakeFirstOrThrow(),
    db.selectFrom("payments").selectAll().where("booking_id", "=", booking.id).orderBy("created_at").execute(),
    db.selectFrom("instalments").selectAll().where("booking_id", "=", booking.id).execute(),
    booking.departure_id ? db.selectFrom("departures").selectAll().where("id", "=", booking.departure_id).executeTakeFirst() : Promise.resolve(undefined),
  ]);
  res.json({ ok: true, booking: toPublicBooking(booking, customer, payments, { instalments, departure: departure ?? null }) });
});

/** Starts an online payment for what's due now (or the full balance). */
bookingsRouter.post(
  "/:reference/pay",
  rateLimit({ windowMs: 15 * 60_000, max: 20, message: "Too many payment attempts. Please wait a few minutes." }),
  async (req, res) => {
    const data = parseBody(payRequestSchema, req.body, res);
    if (!data) return;
    const booking = await findBooking(req.params.reference, data.token);
    if (!booking) {
      res.status(404).json({ ok: false, error: "Booking not found" });
      return;
    }
    if (!paymentProvider) {
      res.status(503).json({ ok: false, error: "Online payment is not available right now. Please contact us to pay by bank transfer or UPI." });
      return;
    }
    const instalments = await db.selectFrom("instalments").selectAll().where("booking_id", "=", booking.id).execute();
    const due = dueNow(booking, instalments);
    const amount = data.kind === "full" ? (balanceOf(booking) ?? 0) : due;
    if (due <= 0 || amount <= 0) {
      res.status(409).json({ ok: false, error: "There is nothing to pay on this booking right now." });
      return;
    }

    const customer = await db.selectFrom("customers").selectAll().where("id", "=", booking.customer_id).executeTakeFirstOrThrow();
    let checkout: Awaited<ReturnType<typeof paymentProvider.createCheckout>>;
    try {
      checkout = await paymentProvider.createCheckout({
        amount,
        receipt: booking.reference,
        description: `${booking.package_title} (${booking.reference})`,
        customer: { name: customer.name, email: customer.email, phone: customer.phone },
      });
    } catch (err) {
      console.error(`[payments] Could not start payment for ${booking.reference}:`, err);
      res.status(502).json({ ok: false, error: "We couldn't start the payment just now. Please try again in a minute, or contact us." });
      return;
    }
    const { orderId, session } = checkout;
    await db
      .insertInto("payments")
      .values({ booking_id: booking.id, provider: paymentProvider.name, provider_order_id: orderId, amount, status: "created" })
      .execute();

    res.json({ ok: true, checkout: session });
  },
);
