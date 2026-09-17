import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const required = (label: string, max = 200) =>
  trimmed(max).min(1, `${label} is required.`);

export const customerSchema = z.object({
  name: required("Full name", 120),
  email: z.email("Enter a valid email address."),
  phone: required("Phone number", 40),
});

export const selfDriveBookingSchema = customerSchema.extend({
  vehicleId: required("Vehicle"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  licenseNumber: required("Licence number", 60),
  licenseExpiry: z.coerce.date(),
  licenseCountry: required("Licence country", 60),
  notes: trimmed(1000).optional().default(""),
  acceptTerms: z.literal("on", { message: "Please accept the rental terms." }),
});

export const chauffeurRequestSchema = customerSchema.extend({
  vehicleId: required("Vehicle"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  pickupAddress: required("Pickup address", 300),
  dropoffAddress: required("Drop-off address", 300),
  passengers: z.coerce.number().int().min(1).max(60),
  luggageNotes: trimmed(500).optional().default(""),
  specialRequests: trimmed(1000).optional().default(""),
  acceptTerms: z.literal("on", { message: "Please accept the terms." }),
});

export const vehicleSchema = z.object({
  make: required("Make", 60),
  model: required("Model", 60),
  year: z.coerce.number().int().min(1950).max(2100),
  plate: required("Plate", 20),
  vin: trimmed(40).optional().default(""),
  category: z.enum(["sedan", "suv", "van", "luxury", "pickup", "bus"]),
  seats: z.coerce.number().int().min(1).max(80),
  transmission: z.enum(["automatic", "manual"]),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "electric"]),
  status: z.enum(["available", "reserved", "maintenance", "out_of_service"]),
  dailyRateSelfDrive: z.coerce.number().min(0),
  chauffeurHourlyRate: z.coerce.number().min(0).optional(),
  chauffeurDayRate: z.coerce.number().min(0).optional(),
  odometer: z.coerce.number().int().min(0).optional(),
  engine: trimmed(80).optional().default(""),
  horsepower: z.coerce.number().int().min(0).max(3000).optional(),
  zeroToSixty: z.coerce.number().min(0).max(60).optional(),
  topSpeed: z.coerce.number().int().min(0).max(500).optional(),
  features: trimmed(600).optional().default(""),
  photos: trimmed(2000).optional().default(""),
  description: trimmed(4000).optional().default(""),
});

export const driverSchema = z.object({
  name: required("Name", 120),
  phone: required("Phone", 40),
  email: z.union([z.email(), z.literal("")]).optional(),
  licenseNumber: required("Licence number", 60),
  active: z.coerce.boolean().optional().default(true),
  notes: trimmed(1000).optional().default(""),
});

export const maintenanceSchema = z.object({
  vehicleId: required("Vehicle"),
  date: z.coerce.date(),
  type: required("Type", 80),
  description: trimmed(1000).optional().default(""),
  cost: z.coerce.number().min(0).optional().default(0),
  odometer: z.coerce.number().int().min(0).optional(),
  nextDueDate: z.union([z.coerce.date(), z.literal("")]).optional(),
  nextDueOdometer: z.coerce.number().int().min(0).optional(),
  blockStartAt: z.union([z.coerce.date(), z.literal("")]).optional(),
  blockEndAt: z.union([z.coerce.date(), z.literal("")]).optional(),
});

export const expenseSchema = z.object({
  vehicleId: trimmed(40).optional().default(""),
  date: z.coerce.date(),
  category: z.enum(["fuel", "repair", "insurance", "registration", "cleaning", "other"]),
  amount: z.coerce.number().min(0),
  vendor: trimmed(120).optional().default(""),
  notes: trimmed(1000).optional().default(""),
  receiptUrl: z.union([z.url(), z.literal("")]).optional(),
});

export const blockSchema = z.object({
  vehicleId: required("Vehicle"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  reason: z.enum(["maintenance", "out_of_service", "other"]),
  note: trimmed(500).optional().default(""),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/** Turns a ZodError into `{ field: message }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
