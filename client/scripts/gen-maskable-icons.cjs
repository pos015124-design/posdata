/**
 * gen-maskable-icons.cjs
 *
 * Generates proper maskable PNG icons for Android adaptive icons.
 *
 * Maskable icon spec:
 *   - The icon must be a SQUARE image
 *   - The "safe zone" is the center circle with diameter = 80% of the image
 *   - All meaningful content (logo, text) must fit inside that circle
 *   - The outer 10% on each side is the bleed area — Android may clip it
 *     to any shape (circle, squircle, teardrop, etc.)
 *
 * Strategy:
 *   - Take the existing icon-192.png and icon-512.png
 *   - Place them at 60% of the canvas size (well inside the safe zone)
 *   - Fill the background with the brand gradient (#2563eb → #7c3aed)
 *   - Output as icon-192-maskable.png and icon-512-maskable.png
 *
 * Usage:
 *   cd client
 *   npm install --save-dev sharp
 *   node scripts/gen-maskable-icons.cjs
 *
 * Requires: sharp ^0.33
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const PUBLIC = path.join(__dirname, '..', 'public');

async function generateMaskable(size) {
  const iconPath = path.join(PUBLIC, `icon-${size}.png`);
  const outPath  = path.join(PUBLIC, `icon-${size}-maskable.png`);

  // Check source exists
  if (!fs.existsSync(iconPath)) {
    console.error(`  ✗ Source not found: ${iconPath}`);
    console.error(`    Run the app build first, or ensure icon-${size}.png exists in client/public/`);
    process.exit(1);
  }

  // The inner icon should occupy 60% of the canvas (safe zone = 80%, we use 60% for comfort)
  const innerSize = Math.round(size * 0.60);
  const offset    = Math.round((size - innerSize) / 2);

  // 1. Create a gradient background SVG at full canvas size
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

  // 2. Resize the source icon to innerSize × innerSize
  const resizedIcon = await sharp(iconPath)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 3. Composite: gradient background + centred icon
  await sharp(bgSvg)
    .resize(size, size)
    .composite([{
      input: resizedIcon,
      top:  offset,
      left: offset
    }])
    .png()
    .toFile(outPath);

  console.log(`  ✓ Generated ${outPath}`);
}

(async () => {
  console.log('\nGenerating maskable icons...\n');
  try {
    await generateMaskable(192);
    await generateMaskable(512);
    console.log('\nDone. Files written to client/public/');
    console.log('Verify at: https://maskable.app/editor\n');
  } catch (err) {
    console.error('\nFailed:', err.message);
    if (err.message.includes("Cannot find module 'sharp'")) {
      console.error('\nInstall sharp first:');
      console.error('  cd client && npm install --save-dev sharp\n');
    }
    process.exit(1);
  }
})();
