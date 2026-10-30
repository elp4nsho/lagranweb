// Gestión de eventos: listado con filtros, aprobación, destacados, detalle, edición y cancelación.
import { db, notify } from '../data/db.js';
import { html, raw, $, money, num, toast, confirm, formModal, dataTable, lineChart, barChart, dateTime, escape } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV, daily, userChip, kpi } from '../shared/admin-kit.js';
import { badge, catName, fmtDay, fmtHour } from '../shared/format.js';
import { eventStats, venueOf, orgOf, refundOrder, tierPrice } from '../shared/inventory.js';
import { CATEGORIES, CITIES } from '../data/seed.js';
import { mountWizard, saveEvent } from '../shared/event-wizard.js';

const STATUSES = ['pendiente', 'publicado', 'borrador', 'rechazado', 'cancelado', 'finalizado'];

export function setStatus(ev, status, user, extra = {}) {
  db.update('events', ev.id, { status, ...extra });
  db.log('estado evento', `${ev.title}: ${ev.status} → ${status}${extra.rejectReason ? ' (' + extra.rejectReason + ')' : ''}`, user.id);
  const prod = db.find('users', u => u.organizerId === ev.organizerId && u.role === 'productor');
  const msg = { publicado: `Tu evento "${ev.title}" fue aprobado y ya está a la venta.`, rechazado: `Tu evento "${ev.title}" fue rechazado: ${extra.rejectReason || ''}`, cancelado: `El evento "${ev.title}" fue cancelado.` }[status];
  if (prod && msg) notify(prod.id, msg);
}

export async function reject(ev, user) {
  const r = await formModal({ title: `Rechazar "${ev.title}"`, submit: 'Rechazar', fields: [{ name: 'reason', label: 'Motivo (se envía a la productora)', type: 'textarea', required: true, value: 'Falta información del recinto o permisos municipales.' }] });
  if (!r) return;
  setStatus(ev, 'rechazado', user, { rejectReason: r.reason }); toast('Evento rechazado', 'warning');
}
export async function cancelEvent(ev, user) {
  const orders = db.query('orders', o => o.eventId === ev.id && o.status === 'pagada');
  if (!await confirm(`Se cancelará "${ev.title}" y se reembolsarán automáticamente ${orders.length} pedidos (${money(orders.reduce((s, o) => s + o.total, 0))}).`, { title: 'Cancelar evento', ok: 'Cancelar y reembolsar', danger: true })) return;
  orders.forEach(o => refundOrder(o, user, 'Evento cancelado'));
  setStatus(ev, 'cancelado', user); toast('Evento cancelado y pedidos reembolsados', 'success');
}

