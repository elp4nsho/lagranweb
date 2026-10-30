// Mi garage (cliente): autos, órdenes activas, libro de mantenciones digital, documentos, inspecciones, dyno y membresía.
import { money, escape, date, toast, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { DOC_TYPES, FUEL } from '../data/catalog.js';
import { customerById, tierById, nextServices, kmFmt, vehicleName, woTotal, woState, lineOf, inspectionStats, programs, allModels } from '../shared/domain.js';
import { normPlate, ymd } from '../shared/util.js';
import { carArt } from '../shared/car-art.js';
import { dynoCard } from './dyno.js';

let sel = null, tab = 'resumen';
const badge = s => `<span class="badge badge-${s.badge}">${escape(s.label)}</span>`;
function docBadge(exp) {
  const d = (new Date(exp) - Date.now()) / 864e5;
  return d < 0 ? '<span class="badge badge-danger">Vencido</span>' : d < 45 ? `<span class="badge badge-warning">Vence en ${Math.ceil(d)} días</span>` : '<span class="badge badge-success">Vigente</span>';
}

export function renderGarage(el) {
  const u = auth.current();
  if (!u || u.role !== 'cliente') {
    el.innerHTML = `<section class="section"><div class="container narrow"><div class="card stack" style="text-align:center;align-items:center"><span class="big-ico">🔑</span><h1 style="margin:0">Mi garage</h1>
      <p class="lead">${u ? `Estás conectado como <b>${escape(u.name)}</b> (equipo). El garage es para clientes.` : 'Ingresa para ver tus autos, el libro de mantenciones digital, documentos e inspecciones.'}</p>
      <a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/garage')}">${u ? 'Cambiar de cuenta' : 'Ingresar'}</a></div></div></section>`;
    return;
  }
  const paint = () => {
    const cust = customerById(u.customerId);
    if (!cust) { el.innerHTML = '<section class="section"><div class="container card empty">No encontramos tu ficha de cliente.</div></section>'; return; }
    const tier = tierById(cust.tier), cars = db.query('vehicles', v => v.customerId === cust.id);
    if (!cars.find(v => v.id === sel)) sel = cars[0]?.id;
    const v = cars.find(x => x.id === sel);
    const orders = db.query('workOrders', w => w.customerId === cust.id);
    const active = orders.filter(w => !['entregada', 'cancelada'].includes(w.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const year = orders.filter(w => w.status === 'entregada' && w.deliveredAt > ymd(new Date(Date.now() - 365 * 864e5)));
    el.innerHTML = `<section class="section"><div class="container stack">
      <div class="sec-head"><div><span class="eyebrow">Mi garage</span><h1>Hola, ${escape(cust.name.split(' ')[0])}</h1><p class="muted" style="margin:0">${cars.length} auto${cars.length === 1 ? '' : 's'} · ${year.length} servicios en los últimos 12 meses · ${money(year.reduce((a, w) => a + woTotal(w), 0))} invertidos</p></div>
        <div class="row"><button class="btn btn-sm" data-addcar>+ Agregar auto</button><a class="btn btn-primary btn-sm" href="#/agendar">Agendar servicio</a><button class="btn btn-sm btn-ghost" data-out>Salir</button></div></div>
      <div class="grid-2">
        <div class="card member-card stack" style="gap:6px"><small>Membresía</small><b class="price-xl">${tier ? escape(tier.name) : 'Sin membresía'}</b><small>${tier ? `${tier.discount}% de descuento · ${tier.conciergeFree >= 99 ? 'concierge ilimitado' : tier.conciergeFree + ' retiros al año'} · desde ${escape(cust.tierSince || '')}` : 'Activa Gold o Black para concierge ilimitado.'}</small><a class="btn btn-sm" style="align-self:flex-start;margin-top:6px" href="#/membresias">${tier ? 'Ver beneficios' : 'Ver membresías'}</a></div>
        <div class="card stack"><h3 style="margin:0">Órdenes en curso</h3>${active.length ? active.map(w => { const ins = w.inspectionId && db.get('inspections', w.inspectionId); return `<div class="row between" style="gap:8px"><span><b class="mono">${w.code}</b> · ${escape(vehicleName(db.get('vehicles', w.vehicleId)))}<small class="muted d-block">${escape(w.title)}</small></span><span class="row" style="gap:6px">${badge(woState(w.status))}${w.status === 'aprobacion' && ins ? `<a class="btn btn-sm btn-primary" href="#/inspeccion/${ins.id}">Aprobar</a>` : ''}<a class="btn btn-sm" href="#/seguimiento/${w.code}">Seguir</a></span></div>`; }).join('') : '<p class="muted" style="margin:0">No tienes órdenes activas.</p>'}</div>
      </div>
      <div class="garage-cars">${cars.map(c => `<button class="card gcar ${c.id === sel ? 'on' : ''}" data-car="${c.id}"><span class="car-frame">${carArt({ body: c.body, color: c.color, ev: c.fuel === 'electrico' })}</span><b>${escape(vehicleName(c))}</b><small class="muted">${escape(c.plate)} · ${c.year} · ${kmFmt(c.km)}</small></button>`).join('')}</div>
      ${v ? carDetail(v, cust, orders.filter(w => w.vehicleId === v.id)) : '<div class="card empty">Agrega tu primer auto.</div>'}
    </div></section>`;
  };
  el.addEventListener('click', async e => {
    const c = e.target.closest('[data-car]'); if (c) { sel = c.dataset.car; paint(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
    if (e.target.closest('[data-out]')) { auth.logout(); location.href = 'index.html'; return; }
    if (e.target.closest('[data-addcar]')) return addCar(u);
    if (e.target.closest('[data-km]')) return updateKm(sel, u);
    if (e.target.closest('[data-doc]')) return addDoc(sel, u);
  });
  paint();
  return { refresh: paint };
}

function carDetail(v, cust, orders) {
  const delivered = orders.filter(w => w.status === 'entregada').sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));
  const ins = db.query('inspections', i => i.vehicleId === v.id && !i.draft).sort((a, b) => b.at.localeCompare(a.at));
  const dy = db.query('dyno', d => d.vehicleId === v.id);
  const next = nextServices(v, 3, cust.tier);
  const tabs = [['resumen', 'Resumen'], ['libro', `Libro de mantenciones (${delivered.length})`], ['docs', `Documentos (${(v.docs || []).length})`], ['insp', `Inspecciones (${ins.length})`], ...(dy.length ? [['dyno', `Dyno (${dy.length})`]] : [])];
  if (!tabs.some(([k]) => k === tab)) tab = 'resumen';
  let body = '';
  if (tab === 'resumen') body = `<div class="grid-2"><div class="stack"><div class="car-frame">${carArt({ body: v.body, color: v.color, ev: v.fuel === 'electrico', label: vehicleName(v) })}</div>
      <dl class="dl"><dt>Patente</dt><dd class="mono">${escape(v.plate)}</dd><dt>Año</dt><dd>${v.year}</dd><dt>Color</dt><dd><span class="swatch" style="--sw:${escape(v.color)}"></span> ${escape(v.colorName || '')}</dd><dt>Motorización</dt><dd>${escape(FUEL[v.fuel] || v.fuel)} · ${v.hp || '—'} CV</dd><dt>VIN</dt><dd class="mono small">${escape(v.vin || '—')}</dd><dt>Kilometraje</dt><dd>${kmFmt(v.km)} <button class="btn btn-sm btn-ghost" data-km>Actualizar</button></dd></dl></div>
    <div class="stack"><h3 style="margin:0">Próximos servicios del plan</h3>${next.length ? `<ol class="svc-timeline">${next.map((s, i) => `<li class="${i === 0 ? 'next' : ''}"><div><span class="km">${kmFmt(s.km)}</span></div><div><b>${escape(s.level.name)}</b><small class="muted d-block">${escape(s.tasks.slice(0, 2).join(' · '))}</small></div><b>${money(s.price)}</b></li>`).join('')}</ol>
      <a class="btn btn-primary" href="#/agendar">Agendar ${escape(next[0].level.name.toLowerCase())}</a>` : '<p class="muted">Sin programa de fábrica para esta marca.</p>'}</div></div>`;
  if (tab === 'libro') body = delivered.length ? `<ol class="book-log">${delivered.map(w => `<li><div class="row between"><span><b>${escape(w.title)}</b> <span class="stamp">Sellado</span><small class="muted d-block">${date(w.deliveredAt)} · ${kmFmt(w.km)} · ${escape(lineOf(w.line).label)} · ${w.code}</small></span><b>${money(woTotal(w))}</b></div>
      <ul class="small muted" style="margin:6px 0 0;padding-left:18px">${w.items.map(i => `<li>${escape(i.desc)}</li>`).join('')}</ul>${w.inspectionId ? `<a class="small" href="#/inspeccion/${w.inspectionId}">Ver inspección digital</a>` : ''}</li>`).join('')}</ol>` : '<div class="empty">Aún no hay servicios registrados para este auto.</div>';
  if (tab === 'docs') body = `<div class="row between"><p class="muted" style="margin:0">Te avisamos 30 días antes de cada vencimiento.</p><button class="btn btn-sm" data-doc>+ Subir documento</button></div>${(v.docs || []).map(d => `<div class="doc-row"><span>📄 <b>${escape(d.type)}</b><small class="muted d-block">${escape(d.file)} · vence ${date(d.exp + 'T12:00:00')}</small></span>${docBadge(d.exp)}</div>`).join('') || '<div class="empty">Sin documentos.</div>'}`;
  if (tab === 'insp') body = ins.length ? `<div class="stack">${ins.map(i => { const s = inspectionStats(i); return `<a class="row between card" style="text-decoration:none;color:var(--text)" href="#/inspeccion/${i.id}"><span><b>${date(i.at)}</b> · ${kmFmt(i.km)}<small class="muted d-block">${i.battery ? `Batería SOH ${i.battery.soh}% · ` : ''}${i.items.length} puntos revisados</small></span><span class="row" style="gap:6px"><span class="badge badge-success">${s.ok}</span><span class="badge badge-warning">${s.atencion}</span><span class="badge badge-danger">${s.urgente}</span></span></a>`; }).join('')}</div>` : '<div class="empty">Sin inspecciones digitales aún.</div>';
  if (tab === 'dyno') body = `<div class="grid-auto">${dy.map(dynoCard).join('')}</div>`;
  return `<div class="card stack"><div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${escape(l)}</button>`).join('')}</div>${body}</div>`;
}

async function addCar(u) {
  const models = allModels();
  const v = await formModal({ title: 'Agregar auto a mi garage', fields: [
    { name: 'model', label: 'Marca y modelo', type: 'select', options: models.map(m => [`${m.brand}|${m.name}`, `${m.brand} ${m.name}`]), required: true },
    { name: 'year', label: 'Año', type: 'number', value: 2023, required: true }, { name: 'km', label: 'Kilometraje (km)', type: 'number', value: 10000, required: true },
    { name: 'plate', label: 'Patente', required: true, placeholder: 'Ej: KJTR-45' }, { name: 'color', label: 'Color (hex)', type: 'color', value: '#5b6474' }] });
  if (!v) return;
  const [brand, name] = v.model.split('|'), m = models.find(x => x.brand === brand && x.name === name);
  db.insert('vehicles', { customerId: u.customerId, brand, model: name, year: v.year, km: v.km, plate: normPlate(v.plate), color: v.color || '#5b6474', colorName: 'Personalizado', fuel: m.fuel, body: m.body, hp: m.hp, vin: '', docs: [], addedAt: new Date().toISOString() });
  db.log('garage', `${u.name} agregó ${brand} ${name}`, u.id);
  toast('Auto agregado', 'success');
}
async function updateKm(id, u) {
  const car = db.get('vehicles', id);
  const v = await formModal({ title: 'Actualizar kilometraje', fields: [{ name: 'km', label: 'Kilometraje actual (km)', type: 'number', value: car.km, required: true }] });
  if (!v || !(v.km >= 0)) return;
  db.update('vehicles', id, { km: v.km }); toast('Kilometraje actualizado', 'success');
}
async function addDoc(id, u) {
  const v = await formModal({ title: 'Subir documento', fields: [{ name: 'type', label: 'Tipo', type: 'select', options: DOC_TYPES, required: true }, { name: 'exp', label: 'Fecha de vencimiento', type: 'date', required: true }] });
  if (!v) return;
  const car = db.get('vehicles', id);
  db.update('vehicles', id, { docs: [...(car.docs || []).filter(d => d.type !== v.type), { type: v.type, exp: v.exp, file: `${v.type.toLowerCase().replace(/[^a-z]+/g, '-')}-${car.plate}.pdf` }] });
  db.log('garage', `${u.name} subió ${v.type} de ${car.plate}`, u.id);
  toast('Documento guardado (archivo simulado)', 'success');
}
export { programs };
