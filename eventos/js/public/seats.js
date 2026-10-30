// Selección de entradas: mapa de asientos SVG interactivo + entradas generales, con reserva de 10 minutos.
import { db } from '../data/db.js';
import { html, raw, $, money, toast } from '../../../assets/core/ui.js';
import { seatMapSVG, zoneColor, seatInfo } from '../shared/venue.js';
import { venueOf, seatStates, getHold, setHold, releaseHold, gaAvailable, tierPrice, cartLines, totals, isSoldOut, isPast, fees, cleanHolds, holdKey } from '../shared/inventory.js';
import { fmtDay, fmtHour } from '../shared/format.js';

export function renderSeats(app, id) {
  const ev = db.get('events', id);
  if (!ev || ev.status !== 'publicado' || isPast(ev)) { location.hash = `#/evento/${id}`; return; }
  const v = venueOf(ev);
  const seated = ev.tiers.filter(t => t.zone !== 'ga');
  const gaTiers = ev.tiers.filter(t => t.zone === 'ga');
  let zoom = 1, timer;
  // Si había una reserva para otro evento, se libera.
  const prev = getHold(); if (prev && prev.eventId !== ev.id) releaseHold();

  app.innerHTML = html`<section class="section" style="padding-top:20px"><div class="container stack">
    <div class="row between"><div><a href="#/evento/${ev.id}" class="small">← Volver al evento</a><h2 style="margin:4px 0 0">${ev.title}</h2><span class="muted">${fmtDay(ev.date)} · ${fmtHour(ev.date)} hrs · ${v.name}</span></div>
      <div class="steps" aria-label="Pasos"><span class="on">1. Entradas</span><span>2. Pago</span><span>3. Listo</span></div></div>
    <div id="timer"></div>
    <div class="seat-layout">
      <div class="stack">
        ${v.sections.length ? raw(`<div class="seat-stage">
          <div class="zoom-ctl"><button class="btn btn-icon btn-sm" id="zin" aria-label="Acercar">＋</button><button class="btn btn-icon btn-sm" id="zout" aria-label="Alejar">－</button></div>
          <div class="seatmap-wrap" id="mapwrap"></div></div>
          <div class="legend" id="legend"></div>`) : raw(`<div class="card"><h3>Entrada general</h3><p class="muted">Este evento no tiene asientos numerados: elige la cantidad de entradas por tipo.</p></div>`)}
      </div>
      <aside class="card stack seat-sum" id="summary"></aside>
    </div></div></section>`;

  const tierByZone = Object.fromEntries(seated.map(t => [t.zone, { label: `${t.name} ${money(tierPrice(t))}`, short: money(tierPrice(t)), tier: t }]));
  if (gaTiers.length) tierByZone.ga = { label: gaTiers[0].name, short: '' };
  const hold = () => getHold();
  const count = h => (h ? h.seats.length + Object.values(h.ga || {}).reduce((s, n) => s + (+n || 0), 0) : 0);

  function drawMap() {
    const wrap = $('#mapwrap'); if (!wrap) return;
    const h = hold();
    const sl = wrap.scrollLeft, stp = wrap.scrollTop;
    const states = seatStates(ev);
    const gaInfo = gaTiers.length ? `De pie · desde ${money(Math.min(...gaTiers.map(t => tierPrice(t))))} · toca para elegir` : '';
    wrap.innerHTML = seatMapSVG(v, { states, selected: new Set(h?.seats || []), interactive: true, tierByZone, gaInfo });
    wrap.querySelector('svg').style.setProperty('--zoom', zoom);
    wrap.scrollLeft = sl; wrap.scrollTop = stp;
    $('#legend').innerHTML = ev.tiers.map(t => `<span><i style="--z:${zoneColor(v, t.zone)}"></i>${t.name} · ${money(tierPrice(t))}</span>`).join('') + '<span><i class="sel"></i>Tu selección</span><span><i class="sold"></i>Vendido</span><span><i class="held"></i>Reservado</span>';
  }
  function drawSummary() {
    const h = hold(), lines = cartLines(ev, h), tt = totals(lines), max = fees().maxPerOrder || 8;
    $('#summary').innerHTML = html`<h3 style="margin:0">Tu selección</h3>
      ${gaTiers.map(t => { const q = +(h?.ga?.[t.id] || 0), av = gaAvailable(ev, t); return raw(html`<div class="tier-row" id="ga-${t.id}"><div><i class="zone-dot" style="--z:${zoneColor(v, 'ga')}"></i> <b>${t.name}</b><br><small class="muted">${money(tierPrice(t))} · ${av > 0 ? (av < 30 ? `¡Quedan ${av}!` : 'Disponible') : 'Agotado'}</small></div>
        <div class="qty"><button class="btn btn-icon btn-sm" data-ga="${t.id}" data-d="-1" ${q ? '' : 'disabled'} aria-label="Quitar">−</button><output>${q}</output><button class="btn btn-icon btn-sm" data-ga="${t.id}" data-d="1" ${av > 0 && count(h) < max ? '' : 'disabled'} aria-label="Agregar">+</button></div></div>`); })}
      ${h?.seats.length ? raw(html`<ul class="cart-list">${h.seats.map(s => { const i = seatInfo(v, s); const t = tierByZone[i?.zone]?.tier; return raw(html`<li><span><i class="zone-dot" style="--z:${zoneColor(v, i?.zone)}"></i> ${i?.section.name} · Fila ${i?.row} · N° ${i?.num}<br><small class="muted">${t?.name} · ${money(tierPrice(t))}</small></span><button class="btn btn-ghost btn-icon btn-sm" data-rm="${s}" aria-label="Quitar asiento">✕</button></li>`); })}</ul>`)
      : v.sections.length ? raw('<p class="muted small" style="margin:0">Toca los asientos disponibles en el mapa para agregarlos.</p>') : ''}
      <div class="stack" style="gap:6px">
        <div class="sum-row"><span>Entradas (${lines.length})</span><span>${money(tt.subtotal)}</span></div>
        <div class="sum-row"><span>Cargo por servicio</span><span>${money(tt.service)}</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(tt.total)}</span></div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" id="go" ${lines.length ? '' : 'disabled'}>Continuar al pago</button>
      <small class="muted">Máximo ${max} entradas por compra. Los asientos se reservan ${fees().holdMinutes || 10} minutos.</small>`;
  }
  function drawTimer() {
    const h = hold(), el = $('#timer');
    if (!h) { el.innerHTML = ''; return; }
    const left = Math.max(0, Date.parse(h.expiresAt) - Date.now());
    const mm = String(Math.floor(left / 6e4)).padStart(2, '0'), ss = String(Math.floor(left / 1000) % 60).padStart(2, '0');
    el.innerHTML = `<div class="timer-bar ${left < 120000 ? 'low' : ''}" role="timer"><span>⏳ Reservamos tus entradas por <span class="clock">${mm}:${ss}</span></span><button class="btn btn-sm btn-ghost" id="rel">Liberar</button></div>`;
    $('#rel').onclick = () => { releaseHold(); toast('Reserva liberada'); };
  }
  const drawAll = () => { drawMap(); drawSummary(); drawTimer(); };

  function save(seats, ga) {
    const max = fees().maxPerOrder || 8;
    if (seats.length + Object.values(ga).reduce((s, n) => s + n, 0) > max) { toast(`Máximo ${max} entradas por compra`, 'warning'); return; }
    setHold(ev.id, seats, ga);
  }
  const ac = new AbortController();
  app.addEventListener('click', e => {
    const seat = e.target.closest('.seat[role="button"]');
    if (seat) return toggleSeat(seat.dataset.seat);
    if (e.target.closest('.seat')) { const s = e.target.closest('.seat'); toast(s.classList.contains('s-off') ? 'Sector no habilitado para este evento' : 'Ese asiento no está disponible', 'warning'); return; }
    if (e.target.closest('.ga-area.clickable')) { const first = gaTiers[0]; $(`#ga-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $(`#ga-${first.id} [data-d="1"]`)?.focus(); return; }
    const g = e.target.closest('[data-ga]');
    if (g) { const h = hold(); const ga = { ...(h?.ga || {}) }; ga[g.dataset.ga] = Math.max(0, (+ga[g.dataset.ga] || 0) + +g.dataset.d); save(h?.seats || [], ga); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) { const h = hold(); save(h.seats.filter(s => s !== rm.dataset.rm), h.ga || {}); return; }
    if (e.target.closest('#go')) location.hash = '#/checkout';
    if (e.target.closest('#zin')) { zoom = Math.min(3, zoom + .5); drawMap(); }
    if (e.target.closest('#zout')) { zoom = Math.max(1, zoom - .5); drawMap(); }
  }, { signal: ac.signal });
  app.addEventListener('keydown', e => { const s = e.target.closest?.('.seat[role="button"]'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleSeat(s.dataset.seat); } }, { signal: ac.signal });
  function toggleSeat(sid) {
    const h = hold(); const seats = [...(h?.seats || [])];
    const i = seats.indexOf(sid);
    if (i >= 0) seats.splice(i, 1);
    else { if (seatStates(ev).get(sid)) { toast('Alguien acaba de reservar ese asiento', 'warning'); return; } seats.push(sid); }
    save(seats, h?.ga || {});
  }
  if (isSoldOut(ev)) toast('Evento agotado: revisa la reventa o únete a la lista de espera', 'warning');
  drawAll();
  if (window.innerWidth < 700 && v.sections.length) { zoom = 2; drawMap(); const w = $('#mapwrap'); w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2; }
  timer = setInterval(() => {
    const h = db.find('holds', x => x.key === holdKey() && Date.parse(x.expiresAt) <= Date.now());
    if (h) { cleanHolds(); toast('Se acabó el tiempo de reserva. Elige tus entradas nuevamente.', 'warning'); }
    drawTimer();
  }, 1000);
  return { update: drawAll, destroy: () => { clearInterval(timer); ac.abort(); } };
}
