import type { Prisma, Vehicle } from "@prisma/client";
import { prisma } from "./prisma";
import { config, stripeEnabled } from "./config";

export class BookingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "BookingError";
  }
}

type Db = Prisma.TransactionClient | typeof prisma;

const MS_PER_DAY = 86_400_000;

/** Billable days: any started day counts, never fewer than the configured minimum. */
export function rentalDays(startAt: Date, endAt: Date): number {
  const days = Math.ceil((endAt.getTime() - startAt.getTime()) / MS_PER_DAY);
  return Math.max(days, config.minRentalDays);
}

export function rentalHours(startAt: Date, endAt: Date): number {
  return Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / 3_600_000));
}

export type Quote = {
  days: number;
  hours: number;
  unitLabel: string;
  subtotal: number;
  /** Long-hire saving, already subtracted from `total`. Zero for short hires. */
  discount: number;
  discountLabel: string | null;
  total: number;
  deposit: number;
  balanceDue: number;
  /** Refundable hold taken at collection, on top of the balance. */
  securityDeposit: number;
  /** What the customer actually hands over at collection. */
  dueAtCollection: number;
  currency: string;
};

/** Long-hire discount tiers (PRD §8 pricing rules). */
export function discountFor(days: number): { percent: number; label: string | null } {
  if (days >= 28 && config.monthlyDiscountPercent > 0) {
    return { percent: config.monthlyDiscountPercent, label: "Monthly rate" };
  }
  if (days >= 7 && config.weeklyDiscountPercent > 0) {
    return { percent: config.weeklyDiscountPercent, label: "Weekly rate" };
  }
  return { percent: 0, label: null };
}

export function quoteSelfDrive(
  vehicle: Pick<Vehicle, "dailyRateSelfDrive" | "securityDeposit">,
  startAt: Date,
  endAt: Date,
): Quote {
  const days = rentalDays(startAt, endAt);
  const subtotal = days * vehicle.dailyRateSelfDrive;

  const { percent, label } = discountFor(days);
  const discount = Math.round((subtotal * percent) / 100);
  const total = subtotal - discount;

  // No payment provider means nothing is collected up front, so the whole
  // rental is due on the day. Charging a "deposit" that is never taken would
  // understate what the customer is told to bring.
  const deposit = stripeEnabled ? Math.round((total * config.selfDriveDepositPercent) / 100) : 0;
  const balanceDue = total - deposit;
  const securityDeposit = vehicle.securityDeposit ?? 0;

  return {
    days,
    hours: rentalHours(startAt, endAt),
    unitLabel: `${days} day${days === 1 ? "" : "s"}`,
    subtotal,
    discount,
    discountLabel: label ? `${label} · ${percent}% off` : null,
    total,
    deposit,
    balanceDue,
    securityDeposit,
    // The hold is refundable, but it is still money handed over on the day, so
    // it belongs in the figure the customer is told to bring.
    dueAtCollection: balanceDue + securityDeposit,
    currency: config.currency,
  };
}

/**
 * Chauffeur pricing is an estimate only — the admin confirms the final price
 * (PRD §14, "chauffeur quote complexity"). Day rate wins once the trip runs
 * long enough that it is cheaper than stacking hours.
 */
export function quoteChauffeur(
  vehicle: Pick<Vehicle, "chauffeurHourlyRate" | "chauffeurDayRate" | "dailyRateSelfDrive">,
  startAt: Date,
  endAt: Date,
): Quote {
  const hours = rentalHours(startAt, endAt);
  const days = rentalDays(startAt, endAt);
  const hourly = vehicle.chauffeurHourlyRate ?? 0;
  const dayRate = vehicle.chauffeurDayRate ?? vehicle.dailyRateSelfDrive * 2;

  const hourlyTotal = hourly > 0 ? hours * hourly : Number.POSITIVE_INFINITY;
  const dayTotal = days * dayRate;
  const useHourly = hourlyTotal < dayTotal;
  const total = useHourly ? hourlyTotal : dayTotal;

  return {
    days,
    hours,
    unitLabel: useHourly
      ? `${hours} hour${hours === 1 ? "" : "s"}`
      : `${days} day${days === 1 ? "" : "s"}`,
    subtotal: total,
    discount: 0,
    discountLabel: null,
    total,
    // Chauffeur trips are quoted and confirmed by an admin before any charge,
    // and the car never leaves our driver, so no security hold is taken.
    deposit: 0,
    balanceDue: total,
    securityDeposit: 0,
    dueAtCollection: total,
    currency: config.currency,
  };
}

