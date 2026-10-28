import type { CategorySlug, TravelPackage } from "@dilruba/shared/catalog";
import type { NavIconName } from "@/components/nav-icons";
import { collectionHref } from "./collections";
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

/** Ramzan Umrah opens the Umrah package with Ramadan/Ramzan in its title (or the Umrah page). */
const RAMZAN = /ramzan|ramadan/i;

export function buildMenu(packages: TravelPackage[]): MenuItem[] {
  const ramzan = packages.find((p) => p.category === "umrah" && RAMZAN.test(p.title));

  return [
    destination(packages, "Hajj", "hajj", "kaaba", "All Hajj packages"),
    {
      label: "Umrah",
      href: "/packages/umrah",
      icon: "mosque",
      // Economy and Deluxe open a page listing every package of that kind.
      matches: ["/tours/economy-umrah", "/tours/deluxe-umrah"],
      children: [
        { label: "Economy Fix Departure", href: collectionHref("economy-umrah") },
        { label: "Deluxe Fix Departure", href: collectionHref("deluxe-umrah") },
        { label: "Ramzan Umrah 2027", href: ramzan ? packageHref(ramzan) : "/packages/umrah" },
        { label: "All Umrah packages", href: "/packages/umrah" },
      ],
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
    {
      label: "Turkey",
      href: "/packages/turkey",
      icon: "turkey",
      matches: ["/tours/turkey-group"],
      children: [
        { label: "Fixed Turkey Group", href: collectionHref("turkey-group") },
        { label: "Customised Tour", href: "/custom-package?trip=Turkey" },
        { label: "All Turkey Packages", href: "/packages/turkey" },
      ],
    },
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
