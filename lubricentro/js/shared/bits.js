// Piezas de interfaz compartidas: patente, ilustraciones de autos, boleta, estado de la atención.
import { escape, money, modal, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { JOB_STATES, branchName, settings, userName, segName, fmtKm, iso } from './domain.js';
import { PAY_METHODS } from '../data/catalog.js';

export const plate = p => `<span class="plate">${escape(p)}</span>`;
export const stBadge = s => { const m = JOB_STATES[s] || { label: s }; return `<span class="badge ${m.badge ? 'badge-' + m.badge : ''}">${escape(m.label)}</span>`; };
export const payName = m => (PAY_METHODS.find(x => x[0] === m) || [m, m])[1];

// Siluetas laterales simples por segmento (solo tokens del tema).
const SHAPES = {
  city: 'M30 70 L38 48 Q44 36 60 34 L120 32 Q138 32 150 46 L170 52 Q186 56 188 70 Z',
  sedan: 'M14 72 L22 56 Q30 50 48 48 L70 34 Q80 28 100 28 L134 28 Q150 28 162 40 L176 50 Q196 52 204 62 L206 72 Z',
  suv: 'M14 74 L16 50 Q18 40 30 38 L52 22 Q58 18 72 18 L150 18 Q164 18 172 30 L184 44 Q204 48 206 60 L206 74 Z',
  pickup: 'M10 74 L10 50 Q12 44 22 44 L80 44 L86 22 Q88 18 100 18 L140 18 Q152 18 158 30 L168 44 Q198 46 208 56 L210 74 Z',
  premium: 'M10 72 Q12 62 30 58 L60 52 Q78 34 104 32 L134 32 Q156 34 172 48 Q200 52 208 64 L208 72 Z'
};
export function carArt(seg = 'sedan', { label = '', cls = '' } = {}) {
  const s = SHAPES[seg] || SHAPES.sedan;
  const win = { city: 'M48 48 L62 38 L118 37 Q132 38 140 48 Z', sedan: 'M66 48 L80 34 L132 33 Q146 34 156 48 Z', suv: 'M44 40 L58 26 L148 24 Q160 26 168 40 Z', pickup: 'M92 42 L98 24 L138 23 Q148 24 154 42 Z', premium: 'M76 50 Q90 38 106 37 L132 37 Q150 38 160 50 Z' }[seg] || '';
  const wx = { city: [56, 160], sedan: [56, 172], suv: [56, 172], pickup: [52, 176], premium: [54, 176] }[seg] || [56, 172];
  return `<svg class="car-art ${cls}" viewBox="0 0 220 96" role="img" aria-label="${escape(label || 'Vehículo ' + segName(seg))}">
    <ellipse cx="110" cy="88" rx="100" ry="5" class="ca-shadow"/>
    <path d="${s}" class="ca-body"/>
    <path d="${win}" class="ca-win"/>
    ${wx.map(x => `<g><circle cx="${x}" cy="74" r="14" class="ca-tire"/><circle cx="${x}" cy="74" r="6" class="ca-rim"/></g>`).join('')}
    <rect x="${wx[1] + 22}" y="58" width="8" height="5" rx="1.5" class="ca-light"/>
  </svg>`;
}
export function bayArt() {
  return `<svg class="bay-art" viewBox="0 0 320 140" aria-hidden="true">
    <rect x="0" y="110" width="320" height="30" class="ba-floor"/>
    <rect x="20" y="10" width="280" height="100" rx="6" class="ba-wall"/>
    <rect x="40" y="26" width="70" height="40" rx="3" class="ba-win"/><rect x="210" y="26" width="70" height="40" rx="3" class="ba-win"/>
    <rect x="128" y="18" width="64" height="12" rx="3" class="ba-sign"/>
    <g transform="translate(50 30)">${carArt('suv').replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  </svg>`;
}

// Paso a paso visible para el cliente.
export function jobStepper(j) {
  const steps = [['reservado', 'Reservado', '📅'], ['en-fila', 'En fila', '⏳'], ['en-bahia', 'En bahía', '🔧'], ['listo', 'Listo', '✅'], ['pagado', 'Entregado', '🏁']];
  const idx = steps.findIndex(s => s[0] === j.status);
  const off = ['cancelado', 'no-show'].includes(j.status);
  return `<ol class="stepper" aria-label="Estado">${steps.map(([k, l, ic], i) => `<li class="${off ? '' : i < idx ? 'done' : i === idx ? 'now' : ''}"><span><i>${i < idx && !off ? '✓' : ic}</i><small>${l}</small></span></li>`).join('')}</ol>`;
}

export function boletaHTML(j) {
  const c = settings(), cu = db.get('customers', j.customerId);
  const neto = Math.round(j.total / 1.19), iva = j.total - neto;
  return `<div class="invoice">
    <div class="row between" style="align-items:flex-start">
      <div><b class="inv-brand">🛢️ ${escape(c.name)}</b><small class="d-block muted">Lubricentros Pits Rápido SpA · RUT 77.214.880-3</small><small class="d-block muted">Sucursal ${escape(branchName(j.branchId))}</small></div>
      <div class="inv-box"><b>BOLETA ELECTRÓNICA</b><span>N° ${escape(j.pay?.folio || '—')}</span><small>S.I.I. (simulado)</small></div>
    </div>
    <div class="grid-2 small">
      <div><span class="label">Cliente</span><b class="d-block">${escape(cu?.name || 'Cliente')}</b>${escape(cu?.rut || '')}</div>
      <div><span class="label">Vehículo</span><b class="d-block">${escape(j.plate)} · ${escape(j.car)}</b>${fmtKm(j.km)}</div>
      <div><span class="label">Fecha</span><b class="d-block">${j.paidAt ? dateTime(j.paidAt) : '—'}</b>Atención ${escape(j.code)}</div>
      <div><span class="label">Medio de pago</span><b class="d-block">${escape(payName(j.pay?.m))}</b>${j.techId ? 'Técnico: ' + escape(userName(j.techId)) : ''}</div>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Detalle</th><th style="text-align:right">Monto</th></tr></thead><tbody>
      ${j.items.map(i => `<tr><td>${escape(i.n)}${i.up ? ' <small class="badge badge-success plain">recomendado</small>' : ''}${i.plan ? ' <small class="badge badge-info plain">plan</small>' : ''}</td><td style="text-align:right">${i.plan ? '<s class="muted">' + money(i.p) + '</s> $0' : money(i.p)}</td></tr>`).join('')}
      ${j.discount ? `<tr><td>Descuento ${escape(j.coupon)}</td><td style="text-align:right">−${money(j.discount)}</td></tr>` : ''}
    </tbody></table></div>
    <div class="inv-tot"><div><span>Neto</span><b>${money(neto)}</b></div><div><span>IVA 19%</span><b>${money(iva)}</b></div><div class="big"><span>Total</span><b>${money(j.total)}</b></div></div>
    <p class="small muted">${escape(c.guarantee || '')}</p>
  </div>`;
}
export function boletaModal(j) {
  modal({ title: `Boleta N° ${j.pay?.folio || ''}`, size: 'lg', body: boletaHTML(j), foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" onclick="window.print()">🖨 Imprimir</button>' });
}
export function historyBoleta(h, v) {
  const fake = { code: '—', branchId: h.b, customerId: v.customerId, plate: v.plate, car: `${v.make} ${v.model} ${v.year}`, km: h.km, items: h.s.split(' + ').map((n, i, a) => ({ n, p: i === 0 ? h.t - (a.length - 1) * Math.round(h.t * .25) : Math.round(h.t * .25) })), discount: 0, total: h.t, paidAt: h.d + 'T12:00:00', pay: { folio: h.f, m: 'debito' } };
  boletaModal(fake);
}
export const photoSlots = (n, total = 4) => `<div class="photo-row">${['Frontal', 'Trasera', 'Lateral', 'Tablero'].slice(0, total).map((l, i) => `<span class="photo ${i < n ? 'on' : ''}" title="${l}">${i < n ? '📷' : '＋'}<small>${l}</small></span>`).join('')}</div>`;
export const iso10 = iso;
