// Utilidades: RUT, patentes, fechas y preferencias de interfaz por visitante.
export const DAY = 864e5;
export const ymd = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const parseYmd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / DAY);
export const monthKey = d => ymd(d).slice(0, 7);
export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const monthLabel = k => { const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} ${y.slice(2)}`; };
export function lastMonths(n) {
  const out = [], d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(ymd(x).slice(0, 7)); }
  return out;
}
export const fdate = s => parseYmd(s).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
export const fdateLong = s => parseYmd(s).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
export const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const nf = n => new Intl.NumberFormat('es-CL').format(Math.round(n || 0));
export const nf1 = (n, d = 1) => (n || 0).toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- RUT (módulo 11) ----------
export function rutDv(num) {
  let s = 0, m = 2;
  for (let i = String(num).length - 1; i >= 0; i--) { s += +String(num)[i] * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
export const rutClean = r => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();
export function rutValid(r) {
  const c = rutClean(r);
  if (c.length < 8) return false;
  return rutDv(c.slice(0, -1)) === c.slice(-1);
}
export function rutFormat(r) {
  const c = rutClean(r);
  if (c.length < 2) return c;
  return c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + c.slice(-1);
}
export const makeRut = num => rutFormat(String(num) + rutDv(num));

// ---------- Patentes chilenas (formato nuevo BBBB·99, antiguo BB·9999) ----------
const PL = 'BCDFGHJKLPRSTVWXYZ';
export function makePatente(r) {
  const L = () => PL[Math.floor(r() * PL.length)];
  return `${L()}${L()}${L()}${L()}${String(Math.floor(r() * 90) + 10)}`;
}
export const patenteClean = p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const patenteFormat = p => { const c = patenteClean(p); return c.length === 6 ? `${c.slice(0, 4)}·${c.slice(4)}` : c; };
export const patenteValid = p => /^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})$/.test(patenteClean(p));
export const VIN_CH = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

// Hash estable (para "historial crediticio" simulado, etc.)
export function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------- Preferencias locales del visitante (comparador, carro de repuestos…) ----------
const UIK = 'lgw:automotora:ui';
export function uiGet(k, def) { try { const o = JSON.parse(localStorage.getItem(UIK) || '{}'); return k in o ? o[k] : def; } catch (e) { return def; } }
export function uiSet(k, v) { try { const o = JSON.parse(localStorage.getItem(UIK) || '{}'); o[k] = v; localStorage.setItem(UIK, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } }
