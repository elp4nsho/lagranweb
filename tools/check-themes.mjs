#!/usr/bin/env node
// Validador de ESTILOS (themes) de La Gran Web.
//
//   node tools/check-themes.mjs              → revisión estática (sin dependencias): registro, archivos, tokens y contraste
//   node tools/check-themes.mjs --live       → además abre kit.html en cada estilo con Playwright y mide el contraste
//                                              REAL de botones, insignias, tabla, campos, pestañas y panel admin
//   opciones: --themes=halloween,zen  --port=8874  --json  --update-baseline  --verbose
//
// Qué revisa (estático):
//   1. Registro (THEMES / THEME_GROUPS en assets/core/theme-boot.js): campos obligatorios, ids únicos,
//      grupo válido, una hoja assets/core/themes/<id>.css por estilo (salvo css: false) y ninguna hoja huérfana.
//   2. Hoja de cada estilo: todos los selectores acotados a [data-theme="<id>"] (nada que se filtre a otros
//      estilos), @keyframes con prefijo lgw-<id>-, decoraciones body::before/::after fijas, detrás del contenido
//      (z-index: -1) y sin capturar clics.
//   3. Tokens: los obligatorios declarados en el bloque [data-theme="<id>"] { … }; `dark` del registro
//      coherente con la luminancia de --bg.
//   4. Contraste WCAG AA (4,5:1) de los pares clave, calculado sobre los tokens (con alfa compuesto sobre el
//      fondo): texto/fondos, apagado/fondos, primario como enlace, texto sobre primario/acento/peligro,
//      insignias de estado (color sobre su tinte del 14 %), pestaña y enlace activo del panel. Los bloques que
//      redefinen tokens dentro de un componente (p. ej. una barra lateral oscura) se revisan como contexto propio.
//
// Falla (código 1) ante cualquier error. Los 30 estilos originales tienen contrastes bajo AA que se conservan
// a propósito (migración sin cambios visuales): están anotados en tools/check-themes.baseline.json y se informan
// como "conocidos". Un fallo nuevo, o en un estilo nuevo, hace fallar la revisión. --update-baseline reescribe
// la línea base con los fallos actuales (úsalo solo para aceptar conscientemente una excepción).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse, mix, over, contrast, luminance, toHex } from './lib/theme-color.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.join(ROOT, 'assets/core');
const BASELINE_FILE = path.join(ROOT, 'tools/check-themes.baseline.json');
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = n => args.includes('--' + n);
const AA = 4.5;

// ---------------------------------------------------------------- registro
export function readRegistry() {
  const src = fs.readFileSync(path.join(CORE, 'theme-boot.js'), 'utf8');
  const grab = name => {
    const i = src.indexOf(`var ${name} = [`);
    if (i < 0) throw new Error(`No encuentro "var ${name} = [" en theme-boot.js`);
    let j = src.indexOf('[', i), depth = 0, k = j;
    for (; k < src.length; k++) { if (src[k] === '[') depth++; else if (src[k] === ']' && --depth === 0) break; }
    return Function('"use strict"; return (' + src.slice(j, k + 1) + ');')();
  };
  return { themes: grab('THEMES'), groups: grab('THEME_GROUPS') };
}

