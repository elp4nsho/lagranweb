// Portafolio: CRUD de proyectos con categorías, destacados, galería e indicadores.
import { escape, toast, confirm, date, slug, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, table, actBtn, f, readForm, validate, badge } from '../shared/admin-kit.js';
import { art, artPicker, wireArtPickers, pickArtFields, readArt, PALETTE, SHAPES } from '../shared/art.js';

const catName = id => db.get('categories', id)?.name || id;

function list(el, ctx) {
  const cats = db.all('categories');
  el.innerHTML = `${pageHead('Proyectos', `${db.count('projects')} proyectos · ${db.count('projects', p => p.featured)} destacados en portada`, '<button class="btn" data-cats>Categorías</button><a class="btn btn-primary" href="#/proyectos/nuevo">＋ Nuevo proyecto</a>')}<div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    id: 'projects', rows: db.all('projects'), sort: 'order', search: p => `${p.title} ${p.client} ${p.summary}`,
    filters: [
      { key: 'category', label: 'Categoría', options: cats.map(c => [c.id, c.name]) },
      { key: 'published', label: 'Estado', options: [['true', 'Publicado'], ['false', 'Oculto']], test: (p, v) => String(!!p.published) === v },
      { key: 'featured', label: 'Destacado', options: [['true', 'Sí'], ['false', 'No']], test: (p, v) => String(!!p.featured) === v }
    ],
    columns: [
      { key: 'order', label: '#' },
      { key: 'title', label: 'Proyecto', render: p => `<div class="cell-main"><span class="thumb">${art(p.art, { ratio: '4/3' })}</span><span><b>${escape(p.title)}</b><small>${escape(p.client)}</small></span></div>` },
      { key: 'category', label: 'Categoría', value: p => catName(p.category), render: p => `<span class="badge plain">${escape(catName(p.category))}</span>` },
      { key: 'year', label: 'Año' },
      { key: 'featured', label: 'Destacado', render: p => `<button class="btn btn-sm btn-ghost btn-icon" data-act="star" aria-label="Destacar" title="Destacar en portada">${p.featured ? '★' : '☆'}</button>` },
      { key: 'published', label: 'Estado', render: p => badge(p.published ? 'pub' : 'hid', { pub: ['Publicado', 'success'], hid: ['Oculto', ''] }) }
    ],
    actions: () => actBtn('view', 'Ver en sitio', '↗') + actBtn('edit', 'Editar', '✎') + actBtn('dup', 'Duplicar', '⧉') + actBtn('del', 'Eliminar', '🗑'),
    onRow: p => ctx.go(`/proyectos/${p.id}`),
    onAction: async (a, p) => {
      if (a === 'edit') ctx.go(`/proyectos/${p.id}`);
      if (a === 'view') window.open(`index.html#/trabajos/${p.slug}`, '_blank');
      if (a === 'star') { db.update('projects', p.id, { featured: !p.featured }); db.log('proyecto', `${p.featured ? 'Quitó de' : 'Marcó como'} destacado “${p.title}”`, ctx.user.id); toast(p.featured ? 'Quitado de destacados' : 'Destacado en portada', 'success'); }
      if (a === 'dup') { const { id, createdAt, ...rest } = p; db.insert('projects', { ...rest, title: p.title + ' (copia)', slug: p.slug + '-copia-' + Date.now().toString(36).slice(-3), published: false, featured: false, order: db.count('projects') + 1 }); toast('Proyecto duplicado como oculto', 'success'); }
      if (a === 'del' && await confirm(`¿Eliminar “${p.title}”? Esta acción no se puede deshacer.`, { danger: true, ok: 'Eliminar' })) { db.remove('projects', p.id); db.log('proyecto', `Eliminó el proyecto “${p.title}”`, ctx.user.id); toast('Proyecto eliminado', 'success'); }
    },
    csv: { name: 'proyectos', map: p => ({ titulo: p.title, cliente: p.client, categoria: catName(p.category), anio: p.year, destacado: p.featured ? 'sí' : 'no', publicado: p.published ? 'sí' : 'no' }) }
  });
  el.querySelector('[data-cats]').onclick = () => categories(ctx);
}

