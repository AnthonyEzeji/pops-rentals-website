// Unambiguous alphabet — no 0/O/1/I, so references survive being read aloud.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** `PR-8H3K2Q` for self-drive, `CH-…` for chauffeur trips. */
export function bookingReference(prefix = "PR"): string {
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return `${prefix}-${code}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
