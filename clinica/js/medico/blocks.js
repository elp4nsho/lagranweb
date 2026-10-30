import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { patient, setStatus, isActive } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { ymd, fmtDay, toMin, dow } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderBlocks(v, _, __, { doc, user }) {
  const list = db.query('blocks', b => b.doctorId === doc.id && b.date >= ymd()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  v.innerHTML = `${pageHead('Bloquear horario', 'Los bloques quitan cupos de la reserva en línea (vacaciones, congresos, trámites).')}
  <div class="grid-main">
    <div class="card"><h3>Bloqueos próximos</h3>${list.map(b => `<div class="appt-item"><span class="icon-bubble">${icon('lock', 18)}</span><div class="info"><b style="text-transform:capitalize">${escape(fmtDay(b.date))}</b><span class="muted small">${b.start}–${b.end} · ${escape(b.reason || 'Sin motivo')}</span></div><button class="btn btn-sm btn-ghost" data-del="${b.id}">${icon('trash', 14)} Quitar</button></div>`).join('') || '<div class="empty">No tienes bloqueos programados.</div>'}</div>
    <form class="card stack" novalidate><h3 class="mb0">Nuevo bloqueo</h3>
      <div class="field"><label for="bk-d">Fecha</label><input class="input" type="date" id="bk-d" name="date" min="${ymd()}" value="${ymd()}"></div>
      <label class="check"><input type="checkbox" name="all" checked> Día completo</label>
      <div class="grid-2"><div class="field"><label for="bk-s">Desde</label><input class="input" type="time" id="bk-s" name="start" value="${doc.schedule.start}" disabled></div>
      <div class="field"><label for="bk-e">Hasta</label><input class="input" type="time" id="bk-e" name="end" value="${doc.schedule.end}" disabled></div></div>
      <div class="field"><label for="bk-r">Motivo</label><input class="input" id="bk-r" name="reason" placeholder="Congreso, vacaciones…"></div>
      <label class="check"><input type="checkbox" name="cancel" checked> Anular y notificar citas afectadas</label>
      <p class="small muted mb0" data-warn></p>
      <button class="btn btn-primary">${icon('lock', 16)} Bloquear</button></form>
  </div>`;
  const f = v.querySelector('form');
  const affected = () => db.query('appointments', a => a.doctorId === doc.id && a.date === f.date.value && isActive(a) && toMin(a.time) >= toMin(f.start.value) && toMin(a.time) < toMin(f.end.value));
  const warn = () => { const n = affected().length; v.querySelector('[data-warn]').textContent = !doc.schedule.days.includes(dow(f.date.value)) ? 'Ese día no atiendes según tu plantilla.' : n ? `${n} cita(s) quedan dentro del bloqueo.` : 'No hay citas en ese rango.'; };
  f.all.onchange = () => { f.start.disabled = f.end.disabled = f.all.checked; if (f.all.checked) { f.start.value = doc.schedule.start; f.end.value = doc.schedule.end; } warn(); };
  f.addEventListener('input', warn); warn();
  f.onsubmit = e => {
    e.preventDefault();
    if (!f.date.value || toMin(f.end.value) <= toMin(f.start.value)) return toast('Revisa la fecha y el rango horario', 'warning');
    const aff = affected();
    db.insert('blocks', { doctorId: doc.id, date: f.date.value, start: f.start.value, end: f.end.value, reason: f.reason.value.trim() });
    if (f.cancel.checked) aff.forEach(a => setStatus(a, 'cancelada', { note: 'Bloqueo de agenda del profesional' }));
    db.log('bloqueo', `${doc.name} bloqueó ${f.date.value} ${f.start.value}-${f.end.value}${aff.length && f.cancel.checked ? ` (${aff.length} citas anuladas)` : ''}`, user.id);
    toast('Horario bloqueado', 'success');
  };
  v.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (await confirm('¿Quitar este bloqueo? Los cupos volverán a estar disponibles.', { title: 'Quitar bloqueo', ok: 'Quitar' })) { db.remove('blocks', b.dataset.del); toast('Bloqueo eliminado', 'success'); } });
}
