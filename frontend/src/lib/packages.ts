import type { services } from "@dilruba/shared/enquiry";
import type { CategorySlug, TravelPackage } from "@dilruba/shared/catalog";
import type { PhotoKey } from "./images";

// Categories and helpers. Safe to use in client components.
// The packages themselves are managed in the admin panel: load them with lib/catalog.ts.

export type { CategorySlug, Faq, Hotel, ItineraryDay, TravelPackage } from "@dilruba/shared/catalog";

export type Category = {
  slug: CategorySlug;
  name: string;
  shortName: string;
  group: "main" | "general";
  tagline: string;
  description: string;
  image: PhotoKey;
  seoTitle: string;
  seoDescription: string;
};

export const categories: Category[] = [
  {
    slug: "umrah",
    name: "Umrah Packages",
    shortName: "Umrah",
    group: "main",
    tagline: "Economy, Standard, Premium & Ramadan Umrah from Mumbai",
    description:
      "Guided Umrah packages with visa, flights, hotels near the Haram and Masjid an-Nabawi, ground transport and ziyarat in Makkah and Madinah.",
    image: "kaaba",
    seoTitle: "Umrah Packages from Mumbai 2027",
    seoDescription:
      "Economy to premium Umrah packages from Mumbai with hotels near Haram, visa and flights included. Check dates and get a free quote on WhatsApp.",
  },
  {
    slug: "hajj",
    name: "Hajj Packages",
    shortName: "Hajj",
    group: "main",
    tagline: "Guided Hajj with experienced group leaders",
    description:
      "Complete Hajj arrangements with Makkah and Madinah stays, Mina, Arafat and Muzdalifah, guidance from experienced group leaders and support at every step.",
    image: "kaabaAerial",
    seoTitle: "Hajj Packages from Mumbai",
    seoDescription:
      "Hajj packages from Mumbai with guided groups, Makkah and Madinah hotels and full Mina-Arafat arrangements. Enquire early for the next season.",
  },
  {
    slug: "iraq",
    name: "Iraq Ziyarat",
    shortName: "Iraq",
    group: "main",
    tagline: "Karbala, Najaf, Kadhimiya & Samarra",
    description:
      "Ziyarat tours to the holy shrines of Iraq with visa, hotels close to the haram, transport and an experienced guide throughout.",
    image: "najaf",
    seoTitle: "Iraq Ziyarat Packages from Mumbai",
    seoDescription:
      "Iraq ziyarat packages from Mumbai covering Karbala, Najaf, Kufa, Kadhimiya and Samarra with visa, hotels and guide. Enquire on WhatsApp.",
  },
  {
    slug: "jordan",
    name: "Jordan Tours",
    shortName: "Jordan",
    group: "main",
    tagline: "Shrines of the Sahaba, Petra & the Dead Sea",
    description:
      "Visit the resting places of the companions of the Prophet ﷺ, the Cave of the Seven Sleepers, Petra and the Dead Sea.",
    image: "petra",
    seoTitle: "Jordan Ziyarat & Tour Packages from Mumbai",
    seoDescription:
      "Jordan ziyarat and holiday packages from Mumbai: shrines of the Sahaba, Ashab al-Kahf, Petra and the Dead Sea. Get a free quote.",
  },
  {
    slug: "palestine",
    name: "Palestine (Al-Aqsa) Tours",
    shortName: "Palestine",
    group: "main",
    tagline: "Masjid al-Aqsa, Hebron & Bethlehem via Jordan",
    description:
      "Pray at Masjid al-Aqsa and the Dome of the Rock, visit Masjid Ibrahimi in Hebron, and combine it with ziyarat in Jordan.",
    image: "domeOfTheRock",
    seoTitle: "Al-Aqsa & Palestine Tour Packages from Mumbai",
    seoDescription:
      "Palestine tour packages from Mumbai to Masjid al-Aqsa, Dome of the Rock and Hebron, combined with Jordan. Enquire for next departures.",
  },
  {
    slug: "turkey",
    name: "Turkey Tours",
    shortName: "Turkey",
    group: "main",
    tagline: "Istanbul, Bursa & Cappadocia",
    description:
      "Ottoman heritage, the sacred relics at Topkapi, Eyup Sultan, Bosphorus cruises and the balloons of Cappadocia.",
    image: "istanbul",
    seoTitle: "Turkey Tour Packages from Mumbai",
    seoDescription:
      "Istanbul and Turkey tour packages from Mumbai with itinerary, hotels and visa help. Islamic heritage and Cappadocia. Enquire on WhatsApp.",
  },
  {
    slug: "asia",
    name: "Asia Holidays",
    shortName: "Asia",
    group: "general",
    tagline: "Dubai, Thailand, Singapore, Malaysia & Bali",
    description:
      "Family and honeymoon holidays across Asia with flights, hotels, transfers, sightseeing and visa assistance.",
    image: "singapore",
    seoTitle: "Asia Holiday Packages from Mumbai",
    seoDescription:
      "Dubai, Thailand, Singapore, Malaysia and Bali holiday packages from Mumbai for families and couples. Get today's best price.",
  },
  {
    slug: "domestic",
    name: "India Holidays",
    shortName: "Domestic",
    group: "general",
    tagline: "Kashmir, Kerala, Goa & Rajasthan",
    description:
      "Hill stations, backwaters, beaches and heritage cities across India, planned for families, couples and groups.",
    image: "kashmir",
    seoTitle: "Domestic Holiday Packages from Mumbai",
    seoDescription:
      "Kashmir, Kerala, Goa and Rajasthan holiday packages from Mumbai for families and couples. Custom trips planned on WhatsApp.",
  },
];

/** Which enquiry "service" a category's forms pre-select. */
export const serviceFor: Record<CategorySlug, (typeof services)[number]> = {
  umrah: "Umrah",
  hajj: "Hajj",
  iraq: "Iraq Ziyarat",
  jordan: "Jordan",
  palestine: "Palestine (Al-Aqsa)",
  turkey: "Turkey",
  asia: "Asia Holiday",
  domestic: "India Holiday",
};

export const mainCategories = categories.filter((c) => c.group === "main");
export const generalCategories = categories.filter((c) => c.group === "general");

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function packageHref(p: Pick<TravelPackage, "category" | "slug">) {
  return `/packages/${p.category}/${p.slug}`;
}

export function formatPrice(price: number | null) {
  if (price === null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function packageWhatsappMessage(p: Pick<TravelPackage, "title">) {
  return `Assalamu Alaikum, I am interested in the "${p.title}" package. Please share today's best price and available dates.`;
}
