// Facturas/boletas y garantías emitidas.
import { escape, money, toast, formModal, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { customerById, today } from '../shared/domain.js';
import { invoiceModal, payName, warrantyHTML } from '../shared/bits.js';
import { PAY } from '../data/catalog.js';

export const invoices = {
  id: 'facturas', label: 'Facturas y boletas', icon: '🧾', group: 'Comercial', roles: ['admin', 'jefe', 'asesor'], watch: ['invoices'],
  render(el) {
    const all = db.all('invoices'), ym = new Date().toISOString().slice(0, 7), m = all.filter(i => i.issuedAt.slice(0, 7) === ym);
    el.innerHTML = `${pageHead('Facturas y boletas', 'Documentos emitidos al entregar cada OT (SII simulado)')}
      <div class="kpi-grid">${kpi('Emitido este mes', money(m.reduce((s, i) => s + i.total, 0)), `${m.length} documentos`)}${kpi('Repuestos', money(m.reduce((s, i) => s + i.parts, 0)))}${kpi('Mano de obra', money(m.reduce((s, i) => s + i.labor, 0)))}${kpi('Por cobrar a aseguradoras', money(all.reduce((s, i) => s + (i.insurerPays || 0), 0)))}</div><div data-list></div>`;
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('invoices').map(i => ({ ...i, cust: customerById(i.customerId)?.name || '' })).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
      filters: [{ key: 'kind', label: 'Tipo', options: [['boleta', 'Boleta'], ['factura', 'Factura']] }, { key: 'method', label: 'Pago', options: PAY }],
      search: r => `${r.number} ${r.otCode} ${r.plate} ${r.cust}`,
      columns: [{ key: 'number', label: 'N°', render: r => `<b>${r.kind === 'factura' ? 'F' : 'B'}-${r.number}</b>` }, { key: 'issuedAt', label: 'Fecha', render: r => `<span class="nowrap">${dateTime(r.issuedAt)}</span>` }, { key: 'cust', label: 'Cliente' }, { key: 'otCode', label: 'OT', render: r => `${escape(r.otCode)} <span class="plate">${escape(r.plate)}</span>` }, { key: 'parts', label: 'Repuestos', render: r => money(r.parts) }, { key: 'labor', label: 'M. de obra', render: r => money(r.labor) }, { key: 'total', label: 'Total', render: r => `<b>${money(r.total)}</b>` }, { key: 'method', label: 'Pago', render: r => escape(payName(r.method)) }],
      onRow: r => invoiceModal(db.get('invoices', r.id)),
      csv: { name: 'documentos', map: r => ({ tipo: r.kind, numero: r.number, fecha: r.issuedAt, cliente: r.cust, ot: r.otCode, patente: r.plate, neto: r.net, iva: r.iva, total: r.total, repuestos: r.parts, mano_obra: r.labor, pago: r.method }) }
    });
  }
};

export const warranties = {
  id: 'garantias', label: 'Garantías', icon: '🛡️', group: 'Comercial', roles: ['admin', 'jefe', 'asesor'], watch: ['warranties'],
  render(el, ctx) {
    const T = today();
    const claims = db.all('warranties').flatMap(w => (w.claims || []).map(c => ({ ...c, w })));
    el.innerHTML = `${pageHead('Garantías', 'Se generan al entregar la OT. Los clientes las consultan en el sitio y pueden pedir revisión.')}
      ${claims.filter(c => c.status === 'recibida').map(c => `<p class="callout warn small">🔔 Revisión en garantía ${escape(c.w.code)} (${escape(c.w.plate)}): ${escape(c.text)} · ${escape(c.phone)}</p>`).join('')}<div data-list></div>`;
    el.addEventListener('click', async e => { const b = e.target.closest('[data-void]'); if (!b) return; const w = db.get('warranties', b.dataset.void); const v = await formModal({ title: `Anular ${w.code}`, fields: [{ name: 'reason', label: 'Motivo', required: true }] }); if (v) { db.update('warranties', w.id, { status: 'anulada', reason: v.reason }); db.log('garantia', `${w.code} anulada: ${v.reason}`, ctx.user.id); toast('Garantía anulada', 'success'); } });
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('warranties').map(w => ({ ...w, st: w.status === 'anulada' ? 'Anulada' : w.until >= T ? 'Vigente' : 'Vencida', cust: customerById(w.customerId)?.name || '' })).sort((a, b) => b.from.localeCompare(a.from)),
      filters: [{ key: 'st', label: 'Estado', options: ['Vigente', 'Vencida', 'Anulada'] }],
      search: r => `${r.code} ${r.plate} ${r.cust} ${r.otCode}`,
      columns: [{ key: 'code', label: 'Código', render: r => `<b>${escape(r.code)}</b>` }, { key: 'plate', label: 'Patente', render: r => `<span class="plate">${escape(r.plate)}</span>` }, { key: 'cust', label: 'Cliente' }, { key: 'desc', label: 'Cubre', render: r => `<small>${escape(r.desc)}</small>` }, { key: 'months', label: 'Meses' }, { key: 'until', label: 'Vence' }, { key: 'st', label: 'Estado', render: r => `<span class="badge ${r.st === 'Vigente' ? 'badge-success' : 'badge-danger'}">${r.st}</span>${(r.claims || []).length ? ' <span class="badge badge-warning plain">🔔</span>' : ''}` }, { key: 'id', label: '', sort: false, render: r => r.st === 'Vigente' ? `<button class="btn btn-sm btn-ghost no-row" data-void="${r.id}">Anular</button>` : '' }],
      csv: { name: 'garantias', map: r => ({ codigo: r.code, ot: r.otCode, patente: r.plate, cliente: r.cust, cubre: r.desc, meses: r.months, desde: r.from, hasta: r.until, estado: r.st }) }
    });
  }
};
export { warrantyHTML };
