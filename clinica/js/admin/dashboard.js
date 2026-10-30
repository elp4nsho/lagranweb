import { escape, money, pct, lineChart, barChart, ago } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { donut, hbars } from '../shared/charts.js';
import { doctor, patient, specialty, statusBadge, prevType, shortName, isActive } from '../shared/domain.js';
import { templateSlots } from '../shared/slots.js';
import { ymd, addDays, dow, weekStart, DOW_S, parseYmd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderDashboard(v) {
  const today = ymd(), all = db.all('appointments');
  const by = {}; all.forEach(a => (by[a.date] ||= []).push(a));
  const live = a => a.status !== 'cancelada';
  const todayList = (by[today] || []).filter(live);
  const lastWeek = (by[addDays(today, -7)] || []).filter(live).length;
  const delta = (cur, prev, inv = false, txt = 'vs semana pasada') => { if (!prev) return ''; const d = (cur - prev) / prev * 100; const up = d >= 0; return `<span class="delta ${up !== inv ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(d).toFixed(1).replace('.', ',')}% ${txt}</span>`; };
  // Ocupación de la semana actual
  const ws = weekStart(today);
  let cap = 0, booked = 0;
  const docs = db.all('doctors').filter(d => d.active !== false);
  for (let i = 0; i < 7; i++) { const dt = addDays(ws, i); docs.forEach(d => { if (d.schedule.days.includes(dow(dt))) cap += templateSlots(d.schedule).length; }); booked += (by[dt] || []).filter(live).length; }
  // No-show últimos 30 días
  const from30 = addDays(today, -30);
  const past30 = all.filter(a => a.date >= from30 && a.date < today);
  const past14 = all.filter(a => a.date >= addDays(today, -14) && a.date < today);
  const att = past14.filter(a => a.status === 'atendida').length, ns = past14.filter(a => a.status === 'no_show').length;
  const nsPrev = all.filter(a => a.date >= addDays(today, -28) && a.date < addDays(today, -14));
  const nsRate = ns / Math.max(1, att + ns) * 100, nsRatePrev = nsPrev.filter(a => a.status === 'no_show').length / Math.max(1, nsPrev.filter(a => ['atendida', 'no_show'].includes(a.status)).length) * 100;
  // Ingresos del mes
  const month = today.slice(0, 7), prevMonthD = parseYmd(today); prevMonthD.setMonth(prevMonthD.getMonth() - 1);
  const pm = ymd(prevMonthD).slice(0, 7);
  const paid = all.filter(a => a.paid);
  const rev = paid.filter(a => a.date.startsWith(month)).reduce((s, a) => s + a.price, 0);
  const revPrevToDate = paid.filter(a => a.date.startsWith(pm) && a.date.slice(8) <= today.slice(8)).reduce((s, a) => s + a.price, 0);
  // Citas por día (30 días)
  const perDay = Array.from({ length: 30 }, (_, i) => { const dt = addDays(today, i - 29); const x = parseYmd(dt); return { label: `${x.getDate()}/${x.getMonth() + 1}`, value: (by[dt] || []).filter(live).length }; });
  // Ocupación por médico (30 días)
  const occ = docs.map(d => { let c = 0, b = 0; for (let i = 0; i < 30; i++) { const dt = addDays(today, -i); if (d.schedule.days.includes(dow(dt))) c += templateSlots(d.schedule).length; } b = past30.filter(a => a.doctorId === d.id && live(a)).length + todayList.filter(a => a.doctorId === d.id).length; return { label: shortName(d.name), value: Math.round(b / Math.max(1, c) * 100) }; }).sort((a, b) => b.value - a.value);
  // Ingresos por previsión (mes)
  const revPrev = ['fonasa', 'isapre', 'particular'].map(t => ({ label: { fonasa: 'Fonasa', isapre: 'Isapre', particular: 'Particular' }[t], value: paid.filter(a => a.date >= addDays(today, -30) && prevType(a.prevision) === t).reduce((s, a) => s + a.price, 0) }));
  // No-show por día de semana
  const nsDow = [1, 2, 3, 4, 5, 6].map(k => { const l = all.filter(a => a.date < today && a.date >= addDays(today, -45) && dow(a.date) === k && ['atendida', 'no_show'].includes(a.status)); return { label: DOW_S[k], value: +(l.filter(a => a.status === 'no_show').length / Math.max(1, l.length) * 100).toFixed(1) }; });
  const upcoming = todayList.filter(isActive).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8);
  const logs = db.all('_log').slice(0, 8);

  v.innerHTML = `${pageHead('Dashboard', `Resumen operativo al ${parseYmd(today).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`, `<a class="btn btn-primary" href="#/citas?nueva=1">${icon('plus', 16)} Nueva cita</a>`)}
  <div class="grid-4">
    ${statCard('Citas hoy', todayList.length, delta(todayList.length, lastWeek), 'calendar')}
    ${statCard('Ocupación semana', pct(booked / Math.max(1, cap) * 100), `<span class="muted small">${booked} de ${cap} cupos</span>`, 'pulse')}
    ${statCard('Tasa de no-show (14 d)', pct(nsRate, 1), delta(nsRate, nsRatePrev, true, 'vs 14 días previos'), 'x')}
    ${statCard('Ingresos del mes', money(rev), `<span class="muted small">${paid.filter(a => a.date.startsWith(month)).length} atenciones pagadas</span>`, 'money')}
  </div>
  <div class="grid-main">
    <div class="card"><div class="card-title"><h3>Citas por día · últimos 30 días</h3><span class="badge">${perDay.reduce((s, d) => s + d.value, 0)} citas</span></div>${lineChart(perDay, { height: 200 })}</div>
    <div class="card"><div class="card-title"><h3>Ingresos por previsión</h3><span class="muted small">30 días</span></div>${donut(revPrev, { format: money, center: '$' + (revPrev.reduce((s, d) => s + d.value, 0) / 1e6).toFixed(1).replace('.', ',') + ' M' })}</div>
  </div>
  <div class="grid-2">
    <div class="card"><div class="card-title"><h3>Ocupación por profesional</h3><span class="muted small">30 días</span></div>${hbars(occ, { format: v => v + '%', max: 100 })}</div>
    <div class="stack">
      <div class="card"><div class="card-title"><h3>No-show por día de la semana</h3><span class="muted small">%</span></div>${barChart(nsDow, { height: 150, format: v => v + '%' })}</div>
      <div class="card"><div class="card-title"><h3>Actividad reciente</h3><a class="small" href="#/bitacora">Ver todo</a></div><ul class="feed">${logs.map(l => `<li><span class="dot"></span><span><b>${escape(l.action)}</b> · ${escape(l.detail)}<br><small class="muted">${ago(l.at)}</small></span></li>`).join('') || '<li class="muted">Sin actividad</li>'}</ul></div>
    </div>
  </div>
  <div class="card"><div class="card-title"><h3>Próximas atenciones de hoy</h3><a class="btn btn-sm" href="#/citas">Ver agenda completa</a></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Hora</th><th>Paciente</th><th>Profesional</th><th>Modalidad</th><th>Estado</th></tr></thead><tbody>
    ${upcoming.map(a => `<tr><td class="mono">${a.time}</td><td>${escape(patient(a.patientId)?.name)}</td><td>${escape(doctor(a.doctorId)?.name)}<br><small class="muted">${escape(specialty(a.specialtyId)?.name)}</small></td><td>${a.mode === 'tele' ? 'Tele' : 'Presencial'}</td><td>${statusBadge(a.status)}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">No quedan atenciones hoy.</div></td></tr>'}
    </tbody></table></div></div>`;
}
