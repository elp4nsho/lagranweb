// Clientes y programa de fidelización: niveles, puntos, ajustes manuales e historial de compras.
import { html, raw, money, date, dateTime, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { db, settings, tierOf, branchName, valid, itemName } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log, me } from '../shared/common.js';
import { validRut } from '../pos/customers.js';

const TIER_BADGE = { Bronce: 'warning', Plata: 'info', Oro: 'primary' };

export function render(el) {
  const L = settings().loyalty || {};
  const rows = db.all('customers').map(c => ({ ...c, tier: tierOf(c) }));
  const tiers = (L.tiers || []).map(t => ({ ...t, n: rows.filter(r => r.tier === t.name).length }));
  el.innerHTML = html`${raw(pageHead('Clientes y puntos', `${rows.length} clientes inscritos · 1 punto cada ${money(L.pesosPerPoint || 100)} · 1 punto = ${money(L.pointValue || 1)}`, '<button class="btn" data-csv>⬇ CSV</button><button class="btn btn-primary" data-new>+ Nuevo cliente</button>'))}
    <div class="kpis">
      ${tiers.map(t => raw(html`<div class="card stat"><span class="label">Nivel ${t.name} (desde ${t.min} pts)</span><span class="value">${t.n}</span></div>`))}
      <div class="card stat"><span class="label">Puntos en circulación</span><span class="value">${rows.reduce((s, r) => s + r.points, 0).toLocaleString('es-CL')}</span><span class="small muted">pasivo ${money(rows.reduce((s, r) => s + r.points, 0) * (L.pointValue || 1))}</span></div>
    </div><div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'pos-customers', rows, search: c => `${c.name} ${c.rut} ${c.email} ${c.phone}`, defaultSort: { key: 'totalSpent', dir: -1 }, onRow: c => { location.hash = `#/clientes/${c.id}`; },
    filters: [{ key: 'tier', label: 'Nivel', options: (L.tiers || []).map(t => [t.name, t.name]) }],
    columns: [
      { key: 'name', label: 'Cliente', render: c => html`<b>${c.name}</b><br><small class="muted">${c.rut} · ${c.phone}</small>` },
      { key: 'tier', label: 'Nivel', render: c => `<span class="badge badge-${TIER_BADGE[c.tier] || 'info'}">${c.tier}</span>` },
      { key: 'points', label: 'Puntos', render: c => `<b>${c.points.toLocaleString('es-CL')}</b>` },
      { key: 'visits', label: 'Visitas' },
      { key: 'totalSpent', label: 'Compras', render: c => money(c.totalSpent) },
      { key: 'lastVisit', label: 'Última visita', render: c => c.lastVisit ? ago(c.lastVisit) : '—' }
    ]
  });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-csv]')) exportCSV('clientes', t.filtered().map(c => ({ nombre: c.name, rut: c.rut, email: c.email, telefono: c.phone, nivel: c.tier, puntos: c.points, visitas: c.visits, compras: c.totalSpent })));
    if (e.target.closest('[data-new]')) customerForm();
  });
}

async function customerForm(c = null) {
  const v = await formModal({ title: c ? `Editar ${c.name}` : 'Nuevo cliente', fields: [
    { name: 'name', label: 'Nombre completo', value: c?.name, required: true }, { name: 'rut', label: 'RUT', value: c?.rut, required: true, placeholder: '12.345.678-5' },
    { name: 'email', label: 'Correo', type: 'email', value: c?.email }, { name: 'phone', label: 'Teléfono', value: c?.phone }, { name: 'birthday', label: 'Cumpleaños (dd-mm)', value: c?.birthday, placeholder: '24-06' }
  ] });
  if (!v) return;
  const rut = validRut(v.rut);
  if (!rut) return toast('RUT inválido (revisa el dígito verificador)', 'warning');
  if (db.find('customers', x => x.rut === rut && x.id !== c?.id)) return toast('Ya existe un cliente con ese RUT', 'warning');
  v.rut = rut;
  if (c) { db.update('customers', c.id, v); log('cliente', `Editó a ${v.name}`); toast('Cliente actualizado', 'success'); }
  else { const n = db.insert('customers', { ...v, points: 0, pointsEarned: 0, visits: 0, totalSpent: 0, lastVisit: '' }); log('cliente', `Inscribió a ${v.name}`); toast('Cliente inscrito', 'success'); location.hash = `#/clientes/${n.id}`; }
}

