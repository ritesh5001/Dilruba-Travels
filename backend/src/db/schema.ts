import type { BookingStatus, LeadStatus } from "@dilruba/shared/booking";
import type { ColumnType, Generated, Insertable, Selectable } from "kysely";

type CreatedAt = ColumnType<Date, Date | string | undefined, never>;
type UpdatedAt = ColumnType<Date, Date | string | undefined, Date | string>;

export interface CustomerTable {
  id: Generated<number>;
  name: string;
  /** Normalised, e.g. +919876543210. One customer per phone number. */
  phone: string;
  email: string | null;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

export interface LeadTable {
  id: Generated<number>;
  customer_id: number;
  service: string;
  option: string | null;
  package_name: string | null;
  travel_month: string | null;
  travellers: number | null;
  message: string | null;
  source: string | null;
  status: ColumnType<LeadStatus, LeadStatus | undefined, LeadStatus>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

export interface BookingTable {
  id: Generated<number>;
  reference: string;
  /** Secret in the customer's booking link; lets them view and pay without an account. */
  access_token: string;
  customer_id: number;
  lead_id: number | null;
  package_category: string | null;
  package_slug: string | null;
  package_title: string;
  travel_month: string | null;
  adults: number;
  children: number;
  customer_notes: string | null;
  status: ColumnType<BookingStatus, BookingStatus | undefined, BookingStatus>;
  /** All amounts in paise. Null until staff set the price. */
  total_amount: number | null;
  deposit_amount: number | null;
  amount_paid: ColumnType<number, number | undefined, number>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

export interface PaymentTable {
  id: Generated<number>;
  booking_id: number;
  /** "razorpay" for online payments today, "manual" for payments staff record; later "icici". */
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  method: string | null;
  amount: number;
  status: ColumnType<"created" | "paid" | "failed", "created" | "paid" | "failed", "created" | "paid" | "failed">;
  note: string | null;
  created_at: CreatedAt;
  paid_at: Date | null;
}

export interface NoteTable {
  id: Generated<number>;
  customer_id: number | null;
  lead_id: number | null;
  booking_id: number | null;
  /** "note" is written by staff; "event" is logged automatically (status changes, payments, emails). */
  kind: "note" | "event";
  body: string;
  created_at: CreatedAt;
}

export interface Database {
  customers: CustomerTable;
  leads: LeadTable;
  bookings: BookingTable;
  payments: PaymentTable;
  notes: NoteTable;
}

export type Customer = Selectable<CustomerTable>;
export type Lead = Selectable<LeadTable>;
export type Booking = Selectable<BookingTable>;
export type Payment = Selectable<PaymentTable>;
export type Note = Selectable<NoteTable>;
export type NewNote = Insertable<NoteTable>;
