// Base de conocimiento: listado con filtros y editor con barra de formato, vista previa y publicación.
import { db } from '../data/db.js';
import { escape, date, ago, toast, confirm, dataTable } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { md, catName, userName, exportCSV } from '../shared/util.js';
import { opt } from '../shared/forms.js';
import { icon } from '../shared/icons.js';

const state = { status: '', cat: '' };
const drafts = {};

export function render(view, ctx) {
  if (ctx.params.id) return editor(view, ctx.params.id, ctx.user);
  const rows = db.query('articles', a => (!state.status || a.status === state.status) && (!state.cat || a.categoryId === state.cat))
    .map(a => ({ ...a, cat: catName(a.categoryId), useful: a.helpfulYes + a.helpfulNo ? Math.round(a.helpfulYes / (a.helpfulYes + a.helpfulNo) * 100) : 0 }));
  view.innerHTML = `${pageHead('Artículos', `${db.count('articles', a => a.status === 'publicado')} publicados · ${db.count('articles', a => a.status === 'borrador')} borradores`, `<button class="btn" data-export>${icon('upload', 16)} CSV</button><a class="btn btn-primary" href="#/articulos/nuevo">${icon('plus', 16)} Nuevo artículo</a>`)}
    <div class="card stack"><div class="row filters">${[['', 'Todos'], ['publicado', 'Publicados'], ['borrador', 'Borradores']].map(([k, l]) => `<button class="chip ${state.status === k ? 'active' : ''}" data-st="${k}">${l}</button>`).join('')}
      <select class="select select-sm" data-cat aria-label="Categoría"><option value="">Todas las categorías</option>${db.all('categories').map(c => opt(c.id, c.name, state.cat)).join('')}</select></div><div data-table></div></div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 12, search: a => `${a.title} ${a.cat} ${(a.tags || []).join(' ')}`,
    columns: [
      { key: 'title', label: 'Artículo', render: a => `<a href="#/articulos/${a.id}"><b>${escape(a.title)}</b></a>${a.featured ? ' <span class="badge badge-primary plain">destacado</span>' : ''}<br><small class="muted">${escape(a.cat)}</small>` },
      { key: 'status', label: 'Estado', render: a => `<span class="badge ${a.status === 'publicado' ? 'badge-success' : 'badge-warning'}">${a.status === 'publicado' ? 'Publicado' : 'Borrador'}</span>` },
      { key: 'views', label: 'Lecturas', render: a => a.views.toLocaleString('es-CL') },
      { key: 'useful', label: 'Útil', render: a => `${a.useful}% <small class="muted">(${a.helpfulYes}/${a.helpfulYes + a.helpfulNo})</small>` },
      { key: 'editedAt', label: 'Actualizado', render: a => ago(a.editedAt || a.createdAt) }
    ],
    onRow: a => { location.hash = `#/articulos/${a.id}`; }
  });
  view.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { state.status = b.dataset.st; render(view, ctx); });
  view.querySelector('[data-cat]').onchange = e => { state.cat = e.target.value; render(view, ctx); };
  view.querySelector('[data-export]').onclick = () => exportCSV('articulos.csv', rows.map(a => ({ titulo: a.title, categoria: a.cat, estado: a.status, lecturas: a.views, util_si: a.helpfulYes, util_no: a.helpfulNo })));
}

