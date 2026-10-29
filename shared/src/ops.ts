import { z } from "zod";
import type { LeadStatus } from "./booking.ts";
import { categorySlugs, type CategorySlug } from "./catalog.ts";

// Operations: staff, departures, travellers, quotes, instalments, costs, settings and reports.
// Money is in paise between the API and database; admin forms send rupees where noted.

// ---------------- Choices ----------------

export const staffRoles = ["owner", "manager", "sales", "operations", "accounts", "viewer"] as const;
export type StaffRole = (typeof staffRoles)[number];
export const staffRoleNames: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  sales: "Sales",
  operations: "Operations",
  accounts: "Accounts",
  viewer: "Viewer",
};
export const staffRoleLabels: Record<StaffRole, string> = {
  owner: "Owner: everything, incl. staff, settings and supplier costs",
  manager: "Manager: all leads, quotes, bookings, payments, packages and reports",
  sales: "Sales: only their assigned leads, their quotes and customers",
  operations: "Operations: bookings, travellers, passports and departures",
  accounts: "Accounts: payments, supplier costs, suppliers and reports",
  viewer: "Viewer: read-only leads, customers and bookings",
};

/**
 * What each role may do. Checked by the server on every request (the admin panel also hides
 * what someone can't use, but that's only for tidiness).
 */
export const permissions = [
  "leads.read", // see leads and quotes
  "leads.all", // …all of them, not just the ones assigned to you
  "leads.write", // add, update and convert leads
  "quotes.write",
  "customers.read",
  "customers.write",
  "bookings.read",
  "bookings.write", // status, dates, travellers count, group date
  "payments.write", // prices, payments, instalments, invoices
  "travellers.write",
  "documents.read", // passports and visas, manifests
  "catalog.write", // packages, photos, departures, reviews
  "costs", // supplier costs, suppliers and supplier payments
  "reports", // reports, exports and campaigns
  "staff",
  "settings",
] as const;
export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<StaffRole, readonly Permission[]> = {
  owner: permissions,
  manager: permissions.filter((p) => p !== "staff" && p !== "settings" && p !== "costs"),
  sales: ["leads.read", "leads.write", "quotes.write", "customers.read", "customers.write", "bookings.read"],
  operations: ["customers.read", "bookings.read", "bookings.write", "travellers.write", "documents.read", "catalog.write"],
  accounts: ["customers.read", "bookings.read", "payments.write", "costs", "reports"],
  viewer: ["leads.read", "leads.all", "customers.read", "bookings.read"],
};

/** Logins from before the role system were "staff"; they have a Manager's access. */
export function effectiveRole(role: string | undefined | null): StaffRole | null {
  if (!role) return null;
  if (role === "staff") return "manager";
  return (staffRoles as readonly string[]).includes(role) ? (role as StaffRole) : null;
}

export function can(role: StaffRole | string | undefined | null, permission: Permission) {
  const r = effectiveRole(role);
  return !!r && rolePermissions[r].includes(permission);
}

export const visaStatuses = ["not_started", "documents_pending", "submitted", "approved", "rejected"] as const;
export type VisaStatus = (typeof visaStatuses)[number];
export const visaStatusLabels: Record<VisaStatus, string> = {
  not_started: "Not started",
  documents_pending: "Documents pending",
  submitted: "Applied",
  approved: "Visa approved",
  rejected: "Rejected",
};

export const roomTypes = ["quad", "triple", "double", "single"] as const;
export type RoomType = (typeof roomTypes)[number];
export const roomTypeLabels: Record<RoomType, string> = {
  quad: "Quad (4 sharing)",
  triple: "Triple (3 sharing)",
  double: "Double (2 sharing)",
  single: "Single",
};

export const genders = ["male", "female"] as const;
export const genderLabels: Record<(typeof genders)[number], string> = { male: "Male", female: "Female" };

export const documentKinds = ["passport", "photo", "visa", "ticket", "other"] as const;
export type DocumentKind = (typeof documentKinds)[number];
export const documentKindLabels: Record<DocumentKind, string> = {
  passport: "Passport",
  photo: "Photo",
  visa: "Visa",
  ticket: "Ticket",
  other: "Other",
};

