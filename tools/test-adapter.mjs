#!/usr/bin/env node
// Pruebas del motor de datos: adaptador `local` (regresión del comportamiento histórico) y adaptador
// `supabase` contra el doble en memoria de supabase-js (tools/lib/fake-supabase.mjs).
//
//   node tools/test-adapter.mjs            (sin dependencias: corre con Node 18+)
//
// Lo que estas pruebas NO cubren (hay que verificarlo contra un proyecto real, ver PRODUCTION.md §7):
// el SQL/RLS real (eso lo prueba tools/test-schema.mjs en Postgres), el transporte HTTP/WebSocket,
// la entrega de correos, la expiración/refresco de tokens y Storage con políticas reales.
import assert from 'assert/strict';

// ---------- Entorno mínimo de navegador ----------
function memStorage(limit = Infinity) {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) { v = String(v); const size = [...m].reduce((s, [kk, vv]) => s + (kk === k ? 0 : vv.length), 0) + v.length; if (size > limit) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } m.set(k, v); },
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m
  };
}
const winListeners = {};
globalThis.window = globalThis;
globalThis.addEventListener = (t, fn) => (winListeners[t] ||= []).push(fn);
globalThis.dispatch = (t, ev) => (winListeners[t] || []).forEach(fn => fn(ev));
globalThis.location = { pathname: '/admin.html', hash: '', search: '', href: 'http://x/admin.html', replace() {} };
let ls = memStorage();
Object.defineProperty(globalThis, 'localStorage', { get: () => ls, configurable: true });
// Object.keys(localStorage) lo usa la evicción LRU: lo emulamos con un Proxy sobre el Map.
const lsProxy = () => new Proxy(ls, { ownKeys: t => [...t._map.keys()], getOwnPropertyDescriptor: (t, k) => (t._map.has(k) ? { enumerable: true, configurable: true, value: t._map.get(k) } : undefined) });

const { createDB } = await import('../assets/core/db.js');
const { createAuth } = await import('../assets/core/auth.js');
const { supabaseAdapter, toRow } = await import('../assets/core/store/supabase.js');
const { createFakeServer } = await import('./lib/fake-supabase.mjs');

const results = [];
async function test(name, fn) {
  try { await fn(); results.push([true, name]); console.log('  ✓ ' + name); }
  catch (e) { results.push([false, name]); console.log('  ✗ ' + name + '\n      ' + (e.stack || e).toString().split('\n').slice(0, 3).join('\n      ')); }
}
const wait = (ms = 15) => new Promise(r => setTimeout(r, ms));
const until = async (cond, ms = 500) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('timeout esperando condición'); await wait(5); } };

