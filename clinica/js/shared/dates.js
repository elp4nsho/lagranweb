// Utilidades de fechas locales en formato 'YYYY-MM-DD' y horas 'HH:MM'.
export const pad = n => String(n).padStart(2, '0');
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / 864e5);
export const dow = s => parseYmd(s).getDay(); // 0 = domingo
export const toMin = t => +String(t).slice(0, 2) * 60 + +String(t).slice(3, 5);
export const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const today = () => ymd();
export const fmtDay = (s, opts = { weekday: 'long', day: 'numeric', month: 'long' }) => parseYmd(s).toLocaleDateString('es-CL', opts);
export const fmtShort = s => parseYmd(s).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
export const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DOW_S = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// Lunes de la semana de una fecha
export const weekStart = s => { const d = dow(s); return addDays(s, d === 0 ? -6 : 1 - d); };
export const age = birth => { if (!birth) return ''; const b = parseYmd(birth), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