export const costCategories = ["flight", "hotel", "visa", "transport", "food", "guide", "insurance", "other"] as const;
export type CostCategory = (typeof costCategories)[number];
export const costCategoryLabels: Record<CostCategory, string> = {
  flight: "Flights",
  hotel: "Hotels",
  visa: "Visa",
  transport: "Transport",
  food: "Food",
  guide: "Guide / ziyarat",
  insurance: "Insurance",
  other: "Other",
};

export const quoteStatuses = ["draft", "sent", "accepted", "declined", "expired"] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];
export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export const departureStatuses = ["open", "closed"] as const;
export type DepartureStatus = (typeof departureStatuses)[number];

export const lostReasons = [
  "Price too high",
  "Dates didn't work",
  "Booked with another agent",
  "No response",
  "Just browsing",
  "Visa or documents problem",
  "Other",
] as const;

/** A passport must be valid this many months after the return date (Saudi, Iraq and most visas). */
export const PASSPORT_VALIDITY_MONTHS = 6;

// ---------------- Shared helpers ----------------

const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date");
const optionalDate = z.union([isoDate, z.literal("")]).optional().transform((v) => v || null);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);
const rupees = z.coerce.number().min(0).max(10_000_000);

/** "2027-03-01" → "1 Mar 2027". Dates are calendar dates, so no timezone shifts. */
export function formatDay(date: string | null | undefined) {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Today's date in India as "YYYY-MM-DD". */
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const out = new Date(Date.UTC(y!, m! - 1 + months, d!));
  return out.toISOString().slice(0, 10);
}

// ---------------- Staff ----------------

export type Me = { id: number; name: string; email: string; role: StaffRole };

export type StaffUser = { id: number; name: string; email: string; role: StaffRole; active: boolean; lastLoginAt: string | null; createdAt: string };

export const staffInputSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(80),
  email: z.email("Enter a valid email").trim().max(160),
  role: z.enum(staffRoles),
  active: z.boolean().default(true),
  // Required when adding someone; leave empty when editing to keep the current password.
  password: z.union([z.string().min(10, "Passwords need at least 10 characters").max(200), z.literal("")]).optional(),
});

// ---------------- Departures ----------------

export type AdminDeparture = {
  id: number;
  packageId: number | null;
  packageTitle: string | null;
  packageCategory: CategorySlug | null;
  title: string;
  startDate: string;
  endDate: string | null;
  seats: number;
  /** Travellers on non-cancelled bookings for this date. */
  booked: number;
  status: DepartureStatus;
  notes: string | null;
};

export const departureInputSchema = z
  .object({
    packageId: z.coerce.number().int().positive().nullable(),
    title: z.string().trim().min(2, "Name this departure").max(120),
    startDate: isoDate,
    endDate: optionalDate,
    seats: z.coerce.number().int().min(1, "At least one seat").max(1000),
    status: z.enum(departureStatuses).default("open"),
    notes: optionalText(1000),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, { message: "The return date is before the start date", path: ["endDate"] });

/** Shown on the website: open, future departures for a package. */
export type PublicDeparture = { id: number; title: string; startDate: string; endDate: string | null; seatsLeft: number };

// ---------------- Travellers ----------------

export type TravellerDocument = { id: number; kind: DocumentKind; filename: string; size: number; createdAt: string; uploadedBy: string | null };

export type AdminTraveller = {
  id: number;
  bookingId: number;
  fullName: string;
  gender: (typeof genders)[number] | null;
  dateOfBirth: string | null;
  phone: string | null;
  passportNumber: string | null;
  passportIssueDate: string | null;
  passportExpiry: string | null;
  passportPlace: string | null;
  nationality: string;
  mahram: string | null;
  visaStatus: VisaStatus;
  roomType: RoomType | null;
  roomLabel: string | null;
  busSeat: string | null;
  notes: string | null;
  documents: TravellerDocument[];
};

export const travellerInputSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the name as on the passport").max(120),
  gender: z.union([z.enum(genders), z.literal("")]).optional().transform((v) => v || null),
  dateOfBirth: optionalDate,
  phone: optionalText(30),
  passportNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => v?.toUpperCase().replace(/\s+/g, "") || null),
  passportIssueDate: optionalDate,
  passportExpiry: optionalDate,
  passportPlace: optionalText(60),
  nationality: z.string().trim().min(2).max(40).default("Indian"),
  mahram: optionalText(120),
  visaStatus: z.enum(visaStatuses).default("not_started"),
  roomType: z.union([z.enum(roomTypes), z.literal("")]).optional().transform((v) => v || null),
  roomLabel: optionalText(40),
  busSeat: optionalText(20),
  notes: optionalText(1000),
});
export type TravellerInput = z.input<typeof travellerInputSchema>;

