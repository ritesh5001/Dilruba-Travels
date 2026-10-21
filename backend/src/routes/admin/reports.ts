import { bookingStatusLabels, leadStatuses, leadStatusLabels, paymentMethodLabels, type LeadStatus, type PaymentMethod } from "@dilruba/shared/booking";
import { categoryNames, categorySlugs, type CategorySlug } from "@dilruba/shared/catalog";
import {
  audienceSegments,
  genderLabels,
  passportProblem,
  quoteTotal,
  roomTypeLabels,
  todayIST,
  visaStatusLabels,
  type AudienceRow,
  type AudienceSegment,
  type Reports,
} from "@dilruba/shared/ops";
import { Router, type Response } from "express";
import { sql } from "kysely";
import { db } from "../../db/index.ts";
import { requireOwner } from "../../lib/auth.ts";
import { parseId } from "../../lib/util.ts";

export const reportsRouter = Router();

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, India time); the last 90 days by default. */
function range(query: Record<string, unknown>) {
  const to = isDate(query.to) ? query.to : todayIST();
  const from = isDate(query.from) ? query.from : todayIST(new Date(Date.now() - 89 * 864e5));
  // Timestamps compared in India time, so "1 April" means 1 April in Mumbai.
  return { from, to, start: sql<Date>`(${from}::date)::timestamp at time zone 'Asia/Kolkata'`, end: sql<Date>`(${to}::date + 1)::timestamp at time zone 'Asia/Kolkata'` };
}

