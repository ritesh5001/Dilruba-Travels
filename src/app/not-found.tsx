import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { photo } from "@/lib/images";

export default function NotFound() {
  return (
    <>
      <PageHero
        image={photo("petraDay", 2000)}
        eyebrow="404"
        title="This page took a different route"
        subtitle="The page you're looking for doesn't exist or has moved."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-amber">Back to home</Link>
          <Link href="/packages" className="btn btn-white">Browse packages</Link>
        </div>
      </PageHero>
      <div className="py-10" />
    </>
  );
}
