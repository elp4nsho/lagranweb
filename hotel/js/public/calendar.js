// Calendario de rango (llegada → salida) con dos meses, navegación y precio "desde" por noche.
import { iso, parse, addDays, today, monthName } from '../shared/dates.js';

export function rangeCalendar(el, { checkIn = '', checkOut = '', min = today(), months = 2, priceFor = null, onChange = () => {} } = {}) {
  let a = checkIn, b = checkOut;
  const start = parse(a || min);
  let y = start.getFullYear(), m = start.getMonth();
  const paint = () => {
    const blocks = [];
    for (let k = 0; k < months; k++) {
      const mm = (m + k) % 12, yy = y + Math.floor((m + k) / 12);
      const first = new Date(yy, mm, 1, 12), days = new Date(yy, mm + 1, 0).getDate();
      const lead = (first.getDay() + 6) % 7;
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<span class="cal-pad"></span>');
      for (let d = 1; d <= days; d++) {
        const s = iso(new Date(yy, mm, d, 12));
        const dis = s < min;
        const cls = ['cal-day', dis ? 'disabled' : '', s === a ? 'start' : '', s === b ? 'end' : '', a && b && s > a && s < b ? 'in-range' : '', s === today() ? 'today' : ''].filter(Boolean).join(' ');
        const price = priceFor && !dis ? priceFor(s) : '';
        cells.push(`<button type="button" class="${cls}" data-d="${s}" ${dis ? 'disabled' : ''} aria-label="${s}" aria-pressed="${s === a || s === b}"><b>${d}</b>${price ? `<small>${price}</small>` : ''}</button>`);
      }
      blocks.push(`<div class="cal-month"><div class="cal-title">${monthName(yy, mm)}</div><div class="cal-grid">${['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(d => `<span class="cal-dow">${d}</span>`).join('')}${cells.join('')}</div></div>`);
    }
    el.innerHTML = `<div class="cal"><div class="cal-nav"><button type="button" class="btn btn-sm btn-ghost" data-nav="-1" aria-label="Mes anterior">‹</button><span class="small muted">${a && b ? 'Fechas elegidas' : a ? 'Elige la fecha de salida' : 'Elige la fecha de llegada'}</span><button type="button" class="btn btn-sm btn-ghost" data-nav="1" aria-label="Mes siguiente">›</button></div><div class="cal-months">${blocks.join('')}</div></div>`;
  };
  el.addEventListener('click', e => {
    const n = e.target.closest('[data-nav]');
    if (n) { m += +n.dataset.nav; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } paint(); return; }
    const d = e.target.closest('[data-d]'); if (!d) return;
    const s = d.dataset.d;
    if (!a || (a && b) || s <= a) { a = s; b = ''; } else { b = s; }
    paint();
    onChange(a, b);
  });
  paint();
  return { set(ci, co) { a = ci; b = co; paint(); }, get: () => ({ checkIn: a, checkOut: b }), next: () => addDays(a, 1) };
}
