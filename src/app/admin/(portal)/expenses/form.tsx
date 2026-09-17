"use client";

import { useActionState } from "react";
import { addExpense, type ActionState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { config } from "@/lib/config";
import { toDateInputValue } from "@/lib/dates";

const EMPTY: ActionState = {};

export function ExpenseForm({ vehicles }: { vehicles: Array<{ id: string; label: string }> }) {
  const [state, action] = useActionState(addExpense, EMPTY);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <Field label="Vehicle" name="vehicleId" hint="Leave as general for business-wide costs.">
        <select id="vehicleId" name="vehicleId" className="input" defaultValue="">
          <option value="">General (not vehicle-specific)</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" name="date" error={errors.date}>
          <input
            id="date"
            name="date"
            type="date"
            required
            className="input"
            defaultValue={toDateInputValue(new Date())}
          />
        </Field>
        <Field label={`Amount (${config.currency})`} name="amount" error={errors.amount}>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            className="input"
          />
        </Field>
      </div>

      <Field label="Category" name="category" error={errors.category}>
        <select id="category" name="category" className="input" defaultValue="fuel">
          <option value="fuel">Fuel</option>
          <option value="repair">Repair</option>
          <option value="insurance">Insurance</option>
          <option value="registration">Registration</option>
          <option value="cleaning">Cleaning</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <Field label="Vendor" name="vendor">
        <input id="vendor" name="vendor" className="input" />
      </Field>

      <Field label="Receipt URL" name="receiptUrl" error={errors.receiptUrl}>
        <input id="receiptUrl" name="receiptUrl" type="url" className="input" />
      </Field>

      <Field label="Notes" name="notes">
        <textarea id="notes" name="notes" rows={2} className="input" />
      </Field>

      <SubmitButton pendingLabel="Saving…">Record expense</SubmitButton>
    </form>
  );
}