/** Why a passport needs attention, or null if it's fine for this trip. */
export function passportProblem(t: Pick<AdminTraveller, "passportNumber" | "passportExpiry">, tripEnd: string | null) {
  if (!t.passportNumber || !t.passportExpiry) return "Passport details missing";
  const mustBeValidUntil = addMonths(tripEnd ?? todayIST(), PASSPORT_VALIDITY_MONTHS);
  if (t.passportExpiry < todayIST()) return "Passport expired";
  if (t.passportExpiry < mustBeValidUntil) return `Expires within ${PASSPORT_VALIDITY_MONTHS} months of travel`;
  return null;
}

// ---------------- Instalments & costs ----------------

export type InstalmentState = "paid" | "part_paid" | "due" | "overdue";

export type AdminInstalment = {
  id: number;
  label: string;
  dueDate: string;
  amount: number;
  /** How much of this instalment the booking's payments cover (paid in due-date order). */
  covered: number;
  state: InstalmentState;
  reminderSentAt: string | null;
};

export const instalmentPlanSchema = z.object({
  instalments: z
    .array(z.object({ label: z.string().trim().min(1).max(60), dueDate: isoDate, amount: rupees.refine((n) => n > 0, "Each instalment needs an amount") }))
    .max(12, "Up to 12 instalments"),
});

export type CostState = "paid" | "part_paid" | "unpaid";

export type AdminCost = {
  id: number;
  category: CostCategory;
  supplierId: number | null;
  supplier: string;
  amount: number;
  /** How much of this cost the supplier's payments cover (paid oldest cost first). */
  covered: number;
  state: CostState;
  note: string | null;
  createdAt: string;
};

/** A cost on a booking: an existing supplier, or a new one created by name. Amount in rupees. */
export const costInputSchema = z
  .object({
    category: z.enum(costCategories),
    supplierId: z.coerce.number().int().positive().optional(),
    supplierName: z.string().trim().max(120).optional(),
    amount: rupees.refine((n) => n > 0, "Enter the cost"),
    note: optionalText(300),
  })
  .refine((d) => d.supplierId || d.supplierName, { message: "Choose the supplier", path: ["supplierId"] });

// ---------------- Suppliers ----------------

export const supplierTypes = ["airline", "hotel", "visa", "transport", "ground", "insurance", "other"] as const;
export type SupplierType = (typeof supplierTypes)[number];
export const supplierTypeLabels: Record<SupplierType, string> = {
  airline: "Airline / tickets",
  hotel: "Hotel",
  visa: "Visa agent",
  transport: "Transport",
  ground: "Ground handler / ziyarat",
  insurance: "Insurance",
  other: "Other",
};

/** The supplier type a new supplier gets from the kind of cost it was first used for. */
export const supplierTypeForCost: Record<CostCategory, SupplierType> = {
  flight: "airline",
  hotel: "hotel",
  visa: "visa",
  transport: "transport",
  food: "ground",
  guide: "ground",
  insurance: "insurance",
  other: "other",
};

export type AdminSupplier = {
  id: number;
  name: string;
  type: SupplierType;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  /** All costs booked with this supplier, what we've paid them, and what we still owe (paise). */
  totalCosts: number;
  totalPaid: number;
  owed: number;
  costCount: number;
};

export type SupplierPayment = {
  id: number;
  amount: number;
  paidOn: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
};

export type AdminSupplierDetail = AdminSupplier & {
  costs: (AdminCost & { bookingId: number; reference: string; customerName: string; packageTitle: string })[];
  payments: SupplierPayment[];
};

export const supplierInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the supplier's name").max(120),
  type: z.enum(supplierTypes),
  contactPerson: optionalText(120),
  phone: optionalText(30),
  email: z.union([z.email("Enter a valid email").trim().max(160), z.literal("")]).optional().transform((v) => v || null),
  notes: optionalText(1000),
  active: z.boolean().default(true),
});

