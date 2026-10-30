// Dashboard: KPIs de ocupación, asistencia, visitas y actividad reciente.
import { barChart, lineChart, donutChart, escape, ago, num } from '../../../assets/core/ui.js';
import { pageHead, kpi, personCell } from './common.js';
import { STATUS, STATUS_ORDER, hash } from '../shared/util.js';
import { today, addDays, dow, isWeekend, weekdaysBack, fmtDay, DOW, startOfWeek, parseKey } from '../shared/dates.js';

// Presencia histórica: reservas reales para puestos flexibles, patrón semanal para el resto.
function presenceModel(db, idx) {
  const res = db.query('reservations', r => r.companyId === idx.company.id && (r.status === 'completada' || r.status === 'checkin'));
  const resSet = new Set(res.map(r => r.personId + '|' + r.date));
  const resFrom = res.reduce((m, r) => (r.date < m ? r.date : m), today());
  const leaves = db.query('leaves', l => l.companyId === idx.company.id);
  const onLeave = (p, k) => leaves.some(l => l.personId === p.id && l.from <= k && l.to >= k);
  return (p, k) => {
    if (isWeekend(k) || p.remoteOnly || onLeave(p, k)) return false;
    if (!p.deskId && k >= resFrom) return resSet.has(p.id + '|' + k);
    const h = hash(p.id + k) % 100;
    return (p.workDays || []).includes(dow(k)) ? h < 88 : h < 6;
  };
}

export function render(el, ctx) {
  const { db, idx } = ctx, T = today();
  const present = presenceModel(db, idx);
  const desks = idx.floors.reduce((n, f) => n + f.desks.length, 0) || 1;
  const states = {}; idx.floors.forEach(f => f.desks.forEach(d => { const s = idx.deskState(d.id).state; states[s] = (states[s] || 0) + 1; }));
  const occToday = (states.occ || 0) + (states.meet || 0) + (states.checked || 0) + (states.res || 0);
  const statusCount = {}; idx.people.forEach(p => { const s = idx.statusOf(p); statusCount[s] = (statusCount[s] || 0) + 1; });
  const inOffice = (statusCount.oficina || 0) + (statusCount.reunion || 0);
  const visToday = db.query('visitors', v => v.companyId === idx.company.id && v.date === T);
  const resToday = Object.keys(idx.resByDesk).length;
  const roomsToday = db.count('roomBookings', b => b.companyId === idx.company.id && b.date === T);

  // Últimos 40 días hábiles → tendencia semanal y promedio por día.
  const days = weekdaysBack(60, addDays(T, -1));
  const occByDay = days.map(k => ({ k, n: idx.people.filter(p => present(p, k)).length }));
  const weeks = {};
  occByDay.forEach(({ k, n }) => { const w = startOfWeek(k); (weeks[w] ||= []).push(n); });
  const trend = Object.entries(weeks).slice(-12).map(([w, arr]) => ({ label: fmtDay(w, { day: 'numeric', month: 'short' }), value: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length / desks * 100) }));
  const byDow = [1, 2, 3, 4, 5].map(d => { const arr = occByDay.filter(x => dow(x.k) === d); return { label: DOW[d], value: Math.round(arr.reduce((a, b) => a + b.n, 0) / (arr.length || 1) / desks * 100) }; });
  const lastWeek = trend.at(-1)?.value || 0, prevWeek = trend.at(-2)?.value || 0;
  const byFloor = idx.floors.map(f => { const occ = f.desks.filter(d => ['occ', 'meet', 'checked', 'res'].includes(idx.deskState(d.id).state)).length; return { label: f.name, value: Math.round(occ / (f.desks.length || 1) * 100) }; });
  const visDays = weekdaysBack(22, T);
  const vis = visDays.map(k => ({ label: fmtDay(k, { day: 'numeric' }), value: db.count('visitors', v => v.companyId === idx.company.id && v.date === k) }));
  const visMonth = vis.reduce((a, b) => a + b.value, 0);
  const upcoming = visToday.filter(v => v.status === 'esperada').sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));
  const log = db.all('_log').slice(0, 8);
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));

  el.innerHTML = `${pageHead(`Hola, ${ctx.user.name.split(' ')[0]}`, `${escape(idx.company.name)} · ${escape(fmtDay(T, { weekday: 'long', day: 'numeric', month: 'long' }))}`, `<a class="btn btn-primary" href="#/visitas">🛎️ Visitas de hoy</a>`)}
    <div class="kpis">
      ${kpi('Personas', num(idx.people.length), `${idx.areas.length} áreas · ${idx.floors.length} pisos`)}
      ${kpi('En oficina hoy', `${inOffice}`, `${Math.round(inOffice / (idx.people.length || 1) * 100)} % de la dotación`, 'up')}
      ${kpi('Ocupación de puestos', `${Math.round(occToday / desks * 100)} %`, `${lastWeek >= prevWeek ? '▲' : '▼'} semana: ${lastWeek} % (antes ${prevWeek} %)`, lastWeek >= prevWeek ? 'up' : 'down')}
      ${kpi('Puestos libres', `${states.free || 0}`, `de ${desks} · ${resToday} reservas hoy`)}
      ${kpi('Visitas hoy', `${visToday.length}`, `${visToday.filter(v => v.status === 'en sitio').length} en el edificio · ${visMonth} en 22 días`)}
      ${kpi('Salas reservadas hoy', `${roomsToday}`)}
    </div>
    <div class="dash-grid">
      <div class="card span-8"><div class="card-h"><h3>Tendencia de asistencia</h3><span class="muted small">% promedio de puestos usados por semana</span></div>${lineChart(trend, { format: v => v + ' %' })}</div>
      <div class="card span-4"><div class="card-h"><h3>Estado de las personas</h3></div>${donutChart(STATUS_ORDER.map(s => ({ label: STATUS[s].label, value: statusCount[s] || 0 })), { label: `${idx.people.length}` })}</div>
      <div class="card span-4"><div class="card-h"><h3>Ocupación por piso hoy</h3></div>${barChart(byFloor, { format: v => v + ' %' })}</div>
      <div class="card span-4"><div class="card-h"><h3>Ocupación por día</h3><span class="muted small">promedio 12 semanas</span></div>${barChart(byDow, { format: v => v + ' %' })}</div>
      <div class="card span-4"><div class="card-h"><h3>Visitas</h3><span class="muted small">últimos 22 días hábiles</span></div>${barChart(vis, { format: v => `${v} visitas` })}</div>
      <div class="card span-6"><div class="card-h"><h3>Visitas esperadas hoy</h3><a class="small" href="#/visitas">Ver todas</a></div>
        ${upcoming.length ? `<div class="stack" style="gap:8px">${upcoming.map(v => `<div class="row between"><span><b>${escape(v.expectedAt)}</b> · ${escape(v.name)} <span class="muted small">(${escape(v.org)})</span></span>${personCell(idx.byId[v.hostId], 'Anfitrión')}</div>`).join('')}</div>` : '<div class="empty">No hay visitas pendientes para hoy.</div>'}</div>
      <div class="card span-6"><div class="card-h"><h3>Actividad reciente</h3>${ctx.can('bitacora') ? '<a class="small" href="#/bitacora">Bitácora</a>' : ''}</div>
        <ul class="log-list">${log.map(l => `<li><span aria-hidden="true">•</span><span>${escape(l.detail || l.action)}<small>${escape(users[l.user]?.name || 'Sistema')} · ${escape(ago(l.at))}</small></span></li>`).join('') || '<li class="muted">Sin actividad registrada.</li>'}</ul></div>
    </div>`;
}
