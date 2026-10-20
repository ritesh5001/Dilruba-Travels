import type { BookingStatus, LeadStatus } from "./booking.ts";

// Response shapes of the admin API (/api/admin/*). Dates are ISO strings; money is in paise.

export type CustomerRef = { id: number; name: string; phone: string; email: string | null };

export type AdminNote = { id: number; kind: "note" | "event"; body: string; createdAt: string };

export type AdminLead = {
  id: number;
  status: LeadStatus;
  service: string;
  option: string | null;
  packageName: string | null;
  travelMonth: string | null;
  travellers: number | null;
  message: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerRef;
};

export type AdminLeadDetail = AdminLead & { notes: AdminNote[]; bookings: { id: number; reference: string; status: BookingStatus }[] };

export type AdminPayment = {
  id: number;
  provider: string;
  method: string | null;
  amount: number;
  status: "created" | "paid" | "failed";
  note: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type AdminBooking = {
  id: number;
  reference: string;
  status: BookingStatus;
  packageTitle: string;
  travelMonth: string | null;
  adults: number;
  children: number;
  totalAmount: number | null;
  depositAmount: number | null;
  amountPaid: number;
  createdAt: string;
  customer: CustomerRef;
};

export type AdminBookingDetail = AdminBooking & {
  packageCategory: string | null;
  packageSlug: string | null;
  customerNotes: string | null;
  leadId: number | null;
  dueNow: number;
  /** The customer's private booking page (view and pay). */
  customerLink: string;
  onlinePaymentsEnabled: boolean;
  payments: AdminPayment[];
  notes: AdminNote[];
};

export type AdminCustomer = CustomerRef & { createdAt: string; leadCount: number; bookingCount: number; totalPaid: number };

export type AdminCustomerDetail = CustomerRef & {
  createdAt: string;
  leads: AdminLead[];
  bookings: AdminBooking[];
  notes: AdminNote[];
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export type Dashboard = {
  stats: {
    newLeads: number;
    leadsThisMonth: number;
    openBookings: number;
    confirmedBookings: number;
    revenueThisMonth: number;
    outstanding: number;
  };
  recentLeads: AdminLead[];
  recentBookings: AdminBooking[];
  recentPayments: (AdminPayment & { bookingId: number; reference: string; customerName: string })[];
};
