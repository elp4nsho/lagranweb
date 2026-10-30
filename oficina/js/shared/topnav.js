// Barra superior de las apps no-admin (sitio, empleado, recepción).
import { escape } from '../../../assets/core/ui.js';
import { avatar, getCompanyId, setCompanyId } from './util.js';

export const LOGO = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="currentColor"/><path d="M3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" fill="currentColor"/><circle cx="17" cy="9" r="2.4" fill="currentColor" opacity=".6"/><path d="M15.5 14.2c2.4.1 4.2 1.6 4.9 4.3" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".6" stroke-linecap="round"/></svg>';

export function userMenu(auth, u) {
  if (!u) return '<a class="btn btn-primary btn-sm" href="login.html">Ingresar</a>';
  const links = [['index.html', 'Directorio y mapa']];
  if (u.personId) links.push(['empleado.html', 'Mi espacio']);
  if (['admin', 'recepcion'].includes(u.role)) links.push(['recepcion.html', 'Recepción / kiosko']);
  if (['admin', 'rrhh', 'recepcion'].includes(u.role)) links.push(['admin.html', 'Panel de administración']);
  return `<details class="menu"><summary class="btn btn-ghost btn-sm user-btn" aria-label="Menú de ${escape(u.name)}">${avatar(u, 28)}<span class="user-name">${escape(u.name.split(' ')[0])}</span></summary>
    <div class="menu-pop card"><div class="menu-head"><b>${escape(u.name)}</b><small class="muted">${escape(auth.roleName(u.role))} · ${escape(u.email)}</small></div>
    ${links.map(([h, l]) => `<a class="menu-link" href="${h}">${escape(l)}</a>`).join('')}
    <button type="button" class="menu-link danger" data-logout>Cerrar sesión</button></div></details>`;
}

export function mountTopbar(el, { db, auth, links = [], showCompany = true, onCompany, extra = '' }) {
  const draw = () => {
    const u = auth.current(), co = getCompanyId(db);
    el.innerHTML = `<header class="topbar site-header"><div class="container topbar-row">
      <a class="brand site-brand" href="index.html"><span class="logo">${LOGO}</span><span class="brand-name">¿Quién es quién?</span></a>
      <nav class="topnav site-nav" aria-label="Secciones">${links.map(l => `<a href="${l.href}" class="topnav-link">${l.ico ? `<span aria-hidden="true">${l.ico}</span>` : ''}${escape(l.label)}</a>`).join('')}</nav>
      <div class="topbar-end site-actions">
        ${showCompany ? `<label class="co-pick"><span class="sr-only">Empresa</span><select class="select select-sm" data-co>${db.all('companies').filter(c => c.active !== false).map(c => `<option value="${c.id}" ${c.id === co ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></label>` : ''}
        ${extra}
        ${userMenu(auth, u)}
      </div></div></header>`;
  };
  draw();
  el.addEventListener('change', e => { if (e.target.matches('[data-co]')) { setCompanyId(e.target.value); onCompany && onCompany(e.target.value); } });
  el.addEventListener('click', e => { if (e.target.closest('[data-logout]')) { auth.logout(); location.href = 'index.html'; } });
  document.addEventListener('click', e => { el.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
  return { redraw: draw };
}
