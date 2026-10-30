import { escape, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { branch, discipline } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { icon } from '../shared/icons.js';

export function renderTrainers(v) {
  v.innerHTML = `${pageHead('Entrenadores', 'Staff que aparece en el sitio y dicta clases.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo entrenador</button>`)}<div class="card" data-list></div>`;
  const discs = db.all('disciplines');
  const edit = async t => {
    const val = await formModal({ title: t ? `Editar ${t.name}` : 'Nuevo entrenador', size: 'lg', fields: [
      { name: 'name', label: 'Nombre', required: true, value: t?.name }, { name: 'branchId', label: 'Sede', type: 'select', options: db.all('branches').map(b => [b.id, b.name]), value: t?.branchId },
      { name: 'specialties', label: `Disciplinas (códigos separados por coma: ${discs.map(d => d.id).join(', ')})`, required: true, value: (t?.specialties || []).join(', ') },
      { name: 'bio', label: 'Biografía', type: 'textarea', value: t?.bio }, { name: 'instagram', label: 'Instagram', value: t?.instagram },
      { name: 'active', label: 'Activo (visible en el sitio)', type: 'checkbox', value: t ? t.active !== false : true }] });
    if (!val) return;
    val.specialties = val.specialties.split(',').map(x => x.trim()).filter(x => discs.some(d => d.id === x));
    if (!val.specialties.length) return toast('Indica al menos una disciplina válida', 'warning');
    t ? db.update('trainers', t.id, val) : db.insert('trainers', { ...val, color: '#00a6a6', certifications: [] });
    db.log('entrenador', `${t ? 'Editado' : 'Creado'}: ${val.name}`, auth.current()?.id); toast('Entrenador guardado', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('trainers').map(t => ({ ...t, cls: db.count('classes', c => c.trainerId === t.id), clients: db.count('members', m => m.trainerId === t.id), routines: db.count('routines', r => r.trainerId === t.id && r.active) })),
    search: t => t.name, filters: [{ key: 'branchId', label: 'Sede', options: db.all('branches').map(b => [b.id, b.name]) }],
    columns: [{ key: 'name', label: 'Entrenador', render: t => `<div class="cell-user"><span class="avatar" style="--size:32px;--av:${t.color}">${escape(initials(t.name))}</span><span><b>${escape(t.name)}</b><small>${escape(branch(t.branchId)?.name)}</small></span></div>` },
      { key: 'specialties', label: 'Disciplinas', sort: false, render: t => `<div class="tag-list">${t.specialties.map(s => `<span class="badge plain">${escape(discipline(s)?.name || s)}</span>`).join('')}</div>` },
      { key: 'cls', label: 'Clases/sem' }, { key: 'clients', label: 'Clientes' }, { key: 'routines', label: 'Rutinas activas' },
      { key: 'id', label: '', sort: false, render: t => `<div class="acts-cell">${actBtn('edit', t.id, 'edit', 'Editar')}${actBtn('del', t.id, 'trash', 'Eliminar')}</div>` }],
    onRow: t => edit(db.get('trainers', t.id)),
    onAction: async (act, id) => {
      const t = db.get('trainers', id);
      if (act === 'edit') return edit(t);
      if (db.count('classes', c => c.trainerId === id)) return toast('Reasigna sus clases antes de eliminarlo', 'warning');
      if (await confirm(`¿Eliminar a ${t.name}?`, { title: 'Eliminar entrenador', danger: true, ok: 'Eliminar' })) { db.remove('trainers', id); toast('Entrenador eliminado', 'success'); }
    },
    csv: { name: 'entrenadores.csv', map: t => ({ nombre: t.name, sede: branch(t.branchId)?.name, disciplinas: t.specialties.join(' '), clases: t.cls, clientes: t.clients }) }
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
