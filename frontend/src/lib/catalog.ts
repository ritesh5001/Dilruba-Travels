import { cacheLife, cacheTag } from "next/cache";
import type { TravelPackage } from "@dilruba/shared/catalog";
import type { CategorySlug } from "./packages";

// Packages are managed in the admin panel and stored by the backend. Server components load
// them through here: one cached copy of the published catalogue, shared by every page.
// The backend calls /revalidate after each admin change, which expires the "catalog" tag;
// otherwise the copy refreshes every few minutes, so changes still show if that call fails.

export const CATALOG_TAG = "catalog";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

async function fetchCatalog(): Promise<TravelPackage[]> {
  // The backend host can take up to a minute to wake, so allow for that and retry once.
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/catalog/packages`, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return ((await res.json()) as { packages: TravelPackage[] }).packages;
    } catch (err) {
      if (attempt >= 2) throw new Error(`Couldn't load packages from ${BACKEND_URL}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

/** Every published package, in the order set in the admin panel. */
export async function getPackages(): Promise<TravelPackage[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  return fetchCatalog();
}

export async function getPackagesByCategory(slug: CategorySlug) {
  return (await getPackages()).filter((p) => p.category === slug);
}

export async function getPackage(category: string, slug: string) {
  return (await getPackages()).find((p) => p.category === category && p.slug === slug);
}

/**
 * Params for prerendering package pages at build time. Cache Components needs at least one, so
 * an empty catalogue yields a placeholder that renders as "not found".
 */
export async function packageParams() {
  const list = (await getPackages()).map((p) => ({ category: p.category as string, slug: p.slug }));
  return list.length ? list : [{ category: "umrah", slug: "__none__" }];
}
