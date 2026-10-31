// Ayudantes de dominio que se repiten entre apps: máquinas de estado con historial,
// RUT chileno, correlativos (OT-1001), agregados para gráficos.
//
//   import { stateMachine, rut, nextCode, byMonth } from '../../assets/core/domain.js';

import { html } from './ui.js';

const now = () => new Date().toISOString();

// ---------- Máquina de estados con historial ----------
// Un solo lugar para: etiquetas, color (tono de badge), transiciones permitidas, efectos al entrar
// a un estado, historial { at, from, to, by, note } y entrada en la bitácora.
//
//   export const ORDER = stateMachine({
//     states: {
//       nuevo:     { label: 'Nuevo', tone: 'info' },
//       en_ruta:   { label: 'En ruta', tone: 'primary' },
//       entregado: { label: 'Entregado', tone: 'success', final: true },
//       fallido:   { label: 'Fallido', tone: 'danger' }
//     },
//     transitions: { nuevo: ['en_ruta'], en_ruta: ['entregado', 'fallido'], fallido: ['en_ruta'] },
//     onEnter: { entregado: (row, patch) => { patch.deliveredAt = new Date().toISOString(); } },
//     guard: (row, to) => to !== 'en_ruta' || row.driverId ? true : 'Asigna un repartidor primero'
//   });
//   ORDER.move(db, 'orders', id, 'en_ruta', { by: user.id, note: 'Salió de bodega', log: 'pedido', title: o => o.code });
//
// IMPORTANTE (bug "X → X" que tuvieron varias apps): db.get() devuelve el objeto vivo y db.update()
// lo muta. move() captura el estado de origen ANTES de actualizar y arma el texto de la bitácora con él.
export function stateMachine({ field = 'status', history = 'history', states, transitions = null, initial = Object.keys(states)[0], onEnter = {}, guard = null } = {}) {
  const m = {
    field, history, states, initial,
    keys: Object.keys(states),
    get: s => states[s] || { label: s ?? '—', tone: '' },
    label: s => m.get(s).label,
    tone: s => m.get(s).tone || '',
    isFinal: s => !!m.get(s).final,
    // [[valor, etiqueta]] para selects y filtros
    options: () => m.keys.map(k => [k, states[k].label]),
    badge: s => html`<span class="badge${m.tone(s) ? ' badge-' + m.tone(s) : ''}">${m.label(s)}</span>`,
    // Estados a los que se puede pasar desde la fila (respeta transitions y guard)
    next(row) {
      const from = row?.[field] ?? initial;
      const list = transitions ? (transitions[from] || []) : m.keys.filter(k => k !== from);
      return list.filter(to => m.can(row, to) === true);
    },
    // true o un texto con el motivo
    can(row, to) {
      const from = row?.[field] ?? initial;
      if (!states[to]) return `Estado desconocido: ${to}`;
      if (from === to) return 'Ya está en ese estado';
      if (transitions && !(transitions[from] || []).includes(to)) return `No se puede pasar de ${m.label(from)} a ${m.label(to)}`;
      const g = guard ? guard(row, to) : true;
      return g === true || g == null ? true : (g || 'Transición no permitida');
    },
    // Aplica la transición. rowOrId puede ser la fila o su id. Devuelve la fila actualizada, o lanza Error.
    // at (opcional, ISO): fecha del cambio en vez de "ahora" (semillas que simulan el pasado, importaciones).
    move(db, collection, rowOrId, to, { by = null, note = '', log = collection, title = r => r.code || r.name || r.title || r.id, extra = {}, force = false, at = null } = {}) {
      const id = typeof rowOrId === 'string' ? rowOrId : rowOrId.id;
      const current = db.get(collection, id);
      if (!current) throw new Error('Registro no encontrado');
      const from = current[field];               // ← se lee ANTES de mutar
      const ok = force ? (from === to ? 'Ya está en ese estado' : true) : m.can(current, to);
      if (ok !== true) throw new Error(ok);
      const name = title(current);
      const entry = { at: at || now(), from: from ?? null, to, by, note };
      const patch = { [field]: to, [`${field}At`]: entry.at, ...extra };
      if (history) patch[history] = [...(current[history] || []), entry];
      onEnter[to] && onEnter[to](current, patch, entry);
      const row = db.update(collection, id, patch);
      if (log) db.log(log, `${name}: ${m.label(from)} → ${m.label(to)}${note ? ` (${note})` : ''}`, by);
      return row;
    },
    // Historial inicial para semillas: m.seedHistory(['nuevo','en_ruta'], { start, stepHours, by })
    seedHistory(path, { start = Date.now() - 864e5, stepHours = 2, by = null } = {}) {
      const t0 = new Date(start).getTime();
      return path.map((to, i) => ({ at: new Date(t0 + i * stepHours * 3600e3).toISOString(), from: i ? path[i - 1] : null, to, by, note: '' }));
    }
  };
  return m;
}

