// Mantiene "vivos" los datos demo: si pasaron horas desde que se generaron, corre todas
// las fechas hacia adelante (en bloques de 30 min) para que la operación de "hoy" siga
// teniendo autos en bahía, reservas próximas e historial reciente.
const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const D = /^\d{4}-\d{2}-\d{2}$/;
const STEP = 30 * 60e3;
const pad = n => String(n).padStart(2, '0');
const dayKey = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const shiftDay = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

export function timeshift(name, minGap = 2 * 3600e3) {
  const key = 'lgw:db:' + name;
  let raw;
  try { raw = JSON.parse(localStorage.getItem(key)); } catch (e) { return; }
  if (!raw || typeof raw._anchor !== 'number') return;
  const delta = Math.round((Date.now() - raw._anchor) / STEP) * STEP;
  if (delta < minGap) return;
  const days = Math.round((dayKey(raw._anchor + delta) - dayKey(raw._anchor)) / 864e5);
  const walk = v => {
    if (typeof v === 'string') {
      if (DT.test(v)) { const t = Date.parse(v); return isNaN(t) ? v : new Date(t + delta).toISOString(); }
      if (D.test(v)) return days ? shiftDay(v, days) : v;
      return v;
    }
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = walk(v[i]); return v; }
    if (v && typeof v === 'object') { for (const k in v) v[k] = walk(v[k]); return v; }
    return v;
  };
  for (const k in raw) if (k !== '_anchor' && k !== '_v') raw[k] = walk(raw[k]);
  raw._anchor += delta;
  try { localStorage.setItem(key, JSON.stringify(raw)); } catch (e) { /* sin espacio: se queda como estaba */ }
}