// ---------------------------------------------------------------- CSS mínimo
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
/** Bloques de nivel superior: { prelude, body, children? } (las @media/@supports traen sus reglas en children). */
function blocks(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const prelude = css.slice(i, open).trim();
    let depth = 1, k = open + 1, q = null;
    for (; k < css.length && depth; k++) {
      const c = css[k];
      if (q) { if (c === q && css[k - 1] !== '\\') q = null; continue; }
      if (c === '"' || c === "'") q = c; else if (c === '{') depth++; else if (c === '}') depth--;
    }
    const body = css.slice(open + 1, k - 1);
    const b = { prelude, body };
    if (/^@(media|supports|layer)/.test(prelude)) b.children = blocks(body);
    out.push(b);
    i = k;
  }
  return out;
}
const flat = list => list.flatMap(b => b.children ? flat(b.children).map(c => ({ ...c, media: b.prelude })) : [b]);
function declarations(body) {
  const out = {}; let depth = 0, cur = '', q = null;
  const push = () => { const m = cur.match(/^\s*([-\w]+)\s*:\s*([\s\S]*)$/); if (m) out[m[1]] = m[2].trim(); cur = ''; };
  for (const c of body) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(') depth++; if (c === ')') depth--;
    if (c === ';' && depth === 0) { push(); continue; }
    cur += c;
  }
  push();
  return out;
}
function splitSelectors(sel) {
  const parts = []; let depth = 0, cur = '';
  for (const c of sel) { if ('(['.includes(c)) depth++; if (')]'.includes(c)) depth--; if (c === ',' && !depth) { parts.push(cur.trim()); cur = ''; continue; } cur += c; }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// ---------------------------------------------------------------- tokens → colores
function resolveVar(value, tokens, seen = new Set()) {
  let guard = 0;
  while (/var\(/.test(value) && guard++ < 20) {
    value = value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/, (_, name, fb) => {
      if (seen.has(name)) return fb || '';
      const v = tokens[name];
      return v != null ? resolveVar(v, tokens, new Set([...seen, name])) : (fb || '');
    });
  }
  return value.trim();
}
function color(value, tokens) {
  if (value == null) return null;
  const v = resolveVar(String(value), tokens);
  const cm = v.match(/^color-mix\(\s*in srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)(?:\s+[\d.]+%)?\s*\)$/);
  if (cm) { const a = color(cm[1], tokens), b = color(cm[3], tokens); return a && b ? mix(a, b, +cm[2] / 100) : null; }
  return parse(v);
}

const REQUIRED = ['--font-body', '--font-head', '--bg', '--surface', '--text', '--muted', '--line', '--primary', '--on-primary', '--accent'];
const RECOMMENDED = ['--surface-2', '--surface-3', '--on-accent', '--on-danger', '--success', '--warning', '--danger', '--info', '--radius', '--radius-sm', '--shadow', '--shadow-lg', '--focus', 'color-scheme'];

/** Pares de contraste de un contexto de tokens. Devuelve [{ pair, ratio, min }]. */
function contrastPairs(tk, scope, defined) {
  // En un contexto acotado (defined = tokens que redefine) solo se miden pares cuyos tokens redefine todos.
  const c = n => color(tk[n], tk);
  const has = (...ns) => !defined || ns.every(n => n in defined);
  const bg = c('--bg') || parse('#fff');
  const solid = n => { const x = c(n); return x ? (x.a < 1 ? over(x, n === '--bg' ? parse('#fff') : solid('--bg')) : x) : null; };
  const surf = solid('--surface'), s2 = solid('--surface-2') || surf, s3 = solid('--surface-3') || s2;
  const txt = n => { const x = c(n); return x && x.a < 1 ? over(x, surf) : x; };
  const P = [];
  const add = (pair, fg, back, min = AA, need = []) => { if (fg && back && has(...need)) P.push({ scope, pair, ratio: contrast(fg, back), min }); };
  const tint = (n, base) => over(mix(c(n), parse('transparent'), .14), base);
  if (scope === 'main') { add('texto/fondo', txt('--text'), solid('--bg')); add('apagado/fondo', txt('--muted'), solid('--bg')); add('primario/fondo (enlaces, eyebrow)', txt('--primary'), solid('--bg')); }
  add('texto/superficie', txt('--text'), surf, AA, ['--text', '--surface']);
  add('texto/superficie-2', txt('--text'), s2, AA, ['--text', '--surface-2']);
  add('texto/superficie-3', txt('--text'), s3, AA, ['--text', '--surface-3']);
  add('apagado/superficie', txt('--muted'), surf, AA, ['--muted', '--surface']);
  add('apagado/superficie-2 (encabezado de tabla)', txt('--muted'), s2, AA, ['--muted', '--surface-2']);
  add('primario/superficie (enlaces, pestaña activa)', txt('--primary'), surf, AA, ['--primary', '--surface']);
  add('primario/tinte primario (enlace activo del panel, insignia)', txt('--primary'), tint('--primary', surf), AA, ['--primary', '--surface']);
  add('sobre-primario/primario (botón, chip activo)', c('--on-primary'), solid('--primary'), AA, ['--on-primary', '--primary']);
  if (scope === 'main') {
    add('sobre-acento/acento (botón acento)', c('--on-accent'), solid('--accent'));
    add('sobre-peligro/peligro (botón peligro)', c('--on-danger') || parse('#fff'), solid('--danger'));
    for (const s of ['success', 'warning', 'danger', 'info']) if (tk['--' + s]) {
      add(`${s}/tinte ${s} (insignia)`, txt('--' + s), tint('--' + s, surf));
      add(`${s}/tinte ${s} sobre el fondo de página (insignia)`, txt('--' + s), tint('--' + s, solid('--bg')));
    }
    add('primario/tinte primario sobre el fondo de página (insignia)', txt('--primary'), tint('--primary', solid('--bg')));
    add('peligro/superficie (texto de error)', txt('--danger'), surf);
  }
  return P;
}

