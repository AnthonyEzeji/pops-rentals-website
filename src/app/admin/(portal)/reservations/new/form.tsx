"use client";

import { useActionState, useState } from "react";
import { createReservationAction, type ActionState } from "../../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { addDays, toLocalInputValue } from "@/lib/dates";

const EMPTY: ActionState = {};

export type SavedCustomer = {
  id: string;
  /** What appears in the dropdown, e.g. "Amara Diallo — +1 555 0110". */
  label: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string | null;
};

export function NewReservationForm({
  vehicles,
  customers,
}: {
  vehicles: Array<{ id: string; label: string }>;
  customers: SavedCustomer[];
}) {
  const [state, action] = useActionState(createReservationAction, EMPTY);
  const [type, setType] = useState<"self_drive" | "chauffeur">("self_drive");

  const [search, setSearch] = useState("");
  const [details, setDetails] = useState({ name: "", email: "", phone: "" });
  const [matched, setMatched] = useState<SavedCustomer | null>(null);

  /**
   * A datalist reports the chosen option through the input's value, so an exact
   * match against a label means the user picked someone rather than typed.
   */
  function pickCustomer(value: string) {
    setSearch(value);
    const found = customers.find((customer) => customer.label === value);
    setMatched(found ?? null);
    if (found) {
      setDetails({ name: found.name, email: found.email, phone: found.phone });
    }
  }

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

        <Field
          label="Existing customer"
          name="customerSearch"
          hint="Start typing a name — their details fill in below. Leave blank for someone new."
        >
          <input
            id="customerSearch"
            list="saved-customers"
            className="input"
            placeholder="Search saved customers"
            autoComplete="off"
            value={search}
            onChange={(event) => pickCustomer(event.target.value)}
          />
          <datalist id="saved-customers">
            {customers.map((customer) => (
              <option key={customer.id} value={customer.label} />
            ))}
          </datalist>
        </Field>

        <Field label="Full name" name="name">
          <input
            id="name"
            name="name"
            required
            className="input"
            value={details.name}
            onChange={(event) => setDetails({ ...details, name: event.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email">
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              value={details.email}
              onChange={(event) => setDetails({ ...details, email: event.target.value })}
            />
          </Field>
          <Field label="Phone" name="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className="input"
              value={details.phone}
              onChange={(event) => setDetails({ ...details, phone: event.target.value })}
            />
          </Field>
        </div>

        {matched ? (
          <p className="text-sm text-accent">
            Using saved details for {matched.name}
            {matched.licenseNumber ? ` · licence ${matched.licenseNumber}` : ""}.
          </p>
        ) : null}
      </fieldset>

      <p className="text-sm text-muted">
        The price is calculated from the vehicle&apos;s daily rate. Adjust it on the reservation
        afterwards if you agreed something different.
      </p>

      <SubmitButton pendingLabel="Creating…">Create reservation</SubmitButton>
    </form>
  );
}
