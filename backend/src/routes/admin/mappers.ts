import type { AdminBooking, AdminLead, AdminNote, AdminPayment, CustomerRef } from "@dilruba/shared/crm";
import type { CategorySlug } from "@dilruba/shared/catalog";
import { quoteTotal, type AdminCost, type AdminDeparture, type AdminQuote, type AdminTraveller, type TravellerDocument } from "@dilruba/shared/ops";
import { db } from "../../db/index.ts";
import type { Booking, BookingCost, Departure, Lead, Note, Payment, Quote, Traveller } from "../../db/schema.ts";
import { quoteLink } from "../../email/templates.ts";

const iso = (d: Date) => d.toISOString();

// Selects used with `.innerJoin("customers", ...)` so every row carries its customer.
export const customerColumns = [
  "customers.name as customer_name",
  "customers.phone as customer_phone",
  "customers.email as customer_email",
] as const;

type CustomerCols = { customer_id: number; customer_name: string; customer_phone: string; customer_email: string | null };

function customerRef(r: CustomerCols): CustomerRef {
  return { id: r.customer_id, name: r.customer_name, phone: r.customer_phone, email: r.customer_email };
}

export function leadsQuery() {
  return db
    .selectFrom("leads")
    .innerJoin("customers", "customers.id", "leads.customer_id")
    .leftJoin("users", "users.id", "leads.assigned_to")
    .selectAll("leads")
    .select(customerColumns)
    .select("users.name as assigned_name");
}

export function bookingsQuery() {
  return db
    .selectFrom("bookings")
    .innerJoin("customers", "customers.id", "bookings.customer_id")
    .leftJoin("departures", "departures.id", "bookings.departure_id")
    .selectAll("bookings")
    .select(customerColumns)
    .select(["departures.title as departure_title", "departures.start_date as departure_start"]);
}

export function toAdminLead(r: Lead & CustomerCols & { assigned_name: string | null }): AdminLead {
  return {
    id: r.id,
    status: r.status,
    service: r.service,
    option: r.option,
    packageName: r.package_name,
    travelMonth: r.travel_month,
    travellers: r.travellers,
    message: r.message,
    source: r.source,
    followUpAt: r.follow_up_at ? iso(r.follow_up_at) : null,
    followUpNote: r.follow_up_note,
    lostReason: r.lost_reason,
    assignedTo: r.assigned_to && r.assigned_name ? { id: r.assigned_to, name: r.assigned_name } : null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    customer: customerRef(r),
  };
}

export function toAdminBooking(r: Booking & CustomerCols & { departure_title: string | null; departure_start: string | null }): AdminBooking {
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    packageTitle: r.package_title,
    travelMonth: r.travel_month,
    adults: r.adults,
    children: r.children,
    totalAmount: r.total_amount,
    depositAmount: r.deposit_amount,
    amountPaid: r.amount_paid,
    tcsAmount: r.tcs_amount,
    departure: r.departure_id && r.departure_title && r.departure_start ? { id: r.departure_id, title: r.departure_title, startDate: r.departure_start } : null,
    createdAt: iso(r.created_at),
    customer: customerRef(r),
  };
}

export function toAdminPayment(p: Payment): AdminPayment {
  return {
    id: p.id,
    provider: p.provider,
    method: p.method,
    amount: p.amount,
    status: p.status,
    note: p.note,
    providerPaymentId: p.provider_payment_id,
    createdAt: iso(p.created_at),
    paidAt: p.paid_at ? iso(p.paid_at) : null,
  };
}

export function toAdminNote(n: Note): AdminNote {
  return { id: n.id, kind: n.kind, body: n.body, author: n.author, createdAt: iso(n.created_at) };
}

/** Departures with their package and how many travellers are booked on them. */
export function departuresQuery() {
  return db
    .selectFrom("departures")
    .leftJoin("packages", "packages.id", "departures.package_id")
    .selectAll("departures")
    .select(["packages.title as package_title", "packages.category as package_category"])
    .select((eb) =>
      eb
        .selectFrom("bookings")
        .whereRef("bookings.departure_id", "=", "departures.id")
        .where("bookings.status", "!=", "cancelled")
        .select((s) => s.fn.coalesce(s.fn.sum<number>(s("bookings.adults", "+", s.ref("bookings.children"))), s.val(0)).as("n"))
        .as("booked"),
    );
}

