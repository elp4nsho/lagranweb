// Solicitudes del sitio (cotizaciones y horas): seguimiento y conversión a OT.
import { escape, toast, modal, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { SERVICES } from '../data/catalog.js';
import { dayLabel } from '../shared/domain.js';
import { newOT } from './ots.js';

export const RQ = { nueva: { label: 'Nueva', badge: 'warning' }, contactada: { label: 'Contactada', badge: 'info' }, agendada: { label: 'Agendada', badge: 'primary' }, convertida: { label: 'Convertida en OT', badge: 'success' }, descartada: { label: 'Descartada', badge: 'danger' } };
const svcName = id => SERVICES.find(s => s.id === id)?.name || id;

function detail(r, ctx) {
  const m = modal({ title: `${r.code} · ${r.name}`, size: 'lg', body: `<div class="stack"><div class="row between">${badge(RQ, r.status)}<small class="muted">${dateTime(r.createdAt)}</small></div>
    <div class="grid-3 small detail-grid"><div><span class="label">Tipo</span><b>${r.kind === 'hora' ? 'Agendar hora' : 'Cotización'}</b>${escape(svcName(r.service))}</div><div><span class="label">Vehículo</span><b><span class="plate">${escape(r.plate)}</span></b>${escape(r.car)}</div><div><span class="label">Contacto</span><b>${escape(r.phone)}</b>${escape(r.email || '')}</div>
    ${r.kind === 'hora' ? `<div><span class="label">Hora pedida</span><b>${escape(dayLabel(r.date))} ${escape(r.time)}</b></div>` : ''}${r.insurerId ? `<div><span class="label">Aseguradora</span><b>${escape(db.get('insurers', r.insurerId)?.name || '')}</b>${escape(r.claimNo || '')}</div>` : ''}</div>
    <p class="callout">${escape(r.symptom)}</p><div class="photo-row">${Array.from({ length: r.photos }, (_, i) => `<span class="photo on">📷<small>Foto ${i + 1}</small></span>`).join('') || '<small class="muted">Sin fotos</small>'}</div></div>`,
    foot: `<button class="btn btn-ghost" data-st="descartada">Descartar</button><span class="grow"></span><button class="btn" data-st="contactada">Marcar contactada</button><button class="btn" data-st="agendada">Agendada</button><button class="btn btn-primary" data-conv ${r.status === 'convertida' ? 'disabled' : ''}>Convertir en OT</button>` });
  m.el.addEventListener('click', async e => {
    const s = e.target.closest('[data-st]'); if (s) { db.update('requests', r.id, { status: s.dataset.st }); db.log('solicitud', `${r.code} → ${RQ[s.dataset.st].label}`, ctx.user.id); toast('Solicitud actualizada', 'success'); m.close(); }
    if (e.target.closest('[data-conv]')) { m.close(); const [mk, ...rest] = r.car.split(' '); const yr = +(rest.at(-1)) || 2019; const o = await newOT(ctx, { plate: r.plate, car: rest.length > 1 && /^\d{4}$/.test(rest.at(-1)) ? `${mk} ${rest.slice(0, -1).join(' ')}` : r.car, year: yr, name: r.name, phone: r.phone, email: r.email, symptom: r.symptom, type: r.service === 'siniestros' ? 'siniestro' : r.service === 'pintura' ? 'carroceria' : 'mecanica', requestId: r.id }); if (o) db.update('requests', r.id, { status: 'convertida', otId: o.id }); }
  });
}

export default {
  id: 'solicitudes', label: 'Solicitudes web', icon: '📨', group: 'Taller', roles: ['admin', 'jefe', 'asesor'], watch: ['requests'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Solicitudes del sitio', 'Cotizaciones y horas pedidas desde la web. Conviértelas en OT al recibir el vehículo.')}<div data-list></div>`;
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('requests').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(RQ).map(([k, v]) => [k, v.label]) }, { key: 'kind', label: 'Tipo', options: [['cotizacion', 'Cotización'], ['hora', 'Hora']] }, { key: 'service', label: 'Servicio', options: SERVICES.map(s => [s.id, s.name]) }],
      search: r => `${r.code} ${r.name} ${r.plate} ${r.car}`,
      columns: [{ key: 'code', label: 'N°', render: r => `<code>${escape(r.code)}</code>` }, { key: 'createdAt', label: 'Recibida', render: r => `<span class="nowrap">${dateTime(r.createdAt)}</span>` }, { key: 'name', label: 'Cliente', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.phone)}</small>` }, { key: 'plate', label: 'Vehículo', render: r => `<span class="plate">${escape(r.plate)}</span><small class="muted d-block">${escape(r.car)}</small>` }, { key: 'service', label: 'Servicio', render: r => `<small>${escape(svcName(r.service))}${r.kind === 'hora' ? ` · 📅 ${escape(dayLabel(r.date))} ${escape(r.time)}` : ''}</small>` }, { key: 'status', label: 'Estado', render: r => badge(RQ, r.status) }],
      onRow: r => detail(r, ctx),
      csv: { name: 'solicitudes', map: r => ({ codigo: r.code, fecha: r.createdAt, tipo: r.kind, servicio: svcName(r.service), nombre: r.name, telefono: r.phone, patente: r.plate, vehiculo: r.car, estado: RQ[r.status].label }) }
    });
  }
};
