// Marca y cabecera pública compartida por index, login, verificar y la app del trabajador.
import { escape } from '../../../assets/core/ui.js';
import { auth, homeFor } from '../data/db.js';

export const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 26 13 8l5 9 3-5 8 14z" fill="currentColor"/></svg>';
export const brandHTML = (sub = 'Inducción XR') => `<a class="brand" href="index.html" aria-label="Minera Altiplano, inicio">${LOGO}<span><b>Minera Altiplano</b><small>${escape(sub)}</small></span></a>`;

// links: [{ href, label }] ; actions: html extra (derecha)
export function mountHeader(el, { links = [], actions = '' } = {}) {
  const u = auth.current();
  const acct = u
    ? `<a class="btn btn-sm btn-primary" href="${homeFor(u.role)}">${u.role === 'trabajador' ? 'Mis inducciones' : 'Mi panel'}</a>`
    : `<a class="btn btn-sm btn-primary" href="login.html">Ingresar</a>`;
  el.className = 'site-header';
  el.innerHTML = `<div class="container bar">
    ${brandHTML()}
    <nav class="site-nav" aria-label="Principal">${links.map(l => `<a href="${l.href}">${escape(l.label)}</a>`).join('')}</nav>
    <div class="head-actions">${actions || acct}<button class="btn btn-ghost btn-icon burger" aria-label="Abrir menú" aria-expanded="false">☰</button></div>
  </div>`;
  const burger = el.querySelector('.burger');
  if (!links.length) burger.remove();
  burger?.addEventListener('click', () => { const o = el.classList.toggle('nav-open'); burger.setAttribute('aria-expanded', o); });
  el.querySelector('.site-nav').addEventListener('click', e => { if (e.target.closest('a')) { el.classList.remove('nav-open'); burger?.setAttribute('aria-expanded', 'false'); } });
}
