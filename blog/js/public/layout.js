// Cabecera (barra superior, cabezal, navegación, ticker) y pie del sitio.
import { escape, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, settings, STAFF, liveArticles, activeSub } from '../data/db.js';
import { adSlot } from './cards.js';

export const logo = name => `<span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M16 5 L20 16 L16 27 L12 16 Z" fill="var(--primary)"/><circle cx="16" cy="16" r="2.2" fill="var(--bg)"/></svg></span><span class="logo-text">${escape(name)}</span>`;

export function renderHeader(el) {
  const s = settings(), u = auth.current(), cats = db.all('categories').sort((a, b) => a.order - b.order);
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sub = activeSub(u);
  const breaking = liveArticles().filter(a => a.breaking).slice(0, 6);
  const tick = s.ticker?.on && (s.ticker.manual || breaking.length);
  el.innerHTML = `
    <div class="topbar"><div class="container row between">
      <span class="small muted top-date">${escape(today.charAt(0).toUpperCase() + today.slice(1))} · ${escape(s.city)} 18°</span>
      <span class="row site-actions" style="gap:8px">
        ${u ? `<a class="small user-link" href="${STAFF.includes(u.role) ? 'admin.html' : '#/cuenta'}"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')};--size:24px">${escape(initials(u.name))}</span><span class="hide-sm">${escape(u.name.split(' ')[0])}</span></a>${STAFF.includes(u.role) ? '<a class="small" href="#/cuenta">Mi cuenta</a>' : ''}<button class="btn btn-ghost btn-sm" data-logout>Salir</button>`
          : `<a class="small" href="login.html">Iniciar sesión</a><a class="small hide-sm" href="login.html#registro">Crear cuenta</a>`}
        ${sub ? '<span class="badge badge-success plain">Suscriptor</span>' : '<a class="btn btn-primary btn-sm" href="#/planes">Suscríbete</a>'}
      </span></div></div>
    <div class="masthead"><div class="container masthead-inner">
      <button class="btn btn-ghost btn-icon nav-burger" aria-label="Secciones" aria-expanded="false" aria-controls="sec-nav">☰</button>
      <a class="brand site-brand" href="#/" aria-label="${escape(s.name)}, portada">${logo(s.name)}</a>
      <form class="search-mini" data-search role="search"><input class="input" type="search" name="q" placeholder="Buscar noticias…" aria-label="Buscar noticias"><button class="btn btn-ghost btn-icon" aria-label="Buscar">⌕</button></form>
    </div><p class="tagline container small muted">${escape(s.tagline)}</p></div>
    <nav class="sec-nav site-nav" id="sec-nav" aria-label="Secciones"><div class="container sec-nav-inner">
      <a href="#/">Portada</a>${cats.map(c => `<a href="#/seccion/${escape(c.id)}">${escape(c.name)}</a>`).join('')}<a href="#/planes">Planes</a>
    </div></nav>
    ${tick ? `<div class="ticker" role="region" aria-label="Último minuto"><div class="container ticker-inner"><span class="ticker-label">Último minuto</span><div class="ticker-viewport"><div class="ticker-track">${[...Array(2)].map(() => (s.ticker.manual ? `<span>${escape(s.ticker.manual)}</span>` : '') + breaking.map(a => `<a href="#/articulo/${escape(a.slug)}">${escape(a.title)}</a>`).join('')).join('')}</div></div></div></div>` : ''}`;
  const burger = el.querySelector('.nav-burger'), nav = el.querySelector('.sec-nav');
  burger.onclick = () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
  nav.onclick = e => { if (e.target.closest('a')) nav.classList.remove('open'); };
  el.querySelector('[data-search]').onsubmit = e => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) location.hash = `#/buscar?q=${encodeURIComponent(q)}`; };
  el.querySelector('[data-logout]')?.addEventListener('click', () => { auth.logout(); toast('Sesión cerrada', 'info'); location.hash = '#/'; renderHeader(el); });
}

export function renderFooter(el) {
  const s = settings(), cats = db.all('categories').sort((a, b) => a.order - b.order), so = s.social || {};
  el.innerHTML = `<div class="container">${adSlot('footer')}
    <div class="footer-grid">
      <div class="stack" style="gap:8px"><a class="brand" href="#/">${logo(s.name)}</a><p class="small muted">${escape(s.tagline)}. Medio digital independiente desde ${escape(s.founded)}. Sitio de demostración con contenidos ficticios.</p></div>
      <div><h4>Secciones</h4><ul class="footer-links">${cats.map(c => `<li><a href="#/seccion/${escape(c.id)}">${escape(c.name)}</a></li>`).join('')}</ul></div>
      <div><h4>Brújula</h4><ul class="footer-links"><li><a href="#/planes">Suscripciones</a></li><li><a href="#/cuenta">Mi cuenta</a></li><li><a href="login.html">Acceso redacción</a></li><li><a href="#/buscar">Buscador</a></li></ul></div>
      <div><h4>Contacto</h4><ul class="footer-links"><li>${escape(s.email)}</li><li>${escape(s.phone)}</li><li>${escape(s.address)}</li><li>X ${escape(so.x)} · IG ${escape(so.instagram)}</li></ul></div>
    </div>
    <div class="footer-bottom small muted row between"><span>© ${new Date().getFullYear()} ${escape(s.name)}. Todos los contenidos son ficticios.</span><span>Hecho con el núcleo de La Gran Web</span></div></div>`;
}

export function applySEO(title, desc) {
  const s = settings();
  document.title = title ? `${title} · ${s.name}` : s.seo?.title || s.name;
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
  m.content = desc || s.seo?.description || '';
}
