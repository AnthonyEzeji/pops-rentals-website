"use client";

import { useActionState } from "react";
import { saveDriver, type ActionState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";

const EMPTY: ActionState = {};

export function DriverForm() {
  const [state, action] = useActionState(saveDriver, EMPTY);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <Field label="Name" name="name" error={errors.name}>
        <input id="name" name="name" required className="input" />
      </Field>
      <Field label="Phone" name="phone" error={errors.phone}>
        <input id="phone" name="phone" type="tel" required className="input" />
      </Field>
      <Field label="Email (optional)" name="email" error={errors.email}>
        <input id="email" name="email" type="email" className="input" />
      </Field>
      <Field label="Licence number" name="licenseNumber" error={errors.licenseNumber}>
        <input id="licenseNumber" name="licenseNumber" required className="input" />
      </Field>
      <Field label="Notes" name="notes" hint="Languages, vehicle certifications, availability.">
        <textarea id="notes" name="notes" rows={3} className="input" />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-line" />
        Available for assignment
      </label>

      <SubmitButton pendingLabel="Saving…">Add driver</SubmitButton>
    </form>
  );
}
