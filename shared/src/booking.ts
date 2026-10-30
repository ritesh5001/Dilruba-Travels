import { z } from "zod";

// Money is always handled in paise (integer) between the API, database and payment gateway.

export const bookingStatuses = ["requested", "awaiting_payment", "confirmed", "completed", "cancelled"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const bookingStatusLabels: Record<BookingStatus, string> = {
  requested: "Requested",
  awaiting_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const leadStatuses = ["new", "contacted", "quoted", "converted", "lost"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  converted: "Converted",
  lost: "Lost",
};

export const paymentMethods = ["online", "upi", "bank_transfer", "cash", "cheque", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{7,16}$/, "Please enter a valid phone number");

/** What a customer submits from the "Book this package" form. */
export const bookingRequestSchema = z.object({
  packageCategory: z.string().trim().min(1).max(40),
  packageSlug: z.string().trim().min(1).max(120),
  packageTitle: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2, "Please enter the lead traveller's name").max(80),
  email: z.email("Please enter a valid email address").trim().max(160),
  phone: phoneSchema,
  travelMonth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Please choose your travel month"),
  adults: z.coerce.number().int().min(1, "At least one adult must travel").max(50),
  children: z.coerce.number().int().min(0).max(50).default(0),
  notes: z.string().trim().max(1000).optional(),
  // A fixed group date the customer picked, if the package has any.
  departureId: z.coerce.number().int().positive().optional(),
  referralCode: z.string().trim().max(20).optional(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

/** Which part of the outstanding amount the customer wants to pay now. */
export const payRequestSchema = z.object({
  token: z.string().min(10).max(100),
  kind: z.enum(["due", "full"]).default("due"),
});

/** Public view of a booking, shown on the customer's booking page. */
export type PublicBooking = {
  reference: string;
  status: BookingStatus;
  packageTitle: string;
  travelMonth: string | null;
  adults: number;
  children: number;
  name: string;
  totalAmount: number | null;
  depositAmount: number | null;
  /** TCS charged on top of the total (overseas packages). */
  tcsAmount: number;
  amountPaid: number;
  /** Given back after a cancellation. */
  refundedAmount: number;
  departure: { title: string; startDate: string; endDate: string | null } | null;
  instalments: { label: string; dueDate: string; amount: number; state: "paid" | "part_paid" | "due" | "overdue" }[];
  /** What "Pay now" charges: the rest of the deposit, or the balance once the deposit is in. */
  dueNow: number;
  balance: number | null;
  payments: { amount: number; method: string | null; paidAt: string }[];
  onlinePaymentsEnabled: boolean;
  createdAt: string;
};

/** How the browser should collect a payment; one variant per gateway. */
export type CheckoutSession =
  | {
      provider: "razorpay";
      keyId: string;
      orderId: string;
      amount: number;
      currency: "INR";
      name: string;
      description: string;
      prefill: { name: string; email: string | null; contact: string };
    }
  | { provider: "redirect"; url: string };

export function formatINR(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

export function formatTravelMonth(month: string | null | undefined) {
  if (!month) return "Flexible";
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
