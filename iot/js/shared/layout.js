// Piezas comunes de interfaz: logo, cabecera y pie públicos, chip de usuario.
import { escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

export const LOGO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9"/><path d="M16.5 7.5a6.4 6.4 0 0 1 0 9"/><path d="M4.6 4.6a10.5 10.5 0 0 0 0 14.8"/><path d="M19.4 4.6a10.5 10.5 0 0 1 0 14.8"/></svg>`;
export const brand = (href = 'index.html') => `<a class="brand" href="${href}"><span class="logo">${LOGO}</span><span class="txt">Sentinela</span></a>`;

export function publicHeader() {
  return `<header class="site-head"><div class="container">
    ${brand()}
    <nav class="site-nav" aria-label="Principal"><a href="index.html#funciones">Funciones</a><a href="index.html#casos">Casos de uso</a><a href="index.html#precios">Precios</a><a href="index.html#contacto">Contacto</a></nav>
    <div class="site-actions"><a class="btn btn-ghost" href="login.html">Ingresar</a><a class="btn btn-primary" href="login.html">Demo en vivo</a></div>
    <button class="btn btn-icon btn-ghost nav-toggle" aria-label="Menú" data-nav-toggle>☰</button>
  </div></header>`;
}
export function publicFooter() {
  return `<footer class="site-foot"><div class="container row between">
    <div class="stack" style="gap:6px">${brand()}<span class="muted small">Producto ficticio de portafolio. "Acuícola Fiordo" y todos los datos son inventados.</span></div>
    <div class="row small"><a href="login.html">Consola</a><a href="pantalla.html">Modo pantalla</a><a href="admin.html">Administración</a></div>
  </div></footer>`;
}
export function wirePublicHeader() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-nav-toggle]')) e.target.closest('.site-head').classList.toggle('open');
    else if (e.target.closest('.site-nav a')) document.querySelector('.site-head')?.classList.remove('open');
  });
}
export function userChip(user, roleName) {
  return `<div class="topbar-user"><span class="who"><b>${escape(user.name)}</b><br><span class="muted">${escape(roleName)}</span></span>
    <span class="avatar" style="--av:${escape(user.color || 'var(--primary)')}">${escape(initials(user.name))}</span>
    <button class="btn btn-sm btn-ghost" data-logout>Salir</button></div>`;
}
