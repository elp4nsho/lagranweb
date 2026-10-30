// Reglas del marketplace (comisiones, niveles, ratings, estados) y piezas visuales reutilizables.
import { db } from '../data/db.js';
import { escape, money } from '../../../assets/core/ui.js';
import { PKGS, PKG_NAMES } from '../data/seed.js';
export { PKGS, PKG_NAMES };

export const settings = () => db.getValue('settings', {});
export const user = id => db.get('users', id);
export const gig = id => db.get('gigs', id);
export const category = id => db.get('categories', id) || { id, name: id, icon: '•' };
export const activeCategories = () => db.query('categories', c => c.active !== false).sort((a, b) => a.order - b.order);

export const ORDER_STATUS = {
  pendiente: ['Pendiente', 'warning'], en_progreso: ['En progreso', 'info'], entregado: ['Entregado', 'primary'],
  revision: ['En revisión', 'warning'], completado: ['Completado', 'success'], cancelado: ['Cancelado', ''], disputa: ['En disputa', 'danger']
};
export const ORDER_FLOW = ['pendiente', 'en_progreso', 'entregado', 'revision', 'completado'];
export const ESCROW = { retenido: ['Fondos retenidos', 'warning'], liberado: ['Fondos liberados', 'success'], reembolsado: ['Reembolsado', 'info'], parcial: ['Reembolso parcial', 'info'] };
export const GIG_STATUS = { activo: ['Activo', 'success'], pendiente: ['En moderación', 'warning'], pausado: ['Pausado', ''], rechazado: ['Rechazado', 'danger'], borrador: ['Borrador', 'info'] };
export const LEVELS = { nuevo: 'Nuevo', nivel1: 'Nivel 1', nivel2: 'Nivel 2', top: 'Top Gremio' };
export const statusBadge = (map, k) => { const [l, kind] = map[k] || [k, '']; return `<span class="badge ${kind ? 'badge-' + kind : ''}">${escape(l)}</span>`; };

// ---- Comisiones ----
export function quote(price, s = settings()) {
  const fee = Math.round(price * s.serviceFeePct / 100), com = Math.round(price * s.commissionPct / 100);
  return { price, serviceFee: fee, commission: com, total: price + fee, net: price - com, feePct: s.serviceFeePct, comPct: s.commissionPct };
}
export const net = o => o.price - o.commission;
export const take = o => (o.escrow === 'reembolsado' ? 0 : o.serviceFee + o.commission * (o.escrow === 'parcial' ? 0.5 : 1));

// ---- Ratings y niveles ----
export function gigRating(gid) {
  const r = db.query('reviews', x => x.gigId === gid);
  return { avg: r.length ? r.reduce((a, x) => a + x.rating, 0) / r.length : 0, count: r.length };
}
export function freelancerStats(fid) {
  const orders = db.query('orders', o => o.freelancerId === fid);
  const done = orders.filter(o => o.status === 'completado');
  const rev = db.query('reviews', r => r.freelancerId === fid);
  const avg = rev.length ? rev.reduce((a, r) => a + r.rating, 0) / rev.length : 0;
  const onTime = done.length ? done.filter(o => !o.deliveredAt || o.deliveredAt <= o.due).length / done.length : 1;
  const earnings = done.filter(o => o.escrow !== 'reembolsado').reduce((a, o) => a + net(o) * (o.escrow === 'parcial' ? 0.5 : 1), 0);
  return { orders: orders.length, done: done.length, rating: avg, reviews: rev.length, onTime, earnings, active: orders.filter(o => ['pendiente', 'en_progreso', 'entregado', 'revision'].includes(o.status)).length };
}
export function levelOf(fid) {
  const st = freelancerStats(fid), L = settings().levels;
  let level = 'nuevo';
  if (st.done >= L.nivel1.orders && st.rating >= L.nivel1.rating) level = 'nivel1';
  if (st.done >= L.nivel2.orders && st.rating >= L.nivel2.rating) level = 'nivel2';
  if (st.done >= L.top.orders && st.rating >= L.top.rating) level = 'top';
  const next = { nuevo: 'nivel1', nivel1: 'nivel2', nivel2: 'top', top: null }[level];
  return { level, next, stats: st, req: next ? L[next] : null };
}
export function balanceOf(fid) {
  const orders = db.query('orders', o => o.freelancerId === fid);
  const released = orders.filter(o => o.escrow === 'liberado' || o.escrow === 'parcial').reduce((a, o) => a + net(o) * (o.escrow === 'parcial' ? 0.5 : 1), 0);
  const pending = orders.filter(o => o.escrow === 'retenido').reduce((a, o) => a + net(o), 0);
  const ws = db.query('withdrawals', w => w.freelancerId === fid);
  const withdrawn = ws.filter(w => w.status === 'pagado').reduce((a, w) => a + w.amount, 0);
  const requested = ws.filter(w => w.status === 'solicitado').reduce((a, w) => a + w.amount, 0);
  return { released, pending, withdrawn, requested, available: Math.max(0, released - withdrawn - requested) };
}

