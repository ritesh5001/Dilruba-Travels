import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SmartImage } from "./smart-image";

type Crumb = { href?: string; label: string };

// Shorter hero used by inner pages, sharing the home hero's rounded-image look.
export function PageHero({
  image,
  title,
  subtitle,
  eyebrow,
  crumbs,
  children,
}: {
  image: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <section className="px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="relative isolate overflow-hidden rounded-4xl bg-ink sm:rounded-5xl">
        <SmartImage src={image} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />
        <div className="container-x pb-12 pt-12 text-white sm:pb-16 sm:pt-20">
          {crumbs && (
            <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-white/75">
              {crumbs.map((c, i) => (
                <span key={c.label} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-white">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-white">
                      {c.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}
          {eyebrow && <span className="eyebrow bg-white text-ink">{eyebrow}</span>}
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
