// Concierge: agenda de corridas por ventana, listado con filtros, detalle con mapa/firma y flota de cortesía.
import { escape, money, date, dateTime, toast, modal, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { CONC_STATES, CONC_FLOW, FLEET_STATES, WINDOWS, COMUNAS } from '../data/catalog.js';
import { vehicleById, customerById, userById, vehicleName, drivers, setConcStatus, statusBadge, kmFmt } from '../shared/domain.js';
import { ymd, addDays, fmtDay } from '../shared/util.js';
import { conciergeMap, trackSteps } from '../public/seguimiento.js';
import { carArt } from '../shared/car-art.js';

const TONE = { programado: 'info', 'en-camino': 'warning', retirado: 'primary', 'en-taller': 'primary', listo: 'success', 'en-entrega': 'warning', entregado: 'success', cancelado: 'danger' };
export const sigSvg = path => path ? `<svg class="sig-view" viewBox="0 0 300 100" role="img" aria-label="Firma"><path d="${escape(path)}"/></svg>` : '<span class="muted small">Sin firma</span>';

export function runDetail(id, ctx) {
  const draw = () => {
    const c = db.get('concierge', id), v = vehicleById(c.vehicleId), cu = customerById(c.customerId), fl = c.courtesyCarId && db.get('fleet', c.courtesyCarId);
    return `<div class="stack">${conciergeMap(c)}
      <div class="grid-2"><div>${trackSteps(c)}</div>
        <dl class="dl small"><dt>OT</dt><dd class="mono">${escape(c.code)}</dd><dt>Cliente</dt><dd>${escape(cu?.name || '')}<small class="muted d-block">${escape(cu?.phone || '')}</small></dd><dt>Vehículo</dt><dd>${escape(vehicleName(v))} · ${escape(v?.plate || '')}</dd><dt>Dirección</dt><dd>${escape(c.address)}, ${escape(c.comuna)} (${escape(c.kind)})</dd>
          <dt>Ventana</dt><dd>${fmtDay(c.date, { weekday: true })} · ${escape(c.window || '')}</dd>${c.deliveryWindow ? `<dt>Entrega</dt><dd>${escape(c.deliveryWindow)}</dd>` : ''}<dt>Cortesía</dt><dd>${fl ? escape(fl.name + ' · ' + fl.plate) : '—'}</dd><dt>Tarifa</dt><dd>${c.fee ? money(c.fee) : 'Incluida en membresía'}</dd></dl></div>
      <div class="grid-2"><div class="field"><label for="rd-drv">Chofer</label><select class="select" id="rd-drv"><option value="">Sin asignar</option>${drivers().map(d => `<option value="${d.id}" ${c.driverId === d.id ? 'selected' : ''}>${escape(d.name)} · turno ${escape(d.shift || '')}</option>`).join('')}</select></div>
        <div class="field"><label for="rd-st">Estado</label><select class="select" id="rd-st">${Object.entries(CONC_STATES).map(([k, s]) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${escape(s.label)}</option>`).join('')}</select></div></div>
      ${c.pickup ? `<div class="card" style="box-shadow:none"><h4 style="margin-top:0">Acta de retiro</h4><div class="grid-2"><dl class="dl small"><dt>Fecha</dt><dd>${dateTime(c.pickup.at)}</dd><dt>Kilometraje</dt><dd>${kmFmt(c.pickup.km)}</dd><dt>${v?.fuel === 'electrico' ? 'Carga' : 'Estanque'}</dt><dd>${c.pickup.charge}%</dd><dt>Fotos</dt><dd>${c.pickup.photos || 0} de 6 ángulos</dd><dt>Daños</dt><dd>${escape(c.pickup.damages || 'Sin observaciones')}</dd></dl><div>${sigSvg(c.pickup.sig)}<small class="muted d-block">Firma del cliente</small></div></div></div>` : ''}
      ${c.delivery?.at ? `<div class="callout ok small">Entregado ${dateTime(c.delivery.at)}${c.delivery.sig ? ' · firma registrada' : ''}</div>${c.delivery.sig ? sigSvg(c.delivery.sig) : ''}` : ''}
    </div>`;
  };
  const m = modal({ title: `Concierge ${db.get('concierge', id).code}`, size: 'lg', body: draw(), foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-save>Guardar</button>' });
  m.el.querySelector('[data-save]').onclick = () => {
    const c = db.get('concierge', id), drv = m.el.querySelector('#rd-drv').value, st = m.el.querySelector('#rd-st').value;
    if (drv !== (c.driverId || '')) { db.update('concierge', id, { driverId: drv || null }); db.log('concierge', `${c.code}: chofer ${userById(drv)?.name || 'sin asignar'}`, ctx.user.id); }
    if (st !== c.status) setConcStatus(id, st, ctx.user.id);
    toast('Corrida actualizada', 'success'); m.el.querySelector('.modal-body').innerHTML = draw();
  };
}

export default {
  id: 'concierge', label: 'Concierge y flota', icon: '🚘', group: 'Taller', roles: ['admin', 'gerente', 'asesor'],
  watch: ['concierge', 'fleet', 'users'],
  render(el, ctx) {
    const view = ctx.params.sub || 'agenda';
    el.innerHTML = `${pageHead('Concierge y flota', 'Retiros y entregas por ventana horaria, choferes y autos de cortesía')}
      <div class="tabs"><a class="tab ${view === 'agenda' ? 'active' : ''}" href="#/concierge/agenda">Agenda</a><a class="tab ${view === 'corridas' ? 'active' : ''}" href="#/concierge/corridas">Corridas</a><a class="tab ${view === 'flota' ? 'active' : ''}" href="#/concierge/flota">Flota de cortesía</a></div><div data-body></div>`;
    const body = el.querySelector('[data-body]');
    el.addEventListener('click', e => { const r = e.target.closest('[data-run]'); if (r) runDetail(r.dataset.run, ctx); });
    if (view === 'agenda') {
      const days = Array.from({ length: 5 }, (_, i) => ymd(addDays(new Date(), i)));
      const all = db.query('concierge', c => c.status !== 'cancelado');
      const at = (d, w) => all.filter(c => (c.date === d && c.window === w && !['listo', 'en-entrega', 'entregado'].includes(c.status)) || (c.deliveryWindow === w && c.date <= d && d === ymd() && ['listo', 'en-entrega'].includes(c.status)));
      const ds = drivers();
      body.innerHTML = `<div class="kpi-grid">${ds.map(d => { const n = all.filter(c => c.driverId === d.id && c.date === ymd()).length; return `<div class="card row" style="gap:10px"><span class="avatar" style="--av:${escape(d.color)}">${escape(d.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span><span><b>${escape(d.name)}</b><small class="muted d-block">${n} corrida${n === 1 ? '' : 's'} hoy · ${escape(d.shift || '')}</small></span></div>`; }).join('')}</div>
        <div class="card"><div class="sched"><div class="h">Ventana</div>${days.map(d => `<div class="h">${fmtDay(d, { weekday: true })}</div>`).join('')}
        ${WINDOWS.map(w => `<div class="h">${w}</div>${days.map(d => `<div>${at(d, w).map(c => `<span class="run tone-${TONE[c.status]}" data-run="${c.id}"><b>${['listo', 'en-entrega'].includes(c.status) ? '↩ Entrega' : '↪ Retiro'}</b> ${escape(c.comuna)}<br><small class="muted">${escape(userById(c.driverId)?.name?.split(' ')[0] || 'Sin chofer')} · ${escape(CONC_STATES[c.status].label)}</small></span>`).join('')}</div>`).join('')}`).join('')}</div></div>
        <p class="small muted">Capacidad: ${ds.length} choferes por ventana. Haz clic en una corrida para reasignar o cambiar su estado.</p>`;
      return;
    }
    if (view === 'flota') {
      const paint = () => smartTable(body, {
        rows: () => db.all('fleet'),
        filters: [{ key: 'status', label: 'Estado', options: Object.entries(FLEET_STATES).map(([k, s]) => [k, s.label]) }],
        search: r => `${r.name} ${r.plate}`,
        columns: [
          { key: 'name', label: 'Vehículo', render: r => `<span class="row nowrap" style="gap:10px"><span style="width:90px">${carArt({ body: r.body, color: r.color })}</span><span><b>${escape(r.name)}</b><small class="muted d-block mono">${escape(r.plate)}</small></span></span>` },
          { key: 'type', label: 'Tipo', render: r => ({ cortesia: 'Cortesía', 'cortesia-premium': 'Cortesía premium', plataforma: 'Plataforma' }[r.type] || r.type) },
          { key: 'charge', label: 'Carga', render: r => r.charge == null ? '—' : `<div class="progress" style="width:90px"><i style="--v:${r.charge}%"></i></div><small>${r.charge}%</small>` },
          { key: 'km', label: 'Km', render: r => kmFmt(r.km) },
          { key: 'status', label: 'Estado', render: r => statusBadge(FLEET_STATES, r.status) }
        ],
        onRow: r => editFleet(r, ctx),
        actions: '<button class="btn btn-sm btn-primary" data-newfleet>+ Agregar</button>',
        csv: { name: 'flota', map: r => ({ vehiculo: r.name, patente: r.plate, tipo: r.type, estado: r.status, carga: r.charge ?? '', km: r.km }) }
      });
      body.addEventListener('click', e => { if (e.target.closest('[data-newfleet]')) editFleet(null, ctx); });
      return paint();
    }
    return smartTable(body, {
      rows: () => db.all('concierge').map(c => ({ ...c, customer: customerById(c.customerId)?.name || '', vehicle: vehicleName(vehicleById(c.vehicleId)), driver: userById(c.driverId)?.name || '' })).sort((a, b) => b.date.localeCompare(a.date)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(CONC_STATES).map(([k, s]) => [k, s.label]) }, { key: 'driverId', label: 'Chofer', options: drivers().map(d => [d.id, d.name]) }, { key: 'comuna', label: 'Comuna', options: Object.keys(COMUNAS) }],
      search: r => `${r.code} ${r.customer} ${r.vehicle} ${r.address} ${r.comuna}`,
      columns: [
        { key: 'date', label: 'Fecha', render: r => `${fmtDay(r.date, { weekday: true })}<small class="muted d-block">${escape(r.window || '')}</small>` },
        { key: 'code', label: 'OT', render: r => `<span class="mono">${r.code}</span>` },
        { key: 'customer', label: 'Cliente' }, { key: 'vehicle', label: 'Vehículo' },
        { key: 'comuna', label: 'Dirección', render: r => `${escape(r.comuna)}<small class="muted d-block">${escape(r.kind)}</small>` },
        { key: 'driver', label: 'Chofer' },
        { key: 'status', label: 'Estado', render: r => statusBadge(CONC_STATES, r.status) },
        { key: 'fee', label: 'Tarifa', render: r => r.fee ? money(r.fee) : '<span class="muted">Incluida</span>' }
      ],
      onRow: r => runDetail(r.id, ctx),
      csv: { name: 'concierge', map: r => ({ fecha: r.date, ventana: r.window, ot: r.code, cliente: r.customer, vehiculo: r.vehicle, comuna: r.comuna, chofer: r.driver, estado: CONC_STATES[r.status]?.label, tarifa: r.fee }) }
    });
  }
};
async function editFleet(f, ctx) {
  const v = await formModal({ title: f ? `Editar · ${f.name}` : 'Nuevo vehículo de flota', fields: [
    { name: 'name', label: 'Modelo', required: true, value: f?.name }, { name: 'plate', label: 'Patente', required: true, value: f?.plate },
    { name: 'type', label: 'Tipo', type: 'select', options: [['cortesia', 'Cortesía'], ['cortesia-premium', 'Cortesía premium'], ['plataforma', 'Plataforma']], value: f?.type },
    { name: 'status', label: 'Estado', type: 'select', options: Object.entries(FLEET_STATES).map(([k, s]) => [k, s.label]), value: f?.status || 'disponible' },
    { name: 'charge', label: 'Carga (%)', type: 'number', value: f?.charge ?? 80 }, { name: 'km', label: 'Kilometraje', type: 'number', value: f?.km ?? 0 },
    { name: 'color', label: 'Color', type: 'color', value: f?.color || '#e9e9e4' }, { name: 'body', label: 'Carrocería', type: 'select', options: ['suv', 'sedan', 'hatch', 'van'], value: f?.body || 'suv' }] });
  if (!v) return;
  if (f) db.update('fleet', f.id, v); else db.insert('fleet', { ...v, fuel: 'electrico' });
  db.log('flota', `${f ? 'Editado' : 'Agregado'}: ${v.name} ${v.plate}`, ctx.user.id); toast('Flota actualizada', 'success');
}
export { confirm };
