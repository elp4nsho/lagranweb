// Productoras: CRUD, aprobación/suspensión, comisión y liquidaciones.
import { db, notify } from '../data/db.js';
import { html, raw, $, money, num, toast, confirm, formModal, dataTable, modal, date } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV } from '../shared/admin-kit.js';
import { badge } from '../shared/format.js';
import { eventStats } from '../shared/inventory.js';

const FIELDS = o => [
  { name: 'name', label: 'Nombre comercial', required: true, value: o.name },
  { name: 'rut', label: 'RUT', required: true, value: o.rut, placeholder: '76.123.456-7' },
  { name: 'email', label: 'Correo de contacto', type: 'email', required: true, value: o.email },
  { name: 'phone', label: 'Teléfono', value: o.phone },
  { name: 'commissionPct', label: 'Comisión de la plataforma (%)', type: 'number', value: o.commissionPct ?? 8, required: true },
  { name: 'bank', label: 'Cuenta bancaria para liquidaciones', value: o.bank },
  { name: 'status', label: 'Estado', type: 'select', options: [['activo', 'Activo'], ['pendiente', 'Pendiente'], ['suspendido', 'Suspendido']], value: o.status || 'activo' }
];

export function render(el, { user }) {
  el.innerHTML = `${pageHead('Productoras', 'Organizadores que publican eventos en la plataforma', `${csvButton()}<button class="btn btn-primary" id="new">+ Nueva productora</button>`)}
    <div class="grid-2" id="payouts"></div><div id="tbl"></div>`;
  const rows = () => db.all('organizers').map(o => {
    const evs = db.query('events', e => e.organizerId === o.id);
    const gross = evs.reduce((s, e) => s + eventStats(e).revenue, 0);
    return { ...o, eventsN: evs.length, gross, users: db.query('users', u => u.organizerId === o.id).map(u => u.name).join(', ') };
  });
  const t = dataTable($('#tbl', el), {
    rows: rows(), search: r => `${r.name} ${r.rut} ${r.email}`, onRow: r => show(r.id),
    columns: [
      { key: 'name', label: 'Productora', render: r => html`<b>${r.name}</b><br><small class="muted">${r.rut} · ${r.email}</small>` },
      { key: 'users', label: 'Usuarios', render: r => r.users || '<span class="muted">—</span>' },
      { key: 'eventsN', label: 'Eventos' },
      { key: 'gross', label: 'Ventas brutas', render: r => money(r.gross) },
      { key: 'commissionPct', label: 'Comisión', render: r => `${r.commissionPct}%` },
      { key: 'status', label: 'Estado', render: r => badge(r.status) },
      { key: 'id', label: '', sort: false, render: r => `<span class="row" style="gap:4px;flex-wrap:nowrap">${r.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-approve="${r.id}">Aprobar</button>` : ''}<button class="btn btn-sm btn-ghost" data-edit="${r.id}">Editar</button></span>` }
    ]
  });
  const drawPayouts = () => {
    const req = db.query('payouts', p => p.status === 'solicitado');
    $('#payouts', el).innerHTML = `<div class="card"><h3>Liquidaciones solicitadas</h3>${req.length ? `<ul class="mini-list">${req.map(p => `<li><span>${db.get('organizers', p.organizerId)?.name}<br><small class="muted">${db.get('events', p.eventId)?.title || 'Anticipo'} · ${date(p.createdAt)}</small></span><b>${money(p.amount)}</b><button class="btn btn-sm btn-primary" data-pay="${p.id}">Pagar</button></li>`).join('')}</ul>` : '<div class="empty" style="padding:16px">Sin solicitudes pendientes</div>'}</div>
      <div class="card"><h3>Pagado a productoras</h3><div class="stat"><span class="value">${money(db.query('payouts', p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0))}</span><span class="label">${db.count('payouts', p => p.status === 'pagado')} liquidaciones históricas</span></div></div>`;
  };
  drawPayouts();
  async function edit(o = {}) {
    const r = await formModal({ title: o.id ? `Editar ${o.name}` : 'Nueva productora', fields: FIELDS(o) });
    if (!r) return;
    if (o.id) { db.update('organizers', o.id, r); db.log('productora editada', r.name, user.id); }
    else { db.insert('organizers', r); db.log('productora creada', r.name, user.id); }
    toast('Productora guardada', 'success');
  }
  function show(id) {
    const o = db.get('organizers', id), evs = db.query('events', e => e.organizerId === id), pays = db.query('payouts', p => p.organizerId === id);
    modal({ title: o.name, size: 'lg', body: `<div class="stack"><div class="detail-grid"><div><small>RUT</small>${o.rut}</div><div><small>Correo</small>${o.email}</div><div><small>Teléfono</small>${o.phone || '—'}</div><div><small>Cuenta</small>${o.bank || '—'}</div><div><small>Comisión</small>${o.commissionPct}%</div><div><small>Estado</small>${badge(o.status)}</div></div>
      <h3>Eventos (${evs.length})</h3><div class="table-wrap"><table class="table"><thead><tr><th>Evento</th><th>Estado</th><th>Vendidas</th><th>Recaudación</th></tr></thead><tbody>${evs.map(e => { const s = eventStats(e); return `<tr><td><a href="#/eventos/${e.id}">${e.title}</a></td><td>${badge(e.status)}</td><td>${num(s.sold)}</td><td>${money(s.revenue)}</td></tr>`; }).join('')}</tbody></table></div>
      <h3>Liquidaciones</h3>${pays.length ? `<ul class="mini-list">${pays.map(p => `<li><span>${db.get('events', p.eventId)?.title}</span>${badge(p.status)}<b>${money(p.amount)}</b></li>`).join('')}</ul>` : '<p class="muted">Sin liquidaciones</p>'}</div>` });
  }
  el.addEventListener('click', async e => {
    if (e.target.id === 'new') edit();
    const ed = e.target.closest('[data-edit]'); if (ed) edit(db.get('organizers', ed.dataset.edit));
    const ap = e.target.closest('[data-approve]');
    if (ap) { const o = db.get('organizers', ap.dataset.approve); db.update('organizers', o.id, { status: 'activo' }); db.log('productora aprobada', o.name, user.id); toast(`${o.name} aprobada`, 'success'); }
    const pay = e.target.closest('[data-pay]');
    if (pay && await confirm('¿Marcar la liquidación como pagada (transferencia simulada)?', { ok: 'Pagar' })) {
      const p = db.update('payouts', pay.dataset.pay, { status: 'pagado', paidAt: new Date().toISOString() });
      db.log('liquidación pagada', `${db.get('organizers', p.organizerId)?.name}: ${money(p.amount)}`, user.id);
      const prod = db.find('users', u => u.organizerId === p.organizerId); if (prod) notify(prod.id, `Transferimos ${money(p.amount)} a tu cuenta.`);
      toast('Liquidación pagada', 'success');
    }
  });
  wireCSV(el, 'productoras.csv', () => rows().map(r => ({ id: r.id, nombre: r.name, rut: r.rut, correo: r.email, eventos: r.eventsN, ventas: r.gross, comision: r.commissionPct, estado: r.status })));
  return { update: () => { t.update(rows()); drawPayouts(); } };
}
