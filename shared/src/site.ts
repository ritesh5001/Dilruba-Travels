// Single source of truth for business details shown across the site.
// These fields will become editable from the CRM "Website settings" screen later.

export const site = {
  name: "Dilruba Travels",
  brand: "Dilruba Travels & Turizm",
  legalName: "Dilruba Travels Of India Pvt Ltd",
  url: "https://dilrubatravels.com",
  tagline: "Umrah, Hajj, Ziyarat & holiday packages from Mumbai",
  description:
    "Umrah and Hajj packages, Iraq, Jordan, Palestine and Turkey ziyarat tours, plus Asia and India holidays from Mahim, Mumbai. Get a free quote on WhatsApp.",
  phone: "+91 78602 57987",
  phoneHref: "tel:+917860257987",
  whatsapp: "917860257986",
  email: "Dilrubatravels1@gmail.com",
  address: {
    line1: "Shop 3A, Building No 5B, Baliga Nagar",
    line2: "Jasmine Mill Road, Mahim East",
    city: "Mumbai",
    region: "Maharashtra",
    postalCode: "400017",
    country: "IN",
  },
  mapQuery:
    "Shop 3A, Building No 5B, Baliga Nagar, Jasmine Mill Road, Mahim East, Mumbai 400017",
} as const;

export const fullAddress = `${site.address.line1}, ${site.address.line2}, ${site.address.city} ${site.address.postalCode}`;

export function whatsappLink(message?: string) {
  const text = message ?? "Assalamu Alaikum, I would like to know more about your packages.";
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&output=embed`;
export const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/packages/umrah", label: "Umrah" },
  { href: "/packages/hajj", label: "Hajj" },
  { href: "/packages", label: "All Packages" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;