// ---------------------------------------------------------------- revisión estática
export function staticCheck({ only, legacy = new Set() } = {}) {
  const errors = [], warnings = [], fails = [];
  const { themes, groups } = readRegistry();
  const err = (id, m) => errors.push(`${id}: ${m}`), warn = (id, m) => warnings.push(`${id}: ${m}`);
  const gids = new Set(groups.map(g => g.id));
  const seen = new Set();
  for (const t of themes) {
    for (const f of ['id', 'name', 'group', 'desc', 'sw']) if (t[f] == null || t[f] === '') err(t.id || '?', `falta el campo "${f}" en el registro`);
    if (typeof t.dark !== 'boolean') err(t.id, 'falta "dark" (true/false) en el registro');
    if (!/^[a-z0-9-]+$/.test(t.id)) err(t.id, 'id inválido (solo minúsculas, números y guiones)');
    if (seen.has(t.id)) err(t.id, 'id repetido'); seen.add(t.id);
    if (!gids.has(t.group)) err(t.id, `grupo "${t.group}" no existe en THEME_GROUPS`);
    if (!Array.isArray(t.sw) || t.sw.length !== 3 || t.sw.some(x => !parse(x))) err(t.id, 'sw debe ser [fondo, primario, acento] en hex');
    if (typeof t.fonts !== 'string') err(t.id, 'fonts debe ser texto ("" para fuentes del sistema)');
  }
  const files = fs.readdirSync(path.join(CORE, 'themes')).filter(f => f.endsWith('.css'));
  for (const f of files) if (!seen.has(f.slice(0, -4)) || themes.find(t => t.id === f.slice(0, -4)).css === false) err(f, 'hoja huérfana: no hay estilo con ese id en el registro (o tiene css: false)');

  const baseTokens = declarations((blocks(stripComments(fs.readFileSync(path.join(CORE, 'themes.css'), 'utf8'))).find(b => b.prelude === ':root') || {}).body || '');

  for (const t of themes) {
    if (only && !only.includes(t.id)) continue;
    let tokens = { ...baseTokens }, own = {}, contexts = [];
    if (t.css !== false) {
      const file = path.join(CORE, 'themes', t.id + '.css');
      if (!fs.existsSync(file)) { err(t.id, `falta la hoja assets/core/themes/${t.id}.css`); continue; }
      const css = stripComments(fs.readFileSync(file, 'utf8'));
      const tag = `[data-theme="${t.id}"]`;
      for (const b of flat(blocks(css))) {
        if (/^@keyframes/.test(b.prelude)) {
          const name = b.prelude.replace(/^@keyframes\s+/, '').trim();
          if (!name.startsWith(`lgw-${t.id}-`) && !legacy.has(t.id)) warn(t.id, `@keyframes "${name}" sin prefijo lgw-${t.id}- (puede chocar con otro estilo)`);
          continue;
        }
        if (/^@font-face|^@import/.test(b.prelude)) { err(t.id, `${b.prelude.split(/\s/)[0]} no va en la hoja del estilo (las fuentes se declaran en el registro)`); continue; }
        for (const s of splitSelectors(b.prelude)) {
          if (!s.includes(tag)) err(t.id, `selector sin acotar a ${tag}: "${s}"`);
          const others = [...s.matchAll(/\[data-theme="([\w-]+)"\]/g)].map(m => m[1]).filter(x => x !== t.id);
          if (others.length) err(t.id, `selector que toca otro estilo (${others.join(', ')}): "${s}"`);
        }
        const d = declarations(b.body);
        const sels = splitSelectors(b.prelude);
        if (!b.media && sels.length === 1 && (sels[0] === tag || sels[0] === `:root${tag}`)) Object.assign(own, d);
        else if (!b.media && Object.keys(d).some(k => ['--text', '--surface', '--bg'].includes(k))) contexts.push({ scope: sels.map(s => s.replace(tag, '').trim()).join(', '), d });
        // Decoraciones en body::before / ::after: fijas o absolutas, detrás y sin capturar clics.
        if (sels.some(s => /body::(before|after)/.test(s)) && d.content != null) {
          if (!/fixed|absolute/.test(d.position || '')) err(t.id, `${b.prelude}: la decoración debe ser position: fixed (o absolute)`);
          if (d['pointer-events'] !== 'none') err(t.id, `${b.prelude}: la decoración necesita pointer-events: none`);
          if (d['z-index'] !== '-1') err(t.id, `${b.prelude}: la decoración debe ir detrás del contenido (z-index: -1)`);
        }
      }
      // Los estilos que comparten una regla de decoración (body::before, body::after { … }) se validan arriba.
      Object.assign(tokens, own);
    }
    for (const r of REQUIRED) if (t.css !== false && own[r] == null) err(t.id, `falta el token obligatorio ${r}`);
    if (!legacy.has(t.id)) for (const r of RECOMMENDED) if (t.css !== false && own[r] == null) warn(t.id, `no define ${r} (hereda el de Aurora)`);
    const bg = color(tokens['--bg'], tokens);
    if (bg) {
      const darkBg = luminance(bg) < 0.2;
      if (darkBg !== t.dark) err(t.id, `"dark: ${t.dark}" no coincide con --bg ${toHex(bg)} (luminancia ${luminance(bg).toFixed(2)})`);
      if (own['color-scheme'] && (own['color-scheme'] === 'dark') !== t.dark) warn(t.id, `color-scheme: ${own['color-scheme']} no coincide con dark: ${t.dark}`);
    }
    const pairs = contrastPairs(tokens, 'main');
    for (const ctx of contexts) pairs.push(...contrastPairs({ ...tokens, ...ctx.d }, ctx.scope, ctx.d));
    for (const p of pairs) if (p.ratio < p.min) fails.push({ id: t.id, key: `${t.id} · ${p.scope === 'main' ? '' : p.scope + ' · '}${p.pair}`, ratio: p.ratio, min: p.min });
  }
  return { themes, groups, errors, warnings, fails };
}

