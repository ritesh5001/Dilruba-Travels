import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/page-hero";
import { QuoteView, QuoteViewSkeleton } from "@/components/quote-view";
import { photo } from "@/lib/images";

// A customer's private quote: the secret link we sent them (?ref=…&t=…) opens it.
export const metadata: Metadata = {
  title: "Your quote",
  robots: { index: false, follow: false },
};

export default function QuotePage() {
  return (
    <>
      <PageHero image={photo("kaaba", 2000)} eyebrow="Your quote" title="Your personalised quote" />
      <div className="container-x py-12 sm:py-16">
        <Suspense fallback={<QuoteViewSkeleton />}>
          <QuoteView />
        </Suspense>
      </div>
    </>
  );
}
