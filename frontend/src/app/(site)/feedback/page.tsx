import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/page-hero";
import { FeedbackForm } from "@/components/feedback-form";
import { photo } from "@/lib/images";

// After the trip: rate it from the link in the thank-you email.
export const metadata: Metadata = {
  title: "Rate your trip",
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return (
    <>
      <PageHero image={photo("madinah", 2000)} eyebrow="Your feedback" title="How was your journey?" />
      <div className="container-x py-12 sm:py-16">
        <Suspense fallback={<div className="mx-auto h-80 max-w-xl animate-pulse rounded-[1.75rem] bg-sand" aria-busy="true" />}>
          <FeedbackForm />
        </Suspense>
      </div>
    </>
  );
}
