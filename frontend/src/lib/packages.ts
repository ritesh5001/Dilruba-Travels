import type { PhotoKey } from "./images";

// Package catalogue. This is static for now and will move into the CRM
// ("Package management") so the team can edit it without code changes.
//
// IMPORTANT: prices, hotels and durations are placeholders written to the
// audit's package template. Dilruba Travels must confirm every value against
// their own supplier rates before going live. `startingPrice: null` shows
// "Best price on request" with a WhatsApp button instead of a number.

export type CategorySlug =
  | "umrah"
  | "hajj"
  | "iraq"
  | "jordan"
  | "palestine"
  | "turkey"
  | "asia"
  | "domestic";

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

export type Hotel = { city: string; detail: string };
export type ItineraryDay = { day: string; title: string; description: string };
export type Faq = { q: string; a: string };

export type TravelPackage = {
  slug: string;
  category: CategorySlug;
  title: string;
  summary: string;
  days: number;
  nights: number;
  tier?: "Economy" | "Standard" | "Premium" | "Seasonal";
  startingPrice: number | null;
  sharing?: string;
  route: [string, string];
  places: string[];
  image: PhotoKey;
  gallery?: PhotoKey[];
  featured?: boolean;
  highlights: string[];
  hotels?: Hotel[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  documents: string[];
  faqs?: Faq[];
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

const umrahDocuments = [
  "Passport valid for at least 6 months from the date of travel",
  "Recent passport-size photographs with white background",
  "Meningitis (ACYW) vaccination certificate",
  "PAN card copy",
  "Mahram details where applicable",
];

const umrahExclusions = [
  "Personal expenses, laundry and phone calls",
  "Meals not mentioned in the itinerary",
  "Excess baggage charges",
  "Anything not listed under inclusions",
];

const umrahFaqs: Faq[] = [
  {
    q: "How early should I book?",
    a: "4 to 6 weeks before travel is ideal. For Ramadan and school holidays, book 2 to 3 months early as seats and hotels fill fast.",
  },
  {
    q: "Can I pay in instalments?",
    a: "Yes. An advance confirms your seat and the balance is paid before ticketing. Our team shares payment details privately on WhatsApp once you confirm.",
  },
  {
    q: "Is ziyarat included?",
    a: "Yes, guided ziyarat in Makkah and Madinah is included in every Umrah package.",
  },
];

export const packages: TravelPackage[] = [
  // ---------------- Umrah ----------------
  {
    slug: "economy-umrah-15-days",
    category: "umrah",
    title: "Economy Umrah – 15 Days",
    summary: "A comfortable, budget-friendly Umrah for families and groups, with shuttle service to the Haram.",
    days: 15,
    nights: 14,
    tier: "Economy",
    startingPrice: null,
    sharing: "Quad / Triple / Double",
    route: ["Mumbai", "Makkah"],
    places: ["Makkah", "Madinah"],
    image: "kaaba",
    gallery: ["kaabaAerial", "madinah", "madinahInterior"],
    featured: true,
    highlights: [
      "Umrah visa and return flights from Mumbai",
      "8 nights Makkah, 6 nights Madinah",
      "Shuttle service to Masjid al-Haram",
      "Guided Umrah and ziyarat",
    ],
    hotels: [
      { city: "Makkah", detail: "3★ hotel, approx. 800–1000 m from Haram with shuttle" },
      { city: "Madinah", detail: "3★ hotel, approx. 400–600 m from Masjid an-Nabawi" },
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Jeddah → Makkah", description: "Depart Mumbai in ihram. Transfer to Makkah, check in and perform Umrah with our guide." },
      { day: "Day 2–8", title: "Makkah", description: "Prayers at Masjid al-Haram. Guided ziyarat of Jabal al-Noor, Jabal Thawr, Mina, Arafat and Muzdalifah." },
      { day: "Day 9", title: "Makkah → Madinah", description: "Travel to Madinah by bus or train and check in near Masjid an-Nabawi." },
      { day: "Day 10–14", title: "Madinah", description: "Prayers at Masjid an-Nabawi, Salam at Rawdah (subject to permit), and ziyarat of Quba, Uhud and Masjid Qiblatain." },
      { day: "Day 15", title: "Madinah → Mumbai", description: "Transfer to the airport for the return flight to Mumbai." },
    ],
    inclusions: [
      "Umrah visa",
      "Return economy flights from Mumbai",
      "Hotel stay on sharing basis",
      "Daily breakfast and dinner",
      "Airport and inter-city transfers by AC bus",
      "Guided ziyarat in Makkah and Madinah",
      "Zamzam water (as per airline policy)",
    ],
    exclusions: umrahExclusions,
    documents: umrahDocuments,
    faqs: umrahFaqs,
  },
  {
    slug: "standard-umrah-15-days",
    category: "umrah",
    title: "Standard Umrah – 15 Days",
    summary: "Our most popular Umrah: closer hotels in Makkah and Madinah, triple or double sharing.",
    days: 15,
    nights: 14,
    tier: "Standard",
    startingPrice: null,
    sharing: "Triple / Double",
    route: ["Mumbai", "Makkah"],
    places: ["Makkah", "Madinah"],
    image: "kaabaAerial",
    gallery: ["kaaba", "madinahDome", "madinahInterior"],
    featured: true,
    highlights: [
      "Walking distance hotels in Makkah and Madinah",
      "Triple or double sharing rooms",
      "Full board meals",
      "Experienced group leader from Mumbai",
    ],
    hotels: [
      { city: "Makkah", detail: "4★ hotel, approx. 300–500 m from Haram" },
      { city: "Madinah", detail: "4★ hotel, approx. 200–300 m from Masjid an-Nabawi" },
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Jeddah → Makkah", description: "Depart in ihram, transfer to Makkah and perform Umrah with the group leader." },
      { day: "Day 2–8", title: "Makkah", description: "Prayers at the Haram and guided ziyarat of the historic sites of Makkah." },
      { day: "Day 9", title: "Makkah → Madinah", description: "Travel to Madinah and check in close to Masjid an-Nabawi." },
      { day: "Day 10–14", title: "Madinah", description: "Prayers, Rawdah visit (subject to permit) and ziyarat of Quba, Uhud and Qiblatain." },
      { day: "Day 15", title: "Madinah → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: [
      "Umrah visa",
      "Return economy flights from Mumbai",
      "Hotel stay on sharing basis",
      "Breakfast, lunch and dinner",
      "All transfers by AC bus",
      "Guided ziyarat in Makkah and Madinah",
      "Group leader from Mumbai",
    ],
    exclusions: umrahExclusions,
    documents: umrahDocuments,
    faqs: umrahFaqs,
  },
  {
    slug: "premium-umrah-10-days",
    category: "umrah",
    title: "Premium Umrah – 10 Days",
    summary: "Haram-facing comfort for those who want minimal walking and maximum time in prayer.",
    days: 10,
    nights: 9,
    tier: "Premium",
    startingPrice: null,
    sharing: "Double",
    route: ["Mumbai", "Makkah"],
    places: ["Makkah", "Madinah"],
    image: "madinahDome",
    gallery: ["kaaba", "kaabaAerial", "madinah"],
    featured: true,
    highlights: [
      "5★ hotels within a short walk of both Harams",
      "Double room occupancy",
      "Private transfers",
      "Extra ziyarat including Taif (on request)",
    ],
    hotels: [
      { city: "Makkah", detail: "5★ hotel, approx. 100–200 m from Haram" },
      { city: "Madinah", detail: "5★ hotel, approx. 100 m from Masjid an-Nabawi" },
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Jeddah → Makkah", description: "Private transfer to your Makkah hotel and guided Umrah." },
      { day: "Day 2–5", title: "Makkah", description: "Prayers at the Haram and guided ziyarat. Optional day trip to Taif." },
      { day: "Day 6", title: "Makkah → Madinah", description: "Travel by Haramain high-speed train or private car." },
      { day: "Day 7–9", title: "Madinah", description: "Prayers at Masjid an-Nabawi, Rawdah (subject to permit) and ziyarat." },
      { day: "Day 10", title: "Madinah → Mumbai", description: "Private transfer to the airport and return flight." },
    ],
    inclusions: [
      "Umrah visa",
      "Return economy flights from Mumbai (business class on request)",
      "5★ hotels on double sharing",
      "Breakfast and dinner buffet",
      "Private transfers",
      "Haramain train Makkah → Madinah",
      "Guided ziyarat",
    ],
    exclusions: umrahExclusions,
    documents: umrahDocuments,
    faqs: umrahFaqs,
  },
  {
    slug: "ramadan-umrah-last-10-days",
    category: "umrah",
    title: "Ramadan Umrah – Last 10 Days",
    summary: "Spend the blessed last ten nights of Ramadan in Makkah, including Eid in the Holy City.",
    days: 15,
    nights: 14,
    tier: "Seasonal",
    startingPrice: null,
    sharing: "Quad / Triple / Double",
    route: ["Mumbai", "Makkah"],
    places: ["Madinah", "Makkah"],
    image: "madinah",
    gallery: ["kaaba", "kaabaAerial", "madinahInterior"],
    featured: true,
    highlights: [
      "Last 10 nights of Ramadan in Makkah",
      "Iftar and suhoor arrangements",
      "Eid prayer at Masjid al-Haram",
      "Limited seats — early booking recommended",
    ],
    hotels: [
      { city: "Madinah", detail: "Hotel near Masjid an-Nabawi (category as per chosen tier)" },
      { city: "Makkah", detail: "Hotel near Haram (category as per chosen tier)" },
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Madinah", description: "Fly to Madinah and check in near Masjid an-Nabawi." },
      { day: "Day 2–4", title: "Madinah", description: "Ramadan prayers, Rawdah (subject to permit) and ziyarat." },
      { day: "Day 5", title: "Madinah → Makkah", description: "Enter ihram at Dhul Hulaifah, travel to Makkah and perform Umrah." },
      { day: "Day 6–14", title: "Makkah – last ten nights", description: "Taraweeh and Qiyam at the Haram, I'tikaf (optional) and Eid prayer." },
      { day: "Day 15", title: "Makkah → Mumbai", description: "Transfer to Jeddah for the return flight." },
    ],
    inclusions: [
      "Umrah visa",
      "Return economy flights from Mumbai",
      "Hotel stay on sharing basis",
      "Suhoor and iftar",
      "All transfers",
      "Guided ziyarat",
    ],
    exclusions: umrahExclusions,
    documents: umrahDocuments,
    faqs: umrahFaqs,
  },

  // ---------------- Hajj ----------------
  {
    slug: "hajj-package",
    category: "hajj",
    title: "Hajj Package",
    summary: "A fully guided Hajj with Makkah and Madinah stays, Mina tents and experienced scholars.",
    days: 35,
    nights: 34,
    startingPrice: null,
    sharing: "As per category",
    route: ["Mumbai", "Makkah"],
    places: ["Makkah", "Mina", "Arafat", "Muzdalifah", "Madinah"],
    image: "kaabaAerial",
    gallery: ["kaaba", "madinah", "madinahDome"],
    featured: true,
    highlights: [
      "Pre-Hajj training sessions in Mumbai",
      "Guidance from experienced group leaders",
      "Mina, Arafat and Muzdalifah arrangements",
      "Madinah stay before or after Hajj",
    ],
    hotels: [
      { city: "Makkah", detail: "Hotel near Haram or Aziziyah (as per category)" },
      { city: "Mina", detail: "Air-conditioned tents" },
      { city: "Madinah", detail: "Hotel near Masjid an-Nabawi" },
    ],
    itinerary: [
      { day: "Before departure", title: "Hajj training in Mumbai", description: "Step-by-step sessions on the rites of Hajj, health and packing." },
      { day: "Arrival", title: "Mumbai → Makkah", description: "Arrive in ihram, perform Umrah (Tamattu) and settle in Makkah." },
      { day: "8 Dhul Hijjah", title: "Mina", description: "Move to Mina for the day of Tarwiyah." },
      { day: "9 Dhul Hijjah", title: "Arafat & Muzdalifah", description: "Wuquf at Arafat, then night under the sky at Muzdalifah." },
      { day: "10–13 Dhul Hijjah", title: "Mina, Rami & Tawaf", description: "Rami, Qurbani, Halq and Tawaf al-Ifadah with full group support." },
      { day: "After Hajj", title: "Madinah", description: "Days in Madinah for prayers at Masjid an-Nabawi and ziyarat." },
      { day: "Return", title: "Madinah / Jeddah → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: [
      "Hajj visa processing",
      "Return flights from Mumbai",
      "Hotel stays in Makkah and Madinah",
      "Mina tents and Arafat arrangements",
      "Meals as per package",
      "All transfers",
      "Qurbani (on request)",
      "Group leader and scholar guidance",
    ],
    exclusions: [
      "Personal expenses",
      "Excess baggage",
      "Anything not listed under inclusions",
    ],
    documents: [
      "Passport valid for at least 6 months beyond the return date",
      "Recent passport-size photographs with white background",
      "Meningitis (ACYW) and other required vaccinations",
      "PAN card and Aadhaar copies",
      "Mahram details where applicable",
    ],
    faqs: [
      {
        q: "When should I register for Hajj?",
        a: "Registrations usually open several months before the season. Message us on WhatsApp to be added to the early enquiry list.",
      },
      {
        q: "Do you conduct Hajj training?",
        a: "Yes, we hold pre-Hajj sessions in Mumbai covering the rites, health tips and what to pack.",
      },
    ],
  },

  // ---------------- Iraq ----------------
  {
    slug: "iraq-ziyarat-10-days",
    category: "iraq",
    title: "Iraq Ziyarat – 10 Days",
    summary: "Ziyarat of Karbala, Najaf, Kufa, Kadhimiya and Samarra with hotels close to the shrines.",
    days: 10,
    nights: 9,
    startingPrice: null,
    sharing: "Quad / Triple / Double",
    route: ["Mumbai", "Najaf"],
    places: ["Najaf", "Kufa", "Karbala", "Kadhimiya", "Samarra"],
    image: "najaf",
    gallery: ["najafTower"],
    featured: true,
    highlights: [
      "Hotels close to the haram in Najaf and Karbala",
      "Ziyarat of Imam Ali (AS) and Imam Hussain (AS)",
      "Masjid al-Kufa and Masjid as-Sahla",
      "Kadhimiya and Samarra day trip",
    ],
    hotels: [
      { city: "Najaf", detail: "Hotel near the shrine of Imam Ali (AS)" },
      { city: "Karbala", detail: "Hotel near the shrine of Imam Hussain (AS)" },
      { city: "Baghdad", detail: "Hotel in Kadhimiya" },
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Najaf", description: "Arrive in Najaf and check in. Evening ziyarat of Imam Ali (AS)." },
      { day: "Day 2–3", title: "Najaf & Kufa", description: "Wadi-us-Salaam, Masjid al-Kufa, Masjid as-Sahla and the house of Imam Ali (AS)." },
      { day: "Day 4–7", title: "Karbala", description: "Ziyarat of Imam Hussain (AS), Hazrat Abbas (AS), Bayn al-Haramayn and nearby sites." },
      { day: "Day 8–9", title: "Kadhimiya & Samarra", description: "Ziyarat at Kadhimiya and a guided day trip to Samarra (subject to conditions)." },
      { day: "Day 10", title: "Baghdad / Najaf → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: [
      "Iraq visa",
      "Return flights from Mumbai",
      "Hotels on sharing basis",
      "Breakfast and dinner",
      "AC transport for all ziyarat",
      "Experienced ziyarat guide",
    ],
    exclusions: ["Personal expenses", "Lunch", "Anything not listed under inclusions"],
    documents: [
      "Passport valid for at least 6 months",
      "Recent passport-size photographs",
      "PAN card copy",
    ],
  },

  // ---------------- Jordan ----------------
  {
    slug: "jordan-ziyarat-petra-7-days",
    category: "jordan",
    title: "Jordan Ziyarat & Petra – 7 Days",
    summary: "Resting places of the Sahaba, the Cave of the Seven Sleepers, Petra and the Dead Sea.",
    days: 7,
    nights: 6,
    startingPrice: null,
    sharing: "Triple / Double",
    route: ["Mumbai", "Amman"],
    places: ["Amman", "Mu'tah", "Petra", "Dead Sea"],
    image: "petra",
    gallery: ["petraDay"],
    featured: true,
    highlights: [
      "Ashab al-Kahf (Cave of the Seven Sleepers)",
      "Shrines of Jafar al-Tayyar, Zaid bin Haritha and Abdullah bin Rawaha at Mu'tah",
      "Abu Ubaidah bin al-Jarrah in the Jordan Valley",
      "Petra and a float in the Dead Sea",
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Amman", description: "Arrive in Amman and check in." },
      { day: "Day 2", title: "Amman ziyarat", description: "Ashab al-Kahf, Amman Citadel and the King Abdullah Mosque." },
      { day: "Day 3", title: "Jordan Valley", description: "Shrines of Abu Ubaidah, Muadh bin Jabal and Dirar bin al-Azwar." },
      { day: "Day 4", title: "Mu'tah → Petra", description: "Battlefield of Mu'tah and shrines of the martyrs, then on to Petra." },
      { day: "Day 5", title: "Petra", description: "Walk the Siq to the Treasury and explore the rose-red city." },
      { day: "Day 6", title: "Dead Sea", description: "Relax and float in the Dead Sea, return to Amman." },
      { day: "Day 7", title: "Amman → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: [
      "Jordan visa",
      "Return flights from Mumbai",
      "Hotels with breakfast and dinner",
      "AC transport with guide",
      "Petra entry ticket",
    ],
    exclusions: ["Personal expenses", "Lunch", "Tips", "Anything not listed under inclusions"],
    documents: ["Passport valid for at least 6 months", "Recent passport-size photographs"],
  },

  // ---------------- Palestine ----------------
  {
    slug: "al-aqsa-jordan-9-days",
    category: "palestine",
    title: "Al-Aqsa & Jordan – 9 Days",
    summary: "Pray at Masjid al-Aqsa, visit Hebron and complete ziyarat of the Sahaba in Jordan.",
    days: 9,
    nights: 8,
    startingPrice: null,
    sharing: "Triple / Double",
    route: ["Mumbai", "Jerusalem"],
    places: ["Amman", "Jerusalem", "Hebron", "Bethlehem"],
    image: "domeOfTheRock",
    gallery: ["aqsa", "petra"],
    featured: true,
    highlights: [
      "Prayers at Masjid al-Aqsa and the Dome of the Rock",
      "Masjid Ibrahimi in Hebron",
      "Old City of Jerusalem",
      "Jordan ziyarat of the Sahaba",
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Amman", description: "Arrive in Amman and check in." },
      { day: "Day 2", title: "Amman ziyarat", description: "Ashab al-Kahf and shrines of the Sahaba." },
      { day: "Day 3", title: "Amman → Jerusalem", description: "Cross via the King Hussein (Allenby) Bridge and check in near the Old City." },
      { day: "Day 4–6", title: "Jerusalem", description: "Daily prayers at Masjid al-Aqsa, Dome of the Rock and a guided walk of the Old City." },
      { day: "Day 7", title: "Hebron & Bethlehem", description: "Masjid Ibrahimi and the tombs of the Prophets, then Bethlehem." },
      { day: "Day 8", title: "Jerusalem → Amman", description: "Return to Amman via the bridge." },
      { day: "Day 9", title: "Amman → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: [
      "Jordan visa and Palestine permit processing",
      "Return flights from Mumbai",
      "Hotels with breakfast and dinner",
      "Transport and bridge transfers",
      "Experienced guide",
    ],
    exclusions: [
      "Bridge departure taxes (if not included at booking)",
      "Personal expenses",
      "Anything not listed under inclusions",
    ],
    documents: [
      "Passport valid for at least 6 months",
      "Recent passport-size photographs",
      "Additional documents as required for the entry permit",
    ],
    faqs: [
      {
        q: "Is the tour running currently?",
        a: "Departures depend on the travel situation and permit approvals. Message us for the latest status before planning.",
      },
    ],
  },

  // ---------------- Turkey ----------------
  {
    slug: "istanbul-cappadocia-8-days",
    category: "turkey",
    title: "Istanbul & Cappadocia – 8 Days",
    summary: "Mosques and bazaars of Istanbul, the sacred relics at Topkapi and sunrise balloons over Cappadocia.",
    days: 8,
    nights: 7,
    startingPrice: null,
    sharing: "Triple / Double",
    route: ["Mumbai", "Istanbul"],
    places: ["Istanbul", "Cappadocia"],
    image: "cappadocia",
    gallery: ["istanbul", "cappadociaBalloons"],
    featured: true,
    highlights: [
      "Hagia Sophia, Blue Mosque and Topkapi Palace",
      "Eyup Sultan Mosque",
      "Bosphorus cruise",
      "Cappadocia with optional hot-air balloon ride",
    ],
    hotels: [
      { city: "Istanbul", detail: "4★ hotel in the old city" },
      { city: "Cappadocia", detail: "Cave-style hotel" },
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Istanbul", description: "Arrive in Istanbul and check in." },
      { day: "Day 2", title: "Old City", description: "Hagia Sophia, Blue Mosque, Hippodrome and Topkapi Palace with the sacred relics." },
      { day: "Day 3", title: "Eyup Sultan & Bosphorus", description: "Eyup Sultan Mosque, Pierre Loti hill and a Bosphorus cruise." },
      { day: "Day 4", title: "Bazaars", description: "Grand Bazaar, Spice Bazaar and Suleymaniye Mosque." },
      { day: "Day 5", title: "Istanbul → Cappadocia", description: "Fly to Kayseri and transfer to your cave hotel." },
      { day: "Day 6", title: "Cappadocia", description: "Optional sunrise balloon ride, Goreme valleys and underground city." },
      { day: "Day 7", title: "Cappadocia → Istanbul", description: "Return to Istanbul for a free evening." },
      { day: "Day 8", title: "Istanbul → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: [
      "Turkey e-visa assistance",
      "Return international flights and domestic flight to Cappadocia",
      "Hotels with breakfast",
      "Sightseeing with guide",
      "Airport transfers",
    ],
    exclusions: [
      "Hot-air balloon ride (optional add-on)",
      "Lunch and dinner",
      "Personal expenses",
    ],
    documents: [
      "Passport valid for at least 6 months",
      "Recent passport-size photographs",
      "Bank statement and ITR for visa (if applicable)",
    ],
  },
  {
    slug: "turkey-islamic-heritage-7-days",
    category: "turkey",
    title: "Turkey Islamic Heritage – 7 Days",
    summary: "Istanbul, Bursa and Konya: the Ottoman capitals and the tomb of Maulana Rumi.",
    days: 7,
    nights: 6,
    startingPrice: null,
    sharing: "Triple / Double",
    route: ["Mumbai", "Istanbul"],
    places: ["Istanbul", "Bursa", "Konya"],
    image: "istanbul",
    gallery: ["cappadocia"],
    highlights: [
      "Topkapi sacred relics and Eyup Sultan",
      "Bursa – the first Ottoman capital",
      "Konya – Mevlana Museum",
      "Bosphorus cruise",
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Istanbul", description: "Arrive and check in." },
      { day: "Day 2", title: "Istanbul", description: "Hagia Sophia, Blue Mosque and Topkapi Palace." },
      { day: "Day 3", title: "Eyup Sultan & Bosphorus", description: "Eyup Sultan Mosque and Bosphorus cruise." },
      { day: "Day 4", title: "Bursa", description: "Grand Mosque (Ulu Camii), Green Mosque and Ottoman tombs." },
      { day: "Day 5", title: "Konya", description: "Mevlana Museum and the old city of Konya." },
      { day: "Day 6", title: "Konya → Istanbul", description: "Return to Istanbul, evening at leisure." },
      { day: "Day 7", title: "Istanbul → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: [
      "Turkey e-visa assistance",
      "Return flights from Mumbai",
      "Hotels with breakfast",
      "Sightseeing with guide",
      "All transfers",
    ],
    exclusions: ["Lunch and dinner", "Personal expenses", "Tips"],
    documents: ["Passport valid for at least 6 months", "Recent passport-size photographs"],
  },

  // ---------------- Asia ----------------
  {
    slug: "dubai-5-days",
    category: "asia",
    title: "Dubai Delight – 5 Days",
    summary: "Burj Khalifa, desert safari, Dhow cruise and a day in Abu Dhabi.",
    days: 5,
    nights: 4,
    startingPrice: null,
    route: ["Mumbai", "Dubai"],
    places: ["Dubai", "Abu Dhabi"],
    image: "dubai",
    gallery: ["dubaiNight"],
    featured: true,
    highlights: [
      "Burj Khalifa 'At the Top'",
      "Desert safari with BBQ dinner",
      "Marina Dhow cruise",
      "Abu Dhabi city tour with Sheikh Zayed Grand Mosque",
    ],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Dubai", description: "Arrive, check in, evening Dhow cruise with dinner." },
      { day: "Day 2", title: "Dubai city tour", description: "City tour and Burj Khalifa 'At the Top'." },
      { day: "Day 3", title: "Desert safari", description: "Free morning, afternoon desert safari with BBQ dinner." },
      { day: "Day 4", title: "Abu Dhabi", description: "Sheikh Zayed Grand Mosque and Abu Dhabi city tour." },
      { day: "Day 5", title: "Dubai → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: ["UAE visa", "Return flights", "Hotel with breakfast", "Tours and transfers as per itinerary"],
    exclusions: ["Tourism Dirham fee", "Lunch", "Personal expenses"],
    documents: ["Passport valid for at least 6 months", "Passport-size photograph", "PAN card copy"],
  },
  {
    slug: "thailand-6-days",
    category: "asia",
    title: "Thailand Phuket & Krabi – 6 Days",
    summary: "Island hopping, turquoise lagoons and beaches in southern Thailand.",
    days: 6,
    nights: 5,
    startingPrice: null,
    route: ["Mumbai", "Phuket"],
    places: ["Phuket", "Krabi", "Phi Phi Islands"],
    image: "thailand",
    gallery: ["thailandBoats"],
    highlights: ["Phi Phi Islands speedboat tour", "Krabi four-island tour", "Phuket city tour", "Halal food options on request"],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Phuket", description: "Arrive and check in. Evening at leisure." },
      { day: "Day 2", title: "Phi Phi Islands", description: "Full-day speedboat tour of Phi Phi and Maya Bay." },
      { day: "Day 3", title: "Phuket city tour", description: "Big Buddha viewpoint, old town and Patong." },
      { day: "Day 4", title: "Phuket → Krabi", description: "Transfer to Krabi and check in." },
      { day: "Day 5", title: "Krabi four-island tour", description: "Longtail boat tour of Krabi's islands." },
      { day: "Day 6", title: "Krabi → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: ["Return flights", "Hotels with breakfast", "Tours and transfers as per itinerary"],
    exclusions: ["Visa on arrival fees (if applicable)", "National park fees", "Personal expenses"],
    documents: ["Passport valid for at least 6 months", "Passport-size photograph"],
  },
  {
    slug: "singapore-malaysia-7-days",
    category: "asia",
    title: "Singapore & Malaysia – 7 Days",
    summary: "Gardens by the Bay, Sentosa, Kuala Lumpur and Genting Highlands.",
    days: 7,
    nights: 6,
    startingPrice: null,
    route: ["Mumbai", "Singapore"],
    places: ["Singapore", "Kuala Lumpur", "Genting"],
    image: "singapore",
    gallery: ["marinaBay"],
    featured: true,
    highlights: ["Gardens by the Bay", "Sentosa with cable car", "Petronas Towers", "Genting Highlands"],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Singapore", description: "Arrive, check in and evening at Marina Bay." },
      { day: "Day 2", title: "Singapore city", description: "City tour and Gardens by the Bay." },
      { day: "Day 3", title: "Sentosa", description: "Cable car, beaches and evening show." },
      { day: "Day 4", title: "Singapore → Kuala Lumpur", description: "Transfer to Kuala Lumpur." },
      { day: "Day 5", title: "Kuala Lumpur", description: "City tour, Petronas Towers and Batu Caves." },
      { day: "Day 6", title: "Genting Highlands", description: "Cable car ride and theme park." },
      { day: "Day 7", title: "Kuala Lumpur → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: ["Return flights", "Hotels with breakfast", "Tours and transfers as per itinerary", "Visa assistance"],
    exclusions: ["Visa fees", "Lunch and dinner", "Personal expenses"],
    documents: ["Passport valid for at least 6 months", "Passport-size photographs", "Bank statement for visa"],
  },
  {
    slug: "bali-6-days",
    category: "asia",
    title: "Bali Escape – 6 Days",
    summary: "Temples, rice terraces and beaches — ideal for honeymooners and families.",
    days: 6,
    nights: 5,
    startingPrice: null,
    route: ["Mumbai", "Bali"],
    places: ["Ubud", "Kintamani", "Nusa Dua"],
    image: "bali",
    highlights: ["Ubud and Tegallalang rice terraces", "Kintamani volcano view", "Ulun Danu Bratan temple", "Water sports at Nusa Dua"],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Bali", description: "Arrive and check in." },
      { day: "Day 2", title: "Ubud", description: "Rice terraces, Ubud market and art villages." },
      { day: "Day 3", title: "Kintamani", description: "Volcano viewpoint and coffee plantation." },
      { day: "Day 4", title: "Bedugul", description: "Ulun Danu Bratan lake temple." },
      { day: "Day 5", title: "Nusa Dua", description: "Beach day and water sports." },
      { day: "Day 6", title: "Bali → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: ["Return flights", "Hotels with breakfast", "Private tours and transfers"],
    exclusions: ["Visa on arrival fees", "Water sports", "Personal expenses"],
    documents: ["Passport valid for at least 6 months"],
  },

  // ---------------- Domestic ----------------
  {
    slug: "kashmir-6-days",
    category: "domestic",
    title: "Kashmir Paradise – 6 Days",
    summary: "Srinagar houseboat, Gulmarg, Pahalgam and Sonmarg.",
    days: 6,
    nights: 5,
    startingPrice: null,
    route: ["Mumbai", "Srinagar"],
    places: ["Srinagar", "Gulmarg", "Pahalgam", "Sonmarg"],
    image: "kashmir",
    gallery: ["kashmirLake"],
    featured: true,
    highlights: ["Shikara ride on Dal Lake", "Night in a houseboat", "Gulmarg gondola", "Pahalgam valleys"],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Srinagar", description: "Arrive, check in to houseboat, evening shikara ride." },
      { day: "Day 2", title: "Gulmarg", description: "Day trip to Gulmarg with optional gondola ride." },
      { day: "Day 3", title: "Pahalgam", description: "Drive to Pahalgam via saffron fields." },
      { day: "Day 4", title: "Pahalgam", description: "Aru, Betaab and Chandanwari valleys." },
      { day: "Day 5", title: "Sonmarg", description: "Day trip to Sonmarg and Thajiwas glacier." },
      { day: "Day 6", title: "Srinagar → Mumbai", description: "Mughal gardens and Hazratbal, then return flight." },
    ],
    inclusions: ["Return flights", "Hotels and houseboat with breakfast and dinner", "Private cab for all sightseeing"],
    exclusions: ["Gondola tickets", "Pony rides", "Personal expenses"],
    documents: ["Government photo ID for all travellers"],
  },
  {
    slug: "kerala-6-days",
    category: "domestic",
    title: "Kerala Backwaters – 6 Days",
    summary: "Munnar tea gardens, Thekkady and an Alleppey houseboat stay.",
    days: 6,
    nights: 5,
    startingPrice: null,
    route: ["Mumbai", "Kochi"],
    places: ["Kochi", "Munnar", "Thekkady", "Alleppey"],
    image: "kerala",
    highlights: ["Munnar tea estates", "Periyar wildlife at Thekkady", "Alleppey houseboat night", "Fort Kochi"],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Kochi → Munnar", description: "Drive to Munnar via waterfalls." },
      { day: "Day 2", title: "Munnar", description: "Tea gardens, Mattupetty dam and Eravikulam." },
      { day: "Day 3", title: "Thekkady", description: "Spice plantation and Periyar lake." },
      { day: "Day 4", title: "Alleppey", description: "Overnight houseboat on the backwaters." },
      { day: "Day 5", title: "Kochi", description: "Fort Kochi, Chinese fishing nets and Jew Town." },
      { day: "Day 6", title: "Kochi → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: ["Return flights", "Hotels and houseboat with breakfast", "Private cab"],
    exclusions: ["Entry tickets", "Personal expenses"],
    documents: ["Government photo ID for all travellers"],
  },
  {
    slug: "goa-4-days",
    category: "domestic",
    title: "Goa Getaway – 4 Days",
    summary: "Beaches, forts and old churches on a relaxed short break.",
    days: 4,
    nights: 3,
    startingPrice: null,
    route: ["Mumbai", "Goa"],
    places: ["North Goa", "South Goa"],
    image: "goa",
    highlights: ["North Goa beaches and forts", "Old Goa heritage", "South Goa beaches", "River cruise"],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Goa", description: "Arrive and check in. Evening at the beach." },
      { day: "Day 2", title: "North Goa", description: "Fort Aguada, Baga, Calangute and Anjuna." },
      { day: "Day 3", title: "South Goa", description: "Old Goa, Colva and an evening river cruise." },
      { day: "Day 4", title: "Goa → Mumbai", description: "Return journey to Mumbai." },
    ],
    inclusions: ["Return flights or train", "Hotel with breakfast", "Sightseeing by private cab"],
    exclusions: ["Water sports", "Personal expenses"],
    documents: ["Government photo ID for all travellers"],
  },
  {
    slug: "agra-rajasthan-7-days",
    category: "domestic",
    title: "Golden Triangle – 7 Days",
    summary: "Delhi, Agra and Jaipur: forts, palaces and the Taj Mahal.",
    days: 7,
    nights: 6,
    startingPrice: null,
    route: ["Mumbai", "Agra"],
    places: ["Delhi", "Agra", "Jaipur"],
    image: "tajMahal",
    highlights: ["Taj Mahal at sunrise", "Jama Masjid and Red Fort", "Fatehpur Sikri", "Amber Fort and Hawa Mahal"],
    itinerary: [
      { day: "Day 1", title: "Mumbai → Delhi", description: "Arrive in Delhi and check in." },
      { day: "Day 2", title: "Delhi", description: "Jama Masjid, Red Fort, Nizamuddin Dargah and Qutub Minar." },
      { day: "Day 3", title: "Delhi → Agra", description: "Drive to Agra, visit Agra Fort." },
      { day: "Day 4", title: "Agra → Jaipur", description: "Taj Mahal at sunrise, Fatehpur Sikri en route to Jaipur." },
      { day: "Day 5", title: "Jaipur", description: "Amber Fort, City Palace and Hawa Mahal." },
      { day: "Day 6", title: "Jaipur → Delhi", description: "Drive back to Delhi." },
      { day: "Day 7", title: "Delhi → Mumbai", description: "Return flight to Mumbai." },
    ],
    inclusions: ["Return flights", "Hotels with breakfast", "Private cab for all sightseeing"],
    exclusions: ["Monument entry tickets", "Personal expenses"],
    documents: ["Government photo ID for all travellers"],
  },
];

export const mainCategories = categories.filter((c) => c.group === "main");
export const generalCategories = categories.filter((c) => c.group === "general");

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getPackagesByCategory(slug: CategorySlug) {
  return packages.filter((p) => p.category === slug);
}

export function getPackage(category: string, slug: string) {
  return packages.find((p) => p.category === category && p.slug === slug);
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
