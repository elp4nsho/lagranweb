// Cabecera y pie del sitio público (index.html y login.html), editables desde el CMS.
import { db, anyUser, homeFor } from '../data/db.js';
import { html, raw } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

export const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

export function renderHeader(el, { active = '' } = {}) {
  const u = anyUser();
  const st = db.getValue('settings') || {};
  const links = [['#/tarifas', 'Tarifas'], ['#/cobertura', 'Cobertura'], ['#/rastrear', 'Rastrear'], ['#/empresas', 'Empresas']];
  el.innerHTML = html`
    ${st.showAnnouncement && st.announcement ? raw(html`<div class="announce"><div class="container">⚡ ${st.announcement}</div></div>`) : ''}
    <div class="site-head-in container">
      <a class="brand" href="index.html#/">${raw(`<span class="brand-logo">${BOLT}</span>`)}<span>Rayo <b>Express</b></span></a>
      <nav class="site-nav" id="site-nav" aria-label="Principal">
        ${links.map(([h, t]) => raw(html`<a href="index.html${h}" class="${active === h ? 'active' : ''}">${t}</a>`))}
        <a href="index.html#/solicitar" class="btn btn-primary btn-sm nav-cta">Solicitar envío</a>
        ${u ? raw(html`<a class="btn btn-sm nav-user" href="${homeFor(u)}"><span class="avatar" style="--av:${u.color || 'var(--primary)'};--size:24px">${initials(u.name)}</span>Mi cuenta</a>`)
            : raw('<a class="btn btn-sm btn-ghost" href="login.html">Ingresar</a>')}
      </nav>
      <button class="btn btn-icon btn-ghost nav-burger" aria-label="Menú" aria-expanded="false" aria-controls="site-nav">☰</button>
    </div>`;
  const burger = el.querySelector('.nav-burger');
  burger.onclick = () => { const o = el.classList.toggle('nav-open'); burger.setAttribute('aria-expanded', o); };
  el.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => el.classList.remove('nav-open')));
}

export function renderFooter(el) {
  const st = db.getValue('settings') || {};
  el.innerHTML = html`<div class="container foot-grid">
    <div class="stack" style="gap:8px"><a class="brand" href="index.html#/">${raw(`<span class="brand-logo">${BOLT}</span>`)}<span>Rayo <b>Express</b></span></a>
      <p class="muted small">Courier independiente en Santiago. Moto, bici eléctrica y furgón. Empresa ficticia de demostración.</p></div>
    <div><b>Servicio</b><a href="index.html#/tarifas">Tarifas</a><a href="index.html#/cobertura">Cobertura</a><a href="index.html#/rastrear">Rastrear envío</a><a href="index.html#/solicitar">Solicitar envío</a></div>
    <div><b>Cuentas</b><a href="login.html">Portal clientes</a><a href="repartidor.html">App repartidor</a><a href="admin.html">Consola de despacho</a></div>
    <div><b>Contacto</b><span>${st.phone}</span><span>${st.email}</span><span>${st.address}</span><span class="muted">${st.hours}</span></div>
  </div><div class="container foot-bottom muted small">© 2026 Rayo Express SpA (ficticia) · Demo de La Gran Web · Datos simulados en tu navegador</div>`;
}
