// Seguimiento público: mapa en vivo, línea de tiempo, ETA, chat con el repartidor y prueba de entrega.
import { db } from '../data/db.js';
import { html, raw, escape, toast, formModal, dateTime } from '../../../assets/core/ui.js';
import { createMap } from '../shared/map.js';
import { courierPos, shipmentLines, makePlan, slaFor, hasLeg } from '../shared/sim.js';
import { INCIDENT_TYPES } from '../shared/status.js';
import { timelineHtml, podHtml, detailsHtml, courierCard, progressHtml, etaText, openChat, openCall, ratingForm, statusBadge, stars } from '../shared/views.js';
import * as ops from '../shared/ops.js';

const norm = v => { v = String(v || '').trim().toUpperCase().replace(/\s+/g, ''); return /^\d{5}$/.test(v) ? 'RX-' + v : v; };

export function mountTrackSearch(el) {
  const act = ops.activeShipments().filter(s => s.status !== 'pendiente').slice(0, 6);
  el.innerHTML = html`<section class="section"><div class="container narrow stack">
    <div class="sec-head"><span class="eyebrow">Seguimiento</span><h1>Rastrea tu envío</h1><p class="muted">Ingresa el código RX que recibiste al solicitar el envío.</p></div>
    <form class="track-form card" id="tf"><label class="sr-only" for="tcode">Código</label><input class="input" id="tcode" placeholder="RX-48213" autofocus autocomplete="off"><button class="btn btn-primary">Rastrear</button></form>
    <div class="stack"><b>Envíos en ruta ahora (demo)</b><div class="row">${act.map(s => raw(html`<a class="chip" href="#/rastrear/${s.code}">${s.code} · ${s.sender.comuna} → ${s.receiver.comuna}</a>`))}<a class="chip" href="#/rastrear/RX-30981">RX-30981 · entregado</a></div></div>
  </div></section>`;
  el.querySelector('#tf').addEventListener('submit', e => { e.preventDefault(); const c = norm(el.querySelector('#tcode').value); if (c) location.hash = '#/rastrear/' + encodeURIComponent(c); });
}

