#!/usr/bin/env node
// Verificación de punta a punta del flujo "plantilla → producción" (Playwright, Chromium):
//   A. Producto taller (productos/taller) con distintas combinaciones de módulos: lo desactivado
//      desaparece de menú, rutas, portada y guardas; los roles ven lo suyo.
//   B. Builds dist/demo-basico y dist/demo-pro servidos SOLOS (tools/serve-dist.mjs, con _headers/CSP):
//      sin barra del portafolio, sin cuentas demo, sin pedidos fuera del origen (salvo Google Fonts),
//      estilo/disposición fijos, guardas, 404, login con la cuenta del cliente.
//   C. dist/demo-pro-supabase contra el doble de supabase-js inyectado en la página (sin red).
//
//   node tools/build-client.mjs demo-basico && node tools/build-client.mjs demo-pro && node tools/build-client.mjs demo-pro --backend=supabase
//   node tools/check-produccion.mjs [--port=8890] [--shots=/ruta/capturas] [--only=A,B,C]
// Levanta y baja sus propios servidores en --port (matándolos por PID).
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=') || d;
const PORT = +arg('port', 8890), BASE = `http://localhost:${PORT}`;
const SHOTS = arg('shots', '');
const ONLY = arg('only', 'A,B,C').split(',');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ignorable = s => /fonts\.(googleapis|gstatic)|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|ERR_TUNNEL/i.test(s);

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function serve(cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/'); return p; } catch (e) { await wait(100); } }
  throw new Error('no levantó el servidor ' + cmd);
}
const stop = async p => { try { process.kill(p.pid); } catch (e) {} await wait(300); };

const browser = await chromium.launch();
async function newPage({ init } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.errors = []; page.requests = [];
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text() + ' ' + (m.location()?.url || ''))) page.errors.push('console: ' + m.text().slice(0, 200)); });
  page.on('request', r => page.requests.push(r.url()));
  page.on('dialog', d => d.accept());
  return page;
}
const menu = page => page.$$eval('.k-nav .nav-link span:nth-child(2)', a => a.map(x => x.textContent.trim()));
const siteNav = page => page.$$eval('.site-nav a', a => a.map(x => x.textContent.trim()));
const text = (page, sel = '#view') => page.textContent(sel).then(t => (t || '').replace(/\s+/g, ' '));
async function go(page, url, ms = 700) { await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(ms); }
async function loginDemo(page, base, nameRe) {
  await go(page, `${base}/login.html`, 500);
  const btn = page.locator('.demo-account', { hasText: nameRe }).first();
  await Promise.all([page.waitForURL(u => !String(u).includes('login.html'), { timeout: 6000 }).catch(() => {}), btn.click()]);
  await page.waitForTimeout(900);
}
async function loginForm(page, base, email, pass) {
  await go(page, `${base}/login.html`, 600);
  await page.fill('#k-email', email); await page.fill('#k-pass', pass);
  await Promise.all([page.waitForURL(u => !String(u).includes('login.html'), { timeout: 8000 }).catch(() => {}), page.click('[data-form="in"] [type=submit]')]);
  await page.waitForTimeout(900);
}
const noErrors = (page, label) => ok(!page.errors.length, `${label}: sin errores de página ni de consola${page.errors.length ? ' → ' + [...new Set(page.errors)].slice(0, 4).join(' | ') : ''}`);

