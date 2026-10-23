"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LayoutGrid, Minus, Phone, Plus, X } from "lucide-react";
import type { MenuItem } from "@/lib/menu";
import { site, whatsappLink } from "@/lib/site";
import { Logo } from "./logo";
import { WhatsAppIcon } from "./icons";
import { navIcons } from "./nav-icons";

function isActive(pathname: string, item: MenuItem) {
  if (item.href === "/packages") return pathname === "/packages" || pathname.startsWith("/packages/asia") || pathname.startsWith("/packages/domestic");
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Solid header bar under the top strip: logo, a row of icon-over-label menu items (destinations
 * open a dropdown of their packages) and the quote button. On phones: logo, quote button and a
 * grid button that opens the menu drawer.
 */
export function Header({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // The drawer renders into <body> so nothing on the page can paint over it. It starts closed,
  // so mounting it after hydration changes nothing on first paint.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <header className={`sticky top-0 z-40 border-b bg-white transition-shadow ${scrolled ? "border-line shadow-md shadow-black/5" : "border-transparent"}`}>
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-3 py-2 sm:px-5 lg:py-1.5">
        <Logo className="h-14 w-14 sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem]" />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-stretch">
            {menu.map((item) => (
              <DesktopItem key={item.href + item.label} item={item} active={isActive(pathname, item)} />
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary !px-4 !py-2 text-sm sm:!px-5 sm:!py-2.5"
          >
            <WhatsAppIcon className="size-4" />
            <span className="sm:hidden">Quote</span>
            <span className="hidden sm:inline">Get Free Quote</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="inline-flex size-11 items-center justify-center rounded-xl text-ink hover:bg-sand lg:hidden"
          >
            <LayoutGrid className="size-7" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {mounted && createPortal(<Drawer menu={menu} open={open} onClose={() => setOpen(false)} pathname={pathname} />, document.body)}
    </header>
  );
}

function DesktopItem({ item, active }: { item: MenuItem; active: boolean }) {
  const Icon = navIcons[item.icon];
  const label = (
    <>
      <Icon className="size-8 transition-transform group-hover:-translate-y-0.5" />
      <span className="flex items-center gap-0.5 text-[13px] font-medium xl:text-sm">
        {item.label}
        {item.children && <ChevronDown className="size-3.5 text-muted transition-transform group-hover:rotate-180" aria-hidden />}
      </span>
    </>
  );
  const linkClass = `flex flex-col items-center gap-1 rounded-xl px-2.5 py-2 transition-colors xl:px-3.5 ${active ? "text-brand" : "text-ink hover:text-brand"}`;

  return (
    <li className="group relative">
      <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass}>
        {label}
      </Link>
      {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" aria-hidden />}
      {item.children && (
        // Opens on hover and on keyboard focus within the item.
        <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
          <ul className="overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-xl shadow-black/10">
            {item.children.map((c, i) => (
              <li key={c.href + c.label}>
                <Link
                  href={c.href}
                  className={`block px-4 py-2 text-sm hover:bg-sand hover:text-brand ${i === item.children!.length - 1 ? "mt-1 border-t border-line pt-2.5 font-semibold text-brand" : "text-ink"}`}
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function Drawer({ menu, open, onClose, pathname }: { menu: MenuItem[]; open: boolean; onClose: () => void; pathname: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open} inert={!open}>
      <div className={`absolute inset-0 bg-ink/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-6">
          <Logo className="h-24 w-24" />
          <button type="button" onClick={onClose} aria-label="Close menu" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink">
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Mobile" className="px-3 pb-4">
          <ul>
            {menu.map((item) => {
              const Icon = navIcons[item.icon];
              const active = isActive(pathname, item);
              const isOpen = expanded === item.label;
              return (
                <li key={item.label}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`flex flex-1 items-center gap-3.5 rounded-xl px-2 py-3 text-lg ${active ? "font-semibold text-brand" : "text-ink"}`}
                    >
                      <Icon className="size-9 shrink-0" />
                      {item.label}
                    </Link>
                    {item.children && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : item.label)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Hide" : "Show"} ${item.label} packages`}
                        className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-sand"
                      >
                        {isOpen ? <Minus className="size-5" /> : <Plus className="size-5" />}
                      </button>
                    )}
                  </div>
                  {item.children && isOpen && (
                    <ul className="mb-2 ml-[3.25rem] border-l-2 border-line pl-3">
                      {item.children.map((c) => (
                        <li key={c.href + c.label}>
                          <Link href={c.href} onClick={onClose} className="block py-2 text-[15px] text-ink/80 hover:text-brand">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto grid gap-3 border-t border-line p-5">
          <a href={site.phoneHref} className="btn btn-outline">
            <Phone className="size-4" aria-hidden /> {site.phone}
          </a>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
            <WhatsAppIcon className="size-4" /> Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