reportsRouter.get("/", requireOwner, async (req, res) => {
  const { from, to, start, end } = range(req.query);
  // "Package: Economy Umrah" and "Popup · /packages" group as "Package" and "Popup".
  const sourceGroup = sql<string>`coalesce(nullif(trim(split_part(split_part(coalesce(leads.source, ''), ':', 1), '·', 1)), ''), 'Unknown')`;
  const month = sql<string>`to_char(payments.paid_at at time zone 'Asia/Kolkata', 'YYYY-MM')`;

  const [statusRows, sources, lost, staff, revenue, bookingsByMonth, categories, quotes, feedback, repeat, referred] = await Promise.all([
    db.selectFrom("leads").select(["status"]).select((eb) => eb.fn.countAll<number>().as("n")).where("created_at", ">=", start).where("created_at", "<", end).groupBy("status").execute(),
    db
      .selectFrom("leads")
      .select(sourceGroup.as("source"))
      .select((eb) => [eb.fn.countAll<number>().as("leads"), eb.fn.countAll<number>().filterWhere("status", "=", "converted").as("converted")])
      .where("created_at", ">=", start)
      .where("created_at", "<", end)
      .groupBy(sourceGroup)
      .orderBy("leads", "desc")
      .execute(),
    db
      .selectFrom("leads")
      .select(sql<string>`coalesce(lost_reason, 'No reason given')`.as("reason"))
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("status", "=", "lost")
      .where("created_at", ">=", start)
      .where("created_at", "<", end)
      .groupBy(sql`coalesce(lost_reason, 'No reason given')`)
      .orderBy("count", "desc")
      .execute(),
    db
      .selectFrom("leads")
      .leftJoin("users", "users.id", "leads.assigned_to")
      .select(sql<string>`coalesce(users.name, 'Unassigned')`.as("name"))
      .select((eb) => [eb.fn.countAll<number>().as("leads"), eb.fn.countAll<number>().filterWhere("leads.status", "=", "converted").as("converted")])
      .where("leads.created_at", ">=", start)
      .where("leads.created_at", "<", end)
      .groupBy(sql`coalesce(users.name, 'Unassigned')`)
      .orderBy("leads", "desc")
      .execute(),
    // Money received per month over the last 12 months, whatever the range.
    db
      .selectFrom("payments")
      .select(month.as("month"))
      .select((eb) => eb.fn.sum<number>("amount").as("received"))
      .where("status", "=", "paid")
      .where("paid_at", ">=", sql<Date>`date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' - interval '11 months'`)
      .groupBy(month)
      .execute(),
    db
      .selectFrom("bookings")
      .select(sql<string>`to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM')`.as("month"))
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("status", "!=", "cancelled")
      .where("created_at", ">=", sql<Date>`date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' - interval '11 months'`)
      .groupBy(sql`to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM')`)
      .execute(),
    db
      .selectFrom("bookings")
      .select(sql<string>`coalesce(package_category, 'other')`.as("category"))
      .select((eb) => [
        eb.fn.countAll<number>().as("bookings"),
        eb.fn.coalesce(eb.fn.sum<number>("total_amount"), eb.val(0)).as("sales"),
        eb.fn
          .coalesce(
            eb.fn.sum<number>(eb.selectFrom("booking_costs").whereRef("booking_costs.booking_id", "=", "bookings.id").select((s) => s.fn.sum<number>("amount").as("c"))),
            eb.val(0),
          )
          .as("costs"),
      ])
      .where("status", "!=", "cancelled")
      .where("created_at", ">=", start)
      .where("created_at", "<", end)
      .groupBy(sql`coalesce(package_category, 'other')`)
      .orderBy("sales", "desc")
      .execute(),
    db.selectFrom("quotes").select(["status", "items", "discount"]).where("sent_at", ">=", start).where("sent_at", "<", end).execute(),
    db
      .selectFrom("feedback")
      .select((eb) => [eb.fn.countAll<number>().as("count"), eb.fn.avg<number>("rating").as("average")])
      .where("created_at", ">=", start)
      .where("created_at", "<", end)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom(
        db.selectFrom("bookings").select("customer_id").where("status", "!=", "cancelled").groupBy("customer_id").having((eb) => eb.fn.countAll(), ">=", 2).as("r"),
      )
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("leads")
      .innerJoin("customers", "customers.id", "leads.customer_id")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("customers.referred_by", "is not", null)
      .where("leads.created_at", ">=", start)
      .where("leads.created_at", "<", end)
      .executeTakeFirstOrThrow(),
  ]);

  const byStatus = Object.fromEntries(leadStatuses.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const r of statusRows) byStatus[r.status] = Number(r.n);

  // Every one of the last 12 months, including those with nothing in them.
  const months: string[] = [];
  const now = todayIST();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(Number(now.slice(0, 4)), Number(now.slice(5, 7)) - 1 - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const received = new Map(revenue.map((r) => [r.month, Number(r.received)]));
  const counts = new Map(bookingsByMonth.map((r) => [r.month, Number(r.n)]));

  const body: Reports = {
    range: { from, to },
    funnel: { leads: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus },
    bySource: sources.map((s) => ({ source: s.source, leads: Number(s.leads), converted: Number(s.converted) })),
    lostReasons: lost.map((l) => ({ reason: l.reason, count: Number(l.count) })),
    byStaff: staff.map((s) => ({ name: s.name, leads: Number(s.leads), converted: Number(s.converted) })),
    revenueByMonth: months.map((m) => ({ month: m, received: received.get(m) ?? 0, bookings: counts.get(m) ?? 0 })),
    byCategory: categories.map((c) => ({
      category: categoryNames[c.category as CategorySlug] ?? "Other",
      bookings: Number(c.bookings),
      sales: Number(c.sales),
      costs: Number(c.costs),
    })),
    quotes: {
      sent: quotes.length,
      accepted: quotes.filter((q) => q.status === "accepted").length,
      declined: quotes.filter((q) => q.status === "declined").length,
      acceptedValue: quotes.filter((q) => q.status === "accepted").reduce((sum, q) => sum + quoteTotal(q), 0),
    },
    feedback: { count: Number(feedback.count), average: feedback.average === null ? null : Number(feedback.average) },
    repeatCustomers: Number(repeat.n),
    referredLeads: Number(referred.n),
  };
  res.json(body);
});

// ---------------- Audience (repeat-customer campaigns) ----------------

async function audience(query: Record<string, unknown>): Promise<AudienceRow[]> {
  const segment = (Object.keys(audienceSegments) as AudienceSegment[]).find((s) => s === query.segment) ?? "travelled";
  const category = categorySlugs.find((c) => c === query.category);
  // Last trip before this date: e.g. people who went for Umrah over a year ago.
  const lastTripBefore = isDate(query.before) ? query.before : null;

  let q = db
    .selectFrom("customers")
    .leftJoin(
      (eb) =>
        eb
          .selectFrom("bookings")
          .select("customer_id")
          .select((s) => [
            s.fn.countAll<number>().as("bookings"),
            s.fn.max("created_at").as("last_at"),
            s.fn.sum<number>("amount_paid").as("paid"),
            sql<string>`(array_agg(package_title order by created_at desc))[1]`.as("last_trip"),
            sql<string>`(array_agg(travel_month order by created_at desc))[1]`.as("last_month"),
          ])
          .where("status", "in", ["confirmed", "completed"])
          .$if(!!category, (b) => b.where("package_category", "=", category!))
          .groupBy("customer_id")
          .as("b"),
      (join) => join.onRef("b.customer_id", "=", "customers.id"),
    )
    .select(["customers.id", "customers.name", "customers.phone", "customers.email", "customers.referral_code", "b.bookings", "b.paid", "b.last_trip", "b.last_month", "b.last_at"]);

  if (segment === "travelled") q = q.where("b.bookings", ">", 0);
  if (segment === "enquired") {
    q = q
      .where("b.bookings", "is", null)
      .where((eb) => eb.not(eb.exists(eb.selectFrom("bookings").select("id").whereRef("bookings.customer_id", "=", "customers.id"))))
      .where((eb) =>
        eb.exists(
          eb
            .selectFrom("leads")
            .select("id")
            .whereRef("leads.customer_id", "=", "customers.id")
            .$if(!!category, (l) => l.where("leads.service", "=", categoryNames[category!])),
        ),
      );
  }
  if (lastTripBefore) q = q.where("b.last_at", "<", sql<Date>`${lastTripBefore}::date`);
  if (query.hasEmail === "1") q = q.where("customers.email", "is not", null);

  const rows = await q.orderBy("customers.updated_at", "desc").limit(2000).execute();
  return rows.map((r) => ({
    customerId: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    bookings: Number(r.bookings ?? 0),
    lastTrip: r.last_trip ?? null,
    lastTravelMonth: r.last_month ?? null,
    totalPaid: Number(r.paid ?? 0),
    referralCode: r.referral_code,
  }));
}

reportsRouter.get("/audience", requireOwner, async (req, res) => {
  res.json(await audience(req.query));
});

// ---------------- CSV exports ----------------

function csv(res: Response, filename: string, header: string[], rows: unknown[][]) {
  // Quote every cell; a leading = + - @ is neutralised so spreadsheets don't run it as a formula.
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const body = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}-${todayIST()}.csv"`);
  res.setHeader("Cache-Control", "private, no-store");
  // Byte-order mark so Excel reads ₹ and Arabic names correctly.
  res.send(`﻿${body}`);
}

