import type { Dashboard } from "@dilruba/shared/crm";
import { Router } from "express";
import { sql } from "kysely";
import { z } from "zod";
import { config } from "../../config.ts";
import { db } from "../../db/index.ts";
import { clearSessionCookie, getAdmin, rateLimit, requireAdmin, safeEqual, setSessionCookie, verifyPassword } from "../../lib/auth.ts";
import { parseBody } from "../../lib/util.ts";
import { bookingsAdminRouter } from "./bookings.ts";
import { customersRouter } from "./customers.ts";
import { leadsRouter } from "./leads.ts";
import { mediaRouter, packagesRouter } from "./packages.ts";
import { bookingsQuery, leadsQuery, toAdminBooking, toAdminLead, toAdminPayment } from "./mappers.ts";

export const adminRouter = Router();

adminRouter.post(
  "/login",
  rateLimit({ windowMs: 15 * 60_000, max: 10, message: "Too many login attempts. Try again in 15 minutes." }),
  async (req, res) => {
    const data = parseBody(z.object({ email: z.string().trim().max(200), password: z.string().max(200) }), req.body, res);
    if (!data) return;
    if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD_HASH) {
      res.status(503).json({ ok: false, error: "Admin login isn't set up. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH on the server." });
      return;
    }
    const emailOk = safeEqual(data.email.toLowerCase(), config.ADMIN_EMAIL.toLowerCase());
    // Always check the password so a wrong email takes as long as a wrong password.
    const passwordOk = await verifyPassword(data.password, config.ADMIN_PASSWORD_HASH);
    if (!emailOk || !passwordOk) {
      res.status(401).json({ ok: false, error: "Wrong email or password" });
      return;
    }
    setSessionCookie(res, config.ADMIN_EMAIL);
    res.json({ ok: true, email: config.ADMIN_EMAIL });
  },
);

adminRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

adminRouter.get("/me", (req, res) => {
  const admin = getAdmin(req);
  if (!admin) return void res.status(401).json({ ok: false, error: "Please log in" });
  res.json({ ok: true, email: admin.email });
});

// Everything below needs a logged-in admin.
adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", async (_req, res) => {
  const monthStart = sql<Date>`date_trunc('month', now())`;
  const [leadStats, bookingStats, revenue, recentLeads, recentBookings, recentPayments] = await Promise.all([
    db
      .selectFrom("leads")
      .select((eb) => [
        eb.fn.countAll<number>().filterWhere("status", "=", "new").as("new_leads"),
        eb.fn.countAll<number>().filterWhere("created_at", ">=", monthStart).as("this_month"),
      ])
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("bookings")
      .select((eb) => [
        eb.fn.countAll<number>().filterWhere("status", "in", ["requested", "awaiting_payment"]).as("open"),
        eb.fn.countAll<number>().filterWhere("status", "=", "confirmed").as("confirmed"),
        eb.fn
          .coalesce(
            eb.fn.sum<number>(sql<number>`greatest(total_amount - amount_paid, 0)`).filterWhere("status", "in", ["awaiting_payment", "confirmed"]),
            eb.val(0),
          )
          .as("outstanding"),
      ])
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("payments")
      .select((eb) => eb.fn.coalesce(eb.fn.sum<number>("amount"), eb.val(0)).as("total"))
      .where("status", "=", "paid")
      .where("paid_at", ">=", monthStart)
      .executeTakeFirstOrThrow(),
    leadsQuery().orderBy("leads.created_at", "desc").limit(6).execute(),
    bookingsQuery().orderBy("bookings.created_at", "desc").limit(6).execute(),
    db
      .selectFrom("payments")
      .innerJoin("bookings", "bookings.id", "payments.booking_id")
      .innerJoin("customers", "customers.id", "bookings.customer_id")
      .selectAll("payments")
      .select(["bookings.reference", "customers.name as customer_name"])
      .where("payments.status", "=", "paid")
      .orderBy("payments.paid_at", "desc")
      .limit(6)
      .execute(),
  ]);

  const body: Dashboard = {
    stats: {
      newLeads: Number(leadStats.new_leads),
      leadsThisMonth: Number(leadStats.this_month),
      openBookings: Number(bookingStats.open),
      confirmedBookings: Number(bookingStats.confirmed),
      revenueThisMonth: Number(revenue.total),
      outstanding: Number(bookingStats.outstanding),
    },
    recentLeads: recentLeads.map(toAdminLead),
    recentBookings: recentBookings.map(toAdminBooking),
    recentPayments: recentPayments.map((p) => ({ ...toAdminPayment(p), bookingId: p.booking_id, reference: p.reference, customerName: p.customer_name })),
  };
  res.json(body);
});

adminRouter.use("/leads", leadsRouter);
adminRouter.use("/bookings", bookingsAdminRouter);
adminRouter.use("/customers", customersRouter);
adminRouter.use("/packages", packagesRouter);
adminRouter.use("/media", mediaRouter);
