-- Hard guarantees against double-booking (PRD R1, R2, §14 race conditions).
-- Application-level checks can race; these constraints cannot.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A vehicle can never have two overlapping reservations that hold it.
-- Cancelled reservations are excluded; chauffeur requests set
-- "holdsAvailability" = false until confirmed (PRD R5).
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("holdsAvailability" AND "status" <> 'cancelled');

-- Maintenance / out-of-service blocks cannot overlap each other either.
ALTER TABLE "VehicleBlock"
  ADD CONSTRAINT "VehicleBlock_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  );

-- Ranges must be non-empty and correctly ordered.
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_end_after_start" CHECK ("endAt" > "startAt");

ALTER TABLE "VehicleBlock"
  ADD CONSTRAINT "VehicleBlock_end_after_start" CHECK ("endAt" > "startAt");
