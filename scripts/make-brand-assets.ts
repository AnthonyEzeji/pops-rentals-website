/**
 * Renders the Pops Rentals mark into the image files Next.js picks up by
 * convention: the browser tab icon, the Apple touch icon, and the Open Graph
 * card used when the site is shared.
 *
 *   npm run brand:assets
 *
 * Re-run after changing the mark in src/components/brand.tsx. If you replace
 * the vector with the original artwork, point LOGO_SVG at that file instead.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DISC = "#050806";
const GREEN = "#22a13c";

/** The badge: black disc, broken white ring, overlapping serif P and R. */
function mark(size: number): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="50" r="50" fill="${DISC}"/>
      <circle cx="50" cy="50" r="43" fill="none" stroke="#ffffff" stroke-width="2.5"
              stroke-dasharray="230 40" stroke-linecap="round" transform="rotate(115 50 50)"/>
      <text x="43" y="70" text-anchor="middle" fill="#ffffff"
            font-family="Georgia, 'Times New Roman', serif" font-size="58">P</text>
      <text x="55" y="70" text-anchor="middle" fill="${GREEN}"
            font-family="Georgia, 'Times New Roman', serif" font-size="58">R</text>
    </svg>`;
}

/** 1200x630 share card: mark on the brand black, with the wordmark beside it. */
function shareCard(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <radialGradient id="glow" cx="0.85" cy="0.1" r="0.75">
          <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.22"/>
          <stop offset="55%" stop-color="${GREEN}" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="${GREEN}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="${DISC}"/>
      <rect width="1200" height="630" fill="url(#glow)"/>
      <g transform="translate(120 175) scale(2.8)">
        <circle cx="50" cy="50" r="50" fill="#0b120d"/>
        <circle cx="50" cy="50" r="43" fill="none" stroke="#ffffff" stroke-width="2.5"
                stroke-dasharray="230 40" stroke-linecap="round" transform="rotate(115 50 50)"/>
        <text x="43" y="70" text-anchor="middle" fill="#ffffff"
              font-family="Georgia, 'Times New Roman', serif" font-size="58">P</text>
        <text x="55" y="70" text-anchor="middle" fill="${GREEN}"
              font-family="Georgia, 'Times New Roman', serif" font-size="58">R</text>
      </g>
      <text x="520" y="290" fill="#ffffff" font-family="Georgia, 'Times New Roman', serif"
            font-size="86" letter-spacing="2">Pops Rentals</text>
      <text x="522" y="350" fill="#93a398" font-family="Arial, Helvetica, sans-serif"
            font-size="30" letter-spacing="1">Self-drive rentals and chauffeur hire</text>
      <rect x="522" y="392" width="150" height="5" rx="2.5" fill="${GREEN}"/>
    </svg>`;
}

async function main() {
  const appDir = join(process.cwd(), "src", "app");
  mkdirSync(appDir, { recursive: true });

  const outputs: Array<[string, Buffer]> = [
    ["icon.png", await sharp(Buffer.from(mark(512))).png().toBuffer()],
    ["apple-icon.png", await sharp(Buffer.from(mark(180))).png().toBuffer()],
    ["opengraph-image.png", await sharp(Buffer.from(shareCard())).png().toBuffer()],
  ];

  for (const [name, buffer] of outputs) {
    writeFileSync(join(appDir, name), buffer);
    console.log(`${name}  ${(buffer.length / 1024).toFixed(1)} KB`);
  }

  // Twitter reuses the same card.
  writeFileSync(join(appDir, "twitter-image.png"), outputs[2][1]);
  console.log("twitter-image.png  (same card)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
