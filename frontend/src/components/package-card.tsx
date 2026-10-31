import { formatDay } from "@dilruba/shared/ops";
import Link from "next/link";
import { ArrowLeftRight, CalendarDays } from "lucide-react";
import { formatPrice, packageHref, type TravelPackage } from "@/lib/packages";
import { SmartImage } from "./smart-image";

// Tall rounded photo card with a route line underneath, following the reference design.
export function PackageCard({ pkg, className = "" }: { pkg: TravelPackage; className?: string }) {
  const price = formatPrice(pkg.startingPrice);

  return (
    <Link href={packageHref(pkg)} className={`group block ${className}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] bg-ink">
        <SmartImage
          src={pkg.image}
          alt={pkg.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 80vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        {pkg.tier && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink">
            {pkg.tier}
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          <CalendarDays className="size-3.5" aria-hidden />
          {pkg.days} Days / {pkg.nights} Nights
        </span>
      </div>
      <div className="px-1 pt-4 text-center">
        <p className="flex items-center justify-center gap-3 font-display text-lg font-medium text-ink">
          <span>{pkg.route[0]}</span>
          <ArrowLeftRight className="size-4 text-brand" aria-hidden />
          <span>{pkg.route[1]}</span>
        </p>
        {pkg.departures?.[0] && <p className="mt-2 text-sm font-semibold text-brand">Departure: {formatDay(pkg.departures[0].startDate)}</p>}
        <h3 className="mt-1 line-clamp-1 text-sm text-muted">{pkg.title}</h3>
        <p className="mt-1.5 text-sm">
          {price ? (
            <>
              <span className="text-muted">From </span>
              <span className="font-semibold text-ink">{price}</span>
              <span className="text-muted"> / person</span>
            </>
          ) : (
            <span className="font-semibold text-brand">Get today&apos;s best price →</span>
          )}
        </p>
      </div>
    </Link>
  );
}
