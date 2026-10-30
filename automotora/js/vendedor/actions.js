// Acciones comerciales: cotización formal con control de descuento, reserva de unidad, cierre y pérdida.
import { escape, money, toast, modal, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { model, version, color, brand, priceConfig, accessoriesFor, settings, addTimeline, moveLead, STAGES, showroom, unitBadge, modelLabel, FIN_LABEL } from '../shared/domain.js';
import { openDoc, quoteHTML } from '../shared/docs.js';
import { carSVG } from '../shared/car.js';
import { ymd, addDays, fdate } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const me = () => auth.current();
const LOST = ['Compró en otra marca', 'Precio fuera de presupuesto', 'Crédito rechazado', 'No responde', 'Posterga la compra', 'Tasación baja de su usado'];

export function quoteModal(lead, onSaved) {
  const m = model(lead.modelId), s = settings(), isMgr = me().role !== 'vendedor';
  const st = { versionId: lead.versionId || m.versions[0].id, colorId: m.colors[0].id, wheelId: m.wheels[0].id, packIds: [], accIds: [], pct: 0, fin: lead.payment !== 'contado', trade: !!lead.wantsTrade };
  if (lead.configCode) { const [, v, c, w, p = '', a = ''] = lead.configCode.split('~'); Object.assign(st, { versionId: v || st.versionId, colorId: c || st.colorId, wheelId: w || st.wheelId, packIds: p.split(',').filter(Boolean), accIds: a.split(',').filter(Boolean) }); }
  const md = modal({ title: `Cotización formal · ${lead.name}`, size: 'lg', body: `<div class="grid-2"><form class="stack" novalidate>
      <div class="field"><label for="q-v">Versión</label><select class="select" id="q-v" name="versionId">${m.versions.map(x => `<option value="${x.id}" ${x.id === st.versionId ? 'selected' : ''}>${escape(x.name)} · ${money(x.price)}</option>`).join('')}</select></div>
      <div class="grid-2"><div class="field"><label for="q-c">Color</label><select class="select" id="q-c" name="colorId">${m.colors.map(x => `<option value="${x.id}" ${x.id === st.colorId ? 'selected' : ''}>${escape(x.name)}${x.price ? ' +' + money(x.price) : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="q-w">Llantas</label><select class="select" id="q-w" name="wheelId">${m.wheels.map(x => `<option value="${x.id}" ${x.id === st.wheelId ? 'selected' : ''}>${escape(x.name)}</option>`).join('')}</select></div></div>
      <div class="field"><label>Packs y accesorios</label><div class="dmg-grid">${m.packs.map(p => `<label class="check small"><input type="checkbox" name="pack" value="${p.id}" ${st.packIds.includes(p.id) ? 'checked' : ''}> ${escape(p.name)}</label>`).join('')}${accessoriesFor(m).map(a => `<label class="check small"><input type="checkbox" name="acc" value="${a.id}" ${st.accIds.includes(a.id) ? 'checked' : ''}> ${escape(a.name)}</label>`).join('')}</div></div>
      <div class="row"><label class="check small"><input type="checkbox" name="fin" ${st.fin ? 'checked' : ''}> Financia con Autoplaza</label><label class="check small"><input type="checkbox" name="trade" ${st.trade ? 'checked' : ''}> Con retoma</label></div>
      <div class="field"><label for="q-d">Descuento comercial %</label><input class="input" id="q-d" name="pct" type="number" min="0" max="${s.maxDiscountManager}" step="0.5" value="0"><small class="muted">Tu margen autorizado: hasta ${s.maxDiscountSeller}% sin aprobación${isMgr ? ` · gerencia hasta ${s.maxDiscountManager}%` : ''}.</small></div>
      <div class="field"><label for="q-n">Nota para el cliente</label><input class="input" id="q-n" name="note" placeholder="Ej: entrega en 48 h"></div></form>
    <div class="stack" data-calc></div></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('file', 16)} Emitir cotización</button>` });
  const f = md.el.querySelector('form'), out = md.el.querySelector('[data-calc]');
  let cur;
  const calc = () => {
    st.versionId = f.versionId.value; st.colorId = f.colorId.value; st.wheelId = f.wheelId.value;
    st.packIds = [...f.querySelectorAll('[name=pack]:checked')].map(i => i.value); st.accIds = [...f.querySelectorAll('[name=acc]:checked')].map(i => i.value);
    st.pct = Math.max(0, +f.pct.value || 0); st.fin = f.fin.checked; st.trade = f.trade.checked;
    const p = priceConfig({ modelId: m.id, ...st }, { financing: st.fin, tradeIn: st.trade });
    const disc = Math.round(p.list * st.pct / 100 / 10000) * 10000, total = p.total - disc;
    const cost = p.v.cost + Math.round(p.col.price * .5) + Math.round((p.list - p.v.price - p.col.price) * .6);
    const needs = st.pct > s.maxDiscountSeller && !isMgr, blocked = st.pct > s.maxDiscountManager;
    cur = { p, disc, total, needs, blocked };
    out.innerHTML = `${carSVG({ body: m.body, paint: p.col.hex, wheel: { style: p.w.style, rim: p.w.rim }, fuel: m.fuel })}
      ${p.lines.map(([l, n]) => `<div class="line"><span>${escape(l)}</span><span>${n ? money(n) : 'Incluido'}</span></div>`).join('')}
      <div class="line total-list"><span>Precio lista</span><span>${money(p.list)}</span></div>${p.bonuses.map(b => `<div class="line bonus"><span>${escape(b.name)}</span><span>−${money(b.amount)}</span></div>`).join('')}
      ${disc ? `<div class="line bonus"><span>Descuento ${String(st.pct).replace('.', ',')}%</span><span>−${money(disc)}</span></div>` : ''}
      <div class="sum-total"><span>Total</span><b>${money(total)}</b></div>
      <div class="line"><span>Utilidad bruta estimada</span><span style="color:var(--${total - cost < 0 ? 'danger' : 'success'})">${money(total - cost)}</span></div>
      ${blocked ? `<div class="alert-box danger">${icon('alert', 16)}<span>Supera el máximo de ${s.maxDiscountManager}%: no se puede emitir.</span></div>` : needs ? `<div class="alert-box warning">${icon('alert', 16)}<span>Sobre tu margen (${s.maxDiscountSeller}%): quedará <b>pendiente de aprobación</b> de gerencia.</span></div>` : ''}`;
  };
  f.addEventListener('input', calc); f.addEventListener('change', calc); calc();
  md.el.querySelector('[data-ok]').onclick = () => {
    if (cur.blocked) return toast(`El descuento máximo es ${s.maxDiscountManager}%`, 'warning');
    const q = db.insert('quotes', { number: `COT-${3500 + db.count('quotes')}`, leadId: lead.id, customer: lead.name, email: lead.email, customerId: lead.customerId || null, modelId: m.id, ...{ versionId: st.versionId, colorId: st.colorId, wheelId: st.wheelId, packIds: st.packIds, accIds: st.accIds }, listPrice: cur.p.list, bonus: cur.p.bonus, discountPct: st.pct, discount: cur.disc, total: cur.total, status: cur.needs ? 'pendiente_aprobacion' : 'enviada', sellerId: lead.sellerId || me().id, validUntil: addDays(ymd(), s.quoteValidity || 7), note: f.note.value, approvedBy: cur.needs ? null : (st.pct > s.maxDiscountSeller ? me().id : null) });
    db.update('leads', lead.id, { quoteId: q.id, value: cur.total });
    if (STAGES.indexOf(lead.stage) < STAGES.indexOf('cotizacion')) moveLead(lead.id, 'cotizacion');
    addTimeline(lead.id, 'cotizacion', `Cotización ${q.number} por ${money(q.total)} (${st.pct}% desc.)${cur.needs ? ' · enviada a aprobación de gerencia' : ''}.`, me().id);
    db.log('cotización', `${q.number} ${lead.name} ${money(q.total)}${cur.needs ? ' (requiere aprobación)' : ''}`, me().id);
    toast(cur.needs ? 'Cotización enviada a aprobación de gerencia' : `Cotización ${q.number} emitida`, cur.needs ? 'warning' : 'success');
    md.close(); if (!cur.needs) openDoc('Cotización ' + q.number, quoteHTML(q), { name: q.number }); onSaved && onSaved(q);
  };
}

export function reserveModal(lead) {
  const units = db.query('units', u => u.modelId === lead.modelId && ['stock', 'transito'].includes(u.status));
  const cur = db.find('units', u => u.leadId === lead.id && u.status === 'reservado');
  const md = modal({ title: `Reservar unidad · ${modelLabel(lead.modelId)}`, size: 'lg', body: `${cur ? `<div class="alert-box warning">${icon('lock', 16)}<span>Ya tiene reservada la unidad VIN <b class="mono">${cur.vin}</b>. Elegir otra libera la anterior.</span></div>` : ''}
    ${units.length ? `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>VIN</th><th>Versión / color</th><th>Sucursal</th><th>Estado</th></tr></thead><tbody>${units.map(u => `<tr><td><input type="radio" name="u" value="${u.id}" aria-label="Elegir"></td><td class="mono small">${u.vin}</td><td>${escape(version(u.modelId, u.versionId)?.name)}<br><small class="muted"><i class="swatch-dot" style="background:${color(u.modelId, u.colorId)?.hex}"></i> ${escape(color(u.modelId, u.colorId)?.name)}</small></td><td>${escape(showroom(u.showroomId).city)}</td><td>${unitBadge(u.status)}${u.eta ? `<br><small class="muted">ETA ${fdate(u.eta)}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">No hay unidades disponibles de este modelo. Se debe pedir a fábrica (60–90 días).</div>`}`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button>${units.length ? `<button class="btn btn-primary" data-ok>${icon('lock', 16)} Reservar</button>` : ''}` });
  md.el.querySelector('[data-ok]')?.addEventListener('click', () => {
    const id = md.el.querySelector('[name=u]:checked')?.value; if (!id) return toast('Elige una unidad', 'warning');
    if (cur) db.update('units', cur.id, { status: cur.arrivedAt ? 'stock' : 'transito', leadId: null, customer: null });
    const u = db.update('units', id, { status: 'reservado', leadId: lead.id, customer: lead.name, reservedAt: new Date().toISOString() });
    addTimeline(lead.id, 'nota', `Unidad reservada VIN ${u.vin} (${showroom(u.showroomId).city}).`, me().id);
    db.log('reserva', `${lead.name}: VIN ${u.vin}`, me().id); toast('Unidad reservada', 'success'); md.close();
  });
}

export function closeSale(lead) {
  return new Promise(resolve => {
    const q = lead.quoteId && db.get('quotes', lead.quoteId);
    if (q?.status === 'pendiente_aprobacion') { toast('La cotización aún espera aprobación de descuento', 'warning'); return resolve(false); }
    const reserved = db.find('units', u => u.leadId === lead.id && u.status === 'reservado');
    const avail = db.query('units', u => u.modelId === lead.modelId && (u.status === 'stock' || (u.status === 'reservado' && u.leadId === lead.id) || u.status === 'transito'));
    if (!avail.length) { toast('No hay unidades de este modelo: reserva o pide una a fábrica antes de cerrar', 'warning'); return resolve(false); }
    const fin = db.find('finApps', a => a.leadId === lead.id);
    let done = false;
    const md = modal({ title: `Cerrar venta · ${lead.name}`, body: `<form class="stack" novalidate><div class="field"><label for="cs-u">Unidad (VIN)</label><select class="select" id="cs-u" name="u">${avail.map(u => `<option value="${u.id}" ${u.id === reserved?.id ? 'selected' : ''}>${u.vin.slice(-8)} · ${escape(version(u.modelId, u.versionId)?.name)} · ${escape(color(u.modelId, u.colorId)?.name)} · ${escape(showroom(u.showroomId).city)}${u.status === 'transito' ? ' (tránsito)' : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="cs-p">Precio final (CLP)</label><input class="input" id="cs-p" name="price" type="number" value="${q?.total || lead.value || ''}" required></div>
      <div class="grid-2"><div class="field"><label for="cs-f">Forma de pago</label><select class="select" id="cs-f" name="fin">${Object.entries(FIN_LABEL).map(([k, l]) => `<option value="${k}" ${fin && k === (db.get('finProducts', fin.productId)?.type || 'convencional') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="cs-t">Retoma (CLP)</label><input class="input" id="cs-t" name="trade" type="number" min="0" value="0"></div></div>
      <div class="field"><label for="cs-d">Fecha de entrega</label><input class="input" id="cs-d" name="date" type="date" min="${ymd()}" value="${addDays(ymd(), 3)}"></div>
      ${fin && fin.status !== 'aprobada' ? `<div class="alert-box warning">${icon('alert', 16)}<span>El crédito ${fin.number} está "${escape(fin.status)}".</span></div>` : ''}</form>`,
      foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('handshake', 16)} Confirmar venta</button>`, onClose: () => !done && resolve(false) });
    md.el.querySelector('[data-ok]').onclick = () => {
      const f = md.el.querySelector('form'), u = db.get('units', f.u.value), price = +f.price.value;
      if (!(price > 0)) return toast('Ingresa el precio final', 'warning');
      const m = model(u.modelId), v = version(m, u.versionId), c = color(m, u.colorId);
      const list = q?.listPrice || v.price + (c?.price || 0);
      const sale = db.insert('sales', { number: `V-${String(db.count('sales') + 1).padStart(5, '0')}`, date: ymd(), modelId: m.id, versionId: v.id, colorId: c.id, brandId: m.brandId, showroomId: u.showroomId, sellerId: lead.sellerId || me().id, customer: lead.name, rut: lead.rut || '', customerId: lead.customerId || null, leadId: lead.id, listPrice: list, bonus: q?.bonus || 0, discount: Math.max(0, list - (q?.bonus || 0) - price), price, cost: u.cost, financing: f.fin.value, tradeIn: +f.trade.value || 0, daysInStock: u.arrivedAt ? Math.max(0, Math.round((Date.now() - new Date(u.arrivedAt)) / 864e5)) : 0, status: 'por_entregar', vin: u.vin });
      db.update('units', u.id, { status: 'vendido', saleId: sale.id, leadId: lead.id, customer: lead.name, deliveryDate: f.date.value || addDays(ymd(), 3), deliverySlot: '11:30' });
      if (q) db.update('quotes', q.id, { status: 'aceptada' });
      moveLead(lead.id, 'vendido');
      addTimeline(lead.id, 'etapa', `¡Venta cerrada! ${sale.number} por ${money(price)} · entrega ${fdate(f.date.value || addDays(ymd(), 3))}.`, me().id);
      db.log('venta', `${sale.number} ${lead.name} · ${m.name} ${money(price)}`, me().id);
      toast(`¡Venta ${sale.number} registrada!`, 'success'); done = true; md.close(); resolve(true);
    };
  });
}

export async function askLost(lead) {
  const r = await formModal({ title: `Marcar como perdido · ${lead.name}`, submit: 'Marcar perdido', fields: [{ name: 'reason', label: 'Motivo', type: 'select', options: LOST }, { name: 'note', label: 'Comentario', type: 'textarea' }] });
  if (!r) return false;
  const u = db.find('units', x => x.leadId === lead.id && x.status === 'reservado');
  if (u) db.update('units', u.id, { status: u.arrivedAt ? 'stock' : 'transito', leadId: null, customer: null });
  moveLead(lead.id, 'perdido', { lostReason: r.reason });
  if (r.note) addTimeline(lead.id, 'nota', r.note, me().id);
  db.log('pipeline', `${lead.name} perdido: ${r.reason}`, me().id); toast('Lead marcado como perdido', 'info');
  return true;
}
export { brand };
