import { randomBytes } from "node:crypto";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

const schema = z.object({
  PORT: z.coerce.number().int().default(4000),
  CORS_ORIGIN: optional,
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required (see backend/.env.example)"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),
  // Used to build links in emails, e.g. https://dilrubatravels.com/booking?ref=DT7K2M9Q&t=…
  PUBLIC_SITE_URL: z.string().trim().url().default("http://localhost:3000"),

  ADMIN_EMAIL: optional,
  // Generate with: npm run admin:hash -w backend
  ADMIN_PASSWORD_HASH: optional,
  SESSION_SECRET: optional,

  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().trim().default("Dilruba Travels <onboarding@resend.dev>"),
  EMAIL_REPLY_TO: optional,
  // Where new-lead, new-booking and payment alerts go. Defaults to ADMIN_EMAIL.
  ADMIN_NOTIFY_EMAIL: optional,

  PAYMENT_PROVIDER: z.enum(["razorpay"]).default("razorpay"),
  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  RAZORPAY_WEBHOOK_SECRET: optional,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  for (const issue of parsed.error.issues) console.error(`Config error: ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

const env = parsed.data;

if (isProduction && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
  console.error("Config error: SESSION_SECRET must be set to at least 32 random characters in production");
  process.exit(1);
}
if (!env.SESSION_SECRET) {
  console.warn("SESSION_SECRET is not set: using a random one, so admin sessions end when the server restarts.");
}
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) {
  console.warn("ADMIN_EMAIL / ADMIN_PASSWORD_HASH are not set: the admin panel login is disabled.");
}
if (!env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set: emails are printed to the console instead of being sent.");
}

export const config = {
  ...env,
  isProduction,
  SESSION_SECRET: env.SESSION_SECRET ?? randomBytes(32).toString("hex"),
  ADMIN_NOTIFY_EMAIL: env.ADMIN_NOTIFY_EMAIL ?? env.ADMIN_EMAIL,
  PUBLIC_SITE_URL: env.PUBLIC_SITE_URL.replace(/\/$/, ""),
};
