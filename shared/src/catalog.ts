import { z } from "zod";
import type { PublicDeparture } from "./ops.ts";

// Package catalogue shared by the website, the admin panel and the API.
// Categories are fixed in code (they shape the site's navigation); packages live in the database.

export const categorySlugs = ["umrah", "hajj", "iraq", "jordan", "palestine", "turkey", "asia", "domestic"] as const;
export type CategorySlug = (typeof categorySlugs)[number];

export const categoryNames: Record<CategorySlug, string> = {
  umrah: "Umrah",
  hajj: "Hajj",
  iraq: "Iraq Ziyarat",
  jordan: "Jordan",
  palestine: "Palestine (Al-Aqsa)",
  turkey: "Turkey",
  asia: "Asia Holidays",
  domestic: "India Holidays",
};

export const packageTiers = ["Economy", "Standard", "Deluxe", "Premium", "Seasonal"] as const;

export type Hotel = { city: string; detail: string };
export type ItineraryDay = { day: string; title: string; description: string };
export type Faq = { q: string; a: string };

/** A package as the website shows it. `image` and `gallery` are image URLs. */
export type TravelPackage = {
  id: number;
  slug: string;
  category: CategorySlug;
  title: string;
  summary: string;
  days: number;
  nights: number;
  tier?: (typeof packageTiers)[number];
  startingPrice: number | null;
  sharing?: string;
  roomPrices?: Partial<Record<"single" | "double" | "triple" | "quad", number | null>>;
  route: [string, string];
  places: string[];
  image: string;
  gallery?: string[];
  featured?: boolean;
  highlights: string[];
  hotels?: Hotel[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  documents: string[];
  faqs?: Faq[];
  /** Upcoming group dates with seats left, soonest first. */
  departures?: PublicDeparture[];
};

/** Admin view: also shows hidden packages and when they changed. */
export type AdminPackage = TravelPackage & { published: boolean; sortOrder: number; updatedAt: string };

export type MediaItem = { id: number; url: string; width: number; height: number; size: number; createdAt: string; usedBy: number };

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Images: our own uploads (/api/media/12.webp) or the site's built-in photos (/images/kaaba.webp).
const imageUrl = z
  .string()
  .trim()
  .regex(/^\/(api\/media\/\d+\.webp|images\/[\w-]+\.(webp|png|jpe?g))$/, "Choose an image");

const line = (max: number) => z.string().trim().min(1).max(max);
const list = (max: number, label: string) => z.array(line(max)).max(40, `Too many ${label}`);

/** What the admin form sends to create or update a package. */
export const packageInputSchema = z
  .object({
    category: z.enum(categorySlugs),
    title: line(120),
    slug: z
      .string()
      .trim()
      .min(1, "Add a URL slug")
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and dashes only"),
    summary: line(400),
    days: z.coerce.number().int().min(1).max(90),
    nights: z.coerce.number().int().min(0).max(90),
    tier: z.enum(packageTiers).nullable().optional(),
    startingPrice: z.coerce.number().int().min(0).max(10_000_000).nullable(),
    roomPrices: z.object({ single: z.number().int().positive().max(10_000_000).nullable().optional(), double: z.number().int().positive().max(10_000_000).nullable().optional(), triple: z.number().int().positive().max(10_000_000).nullable().optional(), quad: z.number().int().positive().max(10_000_000).nullable().optional() }).default({}),
    sharing: z.string().trim().max(80).nullable().optional(),
    routeFrom: line(60),
    routeTo: line(60),
    places: list(60, "places").min(1, "Add at least one place"),
    image: imageUrl,
    gallery: z.array(imageUrl).max(12, "Up to 12 gallery photos"),
    featured: z.boolean(),
    published: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
    highlights: list(200, "highlights"),
    hotels: z.array(z.object({ city: line(60), detail: line(200) })).max(10),
    itinerary: z.array(z.object({ day: line(30), title: line(120), description: line(1000) })).max(60),
    inclusions: list(200, "inclusions"),
    exclusions: list(200, "exclusions"),
    documents: list(200, "documents"),
    faqs: z.array(z.object({ q: line(200), a: line(1000) })).max(20),
  })
  .refine((p) => p.nights <= p.days, { message: "Nights can't be more than days", path: ["nights"] });

export type PackageInput = z.infer<typeof packageInputSchema>;
