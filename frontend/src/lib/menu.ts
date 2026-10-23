import type { CategorySlug, TravelPackage } from "@dilruba/shared/catalog";
import type { NavIconName } from "@/components/nav-icons";
import { packageHref } from "./packages";

// The site's main menu. Destination items list their packages in a dropdown, so a new package
// added in the admin panel appears in the menu too.

export type MenuLink = { label: string; href: string };
export type MenuItem = MenuLink & { icon: NavIconName; children?: MenuLink[] };

const destinations: { label: string; category: CategorySlug; icon: NavIconName; all: string }[] = [
  { label: "Hajj", category: "hajj", icon: "kaaba", all: "All Hajj packages" },
  { label: "Umrah", category: "umrah", icon: "mosque", all: "All Umrah packages" },
  { label: "Iraq", category: "iraq", icon: "shrine", all: "All Iraq ziyarat" },
  { label: "Jordan", category: "jordan", icon: "petra", all: "All Jordan tours" },
  { label: "Palestine", category: "palestine", icon: "dome", all: "All Al-Aqsa tours" },
  { label: "Turkey", category: "turkey", icon: "turkey", all: "All Turkey tours" },
];

const MAX_PACKAGES = 6;

export function buildMenu(packages: TravelPackage[]): MenuItem[] {
  const destinationItems = destinations.map<MenuItem>((d) => {
    const href = `/packages/${d.category}`;
    const list = packages.filter((p) => p.category === d.category);
    // A dropdown only helps when there's a choice to make.
    if (list.length < 2) return { label: d.label, href, icon: d.icon };
    return {
      label: d.label,
      href,
      icon: d.icon,
      children: [...list.slice(0, MAX_PACKAGES).map((p) => ({ label: p.title, href: packageHref(p) })), { label: d.all, href }],
    };
  });

  return [
    ...destinationItems,
    {
      label: "Holidays",
      href: "/packages",
      icon: "holiday",
      children: [
        { label: "Asia holidays", href: "/packages/asia" },
        { label: "India holidays", href: "/packages/domestic" },
        { label: "All packages", href: "/packages" },
      ],
    },
    { label: "About", href: "/about", icon: "info" },
    { label: "Contact", href: "/contact", icon: "contact" },
  ];
}