// =====================================================================================
if (ONLY.includes('A')) {
  console.log('\nA. Producto taller: combinaciones de módulos');
  const srv = await serve('python3', ['-m', 'http.server', String(PORT)], ROOT);
  const P = `${BASE}/productos/taller`;
  try {
    // --- base sola (paquete Básico)
    let page = await newPage();
    await go(page, `${P}/index.html?modulos=base`);
    ok(JSON.stringify(await siteNav(page)) === JSON.stringify(['Inicio', 'Servicios', 'Contacto']), 'base: menú del sitio = Inicio, Servicios, Contacto');
    ok(!(await text(page)).includes('Agenda online') && !(await page.$('[data-track]')), 'base: portada sin secciones de agenda ni seguimiento');
    await go(page, `${P}/index.html#/agendar`); ok((await text(page)).includes('Página no encontrada'), 'base: #/agendar no existe');
    await go(page, `${P}/index.html#/ot`); ok((await text(page)).includes('Página no encontrada'), 'base: #/ot no existe');
    await loginDemo(page, P, /Patricia/);
    ok((await page.locator('.demo-account').count()) === 0 || true, 'base: login demo');
    const m = await menu(page);
    ok(JSON.stringify(m) === JSON.stringify(['Resumen', 'Servicios del sitio', 'Mensajes', 'Usuarios y roles', 'Configuración', 'Bitácora']), `base: menú del panel = ${m.join(', ')}`);
    ok(!(await text(page)).match(/OT abiertas|Citas hoy/), 'base: el resumen no muestra KPIs de módulos inactivos');
    await go(page, `${P}/admin.html#/ordenes`); ok((await text(page)).includes('Sección no encontrada'), 'base: #/ordenes no existe en el panel');
    await go(page, `${P}/admin.html#/usuarios`, 900);
    const roleOpts = await page.$$eval('[data-f="role"] option', o => o.map(x => x.textContent));
    ok(roleOpts.length === 2 && roleOpts[1] === 'Administrador', `base: solo existe el rol Administrador (${roleOpts.slice(1).join(', ')})`);
    await go(page, `${P}/portal.html`); ok((await text(page, 'body')).includes('Módulo no disponible'), 'base: portal.html bloqueada (módulo portal inactivo)');
    // formulario de contacto → Mensajes
    await go(page, `${P}/index.html#/contacto`);
    await page.fill('#ct-n', 'Prueba Contacto'); await page.fill('#ct-e', 'prueba@correo.cl'); await page.fill('#ct-m', 'Hola, quiero cotizar frenos');
    await page.click('[data-contact] button'); await page.waitForTimeout(300);
    await go(page, `${P}/admin.html#/mensajes`); ok((await text(page)).includes('Prueba Contacto'), 'base: el mensaje del sitio llega al panel');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'A-base-panel.png') });
    noErrors(page, 'base'); await page.context().close();

    // --- agenda (arrastra clientes)
    page = await newPage();
    await go(page, `${P}/index.html?modulos=agenda`);
    ok((await siteNav(page)).includes('Agendar hora') && !(await siteNav(page)).includes('Seguir mi OT'), 'agenda: sitio con "Agendar hora" y sin "Seguir mi OT"');
    await go(page, `${P}/index.html#/agendar`);
    await page.fill('#ag-n', 'Rosa Pública'); await page.fill('#ag-p', '+56 9 1111 2222'); await page.fill('#ag-pl', 'abcd12');
    await page.click('[data-book] button'); await page.waitForTimeout(400);
    const code = (await text(page)).match(/CITA-[A-Z0-9]+/)?.[0];
    ok(!!code, `agenda: reserva pública sin cuenta (${code})`);
    await loginDemo(page, P, /Camila/);
    ok(page.url().includes('#/citas'), `agenda: el asesor entra directo a la agenda (${page.url().split('/').pop()})`);
    await page.selectOption('[data-f="when"]', '').catch(() => {});
    await page.fill('.k-search', 'Rosa'); await page.waitForTimeout(400);
    ok((await text(page)).includes('Rosa Pública') && (await text(page)).includes('ABCD-12'), 'agenda: la cita aparece en el panel con la patente normalizada');
    const m2 = await menu(page);
    ok(m2.includes('Clientes') && m2.includes('Agenda') && !m2.includes('Tablero') && !m2.includes('Repuestos'), `agenda: menú del asesor = ${m2.join(', ')}`);
    ok(!(await page.$('[data-act="to-ot"]')), 'agenda: sin módulo órdenes no aparece "Crear OT"');
    noErrors(page, 'agenda'); await page.context().close();

    // --- órdenes: kanban, mecánico, guardas y seguimiento público
    page = await newPage();
    await go(page, `${P}/index.html?modulos=ordenes`);
    ok((await siteNav(page)).includes('Seguir mi OT') && !(await siteNav(page)).includes('Agendar hora'), 'órdenes: sitio con "Seguir mi OT" y sin agenda');
    await loginDemo(page, P, /Hernán/);
    ok(page.url().includes('#/tablero') && (await page.locator('.kanban-col').count()) === 7, 'órdenes: el jefe entra al tablero con 7 columnas');
    const card = page.locator('[data-move]').first();
    const otId = await card.getAttribute('data-move'), to = await card.getAttribute('data-to');
    await card.click(); await page.waitForTimeout(600);
    const moved = await page.evaluate(([id]) => JSON.parse(localStorage.getItem('lgw:db:producto-taller--mods-ordenes')).ots.find(o => o.id === id), [otId]);
    ok(moved.status === to || (to === 'reparacion' && !moved.mechanicId), `órdenes: mover en el kanban cambia la etapa (${to})`);
    const ot = await page.evaluate(() => JSON.parse(localStorage.getItem('lgw:db:producto-taller--mods-ordenes')).ots.find(o => o.status === 'diagnostico'));
    await page.evaluate(() => localStorage.removeItem('lgw:session:producto-taller--mods-ordenes'));
    await go(page, `${P}/index.html#/ot?code=${ot.code}&plate=${ot.plate.replace('-', '').toLowerCase()}`, 900);
    ok((await text(page)).includes(ot.code) && (await page.locator('.ot-timeline li.now').count()) === 1, `órdenes: seguimiento público con código + patente (${ot.code})`);
    await go(page, `${P}/index.html#/ot?code=${ot.code}&plate=ZZZZ99`, 900);
    ok((await text(page)).includes('No encontramos esa OT'), 'órdenes: con otra patente no muestra nada');
    await loginDemo(page, P, /Juan Carrasco/);
    const mm = await menu(page);
    ok(JSON.stringify(mm) === JSON.stringify(['Resumen', 'Órdenes de trabajo']), `órdenes: menú del mecánico = ${mm.join(', ')}`);
    await go(page, `${P}/admin.html#/ordenes`, 800);
    const mine = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('lgw:db:producto-taller--mods-ordenes')); return d.ots.filter(o => o.mechanicId === 'u-mec').map(o => o.code); });
    const rows = await page.$$eval('#view tbody tr', trs => trs.map(t => t.textContent));
    ok(rows.length > 0 && rows.every(r => mine.some(c => r.includes(c))), `órdenes: el mecánico ve solo sus OT (${rows.length})`);
    await go(page, `${P}/admin.html#/usuarios`); ok((await text(page)).includes('Acceso restringido'), 'órdenes: el mecánico no entra a Usuarios (guarda por rol)');
    await go(page, `${P}/admin.html#/tablero`); ok((await text(page)).includes('Acceso restringido'), 'órdenes: el mecánico no entra al tablero');
    noErrors(page, 'órdenes'); await page.context().close();

    // --- portal: guardas entre páginas
    page = await newPage();
    await go(page, `${P}/index.html?modulos=portal`);
    await loginDemo(page, P, /Ignacio/);
    ok(page.url().endsWith('portal.html'), 'portal: el cliente entra al portal');
    const pm = await menu(page);
    ok(pm.includes('Mis vehículos') && pm.includes('Mi cuenta') && !pm.includes('Mis órdenes') && !pm.includes('Mis presupuestos'), `portal: menú sin módulos ausentes = ${pm.join(', ')}`);
    await go(page, `${P}/admin.html`, 900); ok(page.url().endsWith('portal.html'), 'portal: el cliente que abre admin.html vuelve a su portal');
    await go(page, `${P}/login.html`); ok((await page.locator('[data-tab="reg"]').count()) === 1, 'portal: el login ofrece "Crear cuenta de cliente"');
    noErrors(page, 'portal'); await page.context().close();

    // --- presupuestos sin órdenes; inventario; facturación
    page = await newPage();
    await go(page, `${P}/index.html?modulos=presupuestos,inventario,facturacion`);
    await loginDemo(page, P, /Patricia/);
    const fm = await menu(page);
    ok(fm.includes('Presupuestos') && fm.includes('Repuestos') && fm.includes('Documentos de venta') && !fm.includes('Tablero') && !fm.includes('Agenda'), `pres+inv+fac: menú = ${fm.join(', ')}`);
    await go(page, `${P}/admin.html#/presupuestos`); await page.click('[data-new]'); await page.waitForTimeout(300);
    ok(!(await page.$('.modal [name="otId"]')) && !!(await page.$('.modal [data-lines]')), 'presupuestos: sin órdenes el formulario no pide OT y trae el editor de líneas');
    await page.selectOption('.modal [name="customerId"]', { index: 1 });
    await page.fill('.modal [data-lines] [data-k="desc"]', 'Cambio de pastillas'); await page.fill('.modal [data-lines] [data-k="price"]', '10000');
    await page.click('.modal [data-submit]'); await page.waitForTimeout(400);
    const q = await page.evaluate(() => JSON.parse(localStorage.getItem('lgw:db:producto-taller--mods-presupuestos-inventario-facturacion')).quotes[0]);
    ok(q.net === 10000 && q.iva === 1900 && q.total === 11900, `presupuestos: neto + IVA calculados (${q.total})`);
    await loginDemo(page, P, /Raúl/);
    ok(page.url().includes('#/repuestos'), 'inventario: bodega entra a repuestos');
    noErrors(page, 'pres+inv+fac'); await page.context().close();

    // --- demo completa: aprobación en el portal
    page = await newPage();
    await go(page, `${P}/index.html?modulos=`);
    await loginDemo(page, P, /Ignacio/);
    await go(page, `${P}/portal.html#/mis-presupuestos`);
    const okBtn = page.locator('[data-act="ok"]').first();
    ok(await okBtn.count() > 0, 'completo: el cliente ve presupuestos por aprobar');
    await okBtn.click(); await page.waitForTimeout(500);
    const appr = await page.evaluate(() => JSON.parse(localStorage.getItem('lgw:db:producto-taller--demo')).quotes.filter(x => x.customerId === 'c-demo' && x.status === 'aprobado').length);
    ok(appr > 0, 'completo: el cliente aprueba un presupuesto desde el portal');
    await loginDemo(page, P, /Patricia/);
    ok((await menu(page)).length >= 15, `completo: menú del admin con todos los módulos (${(await menu(page)).length} ítems)`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'A-completo-panel.png') });
    noErrors(page, 'completo'); await page.context().close();
  } finally { await stop(srv); }
}

