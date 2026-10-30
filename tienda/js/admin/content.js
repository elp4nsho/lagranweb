// CMS: textos de la portada (hero), barra promocional e historia. Se reflejan al instante en la tienda.
import { html, raw, toast, escape } from '../../../assets/core/ui.js';
import { db, settings, saveSettings } from '../data/db.js';
import { productArt } from '../shared/art.js';
import { pageHead, log } from './common.js';

export function render(el) {
  const s = settings();
  const h = s.hero || {};
  const products = db.query('products', p => p.status === 'activo');
  el.innerHTML = html`${raw(pageHead('Contenido del sitio', 'Edita la portada de la tienda. Los cambios se publican al guardar (ábrela en otra pestaña para verlos en vivo).', '<a class="btn" href="index.html" target="_blank" rel="noopener">↗ Abrir tienda</a>'))}
    <form class="detail-grid" id="cms">
      <div class="stack">
        <div class="card stack"><h3 style="margin:0">Hero de portada</h3>
          <div class="field"><label for="c-eye">Antetítulo</label><input class="input" id="c-eye" name="eyebrow" value="${h.eyebrow}"></div>
          <div class="field"><label for="c-title">Título principal</label><input class="input" id="c-title" name="title" value="${h.title}" required></div>
          <div class="field"><label for="c-sub">Bajada</label><textarea class="textarea" id="c-sub" name="subtitle">${h.subtitle}</textarea></div>
          <div class="form-grid">
            <div class="field"><label for="c-cta">Texto del botón</label><input class="input" id="c-cta" name="cta" value="${h.cta}"></div>
            <div class="field"><label for="c-ctacat">El botón lleva a</label><select class="select" id="c-ctacat" name="ctaCategory"><option value="">Todo el catálogo</option>${db.all('categories').map(c => raw(html`<option value="${c.slug}" ${h.ctaCategory === c.slug ? 'selected' : ''}>${c.name}</option>`))}</select></div>
            <div class="field full"><label for="c-prod">Producto protagonista</label><select class="select" id="c-prod" name="productId">${products.map(p => raw(html`<option value="${p.id}" ${h.productId === p.id ? 'selected' : ''}>${p.name}</option>`))}</select></div>
          </div>
        </div>
        <div class="card stack"><h3 style="margin:0">Barra promocional</h3>
          <label class="check"><input type="checkbox" name="bannerActive" ${s.banner?.active ? 'checked' : ''}> Mostrar barra superior</label>
          <div class="field"><label for="c-ban">Texto</label><input class="input" id="c-ban" name="bannerText" value="${s.banner?.text || ''}"></div>
        </div>
        <div class="card stack"><h3 style="margin:0">Nuestra historia</h3>
          <div class="field"><label for="c-about">Texto (portada)</label><textarea class="textarea" id="c-about" name="about">${s.about}</textarea></div>
        </div>
        <div class="row"><button class="btn btn-primary btn-lg">Publicar cambios</button><button type="button" class="btn btn-ghost" data-restore>Restaurar textos originales</button></div>
      </div>
      <div class="stack" style="position:sticky;top:84px">
        <div class="card"><div class="card-head"><h3>Vista previa</h3><span class="badge badge-info">Borrador</span></div><div class="cms-preview stack" data-preview></div></div>
      </div>
    </form>`;
  const form = el.querySelector('#cms');
  const preview = () => {
    const f = form.elements;
    const p = db.get('products', f.productId.value);
    el.querySelector('[data-preview]').innerHTML = `${f.bannerActive.checked ? `<div class="promo-bar" style="margin:calc(var(--pad) * -1) calc(var(--pad) * -1) 0">${escape(f.bannerText.value)}</div>` : ''}
      <span class="eyebrow">${escape(f.eyebrow.value)}</span><h2 style="margin:0">${escape(f.title.value)}</h2><p class="muted" style="margin:0">${escape(f.subtitle.value)}</p>
      <div><span class="btn btn-primary btn-sm">${escape(f.cta.value)}</span></div>${p ? `<div class="mini-thumb" style="width:100%;height:auto;aspect-ratio:16/10">${productArt(p, p.colors[0]?.hex, { view: 2 })}</div>` : ''}`;
  };
  preview();
  form.addEventListener('input', preview);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    if (!f.title.value.trim()) return toast('El título no puede quedar vacío', 'warning');
    saveSettings({
      hero: { eyebrow: f.eyebrow.value.trim(), title: f.title.value.trim(), subtitle: f.subtitle.value.trim(), cta: f.cta.value.trim() || 'Ver colección', ctaCategory: f.ctaCategory.value, productId: f.productId.value },
      banner: { active: f.bannerActive.checked, text: f.bannerText.value.trim() },
      about: f.about.value.trim()
    });
    log('contenido', `Publicó cambios en la portada: “${f.title.value.trim()}”`);
    toast('Contenido publicado en la tienda', 'success');
  });
  el.querySelector('[data-restore]').onclick = async () => {
    const { seed } = await import('../data/seed.js');
    const orig = seed().settings;
    saveSettings({ hero: orig.hero, banner: orig.banner, about: orig.about });
    log('contenido', 'Restauró los textos originales de la portada');
    toast('Textos originales restaurados', 'info');
  };
}
