import type { Dashboard } from "@dilruba/shared/crm";
import { addMonths, passportProblem, todayIST } from "@dilruba/shared/ops";
import { db } from "../db/index.ts";
import { departuresQuery, toAdminDeparture } from "../routes/admin/mappers.ts";
import { instalmentStates } from "./crm.ts";

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

/** Unpaid instalments due within `days` (or already overdue) on live bookings. */
export async function instalmentsDue(days = 7) {
  const today = todayIST();
  const horizon = addDays(today, days);
  const bookings = await db
    .selectFrom("bookings")
    .innerJoin("customers", "customers.id", "bookings.customer_id")
    .select(["bookings.id", "bookings.reference", "bookings.amount_paid", "customers.name", "customers.phone"])
    .where("bookings.status", "in", ["awaiting_payment", "confirmed"])
    .where((eb) => eb.exists(eb.selectFrom("instalments").select("id").whereRef("instalments.booking_id", "=", "bookings.id").where("instalments.due_date", "<=", horizon)))
    .execute();
  if (!bookings.length) return [];
  const all = await db.selectFrom("instalments").selectAll().where("booking_id", "in", bookings.map((b) => b.id)).execute();
  return bookings
    .flatMap((b) =>
      instalmentStates(all.filter((i) => i.booking_id === b.id), b.amount_paid, today)
        .filter((i) => i.state !== "paid" && i.dueDate <= horizon)
        .map((i) => ({ instalmentId: i.id, bookingId: b.id, reference: b.reference, customerName: b.name, phone: b.phone, label: i.label, dueDate: i.dueDate, outstanding: i.amount - i.covered, overdue: i.state === "overdue" })),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Travellers on upcoming trips whose passport is missing, expired or too close to expiry. */
export async function passportAlerts(limit = 30) {
  const today = todayIST();
  const rows = await db
    .selectFrom("travellers")
    .innerJoin("bookings", "bookings.id", "travellers.booking_id")
    .leftJoin("departures", "departures.id", "bookings.departure_id")
    .select(["travellers.id", "travellers.full_name", "travellers.passport_number", "travellers.passport_expiry", "bookings.id as booking_id", "bookings.reference", "bookings.travel_month"])
    .select(["departures.start_date", "departures.end_date"])
    .where("bookings.status", "in", ["requested", "awaiting_payment", "confirmed"])
    .orderBy("bookings.id")
    .execute();
  const out: Dashboard["passportAlerts"] = [];
  for (const r of rows) {
    // Trip end: the departure's return date, else its start, else the end of the travel month.
    const tripEnd = r.end_date ?? r.start_date ?? (r.travel_month ? addDays(addMonths(`${r.travel_month}-01`, 1), -1) : null);
    if (tripEnd && tripEnd < today) continue;
    const problem = passportProblem({ passportNumber: r.passport_number, passportExpiry: r.passport_expiry }, tripEnd);
    if (problem) out.push({ travellerId: r.id, bookingId: r.booking_id, reference: r.reference, name: r.full_name, problem });
    if (out.length >= limit) break;
  }
  return out;
}

/** Travellers (past and present) with a birthday in the next week, for a greeting on WhatsApp. */
async function birthdays(): Promise<Dashboard["birthdays"]> {
  const today = todayIST();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const rows = await db
    .selectFrom("travellers")
    .innerJoin("bookings", "bookings.id", "travellers.booking_id")
    .select(["travellers.id", "travellers.booking_id", "travellers.full_name", "travellers.phone", "travellers.date_of_birth"])
    .where("bookings.status", "!=", "cancelled")
    .where("travellers.date_of_birth", "is not", null)
    .execute();
  const seen = new Set<string>();
  const out: Dashboard["birthdays"] = [];
  for (const day of days) {
    for (const r of rows) {
      if (r.date_of_birth!.slice(5) !== day.slice(5)) continue;
      const key = `${r.full_name.toLowerCase()}|${r.date_of_birth}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ travellerId: r.id, bookingId: r.booking_id, name: r.full_name, phone: r.phone, date: day });
    }
  }
  return out;
}

export async function upcomingDepartures(days = 90) {
  const today = todayIST();
  const rows = await departuresQuery()
    .where("departures.start_date", ">=", today)
    .where("departures.start_date", "<=", addDays(today, days))
    .orderBy("departures.start_date")
    .limit(8)
    .execute();
  return rows.map(toAdminDeparture);
}

export async function dashboardAlerts(): Promise<Pick<Dashboard, "upcomingDepartures" | "instalmentsDue" | "passportAlerts" | "birthdays">> {
  const [deps, due, passports, bdays] = await Promise.all([upcomingDepartures(), instalmentsDue(), passportAlerts(10), birthdays()]);
  return {
    upcomingDepartures: deps,
    instalmentsDue: due.slice(0, 10).map(({ bookingId, reference, customerName, phone, label, dueDate, outstanding }) => ({ bookingId, reference, customerName, phone, label, dueDate, outstanding })),
    passportAlerts: passports,
    birthdays: bdays,
  };
}
