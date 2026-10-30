// Piezas de interfaz compartidas: línea de tiempo, prueba de entrega, firma, chat, estrellas.
import { db } from '../data/db.js';
import { html, raw, escape, money, time, dateTime, modal, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { prng } from '../data/geo.js';
import { STATUS, SERVICE_LABEL, VEHICLES, VEHICLE_ICON, statusBadge } from './status.js';
import { isNear, fmtEta, progress } from './sim.js';
import * as ops from './ops.js';

export const stars = (n, max = 5) => raw(`<span class="stars" aria-label="${n} de ${max} estrellas">${'★'.repeat(Math.round(n))}<span class="off">${'★'.repeat(max - Math.round(n))}</span></span>`);
export const avatar = (name, color, size = 36) => raw(`<span class="avatar" style="--av:${escape(color || 'var(--primary)')};--size:${size}px">${escape(initials(name))}</span>`);

const STEPS = [
  ['pendiente', 'Creado', 'Pedido recibido'],
  ['asignado', 'Asignado', 'Repartidor en camino al retiro'],
  ['retirado', 'Retirado', 'Paquete retirado en origen'],
  ['en_camino', 'En camino', 'Rumbo a la dirección de entrega'],
  ['cerca', 'Cerca', 'A minutos del destino'],
  ['entregado', 'Entregado', 'Entregado con firma y foto']
];
const ORDER = { pendiente: 0, asignado: 1, retirado: 2, en_camino: 3, entregado: 5 };
export function timelineHtml(s) {
  const t = ops.simNow();
  const at = k => { const h = (s.history || []).filter(x => x.s === k).pop(); return h ? h.at : null; };
  let cur = ORDER[s.status] ?? 0;
  if (s.status === 'en_camino' && isNear(s, t)) cur = 4;
  const c = ops.courierOf(s);
  const end = s.status === 'fallido' || s.status === 'cancelado';
  const lastIdx = end ? Math.max(...(s.history || []).map(h => ORDER[h.s] ?? 0)) : cur;
  const items = STEPS.map(([k, label, desc], i) => {
    if (end && i > lastIdx) return '';
    const state = i < lastIdx || (i === lastIdx && (s.status === 'entregado' || end)) ? 'done' : i === lastIdx ? 'now' : 'todo';
    const when = at(k);
    const d = k === 'asignado' && c ? `${c.name} · ${VEHICLES[c.vehicle] || ''}` : desc;
    return html`<li class="tl-item ${state}"><span class="tl-dot"></span><div><b>${label}</b><small class="muted">${d}</small></div><time>${when ? time(when) : state === 'todo' ? '' : '—'}</time></li>`;
  }).join('');
  const final = end ? html`<li class="tl-item fail"><span class="tl-dot"></span><div><b>${STATUS[s.status].label}</b><small class="muted">${s.failReason || s.cancelReason || ''}</small></div><time>${time(at(s.status) || t)}</time></li>` : '';
  return `<ol class="timeline">${items}${final}</ol>`;
}

export function progressHtml(s) {
  const p = Math.round(progress(s, ops.simNow()) * 100);
  return `<div class="progress" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="--v:${p}%"></i></div>`;
}
export function etaText(s) {
  if (s.status === 'entregado') return `Entregado ${time(s.deliveredAt)}`;
  if (s.status === 'fallido') return 'No entregado';
  if (s.status === 'cancelado') return 'Cancelado';
  if (s.status === 'pendiente') return s.offer ? 'Asignando repartidor…' : 'Buscando repartidor…';
  return `Llega en ~${fmtEta(ops.etaOf(s))}`;
}

export function scribble(seed) {
  const r = prng(seed); let x = 30, d = `M${x} ${80 + r() * 20}`;
  for (let i = 0; i < 7; i++) { const nx = x + 30 + r() * 25; d += ` C${(x + 10).toFixed(0)} ${(20 + r() * 40).toFixed(0)},${(nx - 10).toFixed(0)} ${(100 + r() * 40).toFixed(0)},${nx.toFixed(0)} ${(60 + r() * 40).toFixed(0)}`; x = nx; }
  return `<svg viewBox="0 0 320 150" role="img" aria-label="Firma del receptor"><path d="${d}" class="sig-ink"/><path d="M40 125 H 280" class="sig-line"/></svg>`;
}
export function photoSvg(s) {
  const p = s.drop || [-33.44, -70.6];
  return `<svg class="photo" viewBox="0 0 320 170" role="img" aria-label="Foto de respaldo: paquete en la puerta">
    <rect class="ph-wall" width="320" height="170"/><rect class="ph-floor" y="132" width="320" height="38"/>
    <rect class="ph-door" x="108" y="16" width="104" height="118" rx="2"/><rect class="ph-door2" x="116" y="24" width="88" height="102"/><circle class="ph-knob" cx="196" cy="78" r="4"/>
    <rect class="ph-mat" x="86" y="132" width="148" height="14" rx="3"/>
    <g transform="translate(130 96)"><rect class="ph-box" width="60" height="40"/><rect class="ph-tape" x="26" width="8" height="40"/><path class="ph-lid" d="M0 0 L30 -10 L60 0Z"/></g>
    <rect class="ph-tag" x="8" y="8" width="176" height="20" rx="4"/><text class="ph-text" x="16" y="22">${escape(time(s.pod?.at || s.deliveredAt || new Date()))} · ${p[0].toFixed(4)}, ${p[1].toFixed(4)}</text></svg>`;
}
export function podHtml(s) {
  if (!s.pod) return '';
  const sig = s.pod.sig ? `<img src="${escape(s.pod.sig)}" alt="Firma de ${escape(s.pod.name)}">` : s.pod.auto !== false ? scribble(s.code) : '<div class="empty-inline sig-none">Sin firma · respaldo fotográfico</div>';
  return html`<div class="pod">
    <div class="row between"><b>Prueba de entrega</b><span class="badge badge-success">Verificada</span></div>
    <div class="pod-grid"><figure class="sig-box">${raw(sig)}<figcaption>Firma · ${s.pod.name}</figcaption></figure>
    ${s.pod.photo !== false ? raw(`<figure class="photo-box">${photoSvg(s)}<figcaption>Foto de respaldo</figcaption></figure>`) : ''}</div>
    <small class="muted">Recibido por <b>${s.pod.name}</b> el ${dateTime(s.pod.at || s.deliveredAt)}${s.pod.rut ? ' · RUT ' + s.pod.rut : ''}</small></div>`;
}
export function detailsHtml(s, { showPrice = true } = {}) {
  const P = ops.pricing();
  return html`<dl class="kv">
    <dt>Origen</dt><dd><b>${s.sender.name}</b><br>${s.sender.addr}, ${s.sender.comuna}</dd>
    <dt>Destino</dt><dd><b>${s.receiver.name}</b><br>${s.receiver.addr}, ${s.receiver.comuna}</dd>
    <dt>Paquete</dt><dd>${P.sizes[s.size]?.name || s.size} · ${SERVICE_LABEL[s.service] || s.service} · ${String(s.km).replace('.', ',')} km</dd>
    ${s.notes ? raw(html`<dt>Notas</dt><dd>${s.notes}</dd>`) : ''}
    ${showPrice ? raw(html`<dt>Total</dt><dd><b>${money(s.price + (s.tip || 0))}</b>${s.tip ? raw(html` <small class="muted">(incluye propina ${money(s.tip)})</small>`) : ''}</dd>`) : ''}
  </dl>`;
}
export function courierCard(c, { actions = '' } = {}) {
  if (!c) return '<div class="courier-card muted">Aún sin repartidor asignado.</div>';
  return html`<div class="courier-card">${avatar(c.name, c.color, 44)}<div class="grow"><b>${c.name}</b><small class="muted">${VEHICLE_ICON[c.vehicle] || ''} ${c.model} · ${c.plate}</small><small>${stars(c.rating)} ${String(c.rating).replace('.', ',')} · ${c.trips} viajes</small></div>${raw(actions)}</div>`;
}

// ---------- Firma en canvas ----------
export function sigPad(canvas, onDraw) {
  const ctx = canvas.getContext('2d');
  let drawing = false, last = null, empty = true;
  const color = getComputedStyle(canvas).color || '#111';
  function size() {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  }
  requestAnimationFrame(size);
  const pt = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', e => { drawing = true; last = pt(e); try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* */ } e.preventDefault(); });
  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pt(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p;
    if (empty) { empty = false; onDraw && onDraw(); }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => { drawing = false; }));
  return { isEmpty: () => empty, clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); empty = true; }, data: () => canvas.toDataURL('image/png') };
}

