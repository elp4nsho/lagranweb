// Seguimiento de pedido por número + correo. Se actualiza en vivo cuando soporte cambia el estado.
import { db, STATUS, FLOW, colorByKey, landing } from '../data/db.js';
import { bottleSVG } from '../shared/bottle.js';
import { escape, money, dateTime, date, toast, $ } from '../../../assets/core/ui.js';
import { reviewForm } from './common.js';

const form = $('#trackForm');
const params = new URLSearchParams(location.search);
let current = null; // { n, e }

function samples() {
  const pick = ['pagado', 'enviado', 'entregado'].map(s => db.query('orders', o => o.status === s)[0]).filter(Boolean);
  $('#samples').innerHTML = pick.map(o => `<button type="button" class="chip" data-n="${escape(o.number)}" data-e="${escape(o.customer.email)}" title="${escape(STATUS[o.status].label)}">${escape(o.number)}</button>`).join('');
}

function find(n, e) {
  return db.find('orders', o => o.number.toUpperCase() === n.trim().toUpperCase() && o.customer.email.toLowerCase() === e.trim().toLowerCase());
}

function eta(o) {
  const paid = new Date(o.history[0].at);
  const days = o.shipMethod === 'express' ? 1 : ['Metropolitana', 'Valparaíso'].includes(o.customer.region) ? 3 : 5;
  return new Date(paid.getTime() + (days + 1) * 864e5);
}

function render() {
  const box = $('#result');
  if (!current) { box.innerHTML = ''; return; }
  const o = find(current.n, current.e);
  if (!o) {
    box.innerHTML = `<div class="card empty"><span class="icon">🔍</span><h3>No encontramos ese pedido</h3><p>Revisa el número (formato AQ-XXXXX) y que el correo sea el mismo de la compra.</p></div>`;
    return;
  }
  const bad = ['cancelado', 'reembolsado'].includes(o.status);
  const idx = FLOW.indexOf(o.status);
  const icons = ['💳', '📦', '🚚', '🏠'];
  const counts = {};
  o.items.forEach(k => { counts[k] = (counts[k] || 0) + 1; });
  const reviewed = db.find('reviews', r => r.orderNumber === o.number);
  box.innerHTML = `
    <section class="card stack">
      <div class="row between"><div><span class="muted small">Pedido</span><h2 class="mono" style="margin:0">${escape(o.number)}</h2></div>
        <span class="badge badge-${STATUS[o.status].type}">${escape(STATUS[o.status].label)}</span></div>
      ${bad ? `<p class="demo-note">Este pedido fue ${escape(STATUS[o.status].label.toLowerCase())}. Si tienes dudas escríbenos a hola@aquilo.cl.</p>`
        : `<div class="track-steps">${FLOW.map((s, i) => `<div class="${i <= idx ? 'done' : ''}"><i aria-hidden="true">${icons[i]}</i>${escape(STATUS[s].label)}</div>`).join('')}</div>
           <div class="progress"><i style="--v:${(idx / 3) * 100}%"></i></div>
           <p style="margin:0">${o.status === 'entregado' ? '✅ Entregado. ¡Disfruta tu Aquilo!' : `Entrega estimada: <b>${escape(date(eta(o), { weekday: 'long', day: 'numeric', month: 'long' }))}</b>`}</p>`}
      ${o.tracking ? `<p class="small muted" style="margin:0">Transporte: <b>${escape(o.carrier)}</b> · N° de seguimiento <b class="mono">${escape(o.tracking)}</b></p>` : ''}
    </section>
    <div class="grid-2">
      <section class="card"><h3>Historial</h3>
        <ol class="timeline">${[...o.history].reverse().map((h, i) => `<li class="${i === 0 ? (['cancelado', 'reembolsado'].includes(h.status) ? 'bad' : 'now') : 'done'}"><span class="tl-dot">${i === 0 ? '●' : '✓'}</span>
          <b>${escape(STATUS[h.status]?.label || h.status)}</b><br><span class="small">${escape(h.note || '')}</span><br><span class="small muted">${escape(dateTime(h.at))}</span></li>`).join('')}</ol>
      </section>
      <section class="card stack"><h3 style="margin:0">Detalle</h3>
        ${Object.entries(counts).map(([k, n]) => { const c = colorByKey(k); return `<div class="sum-item">${bottleSVG(c)}<div class="grow"><b>Aquilo Pulse</b><br><span class="muted">${escape(c ? c.name : k)}</span></div><b>×${n}</b></div>`; }).join('')}
        ${o.bump ? `<div class="sum-line"><span>${escape(landing().bump.name)}</span><span>${money(o.bumpPrice)}</span></div>` : ''}
        ${o.discount ? `<div class="sum-line disc"><span>Cupón ${escape(o.coupon)}</span><span>−${money(o.discount)}</span></div>` : ''}
        <div class="sum-line"><span>Envío ${o.shipMethod === 'express' ? 'express' : 'estándar'}</span><span>${o.shipping ? money(o.shipping) : 'Gratis'}</span></div>
        <div class="sum-line total"><span>Total</span><span>${money(o.total)}</span></div>
        <p class="small muted" style="margin:0">Envío a ${escape(o.customer.address)}, ${escape(o.customer.city)}, ${escape(o.customer.region)}</p>
      </section>
    </div>
    ${o.status === 'entregado' ? `<section class="card row between"><div><h3 style="margin:0">${reviewed ? '¡Gracias por tu reseña!' : '¿Qué te pareció tu Aquilo?'}</h3><p class="muted" style="margin:0">${reviewed ? `Estado: ${escape(reviewed.status)}` : 'Tu reseña verificada ayuda a otras personas a decidir.'}</p></div>
      ${reviewed ? '' : '<button class="btn btn-primary" id="doReview">Escribir reseña verificada</button>'}</section>` : ''}`;
  $('#doReview')?.addEventListener('click', () => reviewForm({ order: o, onDone: render }));
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const n = form.n.value, em = form.e.value;
  form.n.classList.toggle('invalid', !n.trim());
  form.e.classList.toggle('invalid', !em.trim());
  if (!n.trim() || !em.trim()) return toast('Ingresa número de pedido y correo', 'warning');
  current = { n, e: em };
  history.replaceState(null, '', `?n=${encodeURIComponent(n.trim())}&e=${encodeURIComponent(em.trim())}`);
  render();
});
$('#samples').addEventListener('click', e => {
  const b = e.target.closest('[data-n]'); if (!b) return;
  form.n.value = b.dataset.n; form.e.value = b.dataset.e;
  form.requestSubmit();
});

db.subscribe(ch => { if (ch.col === 'traffic' || ch.type === 'log') return; samples(); render(); });

samples();
if (params.get('n')) {
  form.n.value = params.get('n'); form.e.value = params.get('e') || '';
  current = { n: form.n.value, e: form.e.value };
  render();
}