const rupees = (paise: number | null) => (paise === null ? "" : (paise / 100).toFixed(2));
const ist = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "");

reportsRouter.get("/export/leads.csv", requireOwner, async (_req, res) => {
  const rows = await db
    .selectFrom("leads")
    .innerJoin("customers", "customers.id", "leads.customer_id")
    .leftJoin("users", "users.id", "leads.assigned_to")
    .selectAll("leads")
    .select(["customers.name", "customers.phone", "customers.email", "users.name as staff"])
    .orderBy("leads.created_at", "desc")
    .execute();
  csv(
    res,
    "leads",
    ["Received", "Name", "Phone", "Email", "Interested in", "Travel month", "Travellers", "Source", "Status", "Lost reason", "Assigned to", "Next follow-up", "Message"],
    rows.map((r) => [ist(r.created_at), r.name, r.phone, r.email, r.package_name ?? r.service, r.travel_month, r.travellers, r.source, leadStatusLabels[r.status], r.lost_reason, r.staff, ist(r.follow_up_at), r.message]),
  );
});

reportsRouter.get("/export/bookings.csv", requireOwner, async (_req, res) => {
  const rows = await db
    .selectFrom("bookings")
    .innerJoin("customers", "customers.id", "bookings.customer_id")
    .leftJoin("departures", "departures.id", "bookings.departure_id")
    .selectAll("bookings")
    .select(["customers.name", "customers.phone", "customers.email", "departures.title as departure", "departures.start_date"])
    .select((eb) => eb.selectFrom("booking_costs").whereRef("booking_costs.booking_id", "=", "bookings.id").select((s) => s.fn.sum<number>("amount").as("c")).as("costs"))
    .orderBy("bookings.created_at", "desc")
    .execute();
  csv(
    res,
    "bookings",
    ["Reference", "Created", "Customer", "Phone", "Email", "Package", "Departure", "Travel month", "Adults", "Children", "Status", "Total (₹)", "TCS (₹)", "Paid (₹)", "Balance (₹)", "Costs (₹)", "Margin (₹)", "Invoice"],
    rows.map((r) => {
      const costs = Number(r.costs ?? 0);
      return [
        r.reference,
        ist(r.created_at),
        r.name,
        r.phone,
        r.email,
        r.package_title,
        r.departure ? `${r.departure} (${r.start_date})` : "",
        r.travel_month,
        r.adults,
        r.children,
        bookingStatusLabels[r.status],
        rupees(r.total_amount),
        rupees(r.tcs_amount),
        rupees(r.amount_paid),
        r.total_amount === null ? "" : rupees(Math.max(0, r.total_amount + r.tcs_amount - r.amount_paid)),
        rupees(costs),
        r.total_amount === null ? "" : rupees(r.total_amount - costs),
        r.invoice_number,
      ];
    }),
  );
});

