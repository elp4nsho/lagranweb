// "Director" de la grabación: mueve un cursor visible, hace clics y escribe como una persona,
// muestra subtítulos y tarjetas de capítulo, y lleva la línea de tiempo (capítulos/pasos) y el
// registro de QA (errores de página, consola, pasos fallidos).
//
// Uso típico (ver tours/automotora.js):
//   await d.chapter('Configurador', 'Versión, color y precio en vivo', async () => d.goto('index.html#/modelo/tucson'));
//   await d.step('Elegir color', async () => { await d.click('.swatch[data-v="c3"]'); await d.pause(1.5); });
const fs = require('fs');
const path = require('path');
const { introCard, chapterCard, outroCard } = require('./cards');
const { phoneMockupHTML } = require('./mockup');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const OVERLAY = fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8');

class StepError extends Error {}

class Director {
  /**
   * @param {{ page: import('playwright').Page, base: string, recorder?: import('./recorder').Recorder,
   *   outDir: string, name: string, speed?: number, log?: Function }} o
   *   speed < 1 acorta las pausas (iteraciones rápidas); 1 = ritmo final del video.
   */
  constructor({ page, base, recorder = null, outDir, name, speed = 1, log = console.log }) {
    Object.assign(this, { page, base, recorder, outDir, name, speed, log });
    this.timeline = [];
    this.qa = [];
    this.mouse = { x: 960, y: 620 };
    this.chapterNo = 0;
    this.currentChapter = null;
    this.currentStep = null;
    this.wall0 = Date.now();
  }

  /** Segundos de video (o de reloj si no se graba). */
  t() { return this.recorder ? this.recorder.now() : (Date.now() - this.wall0) / 1000; }

