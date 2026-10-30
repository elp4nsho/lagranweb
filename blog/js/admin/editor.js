// Editor de artículos por bloques con vista previa en vivo y flujo editorial
// borrador → revisión → programado → publicado (con permisos por rol).
import { escape, toast, confirm, slug, dateTime, debounce, ago } from '../../../assets/core/ui.js';
import { db, STATUS, rules, authorOfUser, category, author, readingTime, words } from '../data/db.js';
import { pageHead, badge, f, formDialog } from '../shared/admin-kit.js';
import { renderBlocks, BLOCK_TYPES } from '../shared/render.js';
import { art, artPicker, wireArtPickers, readArt, PALETTE, SHAPES, COLOR_NAMES, SHAPE_NAMES } from '../shared/art.js';

const newBlock = type => ({ type, text: '', ...(type === 'list' ? { items: [''] } : {}), ...(type === 'img' ? { art: { c1: PALETTE[Math.floor(Math.random() * 6)], c2: PALETTE[Math.floor(Math.random() * 6)], shape: SHAPES[Math.floor(Math.random() * 8)], seed: Math.floor(Math.random() * 999) }, caption: '' } : {}), ...(type === 'quote' ? { cite: '' } : {}) });
const toLocal = d => new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
let dirty = false;
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

function blockEditor(b, i, n, ro) {
  const dis = ro ? 'disabled' : '';
  let fields = '';
  if (['p', 'h2', 'h3', 'callout'].includes(b.type)) fields = `<textarea class="textarea" data-k="text" rows="${b.type === 'p' ? 4 : 1}" aria-label="${BLOCK_TYPES[b.type]}" placeholder="${b.type === 'p' ? 'Escribe el párrafo. Usa **negrita**, _cursiva_ o [enlace](https://…)' : 'Texto'}" ${dis}>${escape(b.text)}</textarea>`;
  if (b.type === 'quote') fields = `<textarea class="textarea" data-k="text" rows="2" aria-label="Cita" placeholder="Texto de la cita" ${dis}>${escape(b.text)}</textarea><input class="input" data-k="cite" placeholder="Autor de la cita, cargo" aria-label="Autor de la cita" value="${escape(b.cite || '')}" ${dis}>`;
  if (b.type === 'list') fields = `<textarea class="textarea" data-k="items" rows="4" aria-label="Elementos de la lista (uno por línea)" placeholder="Un elemento por línea" ${dis}>${escape((b.items || []).join('\n'))}</textarea><label class="check small"><input type="checkbox" data-k="ordered" ${b.ordered ? 'checked' : ''} ${dis}> Lista numerada</label>`;
  if (b.type === 'img') fields = `<div class="row" style="gap:10px;flex-wrap:nowrap;align-items:flex-start"><div style="width:120px;flex:none">${art(b.art, { ratio: '16/9' })}</div><div class="stack" style="gap:6px;flex:1;min-width:0">
      <input class="input" data-k="caption" placeholder="Pie de foto / crédito" aria-label="Pie de foto" value="${escape(b.caption || '')}" ${dis}>
      <div class="row" style="gap:6px">${['c1', 'c2'].map(k => `<select class="select" data-art="${k}" aria-label="Color" style="width:auto" ${dis}>${PALETTE.map(p => `<option value="${p}" ${b.art?.[k] === p ? 'selected' : ''}>${COLOR_NAMES[p]}</option>`).join('')}</select>`).join('')}<select class="select" data-art="shape" aria-label="Composición" style="width:auto" ${dis}>${SHAPES.map(p => `<option value="${p}" ${b.art?.shape === p ? 'selected' : ''}>${SHAPE_NAMES[p]}</option>`).join('')}</select></div></div></div>`;
  if (b.type === 'divider') fields = `<hr style="margin:4px 0">`;
  return `<div class="block" data-i="${i}" data-type="${b.type}">
    <div class="block-bar"><span class="badge plain">${i + 1} · ${BLOCK_TYPES[b.type]}</span>${ro ? '' : `
      <select class="select" data-change-type aria-label="Cambiar tipo de bloque" style="width:auto;min-height:32px;padding:4px 30px 4px 10px;font-size:13px">${Object.entries(BLOCK_TYPES).map(([k, l]) => `<option value="${k}" ${k === b.type ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="btn btn-sm btn-ghost btn-icon" data-b="up" ${i === 0 ? 'disabled' : ''} aria-label="Subir bloque">↑</button><button type="button" class="btn btn-sm btn-ghost btn-icon" data-b="down" ${i === n - 1 ? 'disabled' : ''} aria-label="Bajar bloque">↓</button>
      <button type="button" class="btn btn-sm btn-ghost btn-icon" data-b="dup" aria-label="Duplicar bloque">⧉</button><button type="button" class="btn btn-sm btn-ghost btn-icon" data-b="del" aria-label="Eliminar bloque">✕</button>`}</div>
    ${fields}</div>`;
}

export function renderEditor(el, ctx, id) {
  const u = ctx.user, chief = ['admin', 'editor'].includes(u.role);
  let me = authorOfUser(u);
  const isNew = id === 'nuevo';
  const src = isNew ? null : db.get('articles', id);
  if (!isNew && !src) { el.innerHTML = `<div class="card empty"><h2>Artículo no encontrado</h2><a class="btn" href="#/articulos">Volver</a></div>`; return; }
  const a = src ? structuredClone(src) : { title: '', dek: '', categoryId: 'politica', tags: [], authorId: me?.id || 'a-redaccion', status: 'draft', premium: false, breaking: false, featured: false, cover: { c1: 'primary', c2: 'info', shape: 'wave', seed: Math.floor(Math.random() * 99) }, blocks: [newBlock('p')], publishAt: new Date(Date.now() + 3600e3).toISOString(), history: [], seoDescription: '' };
  const r = rules(u, src || a);
  const ro = !r.edit;
  dirty = false;

  const stepsOf = st => ['draft', 'review', 'scheduled', 'published'].map(s => `<span class="${s === st || (st === 'archived' && s === 'published') ? 'on' : ''}">${STATUS[s][0]}</span>`).join('→');
  const allTags = db.all('tags');

  function actions() {
    const st = a.status, out = [];
    if (r.edit) out.push(`<button class="btn" data-do="save">💾 ${isNew || st === 'draft' ? 'Guardar borrador' : 'Guardar cambios'}</button>`);
    if (r.submit) out.push(`<button class="btn btn-primary" data-do="submit">Enviar a revisión →</button>`);
    if (r.withdraw) out.push(`<button class="btn" data-do="withdraw">↩ Retirar de revisión</button>`);
    if (chief) {
      if (['draft', 'review', 'scheduled'].includes(st) || isNew) out.push(`<button class="btn btn-primary" data-do="publish">✓ ${st === 'review' ? 'Aprobar y publicar' : 'Publicar ahora'}</button>`);
      if (['draft', 'review'].includes(st) || isNew) out.push(`<button class="btn" data-do="schedule">⏱ Programar</button>`);
      if (st === 'review') out.push(`<button class="btn" data-do="return">✎ Devolver con nota</button>`);
      if (st === 'scheduled') out.push(`<button class="btn" data-do="unschedule">Cancelar programación</button>`);
      if (st === 'published') out.push(`<button class="btn" data-do="unpublish">Despublicar</button><button class="btn" data-do="archive">Archivar</button>`);
      if (st === 'archived') out.push(`<button class="btn" data-do="restore">Restaurar a borrador</button>`);
    }
    if (!isNew) out.push(`<a class="btn btn-ghost" href="index.html#/articulo/${escape(a.slug)}" target="_blank" rel="noopener">👁 Ver en sitio</a>`);
    if (r.remove && !isNew) out.push(`<button class="btn btn-danger" data-do="delete">Eliminar</button>`);
    return out.join('');
  }

  el.innerHTML = `${pageHead(isNew ? 'Nuevo artículo' : 'Editar artículo', `<a href="#/articulos">← Artículos</a> · <span data-st>${badge(a.status, STATUS)}</span> <span class="small muted" data-dirty></span>`, '')}
    ${ro ? `<div class="card editor-note"><b>Solo lectura.</b> ${u.role === 'periodista' ? (r.own ? 'Este artículo está en revisión o publicado; solo la edición puede modificarlo.' + (r.withdraw ? ' Puedes retirarlo de revisión para seguir editando.' : '') : 'Solo puedes editar tus propios borradores.') : ''}</div>` : ''}
    ${a.editorNote ? `<div class="card editor-note"><b>Nota de edición:</b> ${escape(a.editorNote)}</div>` : ''}
    <div class="editor-grid">
      <section class="stack" aria-label="Contenido">
        <div class="card stack">
          <div class="field"><label for="ed-title">Titular *</label><textarea class="textarea title-input" id="ed-title" data-m="title" rows="2" required ${ro ? 'disabled' : ''}>${escape(a.title)}</textarea></div>
          <div class="field"><label for="ed-dek">Bajada *</label><textarea class="textarea" id="ed-dek" data-m="dek" rows="2" required ${ro ? 'disabled' : ''}>${escape(a.dek)}</textarea></div>
        </div>
        <div class="blocks" data-blocks></div>
        ${ro ? '' : `<div class="add-bar" aria-label="Agregar bloque"><span class="small muted" style="align-self:center">Agregar:</span>${Object.entries(BLOCK_TYPES).map(([k, l]) => `<button type="button" class="btn btn-sm" data-add="${k}">＋ ${l}</button>`).join('')}</div>`}
      </section>
      <section class="card editor-preview" aria-label="Vista previa"><div class="card-head"><h3>Vista previa</h3><span class="badge plain" data-wc></span></div><div data-preview></div></section>
      <aside class="stack" aria-label="Publicación">
        <div class="card stack"><h3>Flujo editorial</h3><div class="wf-steps">${stepsOf(a.status)}</div>
          ${f.text('publishAt', 'Fecha de publicación / programación', toLocal(a.publishAt || Date.now()), { type: 'datetime-local', attrs: chief ? '' : 'disabled' })}
          <div class="stack" style="gap:8px" data-actions>${actions()}</div></div>
        <div class="card stack"><h3>Metadatos</h3>
          ${f.select('categoryId', 'Sección', db.all('categories').sort((x, y) => x.order - y.order).map(c => [c.id, c.name]), a.categoryId)}
          <div class="field"><label for="fd-authorId">Autor</label><select class="select" id="fd-authorId" name="authorId" ${r.chooseAuthor ? '' : 'disabled'}>${db.all('authors').map(x => `<option value="${x.id}" ${x.id === a.authorId ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="fd-tags">Etiquetas (coma)</label><input class="input" id="fd-tags" name="tags" list="tag-list" value="${escape((a.tags || []).join(', '))}"><datalist id="tag-list">${allTags.map(t => `<option value="${escape(t.id)}">`).join('')}</datalist></div>
          ${f.text('slug', 'URL (slug)', a.slug || '', { help: 'Se genera desde el titular si lo dejas vacío.' })}
          ${f.area('seoDescription', 'Descripción SEO', a.seoDescription || '', { rows: 2 })}
          ${f.sw('premium', '★ Premium (muro de pago)', a.premium)}
          ${chief ? f.sw('breaking', 'Último minuto (ticker)', a.breaking) + f.sw('featured', 'Destacado en portada', a.featured) : ''}
        </div>
        <div class="card stack"><h3>Imagen principal</h3>${artPicker('cover', a.cover)}</div>
        <div class="card"><h3>Historial</h3><ul class="history">${(a.history || []).slice().reverse().map(h => `<li><b>${escape(h.action)}</b><br><span class="muted">${escape(db.get('users', h.user)?.name || 'Sistema')} · ${ago(h.at)}</span>${h.note ? `<br><i>“${escape(h.note)}”</i>` : ''}</li>`).join('') || '<li class="muted">Sin movimientos aún.</li>'}</ul></div>
      </aside>
    </div>`;

  const side = el.querySelector('aside');
  if (ro) side.querySelectorAll('input, select, textarea').forEach(i => (i.disabled = true));
  wireArtPickers(side);
  const blocksEl = el.querySelector('[data-blocks]'), prevEl = el.querySelector('[data-preview]');

  const drawBlocks = () => { blocksEl.innerHTML = a.blocks.map((b, i) => blockEditor(b, i, a.blocks.length, ro)).join('') || '<p class="muted card">Sin bloques. Agrega uno abajo.</p>'; };
  const meta = () => {
    const g = n => side.querySelector(`[name="${n}"]`);
    a.categoryId = g('categoryId').value; a.authorId = g('authorId').value;
    a.tags = g('tags').value.split(',').map(t => slug(t.trim())).filter(Boolean);
    a.slug = g('slug').value.trim(); a.seoDescription = g('seoDescription').value.trim();
    a.premium = g('premium').checked; if (chief) { a.breaking = g('breaking').checked; a.featured = g('featured').checked; }
    a.cover = readArt(side, 'cover');
    const pa = g('publishAt').value; if (pa) a.publishAt = new Date(pa).toISOString();
  };
  const preview = () => {
    meta();
    const c = category(a.categoryId), au = author(a.authorId);
    el.querySelector('[data-wc]').textContent = `${words(a)} palabras · ${readingTime(a)} min`;
    prevEl.innerHTML = `<span class="kicker" style="--kc:var(--${escape(c?.color || 'primary')})">${escape(c?.name || '')}</span>${a.premium ? ' <span class="badge badge-warning plain">★ Premium</span>' : ''}
      <h2 style="margin:6px 0">${escape(a.title || 'Titular del artículo')}</h2><p class="article-dek" style="font-size:1em">${escape(a.dek || 'Bajada…')}</p>
      <p class="small muted">Por ${escape(au?.name || '—')} · ${readingTime(a)} min de lectura</p>${art(a.cover, { ratio: '16/9' })}<div class="prose" style="margin-top:14px">${renderBlocks(a.blocks)}</div>`;
  };
  const markDirty = () => { if (ro) return; dirty = true; el.querySelector('[data-dirty]').textContent = '· cambios sin guardar'; };
  const livePrev = debounce(preview, 120);
  drawBlocks(); preview();

  el.querySelectorAll('[data-m]').forEach(t => t.addEventListener('input', () => { a[t.dataset.m] = t.value; markDirty(); livePrev(); }));
  side.addEventListener('input', () => { markDirty(); livePrev(); });
  side.addEventListener('change', () => { markDirty(); livePrev(); });

  blocksEl.addEventListener('input', e => {
    const blk = e.target.closest('[data-i]'); if (!blk) return;
    const b = a.blocks[+blk.dataset.i], k = e.target.dataset.k;
    if (k === 'items') b.items = e.target.value.split('\n'); else if (k === 'ordered') b.ordered = e.target.checked; else if (k) b[k] = e.target.value;
    markDirty(); livePrev();
  });
  blocksEl.addEventListener('change', e => {
    const blk = e.target.closest('[data-i]'); if (!blk) return;
    const i = +blk.dataset.i, b = a.blocks[i];
    if (e.target.matches('[data-k="ordered"]')) { b.ordered = e.target.checked; }
    if (e.target.dataset.art) { b.art = { ...b.art, [e.target.dataset.art]: e.target.value }; drawBlocks(); }
    if (e.target.matches('[data-change-type]')) {
      const t = e.target.value, text = b.text || (b.items || []).join(' ');
      a.blocks[i] = { ...newBlock(t), text: t === 'list' ? '' : text, ...(t === 'list' ? { items: text ? text.split(/(?<=\.)\s+/) : [''] } : {}) };
      drawBlocks();
    }
    markDirty(); preview();
  });
  blocksEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-b]'); if (!btn) return;
    const i = +btn.closest('[data-i]').dataset.i, op = btn.dataset.b;
    if (op === 'up' && i > 0) [a.blocks[i - 1], a.blocks[i]] = [a.blocks[i], a.blocks[i - 1]];
    if (op === 'down' && i < a.blocks.length - 1) [a.blocks[i + 1], a.blocks[i]] = [a.blocks[i], a.blocks[i + 1]];
    if (op === 'dup') a.blocks.splice(i + 1, 0, structuredClone(a.blocks[i]));
    if (op === 'del') a.blocks.splice(i, 1);
    drawBlocks(); markDirty(); preview();
  });
  el.querySelector('.add-bar')?.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    a.blocks.push(newBlock(b.dataset.add)); drawBlocks(); markDirty(); preview();
    const last = blocksEl.lastElementChild; last?.querySelector('textarea, input')?.focus(); last?.scrollIntoView({ block: 'nearest' });
  });

  // ---------- Guardado y flujo ----------
  function validateArticle(strict) {
    const errs = [];
    if (!a.title.trim()) errs.push('el titular');
    if (strict && !a.dek.trim()) errs.push('la bajada');
    if (strict && !a.blocks.some(b => (b.text || '').trim() || (b.items || []).some(Boolean))) errs.push('al menos un bloque con contenido');
    el.querySelector('#ed-title').classList.toggle('invalid', !a.title.trim());
    el.querySelector('#ed-dek').classList.toggle('invalid', strict && !a.dek.trim());
    if (errs.length) { toast(`Falta ${errs.join(', ')}`, 'warning'); return false; }
    return true;
  }
  function persist(patch, action, note) {
    meta();
    if (!me && u.role === 'periodista') { me = db.insert('authors', { name: u.name, slug: slug(u.name), userId: u.id, beat: 'Periodista', bio: '', color: 'primary', twitter: '' }); a.authorId = me.id; }
    if (!r.chooseAuthor) a.authorId = me?.id || a.authorId;
    let s = slug(a.slug || a.title) || 'articulo';
    if (db.find('articles', x => x.slug === s && x.id !== src?.id)) s += '-' + Date.now().toString(36).slice(-4);
    a.slug = s;
    a.blocks = a.blocks.map(b => (b.type === 'list' ? { ...b, items: (b.items || []).map(t => t.trim()).filter(Boolean) } : b));
    a.tags.forEach(t => { if (!db.get('tags', t)) db.insert('tags', { id: t, name: t.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) }); });
    const entry = { at: new Date().toISOString(), user: u.id, action, ...(note ? { note } : {}) };
    const data = { ...a, ...patch, history: [...(a.history || []), entry] };
    delete data.id; delete data.createdAt;
    let saved;
    if (src) saved = db.update('articles', src.id, data);
    else saved = db.insert('articles', { ...data, views: 0 });
    db.log('artículo', `${action}: “${a.title}”`, u.id);
    dirty = false;
    return saved;
  }
  const done = (saved, msg, type = 'success') => { toast(msg, type); if (isNew) ctx.go(`/articulos/${saved.id}`); else ctx.refresh(); };

  el.querySelector('[data-actions]').addEventListener('click', async e => {
    const b = e.target.closest('[data-do]'); if (!b) return;
    const op = b.dataset.do;
    meta();
    if (op === 'save') { if (!validateArticle(false)) return; done(persist(isNew ? { status: 'draft' } : {}, isNew ? 'Creó el borrador' : 'Guardó cambios'), 'Guardado'); }
    if (op === 'submit') { if (!validateArticle(true)) return; done(persist({ status: 'review', editorNote: '' }, 'Envió a revisión'), 'Enviado a revisión. La edición recibirá una notificación.'); }
    if (op === 'withdraw') done(persist({ status: 'draft' }, 'Retiró de revisión'), 'Retirado de revisión', 'info');
    if (op === 'publish') { if (!validateArticle(true)) return; const now = new Date().toISOString(); done(persist({ status: 'published', publishAt: now, publishedAt: now, editorNote: '' }, a.status === 'review' ? 'Aprobó y publicó' : 'Publicó'), '¡Publicado! Ya está visible en el sitio.'); }
    if (op === 'schedule') {
      if (!validateArticle(true)) return;
      if (new Date(a.publishAt) <= new Date()) { toast('Elige una fecha futura para programar', 'warning'); side.querySelector('[name="publishAt"]').classList.add('invalid'); return; }
      done(persist({ status: 'scheduled', publishedAt: null, editorNote: '' }, `Programó para ${dateTime(a.publishAt)}`), `Programado para ${dateTime(a.publishAt)}`);
    }
    if (op === 'return') formDialog({ title: 'Devolver a borrador', submit: 'Devolver', body: f.area('note', 'Nota para el/la periodista', '', { required: true, rows: 4 }), onSubmit: v => done(persist({ status: 'draft', editorNote: v.note }, 'Devolvió a borrador', v.note), 'Devuelto con nota al autor', 'info') });
    if (op === 'unschedule') done(persist({ status: 'draft' }, 'Canceló la programación'), 'Programación cancelada', 'info');
    if (op === 'unpublish' && await confirm('El artículo dejará de verse en el sitio. ¿Despublicar?', { ok: 'Despublicar' })) done(persist({ status: 'draft', publishedAt: null }, 'Despublicó'), 'Artículo despublicado', 'info');
    if (op === 'archive' && await confirm('¿Archivar este artículo? Dejará de verse en el sitio.', { ok: 'Archivar' })) done(persist({ status: 'archived' }, 'Archivó'), 'Archivado', 'info');
    if (op === 'restore') done(persist({ status: 'draft' }, 'Restauró a borrador'), 'Restaurado a borrador');
    if (op === 'delete' && await confirm(`¿Eliminar “${a.title}”?`, { danger: true, ok: 'Eliminar' })) { dirty = false; db.remove('articles', src.id); db.log('artículo', `Eliminó “${a.title}”`, u.id); toast('Artículo eliminado', 'success'); ctx.go('/articulos'); }
  });
}
