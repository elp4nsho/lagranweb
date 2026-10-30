// Agenda de entregas de 0 km: unidades vendidas con fecha, hora y checklist de entrega.
import { escape, toast, modal, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { model, version, color, showroom, userName, brand } from '../shared/domain.js';
import { log, carCell, opts, showroomOpts } from './kit.js';
import { ymd, addDays, parseYmd, fdate, makePatente, patenteFormat, nf } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const CHECKS = [['docs', 'Factura y documentos'], ['plate', 'Patente e inscripción'], ['wash', 'Lavado y PDI'], ['fuel', 'Estanque / carga'], ['intro', 'Inducción al cliente']];
const SLOTS = ['10:00', '11:30', '12:30', '15:00', '16:00', '17:30'];

export function renderDeliveries(v, _p, query) {
  const sr = query.sucursal || '';
  const pend = db.query('units', u => u.status === 'vendido' && (!sr || u.showroomId === sr)).sort((a, b) => (a.deliveryDate + a.deliverySlot).localeCompare(b.deliveryDate + b.deliverySlot));
  const done = db.query('units', u => u.status === 'entregado' && (!sr || u.showroomId === sr)).sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)).slice(0, 8);
  const days = [...new Set(pend.map(u => u.deliveryDate))];
  v.innerHTML = `${pageHead('Entregas', 'Programa la entrega de cada 0 km vendido y completa el checklist antes de entregar las llaves.', `<select class="select" data-sr aria-label="Sucursal">${opts(showroomOpts(), sr, 'Todas las sucursales')}</select>`)}
  <div class="grid-4">${statCard('Por entregar', pend.length, '', 'key')}${statCard('Hoy', pend.filter(u => u.deliveryDate === ymd()).length, '', 'calendar')}${statCard('Atrasadas', pend.filter(u => u.deliveryDate < ymd()).length, '', 'alert')}${statCard('Entregadas (7 d)', db.count('units', u => u.status === 'entregado' && u.deliveryDate >= addDays(ymd(), -7)), '', 'check')}</div>
  ${days.map(d => `<div class="card"><div class="card-title"><h3>${icon('calendar', 18)} ${parseYmd(d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>${d < ymd() ? '<span class="badge badge-danger">Atrasada</span>' : d === ymd() ? '<span class="badge badge-warning">Hoy</span>' : ''}</div>
    <div class="stack">${pend.filter(u => u.deliveryDate === d).map(u => { const ch = u.checks || {}, n = CHECKS.filter(([k]) => ch[k]).length; return `<div class="appt-row"><span class="time">${u.deliverySlot}</span><div class="who">${carCell(u.modelId, u.colorId, `${escape(u.customer || '')} · ${escape(showroom(u.showroomId).city)} · VIN …${u.vin.slice(-6)}`)}</div>
      <div class="chips">${CHECKS.map(([k, l]) => `<label class="chip ${ch[k] ? 'active' : ''}"><input type="checkbox" hidden data-chk="${u.id}|${k}" ${ch[k] ? 'checked' : ''}>${ch[k] ? '✓ ' : ''}${l}</label>`).join('')}</div>
      <div class="row"><button class="btn btn-sm" data-resched="${u.id}">${icon('calendar', 15)} Reprogramar</button><button class="btn btn-sm btn-primary" data-deliver="${u.id}" ${n < CHECKS.length ? 'title="Completa el checklist"' : ''}>${icon('key', 15)} Entregar (${n}/${CHECKS.length})</button></div></div>`; }).join('')}</div></div>`).join('') || '<div class="card empty">No hay entregas pendientes.</div>'}
  <div class="card"><h3>Últimas entregas</h3><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Vehículo</th><th>Cliente</th><th>Patente</th></tr></thead><tbody>${done.map(u => `<tr><td>${fdate(u.deliveryDate)}</td><td>${escape(model(u.modelId)?.name)} ${escape(version(u.modelId, u.versionId)?.name || '')}</td><td>${escape(u.customer || '')}</td><td class="mono">${u.patente ? patenteFormat(u.patente) : '—'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin entregas recientes</td></tr>'}</tbody></table></div></div>`;
  v.querySelector('[data-sr]').onchange = e => location.hash = '#/entregas' + (e.target.value ? '?sucursal=' + e.target.value : '');
  v.addEventListener('change', e => { const c = e.target.closest('[data-chk]'); if (!c) return; const [id, k] = c.dataset.chk.split('|'), u = db.get('units', id); db.update('units', id, { checks: { ...(u.checks || {}), [k]: c.checked } }); });
  v.addEventListener('click', async e => {
    const r = e.target.closest('[data-resched]');
    if (r) { const u = db.get('units', r.dataset.resched); const m = modal({ title: 'Reprogramar entrega', body: `<div class="form-grid"><div class="field"><label for="d">Fecha</label><input class="input" id="d" type="date" min="${ymd()}" value="${u.deliveryDate < ymd() ? ymd() : u.deliveryDate}"></div><div class="field"><label for="s">Hora</label><select class="select" id="s">${opts(SLOTS.map(x => [x, x]), u.deliverySlot)}</select></div></div>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>' });
      m.el.querySelector('[data-ok]').onclick = () => { const d = m.el.querySelector('#d').value; if (!d) return toast('Elige una fecha', 'warning'); db.update('units', u.id, { deliveryDate: d, deliverySlot: m.el.querySelector('#s').value }); log('entrega', `Reprogramada ${model(u.modelId)?.name} de ${u.customer} → ${d}`); toast('Entrega reprogramada', 'success'); m.close(); }; }
    const d = e.target.closest('[data-deliver]');
    if (d) {
      const u = db.get('units', d.dataset.deliver), n = CHECKS.filter(([k]) => u.checks?.[k]).length;
      if (n < CHECKS.length && !await confirm(`Faltan ${CHECKS.length - n} ítems del checklist. ¿Entregar igualmente?`, { ok: 'Entregar' })) return;
      const pat = makePatente(Math.random);
      db.update('units', u.id, { status: 'entregado', deliveryDate: ymd(), patente: pat });
      const s = u.saleId && db.get('sales', u.saleId);
      if (s) db.update('sales', s.id, { status: 'entregado', vin: s.vin || u.vin });
      const mm = model(u.modelId), c = color(mm, u.colorId);
      db.insert('vehicles', { owner: u.customer, ownerId: s?.customerId || null, patente: pat, vin: u.vin, brandId: mm.brandId, modelId: mm.id, modelName: mm.name, year: new Date().getFullYear(), colorName: c?.name, hex: c?.hex, km: 10, purchaseDate: ymd(), showroomId: u.showroomId, saleId: s?.id, lastServiceKm: 0, lastServiceDate: ymd() });
      log('entrega', `Entregado ${mm.name} a ${u.customer} · patente ${patenteFormat(pat)}`); toast(`¡Entregado! Patente ${patenteFormat(pat)} registrada para posventa.`, 'success');
    }
  });
}
export { brand, userName, nf };
