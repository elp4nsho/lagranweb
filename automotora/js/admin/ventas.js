// Ventas / notas de venta y contratos.
import { escape, money, toast, modal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard, kv } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { model, version, color, userName, showroom, saleBadge, SALE_STATUS, FIN_LABEL } from '../shared/domain.js';
import { openDoc, invoiceHTML } from '../shared/docs.js';
import { log, carCell, sellerOpts, showroomOpts, brandOpts } from './kit.js';
import { fdate, lastMonths, monthLabel } from '../shared/util.js';

export function renderSales(v) {
  const m = lastMonths(1)[0], cur = db.query('sales', s => s.date.startsWith(m));
  v.innerHTML = `${pageHead('Ventas y contratos', 'Notas de venta con forma de pago, retoma, bonos y descuentos. Flujo: por entregar → facturado → entregado.')}
  <div class="grid-4">${statCard('Ventas ' + monthLabel(m), cur.length, '', 'car')}${statCard('Facturación', money(cur.reduce((a, s) => a + s.price, 0)), '', 'money')}${statCard('Utilidad bruta', money(cur.reduce((a, s) => a + s.price - s.cost, 0)), '', 'percent')}${statCard('Con retoma', cur.filter(s => s.tradeIn).length, '', 'swap')}</div><div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('sales').sort((a, b) => b.date.localeCompare(a.date)), search: s => `${s.number} ${s.customer} ${model(s.modelId)?.name} ${s.vin || ''}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(SALE_STATUS).map(([k, [l]]) => [k, l]) }, { key: 'financing', label: 'Pago', options: Object.entries(FIN_LABEL) }, { key: 'sellerId', label: 'Ejecutivo', options: sellerOpts() }, { key: 'showroomId', label: 'Sucursal', options: showroomOpts() }, { key: 'brandId', label: 'Marca', options: brandOpts() }],
    columns: [
      { key: 'number', label: 'N°', render: s => `<b class="mono">${s.number}</b><br><small class="muted">${fdate(s.date)}</small>` },
      { key: 'customer', label: 'Cliente', render: s => escape(s.customer) },
      { key: 'modelId', label: 'Vehículo', render: s => ({ __raw: true, value: carCell(s.modelId, s.colorId, escape(version(s.modelId, s.versionId)?.name || '')) }) },
      { key: 'price', label: 'Precio', render: s => `<b>${money(s.price)}</b>${s.discount ? `<br><small class="muted">desc. ${money(s.discount)}</small>` : ''}` },
      { key: 'gp', label: 'Margen', sort: false, render: s => money(s.price - s.cost) },
      { key: 'financing', label: 'Pago', render: s => FIN_LABEL[s.financing] },
      { key: 'sellerId', label: 'Ejecutivo', render: s => escape(userName(s.sellerId)) },
      { key: 'status', label: 'Estado', render: s => ({ __raw: true, value: saleBadge(s.status) }) },
      { key: 'x', label: '', sort: false, render: s => ({ __raw: true, value: acts(actBtn('inv', s.id, 'print', 'Factura')) }) }
    ],
    onRow: s => detail(s.id, lv),
    onAction: a => a,
    csv: { name: 'ventas.csv', map: s => ({ numero: s.number, fecha: s.date, cliente: s.customer, marca: s.brandId, modelo: model(s.modelId)?.name, version: version(s.modelId, s.versionId)?.name, lista: s.listPrice, bonos: s.bonus, descuento: s.discount, precio: s.price, costo: s.cost, pago: FIN_LABEL[s.financing], retoma: s.tradeIn, ejecutivo: userName(s.sellerId), sucursal: showroom(s.showroomId).city, estado: SALE_STATUS[s.status][0] }) }
  });
  v.addEventListener('click', e => { const b = e.target.closest('[data-act="inv"]'); if (b) openDoc('Factura', invoiceHTML(db.get('sales', b.dataset.id))); }, true);
}
function detail(id, lv) {
  const s = db.get('sales', id), mm = model(s.modelId);
  const m = modal({ title: `Venta ${s.number}`, size: 'lg', body: `<div class="grid-2"><div>${carCell(s.modelId, s.colorId, '')}${kv([['Cliente', escape(s.customer)], ['RUT', escape(s.rut || '—')], ['Versión', escape(version(mm, s.versionId)?.name)], ['Color', escape(color(mm, s.colorId)?.name)], ['VIN', `<span class="mono">${escape(s.vin || '—')}</span>`], ['Sucursal', escape(showroom(s.showroomId).name)], ['Ejecutivo', escape(userName(s.sellerId))], ['Días en stock', s.daysInStock]])}</div>
    <div>${kv([['Precio lista', money(s.listPrice)], ['Bonos', '−' + money(s.bonus)], ['Descuento', '−' + money(s.discount)], ['Precio final', `<b>${money(s.price)}</b>`], ['Costo', money(s.cost)], ['Utilidad bruta', money(s.price - s.cost)], ['Forma de pago', FIN_LABEL[s.financing]], ['Retoma', s.tradeIn ? money(s.tradeIn) : '—']])}
    <div class="field" style="margin-top:14px"><label for="st">Estado</label><select class="select" id="st">${Object.entries(SALE_STATUS).map(([k, [l]]) => `<option value="${k}" ${k === s.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div></div>`,
    foot: `<button class="btn" data-inv>Factura</button><button class="btn btn-primary" data-close>Cerrar</button>` });
  m.el.querySelector('#st').onchange = e => { db.update('sales', id, { status: e.target.value }); log('venta', `${s.number}: ${SALE_STATUS[e.target.value][0]}`); toast('Estado actualizado', 'success'); lv.refresh(); };
  m.el.querySelector('[data-inv]').onclick = () => openDoc('Factura', invoiceHTML(db.get('sales', id)));
}
