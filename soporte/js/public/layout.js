// Cabecera, aviso y pie comunes a las páginas públicas (centro de ayuda, estado y portal).
import { db, auth, homeFor } from '../data/db.js';
import { escape } from '../../../assets/core/ui.js';
import { icon } from '../shared/icons.js';

export function header(active = '') {
  const u = auth.current();
  const help = db.getValue('help', {});
  const live = db.count('incidents', i => i.status !== 'resuelto');
  return `${help.banner?.on && help.banner.text ? `<div class="announce tone-${escape(help.banner.tone || 'info')}" role="note"><div class="container">${icon('activity', 14)} ${escape(help.banner.text)} <a href="estado.html">Ver estado →</a></div></div>` : ''}
  <header class="site-header">
    <div class="container row between">
      <a class="brand" href="index.html"><span class="logo">${icon('wifi', 18)}</span><span>Fibra Austral <small class="brand-sub">Centro de ayuda</small></span></a>
      <button class="btn btn-ghost btn-icon nav-toggle" aria-label="Abrir menú" aria-expanded="false" data-navtoggle>${icon('menu')}</button>
      <nav class="site-nav" data-sitenav>
        <a href="index.html#/" class="${active === 'ayuda' ? 'on' : ''}">Ayuda</a>
        <a href="estado.html" class="${active === 'estado' ? 'on' : ''}">Estado del servicio${live ? ` <span class="badge badge-warning plain">${live}</span>` : ''}</a>
        <a href="index.html#/contacto" class="${active === 'contacto' ? 'on' : ''}">Contacto</a>
        ${u ? `<a class="btn btn-sm ${active === 'portal' ? 'btn-primary' : ''}" href="${homeFor(u)}">${u.role === 'cliente' ? 'Mis tickets' : 'Ir a la consola'}</a><button class="btn btn-sm btn-ghost" data-logout>Salir</button>`
            : `<a class="btn btn-sm btn-primary" href="login.html?next=portal.html">Ingresar</a>`}
      </nav>
    </div>
  </header>`;
}
export function footer() {
  const help = db.getValue('help', {});
  return `<footer class="site-footer"><div class="container footer-grid">
    <div class="stack" style="gap:6px"><a class="brand" href="index.html"><span class="logo">${icon('wifi', 16)}</span> Fibra Austral</a><small class="muted">Internet de fibra óptica para el sur de Chile. Empresa ficticia de demostración.</small></div>
    <div class="stack" style="gap:4px"><b>Contacto</b><small>${icon('phone', 14)} ${escape(help.phone || '')}</small><small>${icon('chat', 14)} WhatsApp ${escape(help.whatsapp || '')}</small><small class="muted">${escape(help.hours || '')}</small></div>
    <nav class="stack" style="gap:4px"><b>Enlaces</b><a href="index.html#/">Centro de ayuda</a><a href="estado.html">Estado del servicio</a><a href="portal.html">Portal de clientes</a><a href="agente.html">Acceso agentes</a></nav>
  </div><p class="container small muted powered">Soporte con <b>Atiende</b> · mesa de ayuda simulada</p></footer>`;
}
// Comportamiento común: menú móvil y cerrar sesión.
export function wireLayout(root = document) {
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-navtoggle]');
    if (t) { const nav = root.querySelector('[data-sitenav]'); const open = nav.classList.toggle('open'); t.setAttribute('aria-expanded', open); }
    if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'index.html'; }
  });
}
