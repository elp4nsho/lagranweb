// Calendario mensual simple (portal y panel).
import { escape } from '../../../assets/core/ui.js';
import { dkey, today, addDays, DOW } from './dates.js';
import { isHoliday } from './vacation.js';

export function monthCal(ym, eventsFor) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12), start = addDays(dkey(first), -((first.getDay() + 6) % 7));
  let cells = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="h">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const k = addDays(start, i), d = new Date(k + 'T12:00'), out = d.getMonth() !== m - 1, we = d.getDay() === 0 || d.getDay() === 6;
    if (i >= 35 && out) break;
    const evs = eventsFor(k) || [];
    cells += `<div class="d${out ? ' out' : ''}${we ? ' we' : ''}${isHoliday(k) ? ' hol' : ''}${k === today() ? ' today' : ''}" title="${isHoliday(k) ? 'Feriado' : ''}"><span class="n">${d.getDate()}</span>${isHoliday(k) && !out ? '<span class="ev" style="background:transparent;color:var(--warning)">Feriado</span>' : ''}${evs.slice(0, 3).map(e => `<span class="ev ${e.cls || ''}" title="${escape(e.title || e.label)}">${escape(e.label)}</span>`).join('')}${evs.length > 3 ? `<span class="ev">+${evs.length - 3}</span>` : ''}</div>`;
  }
  return `<div class="mcal">${cells}</div>`;
}
export const monthLabel = ym => new Date(ym + '-15T12:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
export const shiftMonth = (ym, n) => { const d = new Date(ym + '-15T12:00'); d.setMonth(d.getMonth() + n); return dkey(d).slice(0, 7); };
export { DOW };
