// Sucursales: CRUD con stock por sucursal y servicios disponibles.
import { escape, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { REGIONS } from '../data/catalog.js';
import { isVisible } from '../shared/domain.js';

async function edit(b, ctx) {
  const v = await formModal({ title: b ? `Editar ${b.name}` : 'Nueva sucursal', fields: [{ name: 'name', label: 'Nombre', required: true, value: b?.name }, { name: 'address', label: 'Dirección', required: true, value: b?.address }, { name: 'comuna', label: 'Comuna', required: true, value: b?.comuna },
    { name: 'region', label: 'Región', type: 'select', options: REGIONS, value: b?.region }, { name: 'phone', label: 'Teléfono', value: b?.phone }, { name: 'hours', label: 'Horario', value: b?.hours || 'Lun a vie 09:30–18:30' }, { name: 'services', label: 'Tiene taller de servicios', type: 'checkbox', value: b?.services }, { name: 'active', label: 'Activa', type: 'checkbox', value: b ? b.active : true }] });
  if (!v) return;
  b ? db.update('branches', b.id, v) : db.insert('branches', v);
  db.log('sucursales', `Sucursal ${b ? 'editada' : 'creada'}: ${v.name}`, ctx.user.id); toast('Sucursal guardada', 'success');
}
export default {
  id: 'sucursales', label: 'Sucursales', icon: '📍', group: 'Sistema', roles: ['admin', 'gerente'],
  watch: ['branches', 'cars'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Sucursales', 'Red de sucursales, stock y servicios')}<div data-t></div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-new]')) edit(null, ctx);
      const d = e.target.closest('[data-del]'); if (d) { if (db.count('cars', c => c.branchId === d.dataset.del && c.status !== 'vendido')) { toast('La sucursal tiene autos en stock: desactívala en su lugar', 'warning'); return; } if (await confirm('¿Eliminar sucursal?', { danger: true, ok: 'Eliminar' })) db.remove('branches', d.dataset.del); }
    });
    return smartTable(el.querySelector('[data-t]'), {
      rows: () => db.all('branches').map(b => ({ ...b, stock: db.count('cars', c => c.branchId === b.id && isVisible(c)), sold: db.count('cars', c => c.branchId === b.id && c.status === 'vendido') })),
      search: r => `${r.name} ${r.comuna} ${r.region}`,
      columns: [{ key: 'name', label: 'Sucursal', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.address)}, ${escape(r.comuna)}</small>` }, { key: 'region', label: 'Región' }, { key: 'stock', label: 'Publicados' }, { key: 'sold', label: 'Vendidos (histórico)' },
        { key: 'services', label: 'Taller', render: r => r.services ? '✓' : '—' }, { key: 'active', label: 'Estado', render: r => r.active ? '<span class="badge badge-success">Activa</span>' : '<span class="badge">Inactiva</span>' }, { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>` }],
      onRow: r => edit(db.get('branches', r.id), ctx), actions: '<button class="btn btn-sm btn-primary" data-new>+ Sucursal</button>'
    });
  }
};
