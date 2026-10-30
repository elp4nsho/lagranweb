// Historial de viajes del repartidor con filtros y calificaciones.
import { db } from '../data/db.js';
import { html, raw, money, time, date } from '../../../assets/core/ui.js';
import { statusBadge, stars } from '../shared/views.js';
import { earningOf } from './offer.js';

export function mountHistorial(el, ctx) {
  let f = 'todos', sig = '';
  const draw = (force) => {
    const c = ctx.courier();
    const all = db.query('shipments', s => s.courierId === c.id && ['entregado', 'fallido'].includes(s.status)).sort((a, b) => Date.parse(b.deliveredAt || b.failedAt) - Date.parse(a.deliveredAt || a.failedAt));
    const ns = all.length + f; if (ns === sig && !force) return; sig = ns;
    const list = all.filter(s => f === 'todos' || (f === 'rated' ? s.rating : s.status === f)).slice(0, 60);
    const rated = all.filter(s => s.rating);
    el.innerHTML = html`<div class="card row between"><div class="stat"><span class="label">Viajes</span><span class="value">${all.length}</span></div><div class="stat"><span class="label">Calificación</span><span class="value">${String(c.rating).replace('.', ',')}</span>${stars(c.rating)}</div><div class="stat"><span class="label">Fallidos</span><span class="value">${all.filter(s => s.status === 'fallido').length}</span></div></div>
    <div class="chips">${[['todos', 'Todos'], ['entregado', 'Entregados'], ['fallido', 'Fallidos'], ['rated', 'Con calificación']].map(([k, l]) => raw(html`<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}</button>`))}</div>
    <div class="card"><div class="list">${list.length ? list.map(s => raw(html`<div class="list-item"><span class="grow"><b>${s.sender.comuna} → ${s.receiver.comuna}</b><small class="muted">${s.code} · ${date(s.deliveredAt || s.failedAt)} ${time(s.deliveredAt || s.failedAt)}</small>${s.rating ? raw(html`<small>${stars(s.rating.stars)} ${s.rating.comment ? '“' + s.rating.comment + '”' : ''}</small>`) : ''}</span><span class="stack" style="gap:4px;align-items:flex-end">${raw(statusBadge(s.status))}<b class="small">${s.status === 'entregado' ? money(earningOf(s)) : '—'}</b></span></div>`)) : raw('<div class="empty-inline">Sin viajes en este filtro.</div>')}</div></div>
    <p class="muted small">Promedio de ${rated.length} calificaciones de clientes.</p>`;
  };
  el.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { f = b.dataset.f; draw(true); } });
  draw();
  return { refresh: () => draw() };
}