// =====================================================================================
console.log('\nAdaptador local (regresión)');
await test('semilla, CRUD y persistencia en localStorage', () => {
  ls = memStorage();
  const db = createDB('t1', { version: 1, seed: () => ({ items: [{ id: 'a', n: 1 }], cfg: { x: 1 } }) });
  assert.equal(db.isReady, true);
  assert.equal(db.adapter.kind, 'local');
  assert.equal(db.all('items').length, 1);
  const r = db.insert('items', { n: 2 });
  db.update('items', 'a', { n: 10 });
  db.remove('items', r.id);
  db.setValue('cfg', { x: 2 });
  db.log('prueba', 'detalle', 'u1');
  const raw = JSON.parse(ls.getItem('lgw:db:t1'));
  assert.equal(raw._v, 1); assert.equal(raw.items.length, 1); assert.equal(raw.items[0].n, 10); assert.ok(raw.items[0].updatedAt);
  assert.deepEqual(raw.cfg, { x: 2 }); assert.equal(raw._log[0].action, 'prueba');
});
await test('recarga desde localStorage y re-semilla al subir version', () => {
  const again = createDB('t1', { version: 1, seed: () => ({ items: [] }) });
  assert.equal(again.get('items', 'a').n, 10);
  const v2 = createDB('t1', { version: 2, seed: () => ({ items: [{ id: 'z' }] }) });
  assert.deepEqual(v2.all('items').map(i => i.id), ['z']);
});
await test('sincroniza pestañas con el evento storage', () => {
  const db = createDB('t2', { version: 1, seed: () => ({ items: [] }) });
  const seen = [];
  db.subscribe(c => seen.push(c.type));
  const other = JSON.parse(ls.getItem('lgw:db:t2')); other.items.push({ id: 'remota' });
  dispatch('storage', { key: 'lgw:db:t2', newValue: JSON.stringify(other) });
  assert.equal(db.get('items', 'remota').id, 'remota');
  assert.deepEqual(seen, ['sync']);
});
await test('cuota llena: libera la base visitada hace más tiempo (LRU)', () => {
  ls = memStorage(2600);
  Object.defineProperty(globalThis, 'localStorage', { get: () => lsProxy(), configurable: true });
  const big = n => ({ rows: Array.from({ length: n }, (_, i) => ({ id: 'r' + i, pad: 'x'.repeat(40) })) });
  createDB('vieja', { version: 1, seed: () => big(14) });
  createDB('nueva', { version: 1, seed: () => big(14) });
  assert.ok(ls.getItem('lgw:db:nueva'));
  assert.equal(ls.getItem('lgw:db:vieja'), null, 'la base más antigua debió liberarse');
  Object.defineProperty(globalThis, 'localStorage', { get: () => ls, configurable: true });
});
await test('lookup local y files local', async () => {
  ls = memStorage();
  const db = createDB('t3', { version: 1, seed: () => ({ ots: [{ id: 'o1', code: 'OT-1', plate: 'AB-CD-12', secret: 's' }] }) });
  assert.deepEqual(await db.lookup('ots', { code: 'ot-1', plate: 'abcd12' }, ['code']), { code: 'OT-1' });
  assert.equal(await db.lookup('ots', { code: 'OT-1', plate: 'ZZ' }), null);
  globalThis.FileReader = class { readAsDataURL(f) { this.result = 'data:text/plain;base64,aG9sYQ=='; setTimeout(() => this.onload(), 0); } };
  const meta = await db.files.upload({ name: 'hola mundo.txt', size: 4, type: 'text/plain' }, { folder: 'docs' });
  assert.match(meta.path, /^docs\/.+hola_mundo\.txt$/);
  assert.equal(db.files.url(meta.path), 'data:text/plain;base64,aG9sYQ==');
});
await test('auth local: login, logout, cuentas demo ocultas si demo=false', async () => {
  ls = memStorage();
  const db = createDB('t4', { version: 1, seed: () => ({ users: [{ id: 'u1', name: 'Ana', email: 'ana@x.cl', password: 'clave123', role: 'admin', demo: true }] }) });
  const auth = createAuth(db, { roles: { admin: 'Admin' } });
  await assert.rejects(auth.login('ana@x.cl', 'mala'), /incorrectos/);
  const u = await auth.login('ANA@x.cl ', 'clave123');
  assert.equal(auth.current().id, u.id);
  auth.logout(); assert.equal(auth.current(), null);
  const prod = createAuth(db, { roles: {}, demo: false });
  const el = { hidden: false, classList: { add() {} }, addEventListener() {} };
  prod.mountDemoLogin(el); assert.equal(el.hidden, true);
  assert.equal(prod.capabilities.demo, false); assert.equal(prod.capabilities.magicLink, false);
});

