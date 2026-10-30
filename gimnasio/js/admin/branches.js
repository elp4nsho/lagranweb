import { escape, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderBranches(v) {
  v.innerHTML = `${pageHead('Sedes', 'Horarios, servicios y aforo de cada sede.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva sede</button>`)}<div class="card" data-list></div>`;
  const edit = async b => {
    const val = await formModal({ title: b ? `Editar ${b.name}` : 'Nueva sede', size: 'lg', fields: [
      { name: 'name', label: 'Nombre', required: true, value: b?.name }, { name: 'address', label: 'Dirección', required: true, value: b?.address }, { name: 'commune', label: 'Comuna', value: b?.commune },
      { name: 'phone', label: 'Teléfono', value: b?.phone }, { name: 'semana', label: 'Horario lunes a viernes', value: b?.hours.semana || '06:00 – 23:00' }, { name: 'sabado', label: 'Horario sábado', value: b?.hours.sabado || '08:00 – 20:00' },
      { name: 'domingo', label: 'Horario domingo', value: b?.hours.domingo || 'Cerrado' }, { name: 'amenities', label: 'Servicios (separados por coma)', value: (b?.amenities || []).join(', ') },
      { name: 'capacity', label: 'Aforo', type: 'number', value: b?.capacity || 150 }, { name: 'active', label: 'Visible en el sitio', type: 'checkbox', value: b ? b.active !== false : true }] });
    if (!val) return;
    const data = { name: val.name, address: val.address, commune: val.commune, phone: val.phone, hours: { semana: val.semana, sabado: val.sabado, domingo: val.domingo }, amenities: val.amenities.split(',').map(x => x.trim()).filter(Boolean), capacity: val.capacity, active: val.active };
    b ? db.update('branches', b.id, data) : db.insert('branches', data);
    db.log('sede', `${b ? 'Editada' : 'Creada'}: ${val.name}`, auth.current()?.id); toast('Sede guardada', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('branches').map(b => ({ ...b, members: db.count('members', m => m.branchId === b.id && m.status === 'activo'), today: db.count('checkins', k => k.branchId === b.id && ymd(new Date(k.at)) === ymd()), cls: db.count('classes', c => c.branchId === b.id) })),
    search: b => `${b.name} ${b.address}`,
    columns: [{ key: 'name', label: 'Sede', render: b => `<b>${escape(b.name)}</b><br><small class="muted">${escape(b.address)}, ${escape(b.commune)}</small>` }, { key: 'hours', label: 'Horario L-V', sort: false, render: b => `<small>${escape(b.hours.semana)}</small>` },
      { key: 'members', label: 'Socios activos' }, { key: 'cls', label: 'Clases/sem' }, { key: 'today', label: 'Ingresos hoy' },
      { key: 'active', label: 'Estado', render: b => b.active !== false ? '<span class="badge badge-success">Abierta</span>' : '<span class="badge">Oculta</span>' },
      { key: 'id', label: '', sort: false, render: b => `<div class="acts-cell">${actBtn('edit', b.id, 'edit', 'Editar')}${actBtn('del', b.id, 'trash', 'Eliminar')}</div>` }],
    onRow: b => edit(db.get('branches', b.id)),
    onAction: async (act, id) => {
      const b = db.get('branches', id);
      if (act === 'edit') return edit(b);
      if (db.count('members', m => m.branchId === id && m.status !== 'baja') || db.count('classes', c => c.branchId === id)) return toast('La sede tiene socios o clases. Ocúltala en vez de eliminarla.', 'warning');
      if (await confirm(`¿Eliminar la sede ${b.name}?`, { title: 'Eliminar sede', danger: true, ok: 'Eliminar' })) { db.remove('branches', id); toast('Sede eliminada', 'success'); }
    },
    csv: { name: 'sedes.csv', map: b => ({ sede: b.name, direccion: b.address, comuna: b.commune, socios: b.members, clases: b.cls }) }
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