function editor(view, id, user) {
  const isNew = id === 'nuevo';
  const a = isNew ? { title: '', categoryId: 'cat-int', tags: [], body: 'Describe el problema y la solución.\n## Pasos\n- Primer paso\n- Segundo paso', status: 'borrador', featured: false } : db.get('articles', id);
  if (!a) { view.innerHTML = '<div class="card empty"><h2>Artículo no encontrado</h2><a class="btn" href="#/articulos">Volver</a></div>'; return; }
  const d = drafts[id] || { title: a.title, categoryId: a.categoryId, tags: (a.tags || []).join(', '), body: a.body, featured: a.featured };
  drafts[id] = d;
  view.innerHTML = `<a class="btn btn-ghost btn-sm back" href="#/articulos">${icon('back', 16)} Artículos</a>
    ${pageHead(isNew ? 'Nuevo artículo' : 'Editar artículo', isNew ? 'Se guardará como borrador hasta que lo publiques.' : `${a.status === 'publicado' ? 'Publicado' : 'Borrador'} · actualizado ${ago(a.editedAt || a.createdAt)} por ${escape(userName(a.authorId))}`, `
      ${!isNew ? `<button class="btn btn-ghost" data-del aria-label="Eliminar">${icon('trash', 16)}</button>` : ''}
      ${!isNew && a.status === 'publicado' ? `<a class="btn" href="index.html#/articulo/${a.id}" target="_blank" rel="noopener">${icon('ext', 16)} Ver público</a>` : ''}
      <button class="btn" data-save="${a.status === 'publicado' && !isNew ? 'publicado' : 'borrador'}">Guardar${a.status === 'publicado' && !isNew ? '' : ' borrador'}</button>
      ${a.status === 'publicado' && !isNew ? '<button class="btn" data-save="borrador">Despublicar</button>' : '<button class="btn btn-primary" data-save="publicado">Publicar</button>'}`)}
    <div class="editor-grid">
      <section class="card stack">
        <div class="field"><label for="ed-t">Título *</label><input class="input" id="ed-t" data-k="title" value="${escape(d.title)}"></div>
        <div class="grid-2"><div class="field"><label for="ed-c">Categoría</label><select class="select" id="ed-c" data-k="categoryId">${db.all('categories').map(c => opt(c.id, c.name, d.categoryId)).join('')}</select></div>
          <div class="field"><label for="ed-g">Etiquetas (separadas por coma)</label><input class="input" id="ed-g" data-k="tags" value="${escape(d.tags)}"></div></div>
        <label class="check"><input type="checkbox" data-k="featured" ${d.featured ? 'checked' : ''}> Destacar en la portada del centro de ayuda</label>
        <div class="field"><label for="ed-b">Contenido</label>
          <div class="toolbar row" role="toolbar" aria-label="Formato">${[['h', 'Título', '## '], ['b', 'Negrita', '**'], ['l', 'Viñeta', '- '], ['a', 'Enlace', 'link']].map(([k, l]) => `<button type="button" class="btn btn-sm btn-ghost" data-fmt="${k}" title="${l}">${{ h: 'H2', b: '<b>B</b>', l: '• Lista', a: 'Enlace' }[k]}</button>`).join('')}</div>
          <textarea class="textarea mono editor-area" id="ed-b" data-k="body">${escape(d.body)}</textarea></div>
      </section>
      <section class="card stack"><div class="row between"><h3 style="margin:0">Vista previa</h3><span class="badge plain">${escape(catName(d.categoryId))}</span></div><div class="prose" data-preview><h2>${escape(d.title || 'Sin título')}</h2>${md(d.body)}</div>
        ${!isNew ? `<hr><ul class="kv small"><li><span>Lecturas</span><b>${a.views.toLocaleString('es-CL')}</b></li><li><span>Votos útiles</span><b>${a.helpfulYes} sí · ${a.helpfulNo} no</b></li><li><span>Creado</span><b>${date(a.createdAt)}</b></li></ul>` : ''}</section>
    </div>`;
  const ta = view.querySelector('[data-k=body]');
  const preview = () => { view.querySelector('[data-preview]').innerHTML = `<h2>${escape(d.title || 'Sin título')}</h2>${md(d.body)}`; };
  view.querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => { d[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; preview(); }));
  view.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => {
    const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || 'texto';
    const k = b.dataset.fmt;
    const ins = k === 'b' ? `**${sel}**` : k === 'a' ? `[${sel}](https://fibraustral.cl)` : `\n${k === 'h' ? '## ' : '- '}${sel}`;
    ta.setRangeText(ins, s, e, 'end'); d.body = ta.value; preview(); ta.focus();
  });
  view.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    if (!d.title.trim()) { view.querySelector('[data-k=title]').classList.add('invalid'); return toast('El título es obligatorio', 'warning'); }
    const patch = { title: d.title.trim(), categoryId: d.categoryId, tags: d.tags.split(',').map(s => s.trim()).filter(Boolean), body: d.body, featured: !!d.featured, status: b.dataset.save, authorId: user.id, editedAt: new Date().toISOString() };
    delete drafts[id];
    if (isNew) { const row = db.insert('articles', { ...patch, views: 0, helpfulYes: 0, helpfulNo: 0 }); db.log('artículo', `Creó "${patch.title}" (${patch.status})`, user.id); toast(patch.status === 'publicado' ? 'Artículo publicado en el centro de ayuda' : 'Borrador guardado', 'success'); location.hash = `#/articulos/${row.id}`; }
    else { db.update('articles', id, patch); db.log('artículo', `${patch.status === 'publicado' ? (a.status === 'publicado' ? 'Actualizó' : 'Publicó') : (a.status === 'publicado' ? 'Despublicó' : 'Guardó borrador de')} "${patch.title}"`, user.id); toast(patch.status === 'publicado' ? 'Cambios publicados' : 'Guardado como borrador', 'success'); }
  });
  view.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!await confirm(`¿Eliminar "${a.title}"?`, { danger: true, ok: 'Eliminar' })) return;
    db.remove('articles', id); db.log('artículo', `Eliminó "${a.title}"`, user.id); toast('Artículo eliminado', 'success'); location.hash = '#/articulos';
  });
}
