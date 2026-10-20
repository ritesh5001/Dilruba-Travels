import type { AdminBooking, AdminLead, AdminNote, AdminPayment, CustomerRef } from "@dilruba/shared/crm";
import { db } from "../../db/index.ts";
import type { Booking, Lead, Note, Payment } from "../../db/schema.ts";

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
  return db.selectFrom("leads").innerJoin("customers", "customers.id", "leads.customer_id").selectAll("leads").select(customerColumns);
}

export function bookingsQuery() {
  return db.selectFrom("bookings").innerJoin("customers", "customers.id", "bookings.customer_id").selectAll("bookings").select(customerColumns);
}

export function toAdminLead(r: Lead & CustomerCols): AdminLead {
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
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    customer: customerRef(r),
  };
}

export function toAdminBooking(r: Booking & CustomerCols): AdminBooking {
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
  return { id: n.id, kind: n.kind, body: n.body, createdAt: iso(n.created_at) };
}
