import type { Dashboard } from "@dilruba/shared/crm";
import type { Me } from "@dilruba/shared/ops";
import { Router } from "express";
import { sql } from "kysely";
import { z } from "zod";
import { config } from "../../config.ts";
import { db } from "../../db/index.ts";
import { clearSessionCookie, currentUser, envOwner, getAdmin, rateLimit, requireAdmin, requireOwner, safeEqual, setSessionCookie, verifyPassword } from "../../lib/auth.ts";
import { parseBody } from "../../lib/util.ts";
import { dashboardAlerts } from "../../services/alerts.ts";
import { bookingsAdminRouter } from "./bookings.ts";
import { customersRouter } from "./customers.ts";
import { departuresRouter } from "./departures.ts";
import { leadsRouter } from "./leads.ts";
import { mediaRouter, packagesRouter } from "./packages.ts";
import { quotesRouter } from "./quotes.ts";
import { reportsRouter } from "./reports.ts";
import { reviewsRouter } from "./reviews.ts";
import { settingsRouter } from "./settings.ts";
import { staffRouter } from "./staff.ts";
import { bookingsQuery, leadsQuery, toAdminBooking, toAdminLead, toAdminPayment } from "./mappers.ts";

export const adminRouter = Router();

// Checked when the email isn't a staff account, so every failed login does the same work.
const DUMMY_HASH = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);

adminRouter.post(
  "/login",
  rateLimit({ windowMs: 15 * 60_000, max: 10, message: "Too many login attempts. Try again in 15 minutes." }),
  async (req, res) => {
    const data = parseBody(z.object({ email: z.string().trim().max(200), password: z.string().max(200) }), req.body, res);
    if (!data) return;
    const email = data.email.toLowerCase();

    // The owner from the server settings.
    const owner = envOwner();
    if (owner && config.ADMIN_PASSWORD_HASH && safeEqual(email, owner.email.toLowerCase())) {
      if (!(await verifyPassword(data.password, config.ADMIN_PASSWORD_HASH))) {
        return void res.status(401).json({ ok: false, error: "Wrong email or password" });
      }
      setSessionCookie(res, owner.id, owner.email);
      return void res.json({ ok: true, ...owner });
    }

    // A staff account.
    const user = await db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst();
    // Always check a password so a wrong email takes as long as a wrong password.
    const passwordOk = await verifyPassword(data.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !passwordOk) {
      if (!user && (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD_HASH)) {
        const staff = await db.selectFrom("users").select("id").executeTakeFirst();
        if (!staff) return void res.status(503).json({ ok: false, error: "Admin login isn't set up. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH on the server." });
      }
      return void res.status(401).json({ ok: false, error: "Wrong email or password" });
    }
    if (!user.active) return void res.status(403).json({ ok: false, error: "This account has been switched off. Ask the owner." });
    await db.updateTable("users").set({ last_login_at: new Date() }).where("id", "=", user.id).execute();
    setSessionCookie(res, user.id, user.email);
    const me: Me = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ ok: true, ...me });
  },
);

adminRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

adminRouter.get("/me", async (req, res) => {
  const admin = await getAdmin(req);
  if (!admin) return void res.status(401).json({ ok: false, error: "Please log in" });
  res.json({ ok: true, ...admin });
});

// Everything below needs a logged-in admin.
adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", async (_req, res) => {
  const me = currentUser(res);
  const monthStart = sql<Date>`date_trunc('month', now())`;
  const [leadStats, bookingStats, revenue, recentLeads, recentBookings, recentPayments, followUps, alerts] = await Promise.all([
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
            eb.fn.sum<number>(sql<number>`greatest(total_amount + tcs_amount - amount_paid, 0)`).filterWhere("status", "in", ["awaiting_payment", "confirmed"]),
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
    // Staff see their own follow-ups and unassigned ones; the owner sees everyone's.
    leadsQuery()
      .where("leads.follow_up_at", "<=", sql<Date>`now()`)
      .where("leads.status", "not in", ["converted", "lost"])
      .$if(me.role !== "owner", (q) => q.where((eb) => eb.or([eb("leads.assigned_to", "=", me.id), eb("leads.assigned_to", "is", null)])))
      .orderBy("leads.follow_up_at")
      .limit(20)
      .execute(),
    dashboardAlerts(),
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
    followUps: followUps.map(toAdminLead),
    ...alerts,
  };
  res.json(body);
});

adminRouter.use("/leads", leadsRouter);
adminRouter.use("/bookings", bookingsAdminRouter);
adminRouter.use("/customers", customersRouter);
adminRouter.use("/packages", packagesRouter);
adminRouter.use("/media", mediaRouter);
adminRouter.use("/departures", departuresRouter);
adminRouter.use("/quotes", quotesRouter);
adminRouter.use("/reports", reportsRouter);
adminRouter.use("/reviews", reviewsRouter);
adminRouter.use("/staff", requireOwner, staffRouter);
adminRouter.use("/settings", requireOwner, settingsRouter);

/** Active staff, for "assign to" menus (everyone can see who their colleagues are). */
adminRouter.get("/team", async (_req, res) => {
  const rows = await db.selectFrom("users").select(["id", "name"]).where("active", "=", true).orderBy("name").execute();
  res.json(rows);
});