export function render(el, { user, isAdmin, query }) {
  const st = { status: query.status || '', cat: '', city: '' };
  el.innerHTML = html`${raw(pageHead('Eventos', 'Aprueba, destaca y administra todos los eventos de la plataforma', csvButton()))}
    <div class="toolbar">
      <div class="row" style="gap:6px" id="schips"><button class="chip ${st.status ? '' : 'active'}" data-s="">Todos</button>${STATUSES.map(s => raw(`<button class="chip ${st.status === s ? 'active' : ''}" data-s="${s}">${s[0].toUpperCase() + s.slice(1)} (${db.count('events', e => e.status === s)})</button>`))}</div>
      <select class="select" id="fcat" aria-label="Categoría"><option value="">Todas las categorías</option>${Object.entries(CATEGORIES).map(([k, l]) => raw(`<option value="${k}">${l}</option>`))}</select>
      <select class="select" id="fcity" aria-label="Ciudad"><option value="">Todas las ciudades</option>${CITIES.map(c => raw(`<option>${c}</option>`))}</select>
    </div>
    <div id="tbl"></div>`;
  const rows = () => db.query('events', e => (!st.status || e.status === st.status) && (!st.cat || e.category === st.cat) && (!st.city || e.city === st.city)).map(e => {
    const s = eventStats(e);
    return { ...e, org: orgOf(e)?.name || '—', venue: venueOf(e)?.name || '—', sold: s.sold, pct: s.pct, revenue: s.revenue };
  });
  const table = dataTable($('#tbl'), {
    rows: rows(), pageSize: 10, search: r => `${r.title} ${r.org} ${r.venue} ${r.city}`,
    onRow: r => (location.hash = `#/eventos/${r.id}`),
    columns: [
      { key: 'title', label: 'Evento', render: r => html`<b>${r.title}</b>${r.featured ? raw(' ⭐') : ''}<br><small class="muted">${catName(r.category)} · ${r.org}</small>` },
      { key: 'date', label: 'Fecha', render: r => `${fmtDay(r.date)}<br><small class="muted">${fmtHour(r.date)} · ${escape(r.city)}</small>` },
      { key: 'status', label: 'Estado', render: r => badge(r.status) },
      { key: 'pct', label: 'Vendido', render: r => `<div class="progress" style="width:90px"><i style="--v:${Math.min(100, r.pct)}%"></i></div><small class="muted">${num(r.sold)} · ${Math.round(r.pct)}%</small>` },
      { key: 'revenue', label: 'Recaudación', render: r => money(r.revenue) },
      { key: 'id', label: '', sort: false, render: r => !isAdmin ? '' : r.status === 'pendiente' ? `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-primary" data-approve="${r.id}">Aprobar</button><button class="btn btn-sm btn-ghost" data-reject="${r.id}">Rechazar</button></span>` : r.status === 'publicado' ? `<button class="btn btn-sm btn-ghost" data-feat="${r.id}" title="Destacar en portada">${r.featured ? '★ Quitar' : '☆ Destacar'}</button>` : '' }
    ]
  });
  const refresh = () => table.update(rows());
  el.querySelector('#schips').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; st.status = b.dataset.s; el.querySelectorAll('#schips .chip').forEach(c => c.classList.toggle('active', c === b)); refresh(); });
  $('#fcat').onchange = e => { st.cat = e.target.value; refresh(); };
  $('#fcity').onchange = e => { st.city = e.target.value; refresh(); };
  el.addEventListener('click', e => {
    const a = e.target.closest('[data-approve]'), rj = e.target.closest('[data-reject]'), f = e.target.closest('[data-feat]');
    if (a) { setStatus(db.get('events', a.dataset.approve), 'publicado', user); toast('Evento aprobado y publicado', 'success'); }
    if (rj) reject(db.get('events', rj.dataset.reject), user);
    if (f) { const ev = db.get('events', f.dataset.feat); db.update('events', ev.id, { featured: !ev.featured }); db.log('destacado', `${ev.title}: ${ev.featured ? 'quitado de' : 'agregado a'} destacados`, user.id); toast(ev.featured ? 'Quitado de destacados' : 'Destacado en la portada', 'success'); }
  });
  wireCSV(el, 'eventos.csv', () => rows().map(r => ({ id: r.id, evento: r.title, categoria: r.category, productora: r.org, recinto: r.venue, ciudad: r.city, fecha: r.date, estado: r.status, vendidas: r.sold, recaudacion: r.revenue })));
  return { update: refresh };
}

