// Encabezado y pie del sitio público.
import { escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { auth } from '../data/db.js';
import { settings } from '../shared/domain.js';
import { icon } from '../shared/icons.js';
import { HOME_BY_ROLE } from '../data/db.js';

export const NAV = [['#/', 'Inicio'], ['#/especialidades', 'Especialidades'], ['#/medicos', 'Médicos'], ['#/reservar', 'Reservar'], ['#/telemedicina', 'Telemedicina'], ['#/resultados', 'Resultados'], ['#/mi-hora', 'Mi hora']];

export function header(el) {
  const s = settings(), u = auth.current();
  const portalHref = u ? (u.role === 'paciente' ? '#/portal' : HOME_BY_ROLE[u.role]) : '#/portal';
  el.innerHTML = `
    ${s.announcement ? `<div class="announce">${escape(s.announcement)}</div>` : ''}
    <div class="container bar">
      <a class="brand" href="#/"><span class="logo">${icon('heart', 20)}</span><span>${escape(s.name)}<small>${escape(s.tagline)}</small></span></a>
      <button class="btn btn-icon btn-ghost nav-toggle" aria-label="Abrir menú" aria-expanded="false">${icon('menu')}</button>
      <nav class="site-nav" aria-label="Principal">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
      <div class="header-cta">
        <a class="btn btn-ghost btn-sm" href="${portalHref}" title="${u ? escape(u.name) : 'Portal paciente'}">${u ? `<span class="avatar" style="--size:24px;--av:${u.color || 'var(--primary)'}">${escape(initials(u.name))}</span>` : icon('user', 18)}<span class="hide-sm">${u ? (u.role === 'paciente' ? 'Mi portal' : 'Mi panel') : 'Ingresar'}</span></a>
        <a class="btn btn-primary btn-sm hide-sm" href="#/reservar">${icon('calendar', 16)} Reservar hora</a>
      </div>
    </div>`;
  const t = el.querySelector('.nav-toggle');
  t.onclick = () => { const o = el.classList.toggle('open'); t.setAttribute('aria-expanded', o); };
  el.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => el.classList.remove('open')));
  fitHeader(el);
}

// Si el menú no cabe (fuentes anchas de algunos estilos), se colapsa en el botón ☰.
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
    <div><a class="brand" href="#/"><span class="logo">${icon('heart', 20)}</span><span>${escape(s.name)}</span></a>
      <p style="margin-top:12px">${escape(s.address)}<br>${escape(s.hours)}</p>
      <p>${icon('phone', 16)} ${escape(s.phone)} · ${icon('mail', 16)} ${escape(s.email)}</p></div>
    <div><h4>Pacientes</h4><a href="#/reservar">Reservar hora</a><a href="#/mi-hora">Anular o cambiar hora</a><a href="#/telemedicina">Telemedicina</a><a href="#/resultados">Resultados de exámenes</a><a href="#/portal">Portal paciente</a></div>
    <div><h4>Centro</h4><a href="#/especialidades">Especialidades</a><a href="#/medicos">Staff médico</a><a href="pantalla.html" target="_blank">Pantalla sala de espera</a></div>
    <div><h4>Equipo</h4><a href="login.html">Acceso funcionarios</a><a href="recepcion.html">Recepción</a><a href="medico.html">App médico</a><a href="admin.html">Administración</a></div>
  </div><div class="container small" style="margin-top:24px">© ${new Date().getFullYear()} ${escape(s.name)} · Sitio de demostración, datos ficticios.</div>`;
}
