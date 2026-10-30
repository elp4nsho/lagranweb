// Esqueleto de paneles (.admin-shell) para el portal cliente y la consola admin.
import { html, raw, wireAdminShell, escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="currentColor"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

// nav: [{ title, items: [{ href, label, ico, id }] }]
export function mountShell(root, { title, sub, nav, user, auth, search = '' }) {
  root.innerHTML = html`<div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Navegación del panel">
      <a class="admin-brand" href="index.html"><span class="logo">${raw(BOLT)}</span><span>${title}<small class="muted brand-sub">${sub}</small></span></a>
      ${nav.map(sec => raw(html`${sec.title ? raw(html`<div class="nav-section">${sec.title}</div>`) : ''}${sec.items.map(it => raw(html`<a class="nav-link" href="${it.href}" data-nav="${it.id || ''}"><span class="ico" aria-hidden="true">${it.ico}</span>${it.label}<span class="count" data-count="${it.id || ''}" hidden></span></a>`))}`))}
      <div class="sidebar-foot">
        <div class="user-chip"><span class="avatar" style="--av:${user.color || 'var(--primary)'}">${initials(user.name)}</span><span class="grow"><b>${user.name}</b><small class="muted">${auth.roleName(user.role)}</small></span></div>
        <div class="row" style="gap:6px"><a class="btn btn-sm btn-ghost" href="index.html">Ver sitio</a><button class="btn btn-sm btn-ghost" data-logout>Cerrar sesión</button></div>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="btn btn-icon admin-burger" aria-label="Abrir menú">☰</button>
        ${raw(search)}
        <div class="topbar-right row"></div>
      </header>
      <main class="admin-content" id="content" tabindex="-1"></main>
    </div>
  </div>`;
  wireAdminShell(root.querySelector('.admin-shell'));
  root.querySelector('[data-logout]').onclick = () => { auth.logout(); location.href = 'login.html'; };
  return {
    content: root.querySelector('#content'),
    topRight: root.querySelector('.topbar-right'),
    setCount(id, n) { const el = root.querySelector(`[data-count="${id}"]`); if (el) { el.hidden = !n; el.textContent = n; } },
    highlight(path) {
      root.querySelectorAll('.nav-link').forEach(a => {
        const h = a.getAttribute('href').replace(/^#/, '');
        const on = h === '/' ? path === '/' : path === h || path.startsWith(h + '/');
        a.classList.toggle('active', on);
        on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
      });
    }
  };
}

// Encabezado de página estándar
export const pageHead = (title, sub = '', actions = '') => html`<div class="page-head"><div><h1>${title}</h1>${sub ? raw(html`<p class="muted" style="margin:4px 0 0">${sub}</p>`) : ''}</div><div class="row">${raw(actions)}</div></div>`;
export function kpi(label, value, extra = '') { return html`<div class="card stat"><span class="label">${label}</span><span class="value">${value}</span>${raw(extra)}</div>`; }
