import { config } from "./config";

/** All money in this app is stored as integer minor units (cents). */
export function formatMoney(minorUnits: number, currency = config.currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export function toMinorUnits(major: number | string): number {
  return Math.round(Number(major) * 100);
}

export function toMajorUnits(minorUnits: number): number {
  return minorUnits / 100;
}
