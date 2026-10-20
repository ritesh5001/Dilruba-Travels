"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { BadgeCheck, Clock, X } from "lucide-react";
import { categories, serviceFor, type CategorySlug } from "@/lib/packages";
import { photo } from "@/lib/images";
import { EnquiryForm } from "./enquiry-form";
import { SmartImage } from "./smart-image";

// When the popup opens by itself. Visitors can always open it with openQuotePopup().
const AUTO_OPEN_AFTER_MS = 25_000;
const AUTO_OPEN_SCROLL_DEPTH = 0.55;
const SNOOZE_DAYS = 3; // after closing it, don't auto-open again for this long
const STORAGE_KEY = "dt_quote_popup";
const OPEN_EVENT = "dt:open-quote";

// Pages that already have a quote/booking form, where the popup would get in the way.
const NO_AUTO_OPEN = ["/contact", "/book/", "/booking"];

/** Opens the quote popup from anywhere, e.g. a "Get a free quote" button. */
export function openQuotePopup() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function readState(): { snoozedUntil?: number; submitted?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeState(state: { snoozedUntil?: number; submitted?: boolean }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...state }));
  } catch {
    // Private mode or storage blocked: the popup may simply show again next visit.
  }
}

export function QuotePopup() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // On a category or package page, pre-select that service.
  const category = categories.find((c) => pathname.startsWith(`/packages/${c.slug}`))?.slug as CategorySlug | undefined;
  const defaultService = category ? serviceFor[category] : "Umrah";

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  // Manual opening, from any page.
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [open]);

  // Automatic opening: after a while on the site, a good scroll, or (desktop) heading for the tab bar.
  useEffect(() => {
    if (NO_AUTO_OPEN.some((p) => pathname.startsWith(p))) return;
    const state = readState();
    if (state.submitted || (state.snoozedUntil ?? 0) > Date.now()) return;

    let done = false;
    const trigger = () => {
      if (done) return;
      // Don't interrupt someone who is typing in another form.
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      done = true;
      cleanup();
      open();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= AUTO_OPEN_SCROLL_DEPTH) trigger();
    };
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) trigger();
    };
    const timer = window.setTimeout(trigger, AUTO_OPEN_AFTER_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onMouseOut);
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    }
    return cleanup;
  }, [pathname, open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="quote-popup-title"
      onClose={() => {
        document.documentElement.style.overflow = "";
        if (!readState().submitted) writeState({ snoozedUntil: Date.now() + SNOOZE_DAYS * 864e5 });
      }}
      // A click on the dimmed backdrop lands on the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-[1.75rem] bg-white p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="grid md:grid-cols-[240px_1fr]">
        <div className="relative hidden overflow-hidden bg-ink md:block">
          <SmartImage src={photo("kaabaAerial", 800)} alt="" fill sizes="240px" className="object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <ul className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-sm text-white">
            <li className="flex gap-2"><BadgeCheck className="size-4 shrink-0 text-amber" aria-hidden /> Free, no-obligation quote</li>
            <li className="flex gap-2"><Clock className="size-4 shrink-0 text-amber" aria-hidden /> Reply within one working day</li>
            <li className="flex gap-2"><BadgeCheck className="size-4 shrink-0 text-amber" aria-hidden /> Visa, flights, hotels & guide</li>
          </ul>
        </div>

        <div className="relative p-5 sm:p-7">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-2 text-muted transition-colors hover:bg-sand hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
          <p className="eyebrow">Free quote</p>
          <h2 id="quote-popup-title" className="mt-1 pr-8 text-2xl font-semibold">
            Planning Umrah, Hajj or a holiday?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Tell us what you have in mind and we&apos;ll send today&apos;s best price, or answer any question.
          </p>
          <div className="mt-5">
            <EnquiryForm
              source={`Popup · ${pathname}`}
              defaultService={defaultService}
              onSent={() => writeState({ submitted: true })}
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}
