// Marcaje de asistencia (entrada/salida) y resumen de horas.
import { toast } from '../../../assets/core/ui.js';
import { today, hm, toMin } from './dates.js';

export const ENTRY_LIMIT = '09:15';
export const todayMark = (db, empId) => db.find('marks', m => m.employeeId === empId && m.date === today());
export const worked = m => m.in && m.out ? Math.max(0, toMin(m.out) - toMin(m.in) - 60) : 0; // descuenta 1 h de colación
export const fmtHours = min => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
export function clock(db, emp, user) {
  const m = todayMark(db, emp.id), now = hm();
  if (!m) { db.insert('marks', { employeeId: emp.id, date: today(), in: now, out: null, geo: 'Casa matriz (simulado)' }); db.log('marcaje', `${emp.name} marcó entrada ${now}`, user?.id); toast(`Entrada registrada a las ${now}${now > ENTRY_LIMIT ? ' (atraso)' : ''}`, now > ENTRY_LIMIT ? 'warning' : 'success'); return 'in'; }
  if (!m.out) { db.update('marks', m.id, { out: now }); db.log('marcaje', `${emp.name} marcó salida ${now}`, user?.id); toast(`Salida registrada a las ${now}. ¡Buen descanso!`, 'success'); return 'out'; }
  toast('Ya registraste entrada y salida hoy', 'info'); return null;
}
export function summary(marks, jornadaDiaria = 8.4 * 60) {
  const days = marks.filter(m => m.in), late = days.filter(m => m.in > ENTRY_LIMIT).length;
  const total = days.reduce((s, m) => s + worked(m), 0);
  const extra = days.reduce((s, m) => s + Math.max(0, worked(m) - jornadaDiaria), 0);
  return { days: days.length, late, total, extra: Math.round(extra) };
}
