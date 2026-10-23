import Image from "next/image";

// Airlines, associations and ground partners, as a slowly scrolling strip of logos.
// Logo files live in public/partners (160px tall WebP).

const partners = [
  { name: "IATA", file: "iata", width: 248 },
  { name: "Saudia", file: "saudia", width: 481 },
  { name: "IndiGo", file: "indigo", width: 530 },
  { name: "Air India", file: "air-india", width: 692 },
  { name: "Akasa Air", file: "akasa-air", width: 954 },
  { name: "All India Umrah Tour Organisation (AIUTO)", file: "aiuto", width: 154 },
  { name: "Hussain Mohammed Hijazi Group", file: "hussain-hijazi", width: 160 },
  { name: "Turkey Tourism", file: "turkey", width: 209 },
  { name: "Abu Sarhad Transport", file: "abu-sarhad", width: 229 },
  { name: "Amazing Thailand", file: "amazing-thailand", width: 313 },
];

const HEIGHT = 160;

function Logos({ hidden }: { hidden?: boolean }) {
  return (
    <ul
      className={`flex shrink-0 items-center gap-12 pr-12 sm:gap-16 sm:pr-16 motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-8 motion-reduce:pr-0 ${hidden ? "motion-reduce:hidden" : ""}`}
      aria-hidden={hidden || undefined}
    >
      {partners.map((p) => (
        <li key={p.file} className="shrink-0">
          <Image
            src={`/partners/${p.file}.webp`}
            alt={hidden ? "" : p.name}
            width={p.width}
            height={HEIGHT}
            // Wordmarks are wide, emblems are square: cap both so they look the same size.
            className="h-12 w-auto max-w-[150px] object-contain opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:h-16 sm:max-w-[190px]"
          />
        </li>
      ))}
    </ul>
  );
}

export function Partners() {
  return (
    <section aria-labelledby="partners-heading" className="py-10 sm:py-14">
      <h2 id="partners-heading" className="text-center text-3xl font-semibold sm:text-4xl">
        Our Partners
      </h2>
      {/* Two copies side by side; the track slides by one copy's width and repeats seamlessly. */}
      <div className="group relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] sm:mt-10">
        <div className="flex w-max animate-[marquee_45s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center">
          <Logos />
          <Logos hidden />
        </div>
      </div>
    </section>
  );
}
