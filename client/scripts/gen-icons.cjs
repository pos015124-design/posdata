/**
 * gen-icons.cjs
 *
 * Generates all PWA icons using the actual Bhaby E-Shop B circuit logo.
 * Uses sharp to convert SVG → real binary PNG.
 *
 * Outputs:
 *   public/icon-192.svg            — SVG source
 *   public/icon-512.svg            — SVG source
 *   public/icon-192.png            — Real PNG, any purpose
 *   public/icon-512.png            — Real PNG, any purpose
 *   public/icon-192-maskable.png   — Real PNG, maskable (safe-zone padded)
 *   public/icon-512-maskable.png   — Real PNG, maskable (safe-zone padded)
 *
 * Usage:
 *   cd client
 *   npm install --save-dev sharp   (if not already installed)
 *   node scripts/gen-icons.cjs
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

// ── The B circuit logo SVG ────────────────────────────────────────────────────
// Extracted from client/src/components/Logo.tsx — the exact same icon
// used in the app UI so the icon is 100% on-brand.
function makeBIconSVG(size, { bgFrom = '#1e3a5f', bgTo = '#2563eb', color1 = '#0ea5e9', color2 = '#ffffff' } = {}) {
  // The B icon is designed on a 100×100 viewBox with ~10px padding on each side.
  // We place it on a rounded-rect gradient background matching the app theme.
  const r = Math.round(size * 0.18); // border radius

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgFrom}"/>
      <stop offset="100%" stop-color="${bgTo}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>

  <!-- B circuit icon scaled to fit with padding -->
  <!-- Original viewBox: 0 0 100 100, we scale to ~70% of icon size centered -->
  <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${(size * 0.70) / 100})">

    <!-- Outer B shape -->
    <path
      d="M18 10 L18 90 L55 90 C72 90 82 80 82 67 C82 58 77 52 69 49 C76 46 80 40 80 32 C80 19 70 10 55 10 Z"
      stroke="${color1}" stroke-width="5" fill="none" stroke-linejoin="round"/>

    <!-- Upper bump of B -->
    <path
      d="M18 10 L55 10 C68 10 78 18 78 30 C78 42 68 49 55 49 L18 49"
      stroke="${color1}" stroke-width="5" fill="none"/>

    <!-- Lower bump of B -->
    <path
      d="M18 49 L57 49 C71 49 82 57 82 68 C82 79 71 88 57 88 L18 88"
      stroke="${color2}" stroke-width="5" fill="none"/>

    <!-- Circuit traces left -->
    <line x1="18" y1="30" x2="6" y2="30" stroke="${color1}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="30" r="3" fill="${color1}"/>
    <line x1="18" y1="50" x2="6" y2="50" stroke="${color1}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="50" r="3" fill="${color1}"/>
    <line x1="18" y1="70" x2="6" y2="70" stroke="${color2}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="70" r="3" fill="${color2}"/>

    <!-- Shopping cart inside B -->
    <g transform="translate(36, 38)">
      <path d="M2 4 L4 4 L7 14 L18 14 L20 7 L6 7"
        stroke="${color1}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="9" cy="17" r="1.8" fill="${color1}"/>
      <circle cx="16" cy="17" r="1.8" fill="${color1}"/>
    </g>
  </g>
</svg>`;
}

// Maskable version: icon at 60% canvas size (well within the safe zone)
// Background fills the full canvas so no white edges on any mask shape
function makeBIconMaskableSVG(size) {
  return makeBIconSVG(size, {
    bgFrom: '#1e3a5f',
    bgTo:   '#2563eb',
    color1: '#0ea5e9',
    color2: '#ffffff',
  });
  // For maskable: the transform in makeBIconSVG already places icon at 70%,
  // but maskable needs content within the center 80% circle.
  // We'll regenerate with the icon at 55% to ensure safe zone compliance.
}

function makeBIconMaskableSVGSafe(size) {
  const r = Math.round(size * 0.18);
  const color1 = '#0ea5e9';
  const color2 = '#ffffff';
  const bgFrom = '#1e3a5f';
  const bgTo   = '#2563eb';
  // Icon at 55% centered — guaranteed inside the 80% safe zone circle
  const scale  = (size * 0.55) / 100;
  const offset = (size - size * 0.55) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgFrom}"/>
      <stop offset="100%" stop-color="${bgTo}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <path d="M18 10 L18 90 L55 90 C72 90 82 80 82 67 C82 58 77 52 69 49 C76 46 80 40 80 32 C80 19 70 10 55 10 Z"
      stroke="${color1}" stroke-width="5" fill="none" stroke-linejoin="round"/>
    <path d="M18 10 L55 10 C68 10 78 18 78 30 C78 42 68 49 55 49 L18 49"
      stroke="${color1}" stroke-width="5" fill="none"/>
    <path d="M18 49 L57 49 C71 49 82 57 82 68 C82 79 71 88 57 88 L18 88"
      stroke="${color2}" stroke-width="5" fill="none"/>
    <line x1="18" y1="30" x2="6" y2="30" stroke="${color1}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="30" r="3" fill="${color1}"/>
    <line x1="18" y1="50" x2="6" y2="50" stroke="${color1}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="50" r="3" fill="${color1}"/>
    <line x1="18" y1="70" x2="6" y2="70" stroke="${color2}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="70" r="3" fill="${color2}"/>
    <g transform="translate(36, 38)">
      <path d="M2 4 L4 4 L7 14 L18 14 L20 7 L6 7"
        stroke="${color1}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="9" cy="17" r="1.8" fill="${color1}"/>
      <circle cx="16" cy="17" r="1.8" fill="${color1}"/>
    </g>
  </g>
</svg>`;
}

// ── Generate standard PNG ─────────────────────────────────────────────────────
async function generatePNG(size) {
  const svgContent = makeBIconSVG(size);
  const svgPath    = path.join(PUBLIC, `icon-${size}.svg`);
  const pngPath    = path.join(PUBLIC, `icon-${size}.png`);

  fs.writeFileSync(svgPath, svgContent);

  await sharp(Buffer.from(svgContent))
    .resize(size, size)
    .png()
    .toFile(pngPath);

  const stat = fs.statSync(pngPath);
  console.log(`  ✓ icon-${size}.png          ${stat.size} bytes`);
}

// ── Generate maskable PNG (safe-zone compliant) ───────────────────────────────
async function generateMaskable(size) {
  const svgContent = makeBIconMaskableSVGSafe(size);
  const outPath    = path.join(PUBLIC, `icon-${size}-maskable.png`);

  await sharp(Buffer.from(svgContent))
    .resize(size, size)
    .png()
    .toFile(outPath);

  const stat = fs.statSync(outPath);
  console.log(`  ✓ icon-${size}-maskable.png ${stat.size} bytes`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\nGenerating Bhaby E-Shop B-icon PWA icons...\n');
  try {
    await generatePNG(192);
    await generatePNG(512);
    await generateMaskable(192);
    await generateMaskable(512);
    console.log('\n✅ All icons generated in client/public/');
    console.log('   Verify maskable icons at: https://maskable.app/editor\n');
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    if (err.message.includes("Cannot find module 'sharp'")) {
      console.error('Install sharp first:\n  cd client && npm install --save-dev sharp\n');
    }
    process.exit(1);
  }
})();
