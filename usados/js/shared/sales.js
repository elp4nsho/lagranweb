// Flujo comercial compartido (panel y app del vendedor): ficha de lead, notas, cotización y contrato de compraventa.
import { money, escape, dateTime, date, toast, modal, formModal, confirm } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { LEAD_TYPES, LEAD_STATES, CAR_STATES, VAL_STATES } from '../data/catalog.js';
import { carTitle, carName, kmFmt, branchById, userById, sellers, statusBadge, simulate, settings, setCarStatus, nextCode, reconCost } from './domain.js';
import { fmtDay } from './util.js';
import { carArt } from './car-art.js';

export function leadDetail(id, user) {
  const draw = () => {
    const l = db.get('leads', id), c = l.carId && db.get('cars', l.carId), val = l.valuationId && db.get('valuations', l.valuationId);
    const res = c && db.find('reservations', r => r.carId === c.id && r.status === 'activa');
    const fin = db.find('financing', f => f.leadId === l.id || (c && f.carId === c.id && f.email === l.email));
    return `<div class="stack">
      <div class="grid-2"><dl class="dl small"><dt>Tipo</dt><dd>${LEAD_TYPES[l.type]?.icon || ''} ${escape(LEAD_TYPES[l.type]?.label || l.type)}</dd><dt>Cliente</dt><dd>${escape(l.name)}<small class="muted d-block">${escape(l.email)} · ${escape(l.phone || '')}${l.rut ? ' · ' + escape(l.rut) : ''}</small></dd>
          <dt>Origen</dt><dd>${escape(l.source || 'web')} · ${dateTime(l.createdAt)}</dd>${l.scheduledAt ? `<dt>Agenda</dt><dd>${fmtDay(l.scheduledAt.slice(0, 10), { weekday: true })} ${l.scheduledAt.slice(11)} · ${escape(branchById(l.branchId)?.name || '')}</dd>` : ''}
          ${res ? `<dt>Reserva</dt><dd>${escape(res.code)} · ${money(res.deposit)} · vence ${fmtDay(res.expiresAt)}</dd>` : ''}${fin ? `<dt>Crédito</dt><dd>${money(fin.price - fin.pie)} en ${fin.cuotas} cuotas · ${escape(fin.status)}</dd>` : ''}
          ${val ? `<dt>Tasación</dt><dd>${escape(val.code)} · ${escape(val.brand + ' ' + val.model)} ${val.year} · ${statusBadge(VAL_STATES, val.status)}</dd>` : ''}</dl>
        ${c ? `<div class="stack" style="gap:4px"><div class="car-frame">${carArt({ body: c.body, color: c.color })}</div><b>${escape(carTitle(c))}</b><small class="muted">${escape(c.stock)} · ${kmFmt(c.km)} · ${money(c.price)} · ${statusBadge(CAR_STATES, c.status)}</small></div>` : '<p class="muted">Sin auto asociado.</p>'}</div>
      <div class="grid-2"><div class="field"><label for="ld-st">Estado</label><select class="select" id="ld-st">${Object.entries(LEAD_STATES).map(([k, s]) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div>
        <div class="field"><label for="ld-sel">Vendedor</label><select class="select" id="ld-sel"><option value="">Sin asignar</option>${sellers().map(s => `<option value="${s.id}" ${l.sellerId === s.id ? 'selected' : ''}>${escape(s.name)}</option>`).join('')}</select></div></div>
      ${l.quote ? `<div class="callout small">💼 Cotización ${escape(l.quote.code)}: ${money(l.quote.total)} ${l.quote.cuotas ? `· ${l.quote.cuotas} cuotas de ${money(l.quote.cuota)}` : 'contado'} <button class="btn btn-sm btn-ghost" data-viewq>Ver</button></div>` : ''}
      <div class="stack" style="gap:6px"><span class="label">Notas de negociación</span><ul class="note-list">${(l.notes || []).slice().reverse().map(n => `<li>${escape(n.text)}<small class="muted d-block">${dateTime(n.at)} · ${escape(userById(n.by)?.name || 'Cliente / web')}</small></li>`).join('') || '<li class="muted">Sin notas.</li>'}</ul>
        <div class="row" style="flex-wrap:nowrap"><input class="input" id="ld-note" placeholder="Agregar nota (llamada, objeción, acuerdo…)"><button class="btn" data-note>Agregar</button></div></div>
    </div>`;
  };
  const foot = () => { const l = db.get('leads', id), c = l.carId && db.get('cars', l.carId); return `<button class="btn btn-sm btn-ghost" data-lost>Marcar perdido</button><span class="grow"></span>${c ? '<button class="btn btn-sm" data-quote>Generar cotización</button>' : ''}${c && ['publicado', 'reservado', 'certificado'].includes(c.status) ? '<button class="btn btn-sm btn-primary" data-close-sale>Cerrar venta y contrato</button>' : ''}<button class="btn btn-sm btn-primary" data-save>Guardar</button>`; };
  const l0 = db.get('leads', id);
  const m = modal({ title: `${LEAD_TYPES[l0.type]?.label || 'Lead'} · ${l0.name}`, size: 'lg', body: draw(), foot: foot() });
  const repaint = () => { if (!document.body.contains(m.el)) return; m.el.querySelector('.modal-body').innerHTML = draw(); m.el.querySelector('.modal-foot').innerHTML = foot(); };
  m.el.addEventListener('click', async e => {
    const l = db.get('leads', id);
    if (e.target.closest('[data-save]')) {
      const st = m.el.querySelector('#ld-st').value, sel = m.el.querySelector('#ld-sel').value || null;
      db.update('leads', id, { status: st, sellerId: sel });
      db.log('leads', `${l.name}: ${LEAD_STATES[st].label}${sel ? ' · ' + userById(sel)?.name : ''}`, user.id); toast('Lead actualizado', 'success'); repaint();
    }
    if (e.target.closest('[data-note]')) {
      const inp = m.el.querySelector('#ld-note'), text = inp.value.trim(); if (!text) return;
      db.update('leads', id, { notes: [...(l.notes || []), { at: new Date().toISOString(), by: user.id, text }], status: l.status === 'nuevo' ? 'contactado' : l.status, sellerId: l.sellerId || user.id });
      toast('Nota agregada', 'success'); repaint();
    }
    if (e.target.closest('[data-lost]')) { const v = await formModal({ title: 'Motivo de pérdida', fields: [{ name: 'why', label: 'Motivo', type: 'select', options: ['Compró en otra automotora', 'Precio', 'No calificó al crédito', 'No contesta', 'Desistió de comprar'] }] }); if (v) { db.update('leads', id, { status: 'perdido', notes: [...(l.notes || []), { at: new Date().toISOString(), by: user.id, text: 'Perdido: ' + v.why }] }); db.log('leads', `${l.name}: perdido (${v.why})`, user.id); repaint(); } }
    if (e.target.closest('[data-quote]')) { await makeQuote(id, user); repaint(); }
    if (e.target.closest('[data-viewq]')) quoteDoc(db.get('leads', id));
    if (e.target.closest('[data-close-sale]')) { const s = await closeSale(id, user); if (s) { m.close(); contractDoc(s); } }
  });
  return m;
}

