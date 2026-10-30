// Encomiendas: recepción (avisa al residente) y entrega con registro de quién retira.
import { escape, dateTime, ago, toast, formModal } from '../../../assets/core/ui.js';
import { unitName, notify, residentsOf } from '../data/db.js';
import { PARSTATUS, badge } from '../shared/format.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';

export function renderParcels(el, p, query, ctx) {
  const { db, user } = ctx;
  el.innerHTML = `${pageHead('Encomiendas', `${db.count('parcels', x => x.status === 'conserjeria')} en conserjería`, '<button class="btn btn-primary" data-new>+ Recibir encomienda</button>')}<div data-t></div>`;
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('parcels').sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), search: x => `${unitName(x.unitId)} ${x.carrier} ${x.tracking} ${x.deliveredTo || ''}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(PARSTATUS).map(([k, v]) => [k, v[0]]), value: 'conserjeria' }, { key: 'size', label: 'Tamaño', options: ['Sobre', 'Pequeña', 'Mediana', 'Grande'] }],
    columns: [
      { key: 'unitId', label: 'Depto', render: x => `<b>${escape(unitName(x.unitId))}</b>` },
      { key: 'carrier', label: 'Remitente', render: x => `${escape(x.carrier)}<br><span class="muted small">#${escape(x.tracking)}</span>` },
      { key: 'size', label: 'Tamaño' },
      { key: 'receivedAt', label: 'Recibida', render: x => `<span class="small">${dateTime(x.receivedAt)}<br>${escape(x.receivedBy)}</span>` },
      { key: 'status', label: 'Estado', render: x => badge(PARSTATUS, x.status) + (x.deliveredTo ? `<br><span class="small muted">${escape(x.deliveredTo)} · ${ago(x.deliveredAt)}</span>` : '') },
      { key: 'id', label: '', sort: false, render: x => x.status === 'conserjeria' ? `<button class="btn btn-sm btn-primary" data-deliver="${x.id}">Entregar</button>` : '' }
    ],
    csv: { name: 'encomiendas.csv', map: x => ({ depto: unitName(x.unitId), remitente: x.carrier, seguimiento: x.tracking, tamano: x.size, recibida: x.receivedAt, entregada: x.deliveredAt || '', retiro: x.deliveredTo || '' }) }
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-deliver]'); if (!b) return;
    const x = db.get('parcels', b.dataset.deliver);
    const names = residentsOf(x.unitId).map(r => r.name);
    const r = await formModal({ title: `Entregar encomienda · ${unitName(x.unitId)}`, submit: 'Confirmar entrega', fields: [{ name: 'to', label: 'Retira', type: 'select', options: [...names, 'Otra persona autorizada'] }, { name: 'other', label: 'Nombre (si es otra persona)' }] });
    if (!r) return;
    const to = r.to === 'Otra persona autorizada' ? r.other || 'Persona autorizada' : r.to;
    db.update('parcels', x.id, { status: 'entregada', deliveredAt: new Date().toISOString(), deliveredTo: to });
    db.log('encomienda', `Encomienda ${x.carrier} entregada a ${to} (${unitName(x.unitId)})`, user.id);
    toast(`Entregada a ${to}`, 'success'); tbl.refresh();
  });
  const receive = async () => {
    const r = await editForm({ title: 'Recibir encomienda', size: '', fields: [
      { name: 'unitId', label: 'Departamento', type: 'select', options: db.all('units').map(u => [u.id, `${u.tower}-${u.number} · ${u.ownerName}`]), full: true },
      { name: 'carrier', label: 'Remitente / courier', type: 'select', options: ['Chilexpress', 'Starken', 'Correos de Chile', 'Blue Express', 'Mercado Envíos', 'Rayo Express', 'Despacho tienda', 'Otro'] },
      { name: 'size', label: 'Tamaño', type: 'select', options: ['Sobre', 'Pequeña', 'Mediana', 'Grande'] }, { name: 'tracking', label: 'N° de seguimiento' }, { name: 'note', label: 'Observación' }] });
    if (!r) return;
    db.insert('parcels', { ...r, receivedAt: new Date().toISOString(), receivedBy: user.name, status: 'conserjeria', deliveredAt: null, deliveredTo: null });
    notify(r.unitId, `Llegó una encomienda de ${r.carrier} a conserjería`, '#/encomiendas');
    db.log('encomienda', `Encomienda recibida para ${unitName(r.unitId)} (${r.carrier})`, user.id);
    toast(`Encomienda registrada y residente avisado`, 'success'); tbl.refresh();
  };
  el.querySelector('[data-new]').onclick = receive;
  if (query.nueva) { history.replaceState(null, '', '#/encomiendas'); receive(); }
}