// ---------------------------------------------------------------- revisión en vivo (Playwright)
async function liveCheck(themes, port) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) {
    try { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); } catch (e2) { throw new Error('--live necesita Playwright (npm i -g playwright)'); }
  }
  const { spawn } = await import('child_process');
  const http = await import('http');
  const ping = () => new Promise(r => { const q = http.get(`http://localhost:${port}/assets/core/kit.html`, x => { x.resume(); r(x.statusCode === 200); }); q.on('error', () => r(false)); q.setTimeout(1000, () => { q.destroy(); r(false); }); });
  let server = null;
  if (!(await ping())) {
    server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 60 && !(await ping()); i++) await new Promise(r => setTimeout(r, 150));
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const fails = [], errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  for (const t of themes) {
    await page.goto(`http://localhost:${port}/assets/core/kit.html?theme=${t.id}`, { waitUntil: 'load' });
    await page.evaluate(() => new Promise(r => window.LGWTheme.ready(r)));
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}.lgw-dock,.lgw-pal{display:none!important}' });
    // 1) Elementos con texto: caja, color de texto y mínimo AA (3:1 si es texto grande).
    await page.evaluate(() => {
      // Panel admin sintético para medir la barra lateral, el enlace activo y la barra superior.
      const shell = document.createElement('div');
      shell.className = 'admin-shell'; shell.style.minHeight = '0';
      shell.innerHTML = '<aside class="admin-sidebar" style="position:static;height:auto;transform:none"><div class="admin-brand"><span class="logo">K</span>Kit</div><div class="nav-section">Gestión</div>' +
        '<a class="nav-link active" href="#"><span class="ico">📦</span>Pedidos<span class="count">12</span></a><a class="nav-link" href="#"><span class="ico">👥</span>Clientes</a></aside>' +
        '<div class="admin-main"><header class="admin-topbar" style="position:static"><b>Panel</b><span class="muted">Hoy</span></header><main class="admin-content"><div class="page-head"><h1>Pedidos</h1></div>' +
        '<div class="card"><p>Texto del panel</p><p class="muted">Texto secundario</p><span class="badge badge-warning">Pendiente</span></div></main></div>';
      document.querySelector('main.site-main').appendChild(shell);
    });
    // Viewport tan alto como la página: las cajas medidas coinciden con la captura (sin reflujo de fullPage).
    const fullH = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    await page.setViewportSize({ width: 1280, height: Math.min(fullH, 16000) });
    await page.waitForTimeout(150);
    const items = await page.evaluate(() => {
      const parseC = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
      const SEL = ['h1', 'h2', 'h3', '.eyebrow', 'p.muted', '.btn', '.badge', '.chip', '.stat .label', '.stat .value', '.stat .delta',
        '.field > label', '.input', '.select', '.textarea', '.check', '.table th', '.table td', '.tab', '.site-nav a', '.site-brand', '.site-footer',
        '.admin-brand', '.nav-section', '.nav-link', '.nav-link .count', '.admin-topbar b', '.admin-topbar .muted', '.admin-content p', '.admin-content .badge'];
      const out = [], seen = new Set();
      document.querySelectorAll('.textarea, .input').forEach(el => { if (!el.value) el.value = 'Texto de prueba'; });
      for (const sel of SEL) for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el)) continue; seen.add(el);
        const text = (el.value || el.textContent || '').trim();
        if (!text || el.closest('#kit-groups, #kit-themes, .lgw-dock, .lgw-pal, #chart')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .2) continue;
        // Caja del primer trozo de texto (no de todo el bloque): así se mide el fondo que de verdad está detrás.
        let box = el.getBoundingClientRect();
        const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        if (tn) { const r = document.createRange(); r.selectNodeContents(tn); const b = r.getBoundingClientRect(); if (b.width > 2) box = b; }
        else {   // sin nodo de texto propio (campos): se mide dentro del borde, no sobre él
          const bt = parseFloat(cs.borderTopWidth) + 2, bb = parseFloat(cs.borderBottomWidth) + 2, bl = parseFloat(cs.borderLeftWidth) + 2, br = parseFloat(cs.borderRightWidth) + 2;
          box = { left: box.left + bl, top: box.top + bt, width: box.width - bl - br, height: box.height - bt - bb };
        }
        if (box.width < 2 || box.height < 2) continue;
        const size = parseFloat(cs.fontSize), w = +cs.fontWeight;
        const clip = parseC(cs.webkitTextFillColor) && parseC(cs.webkitTextFillColor).a === 0;
        if (clip) el.setAttribute('data-lgw-cliptext', '');   // texto con degradado: en la captura se quita su fondo
        const fgs = clip ? (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parseC) : [parseC(cs.color)];
        out.push({ sel, text: text.slice(0, 24), fgs, min: size >= 24 || (size >= 18.66 && w >= 700) ? 3 : 4.5,
          box: { x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height } });
      }
      return out;
    });
    // 2) Captura de la página con todo el texto transparente: lo que queda es el fondo real (degradados,
    //    adornos, decoraciones) detrás de cada texto.
    await page.addStyleTag({ content: '*,*::before,*::after,*::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}[data-lgw-cliptext]{background:none!important;filter:none!important}' });
    const png = (await page.screenshot()).toString('base64');
    await page.setViewportSize({ width: 1280, height: 900 });
    const res = await page.evaluate(async ({ items, png }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const overC = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a) });
      const out = [];
      for (const it of items) {
        const x = Math.max(0, Math.round(it.box.x)), y = Math.max(0, Math.round(it.box.y));
        const w = Math.min(cv.width - x, Math.round(it.box.w)), h = Math.min(cv.height - y, Math.round(it.box.h));
        if (w < 2 || h < 2) continue;
        const d = cx.getImageData(x, y, w, h).data, rs = [];
        const step = Math.max(1, Math.floor(Math.sqrt(w * h / 900)));
        for (let j = 0; j < h; j += step) for (let i = 0; i < w; i += step) {
          const k = (j * w + i) * 4, bg = { r: d[k], g: d[k + 1], b: d[k + 2] };
          let worst = 99;
          for (const f of it.fgs) if (f) worst = Math.min(worst, ratio(f.a < 1 ? overC(f, bg) : f, bg));
          rs.push(worst);
        }
        rs.sort((a, b) => a - b);
        const r = rs[Math.floor(rs.length * .2)];   // el 80 % del fondo detrás del texto debe cumplir
        if (r < it.min) out.push({ sel: it.sel, text: it.text, ratio: +r.toFixed(2), min: it.min });
      }
      return out;
    }, { items, png });
    for (const r of res) fails.push({ id: t.id, key: `${t.id} · vivo · ${r.sel} «${r.text}»`, ratio: r.ratio, min: r.min });
  }
  await browser.close();
  if (server) server.kill();
  return { fails, errors };
}

