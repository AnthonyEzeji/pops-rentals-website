"use client";

import { useActionState, useState } from "react";
import { createReservationAction, type ActionState } from "../../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { addDays, toLocalInputValue } from "@/lib/dates";

const EMPTY: ActionState = {};

export function NewReservationForm({
  vehicles,
}: {
  vehicles: Array<{ id: string; label: string }>;
}) {
  const [state, action] = useActionState(createReservationAction, EMPTY);
  const [type, setType] = useState<"self_drive" | "chauffeur">("self_drive");

  const start = toLocalInputValue(addDays(new Date(), 1));
  const end = toLocalInputValue(addDays(new Date(), 2));

  return (
    <form action={action} className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Booking</legend>

        <Field label="Type" name="type">
          <select
            id="type"
            name="type"
            className="input"
            value={type}
            onChange={(event) => setType(event.target.value as "self_drive" | "chauffeur")}
          >
            <option value="self_drive">Self-drive</option>
            <option value="chauffeur">Chauffeur</option>
          </select>
        </Field>

        <Field label="Vehicle" name="vehicleId">
          <select id="vehicleId" name="vehicleId" className="input" required>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" name="startAt">
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required
              className="input"
              defaultValue={start}
            />
          </Field>
          <Field label="Ends" name="endAt">
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              required
              className="input"
              defaultValue={end}
            />
          </Field>
        </div>

        <Field
          label="Notes"
          name="notes"
          hint="Anything the team should know at handover."
        >
          <textarea id="notes" name="notes" rows={2} className="input" />
        </Field>
      </fieldset>

      {type === "chauffeur" ? (
        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-sm font-semibold">Trip</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pickup address" name="pickupAddress">
              <input id="pickupAddress" name="pickupAddress" className="input" />
            </Field>
            <Field label="Drop-off address" name="dropoffAddress">
              <input id="dropoffAddress" name="dropoffAddress" className="input" />
            </Field>
          </div>
          <Field label="Passengers" name="passengers">
            <input
              id="passengers"
              name="passengers"
              type="number"
              min={1}
              defaultValue={1}
              className="input"
            />
          </Field>
        </fieldset>
      ) : null}

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Customer</legend>
        <Field label="Full name" name="name">
          <input id="name" name="name" required className="input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email">
            <input id="email" name="email" type="email" required className="input" />
          </Field>
          <Field label="Phone" name="phone">
            <input id="phone" name="phone" type="tel" required className="input" />
          </Field>
        </div>
      </fieldset>

      <p className="text-sm text-muted">
        The price is calculated from the vehicle&apos;s daily rate. Adjust it on the reservation
        afterwards if you agreed something different.
      </p>

      <SubmitButton pendingLabel="Creating…">Create reservation</SubmitButton>
    </form>
  );
}
