/**
 * gen-twa-icons.cjs
 *
 * Generates Android launcher icons at all required densities
 * and copies them directly into the TWA project's res/ directories.
 *
 * Android icon sizes:
 *   mdpi    48×48
 *   hdpi    72×72
 *   xhdpi   96×96
 *   xxhdpi  144×144
 *   xxxhdpi 192×192
 *
 * Also generates maskable icons for the adaptive icon (ic_maskable.png).
 *
 * Usage:
 *   cd client
 *   node scripts/gen-twa-icons.cjs
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const TWA_RES = path.join('c:', 'eshop-twa', 'app', 'src', 'main', 'res');

// B circuit logo SVG — exact same as Logo.tsx
function makeBIconSVG(size, maskable = false) {
  // Maskable: icon at 55% canvas (safe zone). Regular: icon at 70%.
  const pct    = maskable ? 0.55 : 0.70;
  const scale  = (size * pct) / 100;
  const offset = (size - size * pct) / 2;
  const r      = maskable ? 0 : Math.round(size * 0.18);

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

const DENSITIES = [
  { name: 'mipmap-mdpi',    size: 48  },
  { name: 'mipmap-hdpi',    size: 72  },
  { name: 'mipmap-xhdpi',   size: 96  },
  { name: 'mipmap-xxhdpi',  size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

(async () => {
  console.log('\nGenerating Android launcher icons with B circuit logo...\n');

  for (const { name, size } of DENSITIES) {
    const dir = path.join(TWA_RES, name);
    if (!fs.existsSync(dir)) {
      console.log(`  ⚠ Directory not found, skipping: ${dir}`);
      continue;
    }

    // Regular launcher icon
    const regularPath = path.join(dir, 'ic_launcher.png');
    await sharp(Buffer.from(makeBIconSVG(size, false)))
      .resize(size, size)
      .png()
      .toFile(regularPath);
    console.log(`  ✓ ${name}/ic_launcher.png  (${size}×${size})`);

    // Maskable icon (adaptive icon safe zone)
    const maskablePath = path.join(dir, 'ic_maskable.png');
    await sharp(Buffer.from(makeBIconSVG(size, true)))
      .resize(size, size)
      .png()
      .toFile(maskablePath);
    console.log(`  ✓ ${name}/ic_maskable.png  (${size}×${size})`);
  }

  console.log('\n✅ All icons written to c:\\eshop-twa\\app\\src\\main\\res\\');
  console.log('   Now run: .\\gradlew.bat assembleRelease\n');
})();
