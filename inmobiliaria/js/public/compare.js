// Comparador de hasta 3 propiedades.
import { escape, money, num } from '../../../assets/core/ui.js';
import { db, uf } from '../data/db.js';
import { OPS, TYPES, mainPrice, altPrice, toCLP, ufM2, fmtUF, comunaName } from '../shared/format.js';
import { FEATURES } from '../data/seed.js';
import { propertyArt, icon } from '../shared/art.js';
import { compareList, toggleCompare, clearCompare, V } from './cards.js';

export function renderCompare() {
  const view = V(), U = uf();
  const list = compareList().map(id => db.get('properties', id)).filter(Boolean);
  if (!list.length) {
    view.innerHTML = `<section class="section"><div class="container"><div class="card empty"><span class="icon">⚖️</span><h1>Comparador</h1><p>Agrega hasta 3 propiedades con el botón ${icon('compare', 16)} de cada tarjeta para compararlas lado a lado.</p><a class="btn btn-primary" href="#/buscar">Buscar propiedades</a></div></div></section>`;
    return;
  }
  const best = (fn, dir = 1) => { const vals = list.map(fn); const b = dir > 0 ? Math.max(...vals) : Math.min(...vals); return vals.map(v => list.length > 1 && v === b); };
  const rows = [
    ['Precio', p => `<b>${mainPrice(p)}</b><br><span class="muted small">${altPrice(p, U)}</span>`, best(p => toCLP(p, U), -1)],
    ['Operación', p => OPS[p.op]], ['Tipo', p => TYPES[p.type]], ['Comuna', p => escape(comunaName(p.comuna))],
    ['Superficie útil', p => `${num(p.m2)} m²`, best(p => p.m2)], ['Superficie total', p => `${num(p.m2Total)} m²`, best(p => p.m2Total)],
    ['Valor por m²', p => p.op === 'venta' ? fmtUF(ufM2(p, U), true) : money(toCLP(p, U) / p.m2), best(p => ufM2(p, U), -1)],
    ['Dormitorios', p => p.dorms || '—', best(p => p.dorms)], ['Baños', p => p.baths || '—', best(p => p.baths)],
    ['Estacionamientos', p => p.parking || '—', best(p => p.parking)], ['Bodega', p => (p.storage ? 'Sí' : 'No')],
    ['Gastos comunes', p => (p.expenses ? money(p.expenses) : '—'), best(p => p.expenses || 1e9, -1)], ['Año', p => p.year || '—', best(p => p.year || 0)],
    ['Orientación', p => p.orientation], ['Piso', p => p.floor || '—']
  ];
  const feats = FEATURES.filter(f => list.some(p => p.features.includes(f)));
  view.innerHTML = `<section class="section" style="padding-top:28px"><div class="container stack">
    <div class="row between"><div><span class="eyebrow">Comparador</span><h1 style="margin:0">Compara ${list.length} propiedad${list.length > 1 ? 'es' : ''}</h1></div><button class="btn btn-ghost" data-clear>Vaciar comparador</button></div>
    <div class="table-wrap"><table class="table compare-table"><thead><tr><th></th>${list.map(p => `<th style="text-transform:none;letter-spacing:0">
      <a href="#/propiedad/${p.id}" style="display:block;border-radius:var(--radius-sm);overflow:hidden;aspect-ratio:16/10">${propertyArt(p, 'fachada', { label: false })}</a>
      <a href="#/propiedad/${p.id}" style="display:block;margin-top:8px;color:var(--text);font-size:14px;white-space:normal">${escape(p.title)}</a>
      <button class="btn btn-sm btn-ghost" data-rm="${p.id}" style="margin-top:6px">${icon('x', 14)} Quitar</button></th>`).join('')}</tr></thead>
      <tbody>${rows.map(([label, fn, b]) => `<tr><th scope="row">${label}</th>${list.map((p, i) => `<td class="${b && b[i] ? 'best' : ''}">${fn(p)}${b && b[i] ? ' ✓' : ''}</td>`).join('')}</tr>`).join('')}
      ${feats.map(f => `<tr><th scope="row">${escape(f)}</th>${list.map(p => `<td>${p.features.includes(f) ? `<span class="badge badge-success">Sí</span>` : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="muted small">✓ marca el mejor valor de cada fila. ${list.length < 3 ? '<a href="#/buscar">Agregar otra propiedad</a>' : ''}</p>
  </div></section>`;
  view.querySelector('[data-clear]').onclick = () => { clearCompare(); renderCompare(); };
  view.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { toggleCompare(b.dataset.rm); renderCompare(); });
}
