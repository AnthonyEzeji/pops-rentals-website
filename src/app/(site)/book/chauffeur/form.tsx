"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitChauffeurRequest, type BookingFormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { addDays, toLocalInputValue } from "@/lib/dates";

const EMPTY: BookingFormState = {};

type Option = { id: string; label: string; seats: number; rate: string };

export function ChauffeurForm({
  vehicles,
  selectedId,
  occasion = "",
}: {
  vehicles: Option[];
  selectedId: string;
  /** Prefilled when the customer arrived from an occasion card on the home page. */
  occasion?: string;
}) {
  const [state, action] = useActionState(submitChauffeurRequest, EMPTY);
  const [vehicleId, setVehicleId] = useState(selectedId);
  const errors = state.fieldErrors ?? {};
  const selected = vehicles.find((v) => v.id === vehicleId);

  const defaultStart = toLocalInputValue(addDays(new Date(), 2));
  const defaultEnd = toLocalInputValue(
    new Date(addDays(new Date(), 2).getTime() + 4 * 3_600_000),
  );

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Vehicle and timing</legend>

        <Field
          label="Vehicle"
          name="vehicleId"
          error={errors.vehicleId}
          hint={selected ? `${selected.rate} · seats ${selected.seats}` : undefined}
        >
          <select
            id="vehicleId"
            name="vehicleId"
            className="input"
            value={vehicleId}
            onChange={(event) => setVehicleId(event.target.value)}
            required
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pickup time" name="startAt" error={errors.startAt}>
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required
              className="input"
              defaultValue={defaultStart}
            />
          </Field>
          <Field
            label="Expected finish"
            name="endAt"
            error={errors.endAt}
            hint="An estimate is fine — we confirm the final timing with you."
          >
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              required
              className="input"
              defaultValue={defaultEnd}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">The trip</legend>
        <Field label="Pickup address" name="pickupAddress" error={errors.pickupAddress}>
          <input id="pickupAddress" name="pickupAddress" required className="input" />
        </Field>
        <Field label="Drop-off address" name="dropoffAddress" error={errors.dropoffAddress}>
          <input id="dropoffAddress" name="dropoffAddress" required className="input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Passengers" name="passengers" error={errors.passengers}>
            <input
              id="passengers"
              name="passengers"
              type="number"
              min={1}
              max={selected?.seats ?? 60}
              defaultValue={1}
              required
              className="input"
            />
          </Field>
          <Field label="Luggage" name="luggageNotes" hint="e.g. 3 large suitcases, golf clubs">
            <input id="luggageNotes" name="luggageNotes" className="input" />
          </Field>
        </div>
        <Field label="Special requests (optional)" name="specialRequests">
          <textarea
            id="specialRequests"
            name="specialRequests"
            rows={3}
            className="input"
            defaultValue={occasion ? `Occasion: ${occasion}. ` : ""}
            placeholder="Child seat, multiple stops, quiet ride…"
          />
        </Field>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Your details</legend>
        <Field label="Full name" name="name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" required className="input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email" error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
            />
          </Field>
          <Field label="Phone" name="phone" error={errors.phone}>
            <input id="phone" name="phone" type="tel" autoComplete="tel" required className="input" />
          </Field>
        </div>
      </fieldset>

      <div className="flex items-start gap-3">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-line"
          required
        />
        <label htmlFor="acceptTerms" className="text-sm">
          I accept the{" "}
          <Link href="/policies" className="font-medium text-accent underline" target="_blank">
            terms and cancellation policy
          </Link>
          .
          {errors.acceptTerms ? <span className="error block">{errors.acceptTerms}</span> : null}
        </label>
      </div>

      <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
    </form>
  );
}