/** Money paid to a supplier. Amount in rupees. */
export const supplierPaymentSchema = z.object({
  amount: rupees.refine((n) => n > 0, "Enter the amount paid"),
  paidOn: isoDate,
  method: optionalText(40),
  reference: optionalText(120),
  note: optionalText(300),
});

// ---------------- Notifications ----------------

export type AdminNotification = { id: number; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string };
export type NotificationFeed = { items: AdminNotification[]; unread: number };

// ---------------- Quotes ----------------

export type QuoteItem = { label: string; quantity: number; unitPrice: number };

export function quoteTotal(q: { items: QuoteItem[]; discount: number }) {
  return Math.max(0, q.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) - q.discount);
}

export type AdminQuote = {
  id: number;
  reference: string;
  status: QuoteStatus;
  title: string;
  customer: { id: number; name: string; phone: string; email: string | null };
  leadId: number | null;
  packageId: number | null;
  departureId: number | null;
  bookingId: number | null;
  travelMonth: string | null;
  adults: number;
  children: number;
  items: QuoteItem[];
  discount: number;
  deposit: number | null;
  total: number;
  inclusions: string[];
  message: string | null;
  validUntil: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  /** The customer's page to view and accept the quote. */
  link: string;
};

/** Admin form: prices in rupees. */
export const quoteInputSchema = z.object({
  leadId: z.coerce.number().int().positive().nullable().optional(),
  customerId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive().nullable().optional(),
  departureId: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().trim().min(2, "Give the quote a title").max(160),
  travelMonth: z
    .union([z.string().trim().regex(/^\d{4}-\d{2}$/), z.literal("")])
    .optional()
    .transform((v) => v || null),
  adults: z.coerce.number().int().min(1).max(200),
  children: z.coerce.number().int().min(0).max(200),
  items: z
    .array(z.object({ label: z.string().trim().min(1, "Describe each line").max(160), quantity: z.coerce.number().int().min(1).max(500), unitPrice: rupees }))
    .min(1, "Add at least one price line")
    .max(30),
  discount: rupees.default(0),
  deposit: rupees.nullable().optional(),
  inclusions: z.array(z.string().trim().min(1).max(200)).max(40).default([]),
  message: optionalText(2000),
  validUntil: optionalDate,
});
export type QuoteInput = z.input<typeof quoteInputSchema>;

export type PublicQuote = {
  reference: string;
  status: QuoteStatus;
  title: string;
  customerName: string;
  travelMonth: string | null;
  departure: { title: string; startDate: string; endDate: string | null } | null;
  adults: number;
  children: number;
  items: QuoteItem[];
  discount: number;
  total: number;
  deposit: number | null;
  inclusions: string[];
  message: string | null;
  validUntil: string | null;
  /** After acceptance: the booking page where they pay. */
  bookingLink: string | null;
};

// ---------------- Feedback ----------------

export type PublicFeedbackInfo = { reference: string; name: string; packageTitle: string; submitted: boolean; googleReviewUrl: string | null };

export const feedbackInputSchema = z.object({
  token: z.string().min(10).max(100),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  comment: optionalText(2000),
  canPublish: z.boolean().default(false),
});

// ---------------- Reviews (shown on the website) ----------------

export type PublicReview = { id: number; name: string; location: string | null; trip: string | null; rating: number; body: string };

export type AdminReview = PublicReview & { published: boolean; sortOrder: number; fromFeedback: boolean; createdAt: string };

