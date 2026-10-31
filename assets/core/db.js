// "Backend" simulado: base de datos documental sobre localStorage.
// Cada app crea la suya con datos semilla y la comparte entre sitio público y admin
// (y entre pestañas, vía el evento storage).
//
//   import { createDB } from '../../assets/core/db.js';
//   export const db = createDB('tienda', { version: 1, seed: () => ({ products: [...], orders: [...] }) });
//   db.all('products'); db.insert('orders', {...}); db.update('products', id, { stock: 3 });

import { localAdapter } from './store/local.js';

export function uid(prefix = '') {
  return prefix + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
}

// Base documental en memoria con un motor de almacenamiento enchufable (`adapter`).
// Sin adapter = `local` (localStorage), idéntico a como funcionó siempre. Las lecturas son síncronas
// sobre la foto en memoria; las escrituras se aplican al tiro (optimistas) y el adaptador las persiste.
//   createDB('taller', { version, seed, adapter: supabaseAdapter({ url, anonKey, tables }) })
//   await db.ready                // hidratación remota (inmediata en local)
export function createDB(name, { version = 1, seed = () => ({}), adapter = null } = {}) {
  const engine = adapter || localAdapter();
  const listeners = new Set();

  function fresh() {
    const s = seed() || {};
    const out = { _v: version, _log: [] };
    for (const [col, rows] of Object.entries(s)) {
      out[col] = Array.isArray(rows) ? rows.map(r => ({ id: r.id || uid(), createdAt: r.createdAt || new Date().toISOString(), ...r })) : rows;
    }
    return out;
  }
  const emit = change => listeners.forEach(fn => { try { fn(change); } catch (e) { console.error(e); } });
  const opened = engine.open({ name, version, fresh }) || {};
  let data = opened.data || { _v: version, _log: [] };
  let isReady = !opened.ready;
  const ready = Promise.resolve(opened.ready).then(d => {
    if (d && typeof d === 'object') data = d;
    if (!isReady) { isReady = true; emit({ type: 'sync' }); }
    return db;
  });

  function persist(change) {
    let r;
    try { r = engine.write(change, data); } catch (e) { r = Promise.reject(e); }
    if (r && typeof r.then === 'function') r.catch(error => failed(error, change));
    emit(change);
  }
  // Una escritura remota falló (red, RLS…): avisamos y el adaptador recupera la verdad del servidor.
  function failed(error, change) {
    console.error('[db] escritura rechazada', change?.type, change?.col || change?.key || '', error);
    emit({ type: 'error', error, change });
    if (engine.recover) Promise.resolve(engine.recover(change, data)).then(d => { if (d) { data = d; emit({ type: 'sync' }); } }).catch(() => {});
  }
  function col(c) { if (!Array.isArray(data[c])) data[c] = []; return data[c]; }

  // Cambios que llegan desde afuera (otra pestaña, otro usuario vía realtime).
  engine.watch && engine.watch(msg => {
    if (!msg) return;
    if (msg.type === 'sync') { if (msg.data) data = msg.data; return emit({ type: 'sync' }); }
    if (msg.type === 'value') { data[msg.key] = msg.value; return emit({ type: 'value', key: msg.key, remote: true }); }
    if (msg.type === 'log') { if (!col('_log').some(l => l.id === msg.row.id)) { col('_log').unshift(msg.row); data._log = data._log.slice(0, 300); } return emit({ type: 'log', remote: true }); }
    const arr = col(msg.col);
    const i = arr.findIndex(r => r.id === (msg.row?.id ?? msg.id));
    // Eco atrasado de una escritura propia (llega después de otra edición local más nueva): se ignora.
    if (msg.type === 'update' && i >= 0 && arr[i].updatedAt && msg.row.updatedAt && arr[i].updatedAt > msg.row.updatedAt) return;
    if (msg.type === 'remove') { if (i >= 0) arr.splice(i, 1); }
    else if (i >= 0) { for (const k of Object.keys(arr[i])) if (!(k in msg.row)) delete arr[i][k]; Object.assign(arr[i], msg.row); } // mismo objeto vivo
    else arr.unshift(msg.row);
    emit({ type: msg.type, col: msg.col, row: msg.row, remote: true });
  });

  const db = {
    name,
    adapter: engine,
    ready,
    get isReady() { return isReady; },
    all: c => col(c).slice(),
    get: (c, id) => col(c).find(r => r.id === id) || null,
    find: (c, fn) => col(c).find(fn) || null,
    query: (c, fn = () => true) => col(c).filter(fn),
    count: (c, fn) => (fn ? col(c).filter(fn) : col(c)).length,
    insert(c, obj) {
      const row = { id: uid(), createdAt: new Date().toISOString(), ...obj };
      col(c).unshift(row);
      persist({ type: 'insert', col: c, row });
      return row;
    },
    update(c, id, patch) {
      const row = col(c).find(r => r.id === id);
      if (!row) return null;
      const p = typeof patch === 'function' ? patch(row) : patch;
      Object.assign(row, p, { updatedAt: new Date().toISOString() });
      persist({ type: 'update', col: c, row, patch: p });
      return row;
    },
    remove(c, id) {
      const arr = col(c), i = arr.findIndex(r => r.id === id);
      if (i < 0) return false;
      const [row] = arr.splice(i, 1);
      persist({ type: 'remove', col: c, row });
      return true;
    },
    // Valores sueltos (configuración del sitio, contadores, etc.)
    getValue: (k, def = null) => (k in data ? data[k] : def),
    setValue(k, v) { data[k] = v; persist({ type: 'value', key: k, value: v }); return v; },
    // Bitácora de actividad que muestran los paneles admin.
    log(action, detail = '', user = null) {
      const row = { id: uid(), at: new Date().toISOString(), action, detail, user };
      col('_log').unshift(row);
      data._log = data._log.slice(0, 300);
      persist({ type: 'log', row });
    },
    // Con un backend real (engine.canReset === false) no se borra nada: el adaptador rechaza y se avisa.
    reset() { if (engine.canReset === false) return persist({ type: 'reset' }); data = fresh(); persist({ type: 'reset', data }); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    export: () => JSON.parse(JSON.stringify(data)),
    // Vuelve a leer todo desde el almacenamiento (en remoto: tras iniciar sesión cambia lo que RLS deja ver).
    async refresh() {
      if (!engine.refresh) return db;
      const d = await engine.refresh();
      if (d) { data = d; emit({ type: 'sync' }); }
      return db;
    },
    // Búsqueda pública acotada (seguimiento por código + patente). En local es un find sobre la foto;
    // en remoto llama a una función SQL que solo devuelve los campos permitidos.
    async lookup(c, match, fields = null) {
      if (engine.lookup) return engine.lookup(c, match, fields);
      const n = v => String(v ?? '').replace(/[\s.·-]/g, '').toLowerCase();
      const row = col(c).find(r => Object.entries(match).every(([k, v]) => n(r[k]) === n(v)));
      if (!row) return null;
      return fields ? Object.fromEntries(fields.map(f => [f, row[f]])) : { ...row };
    },
    // Archivos (fotos de ingreso, comprobantes…): local = data: URL; supabase = Storage.
    files: engine.files || null
  };
  return db;
}

// Simula la latencia de una API: await api(() => db.all('orders'))
export function api(fn, { latency = [180, 520], failRate = 0 } = {}) {
  const ms = Array.isArray(latency) ? latency[0] + Math.random() * (latency[1] - latency[0]) : latency;
  return new Promise((resolve, reject) => setTimeout(() => {
    if (Math.random() < failRate) return reject(new Error('Error de red simulado'));
    try { resolve(fn()); } catch (e) { reject(e); }
  }, ms));
}

// Generador pseudoaleatorio reproducible para semillas (mismos datos en cada carga).
export function rng(seed = 42) {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.bool = (p = .5) => r() < p;
  r.daysAgo = (max, min = 0) => new Date(Date.now() - (min + r() * (max - min)) * 864e5).toISOString();
  return r;
}
