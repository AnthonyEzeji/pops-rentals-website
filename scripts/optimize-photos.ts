/**
 * Downscales vehicle photos for the web.
 *
 * Phone and Instagram exports are often 4000px and several megabytes each,
 * which is far more than any layout on the site uses and slow on mobile data.
 * This resizes every image under public/vehicles to a sane maximum and
 * re-encodes it, keeping the filename (so the database paths stay valid).
 *
 *   npm run photos:optimize
 *
 * Originals are moved to ./photo-originals/<slug>/ first — outside public/, so
 * they are not deployed, but still on disk if a photo needs re-cropping.
 */
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SOURCE = join(process.cwd(), "public", "vehicles");
const BACKUP = join(process.cwd(), "photo-originals");
const IMAGE = /\.(jpe?g|png|webp)$/i;

const MAX_EDGE = 1800; // comfortably above the largest rendered size
const QUALITY = 80;

async function main() {
  if (!existsSync(SOURCE)) {
    console.log(`Nothing to do — ${SOURCE} does not exist.`);
    return;
  }

  let before = 0;
  let after = 0;
  let count = 0;

  for (const slug of readdirSync(SOURCE)) {
    const dir = join(SOURCE, slug);
    if (!statSync(dir).isDirectory()) continue;

    const files = readdirSync(dir).filter((file) => IMAGE.test(file));
    if (files.length === 0) continue;

    const backupDir = join(BACKUP, slug);
    mkdirSync(backupDir, { recursive: true });

    for (const file of files) {
      const source = join(dir, file);
      const original = join(backupDir, file);

      // Already processed on an earlier run — the original is set aside.
      if (existsSync(original)) continue;

      const size = statSync(source).size;
      renameSync(source, original);

      await sharp(original)
        .rotate() // honour EXIF orientation before stripping metadata
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(source);

      const newSize = statSync(source).size;
      before += size;
      after += newSize;
      count += 1;
      console.log(
        `${slug}/${file}  ${(size / 1024 / 1024).toFixed(1)}MB → ${(newSize / 1024 / 1024).toFixed(2)}MB`,
      );
    }
  }

  if (count === 0) {
    console.log("No new images to optimize.");
    return;
  }

  console.log(
    `\n${count} image(s): ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB ` +
      `(${Math.round((1 - after / before) * 100)}% smaller). Originals in photo-originals/.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
