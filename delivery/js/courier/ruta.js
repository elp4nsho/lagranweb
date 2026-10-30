// Ruta activa del repartidor: paradas ordenadas en el mapa, botones de estado y prueba de entrega.
import { db } from '../data/db.js';
import { html, raw, money, toast, modal, formModal, escape } from '../../../assets/core/ui.js';
import { createMap } from '../shared/map.js';
import { COMUNAS, nearestComuna, haversine } from '../data/geo.js';
import { shipmentLines, hasLeg, preFrac, transitFrac, fmtEta } from '../shared/sim.js';
import { statusBadge, openChat, openCall, sigPad, photoSvg } from '../shared/views.js';
import { earningOf } from './offer.js';
import * as ops from '../shared/ops.js';

export function mountRuta(el, ctx) {
  let map = null, key = '', fitted = '';
  el.innerHTML = '<div class="rider-map card map-card"><div class="rmap-host"></div></div><div class="stack" data-body></div>';
  map = createMap(el.querySelector('.rmap-host'), { label: 'Mi ruta' });
  const body = el.querySelector('[data-body]');

  function stops(queue) {
    const out = [];
    queue.forEach(s => {
      if (['asignado'].includes(s.status)) out.push({ s, type: 'pickup', pos: s.pickup, addr: s.sender.addr, comuna: s.sender.comuna, who: s.sender.name, phone: s.sender.phone });
      out.push({ s, type: 'drop', pos: s.drop, addr: s.receiver.addr, comuna: s.receiver.comuna, who: s.receiver.name, phone: s.receiver.phone });
    });
    return out;
  }
  function draw() {
    const c = ctx.courier();
    const queue = ops.courierQueue(c.id);
    const cur = queue[0];
    const k = [c.online, c.status, ...queue.map(s => s.id + s.status + (hasLeg(s) ? 'l' : '') + (s.chat || []).length)].join('|');
    if (k === key) return;
    key = k;
    const st = stops(queue);
    if (!queue.length) {
      body.innerHTML = c.online ? html`<div class="card waiting stack"><div class="radar" aria-hidden="true"><i></i><i></i><i></i></div><h3>Esperando ofertas…</h3>
          <p class="muted">Estás en línea cerca de <b>${nearestComuna(ops.posOf(c))}</b>. Te avisaremos cuando haya un envío cercano.</p><button class="btn btn-accent" data-sim>⚡ Simular oferta ahora</button></div>${raw(todayCard(c))}`
        : html`<div class="card waiting stack"><span class="big-off">⏻</span><h3>Estás desconectado</h3><p class="muted">Conéctate para recibir ofertas de envío.</p><button class="btn btn-primary btn-lg" data-on>Conectarme</button></div>${raw(todayCard(c))}`;
    } else {
      const unread = (cur.chat || []).length && cur.chat[cur.chat.length - 1].from === 'cliente';
      const next = st[0];
      body.innerHTML = html`<div class="card stack cur-job">
          <div class="row between"><span class="mono"><b>${cur.code}</b></span>${raw(statusBadge(cur.status, ops.isLate(cur)))}</div>
          <div class="next-stop"><span class="step-tag ${next.type === 'drop' ? 'b' : ''}">${next.type === 'drop' ? 'B' : 'A'}</span><div class="grow"><small class="muted">${next.type === 'drop' ? 'Entregar a' : 'Retirar en'}</small><b>${next.who}</b><span>${next.addr}, ${next.comuna}</span>${cur.notes ? raw(html`<small class="note">📝 ${cur.notes}</small>`) : ''}</div></div>
          <div class="row job-contact"><button class="btn btn-sm" data-call>☎ Llamar</button><button class="btn btn-sm" data-chat>💬 Chat${unread ? raw(' <span class="badge badge-danger plain">nuevo</span>') : ''}</button><span class="muted small grow" data-eta></span></div>
          <div data-action></div>
          <div class="row between small muted"><span>Ganancia: <b>${money(earningOf(cur))}</b></span><span>${ops.pricing().sizes[cur.size]?.name} · ${String(cur.km).replace('.', ',')} km</span></div>
        </div>
        <div class="card"><div class="card-title"><h3>Paradas (${st.length})</h3><span class="muted small">${queue.length} envío${queue.length > 1 ? 's' : ''}</span></div>
          <ol class="stops">${st.map((x, i) => raw(html`<li class="${i === 0 ? 'cur' : ''}"><span class="stop-n">${i + 1}</span><div class="grow"><b>${x.type === 'pickup' ? 'Retiro' : 'Entrega'} · ${x.comuna}</b><small class="muted">${x.addr} · ${x.s.code}</small></div></li>`))}</ol></div>`;
      body.querySelector('[data-call]').onclick = () => openCall(next.who, next.phone);
      body.querySelector('[data-chat]').onclick = () => openChat(cur.id, 'courier');
      drawAction();
    }
    body.querySelector('[data-sim]')?.addEventListener('click', () => simulateOffer(ctx));
    body.querySelector('[data-on]')?.addEventListener('click', () => ctx.setOnline(true));
    // Marcadores de paradas
    fitted = '';
    tick();
  }
  function drawAction() {
    const c = ctx.courier(), cur = ops.courierQueue(c.id)[0];
    const box = body.querySelector('[data-action]'); if (!box || !cur) return;
    const t = ops.simNow();
    let h = '';
    if (cur.status === 'asignado' && !hasLeg(cur)) h = '<button class="btn btn-block btn-lg" disabled>Esperando inicio de ruta…</button>';
    else if (cur.status === 'asignado') { const arrived = preFrac(cur, t) >= 1; h = `<button class="btn btn-primary btn-block btn-lg" data-do="pick">${arrived ? '📦 Confirmar retiro' : '📦 Llegué al retiro'}</button>${arrived ? '' : '<small class="muted">Vas en camino al punto de retiro.</small>'}`; }
    else if (cur.status === 'retirado') h = '<button class="btn btn-primary btn-block btn-lg" data-do="go">🛵 Iniciar viaje a destino</button>';
    else if (cur.status === 'en_camino') { const f = transitFrac(cur, t); h = `<div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost" data-do="fail">No entregado</button><button class="btn btn-primary btn-lg grow" data-do="pod">✍ ${f >= 1 ? 'Entregar ahora' : 'Entregar'}</button></div><small class="muted" data-left></small>`; }
    const sig = cur.id + cur.status + (cur.status === 'asignado' ? preFrac(cur, t) >= 1 : '') + (cur.status === 'en_camino' ? transitFrac(cur, t) >= 1 : '') + hasLeg(cur);
    if (box.dataset.sig !== sig) { box.dataset.sig = sig; box.innerHTML = h; }
    const left = box.querySelector('[data-left]');
    if (left) left.textContent = transitFrac(cur, t) >= 1 ? 'Llegaste al destino.' : `Faltan ~${fmtEta(ops.etaOf(cur))} para llegar.`;
  }
  body.addEventListener('click', async e => {
    const b = e.target.closest('[data-do]'); if (!b) return;
    const c = ctx.courier(), cur = ops.courierQueue(c.id)[0]; if (!cur) return;
    if (b.dataset.do === 'pick') { ops.markPicked(cur, ctx.user.id); db.log('retiro', `${c.name} retiró ${cur.code}`, ctx.user.id); toast('Retiro confirmado', 'success'); }
    if (b.dataset.do === 'go') { ops.markOnTheWay(cur, ctx.user.id); toast('¡Buen viaje! El cliente ya ve tu ubicación.', 'info'); }
    if (b.dataset.do === 'pod') openPod(ctx, cur);
    if (b.dataset.do === 'fail') {
      const v = await formModal({ title: `No entregado · ${cur.code}`, fields: [{ name: 'reason', label: 'Motivo', type: 'select', options: ['Destinatario ausente', 'Dirección incorrecta', 'Rechazado por el destinatario', 'Zona insegura', 'Paquete dañado'] }, { name: 'note', label: 'Comentario', type: 'textarea' }], submit: 'Registrar' });
      if (!v) return;
      ops.fail(cur, v.reason + (v.note ? ` · ${v.note}` : ''), ctx.user.id);
      db.log('entrega fallida', `${c.name}: ${cur.code} (${v.reason})`, ctx.user.id);
      toast('Intento registrado. El envío vuelve a despacho.', 'warning');
    }
  });
  function tick() {
    const c = ctx.courier(); if (!c) return;
    const t = ops.simNow();
    const queue = ops.courierQueue(c.id);
    const st = stops(queue);
    const me = ops.posOf(c);
    map.setMarkers([...st.map((x, i) => ({ id: 'st' + i + x.s.id + x.type, kind: 'stop', letter: String(i + 1), pos: x.pos, state: i === 0 ? 'cur' : '', title: `${i + 1}. ${x.type === 'pickup' ? 'Retiro' : 'Entrega'} · ${x.addr}` })),
      { id: 'me', kind: 'courier', pos: me, state: c.online ? (queue.length ? 'busy' : 'free') : 'offline', title: 'Tú' }]);
    const cur = queue[0];
    const lines = cur && hasLeg(cur) ? shipmentLines(cur, t) : [];
    if (st.length > 1) lines.push({ id: 'stops', pts: st.map(x => x.pos), kind: 'stop' });
    map.setLines(lines);
    const fk = queue.map(s => s.id + s.status).join();
    if (fk !== fitted) { fitted = fk; const pts = [me, ...st.map(x => x.pos)]; pts.length > 1 ? map.fit(pts) : map.fit([[me[0] - .02, me[1] - .02], [me[0] + .02, me[1] + .02]]); }
    const e = body.querySelector('[data-eta]'); if (e && cur) e.textContent = cur.status === 'asignado' && hasLeg(cur) ? `Retiro en ${fmtEta(Math.max(0, cur.plan.preDur - (t - cur.plan.preStart)))}` : cur.status === 'en_camino' ? `Destino en ${fmtEta(ops.etaOf(cur))}` : '';
    drawAction();
  }
  draw();
  return { refresh: draw, tick, destroy() { map.destroy(); } };
}

