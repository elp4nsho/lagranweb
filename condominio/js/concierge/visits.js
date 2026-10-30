// Registro de visitas de conserjería: ingreso sin aviso, check-in/out e historial.
import { escape, dateTime, toast } from '../../../assets/core/ui.js';
import { unitName } from '../data/db.js';
import { VISTATUS, badge } from '../shared/format.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';
import { checkIn, checkOut } from './desk.js';

export function renderVisits(el, p, query, ctx) {
  const { db, user } = ctx;
  el.innerHTML = `${pageHead('Registro de visitas', 'Ingresos, salidas y visitas pre-autorizadas', '<button class="btn btn-primary" data-new>+ Registrar visita sin aviso</button>')}<div data-t></div>`;
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('visitors').sort((a, b) => ((b.inAt || b.date) > (a.inAt || a.date) ? 1 : -1)),
    search: v => `${v.name} ${v.rut} ${v.plate} ${unitName(v.unitId)} ${v.code || ''}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(VISTATUS).map(([k, v]) => [k, v[0]]), value: query.estado || '' }, { key: 'preauth', label: 'Tipo', options: [['true', 'Pre-autorizada'], ['false', 'Sin aviso']] }],
    columns: [
      { key: 'name', label: 'Visita', render: v => `<b>${escape(v.name)}</b><br><span class="muted small">${escape(v.rut || '')} ${v.plate ? '· ' + escape(v.plate) : ''}</span>` },
      { key: 'unitId', label: 'Depto', render: v => escape(unitName(v.unitId)) },
      { key: 'inAt', label: 'Ingreso', render: v => `<span class="small">${v.inAt ? dateTime(v.inAt) : 'Esperada ' + escape(v.date)}</span>` },
      { key: 'outAt', label: 'Salida', render: v => `<span class="small">${v.outAt ? dateTime(v.outAt) : '—'}</span>` },
      { key: 'status', label: 'Estado', render: v => badge(VISTATUS, v.status) + (v.preauth ? ' <span class="badge plain">QR</span>' : '') },
      { key: 'id', label: '', sort: false, render: v => v.status === 'esperada' ? `<button class="btn btn-sm btn-primary" data-in="${v.id}">Ingresar</button>` : v.status === 'dentro' ? `<button class="btn btn-sm" data-out="${v.id}">Salida</button>` : '' }
    ],
    csv: { name: 'visitas.csv', map: v => ({ visita: v.name, rut: v.rut, patente: v.plate, depto: unitName(v.unitId), ingreso: v.inAt || '', salida: v.outAt || '', estado: v.status }) }
  });
  el.addEventListener('click', e => {
    const i = e.target.closest('[data-in]'), o = e.target.closest('[data-out]');
    if (i) { checkIn(db, user, db.get('visitors', i.dataset.in)); toast('Ingreso registrado', 'success'); tbl.refresh(); }
    if (o) { checkOut(db, user, db.get('visitors', o.dataset.out)); toast('Salida registrada', 'success'); tbl.refresh(); }
  });
  const create = async () => {
    const r = await editForm({ title: 'Visita sin aviso', size: '', fields: [
      { name: 'unitId', label: 'Departamento', type: 'select', options: db.all('units').map(u => [u.id, `${u.tower}-${u.number} · ${u.ownerName}`]), full: true },
      { name: 'name', label: 'Nombre', required: true }, { name: 'rut', label: 'RUT', required: true }, { name: 'plate', label: 'Patente' },
      { name: 'note', label: 'Motivo / observación' }, { name: 'confirmed', label: 'Residente confirmó por citófono', type: 'checkbox', full: true }] });
    if (!r) return;
    if (!r.confirmed) return toast('Debes confirmar con el residente antes de dejar ingresar', 'warning', 4000);
    const v = db.insert('visitors', { unitId: r.unitId, name: r.name, rut: r.rut, plate: r.plate.toUpperCase(), date: new Date().toISOString().slice(0, 10), preauth: false, code: null, status: 'esperada', note: r.note });
    checkIn(db, user, v); toast(`Ingreso de ${r.name} registrado`, 'success'); tbl.refresh();
  };
  el.querySelector('[data-new]').onclick = create;
  if (query.nueva) { history.replaceState(null, '', '#/visitas'); create(); }
}
