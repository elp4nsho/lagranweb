// Búsqueda con filtros (marca, modelo, año, precio, km, transmisión, combustible, carrocería, región), orden, comparador.
import { money, escape, toast, debounce, norm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { MODELS, BRANDS, REGIONS, BODIES, FUELS, TRANS } from '../data/catalog.js';
import { isVisible, compareGet, compareSet, branchById, kmFmt, inspectionSummary, carName } from '../shared/domain.js';
import { carArt } from '../shared/car-art.js';
import { carCard } from './cards.js';

// Casillas "Comparar" + bandeja flotante (abajo a la derecha).
export function wireCompare(el) {
  const tray = document.createElement('div');
  tray.className = 'compare-tray'; el.appendChild(tray);
  const paint = () => {
    const ids = compareGet().filter(id => db.get('cars', id));
    tray.hidden = !ids.length;
    tray.innerHTML = `<span class="small"><b>${ids.length}</b> de 3 para comparar</span><a class="btn btn-sm btn-primary" href="#/comparar">Comparar</a><button class="btn btn-sm btn-ghost" data-cmpclear aria-label="Limpiar comparador">✕</button>`;
  };
  el.addEventListener('change', e => {
    const c = e.target.closest('[data-cmp]'); if (!c) return;
    let ids = compareGet();
    if (c.checked) { if (ids.length >= 3) { c.checked = false; toast('Puedes comparar hasta 3 autos', 'warning'); return; } ids = [...ids, c.dataset.cmp]; } else ids = ids.filter(x => x !== c.dataset.cmp);
    compareSet(ids); paint();
  });
  tray.addEventListener('click', e => { if (e.target.closest('[data-cmpclear]')) { compareSet([]); el.querySelectorAll('[data-cmp]').forEach(x => { x.checked = false; }); paint(); } });
  paint();
}

const SORTS = { relevancia: ['Destacados', (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.publishedAt.localeCompare(a.publishedAt)], precioAsc: ['Menor precio', (a, b) => a.price - b.price], precioDesc: ['Mayor precio', (a, b) => b.price - a.price], kmAsc: ['Menos kilómetros', (a, b) => a.km - b.km], anioDesc: ['Más nuevos', (a, b) => b.year - a.year], recientes: ['Recién publicados', (a, b) => b.publishedAt.localeCompare(a.publishedAt)] };

export function renderSearch(el, _p, q = {}) {
  const f = { q: q.q || '', brand: q.brand || '', model: q.model || '', ymin: q.ymin || '', ymax: q.ymax || '', pmin: q.pmin || '', pmax: q.pmax || '', kmax: q.kmax || '', trans: q.trans || '', fuel: q.fuel || '', body: q.body || '', region: q.region || '', sort: q.sort || 'relevancia' };
  let limit = 12;
  const sel = (id, label, opts, val) => `<div class="field"><label for="f-${id}">${label}</label><select class="select" id="f-${id}" name="${id}"><option value="">Todos</option>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${escape(v)}" ${String(val) === String(v) ? 'selected' : ''}>${escape(l)}</option>`; }).join('')}</select></div>`;
  const models = () => MODELS.filter(m => !f.brand || m.brand === f.brand).map(m => m.model);
  el.innerHTML = `<section class="section" style="padding-top:28px"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Stock certificado</span><h1 style="margin:0">Autos usados certificados</h1></div><button class="btn btn-sm filters-toggle" data-ftoggle>⚙️ Filtros</button></div>
    <div class="search-layout">
      <form class="card stack filters" id="flt" role="search" novalidate>
        <h3 style="margin:0">Filtrar</h3>
        <div class="field"><label for="f-q">Buscar</label><input class="input" type="search" id="f-q" name="q" placeholder="Ej: Hilux 4x4, híbrido…" value="${escape(f.q)}"></div>
        ${sel('brand', 'Marca', BRANDS, f.brand)}<div data-models>${sel('model', 'Modelo', [...new Set(models())], f.model)}</div>
        <div class="grid-2">${sel('ymin', 'Año desde', Array.from({ length: 11 }, (_, i) => 2014 + i), f.ymin)}${sel('ymax', 'Año hasta', Array.from({ length: 11 }, (_, i) => 2024 - i), f.ymax)}</div>
        <div class="grid-2">${sel('pmin', 'Precio desde', [4, 8, 12, 16, 20, 25].map(v => [v * 1e6, money(v * 1e6)]), f.pmin)}${sel('pmax', 'Precio hasta', [8, 12, 16, 20, 25, 30, 40].map(v => [v * 1e6, money(v * 1e6)]), f.pmax)}</div>
        ${sel('kmax', 'Kilometraje máximo', [30000, 60000, 90000, 120000].map(v => [v, kmFmt(v)]), f.kmax)}
        ${sel('trans', 'Transmisión', TRANS, f.trans)}${sel('fuel', 'Combustible', FUELS, f.fuel)}${sel('body', 'Carrocería', Object.entries(BODIES).filter(([k]) => ['sedan', 'hatch', 'suv', 'pickup'].includes(k)), f.body)}${sel('region', 'Región', REGIONS.slice(0, 4), f.region)}
        <div class="row"><button type="button" class="btn btn-sm btn-ghost" data-clear>Limpiar filtros</button></div>
      </form>
      <div><div class="results-head"><b data-count></b><div class="row" style="gap:8px"><label class="small muted" for="f-sort">Ordenar</label><select class="select sm" id="f-sort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <div class="car-grid" data-results></div><div class="row" style="justify-content:center;margin-top:16px"><button class="btn" data-more hidden>Ver más autos</button></div></div>
    </div></div></section>`;
  const form = el.querySelector('#flt');
  const results = () => {
    const list = db.query('cars', isVisible).filter(c => {
      const b = branchById(c.branchId);
      if (f.q && !norm(`${c.brand} ${c.model} ${c.version} ${c.fuel} ${c.body} ${(c.equipment || []).join(' ')}`).includes(norm(f.q))) return false;
      return (!f.brand || c.brand === f.brand) && (!f.model || c.model === f.model) && (!f.ymin || c.year >= +f.ymin) && (!f.ymax || c.year <= +f.ymax) && (!f.pmin || c.price >= +f.pmin) && (!f.pmax || c.price <= +f.pmax)
        && (!f.kmax || c.km <= +f.kmax) && (!f.trans || c.transmission === f.trans) && (!f.fuel || c.fuel === f.fuel) && (!f.body || c.body === f.body) && (!f.region || b?.region === f.region);
    });
    return list.sort(SORTS[f.sort]?.[1] || SORTS.relevancia[1]);
  };
  const paint = () => {
    const list = results();
    el.querySelector('[data-count]').textContent = `${list.length} auto${list.length === 1 ? '' : 's'} encontrado${list.length === 1 ? '' : 's'}`;
    el.querySelector('[data-results]').innerHTML = list.slice(0, limit).map(c => carCard(c)).join('') || '<div class="card empty stack"><span style="font-size:40px">🔍</span>No hay autos con esos filtros.<button class="btn btn-sm" data-clear>Limpiar filtros</button></div>';
    el.querySelector('[data-more]').hidden = list.length <= limit;
    const qs = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && !(k === 'sort' && v === 'relevancia')));
    history.replaceState(null, '', '#/autos' + (qs.toString() ? '?' + qs : ''));
  };
  form.addEventListener('change', e => {
    const t = e.target; if (!t.name || t.name === 'q') return;
    f[t.name] = t.value; limit = 12;
    if (t.name === 'brand') { f.model = ''; el.querySelector('[data-models]').innerHTML = sel('model', 'Modelo', [...new Set(models())], ''); }
    paint();
  });
  form.querySelector('#f-q').addEventListener('input', debounce(e => { f.q = e.target.value.trim(); limit = 12; paint(); }, 200));
  form.onsubmit = e => e.preventDefault();
  el.querySelector('#f-sort').onchange = e => { f.sort = e.target.value; paint(); };
  el.addEventListener('click', e => {
    if (e.target.closest('[data-clear]')) { location.hash = '#/autos?x=' + Date.now(); }
    if (e.target.closest('[data-more]')) { limit += 12; paint(); }
    if (e.target.closest('[data-ftoggle]')) form.classList.toggle('open');
  });
  wireCompare(el);
  paint();
  return { refresh: paint };
}

export function renderCompare(el) {
  const paint = () => {
    const cars = compareGet().map(id => db.get('cars', id)).filter(Boolean);
    const avail = db.query('cars', c => isVisible(c) && !cars.includes(c));
    const rows = [
      ['Precio', c => money(c.price), c => -c.price], ['Año', c => c.year, c => c.year], ['Kilometraje', c => kmFmt(c.km), c => -c.km], ['Puntaje certificación', c => { const s = c.inspectionId && inspectionSummary(db.get('inspections', c.inspectionId)); return s ? s.score + '%' : '—'; }, c => { const s = c.inspectionId && inspectionSummary(db.get('inspections', c.inspectionId)); return s ? s.score : 0; }],
      ['Potencia', c => c.hp + ' CV', c => c.hp], ['Transmisión', c => c.transmission], ['Combustible', c => c.fuel], ['Carrocería', c => BODIES[c.body]], ['Motor', c => c.engine], ['Dueños anteriores', c => c.owners, c => -c.owners],
      ['Sucursal', c => branchById(c.branchId)?.name], ['Equipamiento', c => `${(c.equipment || []).length} ítems`, c => (c.equipment || []).length]
    ];
    el.innerHTML = `<section class="section"><div class="container stack">
      <div class="sec-head"><div><span class="eyebrow">Comparador</span><h1 style="margin:0">Compara hasta 3 autos</h1></div><a class="btn btn-sm" href="#/autos">← Volver a la búsqueda</a></div>
      ${cars.length < 3 && avail.length ? `<div class="row"><label for="cmp-add" class="small">Agregar auto</label><select class="select sm" id="cmp-add"><option value="">Elige un auto…</option>${avail.map(c => `<option value="${c.id}">${escape(carName(c))} ${c.year} · ${money(c.price)}</option>`).join('')}</select></div>` : ''}
      ${cars.length ? `<div class="table-wrap"><table class="table cmp-table"><thead><tr><th></th>${cars.map(c => `<th style="min-width:180px"><div style="max-width:200px">${carArt({ body: c.body, color: c.color })}</div><a href="#/auto/${c.id}">${escape(carName(c))}</a><br><small class="muted">${escape(c.version)}</small><br><button class="btn btn-sm btn-ghost" data-rm="${c.id}">Quitar</button></th>`).join('')}</tr></thead>
        <tbody>${rows.map(([l, v, score]) => { const best = score && cars.length > 1 ? Math.max(...cars.map(score)) : null; return `<tr><td><b>${l}</b></td>${cars.map(c => `<td class="${best != null && score(c) === best ? 'best' : ''}">${escape(String(v(c) ?? '—'))}${best != null && score(c) === best ? ' ★' : ''}</td>`).join('')}</tr>`; }).join('')}
        <tr><td></td>${cars.map(c => `<td><a class="btn btn-sm btn-primary" href="#/auto/${c.id}">Ver detalle</a></td>`).join('')}</tr></tbody></table></div>` : '<div class="card empty">Marca “Comparar” en los autos que te interesen, o agrégalos aquí arriba.</div>'}
    </div></section>`;
  };
  el.addEventListener('change', e => { if (e.target.id === 'cmp-add' && e.target.value) { compareSet([...compareGet(), e.target.value].slice(0, 3)); paint(); } });
  el.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { compareSet(compareGet().filter(x => x !== b.dataset.rm)); paint(); } });
  paint();
  return { refresh: paint };
}
