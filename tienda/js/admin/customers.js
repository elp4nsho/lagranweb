// Clientes: listado con métricas (pedidos, gasto, última compra) y ficha con pedidos y direcciones.
import { html, raw, money, date, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, statusBadge } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log, me } from './common.js';

const valid = o => !['cancelado', 'reembolsado'].includes(o.status);

function rowsData() {
  const orders = db.all('orders');
  return db.query('users', u => u.role === 'customer').map(u => {
    const os = orders.filter(o => o.userId === u.id);
    const spent = os.filter(valid).reduce((s, o) => s + o.total, 0);
    const last = os.map(o => o.createdAt).sort().pop() || '';
    return { ...u, orders: os.length, spent, last, segment: spent > 150000 ? 'vip' : os.length > 1 ? 'recurrente' : os.length ? 'nuevo' : 'sin-compras', comuna: u.addresses?.[0]?.comuna || '—' };
  });
}
const SEG = { vip: ['VIP', 'primary'], recurrente: ['Recurrente', 'success'], nuevo: ['Primera compra', 'info'], 'sin-compras': ['Sin compras', 'warning'] };

export function render(el) {
  const rows = rowsData();
  el.innerHTML = html`${raw(pageHead('Clientes', `${rows.length} clientes registrados · ${db.count('subscribers')} suscriptores al boletín`, '<button class="btn" data-csv>⬇ Exportar CSV</button><button class="btn btn-primary" data-new>+ Nuevo cliente</button>'))}
    <div class="kpis">
      <div class="card stat"><span class="label">Clientes con compras</span><span class="value">${rows.filter(r => r.orders).length}</span></div>
      <div class="card stat"><span class="label">Recurrentes</span><span class="value">${rows.filter(r => r.orders > 1).length}</span></div>
      <div class="card stat"><span class="label">Gasto promedio</span><span class="value">${money(rows.reduce((s, r) => s + r.spent, 0) / (rows.filter(r => r.orders).length || 1))}</span></div>
      <div class="card stat"><span class="label">VIP (más de $150.000)</span><span class="value">${rows.filter(r => r.segment === 'vip').length}</span></div>
    </div><div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'customers', rows, search: r => `${r.name} ${r.email} ${r.phone} ${r.comuna}`, defaultSort: { key: 'spent', dir: -1 },
    filters: [{ key: 'segment', label: 'Segmento', options: Object.entries(SEG).map(([k, v]) => [k, v[0]]) }, { key: 'active', label: 'Estado', options: [['true', 'Activos'], ['false', 'Desactivados']], test: (r, v) => String(r.active !== false) === v }],
    onRow: r => { location.hash = `#/clientes/${r.id}`; },
    columns: [
      { key: 'name', label: 'Cliente', render: r => html`<div class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar" style="--av:${r.color}">${initials(r.name)}</span><span><b>${r.name}</b>${r.active === false ? raw(' <span class="badge badge-danger plain">Inactivo</span>') : ''}<br><small class="muted">${r.email}</small></span></div>` },
      { key: 'comuna', label: 'Comuna' },
      { key: 'orders', label: 'Pedidos' },
      { key: 'spent', label: 'Total gastado', render: r => `<b>${money(r.spent)}</b>` },
      { key: 'last', label: 'Última compra', render: r => r.last ? ago(r.last) : '<span class="muted">—</span>' },
      { key: 'segment', label: 'Segmento', render: r => `<span class="badge badge-${SEG[r.segment][1]}">${SEG[r.segment][0]}</span>` }
    ]
  });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-csv]')) exportCSV('clientes', t.filtered().map(r => ({ nombre: r.name, email: r.email, telefono: r.phone || '', comuna: r.comuna, pedidos: r.orders, gastado: r.spent, ultima_compra: r.last.slice(0, 10), segmento: SEG[r.segment][0] })));
    if (e.target.closest('[data-new]')) {
      const v = await formModal({ title: 'Nuevo cliente', fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono' }, { name: 'password', label: 'Contraseña inicial', value: 'cliente123', required: true }] });
      if (!v) return;
      if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase())) return toast('Ese correo ya existe', 'warning');
      const u = db.insert('users', { ...v, role: 'customer', active: true, color: '#0891b2', addresses: [], wishlist: [] });
      log('cliente', `Creó al cliente ${v.name}`);
      toast('Cliente creado', 'success');
      location.hash = `#/clientes/${u.id}`;
    }
  });
}

