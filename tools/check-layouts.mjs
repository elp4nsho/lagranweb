#!/usr/bin/env node
// Revisión automática de las DISPOSICIONES (layouts) en todas las webs del portafolio.
//
//   python3 -m http.server 8872          (desde la raíz del repo, en otra terminal)
//   node tools/check-layouts.mjs                      → todas las webs × todas las disposiciones × 2 tamaños
//   opciones: --apps=tienda,blog  --layouts=portal,documento  --vp=desktop,mobile
//             --styles=rotate|all  (rotate: cada página usa uno de 3 estilos contrastados, rotando;
//                                   all: las 3 páginas en los 3 estilos)
//             --port=8872  --out=/ruta/salida  --concurrency=6  --no-sheet  --no-shots
//
// Por cada web abre: portada pública, una página interior y el panel (con una cuenta demo de
// administración), a 1440×900 y 375×812. Falla (código 1) si hay errores de página o de consola,
// peticiones locales fallidas, desborde horizontal o si el menú no es alcanzable. Escribe
// <out>/report.json y una hoja de contactos por web en <out>/sheets/<web>.jpg
// (filas = disposiciones, columnas = páginas × tamaños).
//
// La lista de disposiciones sale del registro (window.LGWLayout.list en theme-boot.js): una
// disposición nueva se revisa sola. Las webs salen de los manifiestos de tools/biblioteca/apps/
// (solo se leen) más la landing y la biblioteca.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = n => args.includes('--' + n);
const PORT = +opt('port', 8872);
const BASE = `http://localhost:${PORT}/`;
const OUT = path.resolve(opt('out', path.join(os.tmpdir(), 'lgw-check-layouts')));
const CONC = +opt('concurrency', 6);
const STYLES = [['oscuro', 'noir'], ['claro', 'aurora'], ['html5', 'bootstrap2']];
const VPS = {
  desktop: { viewport: { width: 1440, height: 900 }, isMobile: false },
  mobile: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }
};
const EXTERNAL_OK = [/fonts\.(googleapis|gstatic)\.com/, /tile\.openstreetmap|basemaps|tile\./, /cdnjs|jsdelivr|unpkg|esm\.sh|googleapis|gstatic|youtube|vimeo/i, /ERR_NAME_NOT_RESOLVED|ERR_TUNNEL|ERR_CONNECTION|ERR_PROXY|ERR_CERT|net::ERR_FAILED/];
const ignorable = s => EXTERNAL_OK.some(r => r.test(s));

// ---------- Webs a revisar ----------
const ADMIN_ROLE = /^(Administrador|Dirección|Admin)/i;
function targets() {
  const list = [
    { id: 'landing', dir: '', app: 'portal', pages: { home: 'index.html', inner: 'index.html#proyectos' } },
    { id: 'biblioteca', dir: 'biblioteca/', app: 'biblioteca', pages: { home: 'index.html', inner: 'index.html#sistemas' } }
  ];
  const mdir = path.join(ROOT, 'tools/biblioteca/apps');
  const INNER = { condominio: 'login.html', crm: 'login.html', iot: 'login.html', pos: 'login.html', streaming: 'login.html', fintech: 'abrir-cuenta.html', induccion: 'verificar.html?c=MA-RAP-2025-7QX4K', producto: 'checkout.html' };
  for (const f of fs.existsSync(mdir) ? fs.readdirSync(mdir).filter(f => f.endsWith('.js')).sort() : []) {
    let M; try { M = require(path.join(mdir, f)); } catch (e) { console.warn('manifiesto ilegible', f, e.message); continue; }
    const pub = M.views.filter(v => v.section === 'publico' && !v.login && !v.setup && /^index\.html/.test(v.url));
    const home = pub[0]?.url || 'index.html';
    const inner = INNER[M.dir] || pub.find(v => v.url !== home)?.url || 'login.html';
    const accs = Object.entries(M.accounts || {});
    const admin = (accs.find(([, a]) => ADMIN_ROLE.test(a.role)) || accs[0] || [])[0];
    const adminView = M.views.find(v => /^admin\.html/.test(v.url) && !v.setup && (!admin || v.login === admin)) || M.views.find(v => /^admin\.html/.test(v.url));
    list.push({ id: M.dir, dir: M.dir + '/', app: M.dataApp || M.dir, admin, pages: { home, inner, admin: adminView ? adminView.url.split(' ')[0] : 'admin.html' } });
  }
  const only = opt('apps', '');
  return only ? list.filter(t => only.split(',').includes(t.id)) : list;
}

// ---------- Utilidades ----------
const FREEZE = `*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; caret-color: transparent !important; } html { scroll-behavior: auto !important; }`;
function init({ app, theme, layout, session, css }) {
  try {
    localStorage.setItem('lgw:autofill-tip', '1');
    localStorage.setItem('lgw:autofill', 'off');
    localStorage.setItem('lgw:theme:' + app, theme);
    localStorage.setItem('lgw:layout:' + app, layout);
    if (session) session.forEach(([k, v]) => localStorage.setItem(k, v));
  } catch (e) {}
  const add = () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); };
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
  await sleep(350);
}

