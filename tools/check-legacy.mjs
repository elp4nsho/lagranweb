#!/usr/bin/env node
// Humo de regresión de las 32 webs del portafolio: abre portada y login de cada una, entra con la
// primera cuenta demo y verifica que no haya errores de página ni de consola.
//
//   python3 -m http.server 8890 &    node tools/check-legacy.mjs [--base=http://localhost:8890] [--only=taller,polla]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const BASE = arg('base', 'http://localhost:8890');
const only = arg('only', '').split(',').filter(Boolean);
const src = fs.readFileSync(path.join(ROOT, 'projects.js'), 'utf8');
const dirs = [...src.matchAll(/dir: '([^']+)'/g)].map(m => m[1]).filter(d => !only.length || only.includes(d));
const ignorable = s => /fonts\.(googleapis|gstatic)|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|ERR_TUNNEL|Failed to load resource|favicon|three|unpkg|jsdelivr|cdnjs|tile|openstreetmap/i.test(s);

const browser = await chromium.launch();
let bad = 0;
for (const dir of dirs) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text() + ' ' + (m.location()?.url || ''))) errors.push('console: ' + m.text().slice(0, 160)); });
  const steps = [];
  try {
    await page.goto(`${BASE}/${dir}/index.html`, { waitUntil: 'load' }); await page.waitForTimeout(500);
    steps.push('home');
    await page.goto(`${BASE}/${dir}/login.html`, { waitUntil: 'load' }); await page.waitForTimeout(400);
    steps.push('login');
    const demo = page.locator('.demo-account').first();
    if (await demo.count()) {
      await Promise.all([page.waitForURL(u => !String(u).includes('login.html'), { timeout: 6000 }).catch(() => {}), demo.click()]);
      await page.waitForTimeout(900);
      steps.push('demo→' + page.url().replace(BASE + '/' + dir + '/', ''));
    }
  } catch (e) { errors.push('nav: ' + e.message.slice(0, 160)); }
  if (errors.length) { bad++; console.log(`✗ ${dir} (${steps.join(' · ')})\n    ${[...new Set(errors)].join('\n    ')}`); }
  else console.log(`✓ ${dir} (${steps.join(' · ')})`);
  await ctx.close();
}
await browser.close();
console.log(`\n${dirs.length} webs · ${bad} con errores`);
process.exit(bad ? 1 : 0);
