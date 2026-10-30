// Mis entradas: wallet, transferencia, reventa, reembolsos y vista de entrada con QR.
import { db, auth, fees } from '../data/db.js';
import { html, raw, $, money, toast, modal, confirm, formModal, dateTime } from '../../../assets/core/ui.js';
import { poster, qr } from '../shared/art.js';
import { badge, fmtDay, fmtHour, fmtLong } from '../shared/format.js';
import { venueOf, isPast, transferTicket, listResale, cancelResale } from '../shared/inventory.js';
import { seatInfo } from '../shared/venue.js';

const seatText = (t, v) => { if (!t.seat) return { sec: 'General', row: '—', num: '—' }; const i = seatInfo(v, t.seat); return { sec: i?.section.name || '—', row: i?.row || '—', num: i?.num || '—' }; };

function ticketCard(t) {
  const ev = db.get('events', t.eventId), v = venueOf(ev), tier = ev.tiers.find(x => x.id === t.tierId), s = seatText(t, v);
  const past = isPast(ev);
  const can = !past && (t.status === 'valido' || t.status === 'reventa');
  return html`<article class="ticket ${past || t.status === 'anulado' ? 'dim' : ''}" data-anim>
    <div class="top">${raw(poster(ev))}${raw(badge(t.status))}</div>
    <div class="info"><span class="eyebrow">${tier?.name}</span><h3>${ev.title}</h3><small class="muted">${fmtDay(ev.date)} · ${fmtHour(ev.date)} hrs · ${v.name}</small></div>
    <div class="cut"></div>
    <div class="kv"><div><small>Sector</small><b>${s.sec}</b></div><div><small>Fila</small><b>${s.row}</b></div><div><small>Asiento</small><b>${s.num}</b></div></div>
    ${t.status === 'reventa' ? raw(`<div class="small" style="padding:0 16px 10px;color:var(--warning)">Publicada en reventa a ${money(t.resalePrice)}</div>`) : ''}
    <div class="actions">
      ${t.status !== 'anulado' ? raw(`<a class="btn btn-sm btn-primary" href="#/entrada/${t.id}">Ver entrada</a>`) : ''}
      ${can && t.status === 'valido' ? raw(`<button class="btn btn-sm" data-transfer="${t.id}">Transferir</button><button class="btn btn-sm" data-resell="${t.id}">Revender</button>`) : ''}
      ${t.status === 'reventa' && !past ? raw(`<button class="btn btn-sm" data-unresell="${t.id}">Quitar de reventa</button>`) : ''}
    </div></article>`;
}

