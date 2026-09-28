import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * The live fleet. Rates are in minor units (cents) — self-drive per day.
 *
 * Plates are placeholders (FR-nnnn): swap them for the real registrations in
 * the admin before launch. Photos are intentionally empty — add real photos of
 * each car rather than stock images of the same model.
 */
const VEHICLES = [
  {
    make: "Lamborghini", model: "Urus", year: 2021, plate: "FR-1001",
    category: "luxury" as const, seats: 5, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 135_000, securityDeposit: 100_000,
    chauffeurHourlyRate: 20_000, chauffeurDayRate: 180_000,
    engine: "4.0L twin-turbo V8", horsepower: 641, zeroToSixty: 3.5, topSpeed: 190,
    features: ["All-wheel drive", "Carbon interior", "Panoramic roof", "Sport exhaust"],
    description:
      "The super-SUV. 641 hp, four-wheel drive and room for five — the loudest arrival in the fleet.",
  },
  {
    make: "Mercedes-Benz", model: "GLS 600 Maybach", year: 2023, plate: "FR-1002",
    category: "luxury" as const, seats: 4, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 90_000, securityDeposit: 100_000,
    chauffeurHourlyRate: 15_000, chauffeurDayRate: 135_000,
    engine: "4.0L twin-turbo V8 with EQ Boost", horsepower: 550, zeroToSixty: 4.8, topSpeed: 130,
    features: ["Executive rear seats", "Rear entertainment", "Burmester 3D audio", "Air suspension"],
    description:
      "First-class travel on the road. Reclining rear seats, a refrigerator and near-silence — best booked with a chauffeur.",
  },
  {
    make: "Mercedes-AMG", model: "C63 S E Performance", year: 2024, plate: "FR-1003",
    category: "sedan" as const, seats: 5, transmission: "automatic" as const,
    fuelType: "hybrid" as const, dailyRateSelfDrive: 55_000, securityDeposit: 100_000,
    chauffeurHourlyRate: null, chauffeurDayRate: null,
    engine: "2.0L turbo hybrid", horsepower: 671, zeroToSixty: 3.3, topSpeed: 174,
    features: ["AMG performance exhaust", "Race mode", "Rear-axle steering", "Carbon trim"],
    description:
      "671 hp from a hybrid AMG powertrain. The quickest thing here from a standing start.",
  },
  {
    make: "Cadillac", model: "Escalade", year: 2022, plate: "FR-1004",
    category: "suv" as const, seats: 7, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 50_000, securityDeposit: 100_000,
    chauffeurHourlyRate: 9_000, chauffeurDayRate: 75_000,
    engine: "6.2L V8", horsepower: 420, zeroToSixty: 6.1, topSpeed: 112,
    features: ["7 seats", "38-inch curved OLED display", "AKG audio", "Power running boards"],
    description:
      "Seven seats, a full-size trunk and presence to spare. The default for groups and airport runs.",
  },
  {
    make: "BMW", model: "M5", year: 2019, plate: "FR-1005",
    category: "sedan" as const, seats: 5, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 50_000, securityDeposit: 100_000,
    chauffeurHourlyRate: null, chauffeurDayRate: null,
    engine: "4.4L twin-turbo V8", horsepower: 600, zeroToSixty: 3.2, topSpeed: 155,
    features: ["M xDrive all-wheel drive", "Merino leather", "M sport exhaust", "Head-up display"],
    description: "600 hp and all-wheel drive. The sedan that keeps up with supercars.",
  },
  {
    make: "BMW", model: "M550i", year: 2019, plate: "FR-1006",
    category: "sedan" as const, seats: 5, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 35_000, securityDeposit: 75_000,
    chauffeurHourlyRate: null, chauffeurDayRate: null,
    engine: "4.4L twin-turbo V8", horsepower: 523, zeroToSixty: 3.6, topSpeed: 155,
    features: ["xDrive all-wheel drive", "Harman Kardon audio", "Comfort seats", "Adaptive drive"],
    description: "Most of the M5's pace with a softer edge. A quick, comfortable long-distance car.",
  },
  {
    make: "Dodge", model: "Charger Scat Pack", year: 2020, plate: "FR-1007",
    category: "sedan" as const, seats: 5, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 35_000, securityDeposit: 100_000,
    chauffeurHourlyRate: null, chauffeurDayRate: null,
    engine: "6.4L HEMI V8", horsepower: 485, zeroToSixty: 4.3, topSpeed: 175,
    features: ["Launch control", "Brembo brakes", "Sport exhaust", "Line lock"],
    description: "6.4-litre HEMI muscle. Rear-wheel drive, four doors and a soundtrack to match.",
  },
  {
    make: "BMW", model: "330i", year: 2023, plate: "FR-1008",
    category: "sedan" as const, seats: 5, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 30_000, securityDeposit: 50_000,
    chauffeurHourlyRate: 6_000, chauffeurDayRate: 45_000,
    engine: "2.0L turbo inline-4", horsepower: 255, zeroToSixty: 5.6, topSpeed: 155,
    features: ["Apple CarPlay", "Heated seats", "Live Cockpit Pro", "Parking assistant"],
    description: "The sensible executive choice — quick, frugal and easy to park.",
  },
  {
    make: "Honda", model: "Accord", year: 2017, plate: "FR-1009",
    category: "sedan" as const, seats: 5, transmission: "automatic" as const,
    fuelType: "petrol" as const, dailyRateSelfDrive: 12_500, securityDeposit: 25_000,
    chauffeurHourlyRate: null, chauffeurDayRate: null,
    engine: "2.4L inline-4", horsepower: 185, zeroToSixty: 7.6, topSpeed: 125,
    features: ["Bluetooth", "Reverse camera", "Cruise control", "Air conditioning"],
    description: "The everyday option. Reliable, economical and the cheapest way to stay mobile.",
  },
];

