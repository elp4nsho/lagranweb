// Promociones y cupones: CRUD, vigencia, límite de usos y visibilidad en la portada.
import { escape, money, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { services, serviceById, today, addDays } from '../shared/domain.js';

async function editCoupon(c, ctx) {
  const v = await formModal({ title: c ? `Cupón ${c.code}` : 'Nuevo cupón', fields: [
    { name: 'code', label: 'Código', required: true, value: c?.code, placeholder: 'VERANO10' }, { name: 'desc', label: 'Descripción pública', required: true, value: c?.desc },
    { name: 'type', label: 'Tipo', type: 'select', options: [['pct', 'Porcentaje'], ['amount', 'Monto fijo (CLP)']], value: c?.type || 'pct' }, { name: 'value', label: 'Valor', type: 'number', required: true, value: c?.value || 10 },
    { name: 'serviceId', label: 'Aplica a', type: 'select', options: [['', 'Toda la atención'], ...services(true).map(s => [s.id, s.name])], value: c?.serviceId || '' },
    { name: 'validTo', label: 'Válido hasta', type: 'date', value: c?.validTo || addDays(today(), 30) }, { name: 'maxUses', label: 'Usos máximos (0 = ilimitado)', type: 'number', value: c?.maxUses || 0 },
    { name: 'active', label: 'Activo', type: 'checkbox', value: c ? c.active : true }, { name: 'public', label: 'Mostrar en la portada del sitio', type: 'checkbox', value: c ? c.public : true }] });
  if (!v) return;
  v.code = v.code.toUpperCase().replace(/\s+/g, '');
  if (v.type === 'pct' && (v.value <= 0 || v.value > 100)) { toast('El porcentaje debe estar entre 1 y 100', 'warning'); return; }
  if (db.find('coupons', x => x.code === v.code && x.id !== c?.id)) { toast('Ya existe ese código', 'warning'); return; }
  c ? db.update('coupons', c.id, v) : db.insert('coupons', { ...v, uses: 0 });
  db.log('promociones', `Cupón ${v.code} ${c ? 'editado' : 'creado'}`, ctx.user.id); toast('Cupón guardado', 'success');
}

export default {
  id: 'promociones', label: 'Promociones', icon: '🎯', group: 'Comercial', roles: ['admin'], watch: ['coupons', 'jobs'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Promociones y cupones', 'Los cupones públicos aparecen en la portada y se aplican al reservar o en caja', '<button class="btn btn-primary btn-sm" data-new>+ Cupón</button>')}<div data-list></div>`;
    el.querySelector('[data-new]').onclick = () => editCoupon(null, ctx);
    el.addEventListener('click', async e => { const d = e.target.closest('[data-del]'); if (d) { const c = db.get('coupons', d.dataset.del); if (await confirm(`¿Eliminar ${c.code}?`, { danger: true, ok: 'Eliminar' })) { db.remove('coupons', c.id); db.log('promociones', `Cupón ${c.code} eliminado`, ctx.user.id); } } });
    el.addEventListener('change', e => { const s = e.target.closest('[data-tog]'); if (s) { db.update('coupons', s.dataset.tog, { active: s.checked }); toast(s.checked ? 'Cupón activado' : 'Cupón pausado', 'success'); } });
    const T = today();
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('coupons').map(c => ({ ...c, st: !c.active ? 'Pausado' : c.validTo < T ? 'Vencido' : 'Vigente', rev: db.query('jobs', j => j.coupon === c.code && j.status === 'pagado').reduce((s, j) => s + (j.discount || 0), 0) })),
      filters: [{ key: 'st', label: 'Estado', options: ['Vigente', 'Vencido', 'Pausado'] }],
      search: r => `${r.code} ${r.desc}`,
      columns: [{ key: 'code', label: 'Código', render: r => `<code><b>${escape(r.code)}</b></code>${r.public ? ' <span class="badge badge-info plain">portada</span>' : ''}` }, { key: 'desc', label: 'Descripción', render: r => `<small>${escape(r.desc)}</small>` }, { key: 'value', label: 'Descuento', render: r => r.type === 'pct' ? r.value + '%' : money(r.value) }, { key: 'serviceId', label: 'Aplica a', render: r => escape(r.serviceId ? serviceById(r.serviceId)?.name : 'Todo') }, { key: 'uses', label: 'Usos', render: r => `${r.uses}${r.maxUses ? ' / ' + r.maxUses : ''}` }, { key: 'validTo', label: 'Vence' }, { key: 'st', label: 'Estado', render: r => `<span class="badge ${r.st === 'Vigente' ? 'badge-success' : r.st === 'Vencido' ? 'badge-danger' : ''}">${r.st}</span>` }, { key: 'active', label: 'Activo', sort: false, render: r => `<label class="switch no-row"><input type="checkbox" data-tog="${r.id}" ${r.active ? 'checked' : ''}><span></span></label>` }, { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost no-row" data-del="${r.id}" aria-label="Eliminar">🗑</button>` }],
      onRow: r => editCoupon(db.get('coupons', r.id), ctx),
      csv: { name: 'cupones', map: r => ({ codigo: r.code, descripcion: r.desc, tipo: r.type, valor: r.value, usos: r.uses, vence: r.validTo, estado: r.st }) }
    });
  }
};
