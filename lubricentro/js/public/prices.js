// Servicios y precios: identificar el vehículo (patente o marca/modelo/año) → aceite y filtros
// recomendados + precios para ese auto; matriz completa por segmento.
import { escape, money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { SEGMENTS, MAKES, MODELS, modelById } from '../data/catalog.js';
import { services, oilById, segName, lookupPlate, priceFor, vehFromModel, fmtKm, normPlate } from '../shared/domain.js';
import { carArt, plate } from '../shared/bits.js';
import { plateForm } from './home.js';
import { visitor } from './state.js';

export function vehicleSpec(v, { actions = '' } = {}) {
  const oil = oilById(v.oil), m = modelById(v.modelId);
  return `<div class="card spec-card">
    ${carArt(v.segment, { label: `${v.make} ${v.model}` })}
    <div class="stack" style="gap:8px">
      <div class="row between"><div><b style="font-size:1.2em">${escape(v.make)} ${escape(v.model)} ${escape(v.year || '')}</b>${v.plate ? ` ${plate(v.plate)}` : ''}</div><span class="badge badge-primary">${escape(segName(v.segment))}</span></div>
      <dl class="dl small">
        <dt>Aceite recomendado</dt><dd>${escape(oil?.name || v.oil)} · ${String(v.liters).replace('.', ',')} L</dd>
        <dt>Filtros</dt><dd>${m ? `Aceite ${m.fOil} · Aire ${m.fAir} · Cabina ${m.fCab}` : 'Según ficha'}</dd>
        <dt>Combustible</dt><dd>${escape(m?.fuel || '—')}</dd>
        <dt>Cambio cada</dt><dd>${fmtKm(oil?.interval)} o 6 meses</dd>
      </dl>
      ${actions}
    </div></div>`;
}

export function renderPrices(el, _p, query = {}) {
  let veh = null, note = '';
  const st = visitor.get();
  if (query.p) {
    const r = lookupPlate(query.p);
    if (r) { veh = r.vehicle; note = r.found ? 'Vehículo encontrado en tu historial Pits Rápido.' : 'Datos referenciales obtenidos del registro de vehículos (simulado). Si no coinciden, elige marca y modelo.'; visitor.set({ veh: { ...veh, plate: veh.plate || query.p } }); }
  } else if (st.veh) veh = st.veh;
  let mode = query.p ? 'plate' : 'model';
  let cat = '';
  const paint = () => {
    const svcs = services();
    const cats = [...new Set(svcs.map(s => s.cat))];
    const list = svcs.filter(s => !cat || s.cat === cat);
    const segCol = veh?.segment;
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div data-anim><span class="eyebrow">Servicios y precios</span><h1>Precio exacto para tu auto</h1><p class="lead">El precio depende del segmento de tu vehículo y del aceite que pide el fabricante. Identifica tu auto y te mostramos todo con IVA incluido.</p></div>
      <div class="grid-2 finder" style="align-items:start">
        <div class="card stack">
          <div class="tabs"><button class="tab ${mode === 'plate' ? 'active' : ''}" data-mode="plate">Por patente</button><button class="tab ${mode === 'model' ? 'active' : ''}" data-mode="model">Por marca y modelo</button></div>
          ${mode === 'plate' ? '<div data-pf></div>' : `<form class="grid-3" data-mf novalidate>
            <div class="field"><label for="mk">Marca</label><select class="select" id="mk" name="marca"><option value="">Elige…</option>${MAKES.map(m => `<option ${veh?.make === m ? 'selected' : ''}>${escape(m)}</option>`).join('')}</select></div>
            <div class="field"><label for="md">Modelo</label><select class="select" id="md" name="modelo"></select></div>
            <div class="field"><label for="yr">Año</label><select class="select" id="yr" name="anio"></select></div>
            <button class="btn btn-primary" style="grid-column:1/-1">Ver precios para este auto</button></form>`}
          ${note ? `<p class="callout small">${escape(note)}</p>` : ''}
        </div>
        <div data-spec>${veh ? vehicleSpec(veh, { actions: `<div class="row"><a class="btn btn-primary btn-sm" href="#/reservar">Reservar para este auto</a><button class="btn btn-sm btn-ghost" data-clear>Cambiar vehículo</button></div>` }) : `<div class="card empty"><span class="icon">🚗</span>Identifica tu vehículo para ver el aceite recomendado y tus precios.</div>`}</div>
      </div>
    </div></section>
    <section class="section band"><div class="container stack">
      <div class="row between"><h2 style="margin:0">${veh ? `Tus precios · ${escape(veh.make)} ${escape(veh.model)}` : 'Lista de precios por segmento'}</h2>
        <div class="seg-chips"><button class="chip ${!cat ? 'active' : ''}" data-cat="">Todos</button>${cats.map(c => `<button class="chip ${cat === c ? 'active' : ''}" data-cat="${escape(c)}">${escape(c)}</button>`).join('')}</div></div>
      ${veh ? `<div class="grid-3 my-prices">${list.map(s => `<div class="card svc-card ${query.s === s.id ? 'popular' : ''}"><div class="row between nowrap"><span class="svc-ico">${s.icon}</span><b class="price">${money(priceFor(s, veh))}</b></div><h3 style="margin:0">${escape(s.name)}</h3><p class="small muted" style="margin:0">${escape(s.desc)}</p>${s.oil ? `<small class="muted">Incluye ${String(veh.liters).replace('.', ',')} L de ${escape(oilById(veh.oil)?.short || '')}</small>` : ''}<div class="row between small"><span class="muted">⏱ ${s.mins} min</span><a class="btn btn-sm" href="#/reservar?s=${s.id}">Reservar</a></div></div>`).join('')}</div>` : ''}
      <div class="table-wrap"><table class="table price-table"><thead><tr><th>Servicio</th>${SEGMENTS.map(g => `<th class="${g.id === segCol ? 'hl' : ''}">${g.icon} ${escape(g.name)}</th>`).join('')}</tr></thead><tbody>
        ${list.map(s => `<tr><td><b>${escape(s.name)}</b>${s.oil ? '<small class="muted d-block">+ aceite según motor</small>' : ''}</td>${SEGMENTS.map(g => `<td class="${g.id === segCol ? 'hl' : ''}">${money(s.prices[g.id])}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="small muted">Valores de mano de obra e insumos por segmento. En servicios con aceite se suma el aceite recomendado por litro:</p>
      <div class="grid-3">${db.all('oils').map(o => `<div class="card stack" style="gap:4px"><div class="row between"><b>${escape(o.name)}</b><span class="price">${money(o.pricePerL)}<small class="muted">/L</small></span></div><small class="muted">${escape(o.desc)} Cambio cada ${fmtKm(o.interval)}.</small></div>`).join('')}</div>
      <div class="grid-auto">${SEGMENTS.map(g => `<div class="card"><b>${g.icon} ${escape(g.name)}</b><small class="d-block muted">${escape(g.desc)} · ej.: ${escape(g.examples)}</small></div>`).join('')}</div>
    </div></section>`;
    if (mode === 'plate') plateForm(el.querySelector('[data-pf]'), { cta: 'Buscar' });
    const mf = el.querySelector('[data-mf]');
    if (mf) {
      const mk = mf.elements.marca, md = mf.elements.modelo, yr = mf.elements.anio;
      const fillModels = () => { const ms = MODELS.filter(m => m.make === mk.value); md.innerHTML = ms.length ? ms.map(m => `<option value="${m.id}" ${veh?.modelId === m.id ? 'selected' : ''}>${escape(m.model)}</option>`).join('') : '<option value="">—</option>'; fillYears(); };
      const fillYears = () => { const m = modelById(md.value); yr.innerHTML = m ? Array.from({ length: m.to - m.from + 1 }, (_, i) => m.to - i).map(y => `<option ${+veh?.year === y ? 'selected' : ''}>${y}</option>`).join('') : '<option value="">—</option>'; };
      mk.onchange = fillModels; md.onchange = fillYears; fillModels();
      mf.onsubmit = e => {
        e.preventDefault();
        const m = modelById(md.value);
        if (!m) { mk.classList.add('invalid'); return; }
        veh = vehFromModel(m, +yr.value); note = ''; visitor.set({ veh }); paint();
      };
    }
  };
  el.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]'); if (m) { mode = m.dataset.mode; paint(); return; }
    const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; paint(); return; }
    if (e.target.closest('[data-clear]')) { veh = null; note = ''; visitor.set({ veh: null }); if (location.hash.includes('?')) location.hash = '#/precios'; else paint(); }
  });
  paint();
  return { refresh: ch => { if (['services', 'oils'].includes(ch?.col) || ['value', 'reset', 'sync'].includes(ch?.type)) paint(); } };
}
export { normPlate };
