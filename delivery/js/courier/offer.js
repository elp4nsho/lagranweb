// Ofertas entrantes con cuenta regresiva (aceptar / rechazar).
import { db } from '../data/db.js';
import { html, raw, money, toast } from '../../../assets/core/ui.js';
import { haversine } from '../data/geo.js';
import * as ops from '../shared/ops.js';

export const earningOf = s => Math.round(s.price * (ops.pricing().courierShare || 70) / 100) + (s.tip || 0);

export function watchOffers(ctx) {
  let box = null, shownId = null;
  const mine = () => db.find('shipments', s => s.status === 'pendiente' && s.offer && s.offer.courierId === ctx.courier().id && ops.simNow() < s.offer.expiresAt);
  function close() { box?.remove(); box = null; shownId = null; }
  function open(s) {
    close();
    shownId = s.id;
    const c = ctx.courier();
    const dist = haversine(ops.posOf(c), s.pickup);
    box = document.createElement('div');
    box.className = 'modal-backdrop offer-backdrop';
    box.innerHTML = html`<div class="offer card" role="alertdialog" aria-modal="true" aria-labelledby="offer-t">
      <div class="offer-ring"><svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="44"/><circle class="ring-fg" cx="50" cy="50" r="44" pathLength="100"/></svg><b data-secs></b></div>
      <span class="eyebrow">Nueva oferta</span><h2 id="offer-t">${money(earningOf(s))}</h2>
      <p class="muted" style="margin:0">Ganancia estimada${s.tip ? ' (incluye propina)' : ''}</p>
      <ol class="offer-route"><li><span class="step-tag">A</span><span><b>${s.sender.comuna}</b><small class="muted">${s.sender.addr} · a ${dist.toFixed(1).replace('.', ',')} km de ti</small></span></li>
        <li><span class="step-tag b">B</span><span><b>${s.receiver.comuna}</b><small class="muted">${s.receiver.addr} · ${String(s.km).replace('.', ',')} km de viaje</small></span></li></ol>
      <div class="row" style="gap:6px;justify-content:center"><span class="badge">${ops.pricing().sizes[s.size]?.name}</span><span class="badge badge-${s.service === 'express' ? 'primary' : 'info'}">${ops.pricing().services[s.service]?.name}</span><span class="badge plain mono">${s.code}</span></div>
      <div class="row offer-actions"><button class="btn btn-lg" data-no>Rechazar</button><button class="btn btn-primary btn-lg" data-yes>Aceptar</button></div></div>`;
    document.body.appendChild(box);
    box.querySelector('[data-yes]').focus();
    box.querySelector('[data-yes]').onclick = () => {
      const cur = db.get('shipments', s.id);
      if (!cur || cur.status !== 'pendiente') { toast('La oferta ya no está disponible', 'warning'); close(); return; }
      ops.assign(cur, c.id, { by: ctx.user.id, note: `Aceptado por ${c.name} en la app` });
      ops.feed(`${c.name} aceptó ${s.code} desde la app`, 'success', s.id);
      db.log('oferta aceptada', `${c.name} aceptó ${s.code}`, ctx.user.id);
      toast('¡Envío aceptado! Revisa tu ruta.', 'success');
      close();
      location.hash = '#/';
    };
    box.querySelector('[data-no]').onclick = () => {
      const cur = db.get('shipments', s.id);
      if (cur?.offer) ops.rejectOffer(cur, 'rechazada');
      db.log('oferta rechazada', `${c.name} rechazó ${s.code}`, ctx.user.id);
      close();
    };
    tick();
  }
  function tick() {
    if (!box) return;
    const s = db.get('shipments', shownId);
    if (!s || !s.offer || s.offer.courierId !== ctx.courier().id || s.status !== 'pendiente') { close(); return; }
    const left = Math.max(0, s.offer.expiresAt - ops.simNow()), total = s.offer.expiresAt - s.offer.at;
    box.querySelector('[data-secs]').textContent = Math.ceil(left / 1000);
    box.querySelector('.ring-fg').style.strokeDashoffset = String(100 - (left / total) * 100);
    if (left <= 0) { close(); toast('La oferta expiró', 'warning'); }
  }
  function check() {
    const s = mine();
    if (s && s.id !== shownId) { open(s); try { navigator.vibrate?.(200); } catch (e) { /* */ } }
    else if (!s && box) close();
  }
  check();
  return { check, tick() { check(); tick(); } };
}
