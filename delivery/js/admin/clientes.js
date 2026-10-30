// Clientes y cuentas empresa: CRUD, detalle con envíos, facturas, direcciones e incidencias.
import { db } from '../data/db.js';
import { html, raw, money, modal, formModal, confirm, toast, date, downloadCSV } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead, kpi } from '../shared/shell.js';
import { COMUNAS } from '../data/geo.js';
import { INVOICE_STATUS, INCIDENT_STATUS, badgeOf, statusLabel } from '../shared/status.js';
import { statusBadge } from '../shared/views.js';
import { newShipmentModal } from './shipment.js';
import * as ops from '../shared/ops.js';

const fields = (c = {}) => [
  { name: 'type', label: 'Tipo', type: 'select', options: [['empresa', 'Empresa'], ['persona', 'Persona']], value: c.type || 'empresa' },
  { name: 'name', label: 'Nombre / razón social', required: true, value: c.name },
  { name: 'rut', label: 'RUT', value: c.rut },
  { name: 'contact', label: 'Contacto', value: c.contact },
  { name: 'email', label: 'Correo', type: 'email', required: true, value: c.email },
  { name: 'phone', label: 'Teléfono', value: c.phone },
  { name: 'comuna', label: 'Comuna', type: 'select', options: COMUNAS.map(x => x.n).sort((a, b) => a.localeCompare(b, 'es')), value: c.comuna || 'Providencia' },
  { name: 'plan', label: 'Plan', type: 'select', options: ['Persona', 'Pyme', 'Corporativo'], value: c.plan || 'Pyme' },
  { name: 'creditLimit', label: 'Línea de crédito (CLP)', type: 'number', value: c.creditLimit ?? 400000 },
  { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: c.active !== false }
];

export function mountClientes(el, ctx) {
  let f = 'todos';
  const since = () => ops.simNow() - 30 * 864e5;
  const all = () => {
    const ships = db.all('shipments'), inv = db.all('invoices');
    return db.all('customers').map(c => {
      const mine = ships.filter(s => s.customerId === c.id);
      const m30 = mine.filter(s => Date.parse(s.createdAt) >= since() && s.status !== 'cancelado');
      return { ...c, n30: m30.length, spend30: m30.reduce((a, s) => a + s.price, 0), total: mine.length, due: inv.filter(i => i.customerId === c.id && ['pendiente', 'vencida'].includes(i.status)).reduce((a, i) => a + i.amount, 0), overdue: inv.some(i => i.customerId === c.id && i.status === 'vencida') };
    });
  };
  el.innerHTML = html`${raw(pageHead('Clientes', 'Personas y cuentas empresa.', `<button class="btn" data-csv>⇩ CSV</button>${ctx.can('clientes.edit') ? '<button class="btn btn-primary" data-new>＋ Nuevo cliente</button>' : ''}`))}
    <div class="kpis" data-k></div>
    <div class="chips" data-chips>${[['todos', 'Todos'], ['empresa', 'Empresas'], ['persona', 'Personas'], ['deuda', 'Con saldo pendiente'], ['inactivos', 'Inactivos']].map(([k, l]) => raw(html`<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}</button>`))}</div><div data-t></div>`;
  const rows = () => all().filter(c => f === 'todos' || (f === 'deuda' ? c.due > 0 : f === 'inactivos' ? c.active === false : c.type === f)).sort((a, b) => b.spend30 - a.spend30);
  const kp = () => { const a = all(); el.querySelector('[data-k]').innerHTML = kpi('Clientes', a.length) + kpi('Empresas', a.filter(c => c.type === 'empresa').length) + kpi('Activos 30 días', a.filter(c => c.n30).length) + kpi('Por cobrar', money(a.reduce((s, c) => s + c.due, 0))); };
  const table = dataTable(el.querySelector('[data-t]'), {
    rows: rows(), pageSize: 12, search: c => `${c.name} ${c.rut} ${c.email} ${c.comuna} ${c.plan}`, onRow: c => openCustomer(c.id, ctx),
    columns: [
      { key: 'name', label: 'Cliente', render: c => html`<b>${c.name}</b><br><small class="muted">${c.email}</small>` },
      { key: 'type', label: 'Tipo', render: c => raw(html`<span class="badge ${c.type === 'empresa' ? 'badge-primary' : ''}">${c.type === 'empresa' ? 'Empresa' : 'Persona'}</span>`) },
      { key: 'plan', label: 'Plan' },
      { key: 'n30', label: 'Envíos 30 d' },
      { key: 'spend30', label: 'Gasto 30 d', render: c => money(c.spend30) },
      { key: 'due', label: 'Saldo', render: c => c.due ? raw(html`<span class="${c.overdue ? 'text-danger' : ''}">${money(c.due)}</span>`) : '—' },
      { key: 'active', label: 'Estado', render: c => raw(c.active === false ? '<span class="badge badge-danger">Inactivo</span>' : '<span class="badge badge-success">Activo</span>') }
    ]
  });
  el.querySelector('[data-chips]').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b)); table.update(rows()); };
  el.querySelector('[data-new]')?.addEventListener('click', () => editCustomer(null, ctx));
  el.querySelector('[data-csv]').onclick = () => downloadCSV('clientes-rayo.csv', all().map(c => ({ nombre: c.name, tipo: c.type, rut: c.rut, correo: c.email, telefono: c.phone, plan: c.plan, envios_30d: c.n30, gasto_30d: c.spend30, saldo: c.due })));
  kp();
  let sig = '';
  return { refresh() { const n = JSON.stringify([db.count('customers'), db.count('shipments'), db.all('invoices').map(i => i.status).join(), db.all('customers').map(c => c.name + c.active).join()]); if (n === sig) return; sig = n; table.update(rows()); kp(); } };
}