export async function makeQuote(leadId, user) {
  const l = db.get('leads', leadId), c = db.get('cars', l.carId), st = settings();
  const v = await formModal({ title: `Cotización · ${carName(c)}`, fields: [
    { name: 'price', label: 'Precio de lista', type: 'number', value: c.price, required: true }, { name: 'discount', label: 'Descuento (CLP)', type: 'number', value: 0 },
    { name: 'tradeIn', label: 'Auto en parte de pago (valor tasado)', type: 'number', value: 0 }, { name: 'pie', label: 'Pie en efectivo', type: 'number', value: Math.round(c.price * .3 / 10000) * 10000 },
    { name: 'cuotas', label: 'Cuotas (0 = contado)', type: 'select', options: [['0', 'Contado'], '24', '36', '48', '60'], value: '36' }, { name: 'valid', label: 'Válida por (días)', type: 'number', value: 5 }] });
  if (!v) return;
  const total = v.price - (v.discount || 0);
  if (v.discount > c.price * .08) { toast('Descuentos sobre 8% requieren aprobación del gerente', 'warning'); return; }
  const cuotas = +v.cuotas, pie = Math.min(total, (v.pie || 0) + (v.tradeIn || 0));
  const sim = cuotas ? simulate({ price: total, pie, cuotas, tasa: st.baseRate }) : null;
  const quote = { code: 'CT-' + Date.now().toString().slice(-6), at: new Date().toISOString(), by: user.id, price: v.price, discount: v.discount || 0, tradeIn: v.tradeIn || 0, pie: v.pie || 0, total, cuotas, cuota: sim?.cuota || 0, cae: sim?.cae || 0, valid: v.valid || 5 };
  db.update('leads', leadId, { quote, status: ['nuevo', 'contactado'].includes(l.status) ? 'negociacion' : l.status, sellerId: l.sellerId || user.id, notes: [...(l.notes || []), { at: quote.at, by: user.id, text: `Cotización ${quote.code} enviada: ${money(total)}${cuotas ? `, ${cuotas} cuotas de ${money(quote.cuota)}` : ' contado'}.` }] });
  db.log('ventas', `Cotización ${quote.code} para ${l.name} (${carName(c)})`, user.id);
  toast('Cotización generada', 'success');
  quoteDoc(db.get('leads', leadId));
}
export function quoteDoc(l) {
  const q = l.quote, c = db.get('cars', l.carId), s = settings();
  modal({ title: `Cotización ${q.code}`, size: 'lg', body: `<div class="doc-sheet stack"><div class="row between"><h2>${escape(s.name)}</h2><span class="mono">${q.code} · ${date(q.at)}</span></div>
    <p>Señor(a) <b>${escape(l.name)}</b>${l.rut ? ', RUT ' + escape(l.rut) : ''}: junto con saludar, le enviamos la cotización del vehículo certificado:</p>
    <p><b>${escape(carTitle(c))}</b> · ${kmFmt(c.km)} · ${escape(c.transmission)} · ${escape(c.colorName)} · Stock ${escape(c.stock)}</p>
    <table><tr><td>Precio de lista</td><td>${money(q.price)}</td></tr>${q.discount ? `<tr><td>Descuento</td><td>−${money(q.discount)}</td></tr>` : ''}<tr><td>Precio final</td><td>${money(q.total)}</td></tr>${q.tradeIn ? `<tr><td>Auto en parte de pago</td><td>−${money(q.tradeIn)}</td></tr>` : ''}
      ${q.cuotas ? `<tr><td>Pie en efectivo</td><td>${money(q.pie)}</td></tr><tr><td>Crédito: ${q.cuotas} cuotas mensuales</td><td>${money(q.cuota)}</td></tr><tr><td>CAE</td><td>${String(q.cae).replace('.', ',')}%</td></tr>` : `<tr><td>Saldo a pagar contado</td><td>${money(q.total - q.tradeIn)}</td></tr>`}</table>
    <small class="muted">Incluye inspección de 150 puntos, garantía mecánica de ${s.warrantyMonths} meses y transferencia. Válida por ${q.valid} días. Vendedor: ${escape(userById(q.by)?.name || '')}.</small></div>`,
    foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" onclick="window.print()">🖨 Imprimir / PDF</button>' });
}

export async function closeSale(leadId, user) {
  const l = db.get('leads', leadId), c = db.get('cars', l.carId);
  const q = l.quote;
  const v = await formModal({ title: `Cerrar venta · ${carName(c)}`, fields: [
    { name: 'price', label: 'Precio final', type: 'number', required: true, value: q?.total || c.price }, { name: 'payment', label: 'Forma de pago', type: 'select', options: [['contado', 'Contado / transferencia'], ['financiado', 'Crédito automotriz'], ['parte-de-pago', 'Parte de pago + saldo']], value: q?.cuotas ? 'financiado' : 'contado' },
    { name: 'rut', label: 'RUT del comprador', required: true, value: l.rut }, { name: 'address', label: 'Domicilio del comprador', required: true }] });
  if (!v) return null;
  if (!(await confirm(`Se registrará la venta del ${carName(c)} a ${l.name} por ${money(v.price)} y el auto quedará como vendido.`, { title: 'Confirmar venta', ok: 'Registrar venta' }))) return null;
  const fin = db.find('financing', f => f.carId === c.id && f.email === l.email && ['aprobada', 'condicionada'].includes(f.status));
  const s = db.insert('sales', { code: nextCode('sales', 'VT-', 500), carId: c.id, name: l.name, email: l.email, phone: l.phone, rut: v.rut, address: v.address, sellerId: l.sellerId || user.id, price: v.price, cost: c.cost, recon: reconCost(c), margin: v.price - c.cost - reconCost(c), date: new Date().toISOString(), payment: v.payment, financingId: fin?.id || null, contractNo: 'CC-' + (20000 + db.count('sales') + 1), leadId });
  db.update('cars', c.id, { soldPrice: v.price });
  setCarStatus(c.id, 'vendido', user.id, `venta ${s.code}`);
  const res = db.find('reservations', r => r.carId === c.id && r.status === 'activa'); if (res) db.update('reservations', res.id, { status: 'convertida' });
  db.update('leads', leadId, { status: 'ganado', notes: [...(l.notes || []), { at: s.date, by: user.id, text: `Venta ${s.code} cerrada por ${money(v.price)}.` }] });
  const owner = db.find('users', u => u.role === 'cliente' && u.email.toLowerCase() === l.email.toLowerCase());
  if (owner && !db.find('garage', g => g.carId === c.id)) db.insert('garage', { userId: owner.id, brand: c.brand, model: c.model, year: c.year, plate: c.plate, km: c.km, carId: c.id, color: c.color, body: c.body });
  db.log('ventas', `Venta ${s.code}: ${carName(c)} a ${l.name} · ${money(v.price)} (margen ${money(s.margin)})`, user.id);
  toast(`Venta ${s.code} registrada`, 'success');
  return s;
}
export function contractDoc(s) {
  const c = db.get('cars', s.carId), st = settings();
  modal({ title: `Contrato ${s.contractNo}`, size: 'lg', body: `<div class="doc-sheet stack"><h2 style="text-align:center">Contrato de compraventa de vehículo motorizado</h2>
    <p>En ${escape(branchById(c.branchId)?.comuna || 'Santiago')}, a ${date(s.date)}, entre <b>${escape(st.name)} SpA</b>, RUT 77.123.456-7, en adelante "el vendedor", y don(ña) <b>${escape(s.name)}</b>, RUT ${escape(s.rut || '')}, domiciliado(a) en ${escape(s.address || '—')}, en adelante "el comprador", se acuerda:</p>
    <p><b>Primero.</b> El vendedor vende al comprador el vehículo marca ${escape(c.brand)}, modelo ${escape(c.model)} ${escape(c.version)}, año ${c.year}, color ${escape(c.colorName)}, patente ${escape(c.plate)}, con ${kmFmt(c.km)} registrados.</p>
    <p><b>Segundo.</b> El precio de la compraventa es de <b>${money(s.price)}</b>, pagado mediante ${s.payment === 'financiado' ? 'crédito automotriz' : s.payment === 'parte-de-pago' ? 'vehículo en parte de pago y saldo en dinero' : 'transferencia electrónica'}.</p>
    <p><b>Tercero.</b> El vehículo cuenta con certificación de 150 puntos, garantía mecánica de ${st.warrantyMonths} meses y se entrega libre de multas, prendas y prohibiciones.</p>
    <p><b>Cuarto.</b> La inscripción en el Registro de Vehículos Motorizados será tramitada por el vendedor.</p>
    <div class="sign-row"><span>${escape(st.name)} SpA<br>p.p. ${escape(userById(s.sellerId)?.name || '')}</span><span>${escape(s.name)}<br>Comprador</span></div>
    <small class="muted">Documento de demostración sin validez legal · ${escape(s.code)}</small></div>`,
    foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" onclick="window.print()">🖨 Imprimir / PDF</button>' });
}
export { LEAD_STATES };
