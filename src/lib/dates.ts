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

/** `2026-09-17T10:00` for <input type="datetime-local"> defaults. */
export function toLocalInputValue(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`;
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
