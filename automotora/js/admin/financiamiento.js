// Productos financieros (tasas por plazo, VFMG) y solicitudes de crédito.
import { escape, money, toast, modal, ago } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { model, finBadge, FIN_STATUS, userName, FUELS } from '../shared/domain.js';
import { simulate, plazosOf, scoreTone } from '../shared/finance.js';
import { appDetailHTML, decide } from '../shared/credit.js';
import { sw, log } from './kit.js';
import { nf1 } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const TYPES = { convencional: 'Convencional', inteligente: 'Compra Inteligente (VFMG)', leasing: 'Leasing' };
export function renderFinProducts(v) {
  const prods = db.all('finProducts');
  v.innerHTML = `${pageHead('Productos y tasas', 'Tasas mensuales por plazo. El simulador del sitio y las cotizaciones usan estos valores al instante.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo producto</button>`)}
  ${prods.map(p => { const ex = simulate({ product: p, price: 20000000, pie: 6000000, plazo: plazosOf(p).includes(36) ? 36 : plazosOf(p)[0] }); return `<div class="card stack" data-p="${p.id}"><div class="card-title"><h3>${icon('card', 18)} ${escape(p.name)}</h3><div class="row">${sw('active', p.id, p.active, 'Activo')}<button class="btn btn-sm btn-ghost btn-icon" data-del="${p.id}" aria-label="Eliminar">${icon('trash', 15)}</button></div></div>
    <div class="form-grid"><div class="field"><label>Nombre</label><input class="input" data-f="name" value="${escape(p.name)}"></div><div class="field"><label>Tipo</label><select class="select" data-f="type">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}" ${k === p.type ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Pie mínimo %</label><input class="input" type="number" data-f="minPie" value="${p.minPie}"></div><div class="field"><label>Gastos operacionales</label><input class="input" type="number" step="10000" data-f="fees" value="${p.fees}"></div><div class="field"><label>Seguro desgravamen % mensual</label><input class="input" type="number" step="0.005" data-f="insurancePct" value="${p.insurancePct}"></div><div class="field"><label>Solo motorización</label><select class="select" data-f="onlyFuel"><option value="">Todas</option>${['electrico,phev', 'hibrido,phev,electrico'].map(o => `<option value="${o}" ${(p.onlyFuel || []).join(',') === o ? 'selected' : ''}>${o.split(',').map(x => FUELS[x]).join(' / ')}</option>`).join('')}</select></div></div>
    <div class="table-wrap sub-table"><table class="table"><thead><tr><th>Plazo (meses)</th>${plazosOf(p).map(n => `<th>${n}</th>`).join('')}<th></th></tr></thead><tbody>
      <tr><td>Tasa mensual %</td>${plazosOf(p).map(n => `<td><input class="input inline-edit" type="number" step="0.01" min="0" data-rate="${n}" value="${p.rates[n]}" aria-label="Tasa ${n} meses"></td>`).join('')}<td><button class="btn btn-sm" data-addplazo>${icon('plus', 14)} Plazo</button></td></tr>
      ${p.type === 'inteligente' ? `<tr><td>VFMG % del precio</td>${plazosOf(p).map(n => `<td><input class="input inline-edit" type="number" step="1" data-vfmg="${n}" value="${p.vfmg?.[n] ?? 45}" aria-label="VFMG ${n}"></td>`).join('')}<td></td></tr>` : ''}
      <tr><td class="muted">Ej. $20 MM, pie 30%</td>${plazosOf(p).map(n => { const s = simulate({ product: p, price: 20000000, pie: 6000000, plazo: n }); return `<td class="small"><b>${money(s.cuota)}</b><br>CAE ${nf1(s.cae, 1)}%</td>`; }).join('')}<td></td></tr></tbody></table></div>
    <div class="field"><label>Descripción pública</label><input class="input" data-f="desc" value="${escape(p.desc)}"></div><small class="muted">Ejemplo 36 m: cuota ${money(ex.cuota)} · CAE ${nf1(ex.cae, 2)}%</small></div>`; }).join('')}`;
  const upd = (id, patch, msg) => { db.update('finProducts', id, patch); log('financiamiento', `${db.get('finProducts', id).name}: ${msg}`); toast('Guardado · simulador actualizado', 'success', 1500); };
  v.addEventListener('change', e => {
    const card = e.target.closest('[data-p]'); if (!card) return; const id = card.dataset.p, p = db.get('finProducts', id), t = e.target;
    if (t.dataset.f) { let val = t.type === 'number' ? Number(t.value) : t.value; if (t.dataset.f === 'onlyFuel') val = t.value ? t.value.split(',') : null; upd(id, { [t.dataset.f]: val }, t.dataset.f); }
    if (t.dataset.rate) { const r = Number(t.value); if (!(r >= 0 && r < 5)) return toast('Tasa mensual fuera de rango (0–5%)', 'warning'); upd(id, { rates: { ...p.rates, [t.dataset.rate]: r } }, `tasa ${t.dataset.rate}m = ${r}%`); }
    if (t.dataset.vfmg) upd(id, { vfmg: { ...(p.vfmg || {}), [t.dataset.vfmg]: Number(t.value) } }, `VFMG ${t.dataset.vfmg}m`);
    if (t.dataset.actChange === 'active') upd(id, { active: t.checked }, t.checked ? 'activado' : 'desactivado');
  });
  v.addEventListener('click', e => {
    const card = e.target.closest('[data-p]');
    if (e.target.closest('[data-addplazo]')) { const p = db.get('finProducts', card.dataset.p), n = Math.max(...plazosOf(p)) + 12; upd(p.id, { rates: { ...p.rates, [n]: (p.rates[Math.max(...plazosOf(p))] + .06).toFixed(2) * 1 }, ...(p.type === 'inteligente' ? { vfmg: { ...p.vfmg, [n]: 35 } } : {}) }, `plazo ${n} agregado`); }
    const d = e.target.closest('[data-del]'); if (d) { if (db.count('finProducts') <= 1) return toast('Debe existir al menos un producto', 'warning'); db.remove('finProducts', d.dataset.del); log('financiamiento', 'Producto eliminado'); }
  });
  v.querySelector('[data-new]').onclick = () => { db.insert('finProducts', { name: 'Nuevo producto', type: 'convencional', active: false, minPie: 20, rates: { 24: 1.3, 36: 1.4 }, fees: 250000, insurancePct: .045, desc: 'Descripción del producto.' }); log('financiamiento', 'Nuevo producto creado'); };
}

export function renderFinApps(v, _p, query) {
  const all = db.all('finApps'), dec = all.filter(a => a.decidedAt);
  v.innerHTML = `${pageHead('Solicitudes de crédito', 'Pre-evaluaciones del sitio y solicitudes ingresadas por los ejecutivos.', `<a class="btn btn-primary" href="credito.html">${icon('card', 16)} Abrir app de crédito</a>`)}
  <div class="grid-4">${statCard('Por evaluar', all.filter(a => ['recibida', 'en_evaluacion'].includes(a.status)).length, '', 'clock')}${statCard('Tasa de aprobación', nf1(dec.filter(a => a.status !== 'rechazada').length / Math.max(1, dec.length) * 100) + '%', '', 'check')}${statCard('Score promedio', Math.round(all.reduce((s, a) => s + a.score, 0) / Math.max(1, all.length)), '', 'gauge')}${statCard('Monto aprobado', money(dec.filter(a => a.status !== 'rechazada').reduce((s, a) => s + a.price - a.pie, 0)), '', 'money')}</div><div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('finApps').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: a => `${a.number} ${a.name} ${a.rut}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(FIN_STATUS).map(([k, [l]]) => [k, l]), value: query.estado || '' }, { key: 'productId', label: 'Producto', options: db.all('finProducts').map(p => [p.id, p.name]) }],
    columns: [{ key: 'number', label: 'N°', render: a => `<b class="mono">${a.number}</b><br><small class="muted">${ago(a.createdAt)}</small>` }, { key: 'name', label: 'Solicitante', render: a => `${escape(a.name)}<br><small class="muted">${escape(a.rut)}</small>` }, { key: 'modelId', label: 'Vehículo', render: a => escape(model(a.modelId)?.name || '') }, { key: 'price', label: 'Monto', render: a => money(a.price - a.pie) }, { key: 'renta', label: 'Renta', render: a => money(a.renta) }, { key: 'score', label: 'Score', render: a => `<b style="color:var(--${scoreTone(a.score)})">${a.score}</b>` }, { key: 'status', label: 'Estado', render: a => ({ __raw: true, value: finBadge(a.status) }) }, { key: 'analystId', label: 'Analista', render: a => escape(userName(a.analystId)) }],
    onRow: a => openApp(a.id, () => lv.refresh()),
    csv: { name: 'solicitudes-credito.csv', map: a => ({ numero: a.number, nombre: a.name, rut: a.rut, modelo: model(a.modelId)?.name, precio: a.price, pie: a.pie, plazo: a.plazo, cuota: a.cuota, renta: a.renta, score: a.score, estado: FIN_STATUS[a.status][0] }) }
  });
}
export function openApp(id, after) {
  const a = db.get('finApps', id);
  const open = ['recibida', 'en_evaluacion'].includes(a.status);
  const m = modal({ title: `Solicitud ${a.number}`, size: 'lg', body: appDetailHTML(a) + (open ? `<div class="field" style="margin-top:12px"><label for="cond">Condiciones / motivo</label><input class="input" id="cond" placeholder="Ej: aumentar pie a 35%"></div>` : ''), foot: open ? `<button class="btn btn-danger" data-d="rechazada">Rechazar</button><button class="btn" data-d="aprobada_condiciones">Aprobar con condiciones</button><button class="btn btn-primary" data-d="aprobada">Aprobar</button>` : '<button class="btn btn-primary" data-close>Cerrar</button>' });
  m.el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const c = m.el.querySelector('#cond').value.trim(); if (b.dataset.d === 'aprobada_condiciones' && !c) return toast('Indica la condición', 'warning'); decide(a, b.dataset.d, { conditions: c, note: c }); m.close(); after && after(); });
}
