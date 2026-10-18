import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${site.brand} home`} className="inline-flex shrink-0 items-center">
      <Image
        src="/brand/logo.png"
        alt={site.brand}
        width={1200}
        height={320}
        priority
        className={className}
      />
    </Link>
  );
}
