// Two-tone menu icons: the main shape in the brand red, details in gold.
// Drawn on a 32×32 grid so they line up as a set.

type IconProps = { className?: string };

const RED = "var(--color-brand)";
const GOLD = "var(--color-amber)";
const SOFT = "color-mix(in srgb, var(--color-brand) 22%, white)";

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      {children}
    </svg>
  );
}

export function KaabaIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 10 16 5l12 5-12 5z" fill={SOFT} />
      <path d="M4 10v13l12 5V15z" fill={RED} />
      <path d="M28 10v13l-12 5V15z" fill={RED} opacity=".8" />
      <path d="M4 13.5 16 18.5l12-5v2.6l-12 5-12-5z" fill={GOLD} />
      <path d="M12.5 21.2v4.4l3 1.2v-4.4z" fill={GOLD} />
    </Svg>
  );
}

export function MosqueIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 6c-.6 2.4-6.5 4.3-6.5 9.5h13C22.5 10.3 16.6 8.4 16 6z" fill={GOLD} />
      <rect x="8" y="15" width="16" height="13" rx="1" fill={RED} />
      <path d="M13.5 28v-5a2.5 2.5 0 0 1 5 0v5z" fill={SOFT} />
      <rect x="3" y="10" width="3.2" height="18" rx="1" fill={RED} opacity=".85" />
      <path d="M4.6 5.5 6.2 10H3z" fill={GOLD} />
      <rect x="25.8" y="10" width="3.2" height="18" rx="1" fill={RED} opacity=".85" />
      <path d="M27.4 5.5 29 10h-3.2z" fill={GOLD} />
    </Svg>
  );
}

/** Iraq: a shrine with a golden dome and twin minarets (Karbala, Najaf). */
export function ShrineIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <ellipse cx="16" cy="15" rx="6.5" ry="7.5" fill={GOLD} />
      <rect x="15.4" y="4" width="1.2" height="4" fill={GOLD} />
      <rect x="8" y="17" width="16" height="11" rx="1" fill={RED} />
      <path d="M13.8 28v-4.5a2.2 2.2 0 0 1 4.4 0V28z" fill={SOFT} />
      <rect x="3" y="7" width="3" height="21" rx="1" fill={GOLD} opacity=".9" />
      <rect x="26" y="7" width="3" height="21" rx="1" fill={GOLD} opacity=".9" />
      <rect x="2.4" y="12" width="4.2" height="1.6" rx=".6" fill={RED} />
      <rect x="25.4" y="12" width="4.2" height="1.6" rx=".6" fill={RED} />
    </Svg>
  );
}

/** Jordan: the rock-cut Treasury at Petra. */
export function PetraIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 28V6c3-2 7-3 14-3s11 1 14 3v22z" fill={SOFT} />
      <path d="M8 13h16l-8-5z" fill={RED} />
      <rect x="7" y="13" width="18" height="2" fill={GOLD} />
      <rect x="8" y="15" width="2.4" height="13" fill={RED} />
      <rect x="12.5" y="15" width="2.4" height="13" fill={RED} />
      <rect x="17.1" y="15" width="2.4" height="13" fill={RED} />
      <rect x="21.6" y="15" width="2.4" height="13" fill={RED} />
      <rect x="6" y="27" width="20" height="2" rx=".5" fill={GOLD} />
    </Svg>
  );
}

/** Palestine: the Dome of the Rock in Masjid al-Aqsa. */
export function DomeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8.5 15a7.5 7.5 0 0 1 15 0z" fill={GOLD} />
      <rect x="15.4" y="4" width="1.2" height="4" fill={GOLD} />
      <circle cx="16" cy="4" r="1.1" fill={GOLD} />
      <rect x="9.5" y="15" width="13" height="3" fill={RED} opacity=".85" />
      <path d="M3 18h26v10H3z" fill={RED} />
      <path d="M6 28v-5.5a1.6 1.6 0 0 1 3.2 0V28zm5 0v-5.5a1.6 1.6 0 0 1 3.2 0V28zm6.8 0v-5.5a1.6 1.6 0 0 1 3.2 0V28zm5 0v-5.5a1.6 1.6 0 0 1 3.2 0V28z" fill={SOFT} />
    </Svg>
  );
}

/** Turkey: a mosque with pencil minarets, Istanbul style. */
export function TurkeyIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 19a8 6.5 0 0 1 16 0z" fill={RED} />
      <path d="M12 13a4 3.5 0 0 1 8 0z" fill={RED} opacity=".8" />
      <rect x="15.5" y="6" width="1" height="4" fill={GOLD} />
      <rect x="6" y="19" width="20" height="9" rx="1" fill={RED} />
      <path d="M13.8 28v-4a2.2 2.2 0 0 1 4.4 0v4z" fill={SOFT} />
      <rect x="2.5" y="9" width="2.2" height="19" fill={GOLD} />
      <path d="M3.6 3 4.9 9H2.3z" fill={GOLD} />
      <rect x="27.3" y="9" width="2.2" height="19" fill={GOLD} />
      <path d="M28.4 3 29.7 9h-2.6z" fill={GOLD} />
    </Svg>
  );
}

/** Holidays: a beach umbrella. */
export function HolidayIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 15C4.5 8 10 4 16.5 4S28 8.5 29.5 15c-2-1.6-4.3-1.6-6.3 0-2-1.6-4.6-1.6-6.6 0-2-1.6-4.6-1.6-6.6 0-2-1.6-5-1.6-7 0z" fill={RED} />
      <path d="M16.5 4c-3.3 2.5-4.6 6.6-4.6 11 1.6-1.3 3.2-1.4 4.7-.4 1.5-1 3.1-.9 4.6.4 0-4.4-1.4-8.5-4.7-11z" fill={GOLD} />
      <path d="m16 15 3.4 12.5" stroke={RED} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 28c4-2.5 9-3 13-3s9 .5 13 3z" fill={SOFT} />
    </Svg>
  );
}

/** Customize: a trip plan on a clipboard with a pen. */
export function CustomIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="5" width="18" height="24" rx="2.5" fill={SOFT} />
      <rect x="10" y="3" width="8" height="4.5" rx="1.5" fill={RED} />
      <rect x="8.5" y="12" width="11" height="2" rx="1" fill={RED} />
      <rect x="8.5" y="16.5" width="8" height="2" rx="1" fill={RED} opacity=".75" />
      <rect x="8.5" y="21" width="6" height="2" rx="1" fill={RED} opacity=".55" />
      <path d="m26.5 12.5 2 2-9 9-3 1 1-3z" fill={GOLD} />
      <path d="m26.5 12.5 2 2 1-1a1.4 1.4 0 0 0-2-2z" fill={RED} />
    </Svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="16" cy="16" r="13" fill={SOFT} />
      <circle cx="16" cy="16" r="10" fill={RED} />
      <circle cx="16" cy="11" r="1.7" fill="white" />
      <rect x="14.5" y="14.5" width="3" height="8.5" rx="1.5" fill="white" />
    </Svg>
  );
}

export function ContactIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="7" width="26" height="19" rx="3" fill={SOFT} />
      <path d="M11.2 9.5c.6 0 1 .4 1.2.9l.9 2.4c.2.5 0 1-.3 1.4l-1 1c.9 1.9 2.4 3.4 4.3 4.3l1-1c.4-.4.9-.5 1.4-.3l2.4.9c.5.2.9.7.9 1.2v2.4c0 .8-.6 1.4-1.4 1.4C13.8 24.1 7.9 18.2 7.9 11.4c0-.8.6-1.4 1.4-1.4z" fill={RED} />
      <circle cx="24" cy="11" r="2.4" fill={GOLD} />
    </Svg>
  );
}

export const navIcons = {
  kaaba: KaabaIcon,
  mosque: MosqueIcon,
  shrine: ShrineIcon,
  petra: PetraIcon,
  dome: DomeIcon,
  turkey: TurkeyIcon,
  holiday: HolidayIcon,
  custom: CustomIcon,
  info: InfoIcon,
  contact: ContactIcon,
} as const;

export type NavIconName = keyof typeof navIcons;
