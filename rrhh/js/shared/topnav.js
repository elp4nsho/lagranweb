// Barra superior del sitio de empleos y del portal del colaborador.
import { escape } from '../../../assets/core/ui.js';
import { avatar } from './util.js';

export const LOGO = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 20 9 7l4 6 3-4 6 11Z" fill="currentColor"/><path d="m9 7 1.6 2.6L9 11 7.6 9.5Z" fill="currentColor" opacity=".55"/></svg>';

export function userMenu(auth, u) {
  if (!u) return '<a class="btn btn-primary btn-sm" href="login.html">Ingresar</a>';
  const links = [['index.html', 'Sitio de empleos'], ['portal.html', 'Mi portal']];
  if (['admin', 'reclutador'].includes(u.role)) links.push(['admin.html', 'Panel de RRHH']);
  return `<details class="menu"><summary class="btn btn-ghost btn-sm user-btn" aria-label="Menú de ${escape(u.name)}">${avatar(u, 28)}<span class="user-name">${escape(u.name.split(' ')[0])}</span></summary>
    <div class="menu-pop card"><div class="menu-head"><b>${escape(u.name)}</b><small class="muted">${escape(auth.roleName(u.role))} · ${escape(u.email)}</small></div>
    ${links.map(([h, l]) => `<a class="menu-link" href="${h}">${escape(l)}</a>`).join('')}
    <button type="button" class="menu-link danger" data-logout>Cerrar sesión</button></div></details>`;
}

export function mountTopbar(el, { auth, links = [], extra = () => '', brandHref = 'index.html', brand = 'Grupo Cordillera' }) {
  const draw = () => {
    el.innerHTML = `<header class="topbar"><div class="container topbar-row">
      <a class="brand" href="${brandHref}"><span class="logo">${LOGO}</span><span class="brand-name">${escape(brand)}</span></a>
      <nav class="topnav" aria-label="Secciones">${links.map(l => `<a href="${l.href}" class="topnav-link">${l.ico ? `<span aria-hidden="true">${l.ico}</span>` : ''}${escape(l.label)}</a>`).join('')}</nav>
      <div class="topbar-end">${extra()}${userMenu(auth, auth.current())}</div></div></header>`;
  };
  draw();
  el.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'index.html'; } });
  document.addEventListener('click', e => { el.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
  return { redraw: draw };
}
