// CMS de la carta: platos (CRUD + agotado en vivo), categorías y grupos de modificadores, con traducciones.
import { money, escape, modal, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { STATIONS, TAGS, TONES } from '../shared/logic.js';

const catName = id => db.get('categories', id)?.name.es || '—';
const art = d => `<span class="dish-art xs" data-tone="${escape(d.tone || 'primary')}" aria-hidden="true"><span>${escape(d.emoji || '🍽️')}</span></span>`;

function dishForm(d, ctx) {
  const isNew = !d;
  d = d || { name: { es: '', en: '' }, desc: { es: '', en: '' }, cat: db.all('categories')[0]?.id, price: 9900, station: 'caliente', prepMin: 12, emoji: '🍽️', tone: 'warning', tags: [], mods: [], available: true, popular: false, hidden: false, cost: 0 };
  const cats = db.all('categories').sort((a, b) => a.order - b.order);
  const groups = db.all('modGroups');
  const f = document.createElement('form');
  f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `
    <div class="row" style="gap:14px;align-items:flex-start;flex-wrap:nowrap"><div data-prev>${art(d).replace('xs', 'md')}</div>
      <div class="grid-2 grow">
        <div class="field"><label for="df-es">Nombre (ES) *</label><input class="input" id="df-es" name="nameEs" value="${escape(d.name.es)}" required></div>
        <div class="field"><label for="df-en">Nombre (EN)</label><input class="input" id="df-en" name="nameEn" value="${escape(d.name.en)}"></div>
      </div></div>
    <div class="grid-2">
      <div class="field"><label for="df-des">Descripción (ES)</label><textarea class="textarea" id="df-des" name="descEs">${escape(d.desc.es)}</textarea></div>
      <div class="field"><label for="df-den">Descripción (EN)</label><textarea class="textarea" id="df-den" name="descEn">${escape(d.desc.en)}</textarea></div>
    </div>
    <div class="grid-3">
      <div class="field"><label for="df-cat">Categoría</label><select class="select" id="df-cat" name="cat">${cats.map(c => `<option value="${c.id}" ${c.id === d.cat ? 'selected' : ''}>${escape(c.icon + ' ' + c.name.es)}</option>`).join('')}</select></div>
      <div class="field"><label for="df-price">Precio (CLP) *</label><input class="input" id="df-price" name="price" type="number" min="0" step="100" value="${d.price}" required></div>
      <div class="field"><label for="df-cost">Costo estimado</label><input class="input" id="df-cost" name="cost" type="number" min="0" step="10" value="${d.cost || 0}"></div>
      <div class="field"><label for="df-st">Estación de cocina</label><select class="select" id="df-st" name="station">${Object.entries(STATIONS).map(([k, v]) => `<option value="${k}" ${k === d.station ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="df-prep">Tiempo de preparación (min)</label><input class="input" id="df-prep" name="prepMin" type="number" min="1" value="${d.prepMin}"></div>
      <div class="field"><label for="df-emoji">Ícono (emoji)</label><input class="input" id="df-emoji" name="emoji" value="${escape(d.emoji)}" maxlength="4"></div>
      <div class="field"><label for="df-tone">Color de ilustración</label><select class="select" id="df-tone" name="tone">${TONES.map(t => `<option value="${t}" ${t === d.tone ? 'selected' : ''}>${{ primary: 'Primario', accent: 'Acento', success: 'Verde', warning: 'Ámbar', info: 'Azul', danger: 'Rojo' }[t]}</option>`).join('')}</select></div>
    </div>
    <fieldset class="fs"><legend>Etiquetas dietarias</legend><div class="row">${Object.entries(TAGS).map(([k, g]) => `<label class="check"><input type="checkbox" name="tag" value="${k}" ${d.tags.includes(k) ? 'checked' : ''}> ${g.icon} ${g.es}</label>`).join('')}</div></fieldset>
    <fieldset class="fs"><legend>Grupos de modificadores</legend><div class="row">${groups.map(g => `<label class="check"><input type="checkbox" name="mod" value="${g.id}" ${d.mods.includes(g.id) ? 'checked' : ''}> ${escape(g.name.es)} <small class="muted">(${g.type === 'single' ? 'uno' : 'varios'}${g.required ? ', obligatorio' : ''})</small></label>`).join('')}</div></fieldset>
    <div class="row">
      <label class="check"><input type="checkbox" name="available" ${d.available !== false ? 'checked' : ''}> Disponible (desmarcar = agotado)</label>
      <label class="check"><input type="checkbox" name="popular" ${d.popular ? 'checked' : ''}> Favorito de la casa</label>
      <label class="check"><input type="checkbox" name="hidden" ${d.hidden ? 'checked' : ''}> Ocultar de la carta</label>
    </div>`;
  const m = modal({ title: isNew ? 'Nuevo plato' : `Editar · ${d.name.es}`, size: 'lg', body: f, foot: `${isNew ? '' : '<button class="btn btn-danger" data-del>Eliminar</button><span class="grow"></span>'}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>` });
  f.addEventListener('input', () => { f.querySelector('[data-prev]').innerHTML = art({ emoji: f.emoji.value, tone: f.tone.value }).replace('xs', 'md'); });
  const save = e => {
    e && e.preventDefault();
    const nameEs = f.nameEs.value.trim(), price = Number(f.price.value);
    f.nameEs.classList.toggle('invalid', !nameEs); f.price.classList.toggle('invalid', !(price > 0));
    if (!nameEs || !(price > 0)) { toast('Completa nombre y precio', 'warning'); return; }
    const data = {
      name: { es: nameEs, en: f.nameEn.value.trim() || nameEs }, desc: { es: f.descEs.value.trim(), en: f.descEn.value.trim() || f.descEs.value.trim() },
      cat: f.cat.value, price, cost: Number(f.cost.value) || 0, station: f.station.value, prepMin: Number(f.prepMin.value) || 10, emoji: f.emoji.value.trim() || '🍽️', tone: f.tone.value,
      tags: [...f.querySelectorAll('[name=tag]:checked')].map(i => i.value), mods: [...f.querySelectorAll('[name=mod]:checked')].map(i => i.value),
      available: f.available.checked, popular: f.popular.checked, hidden: f.elements.hidden.checked
    };
    if (isNew) { db.insert('dishes', { ...data, recipe: [] }); db.log('carta', `Plato creado: ${nameEs}`, ctx.user.id); }
    else {
      if (d.price !== price) db.log('carta', `Precio de ${nameEs}: ${money(d.price)} → ${money(price)}`, ctx.user.id);
      db.update('dishes', d.id, data); db.log('carta', `Plato editado: ${nameEs}`, ctx.user.id);
    }
    toast('Plato guardado', 'success'); m.close();
  };
  f.addEventListener('submit', save);
  m.el.querySelector('[data-save]').onclick = save;
  m.el.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!await confirm(`¿Eliminar "${d.name.es}" de la carta?`, { danger: true, ok: 'Eliminar' })) return;
    db.remove('dishes', d.id); db.log('carta', `Plato eliminado: ${d.name.es}`, ctx.user.id); toast('Plato eliminado', 'success'); m.close();
  });
}

function renderDishes(box, ctx) {
  const tbl = smartTable(box, {
    rows: () => db.all('dishes').map(d => ({ ...d, nameEs: d.name.es, catLabel: catName(d.cat), margin: d.price ? Math.round((1 - (d.cost || 0) / d.price) * 100) : 0 })),
    filters: [
      { key: 'cat', label: 'Categoría', options: db.all('categories').sort((a, b) => a.order - b.order).map(c => [c.id, c.name.es]) },
      { key: 'available', label: 'Disponibilidad', options: [['true', 'Disponibles'], ['false', 'Agotados']], test: (r, v) => String(r.available !== false) === v },
      { key: 'station', label: 'Estación', options: Object.entries(STATIONS) },
      { key: 'tag', label: 'Etiqueta', options: Object.entries(TAGS).map(([k, g]) => [k, g.es]), test: (r, v) => r.tags.includes(v) }
    ],
    actions: '<button class="btn btn-primary btn-sm" data-new>+ Nuevo plato</button>',
    search: r => `${r.name.es} ${r.name.en} ${r.desc.es}`,
    columns: [
      { key: 'nameEs', label: 'Plato', render: r => `<span class="row nowrap" style="gap:10px">${art(r)}<span><b>${escape(r.name.es)}</b><small class="muted d-block">${escape(r.name.en)}${r.hidden ? ' · oculto' : ''}${r.popular ? ' · ★' : ''}</small></span></span>` },
      { key: 'catLabel', label: 'Categoría' },
      { key: 'price', label: 'Precio', render: r => `<b>${money(r.price)}</b>` },
      { key: 'margin', label: 'Margen', render: r => `<span class="${r.margin < 60 ? 'text-warning' : ''}">${r.margin}%</span>` },
      { key: 'station', label: 'Estación', render: r => `<small>${escape(STATIONS[r.station] || '')}</small>` },
      { key: 'tags', label: 'Etiquetas', sort: false, render: r => r.tags.map(k => TAGS[k]?.icon || '').join(' ') || '<span class="muted">—</span>' },
      { key: 'available', label: 'Disponible', render: r => `<label class="switch" title="${r.available !== false ? 'Disponible' : 'Agotado'}"><input type="checkbox" data-avail="${r.id}" ${r.available !== false ? 'checked' : ''} aria-label="Disponible ${escape(r.name.es)}"><span></span></label>` }
    ],
    onRow: r => dishForm(db.get('dishes', r.id), ctx),
    csv: { name: 'carta', map: r => ({ id: r.id, nombre: r.name.es, nombre_en: r.name.en, categoria: r.catLabel, precio: r.price, costo: r.cost, estacion: r.station, etiquetas: r.tags.join(','), disponible: r.available !== false ? 'sí' : 'agotado' }) }
  });
  box.addEventListener('click', e => { if (e.target.closest('[data-new]')) dishForm(null, ctx); });
  box.addEventListener('change', e => {
    const s = e.target.closest('[data-avail]'); if (!s) return;
    const d = db.get('dishes', s.dataset.avail);
    db.update('dishes', d.id, { available: s.checked });
    db.log('carta', `${d.name.es} ${s.checked ? 'disponible nuevamente' : 'marcado como AGOTADO'}`, ctx.user.id);
    toast(`${d.name.es}: ${s.checked ? 'disponible' : 'agotado'} (visible en la carta al instante)`, s.checked ? 'success' : 'warning');
  });
  return tbl;
}

function renderCats(box, ctx) {
  const paint = () => {
    const cats = db.all('categories').sort((a, b) => a.order - b.order);
    box.innerHTML = `<div class="row table-tools"><span class="muted small">Ordena con las flechas: así aparecen en la carta.</span><span class="grow"></span><button class="btn btn-primary btn-sm" data-newcat>+ Nueva categoría</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Orden</th><th>Categoría</th><th>Inglés</th><th>Platos</th><th>Visible</th><th></th></tr></thead><tbody>
      ${cats.map((c, i) => `<tr><td class="nowrap"><button class="btn btn-icon btn-sm btn-ghost" data-up="${c.id}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="btn btn-icon btn-sm btn-ghost" data-down="${c.id}" ${i < cats.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button></td>
        <td><b>${escape(c.icon)} ${escape(c.name.es)}</b></td><td>${escape(c.name.en)}</td><td>${db.count('dishes', d => d.cat === c.id)}</td>
        <td><label class="switch"><input type="checkbox" data-catact="${c.id}" ${c.active !== false ? 'checked' : ''} aria-label="Visible"><span></span></label></td>
        <td class="nowrap"><button class="btn btn-sm" data-editcat="${c.id}">Editar</button> <button class="btn btn-sm btn-ghost" data-delcat="${c.id}">Eliminar</button></td></tr>`).join('')}
      </tbody></table></div>`;
  };
  const edit = async c => {
    const v = await formModal({ title: c ? 'Editar categoría' : 'Nueva categoría', fields: [
      { name: 'es', label: 'Nombre (ES)', required: true, value: c?.name.es }, { name: 'en', label: 'Nombre (EN)', value: c?.name.en }, { name: 'icon', label: 'Ícono (emoji)', value: c?.icon || '🍽️' }] });
    if (!v) return;
    const data = { name: { es: v.es, en: v.en || v.es }, icon: v.icon || '🍽️' };
    if (c) db.update('categories', c.id, data); else db.insert('categories', { ...data, order: db.count('categories') + 1, active: true });
    db.log('carta', `Categoría ${c ? 'editada' : 'creada'}: ${v.es}`, ctx.user.id); toast('Categoría guardada', 'success'); paint();
  };
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.newcat != null) return edit(null);
    if (b.dataset.editcat) return edit(db.get('categories', b.dataset.editcat));
    if (b.dataset.up || b.dataset.down) {
      const cats = db.all('categories').sort((a, b2) => a.order - b2.order);
      const i = cats.findIndex(c => c.id === (b.dataset.up || b.dataset.down)), j = b.dataset.up ? i - 1 : i + 1;
      [cats[i], cats[j]] = [cats[j], cats[i]];
      cats.forEach((c, k) => db.update('categories', c.id, { order: k + 1 }));
      paint(); return;
    }
    if (b.dataset.delcat) {
      const c = db.get('categories', b.dataset.delcat), n = db.count('dishes', d => d.cat === c.id);
      if (n) { toast(`No se puede eliminar: tiene ${n} platos. Muévelos u ocúltala.`, 'warning'); return; }
      if (await confirm(`¿Eliminar la categoría "${c.name.es}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('categories', c.id); db.log('carta', `Categoría eliminada: ${c.name.es}`, ctx.user.id); paint(); }
    }
  });
  box.addEventListener('change', e => { const s = e.target.closest('[data-catact]'); if (s) { db.update('categories', s.dataset.catact, { active: s.checked }); toast(s.checked ? 'Categoría visible' : 'Categoría oculta de la carta', 'success'); } });
  paint();
  return { refresh: paint };
}

