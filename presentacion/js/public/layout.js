// Cabecera, pie y piezas comunes del sitio público.
import { escape } from '../../../assets/core/ui.js';
import { db, auth, settings, STAFF } from '../data/db.js';

export const NAV = [
  ['#/', 'Inicio'], ['#/trabajos', 'Trabajos'], ['#/estudio', 'Estudio'], ['#/blog', 'Blog'], ['#/carreras', 'Carreras'], ['#/contacto', 'Contacto']
];

export const logo = (name) => `<span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="14" fill="var(--primary)"/><circle cx="16" cy="16" r="5.5" fill="var(--bg)"/><circle cx="25" cy="8" r="3" fill="var(--accent)"/></svg></span><span class="logo-text">${escape(name)}</span>`;

export function renderHeader(el) {
  const s = settings(), u = auth.current();
  const ann = s.announcement?.on ? `<div class="announce"><div class="container">${escape(s.announcement.text)} <a href="#/cotizar">Cotizar →</a></div></div>` : '';
  el.innerHTML = `${ann}
    <div class="nav-bar"><div class="container nav-inner">
      <a class="brand site-brand" href="#/" aria-label="${escape(s.name)}, inicio">${logo(s.name)}</a>
      <button class="btn btn-ghost btn-icon nav-burger" aria-label="Abrir menú" aria-expanded="false" aria-controls="site-menu">☰</button>
      <div id="site-menu" class="site-menu">
        <nav class="site-nav" aria-label="Principal">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
        <div class="site-actions">
          ${u && STAFF.includes(u.role) ? `<a href="admin.html" class="menu-admin">Panel</a>` : `<a href="login.html" class="menu-admin">Acceso</a>`}
          <a href="#/cotizar" class="btn btn-primary btn-sm">Cotizar proyecto</a>
        </div>
      </div>
    </div></div>`;
  const burger = el.querySelector('.nav-burger'), menu = el.querySelector('.site-menu');
  burger.onclick = () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); burger.textContent = o ? '✕' : '☰'; };
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); burger.textContent = '☰'; } });
}

export function renderFooter(el) {
  const s = settings();
  const so = s.social || {};
  el.innerHTML = `<div class="container">
    <div class="footer-grid">
      <div class="stack" style="gap:10px">
        <a class="brand" href="#/">${logo(s.name)}</a>
        <p class="muted">${escape(s.tagline)} · desde ${escape(s.founded)}.</p>
        <form class="row newsletter" data-newsletter novalidate style="gap:8px;flex-wrap:nowrap">
          <input class="input" type="email" name="email" placeholder="Tu correo para el boletín" aria-label="Correo para el boletín" required>
          <button class="btn btn-primary">Suscribir</button>
        </form>
      </div>
      <div><h4>Estudio</h4><ul class="footer-links">${NAV.slice(1).map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}<li><a href="#/cotizar">Cotizador</a></li></ul></div>
      <div><h4>Contacto</h4><ul class="footer-links">
        <li>${escape(s.email)}</li><li>${escape(s.phone)}</li><li>${escape(s.address)}</li><li class="muted">${escape(s.hours)}</li></ul></div>
      <div><h4>Redes</h4><ul class="footer-links">
        ${so.instagram ? `<li>Instagram · ${escape(so.instagram)}</li>` : ''}${so.linkedin ? `<li>LinkedIn · ${escape(so.linkedin)}</li>` : ''}
        ${so.behance ? `<li>Behance · ${escape(so.behance)}</li>` : ''}${so.dribbble ? `<li>Dribbble · ${escape(so.dribbble)}</li>` : ''}</ul></div>
    </div>
    <div class="footer-bottom row between small muted"><span>© ${new Date().getFullYear()} ${escape(s.name)}. Sitio de demostración, marca ficticia.</span><a href="login.html">Acceso equipo</a></div>
  </div>`;
  el.querySelector('[data-newsletter]').addEventListener('submit', e => {
    e.preventDefault();
    const inp = e.target.email;
    if (!/^\S+@\S+\.\S+$/.test(inp.value)) { inp.classList.add('invalid'); return; }
    inp.classList.remove('invalid');
    const list = db.getValue('newsletter', []);
    if (!list.includes(inp.value)) db.setValue('newsletter', [...list, inp.value]);
    import('../../../assets/core/ui.js').then(({ toast }) => toast('¡Listo! Te sumamos al boletín.', 'success'));
    inp.value = '';
  });
}

export function applySEO(title) {
  const s = settings();
  document.title = title ? `${title} · ${s.name}` : (s.seo?.title || s.name);
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
  m.content = s.seo?.description || '';
  let k = document.querySelector('meta[name="keywords"]');
  if (!k) { k = document.createElement('meta'); k.name = 'keywords'; document.head.appendChild(k); }
  k.content = s.seo?.keywords || '';
}

export const sectionHead = (eyebrow, title, sub = '', extra = '') => `
  <header class="section-head" data-anim><div><span class="eyebrow">${escape(eyebrow).replace(/^(\d+ — )/, '<span class="sec-n">$1</span>')}</span><h2>${escape(title)}</h2>${sub ? `<p class="muted lead">${escape(sub)}</p>` : ''}</div>${extra}</header>`;
