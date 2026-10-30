// Filas de la portada: orden (se refleja en vivo en la app), activación y curaduría manual.
import { db } from '../data/db.js';
import { html, raw, $, toast, confirm, modal, escape } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { artCard } from '../shared/art.js';
import { GENRES } from '../data/seed.js';
import { isAvailable } from '../shared/catalog.js';

const SOURCES = { continuar: 'Continuar viendo (por perfil)', tendencias: 'Tendencias (popularidad)', nuevos: 'Recién agregados', milista: 'Mi lista (por perfil)' };
const describe = c => (c.type === 'manual' ? `Manual · ${(c.titleIds || []).length} títulos` : c.type === 'genre' ? `Género: ${c.genre}` : `Automática: ${SOURCES[c.source]}`);

export function render(el, { user }) {
  const draw = () => {
    const list = db.all('collections').sort((a, b) => a.order - b.order);
    el.innerHTML = html`${raw(pageHead('Filas de la portada', 'Ordena y cura los carruseles del inicio. Los cambios aparecen al instante en la app.', '<button class="btn btn-primary" id="new">+ Nueva fila</button>'))}
      <div class="stack" style="gap:8px">${list.map((c, i) => {
        const titles = c.type === 'manual' ? (c.titleIds || []).map(id => db.get('titles', id)).filter(Boolean) : c.type === 'genre' ? db.query('titles', t => isAvailable(t) && t.genres.includes(c.genre)) : [];
        return raw(html`<div class="card coll" style="${c.active ? '' : 'opacity:.6'}">
          <div class="handle"><button class="btn btn-icon btn-sm" data-up="${c.id}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="btn btn-icon btn-sm" data-down="${c.id}" ${i < list.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button></div>
          <div style="min-width:0"><b>${i + 1}. ${c.name}</b><br><small class="muted">${describe(c)}</small><div class="chips" style="margin-top:6px">${raw(titles.slice(0, 8).map(t => artCard(t, { title: false })).join(''))}</div></div>
          <div class="row" style="gap:6px;flex-wrap:nowrap"><label class="switch" title="Visible en la portada"><input type="checkbox" data-tog="${c.id}" ${c.active ? 'checked' : ''}><span></span></label><button class="btn btn-sm" data-edit="${c.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Eliminar">🗑</button></div></div>`);
      })}</div>`;
  };
  const move = (id, dir) => {
    const list = db.all('collections').sort((a, b) => a.order - b.order);
    const i = list.findIndex(c => c.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((c, k) => c.order !== k + 1 && db.update('collections', c.id, { order: k + 1 }));
    db.log('colecciones', `"${list[j].name}" movida a la posición ${j + 1}`, user.id);
  };
  function edit(c = null) {
    const d = c ? { ...c, titleIds: [...(c.titleIds || [])] } : { name: '', type: 'manual', titleIds: [], genre: 'Drama', source: 'tendencias', active: true };
    const all = db.all('titles').sort((a, b) => a.title.localeCompare(b.title));
    const m = modal({ title: c ? `Editar "${c.name}"` : 'Nueva fila', size: 'lg', body: `<form class="stack" id="cf" novalidate>
      <div class="grid-2"><div class="field"><label for="c-name">Nombre visible</label><input class="input" id="c-name" value="${escape(d.name)}"></div>
      <div class="field"><label for="c-type">Tipo</label><select class="select" id="c-type"><option value="manual">Manual (elige títulos)</option><option value="genre">Por género</option><option value="auto">Automática</option></select></div></div>
      <div class="field" data-for="genre"><label for="c-genre">Género</label><select class="select" id="c-genre">${GENRES.map(g => `<option ${d.genre === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field" data-for="auto"><label for="c-src">Fuente</label><select class="select" id="c-src">${Object.entries(SOURCES).map(([k, l]) => `<option value="${k}" ${d.source === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field" data-for="manual"><span class="label">Títulos (en orden de selección)</span><div class="row" style="gap:6px;max-height:260px;overflow:auto" id="c-titles">${all.map(t => `<button type="button" class="chip ${d.titleIds.includes(t.id) ? 'active' : ''}" data-t="${t.id}">${escape(t.title)}</button>`).join('')}</div><small class="muted" id="c-count"></small></div>
    </form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="c-save">Guardar</button>' });
    const type = m.el.querySelector('#c-type'); type.value = d.type;
    const sync = () => { m.el.querySelectorAll('[data-for]').forEach(f => (f.hidden = f.dataset.for !== type.value)); m.el.querySelector('#c-count').textContent = `${d.titleIds.length} seleccionados`; };
    type.onchange = sync; sync();
    m.el.querySelector('#c-titles').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; const id = b.dataset.t; d.titleIds = d.titleIds.includes(id) ? d.titleIds.filter(x => x !== id) : [...d.titleIds, id]; b.classList.toggle('active'); sync(); };
    m.el.querySelector('#c-save').onclick = () => {
      d.name = m.el.querySelector('#c-name').value.trim(); d.type = type.value; d.genre = m.el.querySelector('#c-genre').value; d.source = m.el.querySelector('#c-src').value;
      if (!d.name) return toast('Ponle un nombre a la fila', 'warning');
      if (d.type === 'manual' && !d.titleIds.length) return toast('Elige al menos un título', 'warning');
      const row = { name: d.name, type: d.type, titleIds: d.type === 'manual' ? d.titleIds : [], genre: d.type === 'genre' ? d.genre : '', source: d.type === 'auto' ? d.source : '' };
      if (c) db.update('collections', c.id, row); else db.insert('collections', { ...row, active: true, order: db.count('collections') + 1 });
      db.log('colecciones', `${c ? 'Editada' : 'Creada'} la fila "${d.name}"`, user.id); toast('Fila guardada', 'success'); m.close();
    };
  }
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'new') edit();
    if (b.dataset.up) move(b.dataset.up, -1);
    if (b.dataset.down) move(b.dataset.down, 1);
    if (b.dataset.edit) edit(db.get('collections', b.dataset.edit));
    if (b.dataset.del) { const c = db.get('collections', b.dataset.del); if (await confirm(`¿Eliminar la fila "${c.name}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('collections', c.id); db.log('colecciones', `Eliminada "${c.name}"`, user.id); toast('Fila eliminada'); } }
  });
  el.addEventListener('change', e => { const t = e.target.closest('[data-tog]'); if (t) { const c = db.update('collections', t.dataset.tog, { active: t.checked }); toast(`"${c.name}" ${c.active ? 'visible' : 'oculta'}`); } });
  draw();
  return { update: draw };
}
