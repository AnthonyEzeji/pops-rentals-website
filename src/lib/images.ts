import { isBlobPhoto } from "./uploads";

/**
 * Photos stored under /public, and photos uploaded to Vercel Blob, are resized
 * by Next's image optimizer — both are allow-listed in next.config. Photos
 * entered in the admin as absolute URLs point at hosts we have not
 * allow-listed, and the optimizer throws on those — so they are passed through
 * unoptimized instead of breaking the page.
 */
export function isRemoteImage(src: string): boolean {
  if (isBlobPhoto(src)) return false;
  return /^https?:\/\//i.test(src);
}
