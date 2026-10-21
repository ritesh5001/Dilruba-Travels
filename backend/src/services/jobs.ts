import { formatINR } from "@dilruba/shared/booking";
import { todayIST } from "@dilruba/shared/ops";
import { sql } from "kysely";
import { db } from "../db/index.ts";
import { notifyAdmin, sendEmail } from "../email/send.ts";
import { adminDigestEmail, instalmentReminderEmail } from "../email/templates.ts";
import { instalmentsDue, passportAlerts, upcomingDepartures } from "./alerts.ts";
import { addEvent } from "./crm.ts";
import { getInternal, getSettings, setInternal } from "./settings.ts";

// Background work, run every half hour while the server is up: payment reminders to customers
// and the owner's morning summary. Each step records what it sent, so a restart or a second
// run never sends the same email twice. (A sleeping free-tier host simply catches up on wake.)

const REMIND_DAYS_BEFORE = 3;
const INTERVAL_MS = 30 * 60_000;
/** Hour (India time) after which the morning summary goes out. */
const DIGEST_HOUR = 8;

async function sendInstalmentReminders() {
  const due = await instalmentsDue(REMIND_DAYS_BEFORE);
  for (const i of due) {
    const row = await db.selectFrom("instalments").select(["reminder_sent_at", "overdue_sent_at"]).where("id", "=", i.instalmentId).executeTakeFirst();
    if (!row) continue;
    // One "coming up" email, then one "overdue" email; staff can always send more by hand.
    if (i.overdue ? row.overdue_sent_at : row.reminder_sent_at) continue;
    const b = await db.selectFrom("bookings").selectAll().where("id", "=", i.bookingId).executeTakeFirstOrThrow();
    const c = await db.selectFrom("customers").selectAll().where("id", "=", b.customer_id).executeTakeFirstOrThrow();
    // Claim it first, so two server instances can't both send it.
    const claimed = await db
      .updateTable("instalments")
      .set(i.overdue ? { overdue_sent_at: new Date() } : { reminder_sent_at: new Date() })
      .where("id", "=", i.instalmentId)
      .where(i.overdue ? "overdue_sent_at" : "reminder_sent_at", "is", null)
      .returning("id")
      .executeTakeFirst();
    if (!claimed || !c.email) continue;
    const sent = await sendEmail(instalmentReminderEmail(b, c, { label: i.label, dueDate: i.dueDate, outstanding: i.outstanding, overdue: i.overdue }));
    await addEvent(db, {
      booking_id: b.id,
      customer_id: b.customer_id,
      body: sent
        ? `Automatic ${i.overdue ? "overdue notice" : "reminder"} for ${i.label} (${formatINR(i.outstanding)}) emailed to ${c.email}.`
        : `Automatic reminder for ${i.label} to ${c.email} FAILED to send.`,
    });
  }
}

async function sendDailyDigest() {
  const today = todayIST();
  const hourIST = Number(new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(11, 13));
  if (hourIST < DIGEST_HOUR) return;
  if ((await getInternal<string>("digest-date")) === today) return;
  await setInternal("digest-date", today);

  const [followUps, instalments, passports, departures] = await Promise.all([
    db
      .selectFrom("leads")
      .innerJoin("customers", "customers.id", "leads.customer_id")
      .select(["leads.id", "customers.name", "leads.follow_up_note", "leads.package_name", "leads.service"])
      .where("leads.follow_up_at", "<", sql<Date>`now() + interval '1 day'`)
      .where("leads.status", "not in", ["converted", "lost"])
      .orderBy("leads.follow_up_at")
      .limit(30)
      .execute(),
    instalmentsDue(7),
    passportAlerts(20),
    upcomingDepartures(30),
  ]);
  if (!followUps.length && !instalments.length && !passports.length && !departures.length) return;
  await notifyAdmin(
    adminDigestEmail({
      followUps: followUps.map((f) => ({ id: f.id, name: f.name, what: f.follow_up_note ?? f.package_name ?? f.service })),
      instalments: instalments.map((i) => ({ name: i.customerName, reference: i.reference, label: i.label, dueDate: i.dueDate, outstanding: i.outstanding })),
      passports: passports.map((p) => ({ name: p.name, reference: p.reference, problem: p.problem })),
      departures: departures.map((d) => ({ title: d.title, startDate: d.startDate, booked: d.booked, seats: d.seats })),
    }),
  );
}

async function runJobs() {
  const settings = await getSettings();
  if (settings.instalmentReminders) await sendInstalmentReminders();
  if (settings.dailyDigest) await sendDailyDigest();
}

export function startJobs() {
  const run = () =>
    runJobs().catch((err: unknown) => {
      console.error("[jobs] background run failed:", err);
    });
  // A minute after start (the database is ready and the first visitors are served), then every half hour.
  setTimeout(run, 60_000).unref();
  setInterval(run, INTERVAL_MS).unref();
}
