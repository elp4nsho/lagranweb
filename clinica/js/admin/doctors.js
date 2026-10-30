// Médicos: CRUD + plantilla de horario (días, horas, duración) que genera los cupos públicos.
import { escape, modal, toast, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { specialty, box, activeSpecialties, nextAvailable } from '../shared/domain.js';
import { templateSlots } from '../shared/slots.js';
import { DOW_S, fmtShort, ymd } from '../shared/dates.js';
import { makeRut, validRut, fmtRut } from '../shared/rut.js';
import { icon } from '../shared/icons.js';

const days = d => [1, 2, 3, 4, 5, 6, 0].filter(k => d.schedule.days.includes(k)).map(k => DOW_S[k]).join(' · ');

export function renderDoctors(v) {
  v.innerHTML = `${pageHead('Médicos y horarios', 'La plantilla de horario de cada profesional genera los cupos que se ven en la reserva en línea.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo profesional</button>`)}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('doctors').map(d => ({ ...d, sname: specialty(d.specialtyId)?.name || '—', perWeek: templateSlots(d.schedule).length * d.schedule.days.length })),
    search: d => `${d.name} ${d.sname} ${d.rut}`,
    filters: [{ key: 'specialtyId', label: 'Especialidad', options: db.all('specialties').map(s => [s.id, s.name]) }, { key: 'st', label: 'Estado', options: [['1', 'Activos'], ['0', 'Inactivos']], test: (d, val) => (d.active !== false) === (val === '1') }],
    columns: [
      { key: 'name', label: 'Profesional', render: d => `<div class="cell-user"><span class="avatar" style="--size:34px;--av:${d.color}">${escape(initials(d.name.replace(/^(Dra?\.|Ps\.|Nut\.)\s*/, '')))}</span><span><b>${escape(d.name)}</b><small>${escape(d.sname)}</small></span></div>` },
      { key: 'days', label: 'Días', sort: false, render: d => `<small>${days(d)}</small>` },
      { key: 'hours', label: 'Horario', sort: false, render: d => `<span class="mono nowrap">${d.schedule.start}–${d.schedule.end}</span><br><small class="muted">${d.schedule.slot} min${d.schedule.breakStart ? ` · pausa ${d.schedule.breakStart}` : ''}</small>` },
      { key: 'perWeek', label: 'Cupos/sem' },
      { key: 'next', label: 'Próxima hora', sort: false, render: d => { const n = nextAvailable(d, 21); return n ? `<small class="nowrap" style="text-transform:capitalize">${escape(fmtShort(n.date))} ${n.time}</small>` : '<small class="muted">—</small>'; } },
      { key: 'tele', label: 'Tele', render: d => d.tele ? '<span class="badge badge-info">Sí</span>' : '<span class="muted">No</span>' },
      { key: 'active', label: 'Activo', render: d => `<label class="switch" title="Activar / desactivar"><input type="checkbox" data-toggle="${d.id}" ${d.active !== false ? 'checked' : ''}><span></span></label>` },
      { key: 'id', label: '', sort: false, render: d => `<div class="acts-cell">${actBtn('edit', d.id, 'edit', 'Editar')}${actBtn('pub', d.id, 'eye', 'Ver perfil público')}${actBtn('del', d.id, 'trash', 'Eliminar')}</div>` }
    ],
    onRow: d => editDoctor(db.get('doctors', d.id)),
    onAction: async (act, id) => {
      const d = db.get('doctors', id);
      if (act === 'edit') editDoctor(d);
      if (act === 'pub') window.open(`index.html#/medicos/${id}`, '_blank');
      if (act === 'del') {
        const n = db.count('appointments', a => a.doctorId === id && a.date >= ymd() && !['cancelada', 'atendida'].includes(a.status));
        if (!await confirm(n ? `${d.name} tiene ${n} citas futuras. Se desactivará en lugar de eliminarse.` : `¿Eliminar a ${d.name}? Su historial se mantiene.`, { title: 'Eliminar profesional', danger: true, ok: n ? 'Desactivar' : 'Eliminar' })) return;
        if (n) db.update('doctors', id, { active: false }); else db.remove('doctors', id);
        db.log('médico', `${n ? 'Desactivado' : 'Eliminado'}: ${d.name}`, auth.current()?.id); toast('Listo', 'success');
      }
    },
    csv: { name: 'medicos.csv', map: d => ({ nombre: d.name, rut: d.rut, especialidad: d.sname, dias: days(d), inicio: d.schedule.start, termino: d.schedule.end, duracion_min: d.schedule.slot, cupos_semana: d.perWeek, telemedicina: d.tele ? 'sí' : 'no', activo: d.active !== false ? 'sí' : 'no' }) }
  });
  v.querySelector('[data-list]').addEventListener('change', e => {
    const t = e.target.closest('[data-toggle]'); if (!t) return;
    const d = db.update('doctors', t.dataset.toggle, { active: t.checked });
    db.log('médico', `${d.name} ${t.checked ? 'activado' : 'desactivado'}`, auth.current()?.id);
    toast(`${d.name} ${t.checked ? 'visible' : 'oculto'} en el sitio`, 'success');
  });
  v.querySelector('[data-new]').onclick = () => editDoctor(null);
}

