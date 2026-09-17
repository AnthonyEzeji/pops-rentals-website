import Link from "next/link";
import { addDays, formatDate, startOfDay } from "@/lib/dates";

type Row = {
  vehicle: { id: string; make: string; model: string; plate: string };
  bars: Array<{
    id: string;
    label: string;
    href?: string;
    startAt: Date;
    endAt: Date;
    tone: "booked" | "pending" | "block";
  }>;
};

const TONES = {
  booked: "bg-brand text-brand-ink",
  pending: "bg-amber-300 text-amber-950",
  block: "bg-line-strong text-ink",
} as const;

/**
 * A fourteen-day timeline, one row per vehicle (PRD A4). Rendered on the server
 * as a CSS grid — no calendar library, and it prints cleanly.
 */
export function FleetCalendar({ rows, days = 14, from }: { rows: Row[]; days?: number; from: Date }) {
  const start = startOfDay(from);
  const columns = Array.from({ length: days }, (_, index) => addDays(start, index));
  const dayMs = 86_400_000;

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-225">
        <div
          className="grid border-b border-line bg-canvas text-xs font-medium text-muted"
          style={{ gridTemplateColumns: `180px repeat(${days}, minmax(0, 1fr))` }}
        >
          <div className="px-3 py-2">Vehicle</div>
          {columns.map((day) => (
            <div key={day.toISOString()} className="border-l border-line px-1 py-2 text-center">
              <div>{day.toLocaleDateString("en-GB", { weekday: "narrow" })}</div>
              <div className="text-ink">{day.getDate()}</div>
            </div>
          ))}
        </div>

        {rows.map((row) => (
          <div
            key={row.vehicle.id}
            className="grid items-stretch border-b border-line last:border-0"
            style={{ gridTemplateColumns: `180px repeat(${days}, minmax(0, 1fr))` }}
          >
            <div className="px-3 py-3 text-sm">
              <div className="font-medium">
                {row.vehicle.make} {row.vehicle.model}
              </div>
              <div className="text-xs text-muted">{row.vehicle.plate}</div>
            </div>

            <div className="relative col-span-full col-start-2 min-h-14 py-2">
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
                aria-hidden
              >
                {columns.map((day) => (
                  <div key={day.toISOString()} className="border-l border-line" />
                ))}
              </div>

              {row.bars.map((bar) => {
                const offset = Math.max(
                  0,
                  (startOfDay(bar.startAt).getTime() - start.getTime()) / dayMs,
                );
                const end = Math.min(
                  days,
                  Math.ceil((bar.endAt.getTime() - start.getTime()) / dayMs),
                );
                const span = Math.max(0.5, end - offset);
                if (end <= 0 || offset >= days) return null;

                const content = (
                  <span className="block truncate px-2 py-1 text-xs font-medium">{bar.label}</span>
                );

                return (
                  <div
                    key={bar.id}
                    className={`absolute top-2 h-8 overflow-hidden rounded-md ${TONES[bar.tone]}`}
                    style={{
                      left: `${(offset / days) * 100}%`,
                      width: `calc(${(span / days) * 100}% - 4px)`,
                    }}
                    title={`${bar.label} · ${formatDate(bar.startAt)} – ${formatDate(bar.endAt)}`}
                  >
                    {bar.href ? (
                      <Link href={bar.href} className="block hover:opacity-90">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-line px-3 py-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-300" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-line-strong" /> Maintenance / blocked
        </span>
      </div>
    </div>
  );
}
