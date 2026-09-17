/**
 * Photos stored under /public are resized by Next's image optimizer. Photos
 * entered in the admin as absolute URLs point at hosts we have not allow-listed
 * in next.config, and the optimizer throws on those — so they are passed
 * through unoptimized instead of breaking the page.
 */
export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//i.test(src);
}
