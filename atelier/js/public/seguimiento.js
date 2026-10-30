// Seguimiento concierge en vivo: pasos, mapa SVG simplificado, chofer, ETA y avance de la OT en el taller.
import { escape, date, time, money, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { COMUNAS, WORKSHOP_XY, TRACK_STEPS, CONC_FLOW, WO_FLOW, WO_STATES } from '../data/catalog.js';
import { vehicleById, userById, concState, woState, woTotal, setConcStatus, setWoStatus, customerById, vehicleName, settings } from '../shared/domain.js';
import { fmtDay } from '../shared/util.js';
import { carArt } from '../shared/car-art.js';

const TRIP_MIN = 25;
export function tripProgress(c) {
  const started = c.status === 'en-camino' ? c.startedAt : c.status === 'en-entrega' ? c.deliveryStartedAt : null;
  if (!started) return { t: 0, left: TRIP_MIN };
  const mins = (Date.now() - new Date(started)) / 60000;
  return { t: Math.min(.94, mins / TRIP_MIN), left: Math.max(2, Math.round(TRIP_MIN - mins)) };
}
function routePts(c) {
  const [cx, cy] = COMUNAS[c.comuna] || [420, 200], [wx, wy] = WORKSHOP_XY;
  return [[wx, wy], [cx, wy], [cx, cy]];
}
function along(pts, t) {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = segs.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < segs.length; i++) { if (d <= segs[i] || i === segs.length - 1) { const k = segs[i] ? Math.min(1, d / segs[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, i]; } d -= segs[i]; }
  return pts.at(-1);
}
// Mapa SVG de Santiago oriente con la ruta taller ↔ cliente y la posición del chofer.
export function conciergeMap(c) {
  const pts = routePts(c);
  const { t } = tripProgress(c);
  const pos = { programado: 0, 'en-camino': t, retirado: 1, 'en-taller': 0, listo: 0, 'en-entrega': t, entregado: 1, cancelado: 0 }[c.status] ?? 0;
  const [dx, dy, seg] = along(pts, pos);
  const done = pos > 0 ? [...pts.slice(0, seg + 1), [dx, dy]] : [];
  const path = p => p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  const grid = [...Array.from({ length: 7 }, (_, i) => `<line class="st2" x1="0" x2="600" y1="${30 + i * 46}" y2="${30 + i * 46}"/>`), ...Array.from({ length: 9 }, (_, i) => `<line class="st2" y1="0" y2="320" x1="${40 + i * 66}" x2="${40 + i * 66}"/>`)].join('');
  const [hx, hy] = pts.at(-1), [wx, wy] = WORKSHOP_XY;
  const moving = ['en-camino', 'en-entrega'].includes(c.status);
  return `<svg class="cmap" viewBox="0 0 600 320" role="img" aria-label="Mapa del recorrido del chofer">
    ${grid}<circle class="park" cx="220" cy="120" r="34"/><circle class="park" cx="470" cy="210" r="26"/><circle class="park" cx="120" cy="250" r="30"/>
    <path class="river" d="M-10 200 C 120 180, 200 150, 300 128 S 470 92, 610 60"/>
    <path class="st" d="M120 40 L 520 300"/><path class="st" d="M0 160 L 600 150"/>
    ${Object.entries(COMUNAS).map(([n, [x, y]]) => `<text class="com" x="${x}" y="${y - 14}" text-anchor="middle">${escape(n)}</text>`).join('')}
    <path class="route" d="${path(pts)}"/>${done.length ? `<path class="route-done" d="${path(done)}"/>` : ''}
    <g><circle class="pin" cx="${wx}" cy="${wy}" r="11"/><text x="${wx}" y="${wy + 4}" text-anchor="middle" style="font:800 9px var(--font-head);fill:var(--on-primary)">AT</text><text class="pin-label" x="${wx}" y="${wy + 28}" text-anchor="middle">Atelier</text></g>
    <g><path class="pin-home" d="M${hx} ${hy} l-11 -16 a13 13 0 1 1 22 0 z"/><circle cx="${hx}" cy="${hy - 22}" r="5" style="fill:var(--surface)"/><text class="pin-label" x="${hx}" y="${hy + 16}" text-anchor="middle">${c.kind === 'oficina' ? 'Tu oficina' : 'Tu casa'}</text></g>
    ${c.status !== 'programado' ? `<g class="driver" transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)})"><circle r="15"/><text y="5" text-anchor="middle" style="font-size:15px">🚘</text>${moving ? `<circle r="22" fill="none" style="stroke:var(--primary)" opacity=".5"><animate attributeName="r" values="16;28;16" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0;.6" dur="2s" repeatCount="indefinite"/></circle>` : ''}</g>` : ''}
  </svg>`;
}

function stepIndex(status) { const i = CONC_FLOW.indexOf(status); return i; }
export function trackSteps(c) {
  const cur = stepIndex(c.status);
  return `<ol class="tsteps">${TRACK_STEPS.map(([k, label], i) => {
    const ki = stepIndex(k), done = cur > ki || c.status === 'entregado', on = !done && (cur === ki || (k === 'entregado' && c.status === 'en-entrega') || (k === 'en-camino' && c.status === 'programado' && false));
    const when = k === 'en-camino' ? c.startedAt : k === 'retirado' ? c.pickup?.at : k === 'entregado' ? c.delivery?.at : null;
    return `<li class="${done ? 'done' : on ? 'on' : ''}"><span class="dot">${done ? '✓' : i + 1}</span><span><b>${label}</b>${when && (done || on) ? `<small class="muted d-block">${time(when)}</small>` : ''}${k === 'entregado' && c.status === 'en-entrega' ? '<small class="muted d-block">En ruta de entrega</small>' : ''}</span></li>`;
  }).join('')}</ol>`;
}

function search(el) {
  const u = auth.current();
  const mine = u?.role === 'cliente' ? db.query('workOrders', w => w.customerId === u.customerId && !['entregada', 'cancelada'].includes(w.status)) : [];
  const live = db.find('concierge', c => c.status === 'en-camino') || db.find('concierge', c => c.status === 'en-taller');
  el.innerHTML = `<section class="section"><div class="container narrow stack">
    <div><span class="eyebrow">Concierge en vivo</span><h1>Seguimiento de tu auto</h1><p class="lead">Ingresa el código de tu orden de trabajo (te lo enviamos por correo y WhatsApp).</p></div>
    <form class="card row" id="sf" role="search"><input class="input grow" id="sf-c" placeholder="Código, ej: OT-24315" aria-label="Código de orden" style="flex:1 1 200px"><button class="btn btn-primary">Buscar</button></form>
    ${mine.length ? `<div class="card stack"><h3 style="margin:0">Tus órdenes activas</h3>${mine.map(w => `<a class="row between" href="#/seguimiento/${w.code}" style="text-decoration:none;color:var(--text)"><span><b class="mono">${w.code}</b> · ${escape(vehicleName(vehicleById(w.vehicleId)))}</span>${badgeOf(woState(w.status))}</a>`).join('')}</div>` : ''}
    ${live ? `<p class="muted small">¿Solo quieres ver cómo funciona? <a href="#/seguimiento/${live.code}">Ver un seguimiento de ejemplo (${live.code})</a></p>` : ''}
  </div></section>`;
  el.querySelector('#sf').onsubmit = e => { e.preventDefault(); const v = el.querySelector('#sf-c').value.trim().toUpperCase().replace(/^(\d)/, 'OT-$1'); if (v) location.hash = '#/seguimiento/' + v; };
}
const badgeOf = s => `<span class="badge badge-${s.badge}">${escape(s.label)}</span>`;

export function renderTracking(el, { code } = {}) {
  if (!code) { search(el); return {}; }
  let timer;
  const paint = () => {
    const wo = db.find('workOrders', w => w.code.toUpperCase() === code.toUpperCase());
    if (!wo) { el.innerHTML = `<section class="section"><div class="container narrow card empty stack"><span class="big-ico">🔎</span><h2>No encontramos la orden ${escape(code)}</h2><a class="btn btn-primary" href="#/seguimiento">Buscar otra</a></div></section>`; return; }
    const c = wo.conciergeId && db.get('concierge', wo.conciergeId);
    const v = vehicleById(wo.vehicleId), drv = c && userById(c.driverId), cust = customerById(wo.customerId);
    const ins = wo.inspectionId && db.get('inspections', wo.inspectionId);
    const { left } = c ? tripProgress(c) : { left: 0 };
    const woStep = WO_FLOW.indexOf(wo.status);
    const courtesy = c?.courtesyCarId && db.get('fleet', c.courtesyCarId);
    const head = c ? (c.status === 'en-camino' ? `<span class="label">Llegada estimada</span><span class="eta">${left} min</span><small class="muted">${escape(drv?.name || 'El chofer')} va en camino a ${escape(c.address)}</small>`
      : c.status === 'en-entrega' ? `<span class="label">Entrega estimada</span><span class="eta">${left} min</span><small class="muted">Tu auto va de regreso, lavado y listo.</small>`
      : c.status === 'programado' ? `<span class="label">Retiro programado</span><span class="eta" style="font-size:24px">${fmtDay(c.date, { weekday: true })} · ${escape(c.window)}</span>`
      : `<span class="label">Estado</span><span class="eta" style="font-size:26px">${concState(c.status).icon} ${escape(concState(c.status).label)}</span>`) : `<span class="label">Estado</span><span class="eta" style="font-size:26px">${escape(woState(wo.status).label)}</span>`;
    el.innerHTML = `<section class="section"><div class="container stack">
      <div class="sec-head"><div><span class="eyebrow mono">${escape(wo.code)}</span><h1>${escape(vehicleName(v))}</h1><p class="muted" style="margin:0">${escape(wo.title)} · ${escape(v?.plate || '')}</p></div><a class="btn btn-sm btn-ghost" href="#/seguimiento">Otra orden</a></div>
      <div class="track">
        <div class="stack">
          <div class="card stack" style="gap:6px">${head}</div>
          ${c ? `<div class="card">${trackSteps(c)}</div>` : '<div class="callout">Esta orden no usa concierge: el auto se recibe directamente en el atelier.</div>'}
          ${woStep >= 1 && wo.status !== 'entregada' ? `<div class="card stack"><h3 style="margin:0">En el taller</h3><div class="sub-steps">${WO_FLOW.slice(1, 7).map((s, i) => `<span class="${woStep > i + 1 ? 'done' : woStep === i + 1 ? 'on' : ''}">${escape(WO_STATES[s].label)}</span>`).join('')}</div>
            ${ins ? `<a class="btn ${wo.status === 'aprobacion' ? 'btn-primary' : ''}" href="#/inspeccion/${ins.id}">${wo.status === 'aprobacion' ? '⚠ Revisar y aprobar inspección digital' : '📋 Ver inspección digital'}</a>` : ''}</div>` : ''}
        </div>
        <div class="stack map-card">
          ${c ? `<div class="card" style="padding:10px">${conciergeMap(c)}</div>` : ''}
          ${c ? `<div class="card row">${drv ? `<span class="avatar" style="--av:${escape(drv.color)}">${escape(drv.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</span><span class="grow"><b>${escape(drv.name)}</b><small class="muted d-block">Chofer concierge certificado · licencia ${escape(drv.license || 'B')}</small></span><a class="btn btn-sm" href="tel:${escape(settings().whatsapp)}">Llamar</a>` : '<span class="muted">Chofer por asignar</span>'}</div>` : ''}
          <div class="card grid-2" style="align-items:center"><div class="car-frame">${carArt({ body: v?.body, color: v?.color, ev: v?.fuel === 'electrico' })}</div>
            <dl class="dl small"><dt>Cliente</dt><dd>${escape(cust?.name?.split(' ')[0] || '')}</dd><dt>Ventana</dt><dd>${c ? `${fmtDay(c.date)} · ${escape(c.window)}` : date(wo.scheduledAt || wo.createdAt)}</dd>${courtesy ? `<dt>Cortesía</dt><dd>${escape(courtesy.name)}</dd>` : ''}<dt>Total</dt><dd>${money(woTotal(wo))}</dd>${c?.pickup ? `<dt>Km retiro</dt><dd>${(c.pickup.km || 0).toLocaleString('es-CL')} km · ${c.pickup.charge}% ${v?.fuel === 'electrico' ? 'carga' : 'estanque'}</dd>` : ''}</dl></div>
          ${wo.status !== 'entregada' && wo.status !== 'cancelada' ? `<button class="btn btn-ghost btn-sm" data-sim title="Simula lo que harían el chofer y el taller">▶ Demo: simular siguiente paso</button>` : ''}
        </div>
      </div></div></section>`;
    el.querySelector('[data-sim]')?.addEventListener('click', () => simulate(wo, c));
  };
  paint();
  timer = setInterval(() => { if (!document.querySelector('.modal-backdrop')) paint(); }, 15000);
  return { refresh: paint, destroy: () => clearInterval(timer) };
}
function simulate(wo, c) {
  const uid = auth.current()?.id || null;
  if (c && ['programado', 'en-camino', 'retirado', 'listo', 'en-entrega'].includes(c.status)) {
    const next = { programado: 'en-camino', 'en-camino': 'retirado', retirado: 'en-taller', listo: 'en-entrega', 'en-entrega': 'entregado' }[c.status];
    const patch = next === 'retirado' ? { pickup: { at: new Date().toISOString(), km: vehicleById(wo.vehicleId)?.km, charge: 62, photos: 6, damages: '', driverId: c.driverId } } : next === 'entregado' ? { delivery: { at: new Date().toISOString() } } : {};
    setConcStatus(c.id, next, uid, patch);
  } else {
    const i = WO_FLOW.indexOf(wo.status);
    const next = wo.status === 'agendada' ? 'recepcion' : WO_FLOW[Math.min(i + 1, 6)];
    if (wo.status === 'aprobacion' && wo.inspectionId) { location.hash = '#/inspeccion/' + wo.inspectionId; return; }
    setWoStatus(wo.id, next, uid, 'Simulación demo');
  }
  toast('Estado actualizado', 'success');
}
