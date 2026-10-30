// "Backend" simulado: base de datos documental sobre localStorage.
// Cada app crea la suya con datos semilla y la comparte entre sitio público y admin
// (y entre pestañas, vía el evento storage).
//
//   import { createDB } from '../../assets/core/db.js';
//   export const db = createDB('tienda', { version: 1, seed: () => ({ products: [...], orders: [...] }) });
//   db.all('products'); db.insert('orders', {...}); db.update('products', id, { stock: 3 });

const memory = {};
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return memory[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { memory[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { delete memory[k]; } }
};

export function uid(prefix = '') {
  return prefix + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
}

export function createDB(name, { version = 1, seed = () => ({}) } = {}) {
  const key = `lgw:db:${name}`;
  const listeners = new Set();
  let data = load();

  function fresh() {
    const s = seed() || {};
    const out = { _v: version, _log: [] };
    for (const [col, rows] of Object.entries(s)) {
      out[col] = Array.isArray(rows) ? rows.map(r => ({ id: r.id || uid(), createdAt: r.createdAt || new Date().toISOString(), ...r })) : rows;
    }
    return out;
  }
  function load() {
    try {
      const raw = JSON.parse(storage.get(key));
      if (raw && raw._v === version) return raw;
    } catch (e) { /* datos corruptos → reseed */ }
    const d = fresh();
    storage.set(key, JSON.stringify(d));
    return d;
  }
  function persist(change) {
    storage.set(key, JSON.stringify(data));
    listeners.forEach(fn => { try { fn(change); } catch (e) { console.error(e); } });
  }
  function col(c) { if (!Array.isArray(data[c])) data[c] = []; return data[c]; }

  window.addEventListener('storage', e => {
    if (e.key !== key) return;
    try { data = JSON.parse(e.newValue) || fresh(); } catch (err) { return; }
    listeners.forEach(fn => fn({ type: 'sync' }));
  });

  const db = {
    name,
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
      Object.assign(row, typeof patch === 'function' ? patch(row) : patch, { updatedAt: new Date().toISOString() });
      persist({ type: 'update', col: c, row });
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
    setValue(k, v) { data[k] = v; persist({ type: 'value', key: k }); return v; },
    // Bitácora de actividad que muestran los paneles admin.
    log(action, detail = '', user = null) {
      col('_log').unshift({ id: uid(), at: new Date().toISOString(), action, detail, user });
      data._log = data._log.slice(0, 300);
      persist({ type: 'log' });
    },
    reset() { data = fresh(); persist({ type: 'reset' }); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    export: () => JSON.parse(JSON.stringify(data))
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