function modForm(g, ctx, done) {
  const isNew = !g;
  g = g || { name: { es: '', en: '' }, type: 'single', required: false, options: [{ id: 'o1', es: '', en: '', price: 0 }] };
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  const optRow = o => `<div class="opt-row" data-oid="${escape(o.id)}"><input class="input" placeholder="Opción (ES)" value="${escape(o.es)}" data-k="es" aria-label="Opción ES"><input class="input" placeholder="Option (EN)" value="${escape(o.en)}" data-k="en" aria-label="Opción EN"><input class="input" type="number" step="100" min="0" value="${o.price}" data-k="price" aria-label="Precio extra"><button type="button" class="btn btn-icon btn-sm btn-ghost" data-rm aria-label="Quitar">✕</button></div>`;
  f.innerHTML = `<div class="grid-2"><div class="field"><label for="mg-es">Nombre (ES) *</label><input class="input" id="mg-es" name="es" value="${escape(g.name.es)}"></div><div class="field"><label for="mg-en">Nombre (EN)</label><input class="input" id="mg-en" name="en" value="${escape(g.name.en)}"></div></div>
    <div class="row"><label class="check"><input type="radio" name="type" value="single" ${g.type === 'single' ? 'checked' : ''}> Elegir una</label><label class="check"><input type="radio" name="type" value="multi" ${g.type === 'multi' ? 'checked' : ''}> Elegir varias</label><label class="check"><input type="checkbox" name="required" ${g.required ? 'checked' : ''}> Obligatorio</label></div>
    <div class="stack" style="gap:8px"><span class="label">Opciones (nombre ES / EN / precio extra)</span><div class="stack" style="gap:8px" data-opts>${g.options.map(optRow).join('')}</div><button type="button" class="btn btn-sm" data-addopt>+ Agregar opción</button></div>`;
  const m = modal({ title: isNew ? 'Nuevo grupo de modificadores' : 'Editar modificadores', size: 'lg', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>' });
  f.addEventListener('click', e => {
    if (e.target.closest('[data-addopt]')) f.querySelector('[data-opts]').insertAdjacentHTML('beforeend', optRow({ id: 'o' + Date.now().toString(36), es: '', en: '', price: 0 }));
    if (e.target.closest('[data-rm]')) e.target.closest('.opt-row').remove();
  });
  m.el.querySelector('[data-save]').onclick = () => {
    const options = [...f.querySelectorAll('.opt-row')].map(r => ({ id: r.dataset.oid, es: r.querySelector('[data-k=es]').value.trim(), en: r.querySelector('[data-k=en]').value.trim(), price: Number(r.querySelector('[data-k=price]').value) || 0 })).filter(o => o.es).map(o => ({ ...o, en: o.en || o.es }));
    if (!f.es.value.trim() || !options.length) { toast('Indica nombre y al menos una opción', 'warning'); return; }
    const data = { name: { es: f.es.value.trim(), en: f.en.value.trim() || f.es.value.trim() }, type: f.querySelector('[name=type]:checked').value, required: f.elements.required.checked, options };
    if (isNew) db.insert('modGroups', data); else db.update('modGroups', g.id, data);
    db.log('carta', `Modificadores ${isNew ? 'creados' : 'editados'}: ${data.name.es}`, ctx.user.id);
    toast('Grupo guardado', 'success'); m.close(); done();
  };
}

function renderMods(box, ctx) {
  const paint = () => {
    const groups = db.all('modGroups');
    box.innerHTML = `<div class="row table-tools"><span class="muted small">Se asignan a los platos desde su ficha.</span><span class="grow"></span><button class="btn btn-primary btn-sm" data-newmod>+ Nuevo grupo</button></div>
      <div class="grid-auto">${groups.map(g => `<div class="card stack"><div class="row between"><b>${escape(g.name.es)}</b><span class="badge ${g.required ? 'badge-warning' : ''} plain">${g.type === 'single' ? 'Una opción' : 'Varias'}${g.required ? ' · obligatorio' : ''}</span></div>
        <small class="muted">${escape(g.name.en)} · usado en ${db.count('dishes', d => d.mods.includes(g.id))} platos</small>
        <ul class="mini-list">${g.options.map(o => `<li>${escape(o.es)} ${o.price ? `<small class="muted">+${money(o.price)}</small>` : ''}</li>`).join('')}</ul>
        <div class="row"><button class="btn btn-sm" data-editmod="${g.id}">Editar</button><button class="btn btn-sm btn-ghost" data-delmod="${g.id}">Eliminar</button></div></div>`).join('')}</div>`;
  };
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.newmod != null) modForm(null, ctx, paint);
    if (b.dataset.editmod) modForm(db.get('modGroups', b.dataset.editmod), ctx, paint);
    if (b.dataset.delmod) {
      const g = db.get('modGroups', b.dataset.delmod);
      if (!await confirm(`¿Eliminar "${g.name.es}"? Se quitará de los platos que lo usan.`, { danger: true, ok: 'Eliminar' })) return;
      db.all('dishes').filter(d => d.mods.includes(g.id)).forEach(d => db.update('dishes', d.id, { mods: d.mods.filter(x => x !== g.id) }));
      db.remove('modGroups', g.id); db.log('carta', `Modificadores eliminados: ${g.name.es}`, ctx.user.id); paint();
    }
  });
  paint();
  return { refresh: paint };
}

export default {
  id: 'carta', label: 'Carta', icon: '📖', group: 'Contenido', roles: ['admin', 'chef'], watch: ['dishes', 'categories', 'modGroups'],
  render(el, ctx) {
    const tab = ctx.params.sub || 'platos';
    const out = db.count('dishes', d => d.available === false);
    el.innerHTML = `${pageHead('Carta', `${db.count('dishes')} platos · ${out} agotados · los cambios se ven al instante en la carta de las mesas`, '<a class="btn btn-sm" href="index.html#/carta" target="_blank" rel="noopener">Ver carta pública ↗</a>')}
      <div class="tabs"><a class="tab ${tab === 'platos' ? 'active' : ''}" href="#/carta/platos">Platos</a><a class="tab ${tab === 'categorias' ? 'active' : ''}" href="#/carta/categorias">Categorías</a><a class="tab ${tab === 'modificadores' ? 'active' : ''}" href="#/carta/modificadores">Modificadores</a></div>
      <div data-tab></div>`;
    const box = el.querySelector('[data-tab]');
    return tab === 'categorias' ? renderCats(box, ctx) : tab === 'modificadores' ? renderMods(box, ctx) : renderDishes(box, ctx);
  }
};
