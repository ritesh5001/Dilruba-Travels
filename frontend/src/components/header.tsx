"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu, Phone, X } from "lucide-react";
import { navLinks, site, whatsappLink } from "@/lib/site";
import { Logo } from "./logo";
import { WhatsAppIcon } from "./icons";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/packages") return pathname === "/packages";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavBar({ sticky, onMenu }: { sticky?: boolean; onMenu: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between gap-3">
      <div
        className={`rounded-full bg-white px-4 py-2 ${sticky ? "" : "shadow-lg shadow-black/10"}`}
      >
        <Logo className="h-8 w-auto sm:h-9" />
      </div>

      <nav
        aria-label="Main"
        className={`hidden items-center gap-1 rounded-full p-1.5 lg:flex ${
          sticky ? "bg-sand" : "bg-white/95 shadow-lg shadow-black/10 backdrop-blur"
        }`}
      >
        {navLinks.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-ink text-white"
                  : "text-ink/75 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <a
          href={site.phoneHref}
          className={`hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold sm:inline-flex ${
            sticky ? "border border-line bg-white text-ink" : "bg-white text-ink shadow-lg shadow-black/10"
          }`}
        >
          <Phone className="size-4" aria-hidden />
          <span className="hidden xl:inline">{site.phone}</span>
          <span className="xl:hidden">Call</span>
        </a>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary hidden !py-2.5 text-sm sm:inline-flex"
        >
          <WhatsAppIcon className="size-4" />
          Get Free Quote
        </a>
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="inline-flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-lg shadow-black/10 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 220);
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

  // The header is rendered inside each page's hero, which is its own stacking context
  // (`isolate`), so a fixed bar's z-index there would only rank it within the hero and
  // later positioned content (images, cards) would paint over it. The scrolled bar and the
  // mobile menu therefore render straight into <body>. Both start hidden, so mounting them
  // after hydration changes nothing on first paint.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <>
      {/* Sits inside the hero, like the reference design */}
      <header className="absolute inset-x-0 top-0 z-30 p-3 sm:p-5">
        <NavBar onMenu={() => setOpen(true)} />
      </header>

      {mounted && createPortal(overlays(), document.body)}
    </>
  );

  function overlays() {
    return (
      <>
        {/* Compact bar that slides in once the hero is scrolled past */}
        <div
          aria-hidden={!scrolled}
          inert={!scrolled}
          className={`fixed inset-x-0 top-0 z-40 border-b border-line bg-white/90 px-3 py-2 backdrop-blur-md transition-transform duration-300 sm:px-5 ${
            scrolled ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="mx-auto max-w-7xl">
            <NavBar sticky onMenu={() => setOpen(true)} />
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
          aria-hidden={!open}
          inert={!open}
        >
          <div
            className={`absolute inset-0 bg-ink/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white p-5 shadow-2xl transition-transform duration-300 ${
              open ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between">
              <Logo className="h-9 w-auto" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex size-11 items-center justify-center rounded-full bg-sand"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-lg font-medium ${
                    isActive(pathname, link.href) ? "bg-sand text-brand" : "text-ink hover:bg-sand"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto grid gap-3">
              <a href={site.phoneHref} className="btn btn-outline">
                <Phone className="size-4" aria-hidden /> {site.phone}
              </a>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                <WhatsAppIcon className="size-4" /> Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }
}
