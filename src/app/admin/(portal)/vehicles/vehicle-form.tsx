"use client";

import { useActionState } from "react";
import { saveVehicle, type ActionState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";

const EMPTY: ActionState = {};

export type VehicleFormValues = {
  id?: string;
  make: string;
  model: string;
  year: number | string;
  plate: string;
  vin: string;
  category: string;
  seats: number | string;
  transmission: string;
  fuelType: string;
  status: string;
  dailyRateSelfDrive: number | string;
  chauffeurHourlyRate: number | string;
  chauffeurDayRate: number | string;
  odometer: number | string;
  engine: string;
  horsepower: number | string;
  zeroToSixty: number | string;
  topSpeed: number | string;
  features: string;
  photos: string;
  description: string;
};

export function VehicleForm({
  values,
  currency,
  canUpload,
}: {
  values: VehicleFormValues;
  currency: string;
  /** Whether Blob storage is configured — resolved on the server. */
  canUpload: boolean;
}) {
  const [state, action] = useActionState(saveVehicle, EMPTY);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Identity</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Make" name="make" error={errors.make}>
            <input id="make" name="make" required className="input" defaultValue={values.make} />
          </Field>
          <Field label="Model" name="model" error={errors.model}>
            <input id="model" name="model" required className="input" defaultValue={values.model} />
          </Field>
          <Field label="Year" name="year" error={errors.year}>
            <input
              id="year"
              name="year"
              type="number"
              min={1950}
              max={2100}
              required
              className="input"
              defaultValue={values.year}
            />
          </Field>
          <Field label="Registration" name="plate" error={errors.plate}>
            <input id="plate" name="plate" required className="input" defaultValue={values.plate} />
          </Field>
          <Field label="VIN (optional)" name="vin" error={errors.vin}>
            <input id="vin" name="vin" className="input" defaultValue={values.vin} />
          </Field>
          <Field label="Odometer (km)" name="odometer" error={errors.odometer}>
            <input
              id="odometer"
              name="odometer"
              type="number"
              min={0}
              className="input"
              defaultValue={values.odometer}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Specification</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category" name="category" error={errors.category}>
            <select id="category" name="category" className="input" defaultValue={values.category}>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="van">Van</option>
              <option value="luxury">Luxury</option>
              <option value="pickup">Pickup</option>
              <option value="bus">Bus</option>
            </select>
          </Field>
          <Field label="Seats" name="seats" error={errors.seats}>
            <input
              id="seats"
              name="seats"
              type="number"
              min={1}
              max={80}
              required
              className="input"
              defaultValue={values.seats}
            />
          </Field>
          <Field label="Transmission" name="transmission" error={errors.transmission}>
            <select
              id="transmission"
              name="transmission"
              className="input"
              defaultValue={values.transmission}
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </Field>
          <Field label="Fuel" name="fuelType" error={errors.fuelType}>
            <select id="fuelType" name="fuelType" className="input" defaultValue={values.fuelType}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Engine" name="engine" hint="e.g. 4.0L twin-turbo V8" error={errors.engine}>
            <input id="engine" name="engine" className="input" defaultValue={values.engine} />
          </Field>
          <Field label="Horsepower" name="horsepower" error={errors.horsepower}>
            <input
              id="horsepower"
              name="horsepower"
              type="number"
              min={0}
              className="input"
              defaultValue={values.horsepower}
            />
          </Field>
          <Field label="0–60 mph (sec)" name="zeroToSixty" error={errors.zeroToSixty}>
            <input
              id="zeroToSixty"
              name="zeroToSixty"
              type="number"
              step="0.1"
              min={0}
              className="input"
              defaultValue={values.zeroToSixty}
            />
          </Field>
          <Field label="Top speed (mph)" name="topSpeed" error={errors.topSpeed}>
            <input
              id="topSpeed"
              name="topSpeed"
              type="number"
              min={0}
              className="input"
              defaultValue={values.topSpeed}
            />
          </Field>
        </div>

        <Field
          label="Features"
          name="features"
          hint="One per line, or comma separated."
          error={errors.features}
        >
          <textarea
            id="features"
            name="features"
            rows={3}
            className="input"
            defaultValue={values.features}
          />
        </Field>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Rates & availability</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={`Self-drive per day (${currency})`}
            name="dailyRateSelfDrive"
            error={errors.dailyRateSelfDrive}
          >
            <input
              id="dailyRateSelfDrive"
              name="dailyRateSelfDrive"
              type="number"
              step="0.01"
              min="0"
              required
              className="input"
              defaultValue={values.dailyRateSelfDrive}
            />
          </Field>
          <Field
            label={`Chauffeur per hour (${currency})`}
            name="chauffeurHourlyRate"
            hint="Leave blank if not offered with a driver."
            error={errors.chauffeurHourlyRate}
          >
            <input
              id="chauffeurHourlyRate"
              name="chauffeurHourlyRate"
              type="number"
              step="0.01"
              min="0"
              className="input"
              defaultValue={values.chauffeurHourlyRate}
            />
          </Field>
          <Field
            label={`Chauffeur per day (${currency})`}
            name="chauffeurDayRate"
            error={errors.chauffeurDayRate}
          >
            <input
              id="chauffeurDayRate"
              name="chauffeurDayRate"
              type="number"
              step="0.01"
              min="0"
              className="input"
              defaultValue={values.chauffeurDayRate}
            />
          </Field>
        </div>

        <Field label="Status" name="status" error={errors.status}>
          <select id="status" name="status" className="input" defaultValue={values.status}>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="maintenance">Maintenance</option>
            <option value="out_of_service">Out of service</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold">Listing</legend>
        <Field
          label="Photos"
          name="photos"
          hint="The first photo is the cover image — drag to reorder."
          error={errors.photos}
        >
          <PhotoUploader
            name="photos"
            initial={values.photos}
            folder={values.id}
            canUpload={canUpload}
          />
        </Field>
        <Field label="Description" name="description" error={errors.description}>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="input"
            defaultValue={values.description}
          />
        </Field>
      </fieldset>

      <SubmitButton pendingLabel="Saving…">{values.id ? "Save changes" : "Add vehicle"}</SubmitButton>
    </form>
  );
}
