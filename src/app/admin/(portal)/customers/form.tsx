"use client";

import { useActionState } from "react";
import { saveCustomer, type ActionState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";

const EMPTY: ActionState = {};

export type CustomerValues = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseCountry?: string;
};

export function CustomerForm({ values = {} }: { values?: CustomerValues }) {
  const [state, action] = useActionState(saveCustomer, EMPTY);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <Field label="Full name" name="name" error={errors.name}>
        <input id="name" name="name" required className="input" defaultValue={values.name} />
      </Field>

      <Field label="Email" name="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          defaultValue={values.email}
        />
      </Field>

      <Field label="Phone" name="phone" error={errors.phone}>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className="input"
          defaultValue={values.phone}
        />
      </Field>

      <fieldset className="rounded-lg border border-line p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Driver&apos;s licence (optional)
        </legend>
        <div className="space-y-3">
          <Field label="Licence number" name="licenseNumber" error={errors.licenseNumber}>
            <input
              id="licenseNumber"
              name="licenseNumber"
              className="input"
              defaultValue={values.licenseNumber}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Expires" name="licenseExpiry" error={errors.licenseExpiry}>
              <input
                id="licenseExpiry"
                name="licenseExpiry"
                type="date"
                className="input"
                defaultValue={values.licenseExpiry}
              />
            </Field>
            <Field label="Issued in" name="licenseCountry" error={errors.licenseCountry}>
              <input
                id="licenseCountry"
                name="licenseCountry"
                className="input"
                defaultValue={values.licenseCountry}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Saving…">
        {values.id ? "Save changes" : "Save customer"}
      </SubmitButton>
    </form>
  );
}
