import { Plus } from "lucide-react";
import type { Faq } from "@/lib/packages";

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-[1.75rem] border border-line bg-white">
      {faqs.map((f) => (
        <details key={f.q} className="group px-5 sm:px-7">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-display text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line transition-transform group-open:rotate-45 group-open:border-ink group-open:bg-ink group-open:text-white">
              <Plus className="size-4" aria-hidden />
            </span>
          </summary>
          <p className="pb-5 pr-12 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
