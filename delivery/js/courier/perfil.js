// Perfil del repartidor: vehículo, zonas y documentos (subida simulada).
import { db } from '../data/db.js';
import { html, raw, date, toast, formModal } from '../../../assets/core/ui.js';
import { VEHICLES, VEHICLE_ICON, DOC_STATUS, badgeOf } from '../shared/status.js';
import { stars, avatar } from '../shared/views.js';
import * as ops from '../shared/ops.js';

export function mountPerfil(el, ctx) {
  let sig = '';
  const draw = () => {
    const c = ctx.courier();
    const ns = JSON.stringify([c.docs, c.vehicle, c.model, c.plate, c.zones, c.rating, c.status]); if (ns === sig) return; sig = ns;
    const P = ops.pricing();
    el.innerHTML = html`<div class="card row" style="flex-wrap:nowrap">${avatar(c.name, c.color, 64)}<div class="grow"><h2 style="margin:0">${c.name}</h2><small class="muted">${ctx.user.email} · ${c.phone}</small><div>${stars(c.rating)} ${String(c.rating).replace('.', ',')} · ${c.trips} viajes</div></div></div>
    ${c.status !== 'activo' ? raw('<div class="notice err">Tu cuenta está suspendida. Contacta a despacho para reactivarla.</div>') : ''}
    <div class="card stack"><div class="card-title"><h3>Vehículo</h3><button class="btn btn-sm" data-veh>Editar</button></div>
      <dl class="kv"><dt>Tipo</dt><dd>${VEHICLE_ICON[c.vehicle]} ${VEHICLES[c.vehicle]}</dd><dt>Modelo</dt><dd>${c.model}</dd><dt>Patente</dt><dd class="mono">${c.plate}</dd><dt>Zonas</dt><dd>${c.zones.map(z => P.zones[z]?.name || z).join(' · ')}</dd><dt>En Rayo desde</dt><dd>${date(c.joinedAt)}</dd></dl></div>
    <div class="card"><div class="card-title"><h3>Documentos</h3></div><div class="list">
      ${c.docs.map((d, i) => raw(html`<div class="list-item"><span class="grow"><b>${d.name}</b><small class="muted">${d.expires ? 'Vence ' + date(d.expires) : 'Sin vencimiento'}</small></span>${raw(badgeOf(DOC_STATUS, d.status))}${['vencido', 'rechazado'].includes(d.status) || (d.expires && Date.parse(d.expires) - Date.now() < 30 * 864e5) ? raw(html`<button class="btn btn-sm" data-up="${i}">Subir</button>`) : ''}</div>`))}</div></div>`;
  };
  el.addEventListener('click', async e => {
    const c = ctx.courier();
    const up = e.target.closest('[data-up]');
    if (up) {
      const docs = c.docs.map((d, i) => i === +up.dataset.up ? { ...d, status: 'pendiente', expires: new Date(Date.now() + 365 * 864e5).toISOString(), uploadedAt: new Date().toISOString() } : d);
      db.update('couriers', c.id, { docs });
      db.log('documento', `${c.name} subió "${c.docs[+up.dataset.up].name}"`, ctx.user.id);
      ops.feed(`${c.name} subió un documento para revisión`, 'info');
      toast('Documento enviado a revisión', 'success');
    }
    if (e.target.closest('[data-veh]')) {
      const v = await formModal({ title: 'Mi vehículo', fields: [{ name: 'vehicle', label: 'Tipo', type: 'select', options: Object.entries(VEHICLES), value: c.vehicle }, { name: 'model', label: 'Modelo', value: c.model, required: true }, { name: 'plate', label: 'Patente', value: c.plate, required: true }] });
      if (!v) return;
      db.update('couriers', c.id, { ...v, plate: v.plate.toUpperCase() });
      db.log('vehículo', `${c.name} actualizó su vehículo`, ctx.user.id);
      toast('Vehículo actualizado', 'success');
    }
  });
  draw();
  return { refresh: draw };
}