const DRIVERS = [
  { name: "Daniel Okoye", phone: "+1 555 0142", email: "daniel@fleetreserve.test", licenseNumber: "DL-88213", notes: "Airport runs, night shifts." },
  { name: "Priya Raman", phone: "+1 555 0177", email: "priya@fleetreserve.test", licenseNumber: "DL-44190", notes: "Executive clients, Maybach certified." },
  { name: "Marcus Hale", phone: "+1 555 0188", email: "marcus@fleetreserve.test", licenseNumber: "DL-77321", notes: "Long-distance and large SUVs." },
];

function days(n: number) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "owner@fleetreserve.test").toLowerCase();

  // The fallback password is in this repo, so it is only acceptable against a
  // local database. Seeding a hosted one without SEED_ADMIN_PASSWORD would
  // publish the owner's credentials — and that happens from a laptop, where
  // NODE_ENV is still "development", so the target host is what matters.
  const target = process.env.DATABASE_URL ?? "";
  const isLocalDatabase = /@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)[:/]/i.test(target);
  const deployed =
    Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production" || !isLocalDatabase;
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  // Presence is not enough: .env and .env.example both ship "ChangeMe123!", so
  // a hosted database would end up with an admin password anyone can read here.
  const PUBLISHED_PASSWORDS = ["ChangeMe123!", "StaffPass123!", "changeme", "password"];
  const reason = !process.env.SEED_ADMIN_PASSWORD
    ? "SEED_ADMIN_PASSWORD is not set, so the seed fell back to the default in this repo"
    : PUBLISHED_PASSWORDS.includes(password)
      ? "that password is published in this repo"
      : password.length < 12
        ? `that password is ${password.length} characters; 12 or more is required`
        : null;

  if (deployed && reason) {
    throw new Error(
      `Refusing to seed ${target.replace(/:[^:@/]*@/, ":***@")}\n` +
        `because ${reason}.\n` +
        "This account is the admin login for the live site — give it a real password:\n" +
        '  $env:SEED_ADMIN_PASSWORD = \'…\'   (PowerShell)  then  npx prisma db seed',
    );
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const owner = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, role: "owner", active: true },
    create: { email, name: "Fleet Owner", passwordHash, role: "owner" },
  });

  // Demo staff account, for trying the owner/staff split locally. Not created
  // on a deployed database — add real staff from the admin instead.
  if (!deployed) {
    await prisma.adminUser.upsert({
      where: { email: "staff@fleetreserve.test" },
      update: {},
      create: {
        email: "staff@fleetreserve.test",
        name: "Front Desk",
        passwordHash: await bcrypt.hash("StaffPass123!", 12),
        role: "staff",
      },
    });
  }

  for (const v of VEHICLES) {
    // Keyed on slug, not plate: the operator replaces placeholder plates with
    // real registrations in the admin, and keying on plate would make this
    // create a second copy of every car.
    const slug = slugify(`${v.year}-${v.make}-${v.model}`);
    await prisma.vehicle.upsert({
      where: { slug },
      // Specifications only. Rates, deposits, plates, status and photos are
      // maintained in the admin once the site is live, so a reseed must not
      // overwrite them.
      update: {
        engine: v.engine,
        horsepower: v.horsepower,
        zeroToSixty: v.zeroToSixty,
        topSpeed: v.topSpeed,
      },
      create: { ...v, slug, photos: [], odometer: 15_000 + Math.floor(Math.random() * 50_000) },
    });
  }

  for (const d of DRIVERS) {
    const existing = await prisma.driver.findFirst({ where: { licenseNumber: d.licenseNumber } });
    if (!existing) await prisma.driver.create({ data: d });
  }

  const accord = await prisma.vehicle.findUniqueOrThrow({ where: { plate: "FR-1009" } });
  const maybach = await prisma.vehicle.findUniqueOrThrow({ where: { plate: "FR-1002" } });
  const escalade = await prisma.vehicle.findUniqueOrThrow({ where: { plate: "FR-1004" } });

  if ((await prisma.reservation.count()) === 0) {
    const customer = await prisma.customer.create({
      data: {
        name: "Amara Diallo",
        email: "amara@example.com",
        phone: "+1 555 0110",
        licenseNumber: "X4429911",
        licenseExpiry: days(900),
        licenseCountry: "US",
      },
    });

    await prisma.reservation.create({
      data: {
        reference: "FR-SEED01",
        type: "self_drive",
        status: "confirmed",
        vehicleId: accord.id,
        customerId: customer.id,
        startAt: days(3),
        endAt: days(6),
        priceTotal: 3 * accord.dailyRateSelfDrive,
        depositAmount: Math.round((3 * accord.dailyRateSelfDrive) / 4),
        amountPaid: Math.round((3 * accord.dailyRateSelfDrive) / 4),
        paymentStatus: "deposit_paid",
        statusEvents: { create: { toStatus: "confirmed", actor: "system", note: "Seeded" } },
      },
    });

    const driver = await prisma.driver.findFirstOrThrow();
    await prisma.reservation.create({
      data: {
        reference: "CH-SEED02",
        type: "chauffeur",
        status: "pending",
        holdsAvailability: false,
        vehicleId: maybach.id,
        customerId: customer.id,
        startAt: days(8),
        endAt: new Date(days(8).getTime() + 6 * 3_600_000),
        priceTotal: 6 * (maybach.chauffeurHourlyRate ?? 15_000),
        currency: "USD",
        chauffeurTrip: {
          create: {
            pickupAddress: "Grand Hotel, 14 Marina Drive",
            dropoffAddress: "International Airport, Terminal 2",
            passengers: 3,
            luggageNotes: "3 large suitcases",
            specialRequests: "Bottled water, quiet ride",
            driverId: driver.id,
          },
        },
        statusEvents: { create: { toStatus: "pending", actor: "system", note: "Seeded request" } },
      },
    });
  }

  if ((await prisma.maintenanceRecord.count()) === 0) {
    await prisma.maintenanceRecord.create({
      data: {
        vehicleId: escalade.id,
        date: days(-14),
        type: "Service",
        description: "Oil, filters and brake inspection.",
        cost: 48_000,
        odometer: 41_400,
        nextDueDate: days(160),
        nextDueOdometer: 51_400,
      },
    });
    await prisma.vehicleBlock.create({
      data: {
        vehicleId: escalade.id,
        startAt: days(10),
        endAt: days(12),
        reason: "maintenance",
        note: "Tyre replacement booked with Citywide Tyres.",
      },
    });
  }

  if ((await prisma.expense.count()) === 0) {
    await prisma.expense.createMany({
      data: [
        { vehicleId: accord.id, date: days(-5), category: "fuel", amount: 7_800, vendor: "Shell" },
        { vehicleId: maybach.id, date: days(-20), category: "insurance", amount: 145_000, vendor: "Northbridge" },
        { vehicleId: escalade.id, date: days(-14), category: "repair", amount: 48_000, vendor: "Citywide Auto" },
        { vehicleId: null, date: days(-3), category: "other", amount: 12_000, vendor: "Office supplies" },
      ],
    });
  }

  // Only ever echo the throwaway default. A password the operator supplied is
  // a real credential — printing it puts it in terminal scrollback and CI logs
  // regardless of which database it was applied to.
  const isRepoDefault = !process.env.SEED_ADMIN_PASSWORD;
  console.log(
    `Seeded ${VEHICLES.length} vehicles. Admin login: ${owner.email} / ` +
      (isRepoDefault ? password : "(the SEED_ADMIN_PASSWORD you supplied)"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
