import { config } from "@/lib/config";
import { addDays, toDateInputValue } from "@/lib/dates";

/** Service hours, in whole hours. Collection and return are booked inside these. */
const HOURS = Array.from({ length: 13 }, (_, index) => index + 9); // 09:00 – 21:00

function label(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
}

/**
 * The persistent "when do you need it" widget. A plain GET form so it works
 * without JavaScript and every search is a shareable URL.
 */
export function SearchWidget({
  defaults,
  compact = false,
}: {
  defaults?: { start?: string; end?: string; startHour?: string; endHour?: string };
  compact?: boolean;
}) {
  const start = defaults?.start ?? toDateInputValue(addDays(new Date(), 1));
  const end = defaults?.end ?? toDateInputValue(addDays(new Date(), 1 + config.minRentalDays));

  return (
    <form
      method="get"
      action="/vehicles"
      className={`grid gap-3 ${compact ? "sm:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-5"}`}
    >
      <div className={compact ? "" : "sm:col-span-1"}>
        <label className="label" htmlFor="start">
          Pickup
        </label>
        <input
          id="start"
          name="start"
          type="date"
          className="input"
          min={toDateInputValue(new Date())}
          defaultValue={start}
        />
      </div>
      <div>
        <label className="label" htmlFor="startHour">
          Time
        </label>
        <select
          id="startHour"
          name="startHour"
          className="input"
          defaultValue={defaults?.startHour ?? "9"}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {label(hour)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="end">
          Return
        </label>
        <input
          id="end"
          name="end"
          type="date"
          className="input"
          min={toDateInputValue(addDays(new Date(), config.minRentalDays))}
          defaultValue={end}
        />
      </div>
      <div>
        <label className="label" htmlFor="endHour">
          Time
        </label>
        <select id="endHour" name="endHour" className="input" defaultValue={defaults?.endHour ?? "9"}>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {label(hour)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" className="btn-primary w-full">
          Check availability
        </button>
      </div>
    </form>
  );
}