/** Shape checks that do not need the database. Throws BookingError. */
export function assertValidRange(startAt: Date, endAt: Date, type: "self_drive" | "chauffeur") {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new BookingError("invalid_dates", "Please provide valid pickup and return dates.");
  }
  if (endAt <= startAt) {
    throw new BookingError("invalid_range", "The return date must be after the pickup date.");
  }
  if (startAt.getTime() < Date.now() - 60_000) {
    throw new BookingError("in_past", "Pickup cannot be in the past.");
  }
  if (startAt.getTime() > Date.now() + config.maxAdvanceBookingDays * MS_PER_DAY) {
    throw new BookingError(
      "too_far_ahead",
      `Bookings can be made up to ${config.maxAdvanceBookingDays} days in advance.`,
    );
  }
  if (type === "self_drive") {
    const days = Math.ceil((endAt.getTime() - startAt.getTime()) / MS_PER_DAY);
    if (days < config.minRentalDays) {
      throw new BookingError(
        "below_minimum",
        `The minimum rental is ${config.minRentalDays} day${config.minRentalDays === 1 ? "" : "s"}.`,
      );
    }
  }
}

function withBuffer(startAt: Date, endAt: Date) {
  const buffer = config.bookingBufferMinutes * 60_000;
  return {
    from: new Date(startAt.getTime() - buffer),
    to: new Date(endAt.getTime() + buffer),
  };
}

export type Conflict =
  | { kind: "status"; detail: string }
  | { kind: "reservation"; detail: string; startAt: Date; endAt: Date }
  | { kind: "block"; detail: string; startAt: Date; endAt: Date };

/**
 * Why a vehicle cannot be booked for a window, or null if it can (PRD R1–R3).
 * Run inside the same transaction as the write so the check and the insert
 * cannot be separated; the DB exclusion constraint is the final backstop.
 */
export async function findConflict(
  db: Db,
  vehicleId: string,
  startAt: Date,
  endAt: Date,
  options: { excludeReservationId?: string; excludeBlockId?: string } = {},
): Promise<Conflict | null> {
  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { status: true },
  });
  if (!vehicle) return { kind: "status", detail: "This vehicle is no longer listed." };
  if (vehicle.status === "out_of_service") {
    return { kind: "status", detail: "This vehicle is out of service." };
  }

  const { from, to } = withBuffer(startAt, endAt);

  const reservation = await db.reservation.findFirst({
    where: {
      vehicleId,
      holdsAvailability: true,
      status: { not: "cancelled" },
      id: options.excludeReservationId ? { not: options.excludeReservationId } : undefined,
      startAt: { lt: to },
      endAt: { gt: from },
    },
    select: { startAt: true, endAt: true, reference: true },
    orderBy: { startAt: "asc" },
  });
  if (reservation) {
    return {
      kind: "reservation",
      detail: "Those dates are already booked for this vehicle.",
      startAt: reservation.startAt,
      endAt: reservation.endAt,
    };
  }

  // Maintenance blocks apply with no buffer — the exact window is unavailable.
  const block = await db.vehicleBlock.findFirst({
    where: {
      vehicleId,
      id: options.excludeBlockId ? { not: options.excludeBlockId } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { startAt: true, endAt: true, reason: true },
    orderBy: { startAt: "asc" },
  });
  if (block) {
    return {
      kind: "block",
      detail:
        block.reason === "maintenance"
          ? "This vehicle is scheduled for maintenance during those dates."
          : "This vehicle is unavailable during those dates.",
      startAt: block.startAt,
      endAt: block.endAt,
    };
  }

  return null;
}

export async function isAvailable(vehicleId: string, startAt: Date, endAt: Date) {
  return (await findConflict(prisma, vehicleId, startAt, endAt)) === null;
}

/** Vehicle ids that are free for the whole window — used to filter inventory. */
export async function availableVehicleIds(startAt: Date, endAt: Date): Promise<Set<string>> {
  const { from, to } = withBuffer(startAt, endAt);

  const [vehicles, reservations, blocks] = await Promise.all([
    prisma.vehicle.findMany({
      where: { status: { not: "out_of_service" } },
      select: { id: true },
    }),
    prisma.reservation.findMany({
      where: {
        holdsAvailability: true,
        status: { not: "cancelled" },
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { vehicleId: true },
    }),
    prisma.vehicleBlock.findMany({
      where: { startAt: { lt: endAt }, endAt: { gt: startAt } },
      select: { vehicleId: true },
    }),
  ]);

  const taken = new Set([
    ...reservations.map((r) => r.vehicleId),
    ...blocks.map((b) => b.vehicleId),
  ]);
  return new Set(vehicles.map((v) => v.id).filter((id) => !taken.has(id)));
}

/** Busy windows for one vehicle — drives the date picker and admin calendar. */
export async function vehicleBusyWindows(vehicleId: string, from: Date, to: Date) {
  const [reservations, blocks] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        vehicleId,
        holdsAvailability: true,
        status: { not: "cancelled" },
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.vehicleBlock.findMany({
      where: { vehicleId, startAt: { lt: to }, endAt: { gt: from } },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return [
    ...reservations.map((r) => ({ ...r, kind: "reservation" as const })),
    ...blocks.map((b) => ({ ...b, kind: "block" as const })),
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Postgres raises 23P01 when an exclusion constraint rejects a write. */
export function isOverlapViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "23P01" || code === "P2010";
}
