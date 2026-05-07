const fs = require('fs');
const path = require('path');

function makeSVG(size) {
  const r = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.42);
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

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), makeSVG(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), makeSVG(512));
// Also write PNG placeholders as SVG with .png extension — browsers handle SVG fine
// vite-plugin-pwa will use these
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), makeSVG(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), makeSVG(512));
console.log('Icons generated in client/public/');
