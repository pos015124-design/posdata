#!/usr/bin/env node
/**
 * Quick smoke check for public storefront + health APIs after deploy.
 * Usage:
 *   node scripts/smoke-public-api.mjs
 *   node scripts/smoke-public-api.mjs https://your-api.onrender.com
 *   API_URL=https://... node scripts/smoke-public-api.mjs
 */

const base = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

const paths = [
  ['/health', 'Health'],
  ['/api/public/products?limit=2', 'Marketplace products'],
  ['/api/public/categories', 'Marketplace categories'],
  ['/api/public/stores?limit=2', 'Store directory']
];

let failed = false;

async function run() {
  console.log(`Smoke test against ${base}\n`);

  for (const [path, label] of paths) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url);
      const ok = res.ok;
      const ct = res.headers.get('content-type') || '';
      const json = ct.includes('application/json');
      let preview = '';
      if (json) {
        const body = await res.json();
        preview =
          typeof body.products !== 'undefined'
            ? `${body.products?.length ?? 0} products`
            : typeof body.categories !== 'undefined'
              ? `${body.categories?.length ?? 0} categories`
              : typeof body.data !== 'undefined' && body.data?.stores
                ? `${body.data.stores?.length ?? 0} stores`
                : body.status || 'ok';
      } else {
        preview = `(non-JSON: ${ct})`;
      }
      if (!ok) failed = true;
      console.log(`${ok ? '✓' : '✗'} ${label} ${res.status} ${preview}`);
    } catch (e) {
      failed = true;
      console.log(`✗ ${label} ERROR ${e.message}`);
    }
  }

  console.log(failed ? '\nSome checks failed.' : '\nAll checks completed.');
  process.exit(failed ? 1 : 0);
}

run();