// =====================================================================================
console.log('\nAdaptador supabase (contra el doble de supabase-js)');
ls = memStorage();
const COLLECTIONS = { ots: {}, customers: {}, purchaseOrders: {} };
// "RLS" del doble, equivalente a las políticas que genera tools/supabase-schema.mjs para el taller:
// staff ve todo; el cliente solo sus OT (customerId = su perfil); anon no ve nada salvo kv.
function policy({ table, op, row, user, server }) {
  const mine = user && server.tables.profiles.find(p => p.auth_id === user.id);
  const prof = mine?.active ? mine : null;
  const role = prof?.role;
  if (table === 'profiles' && op === 'select' && mine && row.auth_id === user.id) return true; // su propio perfil, aunque esté inactivo
  if (table === 'kv') return op === 'select' || !!role;
  if (table === 'activity_log') return op === 'insert' ? true : role === 'admin';
  if (table === 'profiles') return role === 'admin' || (op === 'select' && (!!role && (role !== 'cliente' || row.auth_id === user.id)));
  if (table === 'storage.objects') return !!role;
  if (!role) return false;
  if (role === 'cliente') return table === 'ots' && op === 'select' && row.data?.customerId === prof.data?.customerId;
  return true;
}
function makeServer(extra = {}) {
  const server = createFakeServer({
    policy,
    tables: {
      profiles: [
        { id: 'u-admin', auth_id: null, email: 'admin@taller.cl', role: 'admin', active: true, name: 'Admin', data: { color: '#123' }, created_at: '2026-01-01T00:00:00Z' },
        { id: 'u-cli', auth_id: null, email: 'cli@correo.cl', role: 'cliente', active: true, name: 'Cliente', data: { customerId: 'c1' }, created_at: '2026-01-02T00:00:00Z' },
        { id: 'u-off', auth_id: null, email: 'off@taller.cl', role: 'admin', active: false, name: 'Ex', data: {}, created_at: '2026-01-03T00:00:00Z' }
      ],
      ots: [
        { id: 'o1', data: { code: 'OT-1', customerId: 'c1', plate: 'AB-CD-12', status: 'recepcion' }, created_at: '2026-02-01T00:00:00Z', updated_at: null },
        { id: 'o2', data: { code: 'OT-2', customerId: 'c2', plate: 'ZZ-ZZ-99', status: 'listo' }, created_at: '2026-02-02T00:00:00Z', updated_at: null }
      ],
      customers: [{ id: 'c1', data: { name: 'Cliente Uno' }, created_at: '2026-01-01T00:00:00Z' }],
      purchase_orders: [],
      kv: [{ key: 'settings', value: { name: 'Taller' } }],
      activity_log: []
    },
    rpc: {
      lgw_lookup({ p_collection, p_match }, user, server) {
        if (p_collection !== 'ots' || Object.keys(p_match).sort().join() !== 'code,plate') throw new Error('búsqueda no permitida');
        const n = v => String(v).replace(/[\s.·-]/g, '').toLowerCase();
        const r = server.tables.ots.find(o => n(o.data.code) === n(p_match.code) && n(o.data.plate) === n(p_match.plate));
        return r ? { code: r.data.code, status: r.data.status } : null;
      }
    },
    // Emula el trigger lgw_handle_new_user: liga el perfil invitado por correo o crea uno de cliente.
    onSignup(u, server) {
      const p = server.tables.profiles.find(x => x.email === u.email && !x.auth_id);
      if (p) p.auth_id = u.id;
      else { const cid = 'c-' + u.id.slice(-6); server.tables.customers.push({ id: cid, data: { name: u.meta?.name || u.email }, created_at: new Date().toISOString() }); server.tables.profiles.push({ id: 'p-' + u.id.slice(-6), auth_id: u.id, email: u.email, role: 'cliente', active: true, name: u.meta?.name || '', data: { customerId: cid }, created_at: new Date().toISOString() }); }
    },
    ...extra
  });
  for (const p of server.tables.profiles) { const u = server.addUser({ email: p.email, password: 'secreta123' }); p.auth_id = u.id; }
  return server;
}
function open(server, { name = 'taller', pageSize } = {}) {
  const client = server.client({ storage: ls, storageKey: `lgw-auth-${name}` });
  const adapter = supabaseAdapter({ client, pageSize });
  adapter.configure({ app: name, collections: COLLECTIONS });
  const db = createDB(name, { version: 1, seed: () => { throw new Error('la semilla no debe usarse con supabase'); }, adapter });
  const auth = createAuth(db, { roles: { admin: 'Admin', cliente: 'Cliente' } });
  return { db, auth, client, adapter };
}

