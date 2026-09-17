/**
 * Attaches local photo files to vehicles.
 *
 * Put images in `public/vehicles/<slug>/` — the slug is the one in the car's
 * public URL, e.g. public/vehicles/2021-lamborghini-urus/01.jpg. Filenames sort
 * alphabetically, so the first one (01.jpg) becomes the cover shot.
 *
 * Then run:  npm run photos:sync
 *
 * Re-running is safe: it replaces each vehicle's photo list with whatever is in
 * its folder. Vehicles with no folder are left untouched.
 */
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = join(process.cwd(), "public", "vehicles");
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

async function main() {
  if (!existsSync(ROOT)) {
    console.log(`No photo folder yet. Create ${ROOT} and add one folder per vehicle slug.`);
    return;
  }

  const vehicles = await prisma.vehicle.findMany({ select: { id: true, slug: true, make: true, model: true } });
  let updated = 0;
  const empty: string[] = [];
  const missing: string[] = [];

  for (const vehicle of vehicles) {
    const dir = join(ROOT, vehicle.slug);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      missing.push(vehicle.slug);
      continue;
    }

    const files = readdirSync(dir)
      .filter((file) => IMAGE.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (files.length === 0) {
      empty.push(vehicle.slug);
      continue;
    }

    const photos = files.map((file) => `/vehicles/${vehicle.slug}/${file}`);
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { photos } });
    console.log(`${vehicle.make} ${vehicle.model}: ${photos.length} photo(s)`);
    updated += 1;
  }

  console.log(`\nUpdated ${updated} vehicle(s).`);
  if (empty.length > 0) {
    console.log(`\nStill waiting on photos (folder exists but is empty):`);
    for (const slug of empty) console.log(`  public/vehicles/${slug}/`);
  }
  if (missing.length > 0) {
    console.log(`\nNo folder yet — create these and add images:`);
    for (const slug of missing) console.log(`  public/vehicles/${slug}/`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
