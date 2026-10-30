// Sucursales (showroom + taller).
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { sw, log, del } from './kit.js';
import { icon } from '../shared/icons.js';

export function renderShowrooms(v) {
  v.innerHTML = `${pageHead('Sucursales', 'Datos que se muestran en el sitio (sucursales, test drive, taller y stock).', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva sucursal</button>`)}<div class="card" data-list></div>`;
  const brands = db.all('brands');
  const fields = s => [{ name: 'name', label: 'Nombre', value: s?.name, required: true }, { name: 'city', label: 'Ciudad', value: s?.city, required: true }, { name: 'address', label: 'Dirección', value: s?.address, required: true }, { name: 'phone', label: 'Teléfono', value: s?.phone }, { name: 'hours', label: 'Horario', value: s?.hours }, { name: 'bays', label: 'Bahías de taller', type: 'number', value: s?.bays || 6 }, { name: 'img', label: 'Descripción', value: s?.img }, ...brands.map(b => ({ name: 'b_' + b.id, label: 'Vende ' + b.name, type: 'checkbox', value: s ? s.brands.includes(b.id) : true }))];
  const lv = listView(v.querySelector('[data-list]'), { rows: () => db.all('showrooms'), search: s => s.name + s.city,
    columns: [{ key: 'name', label: 'Sucursal', render: s => `<b>${escape(s.name)}</b><br><small class="muted">${escape(s.address)}</small>` }, { key: 'phone', label: 'Teléfono' }, { key: 'bays', label: 'Bahías' }, { key: 'brands', label: 'Marcas', sort: false, render: s => s.brands.map(b => brands.find(x => x.id === b)?.name).join(', ') }, { key: 'active', label: 'Activa', render: s => ({ __raw: true, value: sw('active', s.id, s.active !== false, 'Activa') }) }, { key: 'x', label: '', sort: false, render: s => ({ __raw: true, value: acts(actBtn('edit', s.id, 'edit', 'Editar'), actBtn('del', s.id, 'trash', 'Eliminar')) }) }],
    onRow: s => edit(s),
    onAction: async (a, id, el) => { const s = db.get('showrooms', id); if (a === 'edit') edit(s); if (a === 'active') { db.update('showrooms', id, { active: el.checked }); log('sucursal', `${s.name} ${el.checked ? 'activa' : 'inactiva'}`); } if (a === 'del') { if (db.count('units', u => u.showroomId === id)) return toast('Tiene inventario asignado: desactívala en vez de eliminarla', 'warning'); await del('showrooms', id, s.name) && lv.refresh(); } },
    csv: { name: 'sucursales.csv', map: s => ({ nombre: s.name, ciudad: s.city, direccion: s.address, telefono: s.phone, bahias: s.bays }) } });
  async function edit(s) { const r = await formModal({ title: s ? 'Editar sucursal' : 'Nueva sucursal', size: 'lg', fields: fields(s) }); if (!r) return; const bs = brands.filter(b => r['b_' + b.id]).map(b => b.id); if (!bs.length) return toast('Elige al menos una marca', 'warning'); const d = { name: r.name, city: r.city, address: r.address, phone: r.phone, hours: r.hours, bays: r.bays, img: r.img, brands: bs }; s ? db.update('showrooms', s.id, d) : db.insert('showrooms', { ...d, id: 'sr' + Date.now().toString(36), active: true }); log('sucursal', `${s ? 'Editada' : 'Nueva'} ${r.name}`); toast('Sucursal guardada', 'success'); lv.refresh(); }
  v.querySelector('[data-new]').onclick = () => edit(null);
}