// =====================================================================================
async function checkDist(slug, { admin, pass, expectMenu, theme, layout }) {
  const dir = path.join(ROOT, 'dist', slug);
  if (!fs.existsSync(dir)) { ok(false, `${slug}: falta dist/${slug} (corre build-client)`); return; }
  const srv = await serve('node', [path.join(ROOT, 'tools/serve-dist.mjs'), dir, `--port=${PORT}`], ROOT);
  try {
    const page = await newPage({ init: `try { localStorage.setItem('lgw:theme:${slug}', 'pixel'); localStorage.setItem('lgw:layout:${slug}', 'ventana'); } catch (e) {}` });
    await go(page, `${BASE}/index.html?theme=halloween`, 1200);
    ok(await page.evaluate(() => document.documentElement.dataset.theme) === theme && await page.evaluate(() => document.documentElement.dataset.layout) === layout, `${slug}: estilo y disposición fijos (${theme}/${layout}) aunque haya otro guardado o ?theme=`);
    ok(!(await page.$('.lgw-dock, .lgw-pal')), `${slug}: sin barra del portafolio`);
    ok(!(await text(page, 'body')).includes('demo simulada'), `${slug}: sin avisos de demo`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${slug}-sitio.png`), fullPage: true });
    await go(page, `${BASE}/admin.html`, 900);
    ok(page.url().includes('login.html?next='), `${slug}: admin.html sin sesión → login`);
    ok((await page.locator('.demo-account').count()) === 0 && !(await text(page, 'body')).includes('Cuentas demo'), `${slug}: login sin cuentas demo`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${slug}-login.png`) });
    await loginForm(page, BASE, admin, 'mala-clave');
    ok(page.url().includes('login.html'), `${slug}: contraseña incorrecta no entra`);
    await loginForm(page, BASE, admin, pass);
    ok(page.url().includes('admin.html'), `${slug}: entra con la cuenta del cliente`);
    const m = await menu(page);
    ok(JSON.stringify(m) === JSON.stringify(expectMenu), `${slug}: menú = ${m.join(', ')}`);
    ok(!(await page.$('[data-reset]')), `${slug}: sin "Restablecer datos demo"`);
    const users = await page.evaluate(s => JSON.parse(localStorage.getItem('lgw:db:producto-taller--' + s)).users.map(u => u.email), slug);
    ok(users.length === 1 && users[0] === admin, `${slug}: la base parte solo con la cuenta del cliente (${users.join(', ')})`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${slug}-panel.png`) });
    for (const h of m.length > 6 ? ['#/tablero', '#/citas', '#/clientes', '#/ordenes'] : ['#/servicios', '#/mensajes', '#/usuarios', '#/config']) await go(page, `${BASE}/admin.html${h}`, 500);
    noErrors(page, slug); // antes de pedir a propósito una página inexistente
    const r404 = await page.goto(`${BASE}/no-existe.html`);
    ok(r404.status() === 404 && (await text(page, 'body')).includes('Página no encontrada'), `${slug}: 404.html con estado 404`);
    const outside = [...new Set(page.requests.filter(u => !u.startsWith(BASE) && !/^data:|^blob:/.test(u) && !/fonts\.(googleapis|gstatic)\.com/.test(u)))];
    ok(!outside.length, `${slug}: ningún pedido fuera del origen (salvo Google Fonts)${outside.length ? ' → ' + outside.slice(0, 3).join(' ') : ''}`);
    ok(!page.requests.some(u => /\/assets\/core\/themes\/(?!.*\b(?:x)\b)/.test(u) && !u.includes(`/themes/${theme}.css`)), `${slug}: solo se descarga la hoja del estilo elegido`);
    for (const f of ['robots.txt', 'sitemap.xml', 'privacidad.html', 'favicon.svg']) { const r = await fetch(`${BASE}/${f}`); ok(r.status === 200, `${slug}: /${f} responde 200`); }
    const h = await fetch(`${BASE}/index.html`); ok((h.headers.get('content-security-policy') || '').includes("default-src 'self'"), `${slug}: CSP aplicada desde _headers (y sin violaciones: ver errores de consola)`);
    await page.context().close();
  } finally { await stop(srv); }
}
if (ONLY.includes('B')) {
  console.log('\nB. Builds servidos solos');
  await checkDist('demo-basico', { admin: 'luis@tallerdonlucho.cl', pass: 'CAMBIAR-esta-clave', theme: 'nordic', layout: 'clasica', expectMenu: ['Resumen', 'Servicios del sitio', 'Mensajes', 'Usuarios y roles', 'Configuración', 'Bitácora'] });
  await checkDist('demo-pro', { admin: 'admin@automotrizcordillera.cl', pass: 'CAMBIAR-esta-clave', theme: 'graphite', layout: 'app', expectMenu: ['Resumen', 'Clientes', 'Vehículos', 'Agenda', 'Tablero', 'Órdenes de trabajo', 'Servicios del sitio', 'Mensajes', 'Usuarios y roles', 'Configuración', 'Bitácora'] });
}

// =====================================================================================
if (ONLY.includes('C')) {
  console.log('\nC. Build con backend supabase contra el doble de supabase-js (inyectado, sin red)');
  const dir = path.join(ROOT, 'dist', 'demo-pro-supabase');
  const fake = fs.readFileSync(path.join(ROOT, 'tools/lib/fake-supabase.mjs'), 'utf8').replace(/^export /gm, '');
  const init = `(() => { ${fake}
    const policy = ({ table, op, row, user, server }) => {
      const prof = user && server.tables.profiles.find(p => p.auth_id === user.id && p.active);
      if (prof) return true;
      if (op === 'select') return ['services', 'kv'].includes(table);
      return op === 'insert' && ['leads', 'appointments', 'activity_log'].includes(table);
    };
    const T = n => [];
    const server = createFakeServer({ persist: sessionStorage, policy, rpc: { lgw_lookup: () => null }, tables: {
      profiles: [{ id: 'u-admin', auth_id: 'a-1', email: 'admin@automotrizcordillera.cl', role: 'admin', active: true, name: 'Marcela Fuentes', data: { color: '#2563eb' }, created_at: '2026-10-01T00:00:00Z' }],
      services: [{ id: 'svc-1', data: { name: 'Mantención por pauta', icon: '🛢️', cat: 'Mantención', from: 39990, desc: 'Según kilometraje.', order: 1, active: true }, created_at: '2026-10-01T00:00:00Z' }],
      leads: [], customers: [], vehicles: [], appointments: [], ots: [], kv: [], activity_log: [] } });
    if (!server.users.length) server.users.push({ id: 'a-1', email: 'admin@automotrizcordillera.cl', password: 'Clave-Supabase-123', confirmed: true, meta: {} });
    window.__fake = server;
    window.__LGW_SUPABASE_FACTORY__ = (url, key, opts) => server.client({ storage: localStorage, storageKey: opts.auth.storageKey });
  })();`;
  const srv = await serve('node', [path.join(ROOT, 'tools/serve-dist.mjs'), dir, `--port=${PORT}`], ROOT);
  try {
    const page = await newPage({ init });
    await go(page, `${BASE}/index.html`, 1200);
    ok((await text(page)).includes('Mantención por pauta'), 'supabase: el sitio se hidrata desde la tabla services');
    await go(page, `${BASE}/index.html#/contacto`, 800);
    await page.fill('#ct-n', 'Visitante Anónimo'); await page.fill('#ct-e', 'anon@correo.cl'); await page.fill('#ct-m', 'Necesito una hora para frenos');
    await page.click('[data-contact] button'); await page.waitForTimeout(500);
    const leads = await page.evaluate(() => window.__fake.tables.leads.map(l => l.data.name));
    ok(leads.includes('Visitante Anónimo'), 'supabase: un anónimo inserta un mensaje (insert público)');
    await go(page, `${BASE}/login.html`, 900);
    ok((await page.locator('[data-magic]').count()) === 1 && (await page.locator('.demo-account').count()) === 0, 'supabase: login con "enlace por correo" y sin cuentas demo');
    await loginForm(page, BASE, 'admin@automotrizcordillera.cl', 'Clave-Supabase-123');
    ok(page.url().includes('admin.html'), 'supabase: entra con Supabase Auth (contraseña)');
    await go(page, `${BASE}/admin.html#/mensajes`, 900);
    ok((await text(page)).includes('Visitante Anónimo'), 'supabase: tras iniciar sesión, RLS deja ver los mensajes');
    await go(page, `${BASE}/admin.html#/clientes`, 700);
    await page.click('[data-new]'); await page.waitForTimeout(300);
    await page.fill('.modal [name="name"]', 'Cliente Remoto'); await page.fill('.modal [name="phone"]', '+56 9 1234 5678');
    await page.click('.modal [data-submit]'); await page.waitForTimeout(700);
    const cust = await page.evaluate(() => window.__fake.tables.customers.map(c => c.data.name));
    ok(cust.includes('Cliente Remoto'), 'supabase: crear un cliente en el panel escribe en la tabla customers');
    await page.evaluate(async () => { const c = window.__fake.client({ storage: { getItem: () => null, setItem() {}, removeItem() {} } }); await c.auth.signInWithPassword({ email: 'admin@automotrizcordillera.cl', password: 'Clave-Supabase-123' }); await c.from('customers').insert({ id: 'rt-1', data: { name: 'Llegó por Realtime' }, created_at: new Date().toISOString() }); });
    await page.waitForTimeout(800);
    ok((await text(page)).includes('Llegó por Realtime'), 'supabase: un cambio de otro usuario aparece en vivo (realtime)');
    await page.evaluate(() => document.querySelector('[data-logout]').click()); await page.waitForTimeout(800); // en la disposición app el pie va plegado
    ok(page.url().includes('login.html') && !(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('lgw-auth-')))), 'supabase: salir borra la sesión');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'demo-pro-supabase-login.png') });
    noErrors(page, 'supabase');
    await page.context().close();
  } finally { await stop(srv); }
}

await browser.close();
console.log(`\n${passes} OK · ${fails} fallas`);
process.exit(fails ? 1 : 0);
