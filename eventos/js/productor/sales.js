// Dashboard de ventas por evento en tiempo real (se actualiza con cada compra, incluso desde otra pestaña).
import { db } from '../data/db.js';
import { html, raw, $, money, num, barChart, lineChart, toast, dateTime } from '../../../assets/core/ui.js';
import { pageHead, kpi, daily } from '../shared/admin-kit.js';
import { badge, fmtDay, fmtHour } from '../shared/format.js';
import { eventStats, venueOf, seatStates, purchase, tierPrice, gaAvailable, isPast } from '../shared/inventory.js';
import { seatMapSVG, layout } from '../shared/venue.js';

let simTimer = null;

function simulateSale(ev) {
  const v = venueOf(ev), states = seatStates(ev, '__sim__');
  const clients = db.query('users', u => u.role === 'cliente' && u.active !== false);
  const buyer = clients[Math.floor(Math.random() * clients.length)];
  const n = 1 + Math.floor(Math.random() * 3), lines = [];
  const t = ev.tiers[Math.floor(Math.random() * ev.tiers.length)];
  if (t.zone === 'ga') { const av = gaAvailable(ev, t, '__sim__'); for (let i = 0; i < Math.min(n, av); i++) lines.push({ tier: t, seat: null, price: tierPrice(t) }); }
  else {
    const free = layout(v).sections.filter(s => s.zone === t.zone).flatMap(s => s.seats).filter(s => !states.get(s.id));
    free.slice(0, n).forEach(s => lines.push({ tier: t, seat: s.id, price: tierPrice(t) }));
  }
  if (!lines.length) return false;
  // purchase() libera la reserva de esta pestaña; aquí no hay reserva propia, así que no afecta.
  purchase({ ev, buyer, lines, promo: null, payment: { brand: 'Visa', last4: String(1000 + Math.floor(Math.random() * 8999)) } });
  return true;
}

export function render(el, { params }) {
  const ev = db.get('events', params.id);
  const live = ev.status === 'publicado' && !isPast(ev);
  el.innerHTML = html`<a class="small" href="#/eventos">← Mis eventos</a>
    ${raw(pageHead(ev.title, `${fmtDay(ev.date)} · ${fmtHour(ev.date)} hrs · ${venueOf(ev).name}`, `${live ? '<button class="btn" id="sim">▶ Simular ventas en vivo</button>' : ''}<a class="btn" href="#/eventos/${ev.id}/editar">✎ Editar</a><a class="btn" href="#/asistentes?event=${ev.id}">Asistentes</a><a class="btn" href="index.html#/evento/${ev.id}" target="_blank">Ver en el sitio ↗</a>`))}
    <div class="row" style="gap:8px">${raw(badge(ev.status))}${live ? raw('<span class="badge badge-danger plain"><span class="live-dot"></span>EN VIVO</span>') : ''}</div>
    <div id="live"></div>`;
  let lastCount = -1;
  function draw() {
    const e = db.get('events', ev.id); if (!e) return;
    const s = eventStats(e);
    const tk = db.query('tickets', t => t.eventId === e.id && t.status !== 'anulado');
    const today = tk.filter(t => Date.now() - Date.parse(t.createdAt) < 864e5);
    const recent = db.query('orders', o => o.eventId === e.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
    const v = venueOf(e);
    const isNew = lastCount >= 0 && tk.length > lastCount; lastCount = tk.length;
    $('#live', el).innerHTML = html`<div class="kpis">${raw(kpi('Vendidas', `${num(s.sold)} / ${num(s.capacity)}`))}${raw(kpi('Recaudación', money(s.revenue)))}${raw(kpi('Últimas 24 h', `${num(today.length)} · ${money(today.reduce((a, t) => a + t.price, 0))}`))}${raw(kpi('Ocupación', `${Math.round(s.pct)}%`))}</div>
      <div class="grid-2">
        <div class="card chart-card"><h3>Vendidas por tipo</h3>${raw(barChart(s.byTier.map(b => ({ label: b.tier.name.slice(0, 12), value: b.sold })), { format: x => `${x} entradas` }))}
          <ul class="mini-list" style="margin-top:12px">${s.byTier.map(b => raw(html`<li><span style="flex:1">${b.tier.name}</span><div class="progress"><i style="--v:${b.capacity ? Math.min(100, b.sold / b.capacity * 100) : 0}%"></i></div><span class="small" style="min-width:150px;text-align:right">${num(b.sold)}/${num(b.capacity)} · ${money(b.revenue)}</span></li>`))}</ul></div>
        <div class="card chart-card"><h3>Ventas diarias (30 días)</h3>${raw(lineChart(daily(tk).map((d, i) => ({ ...d, label: i % 5 === 0 ? d.label : '' })), { format: x => `${x} entradas` }))}</div>
      </div>
      <div class="grid-2">
        <div class="card"><h3>Últimas ventas</h3><ul class="feed">${recent.map((o, i) => raw(html`<li class="${isNew && i === 0 ? 'new' : ''}"><b>${o.number}</b> · ${db.get('users', o.buyerId)?.name} · ${o.tickets.length} ent. · <b>${money(o.total)}</b> ${raw(badge(o.status))}<br><small class="muted">${dateTime(o.createdAt)}</small></li>`))}</ul></div>
        <div class="card"><h3>Mapa de ocupación</h3>${v.sections.length ? raw(`<div class="preview-box">${seatMapSVG(v, { states: seatStates(e, '__none__') })}</div>`) : raw('<p class="muted">Evento sin asientos numerados.</p>')}</div>
      </div>`;
  }
  draw();
  $('#sim', el)?.addEventListener('click', e => {
    if (simTimer) { clearInterval(simTimer); simTimer = null; e.target.textContent = '▶ Simular ventas en vivo'; return; }
    e.target.textContent = '⏸ Detener simulación';
    toast('Simulando compras cada 2 segundos', 'info');
    simTimer = setInterval(() => { if (!simulateSale(db.get('events', ev.id))) { toast('No quedan entradas para simular', 'warning'); clearInterval(simTimer); simTimer = null; } }, 2000);
  });
  return { update: draw, destroy: () => { clearInterval(simTimer); simTimer = null; } };
}