reportsRouter.get("/export/payments.csv", requireOwner, async (_req, res) => {
  const rows = await db
    .selectFrom("payments")
    .innerJoin("bookings", "bookings.id", "payments.booking_id")
    .innerJoin("customers", "customers.id", "bookings.customer_id")
    .selectAll("payments")
    .select(["bookings.reference", "bookings.invoice_number", "customers.name"])
    .where("payments.status", "=", "paid")
    .orderBy("payments.paid_at", "desc")
    .execute();
  csv(
    res,
    "payments",
    ["Date", "Booking", "Invoice", "Customer", "Amount (₹)", "How", "Gateway payment ID", "Note"],
    rows.map((r) => [
      ist(r.paid_at),
      r.reference,
      r.invoice_number,
      r.name,
      rupees(r.amount),
      r.provider === "manual" ? (paymentMethodLabels[r.method as PaymentMethod] ?? r.method) : `Online (${r.method ?? r.provider})`,
      r.provider_payment_id,
      r.note,
    ]),
  );
});

reportsRouter.get("/export/customers.csv", requireOwner, async (req, res) => {
  const rows = await audience({ ...req.query, segment: typeof req.query.segment === "string" ? req.query.segment : "all" });
  csv(
    res,
    "customers",
    ["Name", "Phone", "Email", "Trips", "Last trip", "Last travel month", "Total paid (₹)", "Referral code"],
    rows.map((r) => [r.name, r.phone, r.email, r.bookings, r.lastTrip, r.lastTravelMonth, rupees(r.totalPaid), r.referralCode]),
  );
});

/** Passenger manifest for one departure (staff need it for visas, hotels and buses). */
reportsRouter.get("/export/manifest.csv", async (req, res) => {
  const departureId = parseId(req.query.departure);
  if (!departureId) return void res.status(400).json({ ok: false, error: "Choose a departure" });
  const departure = await db.selectFrom("departures").select(["title", "start_date", "end_date"]).where("id", "=", departureId).executeTakeFirst();
  if (!departure) return void res.status(404).json({ ok: false, error: "Departure not found" });
  const rows = await db
    .selectFrom("travellers")
    .innerJoin("bookings", "bookings.id", "travellers.booking_id")
    .innerJoin("customers", "customers.id", "bookings.customer_id")
    .selectAll("travellers")
    .select(["bookings.reference", "customers.name as customer", "customers.phone as customer_phone"])
    .where("bookings.departure_id", "=", departureId)
    .where("bookings.status", "!=", "cancelled")
    .orderBy("travellers.room_label")
    .orderBy("bookings.reference")
    .orderBy("travellers.id")
    .execute();
  csv(
    res,
    `manifest-${departure.start_date}`,
    ["#", "Full name (as on passport)", "Gender", "Date of birth", "Nationality", "Passport no.", "Issued", "Expires", "Place of issue", "Passport check", "Mahram", "Visa", "Room type", "Room", "Bus seat", "Phone", "Booking", "Booked by", "Booker phone", "Notes"],
    rows.map((t, i) => [
      i + 1,
      t.full_name,
      t.gender ? genderLabels[t.gender as keyof typeof genderLabels] : "",
      t.date_of_birth,
      t.nationality,
      t.passport_number,
      t.passport_issue_date,
      t.passport_expiry,
      t.passport_place,
      passportProblem({ passportNumber: t.passport_number, passportExpiry: t.passport_expiry }, departure.end_date ?? departure.start_date) ?? "OK",
      t.mahram,
      visaStatusLabels[t.visa_status],
      t.room_type ? roomTypeLabels[t.room_type] : "",
      t.room_label,
      t.bus_seat,
      t.phone,
      t.reference,
      t.customer,
      t.customer_phone,
      t.notes,
    ]),
  );
});
