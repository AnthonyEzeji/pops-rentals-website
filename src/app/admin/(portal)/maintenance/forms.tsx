"use client";

import { useActionState } from "react";
import { addBlock, addMaintenance, type ActionState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { config } from "@/lib/config";
import { toDateInputValue } from "@/lib/dates";

const EMPTY: ActionState = {};

type Option = { id: string; label: string };

function VehicleSelect({ vehicles }: { vehicles: Option[] }) {
  return (
    <Field label="Vehicle" name="vehicleId">
      <select id="vehicleId" name="vehicleId" className="input" required>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function MaintenanceForm({ vehicles }: { vehicles: Option[] }) {
  const [state, action] = useActionState(addMaintenance, EMPTY);
  const errors = state.fieldErrors ?? {};
  const today = toDateInputValue(new Date());

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <VehicleSelect vehicles={vehicles} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" name="date" error={errors.date}>
          <input id="date" name="date" type="date" required className="input" defaultValue={today} />
        </Field>
        <Field label="Work" name="type" error={errors.type} hint="Service, tyres, brakes…">
          <input id="type" name="type" required className="input" />
        </Field>
      </div>

      <Field label="Description" name="description">
        <textarea id="description" name="description" rows={2} className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Cost (${config.currency})`} name="cost" error={errors.cost}>
          <input id="cost" name="cost" type="number" step="0.01" min="0" className="input" />
        </Field>
        <Field label="Odometer (km)" name="odometer" error={errors.odometer}>
          <input id="odometer" name="odometer" type="number" min="0" className="input" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Next due (date)" name="nextDueDate">
          <input id="nextDueDate" name="nextDueDate" type="date" className="input" />
        </Field>
        <Field label="Next due (km)" name="nextDueOdometer">
          <input id="nextDueOdometer" name="nextDueOdometer" type="number" min="0" className="input" />
        </Field>
      </div>

      <fieldset className="rounded-lg border border-line p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Take it off the road (optional)
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From" name="blockStartAt">
            <input id="blockStartAt" name="blockStartAt" type="date" className="input" />
          </Field>
          <Field label="Until" name="blockEndAt">
            <input id="blockEndAt" name="blockEndAt" type="date" className="input" />
          </Field>
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Saving…">Log maintenance</SubmitButton>
    </form>
  );
}

export function BlockForm({ vehicles }: { vehicles: Option[] }) {
  const [state, action] = useActionState(addBlock, EMPTY);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <VehicleSelect vehicles={vehicles} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" name="startAt">
          <input id="startAt" name="startAt" type="date" required className="input" />
        </Field>
        <Field label="Until" name="endAt">
          <input id="endAt" name="endAt" type="date" required className="input" />
        </Field>
      </div>

      <Field label="Reason" name="reason">
        <select id="reason" name="reason" className="input" defaultValue="maintenance">
          <option value="maintenance">Maintenance</option>
          <option value="out_of_service">Out of service</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <Field label="Note" name="note">
        <input id="note" name="note" className="input" />
      </Field>

      <SubmitButton pendingLabel="Blocking…">Block dates</SubmitButton>
    </form>
  );
}
