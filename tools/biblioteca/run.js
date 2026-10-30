#!/usr/bin/env node
// Biblioteca de vistas: captura cada pantalla de una demo (1440×900, DPR 1, estilo por defecto
// de la app y disposición "clásica") y escribe biblioteca/img/<app>/*.webp + biblioteca/data/<app>.json.
//
//   node tools/biblioteca/run.js automotora                 → todas las vistas del manifiesto
//   node tools/biblioteca/run.js automotora --only=home,login  → solo esas (se mezclan en el JSON existente)
//   opciones: --port=8850  --no-mobile  --no-looks  --headed
//
// Falla (código 1) ante errores de página, errores de consola, peticiones locales fallidas o
// elementos que no aparecen; deja una captura del problema en tools/biblioteca/errors/.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const name = args.find(a => !a.startsWith('--'));
if (!name) { console.error('Uso: node tools/biblioteca/run.js <app> [--only=id1,id2] [--port=8850] [--no-mobile] [--no-looks]'); process.exit(1); }
const manifestFile = path.join(__dirname, 'apps', name + '.js');
if (!fs.existsSync(manifestFile)) { console.error(`No existe ${path.relative(ROOT, manifestFile)}`); process.exit(1); }

const M = require(manifestFile);
const port = +opt('port', 8850);
const only = opt('only', '') ? opt('only').split(',').map(s => s.trim()).filter(Boolean) : null;
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const Q = { full: 78, thumb: 72, look: 76 };
const THUMB_W = 480, LOOK_W = 960;
const imgDir = path.join(ROOT, 'biblioteca', 'img', name);
const dataFile = path.join(ROOT, 'biblioteca', 'data', name + '.json');
const errDir = path.join(__dirname, 'errors');
const base = `http://localhost:${port}/${M.dir}/`;

// Recursos externos que pueden fallar en entornos sin red (fuentes, mapas, CDNs): no cuentan como error.
const EXTERNAL_OK = [/fonts\.(googleapis|gstatic)\.com/, /tile\.openstreetmap|basemaps|tile\./, /cdnjs|jsdelivr|unpkg/, ...(M.ignoreErrors || [])];
const isIgnorable = s => EXTERNAL_OK.some(r => r.test(s));

// Se inyecta en cada documento antes que la app: aviso de autorrelleno ya visto, autorrelleno
// apagado (formularios deterministas), estilo/disposición fijados y CSS que congela animaciones
// y oculta la barra del portafolio y avisos flotantes.
const FREEZE_CSS = `
  .lgw-dock, .lgw-pal, .lgw-tip, .toasts { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }
  html { scroll-behavior: auto !important; }`;
function initScript({ app, theme, layout, css }) {
  try {
    localStorage.setItem('lgw:autofill-tip', '1');
    localStorage.setItem('lgw:autofill', 'off');
    if (theme) localStorage.setItem('lgw:theme:' + app, theme); else localStorage.removeItem('lgw:theme:' + app);
    localStorage.setItem('lgw:layout:' + app, layout || 'clasica');
  } catch (e) {}
  const add = () => { const s = document.createElement('style'); s.setAttribute('data-biblioteca', ''); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
}

const ping = () => new Promise(res => { const r = http.get(`http://localhost:${port}/${M.dir}/index.html`, x => { x.resume(); res(x.statusCode === 200); }); r.on('error', () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); });
async function ensureServer() {
  if (await ping()) return null;
  const p = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await ping()); i++) await new Promise(r => setTimeout(r, 150));
  if (!(await ping())) { p.kill(); throw new Error(`No se pudo levantar el servidor estático en el puerto ${port}`); }
  return p;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rel = u => u.replace(base, '');

/** Ayudantes que reciben los pasos `setup` del manifiesto. */
function helpers(page) {
  const loc = s => typeof s === 'string' ? page.locator(s).first() : s;
  return {
    page,
    loc,
    async wait(sel, state = 'visible') { await loc(sel).waitFor({ state, timeout: 10000 }); },
    async click(sel, o = {}) { const l = loc(sel); await l.waitFor({ state: 'visible', timeout: 10000 }); await l.click(o); await sleep(o.after ?? 250); },
    async fill(sel, v) { const l = loc(sel); await l.waitFor({ state: 'visible', timeout: 10000 }); await l.fill(String(v)); await l.dispatchEvent('input'); await l.dispatchEvent('change'); },
    async select(sel, v) { const l = loc(sel); await l.waitFor({ state: 'visible', timeout: 10000 }); await l.selectOption(v); await sleep(150); },
    async check(sel) { await loc(sel).check(); },
    async scrollTo(sel, block = 'start', offset = 0) {
      await loc(sel).waitFor({ state: 'attached', timeout: 10000 });
      await loc(sel).evaluate((el, [b, o]) => { el.scrollIntoView({ block: b }); if (o) window.scrollBy(0, o); }, [block, offset]);
      await sleep(200);
    },
    async modal(sel = '.modal-backdrop .modal') { await loc(sel).waitFor({ state: 'visible', timeout: 10000 }); await sleep(250); },
    async hover(sel) { await loc(sel).hover(); },
    /** Navega a otra ruta de la app (relativa a la carpeta) y espera a que se asiente. */
    async goto(u, waitFor) { await page.goto(base + u, { waitUntil: 'load' }); await settle(page); if (waitFor) await loc(waitFor).waitFor({ state: 'visible', timeout: 10000 }); },
    /** Cambia de usuario dentro del mismo contexto (los datos creados antes se conservan). */
    async login(uid) { await loginAs(page, uid); await settle(page); },
    here: () => rel(page.url()),
    pause: sleep
  };
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(200);
}

