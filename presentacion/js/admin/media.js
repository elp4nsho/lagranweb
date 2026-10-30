// Biblioteca de medios: ilustraciones generadas, carpetas, subida simulada.
import { escape, toast, confirm, date, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, formDialog, f } from '../shared/admin-kit.js';
import { art, PALETTE, SHAPES } from '../shared/art.js';

let folder = 'all', q = '';
const kb = n => (n > 1024 ? (n / 1024).toFixed(1).replace('.', ',') + ' MB' : n + ' KB');

export default {
  id: 'media', path: '/medios', label: 'Biblioteca de medios', icon: '▤', group: 'Contenido', perm: 'media',
  render(el, ctx) {
    const all = db.all('media');
    const folders = [...new Set(all.map(m => m.folder))];
    const items = all.filter(m => (folder === 'all' || m.folder === folder) && (!q || (m.name + m.alt).toLowerCase().includes(q.toLowerCase())));
    const total = all.reduce((s, m) => s + m.size, 0);
    el.innerHTML = `${pageHead('Biblioteca de medios', `${all.length} archivos · ${kb(total)} usados de 2 GB`, '<label class="btn"><input type="file" accept="image/*" multiple hidden data-upload>⇪ Subir archivos</label><button class="btn btn-primary" data-gen>✦ Generar ilustración</button>')}
      <div class="card"><div class="progress"><i style="--v:${Math.min(100, (total / (2 * 1024 * 1024)) * 100 * 20)}%"></i></div></div>
      <div class="tbl-toolbar"><input class="input tbl-search" type="search" placeholder="Buscar archivo…" value="${escape(q)}" data-q aria-label="Buscar archivo">
        <div class="row" style="gap:6px"><button class="chip ${folder === 'all' ? 'active' : ''}" data-folder="all">Todas</button>${folders.map(x => `<button class="chip ${folder === x ? 'active' : ''}" data-folder="${escape(x)}">${escape(x)} (${all.filter(m => m.folder === x).length})</button>`).join('')}</div></div>
      <div class="media-grid">${items.map(m => `<button class="card media-item" data-id="${m.id}" aria-label="Abrir ${escape(m.name)}">${art(m.art, { ratio: '1/1' })}<span><b>${escape(m.name)}</b></span><span class="muted">${m.w}×${m.h} · ${kb(m.size)}</span></button>`).join('') || '<div class="empty" style="grid-column:1/-1">No hay archivos en esta carpeta.</div>'}</div>`;
    el.querySelector('[data-q]').oninput = e => { q = e.target.value; const pos = e.target.selectionStart; this.render(el, ctx); const i = el.querySelector('[data-q]'); i.focus(); i.setSelectionRange(pos, pos); };
    el.onclick = async e => {
      const fb = e.target.closest('[data-folder]'); if (fb) { folder = fb.dataset.folder; this.render(el, ctx); return; }
      const it = e.target.closest('[data-id]'); if (it) detail(ctx, db.get('media', it.dataset.id));
      if (e.target.closest('[data-gen]')) {
        const v = await formModal({ title: 'Generar ilustración', fields: [
          { name: 'name', label: 'Nombre del archivo', value: `ilustracion-${Date.now().toString(36).slice(-4)}.svg`, required: true },
          { name: 'folder', label: 'Carpeta', type: 'select', options: [...new Set([...folders, 'Marca'])], value: folders[0] },
          { name: 'c1', label: 'Color 1', type: 'select', options: PALETTE, value: 'primary' },
          { name: 'c2', label: 'Color 2', type: 'select', options: PALETTE, value: 'accent' },
          { name: 'shape', label: 'Composición', type: 'select', options: SHAPES, value: 'blob' },
          { name: 'alt', label: 'Texto alternativo', value: '' }] });
        if (!v) return;
        db.insert('media', { name: v.name, folder: v.folder, alt: v.alt, w: 1920, h: 1080, size: 140 + Math.floor(Math.random() * 600), art: { c1: v.c1, c2: v.c2, shape: v.shape, seed: Math.floor(Math.random() * 999) } });
        db.log('medios', `Generó ${v.name}`, ctx.user.id); toast('Ilustración agregada a la biblioteca', 'success');
      }
    };
    el.querySelector('[data-upload]').onchange = e => {
      const files = [...e.target.files];
      files.forEach((file, i) => db.insert('media', { name: file.name, folder: folder === 'all' ? 'Proyectos' : folder, alt: '', w: 1600, h: 1200, size: Math.max(1, Math.round(file.size / 1024)), art: { c1: PALETTE[i % 6], c2: PALETTE[(i + 2) % 6], shape: SHAPES[i % SHAPES.length], seed: Math.floor(Math.random() * 999) } }));
      if (files.length) { db.log('medios', `Subió ${files.length} archivo(s)`, ctx.user.id); toast(`${files.length} archivo(s) subido(s) (simulado)`, 'success'); }
    };
  }
};

function detail(ctx, m) {
  const folders = [...new Set(db.all('media').map(x => x.folder))];
  const dlg = formDialog({
    title: m.name, size: 'lg', submit: 'Guardar',
    body: `<div class="grid-2"><div>${art(m.art, { ratio: '4/3' })}<p class="small muted" style="margin-top:8px">${m.w}×${m.h} px · ${kb(m.size)} · subido ${date(m.createdAt)}</p>
      <div class="row" style="gap:8px"><button type="button" class="btn btn-sm" data-copy>Copiar URL</button><button type="button" class="btn btn-sm btn-danger" data-rm>Eliminar</button></div></div>
      <div class="stack">${f.text('name', 'Nombre', m.name, { required: true })}${f.select('folder', 'Carpeta', folders, m.folder)}${f.area('alt', 'Texto alternativo (accesibilidad)', m.alt, { rows: 3 })}</div></div>`,
    onSubmit: v => { db.update('media', m.id, v); db.log('medios', `Editó ${v.name}`, ctx.user.id); toast('Archivo actualizado', 'success'); }
  });
  dlg.el.querySelector('[data-copy]').onclick = () => { navigator.clipboard?.writeText(`/medios/${m.name}`).catch(() => {}); toast('URL copiada', 'success'); };
  dlg.el.querySelector('[data-rm]').onclick = async () => {
    if (!await confirm(`¿Eliminar ${m.name}?`, { danger: true, ok: 'Eliminar' })) return;
    dlg.close(); db.remove('media', m.id); db.log('medios', `Eliminó ${m.name}`, ctx.user.id); toast('Archivo eliminado', 'success');
  };
}
