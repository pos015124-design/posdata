/**
 * gen-twa-splash.cjs
 *
 * Replaces TWA native splash screen images with a plain gradient background
 * that matches the web SplashScreen.tsx animation exactly.
 *
 * No icon on the native splash — the web animation handles branding.
 * This creates a seamless transition: native gradient → web animated cart.
 *
 * Android splash sizes (fullscreen):
 *   mdpi    320×480
 *   hdpi    480×800
 *   xhdpi   720×1280
 *   xxhdpi  960×1600
 *   xxxhdpi 1280×1920
 *
 * Usage:
 *   cd client
 *   node scripts/gen-twa-splash.cjs
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const TWA_RES = path.join('c:', 'eshop-twa', 'app', 'src', 'main', 'res');

// Same gradient as SplashScreen.tsx: from-[#1e3a5f] to-[#2563eb] to-[#7c3aed]
function makeSplashSVG(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%"   stop-color="#1e3a5f"/>
      <stop offset="50%"  stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
</svg>`;
}

const SPLASH_SIZES = [
  { dir: 'drawable-mdpi',    w: 320,  h: 480  },
  { dir: 'drawable-hdpi',    w: 480,  h: 800  },
  { dir: 'drawable-xhdpi',   w: 720,  h: 1280 },
  { dir: 'drawable-xxhdpi',  w: 960,  h: 1600 },
  { dir: 'drawable-xxxhdpi', w: 1280, h: 1920 },
];

(async () => {
  console.log('\nGenerating seamless TWA splash screens (gradient only, no icon)...\n');

  for (const { dir, w, h } of SPLASH_SIZES) {
    const dirPath   = path.join(TWA_RES, dir);
    const splashPath = path.join(dirPath, 'splash.png');

    if (!fs.existsSync(dirPath)) {
      console.log(`  ⚠ Directory not found, skipping: ${dirPath}`);
      continue;
    }

    await sharp(Buffer.from(makeSplashSVG(w, h)))
      .resize(w, h)
      .png()
      .toFile(splashPath);

    console.log(`  ✓ ${dir}/splash.png  (${w}×${h})`);
  }

  console.log('\n✅ Splash screens replaced with clean gradient background');
  console.log('   Native splash → web animated cart — seamless transition\n');
  console.log('   Now run in c:\\eshop-twa:');
  console.log('   .\\gradlew.bat assembleRelease\n');
})();