async function loginAs(page, uid) {
  await page.goto(base + 'login.html', { waitUntil: 'load' });
  const btn = page.locator(`.demo-account[data-id="${uid}"]`);
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await Promise.all([page.waitForEvent('load', { timeout: 15000 }), btn.click()]);
}

async function encode(png, out, { width, quality }) {
  let img = sharp(png);
  if (width) img = img.resize({ width, withoutEnlargement: true });
  await img.webp({ quality, effort: 6, smartSubsample: true }).toFile(out);
  return fs.statSync(out).size;
}

/**
 * Abre una vista en un contexto limpio (base local recién sembrada), ejecuta sus pasos y devuelve la
 * captura en PNG. Lanza un error con captura si algo falla.
 */
async function shoot(browser, v, { viewport, mobile = false, theme = null, layout = 'clasica', label }) {
  const context = await browser.newContext({
    viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'es-CL', timezoneId: 'America/Santiago',
    reducedMotion: 'reduce', colorScheme: 'light'
  });
  await context.addInitScript(initScript, { app: M.dataApp || M.dir, theme, layout, css: FREEZE_CSS });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !isIgnorable(m.text() + ' ' + (m.location()?.url || ''))) errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => { const u = r.url(); if (u.startsWith(`http://localhost:${port}/`) && !isIgnorable(u)) errors.push(`request: ${r.failure()?.errorText} ${u}`); });
  page.on('response', r => { const u = r.url(); if (u.startsWith(`http://localhost:${port}/`) && r.status() >= 400) errors.push(`HTTP ${r.status()} ${u}`); });
  page.on('dialog', d => { errors.push(`dialog inesperado: ${d.message()}`); d.dismiss().catch(() => {}); });
  page.on('popup', p => p.close().catch(() => {}));
  try {
    if (v.login) await loginAs(page, v.login);
    await page.goto(base + v.url, { waitUntil: 'load' });
    if (v.url.includes('#')) await page.waitForFunction(h => location.hash === h || location.hash.startsWith(h.split('?')[0]), '#' + v.url.split('#')[1], { timeout: 5000 }).catch(() => {});
    await settle(page);
    if (v.waitFor) await helpers(page).wait(v.waitFor);
    let openUrl = null;
    if (v.setup) { const r = await v.setup(helpers(page), { mobile }); if (r && r.url) openUrl = r.url; }
    if (v.checkFor) await helpers(page).wait(v.checkFor);
    await settle(page);
    if (!v.keepScroll && !v.setup) await page.evaluate(() => window.scrollTo(0, 0));
    if (!v.keepFocus) await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await page.mouse.move(viewport.width - 2, viewport.height - 2);
    await sleep(150);
    if (errors.length) throw new Error(errors.join('\n'));
    const png = await page.screenshot({ type: 'png' });
    const finalUrl = rel(page.url());
    return { png, finalUrl, openUrl };
  } catch (e) {
    fs.mkdirSync(errDir, { recursive: true });
    const shot = path.join(errDir, `${name}-${label}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    const err = new Error(`${label}: ${(e.message || String(e)).split('\n').slice(0, 6).join('\n  ')}\n  URL: ${rel(page.url())}\n  Captura: ${path.relative(ROOT, shot)}`);
    throw err;
  } finally {
    await context.close();
  }
}

(async () => {
  const t0 = Date.now();
  const views = M.views.filter(v => !only || only.includes(v.id));
  if (only && views.length !== only.length) { console.error('Ids desconocidos: ' + only.filter(id => !M.views.some(v => v.id === id)).join(', ')); process.exit(1); }
  const ids = new Set();
  for (const v of M.views) {
    if (ids.has(v.id)) throw new Error('id repetido: ' + v.id);
    ids.add(v.id);
    for (const k of ['id', 'title', 'section', 'url', 'description']) if (!v[k]) throw new Error(`La vista ${v.id || '?'} no tiene "${k}"`);
    if (!M.sections.some(s => s.id === v.section)) throw new Error(`La vista ${v.id} usa una sección desconocida: ${v.section}`);
    if (!Array.isArray(v.actions) || v.actions.length < 3 || v.actions.length > 6) throw new Error(`La vista ${v.id} debe tener entre 3 y 6 acciones`);
  }
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!only) fs.rmSync(errDir, { recursive: true, force: true });

  const server = await ensureServer();
  const browser = await chromium.launch({ headless: !flag('headed') });
  const prev = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : null;
  const results = new Map((prev?.views || []).map(v => [v.id, v]));
  const failures = [];
  let bytes = 0;

  for (const [i, v] of views.entries()) {
    process.stdout.write(`[${String(i + 1).padStart(2)}/${views.length}] ${v.id.padEnd(28)} `);
    try {
      const d = await shoot(browser, v, { viewport: DESKTOP, label: v.id });
      bytes += await encode(d.png, path.join(imgDir, `${v.id}.webp`), { quality: Q.full });
      bytes += await encode(d.png, path.join(imgDir, `${v.id}-thumb.webp`), { width: THUMB_W, quality: Q.thumb });
      let mobile = null;
      if (v.mobile && !flag('no-mobile')) {
        const m = await shoot(browser, v, { viewport: MOBILE, mobile: true, label: v.id + '-mobile' });
        bytes += await encode(m.png, path.join(imgDir, `${v.id}-m.webp`), { quality: Q.full });
        mobile = `img/${name}/${v.id}-m.webp`;
      } else if (fs.existsSync(path.join(imgDir, `${v.id}-m.webp`)) && !v.mobile) fs.rmSync(path.join(imgDir, `${v.id}-m.webp`));
      const acc = v.login ? M.accounts[v.login] : null;
      results.set(v.id, {
        id: v.id, title: v.title, section: v.section, roles: v.roles || null,
        url: v.openUrl || d.openUrl || v.url, capturedUrl: d.finalUrl,
        login: acc ? { id: v.login, name: acc.name, role: acc.role, email: acc.email, password: acc.password } : null,
        kind: v.kind || 'page', from: v.from || null,
        description: v.description, actions: v.actions,
        img: `img/${name}/${v.id}.webp`, thumb: `img/${name}/${v.id}-thumb.webp`, mobile,
        w: DESKTOP.width, h: DESKTOP.height
      });
      console.log('✓' + (mobile ? ' (+celular)' : ''));
    } catch (e) {
      console.log('✖');
      failures.push(e.message);
      console.error('  ' + e.message);
    }
  }

  // "Elige el look de tu proyecto": la portada en 3 disposiciones y en algunos de los 30 estilos.
  let looks = prev?.looks || null;
  if (M.looks && !flag('no-looks') && !only) {
    looks = { title: M.looks.title, note: M.looks.note, items: [] };
    for (const L of M.looks.items) {
      process.stdout.write(`[look] ${L.id.padEnd(30)} `);
      try {
        const d = await shoot(browser, { id: L.id, url: M.looks.url, waitFor: M.looks.waitFor }, { viewport: DESKTOP, theme: L.theme || null, layout: L.layout || 'clasica', label: 'look-' + L.id });
        bytes += await encode(d.png, path.join(imgDir, `look-${L.id}.webp`), { width: LOOK_W, quality: Q.look });
        looks.items.push({ id: L.id, group: L.group, label: L.label, desc: L.desc, img: `img/${name}/look-${L.id}.webp` });
        console.log('✓');
      } catch (e) { console.log('✖'); failures.push(e.message); console.error('  ' + e.message); }
    }
  }

  await browser.close();
  if (server) server.kill();

  // Orden del manifiesto; descarta entradas que ya no existen en él.
  const ordered = M.views.map(v => results.get(v.id)).filter(Boolean);
  const used = new Set(M.views.map(v => v.id));
  const data = {
    app: name, dir: M.dir, name: M.name, kind: M.kind, description: M.description,
    demo: `../${M.dir}/index.html`, theme: M.theme, layout: 'clasica',
    generatedAt: new Date().toISOString(), viewport: DESKTOP, mobileViewport: MOBILE,
    sections: M.sections.filter(s => ordered.some(v => v.section === s.id)),
    views: ordered, looks
  };
  if (failures.length && !only) {
    console.error(`\n✖ ${failures.length} vista(s) fallaron; no se escribe ${path.relative(ROOT, dataFile)}.`);
    process.exit(1);
  }
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2) + '\n');
  // Índice de apps con biblioteca (la página lo lee para saber cuáles están disponibles).
  const indexFile = path.join(path.dirname(dataFile), 'index.json');
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { apps: {} };
  index.apps[name] = { views: ordered.length, sections: data.sections.length, generatedAt: data.generatedAt };
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
  // Limpia imágenes huérfanas (vistas eliminadas del manifiesto).
  if (!only) for (const f of fs.readdirSync(imgDir)) {
    const id = f.replace(/(-thumb|-m)?\.webp$/, '');
    if (!f.startsWith('look-') && !used.has(id)) fs.rmSync(path.join(imgDir, f));
  }
  const total = fs.readdirSync(imgDir).reduce((s, f) => s + fs.statSync(path.join(imgDir, f)).size, 0);
  console.log(`\n${ordered.length} vistas · ${looks?.items.length || 0} looks · imágenes de ${name}: ${(total / 1048576).toFixed(2)} MB (${fs.readdirSync(imgDir).length} archivos) · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`→ ${path.relative(ROOT, dataFile)}`);
  if (failures.length) { console.error(`✖ ${failures.length} fallo(s)`); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
