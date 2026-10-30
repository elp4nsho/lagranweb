import { escape, money, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { icon } from '../shared/icons.js';

const ICONS = ['steth', 'baby', 'female', 'heart', 'sparkle', 'bone', 'eye', 'ear', 'brain', 'apple', 'drop', 'pulse', 'pill', 'shield', 'flask'];
export function renderSpecialties(v) {
  v.innerHTML = `${pageHead('Especialidades', 'Se muestran en el sitio público, el directorio y la reserva.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva especialidad</button>`)}<div class="card" data-list></div>`;
  const edit = async s => {
    const val = await formModal({ title: s ? `Editar ${s.name}` : 'Nueva especialidad', fields: [
      { name: 'name', label: 'Nombre', required: true, value: s?.name }, { name: 'desc', label: 'Descripción', type: 'textarea', required: true, value: s?.desc },
      { name: 'icon', label: 'Ícono', type: 'select', options: ICONS, value: s?.icon || 'steth' }, { name: 'order', label: 'Orden', type: 'number', value: s?.order ?? db.count('specialties') },
      { name: 'active', label: 'Visible en el sitio', type: 'checkbox', value: s ? s.active !== false : true }] });
    if (!val) return;
    if (s) db.update('specialties', s.id, val);
    else db.insert('specialties', { ...val, id: val.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 6) + Date.now().toString(36).slice(-3), prices: { fonasa: 9000, isapre: 15000, particular: 40000 } });
    db.log('especialidad', `${s ? 'Editada' : 'Creada'}: ${val.name}`, auth.current()?.id); toast('Especialidad guardada', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    pageSize: 15, rows: () => db.all('specialties').map(s => ({ ...s, docs: db.count('doctors', d => d.specialtyId === s.id && d.active !== false), appts: db.count('appointments', a => a.specialtyId === s.id && a.status === 'atendida') })).sort((a, b) => a.order - b.order),
    search: s => s.name,
    columns: [
      { key: 'order', label: '#' },
      { key: 'name', label: 'Especialidad', render: s => `<div class="cell-user"><span class="icon-bubble" style="width:36px;height:36px">${icon(s.icon, 18)}</span><span><b>${escape(s.name)}</b><small>${escape(s.desc.slice(0, 70))}…</small></span></div>` },
      { key: 'docs', label: 'Profesionales' }, { key: 'appts', label: 'Atenciones' },
      { key: 'fonasa', label: 'Desde', sort: false, render: s => money(s.prices.fonasa) },
      { key: 'active', label: 'Estado', render: s => s.active !== false ? '<span class="badge badge-success">Visible</span>' : '<span class="badge">Oculta</span>' },
      { key: 'id', label: '', sort: false, render: s => `<div class="acts-cell">${actBtn('edit', s.id, 'edit', 'Editar')}${actBtn('del', s.id, 'trash', 'Eliminar')}</div>` }
    ],
    onRow: s => edit(db.get('specialties', s.id)),
    onAction: async (act, id) => {
      const s = db.get('specialties', id);
      if (act === 'edit') return edit(s);
      if (db.count('doctors', d => d.specialtyId === id)) return toast('No se puede eliminar: tiene profesionales asociados. Puedes ocultarla.', 'warning');
      if (await confirm(`¿Eliminar ${s.name}?`, { title: 'Eliminar especialidad', danger: true, ok: 'Eliminar' })) { db.remove('specialties', id); db.log('especialidad', `Eliminada: ${s.name}`, auth.current()?.id); toast('Eliminada', 'success'); }
    },
    csv: { name: 'especialidades.csv', map: s => ({ nombre: s.name, profesionales: s.docs, atenciones: s.appts, fonasa: s.prices.fonasa, isapre: s.prices.isapre, particular: s.prices.particular }) }
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
