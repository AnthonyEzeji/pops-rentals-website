"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitSelfDriveBooking, type BookingFormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { toLocalInputValue } from "@/lib/dates";

const EMPTY: BookingFormState = {};

export function SelfDriveForm({
  vehicleId,
  startAt,
  endAt,
}: {
  vehicleId: string;
  startAt: string;
  endAt: string;
}) {
  const [state, action] = useActionState(submitSelfDriveBooking, EMPTY);
  const errors = state.fieldErrors ?? {};
  const invalid = (name: string) =>
    errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="vehicleId" value={vehicleId} />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Collection and return</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Collection" name="startAt" error={errors.startAt}>
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required
              className="input"
              defaultValue={toLocalInputValue(new Date(startAt))}
              {...invalid("startAt")}
            />
          </Field>
          <Field label="Return" name="endAt" error={errors.endAt}>
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              required
              className="input"
              defaultValue={toLocalInputValue(new Date(endAt))}
              {...invalid("endAt")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Your details</legend>
        <Field label="Full name" name="name" error={errors.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            className="input"
            {...invalid("name")}
          />
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
              {...invalid("email")}
            />
          </Field>
          <Field label="Phone" name="phone" error={errors.phone}>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              className="input"
              {...invalid("phone")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Driver&apos;s licence</legend>
        <p className="text-sm text-muted">
          We check the licence at collection, so please make sure it matches the details below.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Licence number" name="licenseNumber" error={errors.licenseNumber}>
            <input
              id="licenseNumber"
              name="licenseNumber"
              required
              className="input"
              {...invalid("licenseNumber")}
            />
          </Field>
          <Field label="Expires" name="licenseExpiry" error={errors.licenseExpiry}>
            <input
              id="licenseExpiry"
              name="licenseExpiry"
              type="date"
              required
              className="input"
              {...invalid("licenseExpiry")}
            />
          </Field>
          <Field label="Issued in" name="licenseCountry" error={errors.licenseCountry}>
            <input
              id="licenseCountry"
              name="licenseCountry"
              required
              placeholder="Country"
              className="input"
              {...invalid("licenseCountry")}
            />
          </Field>
        </div>
      </fieldset>

      <Field label="Anything we should know? (optional)" name="notes">
        <textarea id="notes" name="notes" rows={3} className="input" />
      </Field>

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
            rental terms, cancellation and damage policy
          </Link>
          .
          {errors.acceptTerms ? <span className="error block">{errors.acceptTerms}</span> : null}
        </label>
      </div>

      <SubmitButton pendingLabel="Confirming…">Confirm booking</SubmitButton>
    </form>
  );
}