export const reviewInputSchema = z.object({
  name: z.string().trim().min(2, "Add the customer's name").max(60),
  location: optionalText(60),
  trip: optionalText(80),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, "Add the review text").max(600, "Keep it under 600 characters so it fits the card"),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type ReviewInput = z.input<typeof reviewInputSchema>;

// ---------------- Settings ----------------

export const settingsSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  address: z.string().trim().max(400),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^[0-9A-Z]{15}$/, "A GSTIN is 15 letters and numbers"),
  invoicePrefix: z.string().trim().max(12),
  /** GST rate on tour packages, percent. Prices in the CRM always include it. */
  gstRate: z.coerce.number().min(0).max(28),
  /** TCS on overseas tour packages, percent; collected on top of the price. */
  tcsRate: z.coerce.number().min(0).max(20),
  tcsCategories: z.array(z.enum(categorySlugs)),
  bankDetails: z.string().trim().max(600),
  googleReviewUrl: z.union([z.url("Paste the full review link").trim().max(500), z.literal("")]),
  referralOffer: z.string().trim().max(200),
  /** Email customers before an instalment is due and when it's overdue. */
  instalmentReminders: z.boolean(),
  /** Email the owner each morning: follow-ups due, payments due, passports to fix. */
  dailyDigest: z.boolean(),
  /** Email the feedback request when a booking is marked completed. */
  feedbackRequests: z.boolean(),
  /** Give each new website lead to a sales person (the one with the fewest open leads). */
  autoAssignLeads: z.boolean(),
  /** Thank the customer by email as soon as they enquire. */
  autoAcknowledge: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  legalName: "Dilruba Travels Of India Pvt Ltd",
  address: "Shop 3A, Building No 5B, Baliga Nagar, Jasmine Mill Road, Mahim East, Mumbai 400017",
  gstin: "",
  invoicePrefix: "DT/",
  gstRate: 5,
  // Budget 2026: flat 2% TCS on overseas tour packages from 1 April 2026. Check with your CA.
  tcsRate: 2,
  tcsCategories: categorySlugs.filter((c) => c !== "domestic"),
  bankDetails: "",
  googleReviewUrl: "",
  referralOffer: "",
  instalmentReminders: true,
  dailyDigest: true,
  feedbackRequests: true,
  autoAssignLeads: true,
  autoAcknowledge: true,
};

// ---------------- Invoices ----------------

export type InvoiceData = {
  /** Null until "Issue invoice" gives it a number (numbers never change or get reused). */
  number: string | null;
  date: string | null;
  seller: { legalName: string; address: string; gstin: string; bankDetails: string; phone: string; email: string };
  buyer: { name: string; phone: string; email: string | null };
  booking: { reference: string; packageTitle: string; travelMonth: string | null; departure: string | null; adults: number; children: number };
  travellers: string[];
  /** Package price including GST. */
  packagePrice: number;
  /** GST included in the package price; null when no GSTIN is set (then it's a plain receipt). */
  gst: { rate: number; taxable: number; tax: number } | null;
  tcs: { rate: number; amount: number } | null;
  total: number;
  paid: number;
  balance: number;
  payments: { date: string; method: string; amount: number; reference: string | null }[];
};

/** Splits a GST-inclusive price into taxable value and tax (paise). */
export function splitGst(inclusive: number, rate: number) {
  const taxable = Math.round(inclusive / (1 + rate / 100));
  return { taxable, tax: inclusive - taxable };
}

/** Indian financial year for a date: 2026-05-10 → "2026-27". */
export function financialYear(date: string) {
  const [y, m] = date.split("-").map(Number);
  const start = m! >= 4 ? y! : y! - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

// ---------------- Reports & lists ----------------

export type Reports = {
  range: { from: string; to: string };
  /** Leads received in the range, by where they are now. */
  funnel: { leads: number; byStatus: Record<LeadStatus, number> };
  bySource: { source: string; leads: number; converted: number }[];
  lostReasons: { reason: string; count: number }[];
  byStaff: { name: string; leads: number; converted: number }[];
  revenueByMonth: { month: string; received: number; bookings: number }[];
  byCategory: { category: string; bookings: number; sales: number; costs: number }[];
  quotes: { sent: number; accepted: number; declined: number; acceptedValue: number };
  feedback: { count: number; average: number | null };
  repeatCustomers: number;
  referredLeads: number;
};

export const audienceSegments = {
  travelled: "Travelled with us",
  enquired: "Enquired but never booked",
  all: "Everyone",
} as const;
export type AudienceSegment = keyof typeof audienceSegments;

export type AudienceRow = {
  customerId: number;
  name: string;
  phone: string;
  email: string | null;
  bookings: number;
  lastTrip: string | null;
  lastTravelMonth: string | null;
  totalPaid: number;
  referralCode: string | null;
};

/** Which outside services are connected (keys live on the server; only on/off is shown). */
export type IntegrationStatus = { email: boolean; onlinePayments: boolean };
