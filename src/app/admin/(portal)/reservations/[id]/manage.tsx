"use client";

import { useActionState } from "react";
import {
  assignDriver,
  rescheduleAction,
  setReservationStatus,
  updateReservationPrice,
  type ActionState,
} from "../../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { toLocalInputValue } from "@/lib/dates";
import { toMajorUnits } from "@/lib/money";

const EMPTY: ActionState = {};

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.ok) return <Alert tone="success">{state.ok}</Alert>;
  return null;
}

export function StatusActions({
  id,
  status,
  type,
}: {
  id: string;
  status: string;
  type: string;
}) {
  const [state, action] = useActionState(setReservationStatus, EMPTY);

  const options: Array<{ to: string; label: string; className?: string }> = [];
  if (status === "pending") {
    options.push({
      to: "confirmed",
      label: type === "chauffeur" ? "Confirm trip" : "Confirm booking",
      className: "btn-primary btn-sm",
    });
  }
  if (status === "confirmed") {
    options.push({ to: "in_progress", label: "Mark collected", className: "btn-primary btn-sm" });
  }
  if (status === "confirmed" || status === "in_progress") {
    options.push({ to: "completed", label: "Mark complete", className: "btn-secondary btn-sm" });
  }
  if (status !== "cancelled" && status !== "completed") {
    options.push({ to: "cancelled", label: "Cancel", className: "btn-danger btn-sm" });
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted">This reservation is closed — no further changes.</p>;
  }

  return (
    <div className="space-y-3">
      <Feedback state={state} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <form key={option.to} action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={option.to} />
            {option.to === "cancelled" ? (
              <input
                type="hidden"
                name="note"
                value="Cancelled by staff"
              />
            ) : null}
            <SubmitButton className={option.className}>{option.label}</SubmitButton>
          </form>
        ))}
      </div>
    </div>
  );
}

export function DriverAssignment({
  reservationId,
  drivers,
  currentDriverId,
}: {
  reservationId: string;
  drivers: Array<{ id: string; name: string; phone: string }>;
  currentDriverId: string | null;
}) {
  const [state, action] = useActionState(assignDriver, EMPTY);

  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <input type="hidden" name="reservationId" value={reservationId} />
      <Field label="Driver" name="driverId">
        <select
          id="driverId"
          name="driverId"
          className="input"
          defaultValue={currentDriverId ?? ""}
        >
          <option value="">Not assigned</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} · {driver.phone}
            </option>
          ))}
        </select>
      </Field>
      <SubmitButton className="btn-secondary btn-sm">Save driver</SubmitButton>
    </form>
  );
}

export function PriceEditor({
  id,
  priceTotal,
  amountPaid,
  currency,
}: {
  id: string;
  priceTotal: number;
  amountPaid: number;
  currency: string;
}) {
  const [state, action] = useActionState(updateReservationPrice, EMPTY);

  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Total (${currency})`} name="priceTotal">
          <input
            id="priceTotal"
            name="priceTotal"
            type="number"
            step="0.01"
            min="0"
            className="input"
            defaultValue={toMajorUnits(priceTotal)}
          />
        </Field>
        <Field label={`Paid (${currency})`} name="amountPaid">
          <input
            id="amountPaid"
            name="amountPaid"
            type="number"
            step="0.01"
            min="0"
            className="input"
            defaultValue={toMajorUnits(amountPaid)}
          />
        </Field>
      </div>
      <SubmitButton className="btn-secondary btn-sm">Save amounts</SubmitButton>
    </form>
  );
}

export function RescheduleForm({
  id,
  startAt,
  endAt,
}: {
  id: string;
  startAt: string;
  endAt: string;
}) {
  const [state, action] = useActionState(rescheduleAction, EMPTY);

  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts" name="startAt">
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            className="input"
            defaultValue={toLocalInputValue(new Date(startAt))}
          />
        </Field>
        <Field label="Ends" name="endAt">
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            className="input"
            defaultValue={toLocalInputValue(new Date(endAt))}
          />
        </Field>
      </div>
      <SubmitButton className="btn-secondary btn-sm">Change dates</SubmitButton>
    </form>
  );
}