// ---------- RUT chileno ----------
export const rut = {
  clean: s => String(s || '').replace(/[^0-9kK]/g, '').toUpperCase(),
  dv(body) {
    let sum = 0, mul = 2;
    for (const d of String(body).split('').reverse()) { sum += +d * mul; mul = mul === 7 ? 2 : mul + 1; }
    const r = 11 - (sum % 11);
    return r === 11 ? '0' : r === 10 ? 'K' : String(r);
  },
  valid(s) { const c = rut.clean(s); return c.length >= 2 && rut.dv(c.slice(0, -1)) === c.slice(-1); },
  format(s) { const c = rut.clean(s); if (c.length < 2) return c; return c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + c.slice(-1); },
  // RUT válido a partir de un número (semillas): rut.make(12345678) → '12.345.678-5'
  make: n => rut.format(String(n) + rut.dv(n))
};

// ---------- Correlativos ----------
// nextCode(db, 'pedido', 'PED-', 1001) → 'PED-1001', 'PED-1002'… (contador en db.getValue)
export function nextCode(db, key, prefix = '', start = 1, pad = 0) {
  const k = `_seq:${key}`;
  const n = db.getValue(k, start - 1) + 1;
  db.setValue(k, n);
  return prefix + String(n).padStart(pad, '0');
}

// ---------- Agregados para gráficos ----------
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
// byMonth(rows, 'createdAt', r => r.total, 6) → [{ label: 'may', value }, …] (últimos n meses, para barChart/lineChart)
export function byMonth(rows, dateKey = 'createdAt', value = () => 1, months = 6) {
  const d = new Date(), out = [];
  for (let i = months - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${x.getFullYear()}-${x.getMonth()}`, label: MONTHS[x.getMonth()], value: 0 });
  }
  const idx = Object.fromEntries(out.map((o, i) => [o.key, i]));
  rows.forEach(r => { const t = new Date(r[dateKey]); const i = idx[`${t.getFullYear()}-${t.getMonth()}`]; if (i != null) out[i].value += value(r); });
  return out.map(({ label, value }) => ({ label, value }));
}
// byDay(rows, 'createdAt', fn, 7) → últimos n días
export function byDay(rows, dateKey = 'createdAt', value = () => 1, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(Date.now() - i * 864e5);
    out.push({ key: x.toDateString(), label: x.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''), value: 0 });
  }
  const idx = Object.fromEntries(out.map((o, i) => [o.key, i]));
  rows.forEach(r => { const i = idx[new Date(r[dateKey]).toDateString()]; if (i != null) out[i].value += value(r); });
  return out.map(({ label, value }) => ({ label, value }));
}
// countBy(rows, r => r.status, labelFn?) → [{ label, value }] (para donutChart)
export function countBy(rows, key, label = k => k) {
  const m = new Map();
  rows.forEach(r => { const k = typeof key === 'function' ? key(r) : r[key]; m.set(k, (m.get(k) || 0) + 1); });
  return [...m].map(([k, value]) => ({ key: k, label: label(k), value }));
}
export const sumBy = (rows, fn) => rows.reduce((s, r) => s + (+(typeof fn === 'function' ? fn(r) : r[fn]) || 0), 0);
