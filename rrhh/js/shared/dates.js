// Utilidades de fecha con claves locales 'YYYY-MM-DD'.
const pad = n => String(n).padStart(2, '0');
export const dkey = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const today = () => dkey();
export const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
export const dow = k => parseKey(k).getDay();
export const isWeekend = k => { const w = dow(k); return w === 0 || w === 6; };
export const startOfWeek = k => { const w = dow(k); return addDays(k, w === 0 ? -6 : 1 - w); };
export const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DOW_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const fmtDay = (k, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => parseKey(k).toLocaleDateString('es-CL', opts);
export const hm = (d = new Date()) => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
export function weekdaysBack(n, from = today()) {
  const out = []; let k = from;
  while (out.length < n) { if (!isWeekend(k)) out.unshift(k); k = addDays(k, -1); }
  return out;
}
