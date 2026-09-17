import type { ReactNode } from "react";
import type { ReservationStatus, VehicleStatus, PaymentStatus } from "@prisma/client";

// Green is reserved for "good, settled" states so the accent carries meaning
// rather than decoration; everything else stays neutral or warning-toned.
const GOOD = "bg-brand-soft text-accent ring-1 ring-brand/40 ring-inset";
const WARN = "bg-warn-soft text-warn ring-1 ring-warn/30 ring-inset";
const BAD = "bg-danger-soft text-danger ring-1 ring-danger/30 ring-inset";
const NEUTRAL = "bg-raised text-muted ring-1 ring-line ring-inset";
const ACTIVE = "bg-brand text-brand-ink";

const RESERVATION_TONE: Record<ReservationStatus, string> = {
  pending: WARN,
  confirmed: GOOD,
  in_progress: ACTIVE,
  completed: NEUTRAL,
  cancelled: BAD,
};

const VEHICLE_TONE: Record<VehicleStatus, string> = {
  available: GOOD,
  reserved: ACTIVE,
  maintenance: WARN,
  out_of_service: BAD,
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  unpaid: NEUTRAL,
  deposit_paid: WARN,
  paid_in_full: GOOD,
  refunded: "bg-info-soft text-info ring-1 ring-info/30 ring-inset",
};

export function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusBadge({
  status,
  kind = "reservation",
}: {
  status: string;
  kind?: "reservation" | "vehicle" | "payment";
}) {
  const tone =
    kind === "vehicle"
      ? VEHICLE_TONE[status as VehicleStatus]
      : kind === "payment"
        ? PAYMENT_TONE[status as PaymentStatus]
        : RESERVATION_TONE[status as ReservationStatus];
  return <span className={`badge ${tone ?? NEUTRAL}`}>{humanize(status)}</span>;
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="font-medium">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const tones = {
    info: "border-line-strong bg-raised text-ink",
    success: "border-brand/40 bg-brand-soft text-accent",
    error: "border-danger/40 bg-danger-soft text-danger",
    warning: "border-warn/40 bg-warn-soft text-warn",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
      {error ? (
        <p className="error" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card relative overflow-hidden p-4">
      {/* Neon hairline along the top edge — the tile's only use of the accent. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-brand via-brand/30 to-transparent"
      />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
