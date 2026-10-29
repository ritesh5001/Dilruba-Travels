import type { CategorySlug, TravelPackage } from "@dilruba/shared/catalog";
import type { PhotoKey } from "./images";

// Groups of packages shown at /tours/<slug> and in the menu, e.g. "Economy Fixed Departure Umrah"
// lists every Economy Umrah package. Membership comes from the package's tier or title (set in
// the admin panel), so adding a matching package adds it here too.

export type Collection = {
  slug: string;
  title: string;
  /** Short label for the menu. */
  menuLabel: string;
  category: CategorySlug;
  image: PhotoKey;
  intro: string;
  includes: (p: TravelPackage) => boolean;
};

export const collections: Collection[] = [
  {
    slug: "economy-umrah",
    title: "Economy Fixed Departure Umrah",
    menuLabel: "Economy Fix Departure",
    category: "umrah",
    image: "kaaba",
    intro: "Budget-friendly group Umrah on fixed dates from Mumbai, with visa, flights, hotels and guidance included.",
    includes: (p) => p.tier === "Economy" || /economy/i.test(p.title),
  },
  {
    slug: "deluxe-umrah",
    title: "Deluxe Fixed Departure Umrah",
    menuLabel: "Deluxe Fix Departure",
    category: "umrah",
    image: "madinahDome",
    intro: "Premium group Umrah on fixed dates: hotels closest to the Haram, guided ziyarat and personal care throughout.",
    includes: (p) => p.tier === "Deluxe" || p.tier === "Premium" || /deluxe|premium/i.test(p.title),
  },
  {
    slug: "ramzan-umrah",
    title: "Ramzan Umrah 2027",
    menuLabel: "Ramzan Umrah 2027",
    category: "umrah",
    image: "kaabaAerial",
    intro: "Spend the blessed days of Ramzan in Makkah and Madinah, with iftar, suhoor and taraweeh close to the Haram. Seats fill early.",
    includes: (p) => /ramzan|ramadan/i.test(p.title),
  },
  {
    slug: "turkey-group",
    title: "Fixed Turkey Group Tours",
    menuLabel: "Fixed Turkey Group",
    category: "turkey",
    image: "istanbul",
    intro: "Join a guided group to Istanbul, Bursa and Cappadocia on fixed dates, with Islamic heritage sites on the way.",
    includes: (p) => (p.departures?.length ?? 0) > 0 || /group|fixed/i.test(p.title),
  },
];

export function getCollection(slug: string) {
  return collections.find((c) => c.slug === slug);
}

export function collectionPackages(c: Collection, packages: TravelPackage[]) {
  return packages.filter((p) => p.category === c.category && c.includes(p));
}

export const collectionHref = (slug: string) => `/tours/${slug}`;
