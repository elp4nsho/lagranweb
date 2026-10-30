// Cupones: CRUD, activación, límites de uso, vencimiento y rendimiento.
import { db, today, isSold } from '../data/db.js';
import { pageHead, table, badge } from '../shared/admin-kit.js';
import { escape, money, toast, confirm, formModal, date } from '../../../assets/core/ui.js';

const stateOf = c => !c.active ? ['Inactivo', ''] : c.expires && c.expires < today() ? ['Vencido', 'danger'] : c.maxUses && c.uses >= c.maxUses ? ['Agotado', 'warning'] : ['Activo', 'success'];

async function edit(c, ctx) {
  const v = await formModal({ title: c ? `Editar ${c.code}` : 'Nuevo cupón', fields: [
    { name: 'code', label: 'Código', value: c?.code || '', required: true, placeholder: 'EJ: PRIMAVERA10' },
    { name: 'type', label: 'Tipo', type: 'select', value: c?.type || 'pct', options: [['pct', 'Porcentaje (%)'], ['fixed', 'Monto fijo (CLP)']] },
    { name: 'value', label: 'Valor', type: 'number', value: c?.value ?? 10, required: true },
    { name: 'maxUses', label: 'Máximo de usos (0 = ilimitado)', type: 'number', value: c?.maxUses ?? 0 },
    { name: 'expires', label: 'Vence el (opcional)', type: 'date', value: c?.expires || '' },
    { name: 'note', label: 'Nota interna', value: c?.note || '' },
    { name: 'active', label: 'Activo', type: 'checkbox', value: c ? c.active : true }
  ] });
  if (!v) return;
  v.code = v.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!v.code || !(v.value > 0) || (v.type === 'pct' && v.value > 90)) return toast('Revisa el código y el valor (máx. 90%)', 'warning');
  if (db.find('coupons', x => x.code === v.code && x.id !== c?.id)) return toast('Ya existe un cupón con ese código', 'error');
  if (c) db.update('coupons', c.id, v); else db.insert('coupons', { ...v, uses: 0 });
  db.log(c ? 'Cupón editado' : 'Cupón creado', `${v.code} (${v.type === 'pct' ? v.value + '%' : money(v.value)})`, ctx.user.id);
  toast('Cupón guardado', 'success');
}

export default {
  id: 'cupones', label: 'Cupones', ico: '🎟️', group: 'Marketing', roles: ['admin', 'marketing'],
  render(view, ctx) {
    const orders = db.query('orders', isSold);
    const rows = db.all('coupons').map(c => { const os = orders.filter(o => o.coupon === c.code); return { ...c, revenue: os.reduce((s, o) => s + o.total, 0), discounted: os.reduce((s, o) => s + o.discount, 0) }; });
    view.innerHTML = `${pageHead('Cupones', 'Los clientes los aplican en el checkout. Los inactivos o vencidos se rechazan automáticamente.', '<button class="btn btn-primary" data-new>＋ Nuevo cupón</button>')}<div class="card" id="tbl"></div>`;
    table(view.querySelector('#tbl'), {
      id: 'coupons', rows, sort: { key: 'uses', dir: -1 },
      search: c => `${c.code} ${c.note}`,
      filters: [{ key: 'st', label: 'Estado', options: [['Activo', 'Activo'], ['Inactivo', 'Inactivo'], ['Vencido', 'Vencido'], ['Agotado', 'Agotado']], test: (c, v) => stateOf(c)[0] === v }],
      columns: [
        { key: 'code', label: 'Código', render: c => `<b class="mono">${escape(c.code)}</b><br><small class="muted">${escape(c.note || '')}</small>` },
        { key: 'value', label: 'Descuento', render: c => c.type === 'pct' ? `${c.value}%` : money(c.value) },
        { key: 'uses', label: 'Usos', render: c => `${c.uses}${c.maxUses ? ' / ' + c.maxUses : ''}` },
        { key: 'revenue', label: 'Ventas generadas', render: c => money(c.revenue) },
        { key: 'discounted', label: 'Descontado', render: c => money(c.discounted) },
        { key: 'expires', label: 'Vence', render: c => c.expires ? escape(date(c.expires + 'T12:00:00')) : '—' },
        { key: 'st', label: 'Estado', value: c => stateOf(c)[0], render: c => badge(...stateOf(c)) },
        { key: 'act', label: '', sort: false, render: c => `<div class="t-actions"><label class="switch" title="Activar/desactivar"><input type="checkbox" data-toggle="${c.id}" ${c.active ? 'checked' : ''} aria-label="Activo"><span></span></label><button class="btn btn-sm" data-edit="${c.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Eliminar">✕</button></div>` }
      ],
      csv: { name: 'cupones-aquilo.csv', map: c => ({ codigo: c.code, tipo: c.type, valor: c.value, usos: c.uses, max: c.maxUses, vence: c.expires, ventas: c.revenue, estado: stateOf(c)[0] }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-new]')) edit(null, ctx);
      if (t.dataset.edit) edit(db.get('coupons', t.dataset.edit), ctx);
      if (t.dataset.del) { const c = db.get('coupons', t.dataset.del); if (await confirm(`¿Eliminar el cupón ${c.code}?`, { danger: true, ok: 'Eliminar' })) { db.remove('coupons', c.id); db.log('Cupón eliminado', c.code, ctx.user.id); toast('Cupón eliminado', 'success'); } }
    };
    view.onchange = e => { const id = e.target.dataset.toggle; if (!id) return; const c = db.update('coupons', id, { active: e.target.checked }); db.log('Cupón', `${c.code} ${c.active ? 'activado' : 'desactivado'}`, ctx.user.id); toast(`${c.code} ${c.active ? 'activado' : 'desactivado'}`, 'success'); };
  }
};
