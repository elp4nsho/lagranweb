import { escape, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { patient, doctor, isActive } from '../shared/domain.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderBoxes(v) {
  const today = ymd();
  v.innerHTML = `${pageHead('Boxes y salas', 'Espacios de atención y su uso hoy.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo box</button>`)}<div class="card" data-list></div>`;
  const edit = async b => {
    const val = await formModal({ title: b ? `Editar ${b.name}` : 'Nuevo box', fields: [
      { name: 'name', label: 'Nombre', required: true, value: b?.name }, { name: 'floor', label: 'Piso', type: 'number', value: b?.floor ?? 1 },
      { name: 'type', label: 'Tipo / equipamiento', value: b?.type || 'Consulta' }, { name: 'active', label: 'Habilitado', type: 'checkbox', value: b ? b.active !== false : true }] });
    if (!val) return;
    b ? db.update('boxes', b.id, val) : db.insert('boxes', val);
    db.log('box', `${b ? 'Editado' : 'Creado'}: ${val.name}`, auth.current()?.id); toast('Box guardado', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('boxes').map(b => {
      const docs = db.query('doctors', d => d.boxId === b.id);
      const now = db.find('appointments', a => a.date === today && a.boxId === b.id && ['llamado', 'en_atencion'].includes(a.status));
      return { ...b, docs: docs.map(d => d.name).join(', '), todayN: db.count('appointments', a => a.date === today && a.status !== 'cancelada' && docs.some(d => d.id === a.doctorId)), now };
    }),
    search: b => `${b.name} ${b.type} ${b.docs}`,
    columns: [
      { key: 'name', label: 'Box', render: b => `<b>${escape(b.name)}</b><br><small class="muted">Piso ${b.floor} · ${escape(b.type)}</small>` },
      { key: 'docs', label: 'Profesionales asignados', render: b => `<small>${escape(b.docs || '—')}</small>` },
      { key: 'todayN', label: 'Citas hoy' },
      { key: 'now', label: 'Ahora', sort: false, render: b => b.now ? `<span class="badge badge-warning">Ocupado · ${escape(patient(b.now.patientId)?.name.split(' ')[0])}</span>` : b.active !== false ? '<span class="badge badge-success">Libre</span>' : '<span class="badge">Deshabilitado</span>' },
      { key: 'id', label: '', sort: false, render: b => `<div class="acts-cell">${actBtn('edit', b.id, 'edit', 'Editar')}${actBtn('del', b.id, 'trash', 'Eliminar')}</div>` }
    ],
    onAction: async (act, id) => {
      const b = db.get('boxes', id);
      if (act === 'edit') return edit(b);
      if (db.count('doctors', d => d.boxId === id)) return toast('Reasigna primero a los profesionales de este box', 'warning');
      if (await confirm(`¿Eliminar ${b.name}?`, { title: 'Eliminar box', danger: true, ok: 'Eliminar' })) { db.remove('boxes', id); db.log('box', `Eliminado: ${b.name}`, auth.current()?.id); toast('Box eliminado', 'success'); }
    },
    csv: { name: 'boxes.csv', map: b => ({ box: b.name, piso: b.floor, tipo: b.type, profesionales: b.docs, citas_hoy: b.todayN }) }
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
