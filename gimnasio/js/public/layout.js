// Encabezado y pie del sitio público de Titán Fit.
import { escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { auth, HOME_BY_ROLE } from '../data/db.js';
import { settings, activeBranches } from '../shared/domain.js';
import { icon } from '../shared/icons.js';

export const NAV = [['#/', 'Inicio'], ['#/planes', 'Planes'], ['#/horario', 'Horario de clases'], ['#/sedes', 'Sedes'], ['#/entrenadores', 'Entrenadores']];

export function header(el) {
  const s = settings(), u = auth.current();
  el.innerHTML = `
    ${s.promo ? `<div class="announce">${icon('fire', 14)} ${escape(s.promo)}</div>` : ''}
    <div class="container bar">
      <a class="brand" href="#/"><span class="logo">${icon('dumbbell', 22)}</span><span>${escape(s.name)}<small>${escape(s.tagline)}</small></span></a>
      <button class="btn btn-icon btn-ghost nav-toggle" aria-label="Abrir menú" aria-expanded="false">${icon('menu')}</button>
      <nav class="site-nav" aria-label="Principal">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
      <div class="header-cta">
        <a class="btn btn-ghost btn-sm" href="${u ? HOME_BY_ROLE[u.role] : 'login.html'}">${u ? `<span class="avatar" style="--size:24px;--av:${u.color || 'var(--primary)'}">${escape(initials(u.name))}</span>` : icon('user', 18)}<span class="hide-sm">${u ? (u.role === 'socio' ? 'Mi app' : 'Mi panel') : 'Ingresar'}</span></a>
        <a class="btn btn-primary btn-sm" href="#/planes">${icon('fire', 16)} <span class="hide-xs">Inscríbete</span></a>
      </div>
    </div>`;
  const t = el.querySelector('.nav-toggle');
  t.onclick = () => { const o = el.classList.toggle('open'); t.setAttribute('aria-expanded', o); };
  el.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => el.classList.remove('open')));
  fitHeader(el);
}
export function fitHeader(el) {
  const bar = el.querySelector('.bar');
  if (!bar) return;
  el.classList.remove('compact');
  if (bar.scrollWidth > bar.clientWidth + 1) el.classList.add('compact');
  if (!el.__fit) {
    el.__fit = true;
    const again = () => requestAnimationFrame(() => fitHeader(el));
    addEventListener('resize', again);
    addEventListener('lgw:theme', () => setTimeout(again, 60));
    document.fonts?.ready.then(again);
    document.fonts?.addEventListener?.('loadingdone', again);
  }
}

export function footer(el) {
  const s = settings();
  el.innerHTML = `<div class="container cols">
    <div><a class="brand" href="#/"><span class="logo">${icon('dumbbell', 20)}</span><span>${escape(s.name)}</span></a>
      <p style="margin-top:12px">${escape(s.tagline)}. ${activeBranches().length} sedes en Santiago.</p>
      <p>${icon('phone', 16)} ${escape(s.phone)} · ${icon('mail', 16)} ${escape(s.email)}<br>Instagram ${escape(s.instagram)}</p></div>
    <div><h4>Entrena</h4><a href="#/planes">Planes y precios</a><a href="#/horario">Horario de clases</a><a href="#/entrenadores">Entrenadores</a></div>
    <div><h4>Sedes</h4>${activeBranches().map(b => `<a href="#/sedes">${escape(b.name)}</a>`).join('')}</div>
    <div><h4>Acceso</h4><a href="socio.html">App del socio</a><a href="entrenador.html">App entrenador</a><a href="recepcion.html">Recepción / kiosco</a><a href="admin.html">Administración</a></div>
  </div><div class="container small" style="margin-top:24px">© ${new Date().getFullYear()} ${escape(s.name)} · Sitio de demostración, datos ficticios.</div>`;
}
