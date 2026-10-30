// Sitio público: contenido editable desde el CMS del panel (se actualiza en vivo con db.subscribe).
import { escape, num } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { site, modulesSorted, certStatus, planModules } from '../data/model.js';
import { mountHeader } from '../shared/brand.js';

const ICONS = {
  plant: '<path d="M5 30 20 8l15 22zM14 30v-7h12v7"/>',
  epp: '<path d="M8 22a12 12 0 0 1 24 0zM5 22h30v3H5zM20 10v6"/>',
  quiz: '<path d="M10 5h20v30H10zM15 14l3 3 6-6M15 25h10"/>',
  route: '<path d="M6 32h28M10 32V20a10 10 0 0 1 20 0v12M20 4v4M32 10l-3 3M8 10l3 3"/>',
  guide: '<path d="M20 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM8 34c1-7 6-11 12-11s11 4 12 11"/>'
};
const iconFor = m => m.mode === 'epp' ? ICONS.epp : m.mode === 'quiz' ? ICONS.quiz : m.route ? ICONS.route : m.id === 'bienvenida' ? ICONS.guide : ICONS.plant;

mountHeader(document.getElementById('site-header'), {
  links: [{ href: '#modulos', label: 'Módulos' }, { href: '#programas', label: 'Planes' }, { href: '#beneficios', label: 'Beneficios' }, { href: '#verificar', label: 'Verificar certificado' }]
});

function render() {
  const s = site();
  document.querySelectorAll('[data-cms]').forEach(el => { el.textContent = s[el.dataset.cms] ?? ''; });
  document.getElementById('announce').innerHTML = s.announcementOn && s.announcement ? `<div class="announce"><div class="container"><span aria-hidden="true">📣</span><span>${escape(s.announcement)}</span></div></div>` : '';
  const mods = modulesSorted().filter(m => m.active !== false);
  const certs = db.all('certificates');
  const certified = new Set(certs.filter(c => ['vigente', 'por_vencer'].includes(certStatus(c))).map(c => c.userId)).size;
  document.getElementById('hero-stats').innerHTML = [
    [mods.length, 'módulos interactivos'], [`~${mods.reduce((t, m) => t + (+m.minutes || 0), 0)}`, 'minutos en total'], [num(certified), 'personas certificadas'], ['0', 'instalaciones']
  ].map(([v, l]) => `<li><strong>${escape(v)}</strong><span>${escape(l)}</span></li>`).join('');
  document.getElementById('mods').innerHTML = mods.map((m, i) => `<article class="card hover mod-card">
      <svg class="ico" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconFor(m)}</svg>
      <span class="num">MÓDULO ${String(i + 1).padStart(2, '0')}</span><h3>${escape(m.title)}</h3><p>${escape(m.desc)}</p>
      <div class="tags"><span class="badge plain">${escape(m.minutes)} min</span>${(m.tags || []).map((t, k) => `<span class="badge ${k ? 'badge-warning' : 'badge-primary'}">${escape(t)}</span>`).join('')}</div>
    </article>`).join('');
  document.getElementById('plans').innerHTML = db.query('plans', p => p.active !== false).map(p => {
    const pm = planModules(p);
    return `<article class="card plan-card">
      <span class="code">${escape(p.code)} · vigencia ${escape(p.validityMonths)} meses</span>
      <h3 style="margin:0">${escape(p.name)}</h3><p class="muted" style="margin:0">${escape(p.description)}</p>
      <ol>${pm.map(m => `<li>${escape(m.title)}</li>`).join('')}</ol>
      <div class="tags"><span class="badge badge-info">${pm.reduce((t, m) => t + (+m.minutes || 0), 0)} min</span><span class="badge plain">${p.types.map(t => t === 'empleado' ? 'Personal propio' : 'Contratistas').join(' y ')}</span>${p.practical ? '<span class="badge badge-warning">Eval. práctica</span>' : ''}</div>
    </article>`;
  }).join('');
  document.getElementById('footer').innerHTML = `<p><b>Minera Altiplano</b> · ${escape(s.faena)}<br>Empresa ficticia creada como demo de portafolio.</p><p>Contacto: <a href="mailto:${escape(s.contactEmail)}">${escape(s.contactEmail)}</a> · ${escape(s.contactPhone)}<br><a href="verificar.html">Verificar certificado</a> · <a href="login.html">Ingresar</a></p>`;
}
render();
db.subscribe(render);

document.getElementById('verify-form').addEventListener('submit', e => {
  e.preventDefault();
  const code = e.target.code.value.trim().toUpperCase();
  if (code) location.href = `verificar.html?c=${encodeURIComponent(code)}`;
});

const xr = document.getElementById('xr-status');
if (!('xr' in navigator) || !window.isSecureContext) xr.textContent = 'Tu navegador actual no expone WebXR: podrás usar el modo 3D con mouse o pantalla táctil. En Meta Quest, abre la plataforma desde su navegador (HTTPS).';
else navigator.xr.isSessionSupported('immersive-vr').then(ok => { xr.textContent = ok ? '✓ Dispositivo compatible con realidad virtual: verás el botón «Entrar en VR» en los módulos 3D.' : 'No se detectó un visor VR. Puedes usar el modo 3D; en Meta Quest aparecerá el botón «Entrar en VR».'; }).catch(() => { xr.textContent = 'No se pudo comprobar la compatibilidad VR. El modo 3D funciona igual.'; });
