// Sucursales con fila y tiempo de espera en vivo (se recalcula con cada cambio y cada 15 s).
import { escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { branches, branchLive, baysOf, waitLabel, waitTone, hoursOf, today } from '../shared/domain.js';

const card = b => {
  const l = branchLive(b.id), busy = db.query('jobs', j => j.branchId === b.id && j.status === 'en-bahia').map(j => j.bayId);
  const open = !!hoursOf(b, today());
  return `<article class="card branch-card" data-b="${b.id}">
    <div class="row between"><h3 style="margin:0">${escape(b.name)}</h3><span class="badge ${open ? 'badge-success' : 'badge-danger'}">${open ? 'Abierta hoy' : 'Cerrada hoy'}</span></div>
    <span class="small muted">📍 ${escape(b.address)}</span>
    <span class="small">🕘 ${escape(b.hours)} · 📞 ${escape(b.phone)}</span>
    <div class="wait-big wait-${waitTone(l.wait)}"><b>${escape(waitLabel(l.wait))}</b><span class="muted small">de espera estimada si llegas ahora</span></div>
    <div class="row small" style="gap:14px"><span>🚗 <b>${l.queue}</b> en fila</span><span>🔧 <b>${l.inBay}</b> en bahía</span><span>✅ <b>${l.freeBays}</b> libres</span></div>
    <div class="bay-dots">${baysOf(b.id).map(y => `<span class="bay-dot ${busy.includes(y.id) ? 'busy' : ''}" title="${escape(y.type)}">${busy.includes(y.id) ? '🔧' : '🟢'} ${escape(y.name)}</span>`).join('')}</div>
    <div class="row"><a class="btn btn-primary btn-sm" href="#/reservar?b=${b.id}">Reservar aquí</a><a class="btn btn-sm" href="#/llegue?b=${b.id}">📍 Llegué</a></div>
  </article>`;
};

export function renderBranches(el) {
  const paint = () => {
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div data-anim><span class="eyebrow"><span class="live-dot"></span> En vivo</span><h1>Sucursales y tiempos de espera</h1><p class="lead">La espera se calcula con los autos que están en cada bahía, lo que les falta y la fila actual. Se actualiza sola.</p></div>
      <div class="grid-2 branch-grid" data-list>${branches().map(card).join('')}</div>
      <p class="small muted" data-upd>Actualizado ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
    </div></section>`;
  };
  paint();
  const t = setInterval(paint, 15000);
  return { refresh: paint, destroy: () => clearInterval(t) };
}
