// Calendario mensual simple para actividades de voluntariado.
import { escape } from '../../../assets/core/ui.js';
const DOW = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
export function monthCalendar(year, month, events, { onlyDots = false } = {}) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const todayKey = new Date().toISOString().slice(0, 10);
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push('<div class="cal-cell pad"></div>');
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ev = events.filter(e => e.date === key);
    cells.push(`<div class="cal-cell ${key === todayKey ? 'today' : ''} ${ev.length ? 'has' : ''}"><span class="cal-d">${d}</span>
      ${ev.map(e => `<button type="button" class="cal-ev ${e.cls || ''}" data-ev="${escape(e.id)}" title="${escape(e.title)}">${onlyDots ? '' : escape(e.title)}</button>`).join('')}</div>`);
  }
  const label = first.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return `<div class="cal"><div class="cal-head"><button type="button" class="btn btn-sm btn-ghost" data-cal="-1" aria-label="Mes anterior">←</button><b class="cal-title">${escape(label)}</b><button type="button" class="btn btn-sm btn-ghost" data-cal="1" aria-label="Mes siguiente">→</button></div>
    <div class="cal-grid">${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells.join('')}</div></div>`;
}
