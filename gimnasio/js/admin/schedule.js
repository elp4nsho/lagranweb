// Constructor del horario semanal: grilla por sede, crear/editar/eliminar clases.
import { escape, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { discipline, trainer, branch, activeBranches } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { DOW, DOW_S } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

let br = '', tab = 'grilla';
export function renderSchedule(v) {
  br ||= activeBranches()[0].id;
  const list = db.query('classes', c => c.branchId === br).sort((a, b) => a.time.localeCompare(b.time));
  v.innerHTML = `${pageHead('Clases y horario', 'El horario se publica en el sitio y en la app de socios.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva clase</button>`)}
  <div class="row between"><div class="row" style="gap:8px">${db.all('branches').map(b => `<button class="chip ${b.id === br ? 'active' : ''}" data-br="${b.id}">${escape(b.name)}</button>`).join('')}</div>
  <div class="tabs" style="border:0"><button class="tab ${tab === 'grilla' ? 'active' : ''}" data-tab="grilla">Grilla</button><button class="tab ${tab === 'lista' ? 'active' : ''}" data-tab="lista">Lista</button></div></div>
  <div data-body></div>
  <div class="card"><h3>Disciplinas</h3><div class="tag-list">${db.all('disciplines').map(d => `<span class="chip" style="border-left:4px solid ${d.color}">${escape(d.name)} · ${db.count('classes', c => c.disciplineId === d.id)}</span>`).join('')}</div></div>`;
  v.querySelectorAll('[data-br]').forEach(b => b.onclick = () => { br = b.dataset.br; renderSchedule(v); });
  v.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderSchedule(v); });
  v.querySelector('[data-new]').onclick = () => edit(null);
  const body = v.querySelector('[data-body]');
  if (tab === 'grilla') {
    body.innerHTML = `<div class="scroll-x"><div class="timetable" style="grid-template-columns:repeat(6,minmax(140px,1fr));min-width:860px">${[1, 2, 3, 4, 5, 6].map(d => `<div class="col"><h4>${DOW[d]}</h4>${list.filter(c => c.day === d).map(c => { const ds = discipline(c.disciplineId); return `<button class="cls ${c.active === false ? 'past' : ''}" style="--c:${ds?.color}" data-edit="${c.id}"><small class="mono">${c.time} · ${c.duration}′</small><b>${escape(ds?.name)}</b><small>${escape(trainer(c.trainerId)?.name)} · ${c.capacity} cupos</small></button>`; }).join('')}<button class="btn btn-sm btn-ghost btn-block" data-add="${d}">${icon('plus', 14)} Agregar</button></div>`).join('')}</div></div>`;
    body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => edit(db.get('classes', b.dataset.edit)));
    body.querySelectorAll('[data-add]').forEach(b => b.onclick = () => edit(null, +b.dataset.add));
  } else {
    body.innerHTML = '<div class="card" data-list></div>';
    listView(body.querySelector('[data-list]'), {
      rows: () => db.query('classes', c => c.branchId === br).map(c => ({ ...c, when: c.day * 10000 + +c.time.replace(':', ''), dname: discipline(c.disciplineId)?.name, tname: trainer(c.trainerId)?.name })),
      search: c => `${c.dname} ${c.tname}`, filters: [{ key: 'disciplineId', label: 'Disciplina', options: db.all('disciplines').map(d => [d.id, d.name]) }],
      columns: [{ key: 'when', label: 'Día y hora', render: c => `${DOW_S[c.day]} <b class="mono">${c.time}</b>` }, { key: 'dname', label: 'Disciplina' }, { key: 'tname', label: 'Entrenador' }, { key: 'room', label: 'Sala' }, { key: 'capacity', label: 'Cupos' },
        { key: 'id', label: '', sort: false, render: c => `<div class="acts-cell">${actBtn('edit', c.id, 'edit', 'Editar')}${actBtn('del', c.id, 'trash', 'Eliminar')}</div>` }],
      onAction: async (act, id) => act === 'edit' ? edit(db.get('classes', id)) : del(db.get('classes', id)),
      csv: { name: 'horario.csv', map: c => ({ dia: DOW[c.day], hora: c.time, disciplina: c.dname, entrenador: c.tname, sala: c.room, cupos: c.capacity, sede: branch(c.branchId)?.name }) }
    });
  }
}
async function del(c) {
  if (!await confirm(`¿Eliminar ${discipline(c.disciplineId)?.name} del ${DOW[c.day]} ${c.time}? Las reservas futuras se cancelarán.`, { title: 'Eliminar clase', danger: true, ok: 'Eliminar' })) return;
  db.query('bookings', b => b.classId === c.id && ['reservada', 'espera'].includes(b.status)).forEach(b => db.update('bookings', b.id, { status: 'cancelada' }));
  db.remove('classes', c.id); db.log('horario', `Clase eliminada ${DOW[c.day]} ${c.time}`, auth.current()?.id); toast('Clase eliminada', 'success');
}
async function edit(c, day = 1) {
  const val = await formModal({ title: c ? 'Editar clase' : 'Nueva clase', fields: [
    { name: 'disciplineId', label: 'Disciplina', type: 'select', options: db.all('disciplines').map(d => [d.id, d.name]), value: c?.disciplineId },
    { name: 'branchId', label: 'Sede', type: 'select', options: db.all('branches').map(b => [b.id, b.name]), value: c?.branchId || br },
    { name: 'trainerId', label: 'Entrenador', type: 'select', options: db.all('trainers').map(t => [t.id, `${t.name} (${branch(t.branchId)?.name})`]), value: c?.trainerId },
    { name: 'day', label: 'Día', type: 'select', options: [1, 2, 3, 4, 5, 6, 0].map(d => [d, DOW[d]]), value: c?.day ?? day },
    { name: 'time', label: 'Hora de inicio', type: 'time', required: true, value: c?.time || '19:00' },
    { name: 'duration', label: 'Duración (min)', type: 'number', value: c?.duration || 45 }, { name: 'capacity', label: 'Cupos', type: 'number', value: c?.capacity || 20 },
    { name: 'room', label: 'Sala', value: c?.room || 'Sala 1' }, { name: 'active', label: 'Activa', type: 'checkbox', value: c ? c.active !== false : true }] });
  if (!val) return;
  val.day = +val.day;
  if (val.capacity < 1 || val.duration < 15) return toast('Revisa cupos y duración', 'warning');
  const clash = db.find('classes', x => x.id !== c?.id && x.trainerId === val.trainerId && x.day === val.day && x.time === val.time);
  if (clash) return toast(`${trainer(val.trainerId).name} ya tiene una clase ese día a esa hora`, 'error');
  c ? db.update('classes', c.id, val) : db.insert('classes', val);
  db.log('horario', `${c ? 'Editada' : 'Creada'}: ${discipline(val.disciplineId).name} ${DOW[val.day]} ${val.time} (${branch(val.branchId).name})`, auth.current()?.id);
  toast('Clase guardada · horario público actualizado', 'success');
}