async function categories(ctx) {
  const cats = db.all('categories');
  const v = await formModal({
    title: 'Categorías del portafolio', submit: 'Guardar categorías',
    fields: [...cats.map(c => ({ name: 'c_' + c.id, label: `${c.name} (${db.count('projects', p => p.category === c.id)} proyectos)`, value: c.name, required: true })), { name: 'nueva', label: 'Nueva categoría (opcional)', value: '' }]
  });
  if (!v) return;
  cats.forEach(c => { if (v['c_' + c.id] !== c.name) db.update('categories', c.id, { name: v['c_' + c.id] }); });
  if (v.nueva) db.insert('categories', { id: slug(v.nueva), name: v.nueva });
  db.log('categoría', 'Actualizó las categorías del portafolio', ctx.user.id);
  toast('Categorías guardadas', 'success');
}

function editor(el, ctx, id) {
  const isNew = id === 'nuevo';
  const p = isNew ? { title: '', client: '', category: 'branding', year: new Date().getFullYear(), summary: '', challenge: '', solution: '', services: [], tags: [], results: [{ label: '', value: '' }], published: false, featured: false, art: { c1: 'primary', c2: 'accent', shape: 'orbit', seed: Date.now() % 97 }, gallery: [], icon: '✦' } : db.get('projects', id);
  if (!p) { el.innerHTML = `<div class="card empty"><h2>Proyecto no encontrado</h2><a class="btn" href="#/proyectos">Volver</a></div>`; return; }
  let gallery = structuredClone(p.gallery || []);
  const cats = db.all('categories');
  el.innerHTML = `${pageHead(isNew ? 'Nuevo proyecto' : p.title, `<a href="#/proyectos">← Proyectos</a>${isNew ? '' : ` · creado ${date(p.createdAt)}`}`, `${isNew ? '' : `<a class="btn" href="index.html#/trabajos/${escape(p.slug)}" target="_blank" rel="noopener">↗ Ver en sitio</a>`}<button class="btn btn-primary" data-save>Guardar</button>`)}
    <form class="detail-grid" data-f novalidate>
      <div class="stack">
        <div class="card stack"><h3>Información</h3>
          <div class="grid-2">${f.text('title', 'Título', p.title, { required: true })}${f.text('client', 'Cliente', p.client, { required: true })}</div>
          <div class="grid-3">${f.select('category', 'Categoría', cats.map(c => [c.id, c.name]), p.category)}${f.text('year', 'Año', p.year, { type: 'number' })}${f.text('icon', 'Ícono', p.icon)}</div>
          ${f.text('slug', 'URL amigable (slug)', p.slug || '', { help: 'Se genera desde el título si lo dejas vacío.' })}
          ${f.area('summary', 'Resumen', p.summary, { required: true, rows: 2 })}
          ${f.area('challenge', 'El desafío', p.challenge, { rows: 4 })}
          ${f.area('solution', 'Nuestra respuesta', p.solution, { rows: 4 })}
          <div class="grid-2">${f.text('services', 'Servicios (coma)', (p.services || []).join(', '))}${f.text('tags', 'Etiquetas (coma)', (p.tags || []).join(', '))}</div>
        </div>
        <div class="card stack"><div class="card-head"><h3>Resultados</h3><button type="button" class="btn btn-sm" data-add-res>＋ Indicador</button></div>
          <div class="stack" data-res>${(p.results || []).map(r => resRow(r)).join('')}</div></div>
        <div class="card stack"><div class="card-head"><h3>Galería</h3><button type="button" class="btn btn-sm" data-add-g>＋ Agregar imagen</button></div><div class="gallery-edit" data-gal></div></div>
      </div>
      <div class="stack">
        <div class="card stack"><h3>Publicación</h3>${f.sw('published', 'Publicado en el sitio', p.published)}${f.sw('featured', 'Destacado en portada', p.featured)}${f.text('order', 'Orden', p.order || db.count('projects') + 1, { type: 'number' })}</div>
        <div class="card stack"><h3>Portada</h3>${artPicker('art', p.art)}<button type="button" class="btn btn-sm" data-shuffle>⟳ Variar composición</button></div>
        ${isNew ? '' : `<div class="card"><button type="button" class="btn btn-danger btn-block" data-del>Eliminar proyecto</button></div>`}
      </div>
    </form>`;
  const form = el.querySelector('[data-f]');
  wireArtPickers(form);
  const drawGal = () => {
    form.querySelector('[data-gal]').innerHTML = gallery.length ? gallery.map((g, i) => `<div class="g-item">${art(g, { ratio: '4/3' })}<small class="muted">${escape(g.caption || '')}</small><button type="button" class="btn btn-sm btn-icon btn-danger" data-rm-g="${i}" aria-label="Quitar imagen">✕</button></div>`).join('') : '<p class="muted small">Sin imágenes. Agrega al menos una.</p>';
  };
  drawGal();
  form.addEventListener('click', async e => {
    if (e.target.closest('[data-add-res]')) form.querySelector('[data-res]').insertAdjacentHTML('beforeend', resRow({ label: '', value: '' }));
    if (e.target.closest('[data-rm-res]')) e.target.closest('[data-rrow]').remove();
    const rm = e.target.closest('[data-rm-g]'); if (rm) { gallery.splice(+rm.dataset.rmG, 1); drawGal(); }
    if (e.target.closest('[data-shuffle]')) { form.querySelector('[name="art_seed"]').value = Math.floor(Math.random() * 999); form.querySelector('[name="art_c1"]').dispatchEvent(new Event('change', { bubbles: true })); }
    if (e.target.closest('[data-add-g]')) {
      const v = await formModal({ title: 'Agregar imagen a la galería', fields: [
        { name: 'caption', label: 'Pie de foto', value: 'Aplicaciones', required: true },
        { name: 'c1', label: 'Color 1', type: 'select', options: PALETTE, value: PALETTE[gallery.length % 6] },
        { name: 'c2', label: 'Color 2', type: 'select', options: PALETTE, value: PALETTE[(gallery.length + 3) % 6] },
        { name: 'shape', label: 'Composición', type: 'select', options: SHAPES, value: SHAPES[gallery.length % SHAPES.length] }] });
      if (v) { gallery.push({ ...v, seed: Math.floor(Math.random() * 999) }); drawGal(); }
    }
    if (e.target.closest('[data-del]') && await confirm(`¿Eliminar “${p.title}”?`, { danger: true, ok: 'Eliminar' })) { db.remove('projects', p.id); db.log('proyecto', `Eliminó “${p.title}”`, ctx.user.id); toast('Proyecto eliminado', 'success'); ctx.go('/proyectos'); }
  });
  const save = () => {
    if (!validate(form)) return;
    const v = readForm(form);
    const artV = pickArtFields(v, 'art');
    const results = [...form.querySelectorAll('[data-rrow]')].map(r => ({ label: r.querySelector('[data-l]').value.trim(), value: r.querySelector('[data-v]').value.trim() })).filter(r => r.label);
    Object.keys(v).filter(k => k.startsWith('rl') || k.startsWith('rv')).forEach(k => delete v[k]);
    const data = { ...v, slug: slug(v.slug || v.title), art: artV, results, gallery, services: v.services.split(',').map(s => s.trim()).filter(Boolean), tags: v.tags.split(',').map(s => s.trim()).filter(Boolean) };
    const clash = db.find('projects', x => x.slug === data.slug && x.id !== p.id);
    if (clash) data.slug += '-' + Date.now().toString(36).slice(-3);
    if (isNew) { const row = db.insert('projects', data); db.log('proyecto', `Creó el proyecto “${data.title}”`, ctx.user.id); toast('Proyecto creado', 'success'); ctx.go(`/proyectos/${row.id}`); }
    else { db.update('projects', p.id, data); db.log('proyecto', `Editó el proyecto “${data.title}”`, ctx.user.id); toast('Proyecto guardado y publicado', 'success'); ctx.refresh(); }
  };
  el.querySelector('[data-save]').onclick = save;
  form.onsubmit = e => { e.preventDefault(); save(); };
}
const resRow = r => `<div class="repeat-row r3" data-rrow style="grid-template-columns:1fr 140px auto"><div class="field"><label>Indicador</label><input class="input" data-l name="rl${Math.random().toString(36).slice(2, 6)}" value="${escape(r.label)}"></div><div class="field"><label>Valor</label><input class="input" data-v name="rv${Math.random().toString(36).slice(2, 6)}" value="${escape(r.value)}"></div><button type="button" class="btn btn-ghost btn-icon" data-rm-res aria-label="Quitar">✕</button></div>`;

export default {
  id: 'projects', path: '/proyectos', label: 'Proyectos', icon: '◧', group: 'Contenido', perm: 'projects', live: true,
  render(el, ctx, params) {
    this.live = !params.id;
    params.id ? editor(el, ctx, params.id) : list(el, ctx);
  }
};