// Mide desborde horizontal y si el menú se puede alcanzar.
function probe(kind) {
  const W = innerWidth, H = innerHeight;
  const sw = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const out = { overflow: sw - W > 1 ? sw - W : 0, culprits: [], nav: false, how: '', dockCovers: [] };
  if (out.overflow) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.lgw-pal')) {
        const pr = el.parentElement && el.parentElement.getBoundingClientRect();
        if (!pr || pr.right <= W + 1) out.culprits.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '') + ` (${Math.round(r.right - W)}px)`);
        if (out.culprits.length >= 4) break;
      }
    }
  }
  const visible = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), W - 1), y = r.top + r.height / 2;
    if (r.right < 0 || r.left > W) return false;
    if (y < 0 || y > H) return true; // fuera de pantalla vertical pero en el documento: alcanzable con scroll
    const hit = document.elementFromPoint(x, y);
    return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
  };
  const sel = kind === 'admin' ? '.admin-sidebar .nav-link' : '.site-nav a, .site-nav button, .site-header .mobile-nav a';
  const links = [...document.querySelectorAll(sel)];
  const vis = links.filter(visible);
  if (vis.length) { out.nav = true; out.how = `${vis.length}/${links.length} enlaces visibles`; }
  else {
    const t = [...document.querySelectorAll(kind === 'admin' ? '.admin-burger' : '.site-header [class*="burger"], .site-header .nav-toggle, .site-header .menu-toggle, .site-header .mobile-nav-btn, .site-header button[aria-label*="enú" i], .site-header button[aria-controls]')].find(visible);
    if (t) { out.nav = true; out.how = 'botón de menú'; }
    else if (!links.length) { out.nav = true; out.how = 'sin menú (página sin navegación)'; }
  }
  // ¿La barra del portafolio (abajo a la izquierda) tapa algún enlace del menú?
  const dock = document.querySelector('.lgw-dock');
  if (dock) {
    const d = dock.getBoundingClientRect();
    for (const el of links) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > d.left && r.left < d.right && r.bottom > d.top && r.top < d.bottom) out.dockCovers.push((el.textContent || '').trim().slice(0, 20));
    }
  }
  return out;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

// ---------- Programa ----------
const browser = await chromium.launch();
const T = targets();
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'sheets'), { recursive: true });

// Disposiciones del registro.
const p0 = await browser.newPage();
try { await p0.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 15000 }); }
catch (e) { console.error(`No responde ${BASE}. Levanta el servidor: python3 -m http.server ${PORT}`); process.exit(2); }
let LAYOUTS = await p0.evaluate(() => window.LGWLayout.list.map(l => ({ id: l.id, name: l.name })));
await p0.close();
if (opt('layouts', '')) LAYOUTS = LAYOUTS.filter(l => opt('layouts').split(',').includes(l.id));
const VPN = opt('vp', 'desktop,mobile').split(',');

// Sesión de administración de cada web (se entra una vez con el botón demo y se reutiliza).
await pool(T.filter(t => t.pages.admin), CONC, async t => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + t.dir + 'login.html', { waitUntil: 'load' });
    const btn = t.admin ? page.locator(`.demo-account[data-id="${t.admin}"]`) : page.locator('.demo-account').first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await Promise.all([page.waitForEvent('load', { timeout: 15000 }).catch(() => {}), btn.click()]);
    await sleep(300);
    t.session = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('lgw:session:')).map(k => [k, localStorage.getItem(k)]));
  } catch (e) { t.loginError = e.message; }
  await ctx.close();
});

const jobs = [];
const styleSets = flag('styles=all') || opt('styles') === 'all' ? [0, 1, 2] : null;
for (const t of T) LAYOUTS.forEach((l, li) => VPN.forEach((vp, vi) => Object.keys(t.pages).forEach((pg, pi) => {
  const sts = styleSets || [(li + pi + vi) % 3];
  for (const si of sts) jobs.push({ t, l, vp, pg, url: t.pages[pg], style: STYLES[si] });
})));
console.log(`${T.length} webs × ${LAYOUTS.length} disposiciones × ${VPN.length} tamaños → ${jobs.length} páginas`);

