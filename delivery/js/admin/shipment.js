// Detalle de envío para la consola (modal en vivo), asignación manual y alta de envíos.
import { db } from '../data/db.js';
import { html, raw, money, modal, toast, confirm, formModal, dateTime, time, escape } from '../../../assets/core/ui.js';
import { haversine } from '../data/geo.js';
import { createMap } from '../shared/map.js';
import { shipmentLines, courierPos, hasLeg, ACTIVE_ST, fmtEta } from '../shared/sim.js';
import { STATUS, VEHICLES, VEHICLE_ICON, SERVICE_LABEL } from '../shared/status.js';
import { statusBadge, timelineHtml, podHtml, detailsHtml, courierCard, progressHtml, etaText, stars, avatar } from '../shared/views.js';
import { shipmentFormHtml, wireShipmentForm } from '../public/request.js';
import * as ops from '../shared/ops.js';

export function rankCouriers(s) {
  const ships = ops.activeShipments();
  return db.query('couriers', c => c.status === 'activo').map(c => {
    const pos = courierPos(c, ships, ops.simNow());
    const load = ops.courierQueue(c.id).filter(x => x.id !== s.id).length;
    const dist = s.pickup ? haversine(pos, s.pickup) : 0;
    const fit = s.size !== 'XL' || ['furgon', 'auto'].includes(c.vehicle);
    return { c, pos, load, dist, fit, score: (c.online ? 0 : 100) + load * 6 + dist + (fit ? 0 : 50) };
  }).sort((a, b) => a.score - b.score);
}

export function openAssign(s, ctx) {
  const list = rankCouriers(s);
  const m = modal({ title: `Asignar ${s.code}`, size: 'lg', body: html`<p class="muted">Retiro en <b>${s.sender.comuna}</b> → ${s.receiver.comuna} · ${ops.pricing().sizes[s.size]?.name}. Ordenado por cercanía y carga.</p>
    <div class="table-wrap"><table class="table"><thead><tr><th>Repartidor</th><th>Estado</th><th class="num">Distancia</th><th class="num">Carga</th><th></th></tr></thead><tbody>
    ${list.map((x, i) => raw(html`<tr><td><span class="row" style="gap:10px;flex-wrap:nowrap">${avatar(x.c.name, x.c.color, 30)}<span><b>${x.c.name}</b>${i === 0 && x.c.online ? raw(' <span class="badge badge-success">Sugerido</span>') : ''}<br><small class="muted">${VEHICLE_ICON[x.c.vehicle]} ${VEHICLES[x.c.vehicle]} · ${String(x.c.rating).replace('.', ',')}★</small></span></span></td>
      <td>${x.c.online ? (x.load ? raw('<span class="badge badge-info">Ocupado</span>') : raw('<span class="badge badge-success">Libre</span>')) : raw('<span class="badge">Desconectado</span>')}${x.fit ? '' : raw(' <span class="badge badge-warning">No apto XL</span>')}</td>
      <td class="num">${x.dist.toFixed(1).replace('.', ',')} km</td><td class="num">${x.load}</td>
      <td><button class="btn btn-sm ${i === 0 ? 'btn-primary' : ''}" data-c="${x.c.id}" ${x.c.online ? '' : 'disabled'}>Asignar</button></td></tr>`))}
    </tbody></table></div>` });
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const cur = db.get('shipments', s.id), c = db.get('couriers', b.dataset.c);
    ops.assign(cur, c.id, { by: ctx.user.id, note: `Asignado manualmente a ${c.name}` });
    db.log('asignación', `${cur.code} → ${c.name}`, ctx.user.id);
    ops.feed(`${cur.code} asignado a ${c.name} por despacho`, 'info', cur.id);
    toast(`${cur.code} asignado a ${c.name}`, 'success');
    m.close();
  });
}

