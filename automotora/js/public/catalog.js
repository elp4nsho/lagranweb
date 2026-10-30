// Catálogo de modelos con filtros y comparador (hasta 3).
import { escape, money, norm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { showColor, activeModels, brand, model, fromPrice, maxBonus, SEGMENTS, FUELS, isGreen, stockFor, stockBadge, compareList, features } from '../shared/domain.js';
import { carOf } from '../shared/car.js';
import { modelCard, wireCompare, pageHero } from './cards.js';
import { uiGet, uiSet, nf } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const SEG_CHIPS = [['', 'Todos'], ['citycar', 'Citycar'], ['sedan', 'Sedán'], ['suv', 'SUV'], ['pickup', 'Pickup'], ['premium', 'Premium'], ['green', 'Híbridos y eléctricos']];

export function renderCatalog(el, _p, query) {
  const all = activeModels();
  const maxP = Math.ceil(Math.max(...all.map(fromPrice)) / 5e6) * 5e6;
  const f = { seg: query.seg || '', brand: query.marca || '', fuel: '', trans: '', max: maxP, q: '', sort: 'precio', stock: false, view: uiGet('catView', 'grid') };
  el.innerHTML = `${pageHero('Modelos 0 km', 'Encuentra tu próximo auto', `${all.length} modelos nuevos de ${db.count('brands', b => b.active !== false)} marcas, con stock en Santiago, Viña del Mar y Concepción.`)}
  <section class="section tight"><div class="container catalog-wrap">
    <aside class="card filters cat-filters" aria-label="Filtros">
      <div class="chips seg-chips">${SEG_CHIPS.map(([k, l]) => `<button class="chip ${f.seg === k ? 'active' : ''}" data-seg="${k}">${l}</button>`).join('')}</div>
      <div class="filter-grid">
        <div class="field"><label for="f-q">Buscar</label><input class="input" id="f-q" type="search" placeholder="Modelo o marca"></div>
        <div class="field"><label for="f-brand">Marca</label><select class="select" id="f-brand"><option value="">Todas</option>${db.query('brands', b => b.active !== false).map(b => `<option value="${b.id}" ${f.brand === b.id ? 'selected' : ''}>${escape(b.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-fuel">Motorización</label><select class="select" id="f-fuel"><option value="">Todas</option>${Object.entries(FUELS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
        <div class="field"><label for="f-trans">Transmisión</label><select class="select" id="f-trans"><option value="">Todas</option><option value="auto">Automática</option><option value="manual">Manual</option></select></div>
        <div class="field"><label for="f-max">Precio hasta <b data-maxl>${money(f.max)}</b></label><input id="f-max" type="range" min="10000000" max="${maxP}" step="1000000" value="${f.max}"></div>
        <div class="field"><label for="f-sort">Ordenar</label><select class="select" id="f-sort"><option value="precio">Precio: menor a mayor</option><option value="precio-desc">Precio: mayor a menor</option><option value="bono">Mayor bono</option><option value="nombre">Nombre</option></select></div>
      </div>
      <div class="row between filter-foot"><label class="check"><input type="checkbox" id="f-stock"> Solo con stock inmediato</label>
        <div class="row" style="gap:6px"><button class="btn btn-sm btn-icon ${f.view === 'grid' ? 'btn-primary' : 'btn-ghost'}" data-view="grid" aria-label="Ver en grilla">${icon('grid', 16)}</button><button class="btn btn-sm btn-icon ${f.view === 'list' ? 'btn-primary' : 'btn-ghost'}" data-view="list" aria-label="Ver en lista">${icon('list', 16)}</button></div></div>
    </aside>
    <div class="cat-results"><p class="muted small" data-count></p><div class="grid-3 model-grid" data-grid></div></div>
  </div></section>`;
  const grid = el.querySelector('[data-grid]');
  const draw = () => {
    let list = all.filter(m => (!f.seg || (f.seg === 'green' ? isGreen(m) : m.segment === f.seg)) && (!f.brand || m.brandId === f.brand) && (!f.fuel || m.fuel === f.fuel) && fromPrice(m) <= f.max
      && (!f.trans || m.versions.some(v => f.trans === 'manual' ? /manual/i.test(v.trans) : !/manual/i.test(v.trans)))
      && (!f.q || norm(`${brand(m.brandId)?.name} ${m.name} ${m.tagline}`).includes(norm(f.q))) && (!f.stock || stockFor(m.id).inStock.length));
    const s = { precio: (a, b) => fromPrice(a) - fromPrice(b), 'precio-desc': (a, b) => fromPrice(b) - fromPrice(a), bono: (a, b) => maxBonus(b) - maxBonus(a), nombre: (a, b) => a.name.localeCompare(b.name) }[f.sort];
    list.sort(s);
    el.querySelector('[data-count]').textContent = `${list.length} modelo${list.length === 1 ? '' : 's'} encontrados`;
    grid.className = `${f.view === 'list' ? 'model-list' : 'grid-3'} model-grid`;
    grid.innerHTML = list.map(m => modelCard(m)).join('') || `<div class="card empty">${icon('search', 36)}<p>No hay modelos con esos filtros.</p><button class="btn" data-reset>Limpiar filtros</button></div>`;
    grid.querySelector('[data-reset]')?.addEventListener('click', () => location.hash = '#/modelos');
  };
  el.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { f.seg = b.dataset.seg; el.querySelectorAll('[data-seg]').forEach(x => x.classList.toggle('active', x === b)); draw(); });
  el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { f.view = b.dataset.view; uiSet('catView', f.view); el.querySelectorAll('[data-view]').forEach(x => { x.classList.toggle('btn-primary', x === b); x.classList.toggle('btn-ghost', x !== b); }); draw(); });
  const bind = (id, k, fn = v => v) => el.querySelector(id).addEventListener('input', e => { f[k] = fn(e.target.type === 'checkbox' ? e.target.checked : e.target.value); if (k === 'max') el.querySelector('[data-maxl]').textContent = money(f.max); draw(); });
  bind('#f-q', 'q'); bind('#f-brand', 'brand'); bind('#f-fuel', 'fuel'); bind('#f-trans', 'trans'); bind('#f-max', 'max', Number); bind('#f-sort', 'sort'); bind('#f-stock', 'stock');
  el.querySelector('#f-stock').addEventListener('change', e => { f.stock = e.target.checked; draw(); });
  wireCompare(el);
  draw();
}

export function renderCompare(el) {
  const all = activeModels().sort((a, b) => (brand(a.brandId).name + a.name).localeCompare(brand(b.brandId).name + b.name));
  let ids = compareList().filter(id => model(id));
  while (ids.length < 2) { const next = all.find(m => !ids.includes(m.id) && ['corolla', 'mazda3', 'tucson'].includes(m.id)) || all.find(m => !ids.includes(m.id)); ids.push(next.id); }
  const draw = () => {
    const ms = ids.map(model);
    const vmin = m => m.versions[0], vmax = m => m.versions.at(-1);
    const best = (vals, hi = true) => { const n = vals.map(v => typeof v === 'number' ? v : NaN); const t = hi ? Math.max(...n.filter(x => !isNaN(x))) : Math.min(...n.filter(x => !isNaN(x))); return n.map(v => v === t && ms.length > 1); };
    const row = (label, vals, nums, hi = true) => { const b = nums ? best(nums, hi) : []; return `<tr><th scope="row">${label}</th>${vals.map((v, i) => `<td class="${b[i] ? 'best' : ''}">${v}</td>`).join('')}</tr>`; };
    el.innerHTML = `${pageHero('Comparador', 'Compara hasta 3 modelos', 'Precios, bonos, motorización, equipamiento y disponibilidad lado a lado. Lo mejor de cada fila queda destacado.', 'scale')}
    <section class="section tight"><div class="container stack">
      <div class="cmp-pickers">${[0, 1, 2].map(i => `<select class="select" data-slot="${i}" aria-label="Modelo ${i + 1}"><option value="">${i < 2 ? 'Elige un modelo' : '+ Agregar tercer modelo'}</option>${all.map(m => `<option value="${m.id}" ${ids[i] === m.id ? 'selected' : ''}>${escape(brand(m.brandId).name)} ${escape(m.name)}</option>`).join('')}</select>`).join('')}</div>
      <div class="table-wrap"><table class="table cmp-table"><thead><tr><th></th>${ms.map(m => `<th><div class="cmp-art">${carOf(m, showColor(m).hex)}</div><span class="eyebrow">${escape(brand(m.brandId).name)}</span><br><b class="cmp-name">${escape(m.name)}</b></th>`).join('')}</tr></thead><tbody>
        ${row('Precio desde', ms.map(m => money(fromPrice(m))), ms.map(fromPrice), false)}
        ${row('Bonos vigentes', ms.map(m => maxBonus(m) ? money(maxBonus(m)) : '—'), ms.map(maxBonus))}
        ${row('Precio con bonos', ms.map(m => `<b>${money(fromPrice(m) - maxBonus(m))}</b>`), ms.map(m => fromPrice(m) - maxBonus(m)), false)}
        ${row('Segmento', ms.map(m => SEGMENTS[m.segment]))}
        ${row('Motorización', ms.map(m => FUELS[m.fuel]))}
        ${row('Motor (versión tope)', ms.map(m => escape(vmax(m).engine)))}
        ${row('Potencia máx.', ms.map(m => Math.max(...m.versions.map(v => v.hp)) + ' hp'), ms.map(m => Math.max(...m.versions.map(v => v.hp))))}
        ${row('Consumo / autonomía', ms.map(m => escape(vmin(m).cons)))}
        ${row('Maletero', ms.map(m => m.trunk + ' L'), ms.map(m => m.trunk))}
        ${row('Garantía', ms.map(m => { const b = brand(m.brandId); return `${b.warrantyYears} años / ${nf(b.warrantyKm)} km`; }), ms.map(m => brand(m.brandId).warrantyYears))}
        ${row('Versiones', ms.map(m => m.versions.map(v => escape(v.name)).join('<br>')))}
        ${row('Equipamiento tope', ms.map(m => `<ul class="mini-list">${features(vmax(m)).slice(-5).map(x => `<li>${escape(x)}</li>`).join('')}</ul>`))}
        ${row('Disponibilidad', ms.map(m => stockBadge(stockFor(m.id))))}
        <tr><th></th>${ms.map(m => `<td><a class="btn btn-primary btn-sm" href="#/modelo/${m.id}">Configurar</a></td>`).join('')}</tr>
      </tbody></table></div></div></section>`;
    el.querySelectorAll('[data-slot]').forEach(s => s.onchange = () => { ids[+s.dataset.slot] = s.value; ids = ids.filter(Boolean); uiSet('compare', ids.slice(0, 3)); draw(); });
  };
  draw();
}
