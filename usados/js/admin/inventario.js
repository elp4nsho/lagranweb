// Inventario: CRUD de autos con costo de compra, reacondicionamiento, margen y flujo de publicación
// (en evaluación → reacondicionamiento → certificado → publicado → reservado → vendido).
import { money, escape, date, toast, modal, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { CAR_STATES, CAR_FLOW, MODELS, PAINT, EQUIP } from '../data/catalog.js';
import { carTitle, carName, kmFmt, reconCost, daysInStock, setCarStatus, statusBadge, inspectionSummary, branchById, nextStock, marketValue, listPrice } from '../shared/domain.js';
import { normPlate } from '../shared/util.js';
import { carArt } from '../shared/car-art.js';
import { certReport } from '../public/auto.js';
import { mm } from './dashboard.js';

export function carSheet(id, ctx) {
  const draw = () => {
    const c = db.get('cars', id), ins = c.inspectionId && db.get('inspections', c.inspectionId), s = ins && inspectionSummary(ins);
    const rc = reconCost(c), margin = (c.soldPrice || c.price) - c.cost - rc, i = CAR_FLOW.indexOf(c.status);
    return `<div class="stack">
      <div class="wo-flow">${CAR_FLOW.map((k, j) => `<span class="${j < i ? 'done' : j === i ? 'on' : ''}">${CAR_STATES[k].label}</span>`).join('')}</div>
      <div class="grid-2"><div class="car-frame">${carArt({ body: c.body, color: c.color })}</div>
        <dl class="dl small"><dt>Stock</dt><dd class="mono">${escape(c.stock)} · ${escape(c.plate)}</dd><dt>Sucursal</dt><dd>${escape(branchById(c.branchId)?.name || '')}</dd><dt>Ingreso</dt><dd>${date(c.acquiredAt)} · ${daysInStock(c)} días · origen ${escape(c.source)}</dd>
          <dt>Kilometraje</dt><dd>${kmFmt(c.km)} · ${escape(c.transmission)} · ${escape(c.fuel)}</dd>${c.publishedAt ? `<dt>Publicado</dt><dd>${date(c.publishedAt)} · ${c.views || 0} visitas</dd>` : ''}${c.soldAt ? `<dt>Vendido</dt><dd>${date(c.soldAt)} en ${money(c.soldPrice)}</dd>` : ''}</dl></div>
      <div class="grid-3"><div class="card stat" style="box-shadow:none"><span class="label">Precio publicado</span><span class="value">${money(c.price)}</span><span class="small muted">Mercado ${money(c.marketPrice)}</span></div>
        <div class="card stat" style="box-shadow:none"><span class="label">Costo + reacond.</span><span class="value">${money(c.cost + rc)}</span><span class="small muted">compra ${money(c.cost)}</span></div>
        <div class="card stat" style="box-shadow:none"><span class="label">Margen bruto</span><span class="value" style="color:var(--${margin > 0 ? 'success' : 'danger'})">${money(margin)}</span><span class="small muted">${((margin / (c.soldPrice || c.price)) * 100).toFixed(1)}%</span></div></div>
      <div class="stack" style="gap:6px"><div class="row between"><h4 style="margin:0">Reacondicionamiento</h4><button class="btn btn-sm" data-addrecon>+ Agregar costo</button></div>
        <ul class="lines small">${(c.recon || []).map((r, k) => `<li><span>${escape(r.desc)}</span><span class="row" style="gap:6px"><b>${money(r.amount)}</b><button class="btn btn-sm btn-ghost" data-delrecon="${k}" aria-label="Quitar">✕</button></span></li>`).join('') || '<li class="muted">Sin costos.</li>'}</ul></div>
      <div class="card" style="box-shadow:none"><div class="row between"><h4 style="margin:0">Certificación</h4>${s ? `<span class="badge badge-${s.f ? 'danger' : ins.status === 'completada' ? 'success' : 'warning'}">${ins.status === 'completada' ? `${s.score}% · ${s.f} fallas` : `En curso · ${150 - s.pend}/150`}</span>` : '<span class="badge">Sin inspección</span>'}</div>
        ${ins ? `<details><summary class="small">Ver informe</summary>${certReport(ins)}</details>` : '<p class="small muted">Asigna la inspección desde la app del inspector.</p>'}</div>
      <label class="check"><input type="checkbox" data-feat ${c.featured ? 'checked' : ''}> Destacado en la portada</label>
    </div>`;
  };
  const foot = () => {
    const c = db.get('cars', id), nx = { evaluacion: 'reacondicionamiento', reacondicionamiento: 'certificado', certificado: 'publicado' }[c.status];
    return `${c.status !== 'vendido' ? '<button class="btn btn-danger btn-sm" data-del>Eliminar</button>' : ''}<span class="grow"></span><button class="btn btn-sm" data-edit>Editar ficha</button>${c.status === 'publicado' ? '<button class="btn btn-sm" data-unpub>Despublicar</button>' : ''}${c.status === 'reservado' ? '<button class="btn btn-sm" data-free>Liberar reserva</button>' : ''}${nx ? `<button class="btn btn-sm btn-primary" data-next="${nx}">→ ${CAR_STATES[nx].label}</button>` : ''}`;
  };
  const m = modal({ title: carTitle(db.get('cars', id)), size: 'lg', body: draw(), foot: foot() });
  const re = () => { if (!document.body.contains(m.el)) return; m.el.querySelector('.modal-body').innerHTML = draw(); m.el.querySelector('.modal-foot').innerHTML = foot(); };
  m.el.addEventListener('change', e => { if (e.target.closest('[data-feat]')) { db.update('cars', id, { featured: e.target.checked }); toast(e.target.checked ? 'Destacado en portada' : 'Quitado de destacados', 'success'); } });
  m.el.addEventListener('click', async e => {
    const c = db.get('cars', id);
    const n = e.target.closest('[data-next]');
    if (n) {
      const to = n.dataset.next, ins = c.inspectionId && db.get('inspections', c.inspectionId), s = ins && inspectionSummary(ins);
      if (to === 'certificado' && (!ins || ins.status !== 'completada' || s.f)) { toast('Para certificar se necesita una inspección completada y sin fallas', 'warning'); return; }
      if (to === 'publicado' && !(c.price > 0)) { toast('Define el precio antes de publicar', 'warning'); return; }
      setCarStatus(id, to, ctx.user.id); toast(`${c.stock} → ${CAR_STATES[to].label}`, 'success'); re();
    }
    if (e.target.closest('[data-unpub]')) { setCarStatus(id, 'certificado', ctx.user.id, 'despublicado'); re(); }
    if (e.target.closest('[data-free]') && await confirm('¿Liberar la reserva y volver a publicar el auto? El abono se reembolsa.', { ok: 'Liberar' })) { const r = db.find('reservations', x => x.carId === id && x.status === 'activa'); if (r) db.update('reservations', r.id, { status: 'cancelada' }); setCarStatus(id, 'publicado', ctx.user.id, 'reserva liberada'); re(); }
    if (e.target.closest('[data-addrecon]')) { const v = await formModal({ title: 'Costo de reacondicionamiento', fields: [{ name: 'desc', label: 'Trabajo', required: true }, { name: 'amount', label: 'Monto (CLP)', type: 'number', required: true }] }); if (v && v.amount > 0) { db.update('cars', id, { recon: [...(c.recon || []), v] }); db.log('inventario', `${c.stock}: reacondicionamiento ${v.desc} ${money(v.amount)}`, ctx.user.id); re(); } }
    const d = e.target.closest('[data-delrecon]'); if (d) { db.update('cars', id, { recon: c.recon.filter((_, k) => k !== +d.dataset.delrecon) }); re(); }
    if (e.target.closest('[data-edit]')) { await editCar(c, ctx); re(); }
    if (e.target.closest('[data-del]') && await confirm(`¿Eliminar ${c.stock} del inventario?`, { danger: true, ok: 'Eliminar' })) { db.remove('cars', id); db.log('inventario', `Eliminado ${c.stock} ${carName(c)}`, ctx.user.id); m.close(); toast('Auto eliminado', 'success'); }
  });
}

export async function editCar(c, ctx, preset = {}) {
  const v = await formModal({ title: c ? `Editar ${c.stock}` : 'Ingresar auto al inventario', size: 'lg', fields: [
    { name: 'model', label: 'Marca y modelo', type: 'select', options: MODELS.map(m => [`${m.brand}|${m.model}`, `${m.brand} ${m.model} ${m.version}`]), value: c ? `${c.brand}|${c.model}` : preset.model || '' },
    { name: 'year', label: 'Año', type: 'number', required: true, value: c?.year || preset.year || 2020 }, { name: 'km', label: 'Kilometraje', type: 'number', required: true, value: c?.km ?? preset.km ?? 50000 },
    { name: 'plate', label: 'Patente', required: true, value: c?.plate || '' }, { name: 'color', label: 'Color', type: 'select', options: PAINT.map(([n]) => n), value: c?.colorName },
    { name: 'branchId', label: 'Sucursal', type: 'select', options: db.all('branches').map(b => [b.id, b.name]), value: c?.branchId || 'b1' },
    { name: 'cost', label: 'Costo de compra (CLP)', type: 'number', required: true, value: c?.cost ?? preset.cost ?? '' }, { name: 'price', label: 'Precio de venta (vacío = sugerido)', type: 'number', value: c?.price || '' },
    { name: 'owners', label: 'Dueños anteriores', type: 'number', value: c?.owners || 1 }] });
  if (!v) return null;
  const [brand, model] = v.model.split('|'), m = MODELS.find(x => x.brand === brand && x.model === model);
  const plate = normPlate(v.plate);
  if (!/^[A-Z]{2,4}-?\d{2,4}$/.test(plate)) { toast('Patente inválida', 'warning'); return null; }
  if (!(v.cost > 0)) { toast('Indica el costo de compra', 'warning'); return null; }
  const mv = marketValue(m, v.year, v.km), [colorName, color] = PAINT.find(([n]) => n === v.color) || PAINT[0];
  const data = { brand, model, version: m.version, body: m.body, fuel: m.fuel, transmission: m.transmission, engine: m.engine, hp: m.hp, year: v.year, km: v.km, plate, colorName, color, branchId: v.branchId, cost: v.cost, price: v.price || listPrice(mv * 1.02), marketPrice: mv, owners: v.owners || 1 };
  if (c) { db.update('cars', c.id, data); db.log('inventario', `${c.stock}: ficha editada (${money(data.price)})`, ctx.user.id); toast('Ficha actualizada', 'success'); return db.get('cars', c.id); }
  const car = db.insert('cars', { ...data, stock: nextStock(), status: 'evaluacion', recon: [], doors: 4, seats: 5, source: preset.source || 'compra directa', acquiredAt: new Date().toISOString(), featured: false, views: 0, equipment: EQUIP.slice(0, 8), history: [], rtUntil: new Date(Date.now() + 200 * 864e5).toISOString().slice(0, 10) });
  db.log('inventario', `Ingreso ${car.stock}: ${brand} ${model} ${v.year} · costo ${money(v.cost)}`, ctx.user.id); toast(`Auto ingresado como ${car.stock}`, 'success');
  return car;
}

export default {
  id: 'inventario', label: 'Inventario', icon: '🚗', group: 'Comercial', roles: ['admin', 'gerente', 'vendedor'],
  watch: ['cars', 'inspections'],
  render(el, ctx) {
    const cars = db.all('cars'), stock = cars.filter(c => c.status !== 'vendido');
    el.innerHTML = `${pageHead('Inventario', 'Stock, costos, reacondicionamiento y flujo de publicación', ctx.can('compras') ? '<button class="btn btn-primary btn-sm" data-new>+ Ingresar auto</button>' : '')}
      <div class="kpi-grid">${Object.entries(CAR_STATES).filter(([k]) => k !== 'vendido').map(([k, s]) => kpi(s.label, String(stock.filter(c => c.status === k).length), k === 'publicado' ? mm(stock.filter(c => c.status === k).reduce((a, c) => a + c.price, 0)) : '')).join('')}</div><div data-t></div>`;
    el.querySelector('[data-new]')?.addEventListener('click', () => editCar(null, ctx));
    return smartTable(el.querySelector('[data-t]'), {
      rows: () => db.all('cars').map(c => ({ ...c, name: carName(c), days: daysInStock(c), margin: (c.soldPrice || c.price) - c.cost - reconCost(c), branch: branchById(c.branchId)?.name || '' })).sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(CAR_STATES).map(([k, s]) => [k, s.label]), value: ctx.query.status || '' }, { key: 'stockOnly', label: 'Stock', options: [['1', 'Sin vendidos']], value: '1', test: r => r.status !== 'vendido' }, { key: 'brand', label: 'Marca', options: [...new Set(cars.map(c => c.brand))].sort() }, { key: 'branchId', label: 'Sucursal', options: db.all('branches').map(b => [b.id, b.name]) }],
      search: r => `${r.stock} ${r.name} ${r.plate} ${r.version}`,
      columns: [
        { key: 'stock', label: 'Stock', render: r => `<span class="mono">${r.stock}</span>` },
        { key: 'name', label: 'Auto', render: r => `<span class="row nowrap" style="gap:8px"><span style="width:70px;flex:none">${carArt({ body: r.body, color: r.color })}</span><span><b>${escape(r.name)}</b><small class="muted d-block">${r.year} · ${kmFmt(r.km)}</small></span></span>` },
        { key: 'branch', label: 'Sucursal' }, { key: 'price', label: 'Precio', render: r => money(r.price) }, { key: 'cost', label: 'Costo', render: r => money(r.cost) },
        { key: 'margin', label: 'Margen', render: r => `<span style="color:var(--${r.margin > 0 ? 'success' : 'danger'})">${money(r.margin)}</span>` },
        { key: 'days', label: 'Días', render: r => `<span class="badge ${r.status !== 'vendido' && r.days > 60 ? 'badge-danger' : ''}">${r.days}</span>` },
        { key: 'status', label: 'Estado', render: r => statusBadge(CAR_STATES, r.status) + (r.featured ? ' ⭐' : '') }
      ],
      onRow: r => carSheet(r.id, ctx),
      csv: { name: 'inventario', map: r => ({ stock: r.stock, marca: r.brand, modelo: r.model, anio: r.year, km: r.km, patente: r.plate, sucursal: r.branch, estado: CAR_STATES[r.status].label, precio: r.price, costo: r.cost, reacondicionamiento: reconCost(r), margen: r.margin, dias: r.days }) }
    });
  }
};
