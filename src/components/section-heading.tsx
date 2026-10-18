// "Popular destination" style heading from the reference: bold lead word, muted rest.
export function SectionHeading({
  strong,
  soft,
  intro,
  center,
  as: Tag = "h2",
}: {
  strong: string;
  soft?: string;
  intro?: string;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Tag className="text-3xl font-semibold leading-tight sm:text-4xl md:text-[2.75rem]">
        <span className="text-ink">{strong}</span>
        {soft && <span className="text-ink/45"> {soft}</span>}
      </Tag>
      {intro && <p className="mt-3 text-base text-muted sm:text-lg">{intro}</p>}
    </div>
  );
}
