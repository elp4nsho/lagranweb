// Stock por sucursal (unidades por VIN) y página de sucursales.
import { escape, money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { model, brand, version, color, showrooms, showroom, encodeConfig, workshopLoad, activeModels } from '../shared/domain.js';
import { carOf } from '../shared/car.js';
import { pageHero } from './cards.js';
import { ymd, fdate } from '../shared/util.js';
import { icon } from '../shared/icons.js';
import { meter } from '../shared/charts.js';

export function renderStock(el, _p, query) {
  const f = { sr: query.sucursal || '', brand: '', st: '', model: query.modelo || '' };
  el.innerHTML = `${pageHero('Stock', 'Autos disponibles hoy', 'Unidades en nuestros patios y en tránsito desde fábrica, con fecha estimada de llegada. Lo que no está aquí lo pedimos a fábrica (60–90 días).', 'store')}
  <section class="section tight"><div class="container stack">
    <div class="card filters stock-filters">
      <select class="select" data-k="sr" aria-label="Sucursal"><option value="">Todas las sucursales</option>${showrooms().map(s => `<option value="${s.id}" ${f.sr === s.id ? 'selected' : ''}>${escape(s.city)}</option>`).join('')}</select>
      <select class="select" data-k="brand" aria-label="Marca"><option value="">Todas las marcas</option>${db.all('brands').map(b => `<option value="${b.id}">${escape(b.name)}</option>`).join('')}</select>
      <select class="select" data-k="model" aria-label="Modelo"><option value="">Todos los modelos</option>${activeModels().map(m => `<option value="${m.id}" ${f.model === m.id ? 'selected' : ''}>${escape(m.name)}</option>`).join('')}</select>
      <select class="select" data-k="st" aria-label="Disponibilidad"><option value="">Stock y tránsito</option><option value="stock">Entrega inmediata</option><option value="transito">En tránsito</option></select>
    </div>
    <div class="stock-summary" data-sum></div>
    <div class="stock-list" data-list></div>
  </div></section>`;
  const draw = () => {
    const units = db.query('units', u => ['stock', 'transito'].includes(u.status) && (!f.sr || u.showroomId === f.sr) && (!f.st || u.status === f.st) && (!f.model || u.modelId === f.model) && (!f.brand || model(u.modelId)?.brandId === f.brand) && model(u.modelId)?.status === 'activo');
    const by = {}; units.forEach(u => (by[u.modelId] ||= []).push(u));
    el.querySelector('[data-sum]').innerHTML = `<span class="badge badge-success">${units.filter(u => u.status === 'stock').length} en stock</span><span class="badge badge-info">${units.filter(u => u.status === 'transito').length} en tránsito</span><span class="muted small">${Object.keys(by).length} modelos</span>`;
    el.querySelector('[data-list]').innerHTML = Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([mid, list]) => {
      const m = model(mid);
      return `<article class="card stock-card"><div class="stock-head">${carOf(m, color(m, list[0].colorId)?.hex)}<div><span class="eyebrow">${escape(brand(m.brandId).name)}</span><h3>${escape(m.name)}</h3><a class="small" href="#/modelo/${m.id}">Configurar ${icon('arrow', 13)}</a></div></div>
        <ul class="unit-list">${list.sort((a, b) => a.status.localeCompare(b.status)).map(u => { const v = version(m, u.versionId), c = color(m, u.colorId); return `<li><i class="swatch-dot" style="background:${c?.hex}"></i><span><b>${escape(v?.name)}</b><small class="muted">${escape(c?.name)} · ${escape(showroom(u.showroomId).city)} · VIN …${u.vin.slice(-6)}</small></span>${u.status === 'stock' ? '<span class="badge badge-success">Entrega inmediata</span>' : `<span class="badge badge-info">Llega ${fdate(u.eta)}</span>`}<span class="unit-price">${money(v.price + (c?.price || 0))}</span><a class="btn btn-sm" href="#/cotizar?config=${encodeURIComponent(encodeConfig({ modelId: m.id, versionId: u.versionId, colorId: u.colorId, wheelId: 'w1' }))}">Lo quiero</a></li>`; }).join('')}</ul></article>`;
    }).join('') || `<div class="card empty">${icon('box', 36)}<p>No hay unidades con esos filtros. <a href="#/cotizar">Pídelo a fábrica</a>.</p></div>`;
  };
  el.querySelectorAll('[data-k]').forEach(s => s.onchange = () => { f[s.dataset.k] = s.value; draw(); });
  draw();
}

const mapArt = i => `<svg class="map-art" viewBox="0 0 300 140" aria-hidden="true"><rect width="300" height="140" class="map-bg"/>${[20, 60, 100].map((y, k) => `<path d="M0 ${y + i * 7}L300 ${y - 10 + k * 6}" class="map-road"/>`).join('')}${[50, 140, 230].map((x, k) => `<path d="M${x + i * 9} 0L${x - 20 + k * 4} 140" class="map-road"/>`).join('')}<path d="M0 120Q150 ${80 + i * 10} 300 110" class="map-main"/><circle cx="${150 + i * 12}" cy="${66 - i * 4}" r="16" class="map-pin-halo"/><path d="M${150 + i * 12} ${80 - i * 4}l-9-15a10 10 0 1118 0z" class="map-pin"/></svg>`;

export function renderShowrooms(el) {
  el.innerHTML = `${pageHero('Sucursales', 'Visítanos en Santiago, Viña del Mar y Concepción', 'Showroom, entrega de 0 km, taller de servicio autorizado y desabolladura en cada sucursal.', 'pin')}
  <section class="section tight"><div class="container stack">${showrooms().map((s, i) => { const load = workshopLoad(s.id, ymd()); return `<article class="card showroom-row">
    ${mapArt(i)}
    <div class="stack"><div><span class="eyebrow">${escape(s.city)}</span><h2>${escape(s.name)}</h2><p>${icon('pin', 16)} ${escape(s.address)}<br>${icon('clock', 16)} ${escape(s.hours)}<br>${icon('phone', 16)} ${escape(s.phone)}</p><p class="muted">${escape(s.img || '')}</p></div>
      <div class="tag-list">${s.brands.map(b => `<span class="chip-mini">${escape(brand(b)?.name || b)}</span>`).join('')}</div>
      <div class="small"><b>Taller hoy:</b> ${load.pct}% de ocupación · ${s.bays} bahías ${meter(load.pct, load.pct > 85 ? 'danger' : load.pct > 60 ? 'warning' : 'success')}</div>
      <div class="row"><a class="btn btn-primary btn-sm" href="#/test-drive">${icon('steer', 15)} Test drive</a><a class="btn btn-sm" href="#/posventa">${icon('wrench', 15)} Agendar taller</a><a class="btn btn-sm btn-ghost" href="#/stock?sucursal=${s.id}">${icon('box', 15)} Ver stock</a><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent(s.address)}">Cómo llegar</a></div></div>
  </article>`; }).join('')}</div></section>`;
}
