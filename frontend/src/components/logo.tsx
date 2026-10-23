import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

/** The round Dilruba badge. Size it with a height class; it's square. */
export function Logo({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${site.brand} home`} className="inline-flex shrink-0 items-center">
      <Image src="/brand/logo-badge.webp" alt={site.brand} width={512} height={512} priority className={`aspect-square ${className}`} />
    </Link>
  );
}
