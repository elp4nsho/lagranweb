// Piezas de interfaz comunes: logo, cabecera/pie públicos y barra de usuario.
import { escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { site } from '../data/db.js';

export const LOGO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 14c3-1 5-4 10-4s7 3 10 4"/><path d="M12 10V6l-2-2"/><path d="M12 6l2-2"/><path d="M7 17l5-3 5 3"/></svg>`;

export function brand(href = 'index.html') {
  return `<a class="brand" href="${href}"><span class="logo">${LOGO}</span><span class="txt">Cóndor Pay</span></a>`;
}

export function ribbon() {
  return `<div class="demo-ribbon" role="note">🧪 ${escape(site().notice || 'Demo: dinero ficticio')}</div>`;
}

export function publicHeader(active = '') {
  const link = (href, label) => `<a href="${href}" ${active === href ? 'aria-current="page"' : ''}>${label}</a>`;
  return `${ribbon()}
  <header class="site-head"><div class="container">
    ${brand()}
    <nav class="site-nav" aria-label="Principal">
      ${link('index.html#beneficios', 'Beneficios')}${link('index.html#tarjetas', 'Tarjetas')}${link('index.html#tarifas', 'Tarifas')}${link('index.html#seguridad', 'Seguridad')}${link('index.html#faq', 'Preguntas')}
    </nav>
    <div class="site-actions">
      <a class="btn btn-ghost" href="login.html">Ingresar</a>
      <a class="btn btn-primary" href="abrir-cuenta.html">Abrir cuenta</a>
    </div>
    <button class="btn btn-icon btn-ghost nav-toggle" aria-label="Menú" data-nav-toggle>☰</button>
  </div></header>`;
}

export function publicFooter() {
  return `<footer class="site-foot"><div class="container row between">
    <div class="stack" style="gap:6px">${brand()}<span class="muted small">Proyecto de portafolio. Cóndor Pay es una marca ficticia; no capta dinero ni ofrece productos financieros reales.</span></div>
    <div class="row small"><a href="login.html">Ingresar</a><a href="abrir-cuenta.html">Abrir cuenta</a><a href="admin.html">Back-office</a></div>
  </div></footer>`;
}

export function wirePublicHeader(root = document) {
  root.addEventListener('click', e => {
    if (e.target.closest('[data-nav-toggle]')) e.target.closest('.site-head').classList.toggle('open');
    else if (e.target.closest('.site-nav a')) document.querySelector('.site-head')?.classList.remove('open');
  });
}

export function userChip(user, roleName) {
  return `<div class="topbar-user"><span class="who"><b>${escape(user.name)}</b><br><span class="muted">${escape(roleName)}</span></span>
    <span class="avatar" style="--av:${escape(user.color || 'var(--primary)')}">${escape(initials(user.name))}</span>
    <button class="btn btn-sm btn-ghost" data-logout>Salir</button></div>`;
}
