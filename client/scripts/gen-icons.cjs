/**
 * gen-icons.cjs
 *
 * Generates all required PWA icons as proper binary PNG files.
 * Uses sharp to convert SVG → PNG so Android/iOS accept them.
 *
 * Outputs:
 *   public/icon-192.svg          — SVG source (kept for reference)
 *   public/icon-512.svg          — SVG source (kept for reference)
 *   public/icon-192.png          — Real PNG (any purpose)
 *   public/icon-512.png          — Real PNG (any purpose)
 *   public/icon-192-maskable.png — Real PNG with safe-zone padding (maskable)
 *   public/icon-512-maskable.png — Real PNG with safe-zone padding (maskable)
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

// ── SVG source ────────────────────────────────────────────────────────────────
function makeSVG(size) {
  const r         = Math.round(size * 0.18);
  const fontSize  = Math.round(size * 0.42);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `  <defs>`,
    `    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `      <stop offset="0%" stop-color="#2563eb"/>`,
    `      <stop offset="100%" stop-color="#7c3aed"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>`,
    `  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"`,
    `    font-family="Arial,sans-serif" font-weight="900" font-size="${fontSize}"`,
    `    fill="white">E</text>`,
    `</svg>`
  ].join('\n');
}

// ── Generate standard PNG from SVG ────────────────────────────────────────────
async function generatePNG(size) {
  const svgContent = makeSVG(size);
  const svgPath    = path.join(PUBLIC, `icon-${size}.svg`);
  const pngPath    = path.join(PUBLIC, `icon-${size}.png`);

  // Write SVG source
  fs.writeFileSync(svgPath, svgContent);

  // Convert SVG → real binary PNG
  await sharp(Buffer.from(svgContent))
    .resize(size, size)
    .png()
    .toFile(pngPath);

  const stat = fs.statSync(pngPath);
  console.log(`  ✓ icon-${size}.png  (${stat.size} bytes)`);
}

// ── Generate maskable PNG (icon centred at 60% with gradient background) ─────
async function generateMaskable(size) {
  const innerSize = Math.round(size * 0.60);
  const offset    = Math.round((size - innerSize) / 2);
  const outPath   = path.join(PUBLIC, `icon-${size}-maskable.png`);

  const bgSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#2563eb"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#g)"/>
    </svg>
  `);

  // Generate inner icon at 60% size
  const innerSvg    = Buffer.from(makeSVG(innerSize));
  const resizedIcon = await sharp(innerSvg)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  // Composite: gradient background + centred icon
  await sharp(bgSvg)
    .resize(size, size)
    .composite([{ input: resizedIcon, top: offset, left: offset }])
    .png()
    .toFile(outPath);

  const stat = fs.statSync(outPath);
  console.log(`  ✓ icon-${size}-maskable.png  (${stat.size} bytes)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\nGenerating PWA icons...\n');
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
      console.error('\nInstall sharp first:');
      console.error('  cd client && npm install --save-dev sharp\n');
    }
    process.exit(1);
  }
})();
