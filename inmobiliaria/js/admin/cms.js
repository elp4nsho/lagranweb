// CMS: textos del hero, banners, propiedades destacadas y secciones visibles de la portada.
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { settings, saveSettings } from '../data/db.js';
import { mainPrice, comunaName } from '../shared/format.js';
import { pageHead, editForm } from '../shared/kit.js';

export function renderCMS(el, p, q, ctx) {
  const { db, user } = ctx, s = settings();
  const pub = db.query('properties', x => ['publicada', 'reservada'].includes(x.status));
  const feat = new Set(s.featuredIds || []);
  el.innerHTML = `${pageHead('Contenido del sitio', 'Los cambios se ven al instante en el sitio público', '<a class="btn" href="index.html" target="_blank" rel="noopener">Abrir sitio ↗</a>')}
    <div class="split">
      <form class="card stack" data-hero>
        <h3 style="margin:0">Portada (hero)</h3>
        <div class="field"><label for="h-brand">Nombre de la marca</label><input class="input" id="h-brand" name="brand" value="${escape(s.brand)}" required></div>
        <div class="field"><label for="h-t">Título principal</label><input class="input" id="h-t" name="heroTitle" value="${escape(s.heroTitle)}" required></div>
        <div class="field"><label for="h-s">Bajada</label><textarea class="textarea" id="h-s" name="heroSubtitle" style="min-height:80px">${escape(s.heroSubtitle)}</textarea></div>
        <label class="check"><input type="checkbox" name="showComunas" ${s.showComunas !== false ? 'checked' : ''}> Mostrar sección «Comunas con más oferta»</label>
        <label class="check"><input type="checkbox" name="showProjects" ${s.showProjects !== false ? 'checked' : ''}> Mostrar sección «Proyectos nuevos»</label>
        <button class="btn btn-primary">Guardar portada</button>
      </form>
      <div class="card stack"><div class="row between"><h3 style="margin:0">Banners</h3><button class="btn btn-sm btn-primary" data-bnew>+ Banner</button></div>
        ${(s.banners || []).map(b => `<div class="banner tone-${escape(b.tone)}" style="padding:12px 14px"><div style="min-width:0"><b>${escape(b.title)}</b><p>${escape(b.text)}</p><span class="small muted">${escape(b.link)}</span></div>
          <div class="row" style="gap:6px;flex-wrap:nowrap"><label class="switch" title="Activo"><input type="checkbox" data-bact="${b.id}" ${b.active ? 'checked' : ''}><span></span></label><button class="btn btn-sm btn-ghost" data-bedit="${b.id}">✎</button><button class="btn btn-sm btn-ghost" data-bdel="${b.id}">🗑</button></div></div>`).join('') || '<p class="muted">Sin banners.</p>'}
      </div>
    </div>
    <div class="card"><div class="row between"><h3 style="margin:0">Propiedades destacadas en portada</h3><span class="muted small"><b data-fc>${feat.size}</b> seleccionadas · se muestran en este orden</span></div>
      <input class="input" type="search" placeholder="Filtrar…" data-ff style="margin:12px 0;max-width:320px">
      <div class="picker" data-picker>${pub.map(x => `<label data-txt="${escape((x.code + ' ' + x.title).toLowerCase())}"><input type="checkbox" value="${x.id}" ${feat.has(x.id) ? 'checked' : ''}><span style="flex:1;min-width:0"><b class="ellipsis">${escape(x.title)}</b><span class="muted small">${escape(x.code)} · ${escape(comunaName(x.comuna))} · ${mainPrice(x)}</span></span></label>`).join('')}</div>
      <button class="btn btn-primary" style="margin-top:12px" data-fsave>Guardar destacadas</button></div>`;
  el.querySelector('[data-hero]').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (!f.brand.value.trim() || !f.heroTitle.value.trim()) return toast('Marca y título son obligatorios', 'warning');
    saveSettings({ brand: f.brand.value.trim(), heroTitle: f.heroTitle.value.trim(), heroSubtitle: f.heroSubtitle.value.trim(), showComunas: f.showComunas.checked, showProjects: f.showProjects.checked });
    db.log('cms', `${user.name} actualizó la portada`, user.id); toast('Portada publicada', 'success');
  });
  const bform = b => editForm({ title: b ? 'Editar banner' : 'Nuevo banner', size: '', values: b || { tone: 'primary', active: true, link: '#/buscar' }, fields: [
    { name: 'title', label: 'Título', required: true, full: true }, { name: 'text', label: 'Texto', type: 'textarea', full: true },
    { name: 'link', label: 'Enlace', help: 'Ej: #/proyectos o #/buscar?op=venta' }, { name: 'tone', label: 'Color', type: 'select', options: [['primary', 'Primario'], ['accent', 'Acento'], ['info', 'Info'], ['success', 'Éxito'], ['warning', 'Aviso']] },
    { name: 'active', label: 'Activo', type: 'checkbox' }] });
  const saveB = (banners, msg) => { saveSettings({ banners }); db.log('cms', `${user.name}: ${msg}`, user.id); toast(msg, 'success'); ctx.refresh(); };
  el.querySelector('[data-bnew]').onclick = async () => { const r = await bform(); if (r) saveB([...(s.banners || []), { id: 'b' + Date.now(), ...r }], 'Banner creado'); };
  el.querySelectorAll('[data-bedit]').forEach(b => b.onclick = async () => { const cur = s.banners.find(x => x.id === b.dataset.bedit); const r = await bform(cur); if (r) saveB(s.banners.map(x => x.id === cur.id ? { ...x, ...r } : x), 'Banner actualizado'); });
  el.querySelectorAll('[data-bdel]').forEach(b => b.onclick = async () => { if (await confirm('¿Eliminar banner?', { danger: true, ok: 'Eliminar' })) saveB(s.banners.filter(x => x.id !== b.dataset.bdel), 'Banner eliminado'); });
  el.querySelectorAll('[data-bact]').forEach(c => c.onchange = () => { saveSettings({ banners: settings().banners.map(x => x.id === c.dataset.bact ? { ...x, active: c.checked } : x) }); db.log('cms', `${user.name} ${c.checked ? 'activó' : 'desactivó'} un banner`, user.id); toast(c.checked ? 'Banner visible' : 'Banner oculto', 'success'); });
  el.querySelector('[data-ff]').oninput = e => { const v = e.target.value.toLowerCase(); el.querySelectorAll('[data-picker] label').forEach(l => { l.hidden = !l.dataset.txt.includes(v); }); };
  el.querySelector('[data-picker]').onchange = () => { el.querySelector('[data-fc]').textContent = el.querySelectorAll('[data-picker] input:checked').length; };
  el.querySelector('[data-fsave]').onclick = () => {
    const ids = [...el.querySelectorAll('[data-picker] input:checked')].map(i => i.value);
    if (!ids.length) return toast('Selecciona al menos una propiedad', 'warning');
    saveSettings({ featuredIds: ids }); db.log('cms', `${user.name} actualizó ${ids.length} destacadas`, user.id); toast('Destacadas actualizadas', 'success');
  };
}
