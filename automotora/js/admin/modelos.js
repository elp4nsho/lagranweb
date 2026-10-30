// Modelos, versiones, colores, llantas y packs (alimentan el configurador en vivo).
import { escape, money, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { brand, fromPrice, SEGMENTS, FUELS, BODIES, stockFor, features } from '../shared/domain.js';
import { carSVG } from '../shared/car.js';
import { tierFeatures } from '../data/catalog.js';
import { slug } from '../../../assets/core/ui.js';
import { sw, log, del, opts, brandOpts } from './kit.js';
import { icon } from '../shared/icons.js';
import { ymd, addDays } from '../shared/util.js';

const STATUS = [['activo', 'Activo'], ['lanzamiento', 'Próximo lanzamiento'], ['inactivo', 'Inactivo (oculto)']];

export function renderModels(v) {
  v.innerHTML = `${pageHead('Modelos y versiones', `${db.count('models', m => m.status === 'activo')} activos · ${db.count('models', m => m.status === 'lanzamiento')} lanzamientos. Los cambios se ven al instante en el catálogo y el configurador.`, `<button class="btn" data-bulk>${icon('percent', 16)} Ajustar precios</button><button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo modelo</button>`)}<div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('models'), search: m => `${brand(m.brandId)?.name} ${m.name} ${m.segment}`,
    filters: [{ key: 'brandId', label: 'Marca', options: brandOpts() }, { key: 'segment', label: 'Segmento', options: Object.entries(SEGMENTS) }, { key: 'status', label: 'Estado', options: STATUS }],
    columns: [
      { key: 'name', label: 'Modelo', render: m => ({ __raw: true, value: `<div class="cell-car">${carSVG({ body: m.body, paint: (m.colors[1] || m.colors[0])?.hex, fuel: m.fuel })}<span><b>${escape(brand(m.brandId)?.name)} ${escape(m.name)}</b><small>${SEGMENTS[m.segment]} · ${FUELS[m.fuel]}</small></span></div>` }) },
      { key: 'versions', label: 'Versiones', render: m => `${m.versions.length} · ${m.colors.length} colores` , sort: false },
      { key: 'price', label: 'Desde', render: m => money(fromPrice(m)), sort: false },
      { key: 'stock', label: 'Stock', render: m => { const s = stockFor(m.id); return `${s.inStock.length} + ${s.transit.length} tránsito`; }, sort: false },
      { key: 'status', label: 'Estado', render: m => ({ __raw: true, value: `<select class="select inline-edit" data-act-change="status" data-id="${m.id}" aria-label="Estado">${opts(STATUS, m.status)}</select>` }) },
      { key: 'featured', label: 'Destacado', render: m => ({ __raw: true, value: sw('featured', m.id, m.featured, 'Destacado en portada') }) },
      { key: 'a', label: '', sort: false, render: m => ({ __raw: true, value: acts(actBtn('edit', m.id, 'edit', 'Editar'), `<a class="btn btn-sm btn-ghost btn-icon" href="index.html#/modelo/${m.id}" target="_blank" title="Ver en el sitio" aria-label="Ver en el sitio">${icon('eye', 16)}</a>`, actBtn('del', m.id, 'trash', 'Eliminar')) }) }
    ],
    onRow: m => location.hash = '#/modelos/' + m.id,
    onAction: async (a, id, el) => {
      const m = db.get('models', id);
      if (a === 'edit') location.hash = '#/modelos/' + id;
      if (a === 'del') { if (db.count('units', u => u.modelId === id && ['stock', 'transito', 'reservado'].includes(u.status))) return toast('Tiene unidades en inventario: márcalo como inactivo en vez de eliminarlo.', 'warning'); await del('models', id, m.name); }
      if (a === 'status') { db.update('models', id, { status: el.value, launchDate: el.value === 'lanzamiento' ? (m.launchDate || addDays(ymd(), 30)) : m.launchDate }); log('modelo', `${m.name}: estado ${el.value}`); toast('Estado actualizado', 'success'); }
      if (a === 'featured') { db.update('models', id, { featured: el.checked }); log('modelo', `${m.name}: destacado ${el.checked ? 'sí' : 'no'}`); }
    },
    csv: { name: 'modelos.csv', map: m => ({ marca: brand(m.brandId)?.name, modelo: m.name, segmento: SEGMENTS[m.segment], combustible: FUELS[m.fuel], versiones: m.versions.length, desde: fromPrice(m), estado: m.status }) }
  });
  v.querySelector('[data-new]').onclick = async () => {
    const r = await formModal({ title: 'Nuevo modelo', submit: 'Crear y editar', fields: [{ name: 'brandId', label: 'Marca', type: 'select', options: brandOpts() }, { name: 'name', label: 'Nombre del modelo', required: true }, { name: 'segment', label: 'Segmento', type: 'select', options: Object.entries(SEGMENTS) }, { name: 'body', label: 'Carrocería (ilustración)', type: 'select', options: Object.entries(BODIES) }, { name: 'fuel', label: 'Motorización', type: 'select', options: Object.entries(FUELS) }, { name: 'price', label: 'Precio versión base (CLP)', type: 'number', required: true, value: 19990000 }] });
    if (!r) return;
    const id = slug(r.name) + '-' + Date.now().toString(36).slice(-3), pal = db.get('models', db.find('models', m => m.brandId === r.brandId)?.id);
    const m = db.insert('models', { id, brandId: r.brandId, name: r.name, segment: r.segment, body: r.body, fuel: r.fuel, seats: 5, trunk: 400, tagline: 'Nuevo en Autoplaza.', year: 2026, featured: false, status: 'inactivo',
      versions: [{ id: id + '-1', name: 'Base', price: r.price, cost: Math.round(r.price * .87), engine: '—', hp: 120, trans: 'Automática', cons: '—', traction: 'Delantera', tier: 0 }],
      colors: pal ? pal.colors.map(c => ({ ...c })) : [{ id: 'c1', name: 'Blanco', hex: '#f2f2f0', price: 0 }, { id: 'c2', name: 'Gris', hex: '#6b6e72', price: 350000 }],
      wheels: [{ id: 'w1', name: 'Llantas 17" de serie', inch: 17, style: 'std', rim: 'silver', price: 0 }], packs: [] });
    log('modelo', `Nuevo modelo ${r.name}`); toast('Modelo creado (inactivo). Complétalo y actívalo.', 'success');
    location.hash = '#/modelos/' + m.id;
  };
  v.querySelector('[data-bulk]').onclick = async () => {
    const r = await formModal({ title: 'Ajuste masivo de precios', submit: 'Aplicar', fields: [{ name: 'brandId', label: 'Marca', type: 'select', options: [['', 'Todas'], ...brandOpts()] }, { name: 'pct', label: 'Variación % (ej. 2 o -1,5)', type: 'number', step: '0.1', value: 2, required: true }] });
    if (!r || !r.pct) return;
    const list = db.query('models', m => !r.brandId || m.brandId === r.brandId);
    if (!await confirm(`Se ajustarán los precios de ${list.length} modelos en ${r.pct}%. ¿Continuar?`)) return;
    list.forEach(m => db.update('models', m.id, { versions: m.versions.map(x => ({ ...x, price: Math.round(x.price * (1 + r.pct / 100) / 10000) * 10000 })) }));
    log('precios', `Ajuste ${r.pct}% en ${list.length} modelos${r.brandId ? ' ' + brand(r.brandId).name : ''}`); toast('Precios actualizados', 'success'); lv.refresh();
  };
}

const TABS = [['general', 'General'], ['versions', 'Versiones y precios'], ['colors', 'Colores'], ['wheels', 'Llantas'], ['packs', 'Packs']];
export function renderModel(v, { id }, query) {
  const m0 = db.get('models', id);
  if (!m0) { v.innerHTML = '<div class="card empty">Modelo no encontrado. <a href="#/modelos">Volver</a></div>'; return; }
  const tab = query.tab || 'general';
  const m = m0, prev = (m.colors.find(c => c.id === query.c) || m.colors[1] || m.colors[0]);
  const inp = (arr, i, k, val, type = 'text', extra = '') => `<input class="input inline-edit" type="${type}" data-arr="${arr}" data-i="${i}" data-k="${k}" value="${escape(val ?? '')}" aria-label="${k}" ${extra}>`;
  const sel = (arr, i, k, val, list) => `<select class="select inline-edit" data-arr="${arr}" data-i="${i}" data-k="${k}" aria-label="${k}">${opts(list, val)}</select>`;
  let body = '';
  if (tab === 'general') body = `<form class="form-grid" data-gen>
    ${[['name', 'Nombre'], ['tagline', 'Bajada (tagline)'], ['year', 'Año modelo', 'number'], ['seats', 'Asientos', 'number'], ['trunk', 'Maletero (L)', 'number']].map(([k, l, t]) => `<div class="field"><label for="g-${k}">${l}</label><input class="input" id="g-${k}" name="${k}" type="${t || 'text'}" value="${escape(m[k])}"></div>`).join('')}
    <div class="field"><label for="g-brand">Marca</label><select class="select" id="g-brand" name="brandId">${opts(brandOpts(), m.brandId)}</select></div>
    <div class="field"><label for="g-seg">Segmento</label><select class="select" id="g-seg" name="segment">${opts(Object.entries(SEGMENTS), m.segment)}</select></div>
    <div class="field"><label for="g-body">Carrocería</label><select class="select" id="g-body" name="body">${opts(Object.entries(BODIES), m.body)}</select></div>
    <div class="field"><label for="g-fuel">Motorización</label><select class="select" id="g-fuel" name="fuel">${opts(Object.entries(FUELS), m.fuel)}</select></div>
    <div class="field"><label for="g-st">Estado</label><select class="select" id="g-st" name="status">${opts(STATUS, m.status)}</select></div>
    <div class="field"><label for="g-ld">Fecha de lanzamiento</label><input class="input" id="g-ld" name="launchDate" type="date" value="${m.launchDate || ''}"></div>
    <label class="check"><input type="checkbox" name="featured" ${m.featured ? 'checked' : ''}> Destacado en la portada</label></form>`;
  if (tab === 'versions') body = `<div class="table-wrap sub-table"><table class="table"><thead><tr><th>Versión</th><th>Precio lista</th><th>Costo</th><th>Margen</th><th>Motor</th><th>HP</th><th>Transmisión</th><th>Consumo</th><th>Tracción</th><th>Equipamiento</th><th></th></tr></thead><tbody>
    ${m.versions.map((x, i) => `<tr><td>${inp('versions', i, 'name', x.name)}</td><td>${inp('versions', i, 'price', x.price, 'number', 'step="10000"')}</td><td>${inp('versions', i, 'cost', x.cost, 'number', 'step="10000"')}</td><td><b>${((x.price - x.cost) / x.price * 100).toFixed(1).replace('.', ',')}%</b></td><td>${inp('versions', i, 'engine', x.engine)}</td><td>${inp('versions', i, 'hp', x.hp, 'number')}</td><td>${inp('versions', i, 'trans', x.trans)}</td><td>${inp('versions', i, 'cons', x.cons)}</td><td>${inp('versions', i, 'traction', x.traction)}</td><td>${sel('versions', i, 'tier', x.tier || 0, [[0, 'Base'], [1, 'Media'], [2, 'Full']])}<small class="muted" title="${escape(features(x).join(', '))}">${features(x).length} ítems</small></td><td>${actBtn('rm', 'versions|' + i, 'trash', 'Quitar versión')}</td></tr>`).join('')}
    </tbody></table></div><button class="btn btn-sm" data-add="versions">${icon('plus', 15)} Agregar versión</button>`;
  if (tab === 'colors') body = `<div class="table-wrap sub-table"><table class="table"><thead><tr><th>Muestra</th><th>Nombre</th><th>Color</th><th>Recargo</th><th>Vista previa</th><th></th></tr></thead><tbody>
    ${m.colors.map((c, i) => `<tr><td><i class="swatch-dot" style="background:${c.hex};width:26px;height:26px"></i></td><td>${inp('colors', i, 'name', c.name)}</td><td><input class="color-input" type="color" data-arr="colors" data-i="${i}" data-k="hex" value="${c.hex}" aria-label="Color"></td><td>${inp('colors', i, 'price', c.price, 'number', 'step="10000"')}</td><td><a class="btn btn-sm btn-ghost" href="#/modelos/${m.id}?tab=colors&c=${c.id}">Ver</a></td><td>${actBtn('rm', 'colors|' + i, 'trash', 'Quitar color')}</td></tr>`).join('')}
    </tbody></table></div><button class="btn btn-sm" data-add="colors">${icon('plus', 15)} Agregar color</button>`;
  if (tab === 'wheels') body = `<div class="table-wrap sub-table"><table class="table"><thead><tr><th>Nombre</th><th>Aro</th><th>Diseño</th><th>Acabado</th><th>Precio</th><th></th></tr></thead><tbody>
    ${m.wheels.map((w, i) => `<tr><td>${inp('wheels', i, 'name', w.name)}</td><td>${inp('wheels', i, 'inch', w.inch, 'number')}</td><td>${sel('wheels', i, 'style', w.style, [['std', '5 rayos'], ['multi', 'Multirrayo'], ['sport', 'Sport 10 rayos'], ['aero', 'Aerodinámica']])}</td><td>${sel('wheels', i, 'rim', w.rim, [['silver', 'Plata'], ['two', 'Diamantada'], ['black', 'Negra'], ['graphite', 'Grafito']])}</td><td>${inp('wheels', i, 'price', w.price, 'number', 'step="10000"')}</td><td>${actBtn('rm', 'wheels|' + i, 'trash', 'Quitar')}</td></tr>`).join('')}
    </tbody></table></div><button class="btn btn-sm" data-add="wheels">${icon('plus', 15)} Agregar llanta</button>`;
  if (tab === 'packs') body = `<div class="table-wrap sub-table"><table class="table"><thead><tr><th>Pack</th><th>Precio</th><th>Descripción</th><th></th></tr></thead><tbody>
    ${m.packs.map((p, i) => `<tr><td>${inp('packs', i, 'name', p.name)}</td><td>${inp('packs', i, 'price', p.price, 'number', 'step="10000"')}</td><td><input class="input" data-arr="packs" data-i="${i}" data-k="desc" value="${escape(p.desc)}" aria-label="Descripción"></td><td>${actBtn('rm', 'packs|' + i, 'trash', 'Quitar')}</td></tr>`).join('')}
    </tbody></table></div><button class="btn btn-sm" data-add="packs">${icon('plus', 15)} Agregar pack</button>`;

  const w = m.wheels[0] || {};
  v.innerHTML = `${pageHead(`${brand(m.brandId)?.name} ${m.name}`, `Edición en vivo · cada cambio se guarda y se refleja en el <a href="index.html#/modelo/${m.id}" target="_blank">configurador público</a>.`, `<a class="btn btn-ghost" href="#/modelos">${icon('back', 16)} Modelos</a>`)}
  <div class="grid-main"><div class="card stack"><nav class="tabs">${TABS.map(([k, l]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/modelos/${m.id}?tab=${k}">${l}</a>`).join('')}</nav><div data-body>${body}</div></div>
    <div class="card stack"><h3>Vista previa</h3>${['side', 'front'].map(view => carSVG({ body: m.body, paint: prev.hex, view, fuel: m.fuel, wheel: { style: w.style, rim: w.rim } })).join('')}
      <p class="small"><i class="swatch-dot" style="background:${prev.hex}"></i> ${escape(prev.name)} · desde <b>${money(fromPrice(m))}</b></p>
      <div class="kv-mini small muted">${m.versions.length} versiones · ${m.colors.length} colores · ${m.wheels.length} llantas · ${m.packs.length} packs</div></div></div>`;
  const save = (patch, msg) => { db.update('models', m.id, patch); log('modelo', `${m.name}: ${msg}`); toast('Guardado · visible en el sitio', 'success', 1600); };
  v.addEventListener('change', e => {
    const t = e.target;
    if (t.closest('[data-gen]')) {
      const val = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
      if (t.name === 'name' && !val) return toast('El nombre es obligatorio', 'warning');
      return save({ [t.name]: val }, `${t.name} actualizado`);
    }
    if (t.dataset.arr) {
      const arr = t.dataset.arr, i = +t.dataset.i, k = t.dataset.k, cur = db.get('models', m.id);
      const val = t.type === 'number' || k === 'tier' ? Number(t.value) : t.value;
      if ((k === 'price' || k === 'cost') && val < 0) return toast('El precio no puede ser negativo', 'warning');
      save({ [arr]: cur[arr].map((x, j) => j === i ? { ...x, [k]: val } : x) }, `${arr}[${i}].${k}`);
    }
  });
  v.addEventListener('click', async e => {
    const a = e.target.closest('[data-add]');
    if (a) {
      const arr = a.dataset.add, cur = db.get('models', m.id), n = cur[arr].length + 1;
      const base = { versions: { id: `${m.id}-${Date.now().toString(36).slice(-4)}`, name: 'Nueva versión', price: fromPrice(cur) + 1000000, cost: Math.round((fromPrice(cur) + 1000000) * .87), engine: cur.versions[0]?.engine || '—', hp: cur.versions[0]?.hp || 120, trans: 'Automática', cons: '—', traction: 'Delantera', tier: 1 }, colors: { id: 'c' + Date.now().toString(36).slice(-4), name: 'Nuevo color', hex: '#3a6ea5', price: 350000 }, wheels: { id: 'w' + Date.now().toString(36).slice(-4), name: 'Llantas 19" especiales', inch: 19, style: 'sport', rim: 'graphite', price: 890000 }, packs: { id: 'p-' + Date.now().toString(36).slice(-4), name: 'Nuevo pack', price: 490000, desc: 'Descripción del pack.' } }[arr];
      save({ [arr]: [...cur[arr], base] }, `${arr} agregado`);
      return;
    }
    const r = e.target.closest('[data-act="rm"]');
    if (r) {
      const [arr, i] = r.dataset.id.split('|'), cur = db.get('models', m.id);
      if (cur[arr].length <= 1 && arr !== 'packs') return toast('Debe quedar al menos uno', 'warning');
      if (!await confirm(`¿Quitar "${cur[arr][+i].name}"?`, { danger: true, ok: 'Quitar' })) return;
      save({ [arr]: cur[arr].filter((_, j) => j !== +i) }, `${arr} eliminado`);
    }
  });
}
export { tierFeatures };
