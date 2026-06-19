/**
 * gen-promo-favicon.cjs
 * Generates a 192x192 PNG for the promo site favicon/app icon
 * from the B circuit logo SVG.
 * Usage: cd client && node scripts/gen-promo-favicon.cjs
 */
const sharp = require('sharp');
const path  = require('path');

const PROMO_PUBLIC = path.join(__dirname, '..', '..', 'bhaby-eshop-promo', 'app', 'public');

const sizes = [16, 32, 64, 180, 192];

function makeSVG(size) {
  const scale  = (size * 0.70) / 100;
  const offset = (size * 0.15);
  const r      = Math.round(size * 0.18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <path d="M18 10 L18 90 L55 90 C72 90 82 80 82 67 C82 58 77 52 69 49 C76 46 80 40 80 32 C80 19 70 10 55 10 Z"
      stroke="#0ea5e9" stroke-width="5" fill="none" stroke-linejoin="round"/>
    <path d="M18 10 L55 10 C68 10 78 18 78 30 C78 42 68 49 55 49 L18 49"
      stroke="#0ea5e9" stroke-width="5" fill="none"/>
    <path d="M18 49 L57 49 C71 49 82 57 82 68 C82 79 71 88 57 88 L18 88"
      stroke="#ffffff" stroke-width="5" fill="none"/>
    <line x1="18" y1="30" x2="6" y2="30" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="30" r="3" fill="#0ea5e9"/>
    <line x1="18" y1="50" x2="6" y2="50" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="50" r="3" fill="#0ea5e9"/>
    <line x1="18" y1="70" x2="6" y2="70" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="70" r="3" fill="#ffffff"/>
    <g transform="translate(36, 38)">
      <path d="M2 4 L4 4 L7 14 L18 14 L20 7 L6 7"
        stroke="#0ea5e9" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="9" cy="17" r="1.8" fill="#0ea5e9"/>
      <circle cx="16" cy="17" r="1.8" fill="#0ea5e9"/>
    </g>
  </g>
</svg>`;
}

(async () => {
  console.log('\nGenerating promo site favicon/icons...\n');
  const { Buffer } = require('buffer');

  // Generate sizes needed for browser favicon and Apple touch icon
  for (const size of sizes) {
    const svg    = makeSVG(size);
    const outPath = path.join(PROMO_PUBLIC, `icon-${size}.png`);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
    console.log(`  ✓ icon-${size}.png`);
  }

  // Copy 192 as the main icon and apple-touch-icon
  const src192 = path.join(PROMO_PUBLIC, 'icon-192.png');
  const fs = require('fs');
  fs.copyFileSync(src192, path.join(PROMO_PUBLIC, 'apple-touch-icon.png'));
  console.log('  ✓ apple-touch-icon.png');

  // The favicon.ico in src/app/ is used by Next.js — replace with our 32px PNG
  // (Next.js 13+ accepts PNG as favicon)
  const src32 = path.join(PROMO_PUBLIC, 'icon-32.png');
  const faviconDest = path.join(__dirname, '..', '..', 'bhaby-eshop-promo', 'app', 'src', 'app', 'favicon.ico');
  fs.copyFileSync(src32, faviconDest);
  console.log('  ✓ src/app/favicon.ico (replaced with B icon PNG)');

  console.log('\n✅ Done\n');
})();
