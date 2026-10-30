// Documentos imprimibles simulados: ficha técnica, cotización, factura, padrón y orden de trabajo.
import { modal, escape, money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { model, brand, version, color, features, priceConfig, decodeConfig, userName, showroom, settings, modelLabel, FIN_LABEL, APPT_TYPES } from './domain.js';
import { carSVG, carOf } from './car.js';
import { simulate } from './finance.js';
import { fdate, ymd, patenteFormat, nf } from './util.js';
import { icon } from './icons.js';

const EMISOR = { rut: '76.543.210-K', razon: 'Autoplaza Pacífico SpA', giro: 'Venta de vehículos y servicios automotrices' };
const head = (title, num, extra = '') => { const s = settings(); return `<header><div><b class="doc-brand">${icon('car', 22)} ${escape(s.name)}</b><br><small class="muted">${EMISOR.razon} · RUT ${EMISOR.rut}<br>${escape(s.phone)} · ${escape(s.email)}</small></div><div class="doc-num"><b>${escape(title)}</b><br><span class="mono">${escape(num)}</span><br><small class="muted">${extra}</small></div></header>`; };
const table = (rows, cols = ['Detalle', 'Monto']) => `<table class="doc-table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td ${i === r.length - 1 ? 'class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const demoStamp = '<p class="doc-stamp">Documento de demostración · sin validez legal</p>';

export function openDoc(title, inner, { name = 'documento' } = {}) {
  const m = modal({ title, size: 'lg', body: `<div class="paper print-area">${inner}</div>`, foot: `<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-print>${icon('print', 16)} Imprimir / PDF</button>` });
  m.el.querySelector('[data-print]').onclick = () => { document.title = name; window.print(); };
  return m;
}

export function specSheetHTML(code) {
  const c = decodeConfig(code); if (!c) return '<p>Configuración no válida.</p>';
  const p = priceConfig(c), m = p.m, b = brand(m.brandId), v = p.v;
  const views = ['side', 'front', 'rear'].map(view => carSVG({ body: m.body, paint: p.col.hex, view, wheel: { style: p.w.style, rim: p.w.rim }, fuel: m.fuel, plate: 'NUEVO·26' })).join('');
  return `${head('Ficha técnica', code.split('~').slice(0, 3).join(' · ').toUpperCase(), fdate(ymd()))}
    <h2 class="doc-title">${escape(b.name)} ${escape(m.name)} <small>${escape(v.name)}</small></h2>
    <div class="doc-views">${views}</div>
    <div class="doc-cols">
      <div><h4>Especificaciones</h4>${table([['Motor', escape(v.engine)], ['Potencia', v.hp ? v.hp + ' hp' : '—'], ['Transmisión', escape(v.trans)], ['Tracción', escape(v.traction)], ['Consumo / autonomía', escape(v.cons)], ['Asientos', m.seats], ['Maletero', m.trunk + ' L'], ['Garantía', `${b.warrantyYears} años o ${nf(b.warrantyKm)} km`]], ['Ítem', 'Valor'])}</div>
      <div><h4>Equipamiento de serie</h4><ul class="doc-list">${features(v).map(f => `<li>${escape(f)}</li>`).join('')}</ul></div>
    </div>
    <h4>Tu configuración</h4>${table([...p.lines.map(([l, n]) => [escape(l), n ? money(n) : 'Incluido']), ...p.bonuses.map(x => [escape(x.name), '−' + money(x.amount)]), ...p.gifts.map(g => [escape(g.name) + ' (regalo)', 'Incluido']), ['<b>Precio final con bonos</b>', `<b>${money(p.total)}</b>`]])}
    <p class="small muted">Precios en pesos chilenos, IVA incluido. Bonos sujetos a vigencia de campaña y forma de pago. No incluye gastos de inscripción ni permiso de circulación.</p>${demoStamp}`;
}

export function quoteHTML(q) {
  const m = model(q.modelId), v = version(m, q.versionId), col = color(m, q.colorId), b = brand(m.brandId);
  const c = { modelId: q.modelId, versionId: q.versionId, colorId: q.colorId, wheelId: q.wheelId || 'w1', packIds: q.packIds || [], accIds: q.accIds || [] };
  const p = priceConfig(c);
  const fp = db.get('finProducts', 'fp-conv'), sim = fp ? simulate({ product: fp, price: q.total, pie: Math.round(q.total * .3), plazo: 36 }) : null;
  return `${head('Cotización', q.number, `Emitida ${fdate(q.createdAt)} · válida hasta ${fdate(q.validUntil)}`)}
    <div class="doc-cols"><div><h4>Cliente</h4><p>${escape(q.customer)}<br><small class="muted">${escape(q.email || '')}</small></p></div><div><h4>Ejecutivo</h4><p>${escape(userName(q.sellerId))}<br><small class="muted">Autoplaza Pacífico</small></p></div></div>
    <div class="doc-car">${carSVG({ body: m.body, paint: col.hex, fuel: m.fuel, wheel: { style: p.w.style, rim: p.w.rim } })}<div><h2 class="doc-title">${escape(b.name)} ${escape(m.name)}</h2><p>${escape(v.name)} · ${escape(col.name)}<br><small class="muted">${escape(v.engine)} · ${escape(v.trans)} · ${escape(v.cons)}</small></p></div></div>
    ${table([...p.lines.map(([l, n]) => [escape(l), n ? money(n) : 'Incluido']), ['Precio lista', money(q.listPrice)], ...(q.bonus ? [['Bonos vigentes', '−' + money(q.bonus)]] : []), ...(q.discount ? [[`Descuento comercial (${String(q.discountPct).replace('.', ',')}%)`, '−' + money(q.discount)]] : []), ['<b>Total a pagar</b>', `<b>${money(q.total)}</b>`]])}
    ${sim ? `<div class="doc-note">${icon('card', 18)} <span>Ejemplo crédito convencional: pie ${money(Math.round(q.total * .3))} y 36 cuotas de <b>${money(sim.cuota)}</b> · CAE ${sim.cae.toFixed(2).replace('.', ',')}% · costo total ${money(sim.total)}.</span></div>` : ''}
    <p class="small muted">Precios en CLP con IVA. Sujeto a disponibilidad de stock. Los descuentos comerciales sobre ${settings().maxDiscountSeller}% requieren aprobación de gerencia.</p>
    <div class="doc-sign"><div>Firma ejecutivo</div><div>Firma cliente</div></div>${demoStamp}`;
}

export function invoiceHTML(s) {
  const m = model(s.modelId), v = version(m, s.versionId), col = color(m, s.colorId), b = brand(m.brandId);
  const neto = Math.round(s.price / 1.19), iva = s.price - neto;
  return `${head('Factura electrónica', 'N° ' + (s.number || '').replace(/\D/g, '').padStart(7, '0'), fdate(s.date))}
    <div class="doc-cols"><div><h4>Señor(es)</h4><p>${escape(s.customer)}<br>RUT ${escape(s.rut || '—')}</p></div><div><h4>Emisor</h4><p>${EMISOR.razon}<br><small class="muted">${EMISOR.giro}</small></p></div></div>
    ${table([[`1 × ${escape(b.name)} ${escape(m.name)} ${escape(v.name)} · ${escape(col.name)}<br><small class="muted">VIN ${escape(s.vin || '—')} · Año ${String(s.date).slice(0, 4)}</small>`, money(neto)], ['Neto', money(neto)], ['IVA 19%', money(iva)], ['<b>Total</b>', `<b>${money(s.price)}</b>`]], ['Descripción', 'Valor'])}
    <p class="small muted">Forma de pago: ${FIN_LABEL[s.financing] || s.financing}${s.tradeIn ? ` · Vehículo en parte de pago ${money(s.tradeIn)}` : ''}. Timbre electrónico SII simulado.</p>${demoStamp}`;
}

export function padronHTML(v) {
  const m = model(v.modelId), b = brand(v.brandId), owner = v.owner;
  return `<header><div><b class="doc-brand">${icon('shield', 22)} Registro de Vehículos Motorizados</b><br><small class="muted">Certificado de inscripción · simulación</small></div><div class="doc-num"><b>Padrón</b><br><span class="mono">${patenteFormat(v.patente)}</span></div></header>
    ${table([['Patente (PPU)', `<b class="mono">${patenteFormat(v.patente)}</b>`], ['Tipo', m?.body === 'pickup' ? 'Camioneta' : m?.body === 'suv' ? 'Station wagon / SUV' : 'Automóvil'], ['Marca', escape(b?.name)], ['Modelo', escape(v.modelName)], ['Año', v.year], ['Color', escape(v.colorName)], ['N° VIN / chasis', `<span class="mono">${escape(v.vin)}</span>`], ['N° motor', `<span class="mono">${escape(String(v.vin).slice(-8))}M</span>`], ['Propietario', escape(owner)], ['Fecha de adquisición', fdate(v.purchaseDate)]], ['Campo', 'Dato'])}${demoStamp}`;
}

export function otHTML(ot) {
  const a = ot.appointmentId ? db.get('appointments', ot.appointmentId) : null;
  const lines = [...(ot.lines || []).map(l => [escape(l.desc), l.kind === 'repuesto' ? 'Repuesto' : 'Mano de obra', l.qty, money(l.price * l.qty)]), ...(ot.upsellItems || []).filter(u => u.status === 'aceptado').map(u => [escape(u.desc), 'Adicional aprobado', 1, money(u.price)])];
  const total = lines.length ? (ot.lines || []).reduce((s, l) => s + l.price * l.qty, 0) + (ot.upsellItems || []).filter(u => u.status === 'aceptado').reduce((s, u) => s + u.price, 0) : ot.total;
  return `${head('Orden de trabajo', ot.number, `${fdate(ot.date)} · ${escape(showroom(ot.showroomId)?.name || '')}`)}
    <div class="doc-cols"><div><h4>Vehículo</h4><p><b class="mono">${patenteFormat(ot.patente)}</b> · ${escape(ot.modelName || '')}<br>Kilometraje ${nf(ot.km)} km · Combustible ${ot.fuel ?? '—'}%</p></div><div><h4>Cliente</h4><p>${escape(ot.owner || '')}<br><small class="muted">Asesor: ${escape(userName(ot.advisorId))}</small></p></div></div>
    <p><b>Trabajo:</b> ${escape(APPT_TYPES[ot.type] || ot.type)}${a?.notes ? ` · ${escape(a.notes)}` : ''}</p>
    <h4>Checklist</h4><ul class="doc-list checks">${(ot.checklist || []).map(c => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '☑' : '☐'} ${escape(c.t)}</li>`).join('')}</ul>
    ${table([...lines, ['', '', '<b>Total</b>', `<b>${money(total)}</b>`]], ['Detalle', 'Tipo', 'Cant.', 'Valor'])}
    <div class="doc-sign"><div>Asesor de servicio</div><div>Cliente (recepción conforme)</div></div>${demoStamp}`;
}
export { modelLabel };
