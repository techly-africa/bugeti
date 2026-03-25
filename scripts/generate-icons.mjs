/**
 * Generates PWA icons from the SVG source at public/icons/icon.svg
 * Run once: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icons", "icon.svg");
const svgBuffer = readFileSync(svgPath);

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  const outPath = join(root, "public", "icons", `icon-${size}x${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ icon-${size}x${size}.png`);
}

// Also generate apple-touch-icon (180x180) and favicon
await sharp(svgBuffer).resize(180, 180).png()
  .toFile(join(root, "public", "apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png");

await sharp(svgBuffer).resize(32, 32).png()
  .toFile(join(root, "public", "favicon.png"));
console.log("✓ favicon.png (use as favicon.ico replacement)");

console.log("\nDone! All icons generated.");