export function toAdminDeparture(r: Departure & { package_title: string | null; package_category: string | null; booked: number | null }): AdminDeparture {
  return {
    id: r.id,
    packageId: r.package_id,
    packageTitle: r.package_title,
    packageCategory: r.package_category as CategorySlug | null,
    title: r.title,
    startDate: r.start_date,
    endDate: r.end_date,
    seats: r.seats,
    booked: Number(r.booked ?? 0),
    status: r.status,
    notes: r.notes,
  };
}

export function toAdminTraveller(t: Traveller, documents: TravellerDocument[] = []): AdminTraveller {
  return {
    id: t.id,
    bookingId: t.booking_id,
    fullName: t.full_name,
    gender: t.gender as AdminTraveller["gender"],
    dateOfBirth: t.date_of_birth,
    phone: t.phone,
    passportNumber: t.passport_number,
    passportIssueDate: t.passport_issue_date,
    passportExpiry: t.passport_expiry,
    passportPlace: t.passport_place,
    nationality: t.nationality,
    mahram: t.mahram,
    visaStatus: t.visa_status,
    roomType: t.room_type,
    roomLabel: t.room_label,
    busSeat: t.bus_seat,
    notes: t.notes,
    documents,
  };
}

/** Document metadata (never the file itself) for a set of travellers, grouped by traveller. */
export async function documentsFor(travellerIds: number[]) {
  const map = new Map<number, TravellerDocument[]>();
  if (!travellerIds.length) return map;
  const rows = await db
    .selectFrom("traveller_documents")
    .select(["id", "traveller_id", "kind", "filename", "size", "uploaded_by", "created_at"])
    .where("traveller_id", "in", travellerIds)
    .orderBy("created_at")
    .execute();
  for (const r of rows) {
    const list = map.get(r.traveller_id) ?? [];
    list.push({ id: r.id, kind: r.kind, filename: r.filename, size: r.size, uploadedBy: r.uploaded_by, createdAt: iso(r.created_at) });
    map.set(r.traveller_id, list);
  }
  return map;
}

/**
 * A cost with its supplier's current name and how far that supplier's payments cover it.
 * Costs from before supplier tracking without a supplier fall back to their old "paid" tick.
 */
export function toAdminCost(c: BookingCost & { supplier_name?: string | null }, allocation?: { covered: number; state: AdminCost["state"] }): AdminCost {
  const legacy = { covered: c.paid ? c.amount : 0, state: (c.paid ? "paid" : "unpaid") as AdminCost["state"] };
  const a = c.supplier_id ? (allocation ?? { covered: 0, state: "unpaid" as const }) : legacy;
  return {
    id: c.id,
    category: c.category,
    supplierId: c.supplier_id,
    supplier: c.supplier_name ?? c.supplier,
    amount: c.amount,
    covered: a.covered,
    state: a.state,
    note: c.note,
    createdAt: iso(c.created_at),
  };
}

export function quotesQuery() {
  return db.selectFrom("quotes").innerJoin("customers", "customers.id", "quotes.customer_id").selectAll("quotes").select(customerColumns);
}

export function toAdminQuote(q: Quote & CustomerCols): AdminQuote {
  return {
    id: q.id,
    reference: q.reference,
    status: q.status,
    title: q.title,
    customer: customerRef(q),
    leadId: q.lead_id,
    packageId: q.package_id,
    departureId: q.departure_id,
    bookingId: q.booking_id,
    travelMonth: q.travel_month,
    adults: q.adults,
    children: q.children,
    items: q.items,
    discount: q.discount,
    deposit: q.deposit,
    total: quoteTotal({ items: q.items, discount: q.discount }),
    inclusions: q.inclusions,
    message: q.message,
    validUntil: q.valid_until,
    sentAt: q.sent_at ? iso(q.sent_at) : null,
    respondedAt: q.responded_at ? iso(q.responded_at) : null,
    createdBy: q.created_by,
    createdAt: iso(q.created_at),
    link: quoteLink(q),
  };
}