export function mountTrack(el, rawCode) {
  const code = norm(rawCode);
  const s0 = ops.findByCode(code);
  if (!s0) {
    el.innerHTML = html`<section class="section"><div class="container narrow"><div class="card empty"><span class="icon">📦</span><h2>No encontramos ${code}</h2><p>Revisa el código o prueba con uno de demostración.</p><div class="row" style="justify-content:center"><a class="chip" href="#/rastrear/RX-48213">RX-48213</a><a class="chip" href="#/rastrear/RX-30981">RX-30981</a><a class="btn btn-primary" href="#/rastrear">Volver</a></div></div></div></section>`;
    return {};
  }
  const id = s0.id;
  el.innerHTML = html`<section class="section track"><div class="container stack">
    <div class="row between track-head"><div><span class="eyebrow">Seguimiento en vivo</span><h1 class="mono">${code}</h1></div>
      <form class="track-form" id="tf2"><input class="input" placeholder="Otro código" aria-label="Otro código"><button class="btn">Buscar</button></form></div>
    <div class="track-grid">
      <div class="card map-card"><div class="track-map"></div><div class="map-eta" aria-live="polite"></div></div>
      <aside class="stack track-side"></aside>
    </div></div></section>`;
  el.querySelector('#tf2').addEventListener('submit', e => { e.preventDefault(); const c = norm(e.target.querySelector('input').value); if (c) location.hash = '#/rastrear/' + encodeURIComponent(c); });
  const map = createMap(el.querySelector('.track-map'), { label: 'Ruta del envío ' + code });
  const side = el.querySelector('.track-side');
  let key = '', fitKey = '';

  const get = () => ops.withGeo(db.get('shipments', id));
  function drawMap() {
    const s = get(); if (!s) return;
    const t = ops.simNow();
    const c = ops.courierOf(s);
    const marks = [{ id: 'a', kind: 'pickup', pos: s.pickup, title: 'Retiro: ' + s.sender.addr }, { id: 'b', kind: 'drop', pos: s.drop, title: 'Entrega: ' + s.receiver.addr }];
    if (c && !['entregado', 'cancelado', 'fallido'].includes(s.status)) marks.push({ id: 'c', kind: 'courier', pos: hasLeg(s) ? courierPos(c, [s], t) : ops.posOf(c), state: ops.isLate(s) ? 'late' : 'busy', title: c.name });
    map.setMarkers(marks);
    map.setLines(shipmentLines(s, t));
    const fk = s.status + (hasLeg(s) ? 'l' : '');
    if (fk !== fitKey) { fitKey = fk; map.fit([...(s.status === 'asignado' && hasLeg(s) ? s.plan.pre : []), ...(s.route || [s.pickup, s.drop])]); }
    el.querySelector('.map-eta').innerHTML = html`<b>${etaText(s)}</b>${ops.isLate(s) ? raw(' <span class="badge badge-danger">Atrasado</span>') : ''}`;
    const p = side.querySelector('[data-prog]'); if (p) p.innerHTML = progressHtml(s);
    const e = side.querySelector('[data-eta]'); if (e) e.textContent = etaText(s);
  }
  function drawSide() {
    const s = get(); if (!s) return;
    const c = ops.courierOf(s);
    const k = [s.status, s.courierId, (s.chat || []).length, !!s.pod, !!s.rating, !!s.offer].join('|');
    if (k === key) return;
    key = k;
    const done = ['entregado', 'fallido', 'cancelado'].includes(s.status);
    side.innerHTML = html`
      <div class="card stack status-card"><div class="row between">${raw(statusBadge(s.status, ops.isLate(s)))}<span class="badge plain">⚡ Simulación acelerada</span></div>
        <div class="eta" data-eta>${etaText(s)}</div><div data-prog>${raw(progressHtml(s))}</div>
        <small class="muted">${s.sender.comuna} → ${s.receiver.comuna} · creado ${dateTime(s.createdAt)}</small></div>
      <div class="card stack">${raw(courierCard(c, { actions: c && !done ? '<div class="row" style="gap:6px"><button class="btn btn-sm btn-icon" data-call aria-label="Llamar">☎</button><button class="btn btn-sm btn-primary" data-chat>Chat</button></div>' : c ? '<button class="btn btn-sm" data-chat>Ver chat</button>' : '' }))}</div>
      ${s.pod ? raw(`<div class="card">${podHtml(s)}</div>`) : ''}
      ${s.status === 'entregado' && !s.rating ? raw('<div class="card" data-rate></div>') : ''}
      ${s.rating ? raw(html`<div class="card"><b>Tu calificación</b><div>${stars(s.rating.stars)}</div>${s.rating.comment ? raw(html`<p class="muted small" style="margin:0">"${s.rating.comment}"</p>`) : ''}</div>`) : ''}
      <div class="card"><b>Estado del envío</b>${raw(timelineHtml(s))}</div>
      <div class="card"><b>Detalle</b>${raw(detailsHtml(s, { showPrice: false }))}</div>
      <div class="row"><button class="btn btn-ghost btn-sm" data-report>Reportar un problema</button>${s.demo || done ? raw('<button class="btn btn-ghost btn-sm" data-restart>↻ Simular de nuevo</button>') : ''}</div>`;
    side.querySelector('[data-chat]')?.addEventListener('click', () => openChat(id, 'cliente'));
    side.querySelector('[data-call]')?.addEventListener('click', () => openCall(c.name, c.phone));
    const rt = side.querySelector('[data-rate]'); if (rt) rt.appendChild(ratingForm(s));
    side.querySelector('[data-report]').onclick = async () => {
      const v = await formModal({ title: `Reportar problema · ${s.code}`, fields: [
        { name: 'type', label: 'Tipo de problema', type: 'select', options: Object.entries(INCIDENT_TYPES), value: 'retraso' },
        { name: 'email', label: 'Correo de contacto', type: 'email', required: true },
        { name: 'description', label: 'Cuéntanos qué pasó', type: 'textarea', required: true }], submit: 'Enviar reporte' });
      if (!v) return;
      const n = 'INC-' + (1100 + db.count('incidents'));
      db.insert('incidents', { number: n, shipmentCode: s.code, customerId: s.customerId, courierId: s.courierId, type: v.type, priority: v.type === 'dano' || v.type === 'extravio' ? 'alta' : 'media', status: 'abierto', description: v.description, contact: v.email, assigneeId: null, compensation: 0, notes: [] });
      ops.feed(`Nueva incidencia ${n} (${INCIDENT_TYPES[v.type]}) en ${s.code}`, 'warning', s.id);
      toast(`Recibimos tu reporte ${n}. Soporte te contactará.`, 'success');
    };
    side.querySelector('[data-restart]')?.addEventListener('click', () => restart(get()));
  }
  function restart(s) {
    const t = ops.simNow();
    const c = db.get('couriers', s.courierId) || db.find('couriers', x => x.online && x.status === 'activo');
    const iso = new Date(t).toISOString();
    const busy = ops.courierQueue(c.id).filter(x => x.id !== s.id).length > 0;
    db.update('shipments', s.id, {
      status: 'asignado', courierId: c.id, assignedAt: iso, deliveredAt: null, failedAt: null, pickedAt: null, pod: null, rating: null, offer: null,
      slaAt: new Date(slaFor(t, s.km, s.service)).toISOString(), createdAt: new Date(t - 30000).toISOString(),
      history: [{ s: 'pendiente', at: new Date(t - 30000).toISOString() }, { s: 'asignado', at: iso, note: 'Simulación reiniciada' }],
      plan: busy ? null : makePlan(s, ops.posOf(c), t), chat: (s.chat || []).slice(0, 1)
    });
    key = ''; fitKey = '';
    toast('Simulación reiniciada', 'info');
  }
  drawSide(); drawMap();
  return { tick: drawMap, refresh() { drawSide(); drawMap(); }, destroy() { map.destroy(); } };
}
