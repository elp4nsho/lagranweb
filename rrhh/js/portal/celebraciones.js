// Cumpleaños, aniversarios laborales y nuevos ingresos.
import { escape } from '../../../assets/core/ui.js';
import { avatar } from '../shared/util.js';
import { today, addDays, fmtDay, parseKey } from '../shared/dates.js';

export function render(el, ctx) {
  const { db } = ctx, T = today(), Y = +T.slice(0, 4);
  const act = db.query('employees', e => e.status !== 'desvinculado');
  const dept = id => ctx.dept(id)?.name || '';
  const nextDate = md => { let k = `${Y}-${md}`; if (k < T) k = `${Y + 1}-${md}`; return k; };
  const bdays = act.map(e => ({ e, k: nextDate(e.birth.slice(5)) })).filter(x => x.k <= addDays(T, 45)).sort((a, b) => a.k.localeCompare(b.k));
  const annivs = act.map(e => ({ e, k: nextDate(e.hireDate.slice(5)), years: Y - +e.hireDate.slice(0, 4) + (nextDate(e.hireDate.slice(5)).slice(0, 4) > Y ? 1 : 0) })).filter(x => x.years >= 1 && x.k <= addDays(T, 45)).sort((a, b) => a.k.localeCompare(b.k));
  const news = act.filter(e => e.hireDate >= addDays(T, -45)).sort((a, b) => b.hireDate.localeCompare(a.hireDate));
  const row = (e, when, extra = '') => `<div class="cele">${avatar(e, 38)}<span><b>${escape(e.name)}</b><br><small class="muted">${escape(e.position)} · ${escape(dept(e.deptId))}</small></span><span class="when">${when}${extra}</span></div>`;
  el.innerHTML = `<div class="page-head"><div><h1>Cumpleaños y aniversarios</h1><p class="muted" style="margin:4px 0 0">Próximos 45 días.</p></div></div>
    <div class="dash-grid">
      <div class="card span-4"><h3>🎂 Cumpleaños</h3>${bdays.map(({ e, k }) => row(e, k === T ? '<b>¡Hoy!</b>' : escape(fmtDay(k, { day: 'numeric', month: 'short' })))).join('') || '<p class="muted">Sin cumpleaños próximos.</p>'}</div>
      <div class="card span-4"><h3>🏅 Aniversarios</h3>${annivs.map(({ e, k, years }) => row(e, escape(fmtDay(k, { day: 'numeric', month: 'short' })), `<br>${years} año${years > 1 ? 's' : ''}`)).join('') || '<p class="muted">Sin aniversarios próximos.</p>'}</div>
      <div class="card span-4"><h3>👋 Nuevos ingresos</h3>${news.map(e => row(e, e.hireDate > T ? `Ingresa ${escape(fmtDay(e.hireDate))}` : `Desde ${escape(fmtDay(e.hireDate))}`)).join('') || '<p class="muted">Sin ingresos recientes.</p>'}</div>
    </div>`;
}
export { parseKey };
