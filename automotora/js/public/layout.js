// Encabezado y pie del sitio público (clases-gancho de las 3 disposiciones).
import { escape } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { auth, HOME_BY_ROLE } from '../data/db.js';
import { settings, showrooms } from '../shared/domain.js';
import { icon } from '../shared/icons.js';

export const NAV = [['#/modelos', 'Modelos', 'car'], ['#/ofertas', 'Ofertas', 'tag'], ['#/financiamiento', 'Financiamiento', 'card'], ['#/tasacion', 'Tasación', 'swap'], ['#/test-drive', 'Test drive', 'steer'], ['#/posventa', 'Posventa', 'wrench'], ['#/sucursales', 'Sucursales', 'pin']];

export function header(el) {
  const s = settings(), u = auth.current();
  const acct = u ? (u.role === 'cliente' ? '#/cuenta' : HOME_BY_ROLE[u.role]) : 'login.html?next=index.html%23%2Fcuenta';
  el.innerHTML = `
    ${s.announcement ? `<div class="announce">${icon('megaphone', 15)} ${escape(s.announcement)}</div>` : ''}
    <div class="container bar">
      <a class="brand site-brand" href="#/"><span class="logo">${icon('car', 22)}</span><span>${escape(s.name)}<small>${escape(s.tagline)}</small></span></a>
      <button class="btn btn-icon btn-ghost nav-toggle" aria-label="Abrir menú" aria-expanded="false">${icon('menu')}</button>
      <nav class="site-nav" aria-label="Principal">${NAV.map(([h, l, i]) => `<a href="${h}"><span class="nav-ico">${icon(i, 16)}</span>${l}</a>`).join('')}</nav>
      <div class="site-actions header-cta">
        <a class="btn btn-ghost btn-sm" href="${acct}" title="${u ? escape(u.name) : 'Ingresar'}">${u ? `<span class="avatar" style="--size:24px;--av:${u.color || 'var(--primary)'}">${escape(initials(u.name))}</span>` : icon('user', 18)}<span class="hide-sm">${u ? (u.role === 'cliente' ? 'Mi cuenta' : 'Mi panel') : 'Ingresar'}</span></a>
        <a class="btn btn-primary btn-sm" href="#/cotizar">${icon('file', 16)}<span class="hide-xs">Cotizar</span></a>
      </div>
    </div>`;
  const t = el.querySelector('.nav-toggle');
  t.onclick = () => { const o = el.classList.toggle('open'); t.setAttribute('aria-expanded', o); };
  el.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => el.classList.remove('open')));
  fitHeader(el);
}

// Si el menú no cabe (fuentes anchas de algunos estilos) se colapsa en ☰.
export function fitHeader(el) {
  const bar = el.querySelector('.bar');
  if (!bar) return;
  el.classList.remove('compact');
  const lay = document.documentElement.getAttribute('data-layout');
  if (lay !== 'app' && lay !== 'revista' && bar.scrollWidth > bar.clientWidth + 1) el.classList.add('compact');
  if (!el.__fit) {
    el.__fit = true;
    const again = () => requestAnimationFrame(() => fitHeader(el));
    addEventListener('resize', again);
    addEventListener('lgw:theme', () => setTimeout(again, 60));
    addEventListener('lgw:layout', () => setTimeout(again, 60));
    document.fonts?.ready.then(again);
  }
}

export function footer(el) {
  const s = settings();
  el.innerHTML = `<div class="container cols">
    <div><a class="brand" href="#/"><span class="logo">${icon('car', 20)}</span><span>${escape(s.name)}</span></a>
      <p style="margin-top:12px">${escape(s.tagline)} · Toyota, Kia, Hyundai, Chevrolet, Mazda, BMW, Volvo y BYD.</p>
      <p>${icon('phone', 16)} ${escape(s.phone)}<br>${icon('chat', 16)} WhatsApp ${escape(s.whatsapp)}<br>${icon('mail', 16)} ${escape(s.email)}</p></div>
    <div><h4>Comprar</h4><a href="#/modelos">Modelos 0 km</a><a href="#/comparar">Comparador</a><a href="#/ofertas">Ofertas y bonos</a><a href="#/stock">Stock disponible</a><a href="#/financiamiento">Simulador de crédito</a><a href="#/tasacion">Tasa tu usado</a></div>
    <div><h4>Servicio</h4><a href="#/posventa">Agendar mantención</a><a href="#/posventa/recall">Consulta de recall</a><a href="#/posventa/garantia">Garantías</a><a href="#/posventa/repuestos">Repuestos y accesorios</a><a href="#/posventa/carroceria">Desabolladura y pintura</a></div>
    <div><h4>Sucursales</h4>${showrooms().map(r => `<a href="#/sucursales">${escape(r.city)} · ${escape(r.address.split(',')[0])}</a>`).join('')}<h4 style="margin-top:14px">Equipo</h4><a href="login.html">Acceso equipo</a><a href="vendedor.html">App ventas</a><a href="credito.html">Crédito</a><a href="posventa.html">Posventa</a><a href="admin.html">Administración</a></div>
  </div><div class="container small foot-legal">© ${new Date().getFullYear()} ${escape(s.name)} · Sitio de demostración con datos ficticios. Precios en CLP con IVA; marcas y modelos se usan solo como referencia.</div>`;
}
