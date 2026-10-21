import { categorySlugs, packageTiers, type AdminPackage, type PackageInput, type TravelPackage } from "@dilruba/shared/catalog";
import { config } from "../config.ts";
import type { PackageRow } from "../db/schema.ts";

const tierOf = (t: string | null) => (packageTiers as readonly string[]).includes(t ?? "") ? (t as TravelPackage["tier"]) : undefined;

export function toTravelPackage(r: PackageRow): TravelPackage {
  const hotels = r.hotels;
  const gallery = r.gallery;
  const faqs = r.faqs;
  return {
    id: r.id,
    slug: r.slug,
    category: r.category as (typeof categorySlugs)[number],
    title: r.title,
    summary: r.summary,
    days: r.days,
    nights: r.nights,
    tier: tierOf(r.tier),
    startingPrice: r.starting_price,
    sharing: r.sharing ?? undefined,
    route: [r.route_from, r.route_to],
    places: r.places,
    image: r.image,
    gallery: gallery.length ? gallery : undefined,
    featured: r.featured,
    highlights: r.highlights,
    hotels: hotels.length ? hotels : undefined,
    itinerary: r.itinerary,
    inclusions: r.inclusions,
    exclusions: r.exclusions,
    documents: r.documents,
    faqs: faqs.length ? faqs : undefined,
  };
}

export function toAdminPackage(r: PackageRow): AdminPackage {
  return { ...toTravelPackage(r), published: r.published, sortOrder: r.sort_order, updatedAt: r.updated_at.toISOString() };
}

/** Database columns for a create/update from the admin form. */
export function packageColumns(p: PackageInput) {
  return {
    category: p.category,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    days: p.days,
    nights: p.nights,
    tier: p.tier ?? null,
    starting_price: p.startingPrice,
    sharing: p.sharing || null,
    route_from: p.routeFrom,
    route_to: p.routeTo,
    image: p.image,
    featured: p.featured,
    published: p.published,
    sort_order: p.sortOrder,
    places: JSON.stringify(p.places),
    gallery: JSON.stringify(p.gallery),
    highlights: JSON.stringify(p.highlights),
    hotels: JSON.stringify(p.hotels),
    itinerary: JSON.stringify(p.itinerary),
    inclusions: JSON.stringify(p.inclusions),
    exclusions: JSON.stringify(p.exclusions),
    documents: JSON.stringify(p.documents),
    faqs: JSON.stringify(p.faqs),
  };
}

export const mediaUrl = (id: number) => `/api/media/${id}.webp`;

/**
 * Tells the website its cached package pages are out of date, so an admin change shows on the
 * next page load. Without REVALIDATE_SECRET the site still picks changes up within a few minutes.
 */
export async function refreshWebsite() {
  if (!config.REVALIDATE_SECRET) return;
  try {
    const res = await fetch(`${config.PUBLIC_SITE_URL}/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.REVALIDATE_SECRET}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.warn(`[catalog] website refresh failed: ${res.status}`);
  } catch (err) {
    console.warn("[catalog] website refresh failed:", err instanceof Error ? err.message : err);
  }
}