function todayCard(c) {
  const t = ops.simNow(), d0 = new Date(t); d0.setHours(0, 0, 0, 0);
  const done = db.query('shipments', s => s.courierId === c.id && s.status === 'entregado' && Date.parse(s.deliveredAt) >= d0.getTime());
  return html`<div class="card"><div class="row between"><div class="stat"><span class="label">Hoy</span><span class="value">${money(done.reduce((a, s) => a + earningOf(s), 0))}</span></div><div class="stat"><span class="label">Entregas</span><span class="value">${done.length}</span></div><div class="stat"><span class="label">Calificación</span><span class="value">${String(c.rating).replace('.', ',')}★</span></div></div></div>`;
}

export function simulateOffer(ctx) {
  const c = ctx.courier();
  if (!c.online) { toast('Conéctate primero', 'warning'); return; }
  const P = ops.pricing();
  const here = ops.posOf(c);
  const from = nearestComuna(here);
  const near = COMUNAS.filter(x => P.comunaZone[x.n] && x.n !== from && haversine([x.lat, x.lng], here) < 9);
  const to = (near[Math.floor(Math.random() * near.length)] || COMUNAS[1]).n;
  const custs = db.query('customers', x => x.type === 'empresa');
  const cust = custs[Math.floor(Math.random() * custs.length)];
  const s = ops.createShipment({ customerId: cust.id, channel: 'api', sender: { name: cust.name, phone: cust.phone, addr: `Av. ${['Italia', 'Grecia', 'Matta', 'Los Leones', 'Ossa'][Math.floor(Math.random() * 5)]} ${100 + Math.floor(Math.random() * 2000)}`, comuna: P.comunaZone[from] ? from : 'Providencia' },
    receiver: { name: ['Sofía Lagos', 'Martín Ortiz', 'Elena Vidal', 'Raúl Campos'][Math.floor(Math.random() * 4)], phone: '+56 9 6000 1234', addr: `Calle ${['Los Aromos', 'Las Encinas', 'El Roble', 'Los Pinos'][Math.floor(Math.random() * 4)]} ${100 + Math.floor(Math.random() * 900)}`, comuna: to },
    size: ['S', 'M', 'L'][Math.floor(Math.random() * 3)], service: Math.random() < .4 ? 'express' : 'estandar', tip: Math.random() < .4 ? 1000 : 0 }, { business: true });
  ops.offer(s, c.id, false);
  ops.feed(`Oferta ${s.code} enviada a ${c.name}`, 'info', s.id);
}

