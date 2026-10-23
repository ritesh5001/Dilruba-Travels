import { Star } from "lucide-react";
import type { PublicReview } from "@dilruba/shared/ops";
import { getReviews } from "@/lib/catalog";

// "Real stories": an auto-scrolling row of review cards (pauses on hover). Reviews are managed
// in the admin panel; the section hides itself until at least one is published.

const MIN_CARDS = 6;

function initials(name: string) {
  const parts = name.replace(/\./g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

function Card({ r, hidden }: { r: PublicReview; hidden?: boolean }) {
  return (
    <li className="w-[260px] shrink-0 sm:w-[320px]" aria-hidden={hidden || undefined}>
      <figure className="flex h-full flex-col rounded-3xl border border-line bg-white p-5 shadow-lg shadow-black/5 sm:p-6">
        <div className="flex gap-0.5 text-amber" aria-label={`${r.rating} out of 5 stars`} role="img">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`size-4 ${n <= r.rating ? "" : "text-line"}`} fill="currentColor" aria-hidden />
          ))}
        </div>
        <blockquote className="mt-3 flex-1 text-[15px] italic leading-relaxed text-ink/80">“{r.body}”</blockquote>
        <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white" aria-hidden>
            {initials(r.name)}
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-ink">{r.name}</strong>
            <span className="block truncate text-xs text-muted">{[r.location, r.trip].filter(Boolean).join(" | ")}</span>
          </span>
        </figcaption>
      </figure>
    </li>
  );
}

export async function Reviews() {
  const reviews = await getReviews();
  if (reviews.length === 0) return null;

  // Repeat a short list so the strip is always wider than the screen, then render it twice:
  // the track slides by one copy and loops without a jump.
  const row: PublicReview[] = [];
  while (row.length < MIN_CARDS) row.push(...reviews);
  const pace = Math.max(30, row.length * 7);

  return (
    <section aria-labelledby="reviews-heading" className="border-y border-line bg-sand/60 py-12 sm:py-16">
      <div className="px-4 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Real stories</span>
        <h2 id="reviews-heading" className="mt-2 text-3xl font-semibold sm:text-4xl">
          Pilgrims and travellers who trust Dilruba
        </h2>
      </div>
      <div className="group mt-8 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] sm:mt-10">
        <div
          className="flex w-max animate-[marquee_var(--pace)_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none motion-reduce:overflow-x-auto"
          style={{ "--pace": `${pace}s` } as React.CSSProperties}
        >
          <ul className="flex gap-5 pr-5 sm:gap-7 sm:pr-7">
            {row.map((r, i) => (
              <Card key={`a${i}`} r={r} hidden={i >= reviews.length} />
            ))}
          </ul>
          <ul className="flex gap-5 pr-5 motion-reduce:hidden sm:gap-7 sm:pr-7" aria-hidden>
            {row.map((r, i) => (
              <Card key={`b${i}`} r={r} hidden />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