export async function newShipmentModal(ctx, customerId = null) {
  const custs = db.query('customers', c => c.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const P = ops.pricing();
  const m = modal({ title: 'Nuevo envío (consola)', size: 'lg', body: html`<form class="stack" novalidate data-f>
    <div class="field"><label for="ns-c">Cliente</label><select class="select" id="ns-c" name="customer"><option value="">Cliente ocasional (sin cuenta)</option>${custs.map(c => raw(html`<option value="${c.id}" ${c.id === customerId ? 'selected' : ''}>${c.name} · ${c.type}</option>`))}</select></div>
    <div data-form></div><div class="notice" data-q></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Crear envío</button>' });
  const form = m.el.querySelector('[data-f]');
  let fw;
  const build = () => {
    const cid = form.elements.customer.value;
    const addresses = cid ? db.query('addresses', a => a.customerId === cid) : [];
    m.el.querySelector('[data-form]').innerHTML = shipmentFormHtml(P, {}, { addresses, prefix: 'ns' });
    fw = wireShipmentForm(form, addresses, quote);
    quote();
  };
  const quote = () => {
    if (!fw) return;
    const d = fw.read(), c = db.get('customers', form.elements.customer.value);
    const q = ops.quoteFor(d.sender.comuna, d.receiver.comuna, d.size, d.service, { business: c?.type === 'empresa' });
    m.el.querySelector('[data-q]').innerHTML = q ? html`Precio: <b>${money(q.price)}</b> · ${String(q.km).replace('.', ',')} km · ${P.zones[q.zone].name}` : 'Sin cobertura';
  };
  form.elements.customer.addEventListener('change', e => { e.stopPropagation(); build(); });
  build();
  m.el.querySelector('[data-ok]').onclick = () => {
    if (!fw.validate()) return;
    const c = db.get('customers', form.elements.customer.value);
    try {
      const s = ops.createShipment({ ...fw.read(), customerId: c?.id || null, channel: 'consola' }, { by: ctx.user.id, business: c?.type === 'empresa', paid: c?.type === 'empresa' ? false : true });
      db.log('envío creado', `${s.code} creado desde la consola`, ctx.user.id);
      ops.feed(`Nuevo envío ${s.code} (consola)`, 'info', s.id);
      toast(`Envío ${s.code} creado`, 'success');
      m.close();
      openShipment(s.id, ctx);
    } catch (err) { toast(err.message, 'error'); }
  };
}

export function openShipment(id, ctx) {
  const s0 = db.get('shipments', id);
  if (!s0) { toast('Envío no encontrado', 'error'); return; }
  let map = null, key = '';
  const m = modal({ title: `Envío ${s0.code}`, size: 'lg', body: '<div data-d></div>', onClose: () => { unsub(); clearInterval(iv); map?.destroy(); } });
  const box = m.el.querySelector('[data-d]');
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u.name]));
  function draw() {
    const s = ops.withGeo(db.get('shipments', id));
    if (!s) { m.close(); return; }
    const k = JSON.stringify([s.status, s.courierId, !!s.pod, s.rating, (s.chat || []).length, (s.notes2 || []).length, !!s.offer, hasLeg(s)]);
    if (k === key) return;
    key = k;
    map?.destroy(); map = null;
    const c = ops.courierOf(s), cust = ops.customerOf(s);
    const active = ACTIVE_ST.includes(s.status);
    const late = ops.isLate(s);
    const btn = (cond, attr, label, cls = '') => cond ? `<button class="btn btn-sm ${cls}" ${attr}>${label}</button>` : '';
    const st = s.status;
    const actions = [
      btn(ctx.can('envios.assign') && ['pendiente', 'asignado'].includes(st), 'data-a="assign"', st === 'pendiente' ? '🛵 Asignar' : '↺ Reasignar', 'btn-primary'),
      btn(ctx.can('envios.assign') && st === 'pendiente' && s.offer, 'data-a="cancelOffer"', 'Retirar oferta'),
      btn(ctx.can('envios.status') && st === 'asignado' && s.courierId && hasLeg(s), 'data-a="pick"', 'Marcar retirado'),
      btn(ctx.can('envios.status') && st === 'retirado', 'data-a="go"', 'Marcar en camino'),
      btn(ctx.can('envios.status') && st === 'en_camino', 'data-a="deliver"', 'Marcar entregado', 'btn-accent'),
      btn(ctx.can('envios.status') && ['retirado', 'en_camino'].includes(st), 'data-a="fail"', 'No entregado'),
      btn(ctx.can('envios.status') && st === 'fallido', 'data-a="retry"', '↻ Reprogramar'),
      btn(ctx.can('envios.cancel') && ['pendiente', 'asignado'].includes(st), 'data-a="cancel"', 'Cancelar', 'btn-danger'),
      btn(ctx.can('envios.delete'), 'data-a="delete"', '🗑 Eliminar', 'btn-ghost')
    ].join('');
    box.innerHTML = html`<div class="stack">
      <div class="row between"><div class="row" style="gap:6px">${raw(statusBadge(st, late))}${s.offer ? raw(html`<span class="badge badge-warning">Oferta a ${db.get('couriers', s.offer.courierId)?.name || '—'}</span>`) : ''}<span class="muted small">Creado ${dateTime(s.createdAt)} · SLA ${time(s.slaAt)} · canal ${s.channel}</span></div>
        <a class="small" href="index.html#/rastrear/${s.code}" target="_blank" rel="noopener">Ver seguimiento público ↗</a></div>
      <div class="row action-bar">${raw(actions || '<span class="muted small">Sin acciones disponibles para tu rol.</span>')}</div>
      <div class="detail-grid">
        <div class="stack">
          ${s.route ? raw('<div class="mini-map" data-map></div>') : ''}
          ${active ? raw(html`<div class="stack" style="gap:6px"><b data-eta>${etaText(s)}</b><div data-prog>${raw(progressHtml(s))}</div></div>`) : ''}
          ${raw(courierCard(c))}
          <div><b>Línea de tiempo</b>${raw(timelineHtml(s))}</div>
        </div>
        <div class="stack">
          <div><b>Cliente</b><p style="margin:4px 0 0">${cust ? raw(html`${cust.name} <span class="badge plain">${cust.type}</span><br><small class="muted">${cust.email} · ${cust.phone}</small>`) : 'Cliente ocasional (web)'}</p></div>
          <div><b>Detalle</b>${raw(detailsHtml(s))}<dl class="kv"><dt>Pago</dt><dd>${s.paid ? 'Pagado' : 'Por facturar'}</dd>${s.batch ? raw(html`<dt>Lote</dt><dd>${s.batch}</dd>`) : ''}</dl></div>
          ${s.pod ? raw(podHtml(s)) : ''}
          ${s.rating ? raw(html`<div><b>Calificación</b><div>${stars(s.rating.stars)}</div>${s.rating.comment ? raw(html`<small class="muted">"${s.rating.comment}"</small>`) : ''}</div>`) : ''}
          <div><b>Chat con el repartidor</b><div class="chat-log mini">${(s.chat || []).filter(x => x.from !== 'sys').map(x => raw(html`<div class="msg ${x.from === 'courier' ? 'them' : 'me'}"><small>${x.from === 'courier' ? (c?.name || 'Repartidor') : x.from === 'soporte' ? 'Soporte' : 'Cliente'} · ${time(x.at)}</small><p>${x.text}</p></div>`)) || raw('<div class="msg sys">Sin mensajes</div>')}</div>
            ${ctx.can('envios.chat') && active ? raw('<form class="chat-form row" data-chat><input class="input" name="t" placeholder="Escribir como soporte…"><button class="btn btn-sm">Enviar</button></form>') : ''}</div>
          <div><b>Notas internas</b><div class="list">${(s.notes2 || []).map(n => raw(html`<div class="list-item"><span class="grow"><small class="muted">${users[n.by] || '—'} · ${dateTime(n.at)}</small><span>${n.text}</span></span></div>`))}</div>
            <form class="chat-form row" data-note><input class="input" name="t" placeholder="Agregar nota interna…"><button class="btn btn-sm">Guardar</button></form></div>
        </div>
      </div></div>`;
    if (s.route) {
      map = createMap(box.querySelector('[data-map]'), { label: 'Ruta ' + s.code });
      map.fit([...s.route, ...(hasLeg(s) && st === 'asignado' ? s.plan.pre : [])]);
    }
    tick();
  }
  function tick() {
    const s = ops.withGeo(db.get('shipments', id)); if (!s) return;
    if (map) {
      const t = ops.simNow(), c = ops.courierOf(s);
      const marks = [{ id: 'a', kind: 'pickup', pos: s.pickup }, { id: 'b', kind: 'drop', pos: s.drop }];
      if (c && ACTIVE_ST.includes(s.status)) marks.push({ id: 'c', kind: 'courier', pos: hasLeg(s) ? courierPos(c, [s], t) : ops.posOf(c), state: ops.isLate(s) ? 'late' : 'busy', title: c.name });
      map.setMarkers(marks); map.setLines(shipmentLines(s, t));
    }
    const e = box.querySelector('[data-eta]'); if (e) e.textContent = etaText(s);
    const p = box.querySelector('[data-prog]'); if (p) p.innerHTML = progressHtml(s);
  }
  box.addEventListener('submit', e => {
    e.preventDefault();
    const t = e.target.elements.t.value.trim(); if (!t) return;
    const s = db.get('shipments', id);
    if (e.target.matches('[data-chat]')) ops.addChat(s, 'soporte', t);
    if (e.target.matches('[data-note]')) { db.update('shipments', id, x => ({ notes2: [...(x.notes2 || []), { by: ctx.user.id, text: t, at: ops.nowIso() }] })); db.log('nota', `Nota interna en ${s.code}`, ctx.user.id); }
  });
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const s = db.get('shipments', id);
    const a = b.dataset.a;
    const L = (act, d) => db.log(act, `${s.code}: ${d}`, ctx.user.id);
    if (a === 'assign') return openAssign(s, ctx);
    if (a === 'cancelOffer') { ops.rejectOffer(s, 'retirada'); L('oferta', 'oferta retirada'); }
    if (a === 'pick') { ops.markPicked(s, ctx.user.id); L('estado', 'marcado retirado'); }
    if (a === 'go') { ops.markOnTheWay(s, ctx.user.id); L('estado', 'marcado en camino'); }
    if (a === 'deliver') { ops.deliver(s, { name: s.receiver.name, note: 'Cierre manual por despacho' }, ctx.user.id); L('estado', 'marcado entregado'); toast('Envío entregado', 'success'); }
    if (a === 'fail') {
      const v = await formModal({ title: 'Registrar intento fallido', fields: [{ name: 'r', label: 'Motivo', type: 'select', options: ['Destinatario ausente', 'Dirección incorrecta', 'Rechazado por el destinatario', 'Paquete dañado'] }] });
      if (v) { ops.fail(s, v.r, ctx.user.id); L('estado', 'no entregado: ' + v.r); }
    }
    if (a === 'retry') {
      db.update('shipments', id, x => ({ status: 'pendiente', courierId: null, plan: null, offer: null, rejectedBy: [], slaAt: new Date(ops.simNow() + 8 * 60000).toISOString(), history: [...x.history, { s: 'pendiente', at: ops.nowIso(), note: 'Reprogramado', by: ctx.user.id }] }));
      L('estado', 'reprogramado'); toast('Envío reprogramado y en cola', 'success');
    }
    if (a === 'cancel' && await confirm(`¿Cancelar ${s.code}?`, { danger: true, ok: 'Cancelar envío' })) { ops.cancel(s, 'Cancelado por despacho', ctx.user.id); L('estado', 'cancelado'); toast('Envío cancelado', 'success'); }
    if (a === 'delete' && await confirm(`¿Eliminar definitivamente ${s.code}? Esta acción no se puede deshacer.`, { danger: true, ok: 'Eliminar' })) { db.remove('shipments', id); L('eliminación', 'envío eliminado'); toast('Envío eliminado', 'success'); m.close(); }
  });
  const unsub = db.subscribe(() => draw());
  const iv = setInterval(tick, 1000);
  draw();
}
