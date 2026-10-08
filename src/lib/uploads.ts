/**
 * Vehicle photo uploads.
 *
 * Photos go straight from the admin's browser to Vercel Blob — the browser
 * asks `/api/admin/uploads` for a short-lived, single-pathname token and then
 * PUTs the file to Blob itself. The file never passes through a Server Action,
 * which matters: action request bodies are capped at 1MB by default and a
 * photo off a phone is routinely twenty times that.
 *
 * Only the resulting URL is stored, in `Vehicle.photos` — the same string array
 * the `photos:sync` script fills from `public/vehicles/`, so repo photos and
 * uploaded photos can coexist and the public pages need no special casing.
 *
 * The constants below are the contract between the browser and the token route:
 * the browser rejects a file early for a friendly error, and the route sets the
 * same limits on the token so a hand-crafted upload cannot exceed them.
 */

export const PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Generous enough for an unedited phone photo; `photos:optimize` is for the repo copies. */
export const PHOTO_MAX_BYTES = 20 * 1024 * 1024;

export const UPLOAD_ROUTE = "/api/admin/uploads";

/** Every upload lands under this prefix, one folder per vehicle. */
export const PHOTO_PREFIX = "vehicles";

const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|avif)$/i;

/**
 * Pathnames the token route will sign. Anything else is refused, so a token
 * cannot be talked into writing outside the fleet's own folders.
 */
export const PHOTO_PATHNAME = /^vehicles\/[a-z0-9][a-z0-9-]{0,80}\/[a-z0-9][a-z0-9._-]{0,120}\.(jpe?g|png|webp|avif)$/i;

/**
 * Blob's public hostname. Photos on it are allow-listed in `next.config.ts`,
 * so unlike an arbitrary pasted URL they can go through the image optimizer.
 */
const BLOB_HOSTNAME = /(^|\.)public\.blob\.vercel-storage\.com$/i;

export function isBlobPhoto(url: string): boolean {
  try {
    return BLOB_HOSTNAME.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Whether uploading is wired up. Reads a server-only variable, so a Client
 * Component must be told the answer as a prop rather than calling this.
 */
export function uploadsEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * A vehicle's folder in the store. New vehicles have no id until they are
 * saved, so their photos land in a shared folder — harmless, because the URL
 * is what identifies the file and Blob adds a random suffix to every name.
 */
export function photoFolder(vehicleId?: string): string {
  const safe = (vehicleId ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return safe || "unassigned";
}

/** `vehicles/<folder>/<sanitised filename>`, the pathname the token is scoped to. */
export function photoPathname(folder: string, filename: string): string {
  const extension = filename.match(ALLOWED_EXTENSIONS)?.[0].toLowerCase() ?? ".jpg";
  const base =
    filename
      .slice(0, filename.length - (filename.match(ALLOWED_EXTENSIONS)?.[0].length ?? 0))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "photo";

  return `${PHOTO_PREFIX}/${photoFolder(folder)}/${base}${extension}`;
}