await test('hidrata al abrir: db.isReady pasa de false a true, anon solo ve kv', async () => {
  const s = makeServer();
  const { db, auth } = open(s);
  assert.equal(db.isReady, false);
  await db.ready;
  assert.equal(db.isReady, true);
  assert.equal(db.all('ots').length, 0, 'anon no ve OT');
  assert.equal(db.getValue('settings').name, 'Taller');
  assert.equal(auth.current(), null);
  assert.equal(auth.capabilities.magicLink, true); assert.equal(auth.capabilities.demo, false);
});
await test('login con contraseña: error en español, perfil por authId, RLS distinta tras iniciar sesión', async () => {
  const s = makeServer();
  const { db, auth } = open(s);
  await db.ready;
  await assert.rejects(auth.login('admin@taller.cl', 'mala'), /Correo o contraseña incorrectos/);
  const u = await auth.login('admin@taller.cl', 'secreta123');
  assert.equal(u.id, 'u-admin'); assert.equal(u.role, 'admin'); assert.equal(u.color, '#123');
  assert.equal(auth.current().id, 'u-admin');
  assert.equal(db.all('ots').length, 2, 'admin ve todas las OT');
  assert.equal(db.all('ots')[0].code, 'OT-2', 'orden: más reciente primero');
  await until(() => s.tables.activity_log.some(l => l.action === 'login'));
});
await test('cliente ve solo sus OT; cuenta desactivada no entra', async () => {
  const s = makeServer();
  const { db, auth } = open(s);
  await db.ready;
  await auth.login('cli@correo.cl', 'secreta123');
  assert.deepEqual(db.all('ots').map(o => o.code), ['OT-1']);
  auth.logout();
  await assert.rejects(auth.login('off@taller.cl', 'secreta123'), /desactivada/);
  assert.equal(auth.current(), null);
});
await test('insert/update/remove/setValue/log llegan a las tablas con la forma esperada', async () => {
  const s = makeServer();
  const { db, auth } = open(s);
  await db.ready; await auth.login('admin@taller.cl', 'secreta123');
  const r = db.insert('ots', { code: 'OT-3', customerId: 'c1', plate: 'XX-YY-11' });
  db.update('ots', r.id, { status: 'diagnostico' });         // encolado justo detrás del insert
  db.insert('purchaseOrders', { code: 'OC-1' });              // camelCase → purchase_orders
  db.setValue('_seq:ot', 3);
  db.log('ot', 'OT-3 creada', 'u-admin');
  db.remove('ots', 'o2');
  await until(() => s.tables.kv.some(k => k.key === '_seq:ot') && !s.tables.ots.some(o => o.id === 'o2'));
  const row = s.tables.ots.find(o => o.id === r.id);
  assert.deepEqual(Object.keys(row).sort(), ['created_at', 'data', 'id', 'updated_at']);
  assert.equal(row.data.status, 'diagnostico'); assert.equal(row.data.code, 'OT-3'); assert.ok(row.updated_at);
  assert.equal(row.data.id, undefined, 'id no se duplica dentro de data');
  assert.equal(s.tables.purchase_orders.length, 1);
  assert.equal(s.tables.kv.find(k => k.key === '_seq:ot').value, 3);
  assert.ok(s.tables.activity_log.some(l => l.action === 'ot' && l.user_id === 'u-admin'));
});
await test('perfiles: nunca se envía la contraseña y no se pisa auth_id', async () => {
  const row = toRow('users', { id: 'u1', name: 'A', email: 'A@X.CL', password: 'x', role: 'admin', authId: 'abc', phone: '1' });
  assert.equal(row.email, 'a@x.cl'); assert.equal(row.data.password, undefined); assert.equal(row.data.phone, '1'); assert.equal(row.auth_id, 'abc');
  const s = makeServer();
  const { db, auth } = open(s);
  await db.ready; await auth.login('admin@taller.cl', 'secreta123');
  const before = s.tables.profiles.find(p => p.id === 'u-cli').auth_id;
  db.update('users', 'u-cli', { name: 'Cliente Editado', authId: 'hackeado' });
  await until(() => s.tables.profiles.find(p => p.id === 'u-cli').name === 'Cliente Editado');
  assert.equal(s.tables.profiles.find(p => p.id === 'u-cli').auth_id, before);
});
await test('realtime: cambios de otro usuario llegan a la foto y disparan subscribe', async () => {
  const s = makeServer();
  const a = open(s, { name: 'rtA' }); await a.db.ready; await a.auth.login('admin@taller.cl', 'secreta123');
  ls = memStorage(); // otra "máquina"
  const b = open(s, { name: 'rtB' }); await b.db.ready; await b.auth.login('admin@taller.cl', 'secreta123');
  const seen = [];
  a.db.subscribe(c => seen.push(`${c.type}:${c.col || c.key || ''}:${c.remote ? 'r' : 'l'}`));
  const r = b.db.insert('ots', { code: 'OT-9', customerId: 'c1' });
  await until(() => a.db.get('ots', r.id));
  b.db.update('ots', r.id, { status: 'listo' });
  await until(() => a.db.get('ots', r.id)?.status === 'listo');
  b.db.setValue('settings', { name: 'Nuevo nombre' });
  await until(() => a.db.getValue('settings').name === 'Nuevo nombre');
  b.db.remove('ots', r.id);
  await until(() => !a.db.get('ots', r.id));
  assert.ok(seen.includes('insert:ots:r') && seen.includes('update:ots:r') && seen.includes('remove:ots:r') && seen.includes('value:settings:r'), seen.join(' '));
});
await test('realtime: un eco atrasado no pisa una edición local más nueva', async () => {
  const s = makeServer();
  const { db, auth } = open(s); await db.ready; await auth.login('admin@taller.cl', 'secreta123');
  const live = db.get('ots', 'o1');
  db.update('ots', 'o1', { status: 'diagnostico' });
  db.update('ots', 'o1', { status: 'presupuesto' });
  await wait(60);
  assert.equal(db.get('ots', 'o1').status, 'presupuesto');
  assert.equal(db.get('ots', 'o1'), live, 'se conserva el objeto vivo');
});
await test('RLS rechaza un UPDATE (0 filas): evento error y la foto vuelve a la verdad del servidor', async () => {
  const s = makeServer();
  const { db, auth } = open(s); await db.ready; await auth.login('cli@correo.cl', 'secreta123');
  const errors = [];
  db.subscribe(c => c.type === 'error' && errors.push(c.error.message));
  db.update('ots', 'o1', { status: 'entregado' });
  assert.equal(db.get('ots', 'o1').status, 'entregado', 'optimista');
  await until(() => errors.length && db.get('ots', 'o1').status === 'recepcion');
  assert.match(errors[0], /permiso/);
  assert.equal(s.tables.ots.find(o => o.id === 'o1').data.status, 'recepcion');
});
await test('RLS rechaza un INSERT (42501): se avisa y la fila optimista desaparece', async () => {
  const s = makeServer();
  const { db, auth } = open(s); await db.ready; await auth.login('cli@correo.cl', 'secreta123');
  const errors = [];
  db.subscribe(c => c.type === 'error' && errors.push(c.error));
  const r = db.insert('customers', { name: 'Intruso' });
  await until(() => errors.length && !db.get('customers', r.id));
  assert.equal(errors[0].code, '42501'); assert.match(errors[0].message, /RLS/);
});
await test('enlace mágico: usuario invitado por correo queda ligado a su perfil', async () => {
  const s = makeServer();
  s.tables.profiles.push({ id: 'u-new', auth_id: null, email: 'nuevo@taller.cl', role: 'admin', active: true, name: 'Nuevo', data: {}, created_at: '2026-03-01T00:00:00Z' });
  const { db, auth, client } = open(s); await db.ready;
  await auth.magicLink('nuevo@taller.cl', { redirectTo: 'https://taller.cl/login.html?next=admin.html' });
  assert.equal(s.outbox.at(-1).redirectTo, 'https://taller.cl/login.html?next=admin.html');
  await s.followMagicLink(client, 'nuevo@taller.cl');
  await wait(5);
  await db.refresh();
  assert.equal(auth.current()?.id, 'u-new');
});
await test('registro (portal): el "trigger" crea perfil cliente + ficha de cliente', async () => {
  const s = makeServer();
  const { db, auth } = open(s); await db.ready;
  const u = await auth.register({ name: 'Rosa', email: 'rosa@correo.cl', password: 'clave1234', role: 'cliente' });
  assert.equal(u.role, 'cliente'); assert.ok(u.customerId);
  assert.equal(s.users.find(x => x.email === 'rosa@correo.cl').meta.name, 'Rosa');
  await assert.rejects(auth.register({ name: 'Rosa', email: 'rosa@correo.cl', password: 'x' }), /ya está registrado/);
});
await test('logout borra la sesión guardada de inmediato (antes de que la página navegue)', async () => {
  const s = makeServer();
  const { db, auth } = open(s, { name: 'lo' }); await db.ready; await auth.login('admin@taller.cl', 'secreta123');
  assert.ok(ls.getItem('lgw-auth-lo'));
  auth.logout();
  assert.equal(ls.getItem('lgw-auth-lo'), null);
  assert.equal(auth.current(), null);
});
await test('Storage: subir, URL pública, duplicado y eliminar', async () => {
  const s = makeServer();
  const { db, auth } = open(s); await db.ready; await auth.login('admin@taller.cl', 'secreta123');
  const meta = await db.files.upload({ name: 'foto ingreso.jpg', size: 2048, type: 'image/jpeg' }, { folder: 'ots' });
  assert.match(meta.path, /^taller\/ots\/.+-foto_ingreso\.jpg$/);
  assert.match(db.files.url(meta.path), /\/storage\/v1\/object\/public\/archivos\/taller\/ots\//);
  assert.equal(s.storage.archivos[meta.path].type, 'image/jpeg');
  await db.files.remove(meta.path);
  assert.equal(s.storage.archivos[meta.path], undefined);
  auth.logout();
  await assert.rejects(db.files.upload({ name: 'x.jpg', size: 1, type: 'image/jpeg' }), /Subir archivo/);
});
await test('lookup público por RPC (código + patente) sin sesión', async () => {
  const s = makeServer();
  const { db } = open(s); await db.ready;
  assert.deepEqual(await db.lookup('ots', { code: 'OT-1', plate: 'abcd12' }), { code: 'OT-1', status: 'recepcion' });
  assert.equal(await db.lookup('ots', { code: 'OT-1', plate: 'otra' }), null);
  await assert.rejects(db.lookup('customers', { name: 'x' }), /no permitida/);
});
await test('paginación al hidratar (pageSize pequeño)', async () => {
  const s = makeServer();
  for (let i = 0; i < 7; i++) s.tables.customers.push({ id: 'cx' + i, data: { name: 'C' + i }, created_at: `2026-04-0${i + 1}T00:00:00Z` });
  const { db, auth } = open(s, { pageSize: 3 }); await db.ready; await auth.login('admin@taller.cl', 'secreta123');
  assert.equal(db.all('customers').length, 8);
});
await test('tabla faltante: db.ready falla con instrucción de aplicar schema.sql', async () => {
  const s = makeServer();
  delete s.tables.customers;
  const { db } = open(s);
  await assert.rejects(db.ready, /schema\.sql/);
});
await test('reset no existe con supabase (se avisa, no borra nada)', async () => {
  const s = makeServer();
  const { db, auth } = open(s); await db.ready; await auth.login('admin@taller.cl', 'secreta123');
  const errors = [];
  db.subscribe(c => c.type === 'error' && errors.push(c.error.message));
  db.reset();
  await until(() => errors.length);
  assert.match(errors[0], /no existe con Supabase/);
  assert.equal(s.tables.ots.length, 2);
  await until(() => db.all('ots').length === 2);
});

const bad = results.filter(r => !r[0]);
console.log(`\n${results.length - bad.length}/${results.length} pruebas OK`);
process.exit(bad.length ? 1 : 0);
