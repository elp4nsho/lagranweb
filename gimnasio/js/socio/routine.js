import { escape, toast, date as fmtDate } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { trainer } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

let dayIdx = 0;
export function renderRoutine(v, _, __, { m, user }) {
  const r = db.find('routines', x => x.memberId === m.id && x.active);
  if (!r) { v.innerHTML = `${pageHead('Mi rutina')}<div class="card empty">${icon('dumbbell', 40)}<p>Aún no tienes una rutina asignada.</p><p class="muted small">Tu plan ${m.planId === 'basico' ? 'Básico no incluye rutina personalizada' : 'incluye rutina: pide a tu entrenador que te la asigne'}.</p></div>`; return; }
  dayIdx = Math.min(dayIdx, r.days.length - 1);
  const d = r.days[dayIdx];
  const logs = db.query('logs', l => l.memberId === m.id && l.routineId === r.id);
  const last = ex => logs.filter(l => l.ex === ex).sort((a, b) => b.date.localeCompare(a.date))[0];
  const doneToday = ex => logs.some(l => l.ex === ex && l.date === ymd());
  const sessions = [...new Set(logs.map(l => l.date + '|' + l.day))].length;
  v.innerHTML = `${pageHead(r.name, `Asignada por ${escape(trainer(r.trainerId)?.name || 'tu entrenador')} el ${escape(fmtDate(r.assignedAt))} · ${sessions} sesiones registradas`)}
  ${r.notes ? `<div class="card small">${icon('bell', 16)} ${escape(r.notes)}</div>` : ''}
  <div class="tabs">${r.days.map((x, i) => `<button class="tab ${i === dayIdx ? 'active' : ''}" data-day="${i}">${escape(x.name)}</button>`).join('')}</div>
  <div class="grid-main">
    <div class="card">${d.exercises.map((e, i) => { const l = last(e.ex); return `<div class="ex-item">
      <div><b>${doneToday(e.ex) ? '✓ ' : ''}${escape(e.ex)}</b><br><span class="muted small">${e.sets} series × ${escape(e.reps)} reps${e.weight ? ` · ${e.weight} kg` : ''}${l ? ` · último: ${l.weight ? l.weight + ' kg' : 'peso corporal'} (${escape(fmtDate(l.date))})` : ''}</span></div>
      <form class="row" style="gap:6px;flex-wrap:nowrap" data-log="${i}"><input class="input" style="width:74px" type="number" step="0.5" min="0" name="w" value="${l?.weight ?? e.weight}" aria-label="Kilos"><span class="small muted">kg</span><button class="btn btn-sm ${doneToday(e.ex) ? '' : 'btn-primary'}">${icon('check', 14)} Registrar</button></form></div>`; }).join('')}
      <button class="btn btn-block" style="margin-top:12px" data-all>${icon('check', 16)} Marcar día completo</button></div>
    <div class="card"><h3>Historial</h3><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Ejercicio</th><th>Carga</th></tr></thead><tbody>
      ${logs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map(l => `<tr><td class="nowrap">${escape(fmtDate(l.date, { day: '2-digit', month: 'short' }))}</td><td>${escape(l.ex)}</td><td>${l.sets}×${escape(l.reps)} ${l.weight ? l.weight + ' kg' : ''}</td></tr>`).join('')}
    </tbody></table></div></div>
  </div>`;
  v.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { dayIdx = +b.dataset.day; renderRoutine(v, _, __, { m, user }); });
  const log = (e, w) => db.insert('logs', { memberId: m.id, routineId: r.id, day: dayIdx, date: ymd(), ex: e.ex, sets: e.sets, reps: e.reps, weight: +w || 0 });
  v.querySelectorAll('[data-log]').forEach(f => f.onsubmit = ev => { ev.preventDefault(); const e = d.exercises[+f.dataset.log]; log(e, f.w.value); toast(`${e.ex} registrado`, 'success'); });
  v.querySelector('[data-all]').onclick = () => { d.exercises.filter(e => !doneToday(e.ex)).forEach(e => log(e, e.weight)); db.log('entrenamiento', `${m.name} completó ${d.name}`, user.id); toast('¡Día completado!', 'success'); };
}
