// Shell de panel (admin / médico / recepción) sobre .admin-shell del núcleo.
// Construye el menú lateral según el rol, protege rutas y ofrece utilidades comunes.
import { wireAdminShell, escape, confirm, toast } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { icon } from './icons.js';

export function mountShell({ root = document.getElementById('app'), brand, sub = '', logo = 'heart', nav, user, auth, db, siteHref = 'index.html', loginHref = 'login.html', topExtra = '', onReset }) {
  const allowed = it => !it.roles || it.roles.includes(user.role);
  // Agrupa por sección y quita las secciones sin ítems permitidos
  const items = [];
  let pending = null;
  nav.forEach(it => {
    if (it.section) { pending = it; return; }
    if (!allowed(it)) return;
    if (pending) { items.push(pending); pending = null; }
    items.push(it);
  });
  root.innerHTML = `
  <div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Menú principal">
      <a class="admin-brand" href="${siteHref}"><span class="logo">${icon(logo, 18)}</span><span class="brand-txt">${escape(brand)}<small>${escape(sub)}</small></span></a>
      <nav class="side-nav">
        ${items.map(it => it.section ? `<div class="nav-section">${escape(it.section)}</div>`
          : `<a class="nav-link" href="${it.href}">${it.ico ? `<span class="ico">${icon(it.ico, 18)}</span>` : ''}<span>${escape(it.label)}</span>${it.count ? '<span class="count" hidden></span>' : ''}</a>`).join('')}
      </nav>
      <div class="sidebar-foot">
        <div class="user-chip"><span class="avatar" style="--av:${user.color || 'var(--primary)'}">${escape(initials(user.name))}</span><span><b>${escape(user.name)}</b><small class="muted">${escape(auth.roleName(user.role))}</small></span></div>
        <div class="foot-btns">${onReset ? `<button class="btn btn-ghost btn-sm" data-reset title="Restablecer datos demo">${icon('refresh', 16)} Datos demo</button>` : ''}
        <button class="btn btn-sm" data-logout>${icon('logout', 16)} Salir</button></div>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn btn-icon admin-burger" aria-label="Abrir menú">${icon('menu')}</button>
        <div class="topbar-crumb"><b data-crumb></b></div>
        <div class="topbar-actions">${topExtra}<a class="btn btn-ghost btn-sm hide-sm" href="${siteHref}" target="_blank" rel="noopener">${icon('eye', 16)} Ver sitio</a></div>
      </header>
      <main class="admin-content" id="view" tabindex="-1"></main>
    </div>
  </div>`;
  wireAdminShell(root.querySelector('.admin-shell'));
  root.querySelector('[data-logout]').onclick = () => { auth.logout(); location.href = loginHref; };
  root.querySelector('[data-reset]')?.addEventListener('click', async () => {
    if (!await confirm('Se borrarán todos los cambios y se cargarán los datos de ejemplo nuevamente.', { title: 'Restablecer datos demo', ok: 'Restablecer', danger: true })) return;
    db.reset(); onReset && onReset(); toast('Datos demo restablecidos', 'success');
  });
  const view = root.querySelector('#view');
  const navItems = nav.filter(n => !n.section);
  function refreshCounts() {
    root.querySelectorAll('.side-nav .nav-link').forEach(a => {
      const it = navItems.find(n => n.href === a.getAttribute('href'));
      const c = a.querySelector('.count');
      if (it && it.count && c) { const v = it.count(); c.hidden = !v; c.textContent = v; }
    });
  }
  refreshCounts();
  db.subscribe(refreshCounts);
  return {
    view,
    // ¿El usuario puede entrar a esta ruta? Busca el ítem de menú más específico que la contiene.
    can(path) {
      const match = navItems.filter(n => n.href !== '#/' ? (path === n.href.slice(1) || path.startsWith(n.href.slice(1) + '/')) : path === '/')
        .sort((a, b) => b.href.length - a.href.length)[0];
      return !match || allowed(match);
    },
    denied() {
      view.innerHTML = `<div class="card empty">${icon('lock', 40)}<h2>Acceso restringido</h2><p>Tu rol (<b>${escape(auth.roleName(user.role))}</b>) no tiene permiso para ver esta sección.</p><a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;
    },
    crumb(t) { root.querySelector('[data-crumb]').textContent = t; document.title = `${t} · ${brand}`; },
    refreshCounts
  };
}

export function pageHead(title, sub = '', actions = '') {
  return `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div><div class="row page-actions">${actions}</div></div>`;
}
export function statCard(label, value, delta = '', ico = '') {
  return `<div class="card stat-card"><div class="stat">${ico ? `<span class="stat-ico">${icon(ico, 20)}</span>` : ''}<span class="label">${escape(label)}</span><span class="value">${value}</span>${delta}</div></div>`;
}
export const kv = pairs => `<dl class="kv">${pairs.filter(Boolean).map(([k, v]) => `<dt>${escape(k)}</dt><dd>${v ?? '—'}</dd>`).join('')}</dl>`;
