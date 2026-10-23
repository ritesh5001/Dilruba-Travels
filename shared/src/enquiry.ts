import { z } from "zod";

export const services = [
  "Umrah",
  "Hajj",
  "Iraq Ziyarat",
  "Jordan",
  "Palestine (Al-Aqsa)",
  "Turkey",
  "Asia Holiday",
  "India Holiday",
  "Other",
] as const;

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,16}$/, "Please enter a valid phone number"),
  service: z.enum(services),
  option: z.string().trim().max(80).optional(),
  packageName: z.string().trim().max(120).optional(),
  travelMonth: z.string().trim().max(20).optional(),
  travellers: z.coerce.number().int().min(1).max(99).optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(200).optional(),
  email: z.email("Please enter a valid email address").trim().max(160).optional(),
  // A past customer's referral code, from a ?ref= link they shared.
  referralCode: z.string().trim().max(20).optional(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
});

export type Enquiry = z.infer<typeof enquirySchema>;

export function enquiryToWhatsapp(e: Partial<Enquiry>) {
  const lines = [
    "Assalamu Alaikum, I would like a quote.",
    e.name && `Name: ${e.name}`,
    e.packageName ? `Package: ${e.packageName}` : e.service && `Interested in: ${e.service}${e.option ? ` – ${e.option}` : ""}`,
    e.travelMonth && `Travel month: ${e.travelMonth}`,
    e.travellers && `Travellers: ${e.travellers}`,
    e.message && `Note: ${e.message}`,
  ];
  return lines.filter(Boolean).join("\n");
}
