import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/page-hero";
import { BookingStatus, BookingStatusSkeleton } from "@/components/booking-status";
import { photo } from "@/lib/images";

// A customer's private booking page: the secret link from their email (?t=…) opens it.
export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export default function BookingPage() {
  return (
    <>
      <PageHero image={photo("flight", 2000)} eyebrow="Your booking" title="Booking details & payment" />
      <div className="container-x py-12 sm:py-16">
        {/* The booking is read in the browser from the URL, so the page shell prerenders. */}
        <Suspense fallback={<BookingStatusSkeleton />}>
          <BookingStatus />
        </Suspense>
      </div>
    </>
  );
}