export async function editCustomer(c, ctx) {
  const v = await formModal({ title: c ? `Editar ${c.name}` : 'Nuevo cliente', fields: fields(c || {}), submit: c ? 'Guardar' : 'Crear' });
  if (!v) return;
  if (c) { db.update('customers', c.id, v); db.log('cliente', `Editado ${v.name}`, ctx.user.id); toast('Cliente actualizado', 'success'); }
  else { const n = db.insert('customers', v); db.insert('addresses', { customerId: n.id, label: 'Principal', name: v.name, phone: v.phone, addr: 'Por definir', comuna: v.comuna, isDefault: true }); db.log('cliente', `Alta de ${v.name}`, ctx.user.id); toast('Cliente creado', 'success'); }
}

export function openCustomer(id, ctx) {
  const c = db.get('customers', id);
  const ships = db.query('shipments', s => s.customerId === id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const inv = db.query('invoices', i => i.customerId === id).sort((a, b) => b.period.localeCompare(a.period));
  const addr = db.query('addresses', a => a.customerId === id);
  const inc = db.query('incidents', i => i.customerId === id);
  const user = c.userId ? db.get('users', c.userId) : null;
  const m = modal({ title: c.name, size: 'lg', body: html`<div class="stack">
    <div class="row between"><div><span class="badge ${c.type === 'empresa' ? 'badge-primary' : ''}">${c.type}</span> <span class="muted small">${c.rut || ''} · ${c.email} · ${c.phone || ''} · ${c.plan}</span>${user ? raw(html`<br><small class="muted">Usuario del portal: ${user.email}</small>`) : ''}</div>
      <div class="row" style="gap:6px">${ctx.can('envios.create') ? raw('<button class="btn btn-sm btn-primary" data-a="ship">＋ Envío</button>') : ''}${ctx.can('clientes.edit') ? raw('<button class="btn btn-sm" data-a="edit">Editar</button>') : ''}${ctx.can('clientes.delete') ? raw('<button class="btn btn-sm btn-ghost" data-a="del" aria-label="Eliminar">🗑</button>') : ''}</div></div>
    <div class="kpis">${raw(kpi('Envíos', ships.length))}${raw(kpi('Gastado', money(ships.filter(s => s.status !== 'cancelado').reduce((a, s) => a + s.price, 0))))}${raw(kpi('Incidencias', inc.length))}${raw(kpi('Direcciones', addr.length))}</div>
    <div class="detail-grid"><div><b>Últimos envíos</b><div class="list">${ships.slice(0, 8).map(s => raw(html`<button class="list-item btn-reset" data-ship="${s.id}"><span class="grow"><b class="mono">${s.code}</b><small class="muted">${date(s.createdAt)} · ${s.sender.comuna} → ${s.receiver.comuna} · ${money(s.price)}</small></span>${raw(statusBadge(s.status, ops.isLate(s)))}</button>`)) || raw('<div class="empty-inline">Sin envíos</div>')}</div>
      <a class="small" href="#/envios?customer=${c.id}" data-close>Ver todos sus envíos →</a></div>
      <div class="stack"><div><b>Documentos</b><div class="list">${inv.slice(0, 5).map(i => raw(html`<div class="list-item"><span class="grow"><b class="mono">${i.number}</b><small class="muted">${i.period} · ${i.count} envíos</small></span><b class="small">${money(i.amount)}</b>${raw(badgeOf(INVOICE_STATUS, i.status))}</div>`)) || raw('<div class="empty-inline">Sin documentos</div>')}</div></div>
      <div><b>Direcciones</b>${addr.map(a => raw(html`<div class="small">${a.isDefault ? '★ ' : ''}<b>${a.label}</b>: ${a.addr}, ${a.comuna}</div>`))}</div>
      ${inc.length ? raw(html`<div><b>Incidencias</b>${inc.map(i => raw(html`<div class="small">${i.number} · ${raw(badgeOf(INCIDENT_STATUS, i.status))}</div>`))}</div>`) : ''}</div></div></div>` });
  m.el.addEventListener('click', async e => {
    const s = e.target.closest('[data-ship]'); if (s) { m.close(); ctx.open(s.dataset.ship); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'edit') { m.close(); editCustomer(c, ctx); }
    if (a === 'ship') { m.close(); newShipmentModal(ctx, c.id); }
    if (a === 'del' && await confirm(`¿Eliminar a ${c.name}? Sus envíos históricos se conservan como "ocasional".`, { danger: true, ok: 'Eliminar' })) {
      db.remove('customers', c.id); db.query('addresses', x => x.customerId === c.id).forEach(x => db.remove('addresses', x.id));
      if (c.userId) db.update('users', c.userId, { active: false });
      db.log('cliente', `Eliminado ${c.name}`, ctx.user.id); toast('Cliente eliminado', 'success'); m.close();
    }
  });
}
