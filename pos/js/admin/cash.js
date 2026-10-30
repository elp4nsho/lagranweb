// Reportes de caja: turnos (abiertos y cerrados), arqueos con diferencias y detalle de boletas.
import { html, raw, money, dateTime, time, toast, modal } from '../../../assets/core/ui.js';
import { db, auth, branchName, userName, shiftSummary, valid, METHODS, voidSale } from '../data/db.js';
import { pageHead, smartTable, exportCSV, me } from '../shared/common.js';
import { shiftReportHtml, receiptHtml, printModal } from '../shared/receipt.js';
import { closeShift } from '../pos/shift.js';

export function render(el, _p, query = {}) {
  const rows = db.all('shifts').map(s => {
    const live = s.status === 'abierto' ? shiftSummary(s) : null;
    return { ...s, bname: branchName(s.branchId), rname: db.get('registers', s.registerId)?.name || '—', uname: userName(s.userId), total: live ? live.total : s.salesTotal || 0, count: live ? live.count : s.salesCount || 0, diff: s.difference || 0 };
  });
  const closed = rows.filter(r => r.status === 'cerrado' && Date.now() - new Date(r.openedAt) < 7 * 864e5);
  el.innerHTML = html`${raw(pageHead('Reportes de caja', 'Turnos, arqueos y diferencias de cada caja. Clic en una fila para ver el detalle.', '<button class="btn" data-csv>⬇ CSV</button>'))}
    <div class="kpis">
      <div class="card stat"><span class="label">Cajas abiertas</span><span class="value">${rows.filter(r => r.status === 'abierto').length}</span></div>
      <div class="card stat"><span class="label">Cierres (7 días)</span><span class="value">${closed.length}</span></div>
      <div class="card stat"><span class="label">Cierres con diferencia</span><span class="value" style="color:var(--warning)">${closed.filter(r => r.diff).length}</span><span class="small muted">${closed.length ? Math.round(closed.filter(r => !r.diff).length / closed.length * 100) : 100}% cuadra perfecto</span></div>
      <div class="card stat"><span class="label">Diferencia neta (7 días)</span><span class="value" style="color:var(--${closed.reduce((a, r) => a + r.diff, 0) < 0 ? 'danger' : 'success'})">${money(closed.reduce((a, r) => a + r.diff, 0))}</span></div>
    </div>
    ${query.boleta ? raw('<div data-boleta></div>') : ''}
    <div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'shifts', rows, pageSize: 15, search: r => `${r.bname} ${r.rname} ${r.uname}`, defaultSort: { key: 'openedAt', dir: -1 }, onRow: r => openDetail(r.id),
    filters: [{ key: 'status', label: 'Estado', options: [['abierto', 'Abiertos'], ['cerrado', 'Cerrados']] }, { key: 'branchId', label: 'Sucursal', options: db.all('branches').map(b => [b.id, b.name]) }, { key: 'dif', label: 'Diferencia', options: [['si', 'Con diferencia'], ['no', 'Cuadrados']], test: (r, v) => r.status === 'cerrado' && (v === 'si' ? !!r.diff : !r.diff) }],
    columns: [
      { key: 'openedAt', label: 'Turno', render: r => `${dateTime(r.openedAt)}<br><small class="muted">${r.closedAt ? 'cierre ' + time(r.closedAt) : 'en curso'}</small>` },
      { key: 'bname', label: 'Caja', render: r => `${r.bname}<br><small class="muted">${r.rname}</small>` },
      { key: 'uname', label: 'Cajero/a' },
      { key: 'count', label: 'Ventas' },
      { key: 'total', label: 'Total', render: r => `<b>${money(r.total)}</b>` },
      { key: 'diff', label: 'Diferencia', render: r => r.status === 'abierto' ? '—' : r.diff ? `<span class="badge badge-${r.diff < 0 ? 'danger' : 'warning'}">${r.diff > 0 ? '+' : ''}${money(r.diff)}</span>` : '<span class="badge badge-success">Cuadra</span>' },
      { key: 'status', label: 'Estado', render: r => r.status === 'abierto' ? '<span class="badge badge-success">Abierto</span>' : '<span class="badge">Cerrado</span>' }
    ]
  });
  el.querySelector('[data-csv]').onclick = () => exportCSV('turnos-caja', t.filtered().map(r => ({ apertura: r.openedAt, cierre: r.closedAt || '', sucursal: r.bname, caja: r.rname, cajero: r.uname, ventas: r.count, total: r.total, fondo: r.openingCash, esperado: r.expectedCash ?? '', contado: r.countedCash ?? '', diferencia: r.diff, estado: r.status })));
  if (query.boleta) {
    const s = db.find('sales', x => String(x.number) === String(query.boleta));
    el.querySelector('[data-boleta]').innerHTML = s ? `<div class="card row between"><span>Boleta N° ${s.number} · ${dateTime(s.createdAt)} · ${branchName(s.branchId)} · ${money(s.total)}</span><button class="btn btn-sm btn-primary" data-seeb="${s.id}">Ver boleta</button></div>` : '<div class="card">Boleta no encontrada.</div>';
    el.querySelector('[data-seeb]')?.addEventListener('click', e => saleModal(db.get('sales', e.target.dataset.seeb)));
  }
}

function saleModal(s) {
  const canVoid = ['admin', 'supervisor'].includes(me().role) && s.status === 'completada';
  const m = modal({ title: `Boleta N° ${s.number}`, body: receiptHtml(s), foot: `${canVoid ? '<button class="btn btn-danger" data-void>Anular</button>' : ''}<button class="btn" data-print>🖨 Imprimir</button><button class="btn btn-primary" data-close>Cerrar</button>` });
  m.el.querySelector('[data-print]').onclick = printModal;
  m.el.querySelector('[data-void]')?.addEventListener('click', () => { voidSale(s, { reason: 'Anulada desde back-office', by: me() }); toast(`Boleta N° ${s.number} anulada`, 'info'); m.close(); });
}

function openDetail(id) {
  const s = db.get('shifts', id);
  const sum = shiftSummary(s);
  const sales = db.query('sales', x => x.shiftId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const body = `<div class="cols-2" style="align-items:start"><div>${shiftReportHtml(s.status === 'abierto' ? { ...s, expectedCash: sum.expected } : s, sum)}</div>
    <div class="stack" style="gap:8px"><b>Boletas (${sales.length})</b><ul class="list-plain" style="max-height:420px;overflow:auto">${sales.map(x => html`<li><span>N° ${x.number} · ${time(x.createdAt)}<br><small class="muted">${x.payments.map(p => METHODS[p.method]).join(' + ')}</small></span><span class="row" style="gap:6px">${x.status === 'anulada' ? raw('<span class="badge badge-danger">Anulada</span>') : ''}<b>${money(x.total)}</b><button class="btn btn-sm" data-sale="${x.id}">Ver</button></span></li>`).join('') || '<li class="muted">Sin ventas</li>'}</ul>
    ${(s.movements || []).length ? `<b>Movimientos de efectivo</b><ul class="list-plain">${s.movements.map(mv => html`<li><span>${mv.type === 'retiro' ? '−' : '+'} ${mv.note}</span><b>${money(mv.amount)}</b></li>`).join('')}</ul>` : ''}</div></div>`;
  const canClose = s.status === 'abierto' && ['admin', 'supervisor'].includes(me().role);
  const m = modal({ title: `Turno · ${branchName(s.branchId)} ${db.get('registers', s.registerId)?.name || ''}`, size: 'lg', body, foot: `${canClose ? '<button class="btn btn-danger" data-forceclose>Cerrar turno remotamente</button>' : ''}<button class="btn" data-print>🖨 Imprimir</button><button class="btn btn-primary" data-close>Cerrar</button>` });
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-sale]');
    if (b) saleModal(db.get('sales', b.dataset.sale));
    if (e.target.closest('[data-print]')) printModal();
    if (e.target.closest('[data-forceclose]')) { m.close(); closeShift(s); }
  });
}