export function detail(el, { user, isAdmin, params }) {
  const ev = db.get('events', params.id);
  if (!ev) { el.innerHTML = '<div class="empty">Evento no encontrado. <a href="#/eventos">Volver</a></div>'; return; }
  const s = eventStats(ev), v = venueOf(ev), org = orgOf(ev);
  const orders = db.query('orders', o => o.eventId === ev.id);
  const paid = orders.filter(o => o.status !== 'reembolsada');
  const tickets = db.query('tickets', t => t.eventId === ev.id && t.status !== 'anulado');
  const waits = db.query('waitlist', w => w.eventId === ev.id);
  const days = Math.min(45, Math.max(14, Math.ceil((Date.now() - Date.parse(ev.salesStart || ev.createdAt)) / 864e5)));
  const actions = !isAdmin ? '' : [
    ev.status === 'pendiente' ? '<button class="btn btn-primary" data-act="approve">✓ Aprobar</button><button class="btn" data-act="reject">Rechazar</button>' : '',
    ev.status === 'rechazado' || ev.status === 'borrador' ? '<button class="btn btn-primary" data-act="approve">Publicar</button>' : '',
    ev.status === 'publicado' ? `<button class="btn" data-act="feat">${ev.featured ? '★ Quitar destacado' : '☆ Destacar'}</button><button class="btn" data-act="pause">Pausar venta</button>` : '',
    ['publicado', 'pendiente'].includes(ev.status) ? '<button class="btn btn-danger" data-act="cancel">Cancelar evento</button>' : '',
    `<a class="btn" href="#/eventos/${ev.id}/editar">✎ Editar</a>`,
    !tickets.length ? '<button class="btn btn-ghost" data-act="delete">Eliminar</button>' : ''
  ].join('');
  el.innerHTML = html`<a href="#/eventos" class="small">← Eventos</a>
    ${raw(pageHead(ev.title, `${catName(ev.category)} · ${fmtDay(ev.date)} ${fmtHour(ev.date)} · ${v?.name}, ${ev.city} · ${org?.name}`, `<a class="btn" href="index.html#/evento/${ev.id}" target="_blank">Ver en el sitio ↗</a>${actions}`))}
    <div class="row" style="gap:8px">${raw(badge(ev.status))}${ev.featured ? raw('<span class="badge badge-primary">Destacado</span>') : ''}${ev.rejectReason && ev.status === 'rechazado' ? raw(`<span class="muted small">Motivo: ${escape(ev.rejectReason)}</span>`) : ''}</div>
    <div class="kpis">${raw(kpi('Entradas vendidas', `${num(s.sold)} / ${num(s.capacity)}`))}${raw(kpi('Recaudación (precio entradas)', money(s.revenue)))}${raw(kpi('Cargos por servicio', money(paid.reduce((a, o) => a + o.fees, 0))))}${raw(kpi('Ingresados', `${num(s.used)} (${s.sold ? Math.round(s.used / s.sold * 100) : 0}%)`))}</div>
    <div class="grid-2">
      <div class="card chart-card"><h3>Ventas diarias</h3>${raw(lineChart(daily(tickets, { days }).map((d, i) => ({ ...d, label: i % 4 === 0 ? d.label : '' })), { format: v => `${v} entradas` }))}</div>
      <div class="card chart-card"><h3>Vendidas por tipo</h3>${raw(barChart(s.byTier.map(b => ({ label: b.tier.name.slice(0, 12), value: b.sold })), { format: v => `${v} entradas` }))}</div>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th><th>Precio actual</th><th>Vendidas</th><th>Capacidad</th><th>Recaudación</th></tr></thead><tbody>
      ${s.byTier.map(b => raw(html`<tr><td>${b.tier.name}</td><td>${money(tierPrice(b.tier))}${b.tier.ebPrice ? raw(` <small class="muted">(normal ${money(b.tier.price)})</small>`) : ''}</td><td>${num(b.sold)}</td><td>${num(b.capacity)}</td><td>${money(b.revenue)}</td></tr>`))}</tbody></table></div>
    <div class="grid-2">
      <div class="card"><h3>Últimos pedidos</h3><ul class="mini-list">${orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(o => raw(html`<li><span><b>${o.number}</b> · ${db.get('users', o.buyerId)?.name}<br><small class="muted">${dateTime(o.createdAt)}</small></span>${raw(badge(o.status))}<b>${money(o.total)}</b></li>`))}</ul><a class="btn btn-sm btn-ghost" href="#/pedidos?q=${encodeURIComponent(ev.title)}">Ver todos los pedidos</a></div>
      <div class="card"><h3>Lista de espera (${waits.length})</h3>${waits.length ? raw(`<ul class="mini-list">${waits.map(w => `<li>${userChip(db.get('users', w.userId))}<span>${w.qty} ent.</span>${badge(w.status)}</li>`).join('')}</ul>`) : raw('<div class="empty" style="padding:20px">Nadie en espera</div>')}</div>
    </div>`;
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
    const a = b.dataset.act;
    if (a === 'approve') { setStatus(ev, 'publicado', user); toast('Evento publicado', 'success'); }
    if (a === 'reject') reject(ev, user);
    if (a === 'pause') { setStatus(ev, 'borrador', user); toast('Venta pausada (evento en borrador)', 'warning'); }
    if (a === 'feat') { db.update('events', ev.id, { featured: !ev.featured }); toast('Actualizado', 'success'); }
    if (a === 'cancel') cancelEvent(ev, user);
    if (a === 'delete' && await confirm(`¿Eliminar "${ev.title}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('events', ev.id); db.log('evento eliminado', ev.title, user.id); toast('Evento eliminado'); location.hash = '#/eventos'; }
  });
}

export function edit(el, { user, params, isAdmin }) {
  const ev = db.get('events', params.id);
  if (!ev || !isAdmin) { el.innerHTML = '<div class="empty">No disponible</div>'; return; }
  el.innerHTML = `<a href="#/eventos/${ev.id}" class="small">← Volver al detalle</a>${pageHead('Editar evento', ev.title)}<div id="wiz"></div>`;
  mountWizard($('#wiz'), { event: ev, organizerId: ev.organizerId, admin: true,
    onCancel: () => (location.hash = `#/eventos/${ev.id}`),
    onSave: (d, promos, submit) => { saveEvent(d, promos, { status: submit ? 'publicado' : 'borrador', user }); toast('Evento guardado', 'success'); location.hash = `#/eventos/${ev.id}`; } });
  return { static: true };
}