// ---------- Chat ----------
// me: 'cliente' | 'courier' | 'soporte'
export function openChat(shipmentId, me = 'cliente') {
  const s0 = db.get('shipments', shipmentId);
  if (!s0) return;
  const c = ops.courierOf(s0);
  const title = me === 'courier' ? `Chat con ${s0.receiver.name}` : c ? `Chat con ${c.name}` : 'Chat del envío';
  let typing = false;
  const m = modal({
    title, body: `<div class="chat"><div class="chat-log" aria-live="polite"></div><div class="chat-quick row"></div>
      <form class="chat-form row"><input class="input" name="t" placeholder="Escribe un mensaje…" autocomplete="off" aria-label="Mensaje"><button class="btn btn-primary">Enviar</button></form></div>`,
    onClose: () => unsub()
  });
  const log = m.el.querySelector('.chat-log');
  const quick = me === 'courier' ? ['Voy en camino', 'Estoy afuera', '¿Me abres por favor?', 'Lo dejé en conserjería'] : ['¿Dónde vienes?', '¿Cuánto falta?', 'Déjalo en conserjería', '¡Gracias!'];
  m.el.querySelector('.chat-quick').innerHTML = quick.map(q => html`<button type="button" class="chip" data-q="${q}">${q}</button>`).join('');
  const render = () => {
    const s = db.get('shipments', shipmentId);
    if (!s) return;
    log.innerHTML = (s.chat || []).map(x => {
      const mine = x.from === me;
      if (x.from === 'sys') return html`<div class="msg sys">${x.text}</div>`;
      const who = x.from === 'courier' ? (ops.courierOf(s)?.name.split(' ')[0] || 'Repartidor') : x.from === 'soporte' ? 'Soporte Rayo' : s.receiver.name.split(' ')[0];
      return html`<div class="msg ${mine ? 'me' : 'them'}"><small>${mine ? 'Tú' : who} · ${time(x.at)}</small><p>${x.text}</p></div>`;
    }).join('') + (typing ? '<div class="msg them typing"><p><i></i><i></i><i></i></p></div>' : '');
    log.scrollTop = log.scrollHeight;
  };
  const unsub = db.subscribe(render);
  render();
  const send = text => {
    text = text.trim(); if (!text) return;
    const s = db.get('shipments', shipmentId);
    ops.addChat(s, me, text);
    if (me === 'cliente' && s.courierId && !ops.isControlled(s.courierId) && !['entregado', 'cancelado', 'fallido'].includes(s.status)) {
      setTimeout(() => { typing = true; render(); }, 600);
      setTimeout(() => { typing = false; const cur = db.get('shipments', shipmentId); if (cur) ops.addChat(cur, 'courier', ops.courierReply(cur, text)); }, 1800 + Math.random() * 1200);
    } else if (me === 'cliente' && !s.courierId) {
      setTimeout(() => { const cur = db.get('shipments', shipmentId); if (cur) ops.addChat(cur, 'sys', 'Aún no hay repartidor asignado; te responderá apenas acepte el envío.'); }, 900);
    }
  };
  m.el.querySelector('.chat-form').addEventListener('submit', e => { e.preventDefault(); const i = e.target.elements.t; send(i.value); i.value = ''; i.focus(); });
  m.el.querySelector('.chat-quick').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) send(b.dataset.q); });
}