// ---------------------------------------------------------------- principal
async function main() {
  const only = opt('themes', '') ? opt('themes').split(',') : null;
  let baseline = {};
  try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch (e) {}
  // Solo los estilos originales (lista "legacy" de la línea base) pueden tener excepciones conocidas.
  const legacyIds = new Set(baseline.legacy || []);
  const res = staticCheck({ only, legacy: legacyIds });
  let fails = res.fails, liveErrors = [];
  if (flag('live')) {
    const lv = await liveCheck(res.themes.filter(t => !only || only.includes(t.id)), +opt('port', 8874));
    fails = fails.concat(lv.fails); liveErrors = lv.errors;
  }
  let known = new Set(baseline.known || []);
  if (flag('update-baseline')) {
    const inScope = k => (!only || only.some(id => k.startsWith(id + ' · '))) && (flag('live') || !k.includes(' · vivo · '));
    const next = [...new Set((baseline.known || []).filter(k => !inScope(k)).concat(fails.filter(f => legacyIds.has(f.id)).map(f => f.key)))].sort();
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ note: baseline.note || 'Contrastes bajo AA de los 30 estilos originales, conservados a propósito (migración sin cambios visuales). Solo los ids de "legacy" pueden tener entradas.', legacy: baseline.legacy || [], known: next }, null, 2) + '\n');
    console.log(`Línea base actualizada: ${next.length} entradas`);
    known = new Set(next);
  }
  const fresh = fails.filter(f => !(known.has(f.key) && legacyIds.has(f.id)));
  const knownHit = fails.filter(f => known.has(f.key) && legacyIds.has(f.id));
  const stale = [...known].filter(k => !fails.some(f => f.key === k) && (flag('live') || !k.includes(' · vivo · ')) && (!only || only.some(id => k.startsWith(id + ' · '))));
  if (flag('json')) { console.log(JSON.stringify({ errors: res.errors.concat(liveErrors), warnings: res.warnings, fails: fresh, known: knownHit.length, stale }, null, 2)); }
  else {
    const n = res.themes.filter(t => !only || only.includes(t.id)).length;
    console.log(`Estilos revisados: ${n} (${res.groups.length} grupos)${flag('live') ? ' · con medición en vivo sobre kit.html' : ''}`);
    if (res.errors.length) { console.log(`\n✗ ${res.errors.length} errores:`); res.errors.forEach(e => console.log('  ' + e)); }
    if (liveErrors.length) { console.log(`\n✗ ${liveErrors.length} errores de página:`); liveErrors.forEach(e => console.log('  ' + e)); }
    if (fresh.length) { console.log(`\n✗ ${fresh.length} contrastes bajo AA:`); fresh.forEach(f => console.log(`  ${f.key}: ${f.ratio.toFixed(2)} (mín. ${f.min})`)); }
    if (knownHit.length) console.log(`\n· ${knownHit.length} contrastes bajo AA conocidos de los estilos originales (tools/check-themes.baseline.json)${flag('verbose') ? ':' : ''}`);
    if (flag('verbose')) knownHit.forEach(f => console.log(`  ${f.key}: ${f.ratio.toFixed(2)}`));
    if (stale.length) console.log(`\n· ${stale.length} entradas de la línea base ya no fallan (puedes quitarlas con --update-baseline)`);
    if (res.warnings.length) { console.log(`\n! ${res.warnings.length} avisos:`); (flag('verbose') ? res.warnings : res.warnings.slice(0, 15)).forEach(w => console.log('  ' + w)); if (!flag('verbose') && res.warnings.length > 15) console.log('  … (--verbose para ver todos)'); }
    console.log(res.errors.length || fresh.length || liveErrors.length ? '\nRESULTADO: FALLA' : `\nRESULTADO: OK`);
  }
  process.exit(res.errors.length || fresh.length || liveErrors.length ? 1 : 0);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(2); });
