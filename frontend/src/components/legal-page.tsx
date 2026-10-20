import { PageHero } from "./page-hero";
import { photo } from "@/lib/images";

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <>
      <PageHero
        image={photo("flight", 2000)}
        title={title}
        crumbs={[{ href: "/", label: "Home" }, { label: title }]}
      />
      <article className="container-x max-w-3xl py-14 sm:py-20">
        <p className="text-lg text-muted">{intro}</p>
        {sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="text-2xl font-semibold">{s.heading}</h2>
            {s.body.map((para) => (
              <p key={para} className="mt-3 leading-relaxed text-muted">
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>
    </>
  );
}
