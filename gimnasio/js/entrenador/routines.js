// Constructor de rutinas: días, ejercicios, series, repeticiones y carga.
import { escape, toast, confirm, date as fmtDate } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { EXERCISES } from '../data/catalog.js';
import { member } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderRoutines(v, _, __, { t, user }) {
  v.innerHTML = `${pageHead('Rutinas', 'Planes de entrenamiento asignados a tus clientes. Se ven en la app del socio.', `<a class="btn btn-primary" href="#/rutinas/nueva">${icon('plus', 16)} Nueva rutina</a>`)}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.query('routines', r => r.trainerId === t.id).map(r => ({ ...r, mname: member(r.memberId)?.name || '—', nex: r.days.reduce((s, d) => s + d.exercises.length, 0), logs: db.count('logs', l => l.routineId === r.id) })),
    search: r => `${r.name} ${r.mname}`,
    filters: [{ key: 'active', label: 'Estado', options: [['1', 'Activas'], ['0', 'Archivadas']], test: (r, val) => !!r.active === (val === '1') }],
    columns: [
      { key: 'name', label: 'Rutina', render: r => `<b>${escape(r.name)}</b><br><small class="muted">${r.days.length} días · ${r.nex} ejercicios</small>` },
      { key: 'mname', label: 'Socio' }, { key: 'assignedAt', label: 'Asignada', render: r => escape(fmtDate(r.assignedAt)) },
      { key: 'logs', label: 'Registros' }, { key: 'active', label: 'Estado', render: r => r.active ? '<span class="badge badge-success">Activa</span>' : '<span class="badge">Archivada</span>' },
      { key: 'id', label: '', sort: false, render: r => `<div class="acts-cell">${actBtn('edit', r.id, 'edit', 'Editar')}${actBtn('del', r.id, 'trash', 'Eliminar')}</div>` }
    ],
    onRow: r => location.hash = '#/rutinas/' + r.id,
    onAction: async (act, id) => {
      if (act === 'edit') return location.hash = '#/rutinas/' + id;
      if (await confirm('¿Eliminar esta rutina? El historial del socio se conserva.', { title: 'Eliminar rutina', danger: true, ok: 'Eliminar' })) { db.remove('routines', id); db.log('rutina', 'Rutina eliminada', user.id); toast('Rutina eliminada', 'success'); }
    },
    csv: { name: 'rutinas.csv', map: r => ({ rutina: r.name, socio: r.mname, dias: r.days.length, ejercicios: r.nex, asignada: r.assignedAt }) }
  });
}

export function renderRoutineEditor(v, { id } = {}, query, { t, user }) {
  const orig = id ? db.get('routines', id) : null;
  const clients = db.query('members', m => m.status !== 'baja' && (m.trainerId === t.id || m.branchId === t.branchId)).sort((a, b) => a.name.localeCompare(b.name));
  const r = orig ? JSON.parse(JSON.stringify(orig)) : { name: '', memberId: query.socio || '', notes: '', days: [{ name: 'Día A', exercises: [{ ex: '', sets: 3, reps: '12', weight: 0 }] }], active: true };
  v.innerHTML = `${pageHead(orig ? 'Editar rutina' : 'Nueva rutina', `<a href="#/rutinas">${icon('back', 14)} Rutinas</a>`, `<button class="btn btn-primary" data-save>${icon('check', 16)} Guardar y asignar</button>`)}
  <datalist id="exs">${EXERCISES.map(e => `<option value="${escape(e)}"></option>`).join('')}</datalist>
  <div class="grid-main">
    <div class="stack" data-days></div>
    <div class="card stack"><div class="field"><label for="r-name">Nombre de la rutina</label><input class="input" id="r-name" value="${escape(r.name)}" placeholder="Ej: Fuerza 5x5"></div>
      <div class="field"><label for="r-m">Socio</label><select class="select" id="r-m"><option value="">Elegir socio…</option>${clients.map(m => `<option value="${m.id}" ${r.memberId === m.id ? 'selected' : ''}>${escape(m.name)} · ${m.code}</option>`).join('')}</select></div>
      <div class="field"><label for="r-n">Indicaciones</label><textarea class="textarea" id="r-n" placeholder="Descansos, calentamiento, progresión…">${escape(r.notes || '')}</textarea></div>
      <label class="check"><input type="checkbox" id="r-a" ${r.active ? 'checked' : ''}> Rutina activa (reemplaza la anterior del socio)</label>
      <button class="btn" data-addday>${icon('plus', 16)} Agregar día</button></div>
  </div>`;
  const box = v.querySelector('[data-days]');
  const draw = () => {
    box.innerHTML = r.days.map((d, di) => `<div class="card day-block" data-di="${di}">
      <div class="row between"><input class="input" data-dn value="${escape(d.name)}" style="max-width:260px" aria-label="Nombre del día"><button class="btn btn-sm btn-ghost" data-rmday="${di}">${icon('trash', 14)} Quitar día</button></div>
      <div class="ex-row small muted"><span>Ejercicio</span><span>Series</span><span>Reps</span><span>Kg</span><span></span></div>
      ${d.exercises.map((e, ei) => `<div class="ex-row" data-ei="${ei}"><input class="input" list="exs" data-k="ex" value="${escape(e.ex)}" placeholder="Ejercicio" aria-label="Ejercicio"><input class="input" type="number" min="1" data-k="sets" value="${e.sets}" aria-label="Series"><input class="input" data-k="reps" value="${escape(e.reps)}" aria-label="Repeticiones"><input class="input" type="number" min="0" step="0.5" data-k="weight" value="${e.weight}" aria-label="Kilos"><button class="btn btn-ghost btn-icon btn-sm" data-rmex="${ei}" aria-label="Quitar ejercicio">${icon('x', 16)}</button></div>`).join('')}
      <button class="btn btn-sm" data-addex="${di}">${icon('plus', 14)} Ejercicio</button></div>`).join('');
  };
  draw();
  box.addEventListener('input', e => {
    const di = +e.target.closest('[data-di]')?.dataset.di, ei = e.target.closest('[data-ei]')?.dataset.ei;
    if (e.target.dataset.dn !== undefined) r.days[di].name = e.target.value;
    else if (ei !== undefined) { const k = e.target.dataset.k; r.days[di].exercises[+ei][k] = k === 'sets' || k === 'weight' ? +e.target.value : e.target.value; }
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const di = +b.closest('[data-di]').dataset.di;
    if (b.dataset.addex !== undefined) r.days[di].exercises.push({ ex: '', sets: 3, reps: '10', weight: 0 });
    else if (b.dataset.rmex !== undefined) r.days[di].exercises.splice(+b.dataset.rmex, 1);
    else if (b.dataset.rmday !== undefined) { if (r.days.length === 1) return toast('La rutina necesita al menos un día', 'warning'); r.days.splice(di, 1); }
    draw();
  });
  v.querySelector('[data-addday]').onclick = () => { r.days.push({ name: `Día ${String.fromCharCode(65 + r.days.length)}`, exercises: [{ ex: '', sets: 3, reps: '12', weight: 0 }] }); draw(); };
  v.querySelector('[data-save]').onclick = () => {
    r.name = v.querySelector('#r-name').value.trim(); r.memberId = v.querySelector('#r-m').value; r.notes = v.querySelector('#r-n').value.trim(); r.active = v.querySelector('#r-a').checked;
    r.days.forEach(d => d.exercises = d.exercises.filter(e => e.ex.trim()));
    if (!r.name) return toast('Ponle un nombre a la rutina', 'warning');
    if (!r.memberId) return toast('Elige el socio', 'warning');
    if (!r.days.some(d => d.exercises.length)) return toast('Agrega al menos un ejercicio', 'warning');
    if (r.active) db.query('routines', x => x.memberId === r.memberId && x.active && x.id !== orig?.id).forEach(x => db.update('routines', x.id, { active: false }));
    const saved = orig ? db.update('routines', orig.id, r) : db.insert('routines', { ...r, trainerId: t.id, assignedAt: ymd() });
    db.log('rutina', `${t.name} ${orig ? 'actualizó' : 'asignó'} "${saved.name}" a ${member(r.memberId)?.name}`, user.id);
    toast('Rutina guardada: ya aparece en la app del socio', 'success');
    location.hash = '#/rutinas';
  };
}
