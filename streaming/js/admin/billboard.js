// Billboard: títulos destacados en el hero del inicio (rotativo, en orden).
import { db, settings } from '../data/db.js';
import { html, raw, $, toast, escape } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { artCard } from '../shared/art.js';
import { isAvailable, metaLine } from '../shared/catalog.js';

export function render(el, { user }) {
  const draw = () => {
    const ids = settings().billboard || [];
    const sel = ids.map(id => db.get('titles', id)).filter(Boolean);
    const avail = db.query('titles', t => isAvailable(t) && !ids.includes(t.id)).sort((a, b) => b.trending - a.trending);
    el.innerHTML = html`${raw(pageHead('Billboard destacado', 'Títulos que rotan en el hero del inicio (máximo 5). El primero aparece al entrar.'))}
      <div class="grid-2" style="align-items:start">
        <div class="stack">${sel.length ? '' : raw('<div class="card empty">Sin destacados: se mostrará el título más popular.</div>')}
          ${sel.map((t, i) => raw(html`<div class="card row" style="flex-wrap:nowrap;gap:12px"><span style="width:140px;flex:none">${raw(artCard(t))}</span>
            <div style="flex:1;min-width:0"><b>${i + 1}. ${t.title}</b><br><small class="muted">${metaLine(t)}</small>${isAvailable(t) ? '' : raw('<br><span class="badge badge-warning">No disponible: no se mostrará</span>')}</div>
            <div class="stack" style="gap:4px"><button class="btn btn-icon btn-sm" data-up="${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="btn btn-icon btn-sm" data-down="${i}" ${i < sel.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button class="btn btn-icon btn-sm btn-ghost" data-rm="${t.id}" aria-label="Quitar">✕</button></div></div>`))}</div>
        <div class="card stack"><h3 style="margin:0">Agregar título</h3>
          <select class="select" id="add" aria-label="Título"><option value="">Elige un título disponible…</option>${avail.map(t => raw(`<option value="${t.id}">${escape(t.title)} (${t.type})</option>`))}</select>
          <button class="btn btn-primary" id="addBtn" ${sel.length >= 5 ? 'disabled' : ''}>Agregar al billboard</button>
          <a class="btn btn-ghost" href="app.html" target="_blank">Ver resultado en la app ↗</a></div>
      </div>`;
  };
  const saveIds = (ids, msg) => { db.setValue('settings', { ...settings(), billboard: ids }); db.log('destacado', msg, user.id); toast('Billboard actualizado', 'success'); };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const ids = [...(settings().billboard || [])];
    if (b.dataset.up) { const i = +b.dataset.up; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; saveIds(ids, `Billboard reordenado: ${db.get('titles', ids[0])?.title} primero`); }
    if (b.dataset.down) { const i = +b.dataset.down; [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; saveIds(ids, 'Billboard reordenado'); }
    if (b.dataset.rm) saveIds(ids.filter(x => x !== b.dataset.rm), `Quitado del billboard: ${db.get('titles', b.dataset.rm)?.title}`);
    if (b.id === 'addBtn') { const id = $('#add').value; if (!id) return toast('Elige un título', 'warning'); saveIds([...ids, id], `Billboard: agregado ${db.get('titles', id)?.title}`); }
  });
  draw();
  return { update: draw };
}
