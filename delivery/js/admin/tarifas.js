// Editor de tarifas y zonas: tamaños, servicios, km, recargos, reglas y comuna→zona.
// Al guardar, el cotizador público y los nuevos envíos usan los valores al instante.
import { db } from '../data/db.js';
import { html, raw, money, toast, confirm, escape } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { COMUNAS } from '../data/geo.js';
import { DEFAULT_PRICING, ZONE_KEYS, quote } from '../shared/pricing.js';
import { createMap } from '../shared/map.js';
import { comunaOptions } from '../public/calc.js';
import * as ops from '../shared/ops.js';

export function mountTarifas(el, ctx) {
  let draft = JSON.parse(JSON.stringify(ops.pricing())), dirty = false, map = null;
  const num = (path, v, step = 1) => html`<input class="input input-num" type="number" step="${step}" data-p="${path}" value="${v}">`;
  const txt = (path, v) => html`<input class="input" data-p="${path}" value="${v}">`;
  function render() {
    map?.destroy();
    el.innerHTML = html`${raw(pageHead('Tarifas y zonas', 'Los cambios se aplican al cotizador público y a los nuevos envíos al guardar.', '<button class="btn btn-ghost" data-reset>Restaurar valores por defecto</button><button class="btn btn-primary" data-save disabled>Guardar cambios</button>'))}
    <div class="notice warn" data-dirty hidden>Tienes cambios sin guardar.</div>
    <div class="panel-grid">
      <div class="stack">
        <div class="card"><div class="card-title"><h3>Parámetros generales</h3></div><div class="grid-3">
          <div class="field"><label>Precio por km</label>${raw(num('perKm', draft.perKm, 10))}</div>
          <div class="field"><label>Precio mínimo</label>${raw(num('minPrice', draft.minPrice, 10))}</div>
          <div class="field"><label>% para el repartidor</label>${raw(num('courierShare', draft.courierShare))}</div></div></div>
        <div class="card"><div class="card-title"><h3>Tamaños</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Base (CLP)</th></tr></thead><tbody>
          ${Object.entries(draft.sizes).map(([k, s]) => raw(html`<tr><td><b>${k}</b></td><td>${raw(txt(`sizes.${k}.name`, s.name))}</td><td>${raw(txt(`sizes.${k}.max`, s.max))}</td><td>${raw(num(`sizes.${k}.base`, s.base, 10))}</td></tr>`))}</tbody></table></div></div>
        <div class="card"><div class="card-title"><h3>Servicios</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Servicio</th><th>Descripción</th><th>Factor</th><th>+ min retiro</th><th>Activo</th></tr></thead><tbody>
          ${Object.entries(draft.services).map(([k, s]) => raw(html`<tr><td>${raw(txt(`services.${k}.name`, s.name))}</td><td>${raw(txt(`services.${k}.desc`, s.desc))}</td><td>${raw(num(`services.${k}.mult`, s.mult, 0.05))}</td><td>${raw(num(`services.${k}.extraPickup`, s.extraPickup))}</td><td><label class="switch"><input type="checkbox" data-p="services.${k}.active" ${s.active !== false ? 'checked' : ''} ${k === 'estandar' ? 'disabled' : ''}><span></span></label></td></tr>`))}</tbody></table></div></div>
        <div class="card"><div class="card-title"><h3>Zonas</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Zona</th><th>Nombre</th><th>Recargo</th><th>Retiro (min)</th><th>Comunas</th></tr></thead><tbody>
          ${ZONE_KEYS.map(z => raw(html`<tr><td><span class="badge zone-${z}">${z}</span></td><td>${raw(txt(`zones.${z}.name`, draft.zones[z].name))}</td><td>${raw(num(`zones.${z}.extra`, draft.zones[z].extra, 50))}</td><td>${raw(num(`zones.${z}.pickup`, draft.zones[z].pickup))}</td><td>${Object.values(draft.comunaZone).filter(v => v === z).length}</td></tr>`))}</tbody></table></div></div>
        <div class="card"><div class="card-title"><h3>Reglas de precio</h3><button class="btn btn-sm" data-addrule>＋ Regla</button></div><div class="list">
          ${draft.rules.map((r, i) => raw(html`<div class="list-item rule-row"><label class="switch"><input type="checkbox" data-p="rules.${i}.active" ${r.active ? 'checked' : ''} aria-label="Activa"><span></span></label>
            <input class="input grow" data-p="rules.${i}.name" value="${r.name}" aria-label="Nombre de la regla">
            <select class="select select-sm" data-p="rules.${i}.kind" aria-label="Condición">${[['lluvia', 'Siempre (clima)'], ['nocturno', 'Nocturno'], ['empresa', 'Cuentas empresa'], ['promo', 'Promoción']].map(([k, l]) => raw(html`<option value="${k}" ${k === r.kind ? 'selected' : ''}>${l}</option>`))}</select>
            <span class="row" style="gap:4px;flex-wrap:nowrap">${raw(num(`rules.${i}.pct`, r.pct))}%</span><button class="btn btn-sm btn-ghost" data-delrule="${i}" aria-label="Eliminar regla">🗑</button></div>`))}</div></div>
      </div>
      <div class="stack">
        <div class="card stack"><div class="card-title"><h3>Vista previa</h3><span class="badge plain">con cambios sin guardar</span></div>
          <div class="grid-2"><select class="select" data-pv="from" aria-label="Origen">${raw(comunaOptions(draft, 'Providencia'))}</select><select class="select" data-pv="to" aria-label="Destino">${raw(comunaOptions(draft, 'Maipú'))}</select></div>
          <div class="grid-2"><select class="select" data-pv="size" aria-label="Tamaño">${Object.entries(draft.sizes).map(([k, s]) => raw(html`<option value="${k}" ${k === 'M' ? 'selected' : ''}>${s.name}</option>`))}</select><select class="select" data-pv="service" aria-label="Servicio">${Object.entries(draft.services).map(([k, s]) => raw(html`<option value="${k}">${s.name}</option>`))}</select></div>
          <label class="check small"><input type="checkbox" data-pv="biz"> Cuenta empresa</label>
          <div data-preview></div></div>
        <div class="card stack"><div class="card-title"><h3>Cobertura por comuna</h3></div><div class="cov-map" style="height:300px;border-radius:var(--radius-sm);overflow:hidden"></div>
          <div class="comuna-grid">${COMUNAS.slice().sort((a, b) => a.n.localeCompare(b.n, 'es')).map(c => raw(html`<label class="comuna-row"><span>${c.n}</span><select class="select select-sm" data-cz="${c.n}">${[['A', 'A'], ['B', 'B'], ['C', 'C'], ['', 'Sin cobertura']].map(([v, l]) => raw(html`<option value="${v}" ${(draft.comunaZone[c.n] || '') === v ? 'selected' : ''}>${l}</option>`))}</select></label>`))}</div></div>
      </div>
    </div>`;
    map = createMap(el.querySelector('.cov-map'), { prefer: 'svg', zones: draft.comunaZone, labels: false });
    map.fitAll();
    preview(); markDirty(dirty);
  }
  function setPath(path, val) {
    const parts = path.split('.'); let o = draft;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts.at(-1)] = val;
  }
  function preview() {
    const g = k => el.querySelector(`[data-pv="${k}"]`);
    const q = quote(draft, g('from').value, g('to').value, g('size').value, g('service').value, { business: g('biz').checked, at: new Date(ops.simNow()) });
    const cur = quote(ops.pricing(), g('from').value, g('to').value, g('size').value, g('service').value, { business: g('biz').checked, at: new Date(ops.simNow()) });
    el.querySelector('[data-preview]').innerHTML = !q ? '<div class="notice warn">Una de las comunas no tiene cobertura.</div>' : html`<div class="quote"><div class="q-main"><small>Nuevo precio</small><b>${money(q.price)}</b></div><div><small>Actual</small><b>${cur ? money(cur.price) : '—'}</b></div><div><small>Distancia</small><b>${String(q.km).replace('.', ',')} km</b></div></div>
      <small class="muted">Base ${money(q.breakdown.base)} + km ${money(q.breakdown.perKm)} + zona ${money(q.breakdown.zoneExtra)} × ${q.breakdown.mult}${q.breakdown.rules.map(r => ` · ${r.name} ${r.pct > 0 ? '+' : ''}${r.pct}%`).join('')}</small>`;
  }
  function markDirty(v) { dirty = v; el.querySelector('[data-save]').disabled = !v; el.querySelector('[data-dirty]').hidden = !v; }
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.p) { setPath(t.dataset.p, t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value); markDirty(true); }
    if (t.dataset.cz !== undefined) { draft.comunaZone[t.dataset.cz] = t.value || null; map.zones(draft.comunaZone); markDirty(true); }
    preview();
  });
  el.addEventListener('change', e => { if (e.target.dataset.p && e.target.tagName === 'SELECT') { setPath(e.target.dataset.p, e.target.value); markDirty(true); preview(); } });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-save]')) {
      if (ZONE_KEYS.some(z => draft.zones[z].extra < 0) || draft.perKm < 0 || Object.values(draft.sizes).some(s => !(s.base > 0))) { toast('Revisa los valores: no pueden ser negativos', 'warning'); return; }
      db.setValue('pricing', JSON.parse(JSON.stringify(draft)));
      db.log('tarifas', 'Tarifas y zonas actualizadas', ctx.user.id);
      ops.feed('Tarifas actualizadas por administración', 'info');
      markDirty(false); toast('Tarifas guardadas: el sitio público ya usa los nuevos valores', 'success');
    }
    if (e.target.closest('[data-reset]') && await confirm('¿Restaurar todas las tarifas a los valores por defecto? (no se guarda hasta que presiones Guardar)', { ok: 'Restaurar' })) { draft = JSON.parse(JSON.stringify(DEFAULT_PRICING)); dirty = true; render(); }
    if (e.target.closest('[data-addrule]')) { draft.rules.push({ id: 'r' + Date.now().toString(36), name: 'Nueva regla', kind: 'promo', pct: -5, active: false }); dirty = true; render(); }
    const d = e.target.closest('[data-delrule]'); if (d) { draft.rules.splice(+d.dataset.delrule, 1); dirty = true; render(); }
  });
  render();
  return { destroy() { map?.destroy(); } };
}
