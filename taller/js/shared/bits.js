// Piezas de interfaz del taller: patente, estado, línea de tiempo, diagrama de daños, presupuesto y documentos.
import { escape, money, modal, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { DAMAGE, STAGES, PAY } from '../data/catalog.js';
import { ST_OF, totals, settings, userName, customerById, fmtKm, insurerName } from './domain.js';

export const plate = p => `<span class="plate">${escape(p)}</span>`;
export const stBadge = s => { const m = ST_OF(s); return `<span class="badge ${m.badge ? 'badge-' + m.badge : ''}">${escape(m.icon)} ${escape(m.label)}</span>`; };
export const payName = m => (PAY.find(x => x[0] === m) || [m, m])[1];
export const CLAIM_ST = { denunciado: { label: 'Denunciado', badge: 'info' }, 'en-evaluacion': { label: 'En evaluación', badge: 'warning' }, aprobado: { label: 'Aprobado', badge: 'success' }, rechazado: { label: 'Rechazado', badge: 'danger' }, 'mas-info': { label: 'Requiere antecedentes', badge: 'warning' }, pagado: { label: 'Pagado', badge: '' } };
export const claimBadge = s => { const m = CLAIM_ST[s] || { label: s }; return `<span class="badge ${m.badge ? 'badge-' + m.badge : ''}">${escape(m.label)}</span>`; };
export const PRIO = { urgente: ['Urgente', 'danger'], recomendado: ['Recomendado', 'warning'], opcional: ['Opcional', 'info'] };

// Vista superior del auto (SVG): clic para marcar daños si editable.
export function carDiagram(damages = [], { editable = false } = {}) {
  return `<svg class="car-diagram ${editable ? 'editable' : ''}" viewBox="0 0 400 200" role="img" aria-label="Diagrama de daños del vehículo (vista superior)">
    <text x="12" y="104" class="cd-label">FRENTE</text><text x="356" y="104" class="cd-label">ATRÁS</text>
    <rect x="66" y="14" width="36" height="22" rx="6" class="cd-tire"/><rect x="66" y="164" width="36" height="22" rx="6" class="cd-tire"/>
    <rect x="290" y="14" width="36" height="22" rx="6" class="cd-tire"/><rect x="290" y="164" width="36" height="22" rx="6" class="cd-tire"/>
    <path d="M60 40 Q60 26 80 24 L320 24 Q350 26 352 50 L352 150 Q350 174 320 176 L80 176 Q60 174 60 160 Q46 150 46 100 Q46 50 60 40 Z" class="cd-body"/>
    <path d="M120 40 L150 32 L262 32 Q270 32 274 40 L274 160 Q270 168 262 168 L150 168 L120 160 Z" class="cd-roof"/>
    <path d="M118 44 L146 38 L146 162 L118 156 Z" class="cd-glass"/><path d="M276 44 L300 50 L300 150 L276 156 Z" class="cd-glass"/>
    <line x1="200" y1="24" x2="200" y2="32" class="cd-line"/><line x1="200" y1="168" x2="200" y2="176" class="cd-line"/>
    ${damages.map((d, i) => `<g class="cd-mark dm-${escape(d.type)}" data-dmg="${i}"><title>${escape(DAMAGE[d.type]?.label || d.type)}${d.note ? ': ' + escape(d.note) : ''}</title><circle cx="${d.x}" cy="${d.y}" r="11"/><text x="${d.x}" y="${d.y + 4}" text-anchor="middle">${i + 1}</text></g>`).join('')}
  </svg>`;
}
export const fuelGauge = n => `<span class="fuel" title="Combustible ${n}/8">${Array.from({ length: 8 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

export function timelineHTML(o) {
  const at = s => o.timeline.filter(e => e.s === s).at(-1);
  const cur = ST_OF(o.status).i;
  return `<ol class="ot-timeline">${STAGES.map(([s, l, ic], i) => { const e = at(s); return `<li class="${o.status === 'cancelada' ? '' : i < cur ? 'done' : i === cur ? 'now' : ''}"><span class="dot">${i < cur ? '✓' : ic}</span><div><b>${escape(l)}</b>${e ? `<small class="muted d-block">${escape(dateTime(e.at))}${e.by && db.get('users', e.by) ? ' · ' + escape(userName(e.by)) : ''}</small>` : ''}</div></li>`; }).join('')}</ol>`;
}

export function budgetTable(o, { mode = 'view' } = {}) {
  // mode: view | edit (asesor) | client (aprobar)
  const t = totals(o);
  const row = i => `<tr class="bi bi-${i.st}" data-item="${i.id}">
    <td>${mode === 'client' ? `<label class="switch"><input type="checkbox" data-dec="${i.id}" ${i.st !== 'rechazado' ? 'checked' : ''} aria-label="Aprobar ${escape(i.desc)}"><span></span></label>` : `<span class="badge ${i.st === 'aprobado' ? 'badge-success' : i.st === 'rechazado' ? 'badge-danger' : ''} plain">${i.st}</span>`}</td>
    <td><b>${escape(i.desc)}</b> <span class="badge badge-${PRIO[i.prio]?.[1] || 'info'} plain">${PRIO[i.prio]?.[0] || ''}</span>${i.photo ? ' <span class="badge plain" title="Con foto">📷</span>' : ''}${i.fromFinding ? ' <span class="badge badge-warning plain">hallazgo</span>' : ''}<small class="muted d-block">${i.kind === 'repuesto' ? 'Repuesto' : `Mano de obra · ${String((i.hours || 0) * i.qty).replace('.', ',')} h`}${i.note ? ' · ' + escape(i.note) : ''}</small>${i.photo && mode === 'client' ? `<span class="ph-thumb" aria-hidden="true">📷 Foto del técnico</span>` : ''}</td>
    <td class="num">${i.qty}</td><td class="num">${money(i.price)}</td><td class="num"><b>${money(i.qty * i.price)}</b></td>
    ${mode === 'edit' ? `<td class="nowrap"><button class="btn btn-sm btn-ghost" data-edit-item="${i.id}" aria-label="Editar">✎</button><button class="btn btn-sm btn-ghost" data-del-item="${i.id}" aria-label="Quitar">✕</button></td>` : ''}</tr>`;
  const groups = [['mano', 'Mano de obra'], ['repuesto', 'Repuestos']];
  return `<div class="table-wrap"><table class="table budget"><thead><tr><th>${mode === 'client' ? 'Aprobar' : 'Estado'}</th><th>Detalle</th><th class="num">Cant.</th><th class="num">Unitario</th><th class="num">Subtotal</th>${mode === 'edit' ? '<th></th>' : ''}</tr></thead><tbody>
    ${groups.map(([k, l]) => { const its = o.budget.filter(i => (i.kind === 'repuesto') === (k === 'repuesto')); return its.length ? `<tr class="grp"><td colspan="${mode === 'edit' ? 6 : 5}">${l}</td></tr>${its.map(row).join('')}` : ''; }).join('') || `<tr><td colspan="6" class="empty">Sin ítems</td></tr>`}
  </tbody></table></div>
  <div class="inv-tot"><div><span>Repuestos</span><b>${money(t.parts)}</b></div><div><span>Mano de obra</span><b>${money(t.labor)}</b></div><div><span>Neto</span><b>${money(t.net)}</b></div><div><span>IVA 19%</span><b>${money(t.iva)}</b></div><div class="big"><span>Total</span><b data-total>${money(t.total)}</b></div>
  ${t.claim ? `<div><span>Deducible (${t.claim.deductibleUF} UF)</span><b>${money(t.claim.deductible)}</b></div>` : ''}${t.deposit ? `<div><span>Abono pagado</span><b>−${money(t.deposit)}</b></div>` : ''}</div>`;
}

export function invoiceHTML(inv) {
  const c = settings(), cu = customerById(inv.customerId), o = db.get('ots', inv.otId);
  return `<div class="invoice">
    <div class="row between" style="align-items:flex-start"><div><b class="inv-brand">🔧 ${escape(c.name)}</b><small class="d-block muted">Servicios Automotrices Los Andes SpA · RUT 76.902.551-8</small><small class="d-block muted">${escape(c.address)}</small></div>
    <div class="inv-box"><b>${inv.kind === 'factura' ? 'FACTURA' : 'BOLETA'} ELECTRÓNICA</b><span>N° ${inv.number}</span><small>S.I.I. (simulado)</small></div></div>
    <div class="grid-2 small"><div><span class="label">Cliente</span><b class="d-block">${escape(cu?.name || '')}</b>${escape(cu?.rut || '')}</div><div><span class="label">Vehículo / OT</span><b class="d-block">${escape(inv.plate)} · ${escape(o?.car || '')}</b>${escape(inv.otCode)} · ${fmtKm(o?.km)}</div>
    <div><span class="label">Fecha</span><b class="d-block">${dateTime(inv.issuedAt)}</b></div><div><span class="label">Pago</span><b class="d-block">${escape(payName(inv.method))}</b></div></div>
    ${o ? `<div class="table-wrap"><table class="table"><thead><tr><th>Detalle</th><th class="num">Cant.</th><th class="num">Total</th></tr></thead><tbody>${o.budget.filter(i => i.st === 'aprobado').map(i => `<tr><td>${escape(i.desc)}</td><td class="num">${i.qty}</td><td class="num">${money(i.qty * i.price)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="inv-tot"><div><span>Repuestos</span><b>${money(inv.parts)}</b></div><div><span>Mano de obra</span><b>${money(inv.labor)}</b></div><div><span>Neto</span><b>${money(inv.net)}</b></div><div><span>IVA</span><b>${money(inv.iva)}</b></div><div class="big"><span>Total</span><b>${money(inv.total)}</b></div>${inv.insurerPays ? `<div><span>Paga aseguradora</span><b>${money(inv.insurerPays)}</b></div><div><span>Pagó cliente</span><b>${money(inv.customerPaid)}</b></div>` : ''}</div>
    <p class="small muted">${escape(c.guarantee)}</p></div>`;
}
export const invoiceModal = inv => modal({ title: `${inv.kind === 'factura' ? 'Factura' : 'Boleta'} N° ${inv.number}`, size: 'lg', body: invoiceHTML(inv), foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" onclick="window.print()">🖨 Imprimir</button>' });
export function warrantyHTML(w) {
  const vig = w.until >= new Date().toISOString().slice(0, 10) && w.status !== 'anulada';
  return `<div class="card warranty ${vig ? 'ok' : 'off'}"><div class="row between"><b>🛡️ ${escape(w.code)}</b><span class="badge ${vig ? 'badge-success' : 'badge-danger'}">${vig ? 'Vigente' : 'Vencida'}</span></div>
    <div class="small">${plate(w.plate)} · ${escape(w.otCode)}</div><small>${escape(w.desc)}</small>
    <small class="muted">Desde ${escape(w.from)} hasta <b>${escape(w.until)}</b> · ${w.months} meses o ${fmtKm(w.km)}</small></div>`;
}
export { insurerName, DAMAGE };
