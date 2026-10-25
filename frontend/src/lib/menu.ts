import type { CategorySlug, TravelPackage } from "@dilruba/shared/catalog";
import type { NavIconName } from "@/components/nav-icons";
import { packageHref } from "./packages";

// The site's main menu. Destination items list their packages in a dropdown, so a new package
// added in the admin panel appears in the menu too.

export type MenuLink = { label: string; href: string };
export type MenuItem = MenuLink & {
  icon: NavIconName;
  children?: MenuLink[];
  /** Other paths that count as "this section" for highlighting (e.g. a group of destinations). */
  matches?: string[];
};

const MAX_PACKAGES = 6;

function destination(packages: TravelPackage[], label: string, category: CategorySlug, icon: NavIconName, all: string): MenuItem {
  const href = `/packages/${category}`;
  const list = packages.filter((p) => p.category === category);
  // A dropdown only helps when there's a choice to make.
  if (list.length < 2) return { label, href, icon };
  return { label, href, icon, children: [...list.slice(0, MAX_PACKAGES).map((p) => ({ label: p.title, href: packageHref(p) })), { label: all, href }] };
}

/**
 * The Umrah menu always shows these three names. Each links to the Umrah package whose title
 * matches (rename packages freely; the words below are what's looked for), or to the Umrah page.
 */
const umrahLinks: { label: string; match: RegExp }[] = [
  { label: "Economy Fix Departure", match: /economy/i },
  { label: "Deluxe Fix Departure", match: /deluxe|premium/i },
  { label: "Ramzan Umrah 2027", match: /ramzan|ramadan/i },
];

export function buildMenu(packages: TravelPackage[]): MenuItem[] {
  const umrah = packages.filter((p) => p.category === "umrah");
  const umrahHref = (match: RegExp) => {
    const p = umrah.find((x) => match.test(x.title));
    return p ? packageHref(p) : "/packages/umrah";
  };

  return [
    destination(packages, "Hajj", "hajj", "kaaba", "All Hajj packages"),
    {
      label: "Umrah",
      href: "/packages/umrah",
      icon: "mosque",
      children: [...umrahLinks.map((l) => ({ label: l.label, href: umrahHref(l.match) })), { label: "All Umrah packages", href: "/packages/umrah" }],
    },
    destination(packages, "Iraq", "iraq", "shrine", "All Iraq ziyarat"),
    {
      label: "Ziyarat",
      href: "/packages/jordan",
      icon: "dome",
      matches: ["/packages/jordan", "/packages/palestine"],
      children: [
        { label: "Jordan", href: "/packages/jordan" },
        { label: "Palestine (Al-Aqsa)", href: "/packages/palestine" },
      ],
    },
    destination(packages, "Turkey", "turkey", "turkey", "All Turkey tours"),
    {
      label: "Holidays",
      href: "/packages",
      icon: "holiday",
      matches: ["/packages/asia", "/packages/domestic"],
      children: [
        { label: "Asia holidays", href: "/packages/asia" },
        { label: "India holidays", href: "/packages/domestic" },
        { label: "All packages", href: "/packages" },
      ],
    },
    { label: "Customize", href: "/custom-package", icon: "custom" },
    { label: "About", href: "/about", icon: "info" },
    { label: "Contact", href: "/contact", icon: "contact" },
  ];
}
