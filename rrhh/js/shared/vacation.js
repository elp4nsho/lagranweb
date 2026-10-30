// Días hábiles, feriados (Chile, referenciales) y saldo de vacaciones.
import { parseKey, addDays, dkey, today } from './dates.js';

export const HOLIDAYS = new Set([
  '2025-01-01', '2025-04-18', '2025-04-19', '2025-05-01', '2025-05-21', '2025-06-20', '2025-06-29', '2025-07-16', '2025-08-15', '2025-09-18', '2025-09-19', '2025-10-12', '2025-10-31', '2025-11-01', '2025-12-08', '2025-12-25',
  '2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01', '2026-05-21', '2026-06-21', '2026-06-29', '2026-07-16', '2026-08-15', '2026-09-18', '2026-09-19', '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-03-26', '2027-03-27', '2027-05-01', '2027-05-21', '2027-06-21', '2027-06-29', '2027-07-16', '2027-08-15', '2027-09-18', '2027-09-19', '2027-10-11', '2027-10-31', '2027-11-01', '2027-12-08', '2027-12-25'
]);
export const isHoliday = k => HOLIDAYS.has(k);
export const isWorkday = k => { const d = parseKey(k).getDay(); return d !== 0 && d !== 6 && !HOLIDAYS.has(k); };
export function businessDays(from, to) {
  if (!from || !to || to < from) return 0;
  let n = 0, k = from, guard = 0;
  while (k <= to && guard++ < 800) { if (isWorkday(k)) n++; k = addDays(k, 1); }
  return n;
}
export const DEFAULT_POLICY = { diasBase: 15, progresivoDesdeAnios: 10, progresivoCadaAnios: 3, maxAcumulado: 30, anticipacionMin: 5, aprobacion: 'jefatura', medioDia: true, adminDias: 2 };

export function yearsOfService(emp, at = today()) { return Math.max(0, (parseKey(at) - parseKey(emp.hireDate)) / (365.25 * 864e5)); }
export function entitlement(emp, policy = DEFAULT_POLICY) {
  const y = yearsOfService(emp) + (emp.priorYears || 0);
  const prog = y >= policy.progresivoDesdeAnios ? Math.floor((y - policy.progresivoDesdeAnios) / policy.progresivoCadaAnios) + 1 : 0;
  return policy.diasBase + prog;
}
// Saldo del año en curso: arrastre + devengado proporcional − usado − pendiente.
export function vacationBalance(db, emp, policy = DEFAULT_POLICY) {
  const T = today(), y = T.slice(0, 4), start = emp.hireDate > `${y}-01-01` ? emp.hireDate : `${y}-01-01`;
  const months = Math.max(0, (parseKey(T) - parseKey(start)) / (30.44 * 864e5));
  const ent = entitlement(emp, policy);
  const accrued = Math.min(policy.maxAcumulado, (emp.vacCarry || 0) + ent * Math.min(12, months) / 12);
  const reqs = db.query('requests', r => r.employeeId === emp.id && r.type === 'vacaciones' && r.from >= `${y}-01-01`);
  const used = reqs.filter(r => r.status === 'aprobada').reduce((s, r) => s + r.days, 0);
  const pending = reqs.filter(r => r.status === 'pendiente').reduce((s, r) => s + r.days, 0);
  return { entitlement: ent, carry: emp.vacCarry || 0, accrued: Math.round(accrued * 10) / 10, used, pending, available: Math.round((accrued - used - pending) * 10) / 10 };
}
export const fmtDays = n => `${String(Math.round(n * 10) / 10).replace('.', ',')} día${n === 1 ? '' : 's'}`;
export { dkey };