export function editDoctor(d) {
  const s = d?.schedule || { days: [1, 2, 3, 4, 5], start: '09:00', end: '13:00', slot: 20, breakStart: '', breakEnd: '' };
  const specs = activeSpecialties(), boxes = db.all('boxes');
  const m = modal({ title: d ? `Editar · ${d.name}` : 'Nuevo profesional', size: 'lg', body: `<form class="stack" novalidate>
    <div class="grid-2">
      <div class="field"><label for="dn">Nombre (con título)</label><input class="input" id="dn" name="name" value="${escape(d?.name || 'Dr. ')}"></div>
      <div class="field"><label for="dr">RUT</label><input class="input" id="dr" name="rut" value="${escape(d?.rut || '')}" placeholder="12.345.678-5"></div>
      <div class="field"><label for="ds">Especialidad</label><select class="select" id="ds" name="specialtyId">${specs.map(x => `<option value="${x.id}" ${d?.specialtyId === x.id ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="db">Box habitual</label><select class="select" id="db" name="boxId">${boxes.map(x => `<option value="${x.id}" ${d?.boxId === x.id ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label for="dbio">Biografía (se muestra en el perfil público)</label><textarea class="textarea" id="dbio" name="bio" style="min-height:70px">${escape(d?.bio || '')}</textarea></div>
    <div class="row"><label class="check"><input type="checkbox" name="tele" ${d?.tele ? 'checked' : ''}> Atiende por telemedicina</label><label class="check"><input type="checkbox" name="active" ${d?.active !== false ? 'checked' : ''}> Activo (visible en el sitio)</label>
    <label class="check">Color <input type="color" name="color" value="${d?.color || '#0f766e'}" style="width:40px;height:28px;border:0;background:none"></label></div>
    <hr>
    <h3 class="mb0">Plantilla de horario</h3>
    <div class="days-check">${[1, 2, 3, 4, 5, 6, 0].map(k => `<label><input type="checkbox" name="day" value="${k}" ${s.days.includes(k) ? 'checked' : ''}> ${DOW_S[k]}</label>`).join('')}</div>
    <div class="grid-4">
      <div class="field"><label for="st">Inicio</label><input class="input" type="time" id="st" name="start" value="${s.start}" step="300"></div>
      <div class="field"><label for="en">Término</label><input class="input" type="time" id="en" name="end" value="${s.end}" step="300"></div>
      <div class="field"><label for="bs">Pausa desde</label><input class="input" type="time" id="bs" name="breakStart" value="${s.breakStart || ''}" step="300"></div>
      <div class="field"><label for="be">Pausa hasta</label><input class="input" type="time" id="be" name="breakEnd" value="${s.breakEnd || ''}" step="300"></div>
    </div>
    <div class="field"><label for="sl">Duración de cada consulta</label><select class="select" id="sl" name="slot">${[15, 20, 30, 40, 45, 60].map(x => `<option value="${x}" ${+s.slot === x ? 'selected' : ''}>${x} minutos</option>`).join('')}</select></div>
    <div class="card" style="box-shadow:none"><b data-sum></b><div class="slot-preview" data-prev style="margin-top:8px"></div></div>
  </form>`, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('check', 16)} Guardar</button>` });
  const f = m.el.querySelector('form');
  const read = () => ({ days: [...f.querySelectorAll('[name=day]:checked')].map(x => +x.value), start: f.start.value, end: f.end.value, breakStart: f.breakStart.value, breakEnd: f.breakEnd.value, slot: +f.slot.value });
  const preview = () => { const sc = read(), sl = templateSlots(sc); m.el.querySelector('[data-sum]').textContent = `${sl.length} cupos por jornada · ${sl.length * sc.days.length} cupos por semana`; m.el.querySelector('[data-prev]').innerHTML = sl.map(t => `<span>${t}</span>`).join('') || '<span>Sin cupos: revisa las horas</span>'; };
  f.addEventListener('input', preview); f.addEventListener('change', preview); preview();
  m.el.querySelector('[data-ok]').onclick = () => {
    const sc = read();
    if (f.name.value.trim().length < 6) return toast('Ingresa el nombre del profesional', 'warning');
    if (f.rut.value && !validRut(f.rut.value)) return toast('RUT inválido', 'warning');
    if (!sc.days.length || !templateSlots(sc).length) return toast('La plantilla no genera cupos', 'warning');
    const data = { name: f.name.value.trim(), rut: f.rut.value ? fmtRut(f.rut.value) : makeRut(10000000 + Math.floor(Math.random() * 9e6)), specialtyId: f.specialtyId.value, boxId: f.boxId.value, bio: f.bio.value.trim(), tele: f.tele.checked, active: f.active.checked, color: f.color.value, schedule: sc };
    if (d) db.update('doctors', d.id, data); else db.insert('doctors', { ...data, rating: '5.0', reviews: 0 });
    db.log('médico', `${d ? 'Actualizado' : 'Creado'}: ${data.name} (${templateSlots(sc).length * sc.days.length} cupos/sem)`, auth.current()?.id);
    toast(d ? 'Profesional actualizado: la agenda pública ya refleja el horario' : 'Profesional creado', 'success'); m.close();
  };
}
