import type { BookingStatus, LeadStatus } from "./booking.ts";
import type { AdminCost, AdminDeparture, AdminInstalment, AdminQuote, AdminTraveller } from "./ops.ts";

// Response shapes of the admin API (/api/admin/*). Dates are ISO strings; money is in paise.

export type CustomerRef = { id: number; name: string; phone: string; email: string | null };

export type AdminNote = { id: number; kind: "note" | "event"; body: string; author: string | null; createdAt: string };

export type StaffRef = { id: number; name: string };

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
  followUpAt: string | null;
  followUpNote: string | null;
  lostReason: string | null;
  assignedTo: StaffRef | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerRef;
};

export type AdminLeadDetail = AdminLead & {
  notes: AdminNote[];
  bookings: { id: number; reference: string; status: BookingStatus }[];
  quotes: AdminQuote[];
  /** Name of the customer who referred them, if they came with a referral code. */
  referredBy: { id: number; name: string } | null;
};

export type AdminPayment = {
  id: number;
  provider: string;
  method: string | null;
  amount: number;
  status: "created" | "paid" | "failed" | "refunded";
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
  /** Given back after a cancellation; amountPaid still shows what the customer paid. */
  refundedAmount: number;
  tcsAmount: number;
  departure: { id: number; title: string; startDate: string } | null;
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
  travellers: AdminTraveller[];
  instalments: AdminInstalment[];
  /** Supplier costs and margin: owner only (null for staff). */
  costs: AdminCost[] | null;
  invoiceNumber: string | null;
  /** Suggested TCS for this package's category at the current rate (paise); 0 if it doesn't apply. */
  suggestedTcs: number;
  feedback: { rating: number; comment: string | null; canPublish: boolean; reviewId: number | null; createdAt: string } | null;
  feedbackLink: string;
  quoteId: number | null;
};

export type AdminCustomer = CustomerRef & { createdAt: string; leadCount: number; bookingCount: number; totalPaid: number };

export type AdminCustomerDetail = CustomerRef & {
  createdAt: string;
  referralCode: string | null;
  referredBy: { id: number; name: string } | null;
  referrals: { id: number; name: string }[];
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
  /** Leads whose follow-up date has arrived, oldest first. */
  followUps: AdminLead[];
  upcomingDepartures: AdminDeparture[];
  instalmentsDue: { bookingId: number; reference: string; customerName: string; phone: string; label: string; dueDate: string; outstanding: number }[];
  passportAlerts: { travellerId: number; bookingId: number; reference: string; name: string; problem: string }[];
  birthdays: { travellerId: number; bookingId: number; name: string; phone: string | null; date: string }[];
};

/** A departure with everyone booked on it: the passenger manifest and rooming list. */
export type AdminDepartureDetail = AdminDeparture & {
  bookings: AdminBooking[];
  travellers: (AdminTraveller & { reference: string; customerName: string })[];
};
