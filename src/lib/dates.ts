import { config } from "./config";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: config.timezone,
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: config.timezone,
});

export function formatDateTime(value: Date | string) {
  return dateTime.format(new Date(value));
}

export function formatDate(value: Date | string) {
  return dateOnly.format(new Date(value));
}

/**
 * How far ahead of UTC `timeZone` is at this instant, in milliseconds.
 * Derived from Intl rather than a table, so DST is handled for free.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const at: Record<string, number> = {};
  for (const part of parts) if (part.type !== "literal") at[part.type] = Number(part.value);

  const wallClockAsUtc = Date.UTC(at.year, at.month - 1, at.day, at.hour, at.minute, at.second);
  return wallClockAsUtc - instant.getTime();
}

/**
 * Turns a naive wall-clock string from a date or datetime-local input
 * ("2026-09-20" or "2026-09-20T09:00") into the correct instant **in the
 * business timezone**, whatever timezone the server runs in.
 *
 * `new Date("2026-09-20T09:00")` resolves against the server's clock, which is
 * UTC on Vercel and cannot be changed there (TZ is a reserved variable). Left
 * alone, a 9am pickup in New York would be stored as 9am UTC — five hours out.
 */
export function parseBusinessDateTime(naive: string, timeZone = config.timezone): Date {
  const [datePart, timePart = "00:00"] = naive.trim().split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);

  if (!year || !month || !day) return new Date(NaN);

  // Start by pretending the wall clock is UTC, then subtract the zone's offset.
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = asIfUtc - zoneOffsetMs(new Date(asIfUtc), timeZone);

  // Near a DST boundary the offset at the corrected instant can differ from the
  // one we used; recompute once against it.
  const secondPass = asIfUtc - zoneOffsetMs(new Date(firstPass), timeZone);
  return new Date(secondPass);
}

/** `2026-09-17T10:00` in the business timezone, for datetime-local defaults. */
export function toLocalInputValue(value: Date, timeZone = config.timezone) {
  const offset = zoneOffsetMs(value, timeZone);
  const shifted = new Date(value.getTime() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}

export function toDateInputValue(value: Date) {
  return toLocalInputValue(value).slice(0, 10);
}

export function startOfDay(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(value: Date, days: number) {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}