export function detail(el, { id }) {
  const c = db.get('customers', id);
  if (!c) { el.innerHTML = '<div class="empty card"><h2>Cliente no encontrado</h2><a class="btn" href="#/clientes">Volver</a></div>'; return; }
  const L = settings().loyalty || {};
  const tiers = (L.tiers || []).slice().sort((a, b) => a.min - b.min);
  const next = tiers.find(t => t.min > (c.pointsEarned || 0));
  const sales = db.query('sales', s => s.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fav = {};
  sales.filter(valid).forEach(s => s.items.forEach(i => { fav[i.productId] = (fav[i.productId] || 0) + i.qty; }));
  const favs = Object.entries(fav).sort((a, b) => b[1] - a[1]).slice(0, 5);
  el.innerHTML = html`<a class="small" href="#/clientes">← Clientes</a>
    ${raw(pageHead(c.name, `RUT ${c.rut} · inscrito ${date(c.createdAt)}`, '<button class="btn" data-adjust>± Ajustar puntos</button><button class="btn" data-edit>Editar</button><button class="btn btn-ghost" data-del>Eliminar</button>'))}
    <div class="kpis">
      <div class="card stat"><span class="label">Nivel</span><span class="value">${tierOf(c)}</span>${next ? raw(html`<span class="small muted">Faltan ${next.min - c.pointsEarned} pts para ${next.name}</span><div class="progress" style="margin-top:6px"><i style="--v:${Math.min(100, c.pointsEarned / next.min * 100)}%"></i></div>`) : raw('<span class="small muted">Nivel máximo</span>')}</div>
      <div class="card stat"><span class="label">Puntos disponibles</span><span class="value">${c.points.toLocaleString('es-CL')}</span><span class="small muted">equivalen a ${money(c.points * (L.pointValue || 1))}</span></div>
      <div class="card stat"><span class="label">Visitas</span><span class="value">${c.visits}</span><span class="small muted">última ${c.lastVisit ? ago(c.lastVisit) : '—'}</span></div>
      <div class="card stat"><span class="label">Compras totales</span><span class="value">${money(c.totalSpent)}</span></div>
    </div>
    <div class="detail-grid">
      <div class="card"><div class="card-head"><h3>Compras recientes</h3><span class="small muted">detalle de los últimos ${settings().detailDays || 10} días</span></div>
        ${sales.length ? raw(html`<div class="table-wrap"><table class="table"><thead><tr><th>Boleta</th><th>Fecha</th><th>Sucursal</th><th>Puntos</th><th class="right">Total</th></tr></thead><tbody>${sales.slice(0, 15).map(s => raw(html`<tr><td><a href="#/caja?boleta=${s.number}">N° ${s.number}</a>${s.status === 'anulada' ? raw(' <span class="badge badge-danger">Anulada</span>') : ''}</td><td>${dateTime(s.createdAt)}</td><td>${branchName(s.branchId)}</td><td>+${s.pointsEarned || 0}${s.pointsUsed ? ` / −${s.pointsUsed}` : ''}</td><td class="right">${money(s.total)}</td></tr>`))}</tbody></table></div>`) : raw('<p class="muted">Sin compras en el periodo con detalle.</p>')}</div>
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Contacto</h3></div><dl class="kv"><dt>Correo</dt><dd>${c.email || '—'}</dd><dt>Teléfono</dt><dd>${c.phone || '—'}</dd><dt>Cumpleaños</dt><dd>${c.birthday || '—'}</dd><dt>Sucursal habitual</dt><dd>${c.favoriteBranch ? branchName(c.favoriteBranch) : '—'}</dd></dl></div>
        <div class="card"><div class="card-head"><h3>Lo que más compra</h3></div>${favs.length ? raw(`<ul class="list-plain">${favs.map(([pid, q]) => html`<li><span>${itemName({ productId: pid })}</span><b>${q} u.</b></li>`).join('')}</ul>`) : raw('<p class="muted small">Sin datos.</p>')}</div>
        ${(c.adjustments || []).length ? raw(html`<div class="card"><div class="card-head"><h3>Ajustes manuales</h3></div><ul class="list-plain">${c.adjustments.map(a => raw(html`<li><span>${a.note}<br><small class="muted">${a.by} · ${ago(a.at)}</small></span><b>${a.points > 0 ? '+' : ''}${a.points}</b></li>`))}</ul></div>`) : ''}
      </div>
    </div>`;
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-edit]')) customerForm(c);
    if (e.target.closest('[data-del]') && await confirm(`¿Eliminar a ${c.name} y sus ${c.points} puntos?`, { danger: true, ok: 'Eliminar' })) { db.remove('customers', id); log('cliente', `Eliminó a ${c.name}`); toast('Cliente eliminado', 'info'); location.hash = '#/clientes'; }
    if (e.target.closest('[data-adjust]')) {
      const v = await formModal({ title: `Ajustar puntos · ${c.name}`, fields: [{ name: 'points', label: 'Puntos (+ suma, − resta)', type: 'number', value: 500, required: true }, { name: 'note', label: 'Motivo', value: 'Compensación por reclamo', required: true }] });
      if (!v || !v.points) return;
      const pts = Math.round(v.points);
      if (c.points + pts < 0) return toast('El saldo no puede quedar negativo', 'warning');
      db.update('customers', id, x => ({ points: x.points + pts, pointsEarned: pts > 0 ? x.pointsEarned + pts : x.pointsEarned, adjustments: [{ points: pts, note: v.note, by: me().name, at: new Date().toISOString() }, ...(x.adjustments || [])] }));
      log('cliente', `Ajustó ${pts > 0 ? '+' : ''}${pts} puntos a ${c.name} (${v.note})`);
      toast('Puntos ajustados', 'success');
    }
  });
}
