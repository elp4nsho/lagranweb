// Perfil público del freelancer: bio, nivel, portafolio, servicios y reseñas.
import { db } from '../data/db.js';
import { escape, date } from '../../../assets/core/ui.js';
import { user, gigCard, levelOf, levelBadge, stars, category } from '../shared/market.js';
import { favState, wireFavs } from './favs.js';

const TONES = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--danger)'];
export const portfolioArt = p => `<svg viewBox="0 0 160 120" aria-hidden="true"><rect width="160" height="120" fill="var(--surface-2)"/><circle cx="40" cy="36" r="40" fill="${TONES[p.hue % 6]}" opacity=".35"/><rect x="34" y="34" width="92" height="56" rx="6" fill="var(--surface)" stroke="var(--text)" stroke-width="2"/><path d="M42 80 l20-22 14 14 12-10 30 18" fill="none" stroke="${TONES[(p.hue + 2) % 6]}" stroke-width="4" stroke-linejoin="round"/></svg>`;

export function renderProfile(el, id) {
  const f = user(id);
  if (!f || f.role !== 'freelancer' || f.active === false) { el.innerHTML = '<section class="section"><div class="container empty"><h2>Perfil no disponible</h2></div></section>'; return; }
  const lv = levelOf(id), st = lv.stats;
  const gigs = db.query('gigs', g => g.freelancerId === id && g.status === 'activo');
  const reviews = db.query('reviews', r => r.freelancerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fav = favState();
  el.innerHTML = `
  <section class="section" style="padding-top:32px"><div class="container stack">
    <div class="card"><div class="profile-head">
      <span class="avatar" style="--size:96px;--av:${escape(f.color)}">${escape(f.name.split(' ').map(w => w[0]).join(''))}</span>
      <div style="flex:1;min-width:220px"><h1 style="margin:0;font-size:clamp(26px,3.4vw,40px)">${escape(f.name)}</h1><p class="muted mb-0">${escape(f.title)} · ${escape(f.city || '')}</p>
        <div class="row" style="gap:8px;margin-top:8px">${levelBadge(lv.level)}${f.verified ? '<span class="badge badge-success">Identidad verificada</span>' : '<span class="badge">Sin verificar</span>'}<span>${stars(st.rating, st.reviews)}</span></div></div>
      <div class="mini-stats"><span><b>${st.done}</b> pedidos completados</span><span><b>${Math.round(st.onTime * 100)}%</b> a tiempo</span><span>Responde en ~<b>${f.responseHrs} h</b></span><span>Miembro desde <b>${date(f.createdAt, { month: 'short', year: 'numeric' })}</b></span></div>
    </div></div>
    <div class="split">
      <div class="stack">
        <div class="card"><h2>Sobre mí</h2><p>${escape(f.bio || '')}</p><div class="row" style="gap:6px">${(f.skills || []).map(s => `<span class="chip">${escape(s)}</span>`).join('')}</div></div>
        <div class="card"><h2>Portafolio</h2><div class="portfolio">${(f.portfolio || []).map(p => `<figure>${portfolioArt(p)}<figcaption>${escape(p.title)}</figcaption></figure>`).join('') || '<p class="muted">Aún no hay trabajos publicados.</p>'}</div></div>
        <h2 style="margin-top:8px">Servicios de ${escape(f.name.split(' ')[0])}</h2>
        <div class="gig-grid">${gigs.map(g => gigCard(g, { fav: fav ? fav.includes(g.id) : null })).join('') || '<p class="muted">Sin servicios activos.</p>'}</div>
      </div>
      <div class="card"><h3>Reseñas (${reviews.length})</h3><ul class="list">${reviews.slice(0, 10).map(r => `<li class="review"><span class="stars small">${'★'.repeat(r.rating)}</span><span class="small"><b>${escape(user(r.clientId)?.name || 'Cliente')}</b> · ${escape(category(db.get('gigs', r.gigId)?.categoryId).name)}<br>${escape(r.text)}<br><span class="muted">${date(r.createdAt)}</span></span></li>`).join('') || '<li class="muted">Sin reseñas</li>'}</ul></div>
    </div>
  </div></section>`;
  wireFavs(el);
}
