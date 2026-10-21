import type { BookingStatus, LeadStatus } from "@dilruba/shared/booking";
import type { CostCategory, DepartureStatus, DocumentKind, QuoteItem, QuoteStatus, RoomType, StaffRole, VisaStatus } from "@dilruba/shared/ops";
import type { ColumnType, Generated, Insertable, Selectable } from "kysely";

type CreatedAt = ColumnType<Date, Date | string | undefined, never>;
type UpdatedAt = ColumnType<Date, Date | string | undefined, Date | string>;

export interface CustomerTable {
  id: Generated<number>;
  name: string;
  /** Normalised, e.g. +919876543210. One customer per phone number. */
  phone: string;
  email: string | null;
  /** Shared by the customer with friends; set the first time it's needed. */
  referral_code: string | null;
  referred_by: number | null;
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
  /** When to contact them next; shown on the dashboard once it's due. */
  follow_up_at: Date | null;
  follow_up_note: string | null;
  lost_reason: string | null;
  assigned_to: number | null;
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
  /** Tax collected at source on overseas packages, charged on top of total_amount (paise). */
  tcs_amount: ColumnType<number, number | undefined, number>;
  departure_id: number | null;
  /** Set when the first invoice is issued; the number never changes after that. */
  invoice_number: string | null;
  invoice_date: DateColumn | null;
  feedback_requested_at: Date | null;
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
  /** Who wrote the note or made the change (staff name); null for automatic events. */
  author: string | null;
  created_at: CreatedAt;
}

type Json<T> = ColumnType<T, string, string>;
/** A Postgres `date`, read and written as "YYYY-MM-DD" (see db/index.ts). */
type DateColumn = string;

export interface PackageTable {
  id: Generated<number>;
  category: string;
  slug: string;
  title: string;
  summary: string;
  days: number;
  nights: number;
  tier: string | null;
  /** Rupees per person; null shows "Best price on request". */
  starting_price: number | null;
  sharing: string | null;
  route_from: string;
  route_to: string;
  /** Image URL: /images/<name>.webp (built in) or /api/media/<id>.webp (uploaded). */
  image: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
  // Lists are stored as JSON (written with JSON.stringify).
  places: Json<string[]>;
  gallery: Json<string[]>;
  highlights: Json<string[]>;
  hotels: Json<{ city: string; detail: string }[]>;
  itinerary: Json<{ day: string; title: string; description: string }[]>;
  inclusions: Json<string[]>;
  exclusions: Json<string[]>;
  documents: Json<string[]>;
  faqs: Json<{ q: string; a: string }[]>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

export interface MediaTable {
  id: Generated<number>;
  content_type: string;
  width: number;
  height: number;
  size: number;
  data: Buffer;
  created_at: CreatedAt;
}

export interface UserTable {
  id: Generated<number>;
  name: string;
  email: string;
  password_hash: string;
  role: StaffRole;
  active: ColumnType<boolean, boolean | undefined, boolean>;
  last_login_at: Date | null;
  created_at: CreatedAt;
}

export interface DepartureTable {
  id: Generated<number>;
  package_id: number | null;
  title: string;
  start_date: DateColumn;
  end_date: DateColumn | null;
  seats: number;
  status: ColumnType<DepartureStatus, DepartureStatus | undefined, DepartureStatus>;
  notes: string | null;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

export interface TravellerTable {
  id: Generated<number>;
  booking_id: number;
  full_name: string;
  gender: string | null;
  date_of_birth: DateColumn | null;
  phone: string | null;
  passport_number: string | null;
  passport_issue_date: DateColumn | null;
  passport_expiry: DateColumn | null;
  passport_place: string | null;
  nationality: ColumnType<string, string | undefined, string>;
  /** For women travelling for Hajj/Umrah: who their mahram is. */
  mahram: string | null;
  visa_status: ColumnType<VisaStatus, VisaStatus | undefined, VisaStatus>;
  room_type: RoomType | null;
  /** Free text such as "Makkah 1204" so rooming lists group people who share. */
  room_label: string | null;
  bus_seat: string | null;
  notes: string | null;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

export interface TravellerDocumentTable {
  id: Generated<number>;
  traveller_id: number;
  kind: DocumentKind;
  filename: string;
  content_type: string;
  size: number;
  data: Buffer;
  uploaded_by: string | null;
  created_at: CreatedAt;
}

export interface InstalmentTable {
  id: Generated<number>;
  booking_id: number;
  label: string;
  due_date: DateColumn;
  /** Paise. Instalments are paid in due-date order out of the booking's amount_paid. */
  amount: number;
  reminder_sent_at: Date | null;
  overdue_sent_at: Date | null;
  created_at: CreatedAt;
}

export interface BookingCostTable {
  id: Generated<number>;
  booking_id: number;
  category: CostCategory;
  supplier: string;
  amount: number;
  paid: ColumnType<boolean, boolean | undefined, boolean>;
  note: string | null;
  created_at: CreatedAt;
}

export interface QuoteTable {
  id: Generated<number>;
  reference: string;
  /** Secret in the customer's quote link. */
  access_token: string;
  customer_id: number;
  lead_id: number | null;
  package_id: number | null;
  departure_id: number | null;
  booking_id: number | null;
  title: string;
  travel_month: string | null;
  adults: number;
  children: number;
  items: Json<QuoteItem[]>;
  discount: ColumnType<number, number | undefined, number>;
  deposit: number | null;
  inclusions: Json<string[]>;
  message: string | null;
  valid_until: DateColumn | null;
  status: ColumnType<QuoteStatus, QuoteStatus | undefined, QuoteStatus>;
  sent_at: Date | null;
  responded_at: Date | null;
  created_by: string | null;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

export interface FeedbackTable {
  id: Generated<number>;
  booking_id: number;
  rating: number;
  comment: string | null;
  created_at: CreatedAt;
}

export interface SettingTable {
  key: string;
  value: Json<unknown>;
  updated_at: UpdatedAt;
}

export interface Database {
  users: UserTable;
  departures: DepartureTable;
  travellers: TravellerTable;
  traveller_documents: TravellerDocumentTable;
  instalments: InstalmentTable;
  booking_costs: BookingCostTable;
  quotes: QuoteTable;
  feedback: FeedbackTable;
  settings: SettingTable;
  customers: CustomerTable;
  leads: LeadTable;
  bookings: BookingTable;
  payments: PaymentTable;
  notes: NoteTable;
  packages: PackageTable;
  media: MediaTable;
}

export type PackageRow = Selectable<PackageTable>;

export type Customer = Selectable<CustomerTable>;
export type Lead = Selectable<LeadTable>;
export type Booking = Selectable<BookingTable>;
export type Payment = Selectable<PaymentTable>;
export type Note = Selectable<NoteTable>;
export type NewNote = Insertable<NoteTable>;
export type User = Selectable<UserTable>;
export type Departure = Selectable<DepartureTable>;
export type Traveller = Selectable<TravellerTable>;
export type Instalment = Selectable<InstalmentTable>;
export type BookingCost = Selectable<BookingCostTable>;
export type Quote = Selectable<QuoteTable>;