export function renderMyTickets(app) {
  const u = auth.current();
  const tab = sessionStorage.getItem('vlc:ttab') || 'proximas';
  const mine = db.query('tickets', t => t.ownerId === u.id).map(t => ({ t, ev: db.get('events', t.eventId) })).filter(x => x.ev).sort((a, b) => a.ev.date.localeCompare(b.ev.date));
  const next = mine.filter(x => !isPast(x.ev) && x.t.status !== 'anulado'), past = mine.filter(x => isPast(x.ev) || x.t.status === 'anulado').reverse();
  const orders = db.query('orders', o => o.buyerId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const waits = db.query('waitlist', w => w.userId === u.id);
  app.innerHTML = html`<section class="section" style="padding-top:28px"><div class="container stack">
    <div class="row between"><div><span class="eyebrow">Hola, ${u.name.split(' ')[0]}</span><h1 style="margin:0">Mis entradas</h1></div><a class="btn" href="#/explorar">Buscar más eventos</a></div>
    <div class="tabs" role="tablist">
      <button class="tab ${tab === 'proximas' ? 'active' : ''}" data-tab="proximas">Próximas (${next.length})</button>
      <button class="tab ${tab === 'pasadas' ? 'active' : ''}" data-tab="pasadas">Pasadas (${past.length})</button>
      <button class="tab ${tab === 'pedidos' ? 'active' : ''}" data-tab="pedidos">Pedidos (${orders.length})</button>
      <button class="tab ${tab === 'espera' ? 'active' : ''}" data-tab="espera">Lista de espera (${waits.length})</button>
    </div>
    <div id="tabbody">
    ${tab === 'proximas' ? raw(next.length ? `<div class="wallet-grid">${next.map(x => ticketCard(x.t)).join('')}</div>` : '<div class="empty"><span class="icon">🎟️</span>Aún no tienes entradas para próximos eventos.<br><a class="btn btn-primary" style="margin-top:12px" href="#/explorar">Explorar eventos</a></div>') : ''}
    ${tab === 'pasadas' ? raw(past.length ? `<div class="wallet-grid">${past.map(x => ticketCard(x.t)).join('')}</div>` : '<div class="empty">Sin historial todavía.</div>') : ''}
    ${tab === 'pedidos' ? raw(orders.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Evento</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>
      ${orders.map(o => { const ev = db.get('events', o.eventId); const days = (Date.parse(ev.date) - Date.now()) / 864e5; const canRefund = o.status === 'pagada' && days > (fees().refundWindowDays || 7) && o.channel !== 'reventa';
        return raw(html`<tr><td><b>${o.number}</b><br><small class="muted">${o.tickets.length} entrada(s) · ${o.payment?.brand} ${o.payment?.last4 && o.payment.last4 !== '0000' ? '•••• ' + o.payment.last4 : ''}</small></td><td>${ev.title}</td><td>${dateTime(o.createdAt)}</td><td>${money(o.total)}</td><td>${raw(badge(o.status))}</td><td>${canRefund ? raw(`<button class="btn btn-sm btn-ghost" data-refund="${o.id}">Solicitar reembolso</button>`) : ''}</td></tr>`); })}
      </tbody></table></div>` : '<div class="empty">Sin pedidos.</div>') : ''}
    ${tab === 'espera' ? raw(waits.length ? `<div class="stack">${waits.map(w => { const ev = db.get('events', w.eventId); return `<div class="card row between"><div><b>${ev?.title}</b><br><small class="muted">${w.qty} entrada(s) · ${fmtDay(ev?.date)}</small></div>${badge(w.status)}<a class="btn btn-sm" href="#/evento/${w.eventId}">Ver evento</a></div>`; }).join('')}</div>` : '<div class="empty">No estás en ninguna lista de espera.</div>') : ''}
    </div></div></section>`;

  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { sessionStorage.setItem('vlc:ttab', b.dataset.tab); renderMyTickets(app); });
  app.querySelectorAll('[data-transfer]').forEach(b => b.onclick = async () => {
    const t = db.get('tickets', b.dataset.transfer);
    const r = await formModal({ title: 'Transferir entrada', submit: 'Transferir', fields: [{ name: 'email', label: 'Correo de la persona (debe tener cuenta)', type: 'email', required: true, placeholder: 'tomas@correo.cl', help: 'La entrada se reemite con un código nuevo y la tuya deja de ser válida.' }] });
    if (!r) return;
    try { const to = transferTicket(t, r.email, u); toast(`Entrada transferida a ${to.name}`, 'success'); } catch (err) { toast(err.message, 'error'); }
  });
  app.querySelectorAll('[data-resell]').forEach(b => b.onclick = async () => {
    const t = db.get('tickets', b.dataset.resell), cap = Math.round(t.price * (1 + (fees().resaleCapPct || 10) / 100));
    const r = await formModal({ title: 'Publicar en reventa oficial', submit: 'Publicar', fields: [{ name: 'price', label: `Precio de venta (máximo ${money(cap)})`, type: 'number', value: t.price, required: true, help: `Precio original ${money(t.price)}. Recibirás el monto menos 5% de comisión cuando se venda.` }] });
    if (!r) return;
    if (!(r.price > 0) || r.price > cap) return toast(`El precio debe estar entre $1 y ${money(cap)}`, 'error');
    listResale(t, r.price, u); toast('Entrada publicada en reventa', 'success');
  });
  app.querySelectorAll('[data-unresell]').forEach(b => b.onclick = () => { cancelResale(db.get('tickets', b.dataset.unresell)); toast('Entrada retirada de la reventa'); });
  app.querySelectorAll('[data-refund]').forEach(b => b.onclick = async () => {
    const o = db.get('orders', b.dataset.refund);
    if (!await confirm(`¿Solicitar el reembolso del pedido ${o.number} por ${money(o.total)}? El equipo de soporte lo revisará.`, { ok: 'Solicitar' })) return;
    db.update('orders', o.id, { status: 'reembolso_solicitado', refundRequestedAt: new Date().toISOString() });
    db.log('reembolso', `${u.name} solicitó reembolso del pedido ${o.number}`, u.id);
    toast('Solicitud enviada', 'success');
  });
}

export function renderPass(app, id) {
  const u = auth.current(), t = db.get('tickets', id);
  if (!t || (t.ownerId !== u.id && u.role !== 'admin')) { app.innerHTML = '<section class="section"><div class="container empty"><h2>Entrada no encontrada</h2><p>Puede que la hayas transferido o vendido.</p><a class="btn btn-primary" href="#/mis-entradas">Mis entradas</a></div></section>'; return; }
  const ev = db.get('events', t.eventId), v = venueOf(ev), tier = ev.tiers.find(x => x.id === t.tierId), s = seatText(t, v);
  const order = db.get('orders', t.orderId);
  const siblings = (order?.tickets || []).filter(x => db.get('tickets', x)?.ownerId === t.ownerId);
  const i = siblings.indexOf(t.id);
  app.innerHTML = html`<section class="section" style="padding-top:24px"><div class="container stack">
    <a class="small" href="#/mis-entradas">← Mis entradas</a>
    <article class="ticket wallet-pass" data-anim>
      <div class="top" style="height:140px">${raw(poster(ev))}${raw(badge(t.status))}</div>
      <div class="info"><span class="eyebrow">${tier?.name}</span><h3 style="font-size:20px">${ev.title}</h3><small class="muted">${fmtLong(ev.date)} · ${fmtHour(ev.date)} hrs</small><small class="muted">${v.name} · ${v.address}</small></div>
      <div class="kv"><div><small>Sector</small><b>${s.sec}</b></div><div><small>Fila</small><b>${s.row}</b></div><div><small>Asiento</small><b>${s.num}</b></div></div>
      <div class="cut"></div>
      <div class="qrbox">${t.status === 'valido' || t.status === 'reventa' ? raw(qr(t.code)) : raw(`<div class="empty" style="padding:20px">${t.status === 'usado' ? '✅ Entrada utilizada ' + (t.scannedAt ? dateTime(t.scannedAt) : '') : 'Entrada no válida'}</div>`)}
        <span class="code">${t.code}</span>${t.status === 'valido' ? raw('<div class="pulse-line" style="width:100%" aria-hidden="true"></div>') : ''}
        <small class="muted">Titular: ${u.id === t.ownerId ? u.name : db.get('users', t.ownerId)?.name} · Sube el brillo de tu pantalla</small></div>
      <div class="actions" style="justify-content:center">
        <button class="btn btn-sm" id="wallet">📲 Agregar a Wallet</button><button class="btn btn-sm" id="share">Copiar código</button>
      </div>
    </article>
    ${siblings.length > 1 ? raw(`<div class="row" style="justify-content:center">${i > 0 ? `<a class="btn btn-sm" href="#/entrada/${siblings[i - 1]}">← Anterior</a>` : ''}<span class="muted small">Entrada ${i + 1} de ${siblings.length}</span>${i < siblings.length - 1 ? `<a class="btn btn-sm" href="#/entrada/${siblings[i + 1]}">Siguiente →</a>` : ''}</div>`) : ''}
  </div></section>`;
  $('#wallet').onclick = () => toast('Pase agregado a tu billetera digital (simulado)', 'success');
  $('#share').onclick = () => { navigator.clipboard?.writeText(t.code).catch(() => {}); modal({ title: 'Código de la entrada', body: `<p>Úsalo en la app de acceso para probar el escaneo:</p><p class="mono" style="font-size:22px;text-align:center"><b>${t.code}</b></p>` }); };
}
