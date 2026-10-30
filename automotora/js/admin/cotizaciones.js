// Cotizaciones formales y aprobación de descuentos sobre el margen permitido.
import { escape, money, toast, ago, confirm, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { model, version, userName, quoteBadge, QUOTE_STATUS, settings, addTimeline } from '../shared/domain.js';
import { openDoc, quoteHTML } from '../shared/docs.js';
import { log, carCell, sellerOpts, me } from './kit.js';
import { fdate } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export async function decideQuote(id, ok) {
  const q = db.get('quotes', id);
  let note = '';
  if (!ok) { const r = await formModal({ title: `Rechazar descuento ${q.number}`, submit: 'Rechazar', fields: [{ name: 'note', label: 'Motivo / contrapropuesta', type: 'textarea', value: `Máximo autorizado ${settings().maxDiscountSeller}%` }] }); if (!r) return false; note = r.note; }
  else if (!await confirm(`¿Aprobar ${String(q.discountPct).replace('.', ',')}% de descuento (${money(q.discount)}) en ${q.number}?`, { ok: 'Aprobar descuento' })) return false;
  db.update('quotes', id, { status: ok ? 'aprobada' : 'rechazada', approvedBy: me().id, approvalNote: note });
  if (q.leadId) addTimeline(q.leadId, 'cotizacion', `Gerencia ${ok ? 'aprobó' : 'rechazó'} el descuento de ${q.number}${note ? ': ' + note : ''}.`);
  log('cotización', `${ok ? 'Aprobado' : 'Rechazado'} descuento ${q.number} (${q.discountPct}%)`);
  toast(ok ? 'Descuento aprobado · el ejecutivo ya puede enviarla' : 'Descuento rechazado', ok ? 'success' : 'warning');
  return true;
}

export function renderQuotes(v, _p, query) {
  const all = db.all('quotes'), pend = all.filter(q => q.status === 'pendiente_aprobacion');
  const s = settings();
  v.innerHTML = `${pageHead('Cotizaciones', `Los ejecutivos pueden descontar hasta ${s.maxDiscountSeller}% sin aprobación; sobre eso decide la gerencia (máximo ${s.maxDiscountManager}%).`)}
  <div class="grid-4">${statCard('Por aprobar', pend.length, '', 'alert')}${statCard('Enviadas (30 d)', all.filter(q => q.createdAt >= new Date(Date.now() - 30 * 864e5).toISOString()).length, '', 'file')}${statCard('Aceptadas', all.filter(q => q.status === 'aceptada').length, '', 'check')}${statCard('Descuento promedio', (all.reduce((a, q) => a + q.discountPct, 0) / Math.max(1, all.length)).toFixed(1).replace('.', ',') + '%', '', 'percent')}</div><div class="card" data-list></div>`;
  const lv = listView(v.querySelector('[data-list]'), {
    rows: () => db.all('quotes').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: q => `${q.number} ${q.customer} ${model(q.modelId)?.name}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(QUOTE_STATUS).map(([k, [l]]) => [k, l]), value: query.estado || (pend.length ? 'pendiente_aprobacion' : '') }, { key: 'sellerId', label: 'Ejecutivo', options: sellerOpts() }],
    columns: [
      { key: 'number', label: 'N°', render: q => `<b class="mono">${q.number}</b><br><small class="muted">${ago(q.createdAt)}</small>` },
      { key: 'customer', label: 'Cliente', render: q => escape(q.customer) },
      { key: 'modelId', label: 'Vehículo', render: q => ({ __raw: true, value: carCell(q.modelId, q.colorId, escape(version(q.modelId, q.versionId)?.name || '')) }) },
      { key: 'discountPct', label: 'Desc.', render: q => `<b style="color:var(--${q.discountPct > s.maxDiscountSeller ? 'danger' : 'text'})">${String(q.discountPct).replace('.', ',')}%</b><br><small class="muted">${money(q.discount)}</small>` },
      { key: 'total', label: 'Total', render: q => money(q.total) },
      { key: 'sellerId', label: 'Ejecutivo', render: q => escape(userName(q.sellerId)) },
      { key: 'status', label: 'Estado', render: q => ({ __raw: true, value: quoteBadge(q.status) + `<br><small class="muted">vence ${fdate(q.validUntil)}</small>` }) },
      { key: 'x', label: '', sort: false, render: q => ({ __raw: true, value: acts(q.status === 'pendiente_aprobacion' ? actBtn('ok', q.id, 'check', 'Aprobar descuento') + actBtn('no', q.id, 'x', 'Rechazar') : '', actBtn('doc', q.id, 'print', 'Ver cotización')) }) }
    ],
    onRow: q => openDoc('Cotización ' + q.number, quoteHTML(q), { name: q.number }),
    onAction: async (a, id) => { if (a === 'doc') openDoc('Cotización', quoteHTML(db.get('quotes', id))); if (a === 'ok' || a === 'no') (await decideQuote(id, a === 'ok')) && lv.refresh(); },
    csv: { name: 'cotizaciones.csv', map: q => ({ numero: q.number, cliente: q.customer, modelo: model(q.modelId)?.name, version: version(q.modelId, q.versionId)?.name, lista: q.listPrice, bonos: q.bonus, descuento_pct: q.discountPct, total: q.total, estado: QUOTE_STATUS[q.status][0], ejecutivo: userName(q.sellerId), fecha: q.createdAt.slice(0, 10) }) }
  });
}
export { icon };
