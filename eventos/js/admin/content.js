// CMS del sitio público: hero, banner promocional, destacados y contacto. Cambios en vivo.
import { db, settings } from '../data/db.js';
import { html, raw, $, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { fmtDay } from '../shared/format.js';
import { isPast } from '../shared/inventory.js';

export function render(el, { user }) {
  const s = settings();
  const evs = db.query('events', e => e.status === 'publicado' && !isPast(e)).sort((a, b) => a.date.localeCompare(b.date));
  el.innerHTML = html`${raw(pageHead('Contenido del sitio', 'Edita la portada pública. Abre el sitio en otra pestaña para ver los cambios al instante.', '<a class="btn" href="index.html" target="_blank">Abrir sitio ↗</a>'))}
    <div class="grid-2" style="align-items:start">
      <form class="card stack" id="cms">
        <h3 style="margin:0">Portada</h3>
        <div class="field"><label for="heroTitle">Título principal</label><input class="input" id="heroTitle" value="${s.heroTitle}"></div>
        <div class="field"><label for="heroSubtitle">Bajada</label><textarea class="textarea" id="heroSubtitle">${s.heroSubtitle}</textarea></div>
        <div class="field"><label for="heroCta">Texto del botón de búsqueda</label><input class="input" id="heroCta" value="${s.heroCta}"></div>
        <h3 style="margin:8px 0 0">Banner superior</h3>
        <label class="check"><input type="checkbox" id="bannerOn" ${s.bannerOn ? 'checked' : ''}> Mostrar banner</label>
        <div class="field"><label for="banner">Texto del banner</label><input class="input" id="banner" value="${s.banner}"></div>
        <div class="field"><label for="supportEmail">Correo de ayuda (pie de página)</label><input class="input" id="supportEmail" type="email" value="${s.supportEmail}"></div>
        <button class="btn btn-primary">Publicar cambios</button>
      </form>
      <div class="card stack"><h3 style="margin:0">Eventos destacados en portada</h3><p class="muted small" style="margin:0">Se muestran hasta 6, ordenados por fecha.</p>
        <ul class="mini-list">${evs.map(e => raw(html`<li><span>${e.title}<br><small class="muted">${fmtDay(e.date)} · ${e.city}</small></span><label class="switch" title="Destacar"><input type="checkbox" data-feat="${e.id}" ${e.featured ? 'checked' : ''}><span></span></label></li>`))}</ul></div>
    </div>`;
  $('#cms').addEventListener('submit', e => {
    e.preventDefault();
    const v = Object.fromEntries(['heroTitle', 'heroSubtitle', 'heroCta', 'banner', 'supportEmail'].map(k => [k, $('#' + k).value.trim()]));
    if (!v.heroTitle) return toast('El título no puede quedar vacío', 'warning');
    db.setValue('settings', { ...settings(), ...v, bannerOn: $('#bannerOn').checked });
    db.log('contenido', `Portada actualizada: "${v.heroTitle}"`, user.id);
    toast('Contenido publicado en el sitio', 'success');
  });
  el.addEventListener('change', e => {
    const f = e.target.closest('[data-feat]'); if (!f) return;
    const ev = db.update('events', f.dataset.feat, { featured: f.checked });
    db.log('destacado', `${ev.title}: ${f.checked ? 'destacado' : 'sin destacar'}`, user.id); toast('Destacados actualizados', 'success');
  });
  return { static: true };
}