function openPod(ctx, s) {
  let photo = false;
  const m = modal({ title: `Entregar ${s.code}`, body: html`<form class="stack" data-pod>
    <div class="grid-2"><div class="field"><label for="pod-name">Recibe</label><input class="input" id="pod-name" name="name" value="${s.receiver.name}" required></div>
    <div class="field"><label for="pod-rut">RUT (opcional)</label><input class="input" id="pod-rut" name="rut" placeholder="12.345.678-9"></div></div>
    <label class="check"><input type="checkbox" name="conserje"> Entregado en conserjería</label>
    <div class="field"><label>Firma del receptor</label><div class="sig-pad"><canvas aria-label="Área de firma"></canvas><span class="sig-hint">Firma aquí con el dedo o el mouse</span></div><button type="button" class="btn btn-sm btn-ghost" data-clear style="align-self:flex-start">Borrar firma</button></div>
    <div class="field"><label>Foto de respaldo</label><div class="photo-slot" data-photo><button type="button" class="btn" data-shot>📷 Tomar foto</button></div></div>
  </form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Confirmar entrega</button>' });
  const pad = sigPad(m.el.querySelector('canvas'), () => { m.el.querySelector('.sig-hint').hidden = true; });
  m.el.querySelector('[data-clear]').onclick = () => { pad.clear(); m.el.querySelector('.sig-hint').hidden = false; };
  m.el.querySelector('[data-shot]').onclick = () => { photo = true; m.el.querySelector('[data-photo]').innerHTML = photoSvg({ ...s, pod: { at: new Date(ops.simNow()).toISOString() } }) + '<small class="muted">Foto capturada (simulada) con hora y GPS.</small>'; };
  m.el.querySelector('[data-ok]').onclick = () => {
    const f = m.el.querySelector('[data-pod]').elements;
    if (!f.name.value.trim()) { f.name.classList.add('invalid'); toast('Indica quién recibe', 'warning'); return; }
    if (pad.isEmpty() && !photo) { toast('Necesitas la firma o una foto de respaldo', 'warning'); return; }
    const cur = db.get('shipments', s.id);
    ops.deliver(cur, { name: f.conserje.checked ? `Conserjería (${f.name.value.trim()})` : f.name.value.trim(), rut: f.rut.value.trim(), sig: pad.isEmpty() ? null : pad.data(), photo }, ctx.user.id);
    db.log('entrega', `${ctx.courier().name} entregó ${s.code}`, ctx.user.id);
    m.close();
    toast(`¡Entregado! +${money(earningOf(s))}`, 'success');
  };
}
