"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Horizontal scroll-snap row with the reference's round arrow buttons.
export function Carousel({ heading, children }: { heading: React.ReactNode; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        {heading}
        <div className="hidden shrink-0 gap-3 sm:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Previous"
            className="inline-flex size-12 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Next"
            className="inline-flex size-12 items-center justify-center rounded-full border border-ink text-ink transition-colors hover:bg-ink hover:text-white"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
      <div
        ref={track}
        className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6"
      >
        {children}
      </div>
    </div>
  );
}
