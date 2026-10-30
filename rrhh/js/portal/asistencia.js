// Asistencia: marcaje de entrada/salida, historial y resumen.
import { escape } from '../../../assets/core/ui.js';
import { todayMark, clock, worked, fmtHours, summary, ENTRY_LIMIT } from '../shared/attendance.js';
import { today, hm, fmtDay } from '../shared/dates.js';

export function render(el, ctx) {
  const { db } = ctx, me = ctx.me;
  const mark = todayMark(db, me.id);
  const marks = db.query('marks', m => m.employeeId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const s = summary(marks.filter(m => m.date !== today() || m.out));
  el.innerHTML = `<div class="page-head"><div><h1>Asistencia</h1><p class="muted" style="margin:4px 0 0">Jornada de ${escape(me.jornada || '42 horas')} · entrada hasta las ${ENTRY_LIMIT} · 1 h de colación.</p></div></div>
    <div class="dash-grid">
      <div class="card span-4 clock-card"><span class="eyebrow">${escape(fmtDay(today(), { weekday: 'long', day: 'numeric', month: 'long' }))}</span><div class="time" data-time>${hm()}</div>
        <p class="muted" style="margin:0 0 14px">${mark ? `Entrada <b>${mark.in}</b>${mark.in > ENTRY_LIMIT ? ' <span class="badge badge-warning">atraso</span>' : ''}${mark.out ? ` · Salida <b>${mark.out}</b>` : ''}` : 'Sin marcas hoy'}</p>
        <button class="btn ${mark && !mark.out ? 'btn-accent' : 'btn-primary'} btn-lg btn-block" data-clock ${mark?.out ? 'disabled' : ''}>${!mark ? '▶ Marcar entrada' : !mark.out ? '■ Marcar salida' : 'Jornada completa'}</button>
        <p class="muted small" style="margin:10px 0 0">📍 Ubicación: Casa matriz (simulado)</p></div>
      <div class="span-8 kpis" style="align-content:start">
        <div class="card kpi"><div class="stat"><span class="label">Días registrados</span><span class="value">${s.days}</span><span class="delta">últimos ${s.days} días hábiles</span></div></div>
        <div class="card kpi"><div class="stat"><span class="label">Horas trabajadas</span><span class="value">${Math.round(s.total / 60)} h</span><span class="delta">promedio ${s.days ? fmtHours(Math.round(s.total / s.days)) : '—'}</span></div></div>
        <div class="card kpi"><div class="stat"><span class="label">Atrasos</span><span class="value">${s.late}</span><span class="delta ${s.late ? 'down' : 'up'}">${s.late ? 'después de las ' + ENTRY_LIMIT : 'sin atrasos'}</span></div></div>
        <div class="card kpi"><div class="stat"><span class="label">Horas sobre jornada</span><span class="value">${Math.round(s.extra / 60)} h</span><span class="delta">estimadas (requieren pacto)</span></div></div>
      </div>
      <div class="card span-12"><h3>Mis marcas</h3><div class="table-wrap"><table class="table compact"><thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Estado</th></tr></thead><tbody>
        ${marks.map(m => `<tr><td>${escape(fmtDay(m.date))}</td><td>${escape(m.in || '—')}</td><td>${escape(m.out || '—')}</td><td>${m.out ? fmtHours(worked(m)) : '—'}</td><td>${m.in > ENTRY_LIMIT ? '<span class="badge badge-warning">Atraso</span>' : '<span class="badge badge-success">A tiempo</span>'}${!m.out && m.date !== today() ? ' <span class="badge badge-danger">Sin salida</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sin marcas registradas.</div></td></tr>'}
      </tbody></table></div></div>
    </div>`;
  el.querySelector('[data-clock]')?.addEventListener('click', () => clock(db, me, ctx.user));
  clearInterval(el.__tick); el.__tick = setInterval(() => { const t = el.querySelector('[data-time]'); if (t) t.textContent = hm(); }, 10000);
}
