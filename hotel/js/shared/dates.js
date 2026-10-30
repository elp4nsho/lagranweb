// Utilidades de fechas en formato ISO de día (YYYY-MM-DD), sin zonas horarias.
const pad = n => String(n).padStart(2, '0');
export const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
export const eachNight = (a, b) => { const out = []; for (let d = a; d < b; d = addDays(d, 1)) out.push(d); return out; };
export const overlaps = (a1, b1, a2, b2) => a1 < b2 && a2 < b1;
export const isWeekendNight = s => [5, 6].includes(parse(s).getDay());
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const fmtDay = (s, { weekday = false, year = false } = {}) => { const d = parse(s); return `${weekday ? DAYS[d.getDay()] + ' ' : ''}${d.getDate()} ${MONTHS[d.getMonth()]}${year ? ' ' + d.getFullYear() : ''}`; };
export const fmtRange = (a, b) => `${fmtDay(a)} → ${fmtDay(b, { year: true })}`;
export const dowShort = s => DAYS[parse(s).getDay()];
export const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