export function detail(el, { id }) {
  const u = db.get('users', id);
  if (!u || u.role !== 'customer') { el.innerHTML = '<div class="empty card"><h2>Cliente no encontrado</h2><a class="btn" href="#/clientes">Volver</a></div>'; return; }
  const os = db.query('orders', o => o.userId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const spent = os.filter(valid).reduce((s, o) => s + o.total, 0);
  const reviews = db.query('reviews', r => r.userId === id);
  el.innerHTML = html`<a class="small" href="#/clientes">← Clientes</a>
    <div class="page-head"><div class="row" style="gap:14px"><span class="avatar" style="--av:${u.color};--size:56px">${initials(u.name)}</span><div><h1>${u.name}</h1><p class="muted" style="margin:0">${u.email} · cliente desde ${date(u.createdAt)}</p></div></div>
      <div class="row" style="gap:8px"><button class="btn" data-edit>Editar</button><button class="btn ${u.active === false ? 'btn-primary' : 'btn-danger'}" data-toggle>${u.active === false ? 'Reactivar cuenta' : 'Desactivar cuenta'}</button></div></div>
    <div class="kpis">
      <div class="card stat"><span class="label">Pedidos</span><span class="value">${os.length}</span></div>
      <div class="card stat"><span class="label">Total gastado</span><span class="value">${money(spent)}</span></div>
      <div class="card stat"><span class="label">Ticket promedio</span><span class="value">${money(os.length ? spent / (os.filter(valid).length || 1) : 0)}</span></div>
      <div class="card stat"><span class="label">Favoritos</span><span class="value">${(u.wishlist || []).length}</span></div>
    </div>
    <div class="detail-grid">
      <div class="card"><div class="card-head"><h3>Pedidos</h3></div>
        ${os.length ? raw(html`<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th class="right">Total</th></tr></thead><tbody>${os.map(o => raw(html`<tr><td><a href="#/pedidos/${o.id}"><b>#${o.number}</b></a></td><td>${date(o.createdAt)}</td><td>${raw(statusBadge(o.status))}</td><td class="right">${money(o.total)}</td></tr>`))}</tbody></table></div>`) : raw('<p class="muted">Sin pedidos todavía.</p>')}</div>
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Contacto</h3></div><dl class="kv"><dt>Teléfono</dt><dd>${u.phone || '—'}</dd><dt>Boletín</dt><dd>${u.newsletter ? 'Suscrito' : 'No'}</dd><dt>Estado</dt><dd>${u.active === false ? 'Desactivado' : 'Activo'}</dd></dl></div>
        <div class="card"><div class="card-head"><h3>Direcciones</h3></div>${(u.addresses || []).length ? raw(`<ul class="list-plain">${u.addresses.map(a => html`<li style="display:block"><b>${a.label}</b>${a.isDefault ? ' · predeterminada' : ''}<br><small class="muted">${a.street}, ${a.comuna}, ${a.region}</small></li>`).join('')}</ul>`) : raw('<p class="muted small">Sin direcciones.</p>')}</div>
        <div class="card"><div class="card-head"><h3>Favoritos</h3></div>${(u.wishlist || []).map(pid => db.get('products', pid)).filter(Boolean).map(p => raw(html`<a class="chip" href="#/productos/${p.id}" style="margin:0 6px 6px 0">${p.name}</a>`))}</div>
        <div class="card"><div class="card-head"><h3>Reseñas (${reviews.length})</h3></div>${reviews.slice(0, 4).map(r => raw(html`<p class="small" style="margin:0 0 8px"><b>${'★'.repeat(r.rating)}</b> ${r.title} <span class="muted">· ${r.status}</span></p>`))}</div>
      </div>
    </div>`;
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-toggle]')) {
      const off = u.active !== false;
      if (off && !await confirm(`${u.name} no podrá iniciar sesión. ¿Desactivar?`, { danger: true, ok: 'Desactivar' })) return;
      db.update('users', id, { active: !off });
      log('cliente', `${off ? 'Desactivó' : 'Reactivó'} a ${u.name}`);
      toast(off ? 'Cuenta desactivada' : 'Cuenta reactivada', 'info');
    }
    if (e.target.closest('[data-edit]')) {
      const v = await formModal({ title: 'Editar cliente', fields: [{ name: 'name', label: 'Nombre', value: u.name, required: true }, { name: 'email', label: 'Correo', value: u.email, type: 'email', required: true }, { name: 'phone', label: 'Teléfono', value: u.phone || '' }, { name: 'newsletter', label: 'Suscrito al boletín', type: 'checkbox', value: u.newsletter }] });
      if (!v) return;
      if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== id)) return toast('Ese correo ya existe', 'warning');
      db.update('users', id, v);
      log('cliente', `Editó a ${v.name}`);
      toast('Cliente actualizado', 'success');
    }
  });
}
