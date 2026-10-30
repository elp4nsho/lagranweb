// Resultados de búsqueda con filtros, orden, paginación, vista lista/mapa y búsquedas guardadas.
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { db, auth, uf } from '../data/db.js';
import { COMUNAS, comunaName } from '../shared/geo.js';
import { TYPES, OPS, matchQuery, queryLabel, qs, toUF, toCLP, ufM2, fmtUF, mainPrice, altPrice, specs } from '../shared/format.js';
import { comunaMap, propertyArt, icon } from '../shared/art.js';
import { propertyCard, V } from './cards.js';

const PAGE = 12;
const SORTS = { reciente: 'Más recientes', 'precio-asc': 'Menor precio', 'precio-desc': 'Mayor precio', m2: 'Mayor superficie', ufm2: 'Menor UF/m²' };

export function renderSearch(q) {
  const view = V(), U = uf();
  const unit = q.unit || (q.op === 'arriendo' ? 'CLP' : 'UF');
  let list = db.query('properties', p => matchQuery(p, { ...q, unit, all: true }, U));
  const sort = q.sort || 'reciente';
  const cmp = { reciente: (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''), 'precio-asc': (a, b) => toCLP(a, U) - toCLP(b, U), 'precio-desc': (a, b) => toCLP(b, U) - toCLP(a, U), m2: (a, b) => b.m2 - a.m2, ufm2: (a, b) => ufM2(a, U) - ufM2(b, U) }[sort];
  list.sort((a, b) => (a.status === 'reservada') - (b.status === 'reservada') || cmp(a, b));
  const mode = q.view === 'mapa' ? 'mapa' : 'lista';
  const pages = Math.max(1, Math.ceil(list.length / PAGE)), page = Math.min(pages, Math.max(1, +q.page || 1));
  const go = patch => { location.hash = '/buscar?' + qs({ ...q, ...patch }); };
  const sel = (name, label, opts, val) => `<div class="field"><label for="f-${name}">${label}</label><select class="select" id="f-${name}" name="${name}"><option value="">${name === 'dorm' || name === 'bano' ? 'Todos' : 'Indiferente'}</option>${opts.map(([v, l]) => `<option value="${v}" ${String(val ?? '') === String(v) ? 'selected' : ''}>${escape(l)}</option>`).join('')}</select></div>`;

  view.innerHTML = `<section class="section" style="padding-top:28px"><div class="container">
    <div class="crumbs"><a href="#/">Inicio</a> / <span>${q.op ? OPS[q.op] : 'Propiedades'}</span>${q.comuna ? ` / <span>${escape(comunaName(q.comuna))}</span>` : ''}</div>
    <div class="results-layout">
      <aside class="card filters-panel" data-panel>
        <div class="row between"><h3 style="margin:0">Filtros</h3><button class="btn btn-sm btn-ghost filter-toggle" data-ftoggle>Mostrar</button></div>
        <form class="stack filter-body" data-filters style="margin-top:12px">
          <div class="seg" role="group" aria-label="Operación">${[['', 'Todas'], ['venta', 'Venta'], ['arriendo', 'Arriendo']].map(([v, l]) => `<button type="button" data-setop="${v}" class="${(q.op || '') === v ? 'active' : ''}">${l}</button>`).join('')}</div>
          <input type="hidden" name="op" value="${escape(q.op || '')}">
          <div class="field"><label for="f-q">Palabra clave</label><input class="input" id="f-q" name="q" value="${escape(q.q || '')}" placeholder="Metro, piscina, código…"></div>
          ${sel('comuna', 'Comuna', COMUNAS.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name]), q.comuna)}
          ${sel('tipo', 'Tipo de propiedad', Object.entries(TYPES), q.tipo)}
          <div class="field"><div class="row between" style="gap:8px"><span class="label">Precio</span><select class="select select-sm" name="unit" aria-label="Moneda"><option ${unit === 'UF' ? 'selected' : ''}>UF</option><option ${unit === 'CLP' ? 'selected' : ''}>CLP</option></select></div>
            <div class="grid-2" style="gap:6px"><input class="input" name="min" type="number" min="0" placeholder="Desde" aria-label="Precio desde" value="${escape(q.min || '')}"><input class="input" name="max" type="number" min="0" placeholder="Hasta" aria-label="Precio hasta" value="${escape(q.max || '')}"></div></div>
          <div class="grid-2" style="gap:8px">${sel('dorm', 'Dormitorios', [1, 2, 3, 4].map(n => [n, n + '+']), q.dorm)}${sel('bano', 'Baños', [1, 2, 3].map(n => [n, n + '+']), q.bano)}</div>
          ${sel('m2', 'Superficie mínima', [40, 60, 80, 100, 150, 250].map(n => [n, n + ' m²']), q.m2)}
          <button class="btn btn-primary" type="submit">Aplicar filtros</button>
          <a class="btn btn-ghost btn-sm" href="#/buscar">Limpiar</a>
        </form>
      </aside>
      <div>
        <div class="results-bar">
          <div><h1 style="font-size:clamp(22px,3vw,30px);margin:0">${list.length} propiedad${list.length === 1 ? '' : 'es'}</h1><span class="muted small">${escape(queryLabel(q))}</span></div>
          <div class="row" style="gap:8px">
            <select class="select select-sm" data-sort aria-label="Ordenar">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === sort ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <div class="seg" role="group" aria-label="Vista"><button data-mode="lista" class="${mode === 'lista' ? 'active' : ''}">${icon('list', 16)} Lista</button><button data-mode="mapa" class="${mode === 'mapa' ? 'active' : ''}">${icon('map', 16)} Mapa</button></div>
            <button class="btn btn-sm" data-save>${icon('bell', 16)} Guardar búsqueda</button>
          </div>
        </div>
        <div data-results></div>
      </div>
    </div></div></section>`;

  const res = view.querySelector('[data-results]');
  if (!list.length) res.innerHTML = `<div class="card empty"><span class="icon">🏠</span><h3>Sin resultados con estos filtros</h3><p>Prueba ampliando el precio o quitando la comuna. También puedes guardar la búsqueda y te avisaremos cuando aparezca algo.</p></div>`;
  else if (mode === 'lista') {
    res.innerHTML = `<div class="prop-grid">${list.slice((page - 1) * PAGE, page * PAGE).map(propertyCard).join('')}</div>
      ${pages > 1 ? `<nav class="pager" aria-label="Paginación">${Array.from({ length: pages }, (_, i) => `<button class="btn btn-sm ${i + 1 === page ? 'btn-primary' : ''}" data-page="${i + 1}" ${i + 1 === page ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('')}</nav>` : ''}`;
  } else renderMap(res, list, U);

  const f = view.querySelector('[data-filters]');
  f.addEventListener('submit', e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); go({ ...d, page: '' }); });
  f.addEventListener('click', e => { const b = e.target.closest('[data-setop]'); if (!b) return; f.elements.op.value = b.dataset.setop; f.elements.unit.value = b.dataset.setop === 'arriendo' ? 'CLP' : 'UF'; f.requestSubmit(); });
  view.querySelector('[data-ftoggle]').onclick = e => { const p = view.querySelector('[data-panel]'); p.classList.toggle('open'); e.target.textContent = p.classList.contains('open') ? 'Ocultar' : 'Mostrar'; };
  view.querySelector('[data-sort]').onchange = e => go({ sort: e.target.value, page: '' });
  view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => go({ view: b.dataset.mode === 'mapa' ? 'mapa' : '' }));
  view.querySelectorAll('[data-page]').forEach(b => b.onclick = () => go({ page: b.dataset.page }));
  view.querySelector('[data-save]').onclick = () => saveSearch({ ...q, unit });
}

async function saveSearch(q) {
  const u = auth.current();
  if (!u) { toast('Ingresa para guardar búsquedas y recibir alertas', 'info'); setTimeout(() => location.href = 'login.html?next=' + encodeURIComponent('index.html' + location.hash), 900); return; }
  const query = Object.fromEntries(Object.entries(q).filter(([k, v]) => v && !['page', 'view', 'sort'].includes(k)));
  const r = await formModal({ title: 'Guardar búsqueda', submit: 'Guardar', fields: [
    { name: 'name', label: 'Nombre de la búsqueda', required: true, value: queryLabel(query) },
    { name: 'alerts', label: 'Avisarme cuando se publiquen propiedades que coincidan', type: 'checkbox', value: true }
  ] });
  if (!r) return;
  db.insert('savedSearches', { userId: u.id, name: r.name, query, alerts: r.alerts, lastSeen: new Date().toISOString() });
  db.log('búsqueda', `${u.name} guardó «${r.name}»`, u.id);
  toast('Búsqueda guardada. La verás en Mi cuenta.', 'success');
}

function renderMap(res, list, U) {
  const values = {};
  COMUNAS.forEach(c => { const ps = db.query('properties', p => p.comuna === c.id && p.op === 'venta' && p.type !== 'terreno' && ['publicada', 'reservada', 'vendida'].includes(p.status)); if (ps.length) values[c.id] = ps.reduce((a, p) => a + ufM2(p, U), 0) / ps.length; });
  const short = p => p.currency === 'UF' ? (p.price >= 10000 ? `UF ${(p.price / 1000).toFixed(1).replace('.', ',')}k` : fmtUF(p.price)) : `$${(p.price / 1e6).toFixed(p.price < 1e6 ? 2 : 1).replace('.', ',')}M`;
  const shown = list.slice(0, 60);
  let active = null;
  res.innerHTML = `<div class="map-wrap"><div class="map-box"><div data-map></div>
      <div class="map-legend"><span>UF/m² promedio de venta</span><span>${fmtUF(Math.min(...Object.values(values)))}</span><i></i><span>${fmtUF(Math.max(...Object.values(values)))}</span><span>· ${shown.length} de ${list.length} propiedades · toca un punto para ver su precio</span></div></div>
    <div class="map-list" data-mlist>${shown.map(p => `<article class="card mini-card" data-mini="${p.id}"><a class="media" href="#/propiedad/${p.id}" aria-label="${escape(p.title)}">${propertyArt(p, 'fachada', { label: false })}</a>
      <div style="min-width:0"><b class="price" style="font-size:17px">${mainPrice(p)}</b><span class="price-alt">${altPrice(p, U)}</span><a href="#/propiedad/${p.id}" class="ellipsis" style="color:var(--text);font-weight:600;font-size:14px">${escape(p.title)}</a><span class="muted small">${escape(comunaName(p.comuna))} · ${specs(p)}</span></div></article>`).join('')}</div></div>`;
  const mapEl = res.querySelector('[data-map]');
  const draw = () => {
    mapEl.innerHTML = comunaMap({ values, pins: shown.map(p => ({ id: p.id, x: p.x, y: p.y, label: short(p), active: p.id === active })) });
    res.querySelectorAll('[data-mini]').forEach(m => m.classList.toggle('active', m.dataset.mini === active));
    mapEl.querySelectorAll('[data-pin]').forEach(g => {
      const pick = () => { active = g.dataset.pin; draw(); res.querySelector(`[data-mini="${active}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    mapEl.querySelectorAll('.cell').forEach(c => c.addEventListener('click', () => { location.hash = '/buscar?' + qs({ ...Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || '')), comuna: c.dataset.comuna, view: 'mapa' }); }));
  };
  res.querySelectorAll('[data-mini]').forEach(m => m.addEventListener('mouseenter', () => { if (active !== m.dataset.mini) { active = m.dataset.mini; draw(); } }));
  draw();
}