const results = [];
let done = 0;
await pool(jobs, CONC, async job => {
  const { t, l, vp, pg, url, style } = job;
  const ctx = await browser.newContext({ ...VPS[vp], deviceScaleFactor: 1, locale: 'es-CL', timezoneId: 'America/Santiago', reducedMotion: 'reduce' });
  await ctx.addInitScript(init, { app: t.app, theme: style[1], layout: l.id, session: pg === 'admin' ? t.session : null, css: FREEZE });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const s = m.text() + ' ' + (m.location()?.url || ''); if (!ignorable(s)) errors.push('console: ' + m.text().slice(0, 200)); } });
  page.on('requestfailed', r => { const u = r.url(); if (u.startsWith(BASE) && !ignorable(u)) errors.push(`request: ${r.failure()?.errorText} ${u}`); });
  const res = { app: t.id, layout: l.id, vp, page: pg, style: style[1], url, errors };
  try {
    await page.goto(BASE + t.dir + url, { waitUntil: 'load', timeout: 20000 });
    if (pg === 'admin') await page.locator('.admin-sidebar .nav-link').first().waitFor({ state: 'attached', timeout: 6000 }).catch(() => errors.push('panel: no aparecen enlaces .nav-link (¿sesión?) ' + page.url()));
    await settle(page);
    const lay = await page.evaluate(() => document.documentElement.getAttribute('data-layout'));
    if (lay !== l.id) errors.push(`data-layout = ${lay} (se esperaba ${l.id})`);
    Object.assign(res, await page.evaluate(probe, pg === 'admin' ? 'admin' : 'public'));
    if (res.overflow) errors.push(`desborde horizontal ${res.overflow}px: ${res.culprits.join(', ')}`);
    if (!res.nav) errors.push('menú no alcanzable');
    if (!flag('no-shots')) {
      res.shot = path.join('shots', `${t.id}__${l.id}__${vp}__${pg}.jpg`);
      await page.screenshot({ path: path.join(OUT, res.shot), type: 'jpeg', quality: 62 });
    }
  } catch (e) { errors.push('fallo: ' + e.message.split('\n')[0]); }
  await ctx.close();
  results.push(res);
  done++;
  if (errors.length) console.log(`✗ ${t.id} · ${l.id} · ${vp} · ${pg} · ${style[1]}\n    ${errors.join('\n    ')}`);
  else if (done % 50 === 0) console.log(`  ${done}/${jobs.length}`);
});

// ---------- Hojas de contactos ----------
if (!flag('no-sheet') && !flag('no-shots')) {
  const cols = VPN.flatMap(vp => ['home', 'inner', 'admin'].map(pg => [vp, pg]));
  for (const t of T) {
    const cell = (l, vp, pg) => {
      const r = results.find(x => x.app === t.id && x.layout === l.id && x.vp === vp && x.page === pg && x.shot);
      if (!r) return '<td></td>';
      const w = vp === 'desktop' ? 300 : 104;
      return `<td class="${r.errors.length ? 'bad' : ''}"><img src="file://${path.join(OUT, r.shot)}" width="${w}"><small>${r.style}${r.errors.length ? ' · ✗ ' + r.errors.length : ''}</small></td>`;
    };
    const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#111;color:#ddd;font:12px system-ui}h1{font-size:16px;margin:0 0 8px}table{border-collapse:collapse}td,th{padding:4px;vertical-align:top;text-align:left}th{font-weight:600;color:#9ab}img{display:block;border:1px solid #333}small{display:block;color:#889;margin-top:2px}td.bad img{outline:3px solid #f33}</style>
      <h1>${t.id} · disposiciones</h1><table><tr><th></th>${cols.map(([vp, pg]) => `<th>${pg} · ${vp === 'desktop' ? '1440' : '375'}</th>`).join('')}</tr>
      ${LAYOUTS.map(l => `<tr><th>${l.name}</th>${cols.map(([vp, pg]) => cell(l, vp, pg)).join('')}</tr>`).join('')}</table>`;
    const f = path.join(OUT, 'sheets', t.id + '.html');
    fs.writeFileSync(f, html);
    const p = await browser.newPage({ viewport: { width: 1400, height: 800 } });
    await p.goto('file://' + f, { waitUntil: 'load' });
    await p.screenshot({ path: path.join(OUT, 'sheets', t.id + '.jpg'), type: 'jpeg', quality: 80, fullPage: true });
    await p.close();
  }
}
await browser.close();

const bad = results.filter(r => r.errors.length);
const dock = results.filter(r => r.dockCovers && r.dockCovers.length);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ when: new Date().toISOString(), layouts: LAYOUTS.map(l => l.id), total: results.length, failed: bad.length, results }, null, 1));
console.log(`\n${results.length} páginas revisadas · ${bad.length} con problemas · ${dock.length} con la barra del portafolio sobre algún enlace del menú`);
for (const r of dock.slice(0, 20)) console.log(`  ⚠ barra sobre menú: ${r.app} · ${r.layout} · ${r.vp} · ${r.page}: ${r.dockCovers.join(', ')}`);
for (const t of T.filter(t => t.loginError)) console.log(`  ⚠ no se pudo entrar al panel de ${t.id}: ${t.loginError}`);
console.log(`Informe: ${path.join(OUT, 'report.json')}\nHojas:   ${path.join(OUT, 'sheets')}/`);
process.exit(bad.length ? 1 : 0);