// ---- Visuales ----
export function stars(avg, count) {
  const full = Math.round(avg);
  return `<span class="stars" title="${avg.toFixed(1)} de 5"><span aria-hidden="true">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <b>${avg ? avg.toFixed(1).replace('.', ',') : 'Nuevo'}</b>${count != null ? ` <span class="muted">(${count})</span>` : ''}</span>`;
}
export function levelBadge(level) {
  return `<span class="badge ${level === 'top' ? 'badge-primary' : level === 'nuevo' ? '' : 'badge-info'}">${level === 'top' ? '★ ' : ''}${LEVELS[level]}</span>`;
}
export function cover(g, { big = false } = {}) {
  const tones = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--danger)'];
  const t = tones[(g.hue ?? 0) % tones.length], t2 = tones[((g.hue ?? 0) + 2) % tones.length];
  const icon = category(g.categoryId).icon;
  return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" class="cover-svg">
    <rect width="320" height="180" fill="var(--surface-2)"/>
    <circle cx="${60 + (g.hue || 0) * 30}" cy="40" r="80" fill="${t}" opacity=".28"/>
    <circle cx="280" cy="170" r="70" fill="${t2}" opacity=".25"/>
    <rect x="${big ? 90 : 100}" y="45" width="${big ? 140 : 120}" height="90" rx="10" fill="var(--surface)" stroke="var(--text)" stroke-width="2.5"/>
    <rect x="${big ? 90 : 100}" y="45" width="${big ? 140 : 120}" height="18" rx="6" fill="${t}" stroke="var(--text)" stroke-width="2.5"/>
    <text x="160" y="118" text-anchor="middle" font-size="34">${icon}</text>
  </svg>`;
}
export function gigCard(g, { fav = null } = {}) {
  const f = user(g.freelancerId) || {}, r = gigRating(g.id), lvl = levelOf(g.freelancerId).level;
  return `<article class="card hover gig-card">
    <a href="index.html#/servicio/${g.id}" class="gig-cover">${cover(g)}</a>
    ${fav !== null ? `<button class="btn btn-icon btn-sm fav-btn ${fav ? 'on' : ''}" data-fav="${g.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">${fav ? '♥' : '♡'}</button>` : ''}
    <div class="gig-body">
      <div class="row gig-seller"><span class="avatar" style="--size:26px;--av:${escape(f.color || 'var(--primary)')}">${escape((f.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2))}</span><a href="index.html#/freelancer/${f.id}" class="small"><b>${escape(f.name || '')}</b></a>${lvl !== 'nuevo' ? levelBadge(lvl) : ''}</div>
      <a href="index.html#/servicio/${g.id}" class="gig-title">${escape(g.title)}</a>
      <div class="small">${stars(r.avg, r.count)}</div>
    </div>
    <div class="gig-foot"><span class="small muted">⏱ ${g.packages.basico.days} día${g.packages.basico.days > 1 ? 's' : ''}</span><span class="small">Desde <b class="price">${money(g.packages.basico.price)}</b></span></div>
  </article>`;
}
export const orderUnread = (o, uid) => db.query('messages', m => m.orderId === o.id && m.from !== uid && (!o.readBy?.[uid] || m.at > o.readBy[uid])).length;