  async init() {
    const { page } = this;
    await page.addInitScript({ content: OVERLAY });
    // Maqueta de celular servida en la misma procedencia que la app (para que el iframe
    // comparta localStorage y la capa del cursor pueda leer el iframe).
    await page.route(u => new URL(u).pathname.startsWith('/__rec/phone'), route => {
      const q = new URL(route.request().url()).searchParams;
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: phoneMockupHTML(JSON.parse(q.get('o') || '{}')) });
    });
    page.on('pageerror', e => this.issue('pageerror', e.message));
    page.on('console', m => { if (m.type() === 'error') this.issue('console', m.text()); });
    page.on('requestfailed', r => { const u = r.url(); if (!/fonts\.(googleapis|gstatic)/.test(u)) this.issue('request', `${r.failure()?.errorText} ${u}`); });
    page.on('dialog', d => { this.issue('dialog', `${d.type()}: ${d.message()}`, 'info'); d.accept().catch(() => {}); });
    page.on('popup', p => { this.issue('popup', `Se abrió una ventana nueva: ${p.url()}`, 'warn'); p.close().catch(() => {}); });
  }

  // ---------- Registro ----------
  issue(kind, msg, level = 'error') {
    const e = { t: +this.t().toFixed(2), level, kind, msg: String(msg).slice(0, 500), chapter: this.currentChapter?.title, step: this.currentStep, url: this.page.url().replace(this.base, '') };
    this.qa.push(e);
    this.log(`  [QA ${level}] ${kind}: ${e.msg} (${e.step || e.chapter || ''})`);
  }
  mark(type, data) { const e = { t: +this.t().toFixed(2), type, ...data }; this.timeline.push(e); return e; }

  /** Ejecuta un paso; si falla deja una captura en out/errors y corta la grabación con un error claro. */
  async step(label, fn) {
    this.currentStep = label;
    this.mark('step', { chapter: this.currentChapter?.title, step: label });
    this.log(`  · ${label}`);
    try { return await fn(); }
    catch (err) {
      if (err instanceof StepError) throw err;
      const dir = path.join(this.outDir, 'errors'); fs.mkdirSync(dir, { recursive: true });
      const shot = path.join(dir, `${this.name}-${String(this.chapterNo).padStart(2, '0')}-${label.replace(/[^\wáéíóúñ]+/gi, '_').slice(0, 50)}.png`);
      await this.page.screenshot({ path: shot }).catch(() => {});
      this.issue('step', `Falló "${label}": ${err.message.split('\n')[0]}`);
      throw new StepError(`Paso "${label}" (capítulo ${this.chapterNo}) falló: ${err.message}\nCaptura: ${shot}`);
    } finally { this.currentStep = null; }
  }

  // ---------- Tiempos ----------
  /** Pausa "de lectura" en segundos (se escala con --fast). */
  pause(s = 1.5) { return sleep(Math.max(s * 1000 * this.speed, Math.min(s * 1000, 220))); }
  hold(s) { return sleep(s * 1000 * Math.max(this.speed, .25)); }

  // ---------- Tarjetas y subtítulos ----------
  async card(html, seconds) { await this.page.evaluate(h => window.__rec.card(h), html); if (seconds) await this.hold(seconds); }
  async hideCard() { await this.page.evaluate(() => window.__rec.hideCard()); }

  async intro(o, seconds = 6) {
    this.chapterNo = 0;
    this.currentChapter = { no: 0, title: o.chapterTitle || 'Introducción' };
    this.mark('chapter', { no: 0, title: this.currentChapter.title });
    await this.card(introCard(o), seconds);
  }
  async outro(o, seconds = 6) {
    await this.hideCaption();
    this.chapterNo++;
    this.currentChapter = { no: this.chapterNo, title: o.chapterTitle || 'Créditos' };
    this.mark('chapter', { no: this.chapterNo, title: this.currentChapter.title });
    await this.card(outroCard(o), seconds);
  }
  /**
   * Tarjeta de capítulo a pantalla completa. `setup` corre DETRÁS de la tarjeta (navegar, iniciar
   * sesión…) y la tarjeta se mantiene al menos `seconds`.
   */
  async chapter(title, sub = '', setup = null, seconds = 2.2) {
    this.chapterNo++;
    this.currentChapter = { no: this.chapterNo, title };
    this.log(`\n== Capítulo ${this.chapterNo}: ${title}`);
    await this.hideCaption();
    this.mark('chapter', { no: this.chapterNo, title });
    const t0 = Date.now();
    await this.card(chapterCard(this.chapterNo, title, sub));
    if (setup) { this.currentStep = 'preparación'; try { await setup(); } catch (e) { this.currentStep = null; throw e; } this.currentStep = null; }
    const left = seconds * 1000 * Math.max(this.speed, .25) - (Date.now() - t0);
    if (left > 0) await sleep(left);
    await this.hideCard();
  }

  async caption(title, sub = '', opts = {}) {
    this.mark('caption', { title, sub });
    await this.page.evaluate(([t, s, o]) => window.__rec.caption(t, s, o), [title, sub, { kicker: opts.kicker ?? (this.currentChapter?.no ? `${this.currentChapter.no} · ${this.currentChapter.title}` : ''), pos: opts.pos }]);
    if (opts.read !== false) await this.pause(opts.read ?? 1.2);
  }
  async hideCaption() { await this.page.evaluate(() => window.__rec && window.__rec.hideCaption()).catch(() => {}); }

  // ---------- Navegación ----------
  url(p) { return /^https?:/.test(p) ? p : this.base + p.replace(/^\//, ''); }
  async goto(p, { waitFor, settle = .6 } = {}) {
    await this.page.goto(this.url(p), { waitUntil: 'load' });
    if (waitFor) await this.page.locator(waitFor).first().waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
    await this.restoreCursor();
    await sleep(settle * 1000);
  }
  /** Tras una navegación, vuelve a pintar el cursor donde estaba el mouse real. */
  async restoreCursor() { await this.page.evaluate(m => window.__rec && window.__rec.cursor(m.x, m.y), this.mouse).catch(() => {}); }
  async waitNav(fn, { waitFor } = {}) {
    await Promise.all([this.page.waitForEvent('load', { timeout: 15000 }), fn()]);
    if (waitFor) await this.page.locator(waitFor).first().waitFor({ state: 'visible', timeout: 10000 });
    await this.restoreCursor();
    await sleep(400);
  }

  // ---------- Localizadores ----------
  loc(target) {
    if (typeof target === 'string') return this.page.locator(target).first();
    return target; // Locator (también de iframes)
  }
  frame(sel) { return this.page.frameLocator(sel); }
  text(t, scope = this.page) { return scope.getByText(t, { exact: false }).first(); }
  role(r, name, scope = this.page) { return scope.getByRole(r, { name }).first(); }

  async visible(target, timeout = 8000) {
    const l = this.loc(target);
    await l.waitFor({ state: 'visible', timeout });
    return l;
  }

  /** Lleva el elemento a la vista con scroll suave (también dentro de modales e iframes). */
  async reveal(target, opts = {}) {
    const l = await this.visible(target);
    await l.evaluate((el, o) => window.__rec && window.__rec.reveal(el, o), opts);
    await sleep(80);
    return l;
  }

  // ---------- Mouse ----------
  /** Desliza el mouse real (y el cursor visible que lo sigue) con aceleración suave y una curva leve. */
  async glide(x, y, { duration } = {}) {
    const from = { ...this.mouse }, dx = x - from.x, dy = y - from.y, dist = Math.hypot(dx, dy);
    if (dist < 2) { await this.page.mouse.move(x, y); this.mouse = { x, y }; return; }
    const dur = (duration ?? Math.min(720, Math.max(230, 170 + dist * .3))) * Math.max(this.speed, .35);
    const steps = Math.max(8, Math.round(dur / 16));
    // Curva cuadrática con control desplazado perpendicularmente (movimiento natural)
    const bend = Math.min(80, dist * .12) * (dx > 0 ? 1 : -1);
    const cx = from.x + dx / 2 - dy / dist * bend, cy = from.y + dy / 2 + dx / dist * bend;
    const t0 = Date.now();
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const px = (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * cx + e * e * x;
      const py = (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * cy + e * e * y;
      await this.page.mouse.move(px, py);
      const wait = t0 + dur * k - Date.now();
      if (wait > 0) await sleep(wait);
    }
    this.mouse = { x, y };
  }

  /** Caja del elemento cuando deja de moverse (animaciones de entrada, re-pintados). */
  async stableBox(l, timeout = 1500) {
    let prev = await l.boundingBox();
    for (const t0 = Date.now(); Date.now() - t0 < timeout;) {
      await sleep(90);
      const b = await l.boundingBox();
      if (b && prev && Math.abs(b.x - prev.x) < .5 && Math.abs(b.y - prev.y) < .5 && Math.abs(b.width - prev.width) < .5 && Math.abs(b.height - prev.height) < .5) return b;
      prev = b;
    }
    return prev;
  }

  async point(target, { offset, reveal = true, revealOpts } = {}) {
    const l = reveal ? await this.reveal(target, revealOpts) : await this.visible(target);
    const b = await this.stableBox(l);
    if (!b) throw new Error('El elemento no tiene caja visible');
    let x = b.x + (offset ? offset.x : b.width / 2), y = b.y + (offset ? offset.y : Math.min(b.height / 2, 40));
    // Formas recortadas (SVG con clip-path) o tapadas en el centro: busca un punto que sí le pegue.
    if (!offset && !(await this.hits(l, x, y))) {
      const p = await this.findHitPoint(l, b);
      if (p) ({ x, y } = p);
    }
    return { l, b, x, y };
  }
  async findHitPoint(l, b) {
    const pts = [];
    for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) pts.push({ x: b.x + b.width * i / 6, y: b.y + b.height * j / 6 });
    pts.sort((p, q) => Math.hypot(p.x - b.x - b.width / 2, p.y - b.y - b.height / 2) - Math.hypot(q.x - b.x - b.width / 2, q.y - b.y - b.height / 2));
    for (const p of pts) if (await this.hits(l, p.x, p.y)) return p;
    return null;
  }
  async moveTo(target, opts = {}) { const p = await this.point(target, opts); await this.glide(p.x, p.y); return p; }

  /** ¿El punto (coordenadas de página) cae sobre el elemento o algo suyo? Soporta iframes. */
  async hits(l, x, y) {
    return l.evaluate((el, p) => {
      let w = window, ox = 0, oy = 0;
      try { while (w !== w.top) { const r = w.frameElement.getBoundingClientRect(); ox += r.left; oy += r.top; w = w.parent; } } catch (e) { return true; }
      const hit = document.elementFromPoint(p.x - ox, p.y - oy);
      if (!hit) return false;
      const lab = hit.closest && hit.closest('label');
      return el === hit || el.contains(hit) || (lab && (lab.control === el || lab.contains(el))) || (el.tagName === 'INPUT' && hit.contains(el));
    }, { x, y });
  }

  /** Clic "humano": scroll suave, deslizar el cursor, pausa breve y clic con onda visible. */
  async click(target, { offset, after = .35, revealOpts, nav } = {}) {
    const { l, x, y } = await this.moveTo(target, { offset, revealOpts });
    await sleep(60 * Math.max(this.speed, .5));
    let hit = await this.hits(l, x, y);
    if (!hit) { await sleep(400); hit = await this.hits(l, x, y); }
    const doClick = async () => {
      if (hit) { await this.page.mouse.down(); await sleep(70); await this.page.mouse.up(); }
      else { this.issue('click', `Algo tapa el objetivo: ${l}`, 'warn'); await l.click({ timeout: 5000 }); }
    };
    if (nav) await this.waitNav(doClick, nav === true ? {} : nav); else await doClick();
    if (after) await this.pause(after);
    return l;
  }

  /** Escribe como persona (con retardo por tecla). `clear` selecciona y reemplaza lo que haya. */
  async type(target, text, { clear = true, delay = 42, blur = false, after = .2 } = {}) {
    const l = await this.click(target, { after: 0 });
    if (clear) { await this.page.keyboard.press('Control+A'); await this.page.keyboard.press('Backspace'); }
    await this.page.keyboard.type(String(text), { delay: delay * Math.max(this.speed, .3) });
    // Si la vista se re-pintó mientras escribíamos, el texto pudo quedar en un nodo viejo.
    const val = await l.inputValue().catch(() => null);
    if (val != null && val !== String(text) && clear) { this.issue('type', `El campo quedó con "${val}" en vez de "${text}"; se reintenta`, 'warn'); await l.fill(String(text)); }
    if (blur) await l.evaluate(el => el.blur());
    if (after) await this.pause(after);
    return l;
  }

  /** <select>: el desplegable nativo no sale en la captura, así que se muestra el gesto y se elige. */
  async select(target, value, { after = .5 } = {}) {
    const { l, x, y } = await this.moveTo(target);
    await this.page.evaluate(p => window.__rec.ripple(p.x, p.y), { x, y });
    await sleep(180);
    await l.selectOption(value);
    if (after) await this.pause(after);
    return l;
  }

  /** Arrastra el control de un <input type=range> hasta `value`. */
  async slide(target, value, { after = .5 } = {}) {
    const l = await this.reveal(target);
    const info = await l.evaluate(el => ({ min: +el.min || 0, max: +el.max || 100, v: +el.value }));
    const b = await l.boundingBox();
    const thumb = 16, xOf = v => b.x + thumb / 2 + (b.width - thumb) * (v - info.min) / (info.max - info.min);
    const y = b.y + b.height / 2;
    await this.glide(xOf(info.v), y);
    await this.page.mouse.down();
    await this.glide(xOf(value), y, { duration: 900 });
    await this.page.mouse.up();
    const got = await l.evaluate(el => +el.value);
    if (Math.abs(got - value) > (await l.evaluate(el => +el.step || 1)) * 1.01) {
      await l.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, value);
    }
    if (after) await this.pause(after);
  }

  /** Arrastrar y soltar (HTML5 DnD) entre dos elementos con el mouse real. */
  async drag(from, to, { after = .6 } = {}) {
    const a = await this.point(from);
    await this.glide(a.x, a.y);
    await this.page.mouse.down();
    await sleep(120);
    const b = await this.point(to, { reveal: false });
    await this.glide(a.x + 14, a.y + 10, { duration: 200 });
    await this.glide(b.x, b.y, { duration: 1100 });
    await sleep(150);
    await this.page.mouse.up();
    if (after) await this.pause(after);
  }

  /** Scroll suave de la ventana: a un elemento (lo centra) o a una posición Y. */
  async scrollTo(target, opts = {}) {
    if (typeof target === 'number') return this.page.evaluate(([y, d]) => window.__rec.scrollToY(y, d), [target, opts.duration]);
    const l = await this.visible(target);
    await l.evaluate((el, o) => window.__rec.reveal(el, o), { center: true, ...opts });
  }
  /** Recorre la página hacia abajo a velocidad de lectura, parando en cada `stops` (selectores). */
  async tour(stops, { read = 1.6 } = {}) {
    for (const s of stops) {
      const l = this.loc(s);
      if (!(await l.count())) { this.issue('tour', `No existe ${s}`, 'warn'); continue; }
      await l.evaluate(el => window.__rec.reveal(el, { center: false, top: 110, bottom: 150 }));
      await this.pause(read);
    }
  }

  /** Anillo de foco alrededor de un elemento (llama la atención sobre un resultado). Sigue al
   *  elemento mientras dura, por si la vista se re-pinta o se mueve. */
  async ring(target, seconds = 2) {
    const l = await this.reveal(target);
    const ms = seconds * 1000 * Math.max(this.speed, .3), end = Date.now() + ms;
    let last = '';
    while (Date.now() < end) {
      const b = await l.boundingBox().catch(() => null);
      const key = b ? [b.x, b.y, b.width, b.height].map(Math.round).join() : '';
      if (b && key !== last) { await this.page.evaluate(r => window.__rec.ring(r, 0), b); last = key; }
      await sleep(120);
    }
    await this.page.evaluate(() => window.__rec.unring());
  }

  /** Espera un toast con ese texto (valida el resultado de la acción). */
  async expectToast(re, { timeout = 5000 } = {}) {
    const t = this.page.locator('.toast').filter({ hasText: re }).first();
    try { await t.waitFor({ state: 'visible', timeout }); return true; }
    catch (e) { this.issue('expect', `No apareció el aviso ${re}`); return false; }
  }
  async expectText(re, { scope = this.page, timeout = 6000 } = {}) {
    const t = scope.getByText(re).first();
    try { await t.waitFor({ state: 'visible', timeout }); return true; }
    catch (e) { this.issue('expect', `No apareció el texto ${re}`); return false; }
  }
  /** Revisión rápida de diseño: scroll horizontal accidental y textos desbordados. */
  async layoutCheck(label = '') {
    const r = await this.page.evaluate(() => {
      const se = document.scrollingElement;
      return { hscroll: se.scrollWidth > innerWidth + 1 ? se.scrollWidth : 0 };
    });
    if (r.hscroll) this.issue('layout', `Scroll horizontal (${r.hscroll}px) ${label}`, 'warn');
  }

  // ---------- Maqueta de celular ----------
  async phone(o) {
    const q = encodeURIComponent(JSON.stringify(o));
    await this.goto(`${new URL(this.base).origin}/__rec/phone.html?o=${q}`, { waitFor: 'iframe#phone' });
    const f = this.frame('iframe#phone');
    await f.locator('body').waitFor();
    return f;
  }

  // ---------- Salidas ----------
  chapters() { return this.timeline.filter(e => e.type === 'chapter'); }
  writeOutputs({ title, description = '', tags = [] }) {
    const fmt = s => { s = Math.max(0, Math.floor(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    const ch = this.chapters();
    const json = { name: this.name, generatedAt: new Date().toISOString(), duration: +this.t().toFixed(2), chapters: ch, timeline: this.timeline, qa: this.qa };
    fs.writeFileSync(path.join(this.outDir, `${this.name}.timeline.json`), JSON.stringify(json, null, 2));
    // Archivo para YouTube: solo capítulos (mm:ss Título), título y descripción sugeridos.
    const chLines = ch.map((c, i) => `${fmt(i === 0 ? 0 : c.t)} ${c.title}`);
    const md = [
      `# ${title}`, '', '## Capítulos (pegar en la descripción de YouTube)', '', ...chLines, '',
      '## Título sugerido', '', title, '', '## Descripción sugerida', '', description, '', 'Capítulos:', ...chLines, '',
      ...(tags.length ? ['## Etiquetas', '', tags.join(', '), ''] : [])
    ].join('\n');
    fs.writeFileSync(path.join(this.outDir, `${this.name}.chapters.md`), md);
    // Detalle para revisión: cada paso y cada incidencia de QA con su minuto.
    const tl = [
      `# Línea de tiempo · ${this.name}`, '', `Duración: ${fmt(this.t())}`, '', '## Pasos', '',
      ...this.timeline.filter(e => e.type !== 'caption').map(e => e.type === 'chapter' ? `\n### ${fmt(e.t)} ${e.title}` : `- ${fmt(e.t)} ${e.step}`), '',
      `## QA (${this.qa.length})`, '', ...(this.qa.length ? this.qa.map(q => `- ${fmt(q.t)} [${q.level}] ${q.kind}: ${q.msg} — ${q.step || q.chapter || ''} (${q.url})`) : ['Sin incidencias.']), ''
    ].join('\n');
    fs.writeFileSync(path.join(this.outDir, `${this.name}.timeline.md`), tl);
    fs.writeFileSync(path.join(this.outDir, `${this.name}.captions.vtt`), captionsVTT(this.timeline, this.t()));
    return { chapters: ch.map(c => `${fmt(c.t)} ${c.title}`), qa: this.qa };
  }
}

/** Subtítulos WebVTT a partir de los subtítulos en pantalla (útil para YouTube o accesibilidad). */
function captionsVTT(timeline, end) {
  const ts = s => { const ms = Math.max(0, Math.round(s * 1000)); const h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60, x = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
  const marks = timeline.filter(e => e.type === 'caption' || e.type === 'chapter');
  const cues = [];
  marks.forEach((e, i) => {
    if (e.type !== 'caption') return;
    const next = marks[i + 1] ? marks[i + 1].t : end;
    if (next - e.t < .3) return;
    cues.push(`${ts(e.t)} --> ${ts(next)}\n${e.title}${e.sub ? '\n' + e.sub : ''}`);
  });
  return 'WEBVTT\n\n' + cues.join('\n\n') + '\n';
}

module.exports = { Director, StepError, sleep, captionsVTT };
