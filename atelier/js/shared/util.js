// Utilidades de dominio compartidas: fechas locales, RUT, patentes y meses.
export const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
export const ymd = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const today = () => ymd();
export const addDays = (d, n) => { const x = new Date(typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d); x.setDate(x.getDate() + n); return x; };
export const fromYmd = s => new Date(s + 'T12:00:00');
export const fmtDay = (d, { weekday = false, year = false } = {}) => new Date(typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d)
  .toLocaleDateString('es-CL', { ...(weekday ? { weekday: 'short' } : {}), day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
export const monthKey = d => ymd(d).slice(0, 7);
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const monthLabel = key => MONTHS[+key.slice(5, 7) - 1];
// Últimos n meses (incluye el actual) como claves 'AAAA-MM'.
export function lastMonths(n) {
  const out = [], d = new Date(); d.setDate(15);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); out.push(monthKey(x)); }
  return out;
}
// Días hábiles siguientes (lun–sáb) desde mañana.
export function nextWorkdays(n, { saturdays = true } = {}) {
  const out = []; let d = addDays(new Date(), 1);
  while (out.length < n) { const w = d.getDay(); if (w !== 0 && (saturdays || w !== 6)) out.push(ymd(d)); d = addDays(d, 1); }
  return out;
}

// ---------- RUT chileno ----------
export function rutDv(n) {
  let s = 0, m = 2;
  for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
export const fmtRut = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${rutDv(n)}`;
export const genRut = r => fmtRut(r.int(7_000_000, 22_000_000));
export function validRut(s) {
  const c = String(s).replace(/[^0-9kK]/g, '').toUpperCase();
  if (c.length < 8) return false;
  return rutDv(c.slice(0, -1)) === c.slice(-1);
}
// ---------- Patentes (formato nuevo LLLL-NN) ----------
const PL = 'BCDFGHJKLPRSTVWXYZ';
export const genPlate = r => Array.from({ length: 4 }, () => r.pick(PL)).join('') + '-' + String(r.int(10, 99));
export const normPlate = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^([A-Z]{4})(\d{2})$/, '$1-$2');

// ---------- Personas ----------
export const FIRST = ['Matías', 'Sofía', 'Benjamín', 'Valentina', 'Vicente', 'Isidora', 'Tomás', 'Antonia', 'Joaquín', 'Fernanda', 'Cristóbal', 'Javiera', 'Felipe', 'Catalina', 'Sebastián', 'Constanza', 'Rodrigo', 'Francisca', 'Ignacio', 'Martina', 'Diego', 'Paula', 'Andrés', 'Camila', 'José Tomás', 'María Jesús', 'Nicolás', 'Florencia', 'Gonzalo', 'Trinidad'];
export const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'Fuentes', 'Torres', 'Araya', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Larraín', 'Errázuriz', 'Vial', 'Undurraga', 'Echeverría', 'Bascuñán', 'Ossa', 'Cruz'];
export const fullName = r => `${r.pick(FIRST)} ${r.pick(LAST)} ${r.pick(LAST)}`;
export const emailOf = (name, domain) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(' ').slice(0, 2).join('.').replace(/[^a-z.]/g, '') + '@' + domain;
export const phone = r => `+56 9 ${r.int(5000, 9999)} ${r.int(1000, 9999)}`;
export const round = (n, to = 1000) => Math.round(n / to) * to;
