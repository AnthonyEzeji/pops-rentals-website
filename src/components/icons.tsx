/**
 * A small, consistent icon set: 24×24 grid, 1.6 stroke, round caps, no fill.
 * Each one depicts what its card actually says — a calendar for availability,
 * a tag for pricing — rather than a decorative glyph.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Live availability — a calendar with a confirmed day. */
export function CalendarCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4" />
    </svg>
  );
}

/** Clear pricing — a price tag. */
export function TagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 12.5V4.5A1.5 1.5 0 0 1 4.5 3h8l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0L3 12.5Z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}

/** Vetted drivers — a person inside a shield. */
export function ShieldUserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 4.5 6v6c0 4.4 3.1 7.9 7.5 9 4.4-1.1 7.5-4.6 7.5-9V6L12 3Z" />
      <circle cx="12" cy="10.5" r="2.2" />
      <path d="M8.4 16.6a4 4 0 0 1 7.2 0" />
    </svg>
  );
}

/** Maintained between hires — a spanner. */
export function WrenchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15.5 3.5a5 5 0 0 0-5.9 6.6L3.8 15.9a2 2 0 0 0 2.8 2.8l5.8-5.8a5 5 0 0 0 6.6-5.9l-3 3-2.5-2.5 3-3Z" />
    </svg>
  );
}

/** Airport and event ready — a plane. */
export function PlaneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10.5 3.2a1.6 1.6 0 0 1 3 0V9l7.5 4.3v2.2l-7.5-2.2v4.3l2.5 1.8v1.4L12 19.9l-4 1.2v-1.4l2.5-1.8v-4.3L3 15.5v-2.2L10.5 9V3.2Z" />
    </svg>
  );
}

/** Real people on the other end — a conversation. */
export function ChatIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-5.1A7.5 7.5 0 1 1 21 11.5Z" />
      <path d="M9 11h.01M12 11h.01M15 11h.01" />
    </svg>
  );
}

/** Driving licence — a card with a portrait. */
export function LicenceIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <circle cx="8.5" cy="11.5" r="2" />
      <path d="M5.5 16.2a3.4 3.4 0 0 1 6 0M14 10h4M14 13.5h4" />
    </svg>
  );
}

/** Payment card. */
export function CardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h3" />
    </svg>
  );
}

/** Keys — handover at collection. */
export function KeyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="4.5" />
      <path d="M11.2 11.2 20 20M17 17l2-2M14.5 14.5l2-2" />
    </svg>
  );
}

/** A car, for fleet-related cards. */
export function CarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 16.5V19a1 1 0 0 1-1 1H2.5M20 16.5V19a1 1 0 0 0 1 1h.5" />
      <path d="M2.8 16.5h18.4v-4l-1.9-.6-2-4.3a2 2 0 0 0-1.8-1.1H8.5a2 2 0 0 0-1.8 1.1l-2 4.3-1.9.6v4Z" />
      <path d="M4.8 11.9h14.4M7 14.2h.01M17 14.2h.01" />
    </svg>
  );
}
