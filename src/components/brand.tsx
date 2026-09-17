import Link from "next/link";
import { config } from "@/lib/config";

/**
 * The Pops Rentals badge: black disc, white ring, an overlapping serif P and R.
 *
 * This is a vector stand-in for the supplied artwork so the app ships with the
 * right mark at any size. To use the original file instead, drop it at
 * `public/logo.png` and swap the <svg> below for:
 *   <Image src="/logo.png" alt="" width={size} height={size} className="rounded-full" />
 */
export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${config.businessName} logo`}
    >
      {/* The disc stays near-black in every theme — it is the logo, not chrome. */}
      <circle cx="50" cy="50" r="50" fill="#050806" />
      <circle
        cx="50"
        cy="50"
        r="43"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeDasharray="230 40"
        strokeLinecap="round"
        transform="rotate(115 50 50)"
      />
      {/* The two letters overlap, P behind in white, R in front in green. */}
      <text
        x="43"
        y="70"
        textAnchor="middle"
        fill="white"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="58"
      >
        P
      </text>
      <text
        x="55"
        y="70"
        textAnchor="middle"
        fill="var(--color-brand-dark)"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="58"
      >
        R
      </text>
    </svg>
  );
}

/** Mark plus wordmark, used in the site and admin headers. */
export function BrandLockup({
  href = "/",
  showName = true,
  size = 34,
}: {
  href?: string;
  showName?: boolean;
  size?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 font-semibold tracking-tight"
      aria-label={config.businessName}
    >
      <BrandMark size={size} className="rounded-full transition-shadow group-hover:shadow-(--shadow-glow)" />
      <span className={showName ? "" : "hidden sm:inline"}>{config.businessName}</span>
    </Link>
  );
}
