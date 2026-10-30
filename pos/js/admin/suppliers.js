// Proveedores: CRUD con plazos de entrega, condiciones de pago y compras acumuladas.
import { html, raw, money, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { db, canEdit } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log } from '../shared/common.js';
import { validRut } from '../pos/customers.js';

const FIELDS = s => [
  { name: 'name', label: 'Razón social / nombre', value: s.name, required: true },
  { name: 'rut', label: 'RUT', value: s.rut, required: true, placeholder: '76.123.456-7' },
  { name: 'category', label: 'Rubro', value: s.category },
  { name: 'contact', label: 'Contacto', value: s.contact },
  { name: 'email', label: 'Correo pedidos', type: 'email', value: s.email },
  { name: 'phone', label: 'Teléfono', value: s.phone },
  { name: 'leadDays', label: 'Días de entrega', type: 'number', value: s.leadDays ?? 3 },
  { name: 'paymentTerms', label: 'Condición de pago', type: 'select', value: s.paymentTerms || '30 días', options: ['Contado', '15 días', '30 días', '45 días', '60 días'] },
  { name: 'active', label: 'Activo', type: 'checkbox', value: s.active !== false }
];

export function render(el) {
  const ed = canEdit('suppliers');
  const rows = db.all('suppliers').map(s => ({ ...s, active: s.active !== false, products: db.count('products', p => p.supplierId === s.id), spent: db.query('purchaseOrders', p => p.supplierId === s.id && p.status !== 'cancelada').reduce((a, p) => a + p.total, 0), open: db.count('purchaseOrders', p => p.supplierId === s.id && ['enviada', 'parcial'].includes(p.status)) }));
  el.innerHTML = html`${raw(pageHead('Proveedores', `${rows.length} proveedores · ${rows.filter(r => r.active).length} activos`, `<button class="btn" data-csv>⬇ CSV</button>${ed ? '<button class="btn btn-primary" data-new>+ Nuevo proveedor</button>' : ''}`))}<div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'suppliers', rows, search: s => `${s.name} ${s.rut} ${s.contact} ${s.category}`, defaultSort: { key: 'spent', dir: -1 },
    filters: [{ key: 'active', label: 'Estado', options: [['true', 'Activos'], ['false', 'Inactivos']], test: (s, v) => String(s.active) === v }],
    columns: [
      { key: 'name', label: 'Proveedor', render: s => html`<b>${s.name}</b><br><small class="muted">RUT ${s.rut} · ${s.category}</small>` },
      { key: 'contact', label: 'Contacto', render: s => html`${s.contact}<br><small class="muted">${s.email} · ${s.phone}</small>` },
      { key: 'leadDays', label: 'Entrega', render: s => `${s.leadDays} día(s)` },
      { key: 'paymentTerms', label: 'Pago' },
      { key: 'products', label: 'Productos' },
      { key: 'spent', label: 'Comprado', render: s => `<b>${money(s.spent)}</b>${s.open ? `<br><small class="muted">${s.open} OC abierta(s)</small>` : ''}` },
      { key: 'active', label: 'Estado', render: s => s.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge">Inactivo</span>' },
      { key: 'act', label: '', sort: false, class: 'actions', render: s => ed ? `<button class="btn btn-sm" data-edit="${s.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${s.id}" aria-label="Eliminar">🗑</button>` : '' }
    ]
  });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-csv]')) exportCSV('proveedores', t.filtered().map(s => ({ nombre: s.name, rut: s.rut, rubro: s.category, contacto: s.contact, email: s.email, telefono: s.phone, dias_entrega: s.leadDays, pago: s.paymentTerms, comprado: s.spent })));
    const edb = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (e.target.closest('[data-new]') || edb) {
      const s = edb ? db.get('suppliers', edb.dataset.edit) : {};
      const v = await formModal({ title: edb ? `Editar ${s.name}` : 'Nuevo proveedor', fields: FIELDS(s) });
      if (!v) return;
      const rut = validRut(v.rut);
      if (!rut) return toast('RUT inválido', 'warning');
      v.rut = rut;
      if (edb) { db.update('suppliers', s.id, v); log('proveedor', `Editó ${v.name}`); } else { db.insert('suppliers', v); log('proveedor', `Creó ${v.name}`); }
      toast('Proveedor guardado', 'success');
    }
    if (del) {
      const s = db.get('suppliers', del.dataset.del);
      if (db.count('purchaseOrders', p => p.supplierId === s.id)) return toast('Tiene órdenes de compra asociadas: desactívalo en vez de eliminarlo', 'warning');
      if (!await confirm(`¿Eliminar a ${s.name}?`, { danger: true, ok: 'Eliminar' })) return;
      db.remove('suppliers', s.id); log('proveedor', `Eliminó ${s.name}`); toast('Proveedor eliminado', 'info');
    }
  });
}
