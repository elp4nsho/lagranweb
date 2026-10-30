// Pedidos y reembolsos: búsqueda (incluye código de entrada), filtros, detalle y flujo de reembolso.
import { db } from '../data/db.js';
import { html, raw, $, money, toast, confirm, formModal, dataTable, modal, dateTime, escape } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV, kpi } from '../shared/admin-kit.js';
import { badge } from '../shared/format.js';
import { refundOrder, venueOf } from '../shared/inventory.js';
import { seatInfo } from '../shared/venue.js';

export function render(el, { user, query }) {
  const st = { status: query.status || '', channel: '', event: '' };
  const evs = db.all('events').sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = html`${raw(pageHead('Pedidos y reembolsos', 'Todas las compras de la plataforma', csvButton()))}
    <div class="kpis" id="okpi"></div>
    <div class="toolbar">
      <select class="select" id="fst" aria-label="Estado"><option value="">Todos los estados</option><option value="pagada">Pagada</option><option value="reembolso_solicitado">Reembolso solicitado</option><option value="reembolsada">Reembolsada</option></select>
      <select class="select" id="fch" aria-label="Canal"><option value="">Todos los canales</option><option value="web">Venta web</option><option value="reventa">Reventa</option></select>
      <select class="select" id="fev" aria-label="Evento" style="max-width:280px"><option value="">Todos los eventos</option>${evs.map(e => raw(html`<option value="${e.id}">${e.title}</option>`))}</select>
    </div><div id="tbl"></div>`;
  $('#fst').value = st.status;
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u])), events = Object.fromEntries(evs.map(e => [e.id, e]));
  const rows = () => { const tm = Object.fromEntries(db.all('tickets').map(t => [t.id, t])); return db.query('orders', o => (!st.status || o.status === st.status) && (!st.channel || o.channel === st.channel) && (!st.event || o.eventId === st.event)).map(o => ({
    ...o, buyer: users[o.buyerId]?.name || '—', email: users[o.buyerId]?.email || '', event: events[o.eventId]?.title || '—', n: o.tickets.length,
    codes: o.tickets.map(id => tm[id]?.code).join(' ')
  })); };
  const drawKpi = () => {
    const all = db.all('orders');
    $('#okpi').innerHTML = kpi('Pedidos', all.length.toLocaleString('es-CL')) + kpi('Ticket promedio', money(all.reduce((s, o) => s + o.total, 0) / (all.length || 1))) + kpi('Reembolsos pendientes', String(all.filter(o => o.status === 'reembolso_solicitado').length)) + kpi('Reembolsado total', money(all.filter(o => o.status === 'reembolsada').reduce((s, o) => s + o.total, 0)));
  };
  drawKpi();
  const t = dataTable($('#tbl', el), {
    rows: rows().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), pageSize: 12, search: r => `${r.number} ${r.buyer} ${r.email} ${r.event} ${r.codes}`, onRow: r => show(r.id),
    columns: [
      { key: 'number', label: 'Pedido', render: r => `<b>${r.number}</b><br><small class="muted">${dateTime(r.createdAt)}</small>` },
      { key: 'buyer', label: 'Comprador', render: r => `${escape(r.buyer)}<br><small class="muted">${escape(r.email)}</small>` },
      { key: 'event', label: 'Evento' },
      { key: 'n', label: 'Entradas' },
      { key: 'total', label: 'Total', render: r => `<b>${money(r.total)}</b>${r.discount ? `<br><small class="muted">desc. ${money(r.discount)}</small>` : ''}` },
      { key: 'channel', label: 'Canal', render: r => `<span class="badge plain">${r.channel}</span>` },
      { key: 'status', label: 'Estado', render: r => badge(r.status) },
      { key: 'id', label: '', sort: false, render: r => (r.status === 'reembolso_solicitado' ? `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-primary" data-ok="${r.id}">Aprobar</button><button class="btn btn-sm btn-ghost" data-no="${r.id}">Rechazar</button></span>` : r.status === 'pagada' ? `<button class="btn btn-sm btn-ghost" data-refund="${r.id}">Reembolsar</button>` : '') }
    ]
  });
  if (query.q) { const i = el.querySelector('[data-q]'); i.value = query.q; i.dispatchEvent(new Event('input')); }
  const refresh = () => { t.update(rows().sort((a, b) => b.createdAt.localeCompare(a.createdAt))); drawKpi(); };
  $('#fst').onchange = e => { st.status = e.target.value; refresh(); };
  $('#fch').onchange = e => { st.channel = e.target.value; refresh(); };
  $('#fev').onchange = e => { st.event = e.target.value; refresh(); };

  function show(id) {
    const o = db.get('orders', id), ev = events[o.eventId], v = venueOf(ev), u = users[o.buyerId];
    const tk = o.tickets.map(x => db.get('tickets', x)).filter(Boolean);
    const m = modal({ title: `Pedido ${o.number}`, size: 'lg', body: `<div class="stack">
      <div class="detail-grid"><div><small>Estado</small>${badge(o.status)}</div><div><small>Fecha</small>${dateTime(o.createdAt)}</div><div><small>Comprador</small>${escape(u?.name)}<br><small>${escape(u?.email)}</small></div><div><small>Evento</small>${escape(ev?.title)}</div><div><small>Pago</small>${o.payment?.brand} ${o.payment?.last4 !== '0000' ? '•••• ' + o.payment?.last4 : ''}</div><div><small>Canal</small>${o.channel}${o.promo ? ' · ' + o.promo : ''}</div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Tipo</th><th>Ubicación</th><th>Precio</th><th>Estado</th></tr></thead><tbody>${tk.map(t => `<tr><td class="mono">${t.code}</td><td>${escape(ev.tiers.find(x => x.id === t.tierId)?.name)}</td><td>${t.seat ? escape(seatInfo(v, t.seat)?.label || t.seat) : 'General'}</td><td>${money(t.price)}</td><td>${badge(t.status)}${t.ownerId !== o.buyerId ? `<br><small class="muted">Titular: ${escape(users[t.ownerId]?.name)}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>
      <div style="max-width:320px;margin-left:auto;width:100%" class="stack"><div class="sum-row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>${o.discount ? `<div class="sum-row"><span>Descuento</span><span>−${money(o.discount)}</span></div>` : ''}<div class="sum-row"><span>Cargos</span><span>${money(o.fees)}</span></div><div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div></div>
      ${o.refundReason ? `<p class="muted small">Motivo del reembolso: ${escape(o.refundReason)}</p>` : ''}</div>`,
      foot: `<button class="btn btn-ghost" data-close>Cerrar</button>${o.status === 'pagada' || o.status === 'reembolso_solicitado' ? `<button class="btn btn-danger" id="mref">Reembolsar ${money(o.total)}</button>` : ''}` });
    m.el.querySelector('#mref')?.addEventListener('click', () => { m.close(); doRefund(o); });
  }
  async function doRefund(o) {
    const r = await formModal({ title: `Reembolsar ${o.number}`, submit: 'Reembolsar', fields: [{ name: 'reason', label: 'Motivo', type: 'select', options: ['Solicitud del cliente', 'Evento reprogramado', 'Cobro duplicado', 'Evento cancelado', 'Otro'] }] });
    if (!r) return;
    refundOrder(db.get('orders', o.id), user, r.reason); toast(`Pedido ${o.number} reembolsado`, 'success');
  }
  el.addEventListener('click', async e => {
    const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]'), rf = e.target.closest('[data-refund]');
    if (ok) { refundOrder(db.get('orders', ok.dataset.ok), user, 'Solicitud del cliente aprobada'); toast('Reembolso aprobado', 'success'); }
    if (no && await confirm('¿Rechazar la solicitud de reembolso? El pedido vuelve a estado pagado.', { ok: 'Rechazar' })) { const o = db.update('orders', no.dataset.no, { status: 'pagada' }); db.log('reembolso rechazado', o.number, user.id); toast('Solicitud rechazada'); }
    if (rf) doRefund(db.get('orders', rf.dataset.refund));
  });
  wireCSV(el, 'pedidos.csv', () => rows().map(r => ({ pedido: r.number, fecha: r.createdAt, comprador: r.buyer, correo: r.email, evento: r.event, entradas: r.n, subtotal: r.subtotal, descuento: r.discount, cargos: r.fees, total: r.total, canal: r.channel, estado: r.status })));
  return { update: refresh };
}