export function openCall(name, phone) {
  let t0 = null;
  const m = modal({ title: 'Llamada simulada', body: html`<div class="call">${avatar(name, 'var(--primary)', 72)}<h3>${name}</h3><p class="muted">${phone || ''}</p><p class="call-time" aria-live="polite">Llamando…</p><button class="btn btn-danger" data-close>Colgar</button></div>`, onClose: () => { clearInterval(iv); clearTimeout(to); } });
  const el = m.el.querySelector('.call-time');
  const to = setTimeout(() => { t0 = Date.now(); }, 2000);
  const iv = setInterval(() => { if (t0) { const s = Math.floor((Date.now() - t0) / 1000); el.textContent = `En llamada ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; } }, 500);
}

// Formulario de calificación
export function ratingForm(s, onDone) {
  const wrap = document.createElement('form');
  wrap.className = 'rating-form stack';
  wrap.innerHTML = html`<b>¿Cómo estuvo tu envío?</b><div class="star-input" role="radiogroup" aria-label="Calificación">${[1, 2, 3, 4, 5].map(n => raw(`<button type="button" class="star-btn" data-n="${n}" aria-label="${n} estrellas">★</button>`))}</div>
    <textarea class="textarea" name="c" placeholder="Cuéntanos más (opcional)" style="min-height:70px"></textarea><button class="btn btn-primary" disabled>Enviar calificación</button>`;
  let n = 0;
  wrap.querySelector('.star-input').addEventListener('click', e => {
    const b = e.target.closest('[data-n]'); if (!b) return;
    n = +b.dataset.n;
    wrap.querySelectorAll('.star-btn').forEach(x => x.classList.toggle('on', +x.dataset.n <= n));
    wrap.querySelector('button.btn').disabled = false;
  });
  wrap.addEventListener('submit', e => { e.preventDefault(); if (!n) return; ops.rate(s, n, wrap.elements.c.value.trim()); toast('¡Gracias por tu calificación!', 'success'); onDone && onDone(); });
  return wrap;
}
export { statusBadge, money };
