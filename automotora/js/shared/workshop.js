// Taller: recepción de vehículos, órdenes de trabajo (checklist, ítems, adicionales) y entrega.
import { escape, money, toast, modal, confirm, dateTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { APPT_TYPES, APPT_STATUS, apptBadge, OT_FLOW, otTotal, userName, showroom, brand, model } from './domain.js';
import { openDoc, otHTML } from './docs.js';
import { carSVG } from './car.js';
import { meter } from './charts.js';
import { patenteFormat, nf, ymd } from './util.js';
import { icon } from './icons.js';

const DAMAGE = ['Rayones', 'Abolladuras', 'Parabrisas trizado', 'Llantas rayadas', 'Tapiz manchado', 'Luces dañadas'];
const NEXT = { recepcionada: 'en_proceso', en_proceso: 'lista', esperando_repuestos: 'en_proceso', lista: 'entregada' };
const NEXT_LABEL = { recepcionada: 'Iniciar trabajo', en_proceso: 'Marcar lista para retiro', esperando_repuestos: 'Repuestos llegaron · continuar', lista: 'Entregar al cliente' };
const me = () => auth.current();

export function setStatus(ot, status, text) {
  const log = [...(ot.log || []), { at: new Date().toISOString(), text: text || `Estado: ${APPT_STATUS[status][0]}`, by: me()?.id }];
  const patch = { status, log };
  if (status === 'lista') patch.readyAt = new Date().toISOString();
  if (status === 'entregada') patch.deliveredAt = new Date().toISOString();
  db.update('workorders', ot.id, patch);
  if (ot.appointmentId) db.update('appointments', ot.appointmentId, { status });
  db.log('taller', `${ot.number} ${patenteFormat(ot.patente)}: ${APPT_STATUS[status][0]}`, me()?.id);
}

export function receive(appt, onDone) {
  const plan = appt.planId ? db.get('servicePlans', appt.planId) : null;
  const m = modal({ title: `Recepción · ${patenteFormat(appt.patente)}`, size: 'lg', body: `<form class="stack" novalidate>
    <p class="muted">${escape(appt.modelName)} ${appt.year || ''} · ${escape(appt.owner)} · ${escape(APPT_TYPES[appt.type])}${plan ? ` · pauta ${nf(plan.km)} km` : ''}</p>
    <div class="form-grid"><div class="field"><label for="rk">Kilometraje</label><input class="input" id="rk" name="km" type="number" min="0" value="${appt.km || ''}" required></div>
    <div class="field"><label>Combustible / carga</label><div class="fuel-picker">${[0, 25, 50, 75, 100].map(f => `<label class="chip"><input type="radio" name="fuel" value="${f}" ${f === 50 ? 'checked' : ''}> ${f}%</label>`).join('')}</div></div></div>
    <div class="field"><label>Inspección visual (marca los daños existentes)</label><div class="dmg-grid">${DAMAGE.map(d => `<label class="check small"><input type="checkbox" name="dmg" value="${d}"> ${d}</label>`).join('')}</div></div>
    <div class="field"><label for="rn">Solicitud del cliente / observaciones</label><textarea class="textarea" id="rn" name="notes">${escape(appt.notes || '')}</textarea></div>
    <label class="check"><input type="checkbox" name="sign" required> El cliente firmó la orden de recepción (firma digital simulada)</label></form>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('clipboard', 16)} Crear orden de trabajo</button>` });
  m.el.querySelector('[data-ok]').onclick = () => {
    const f = m.el.querySelector('form');
    const km = +f.km.value;
    if (!km) { f.km.classList.add('invalid'); return toast('Ingresa el kilometraje', 'warning'); }
    if (!f.sign.checked) return toast('Falta la firma del cliente', 'warning');
    const items = plan ? plan.items : appt.type === 'recall' ? ['Aplicar campaña de seguridad', 'Registro en sistema de marca'] : appt.type === 'carroceria' ? ['Desarme de piezas', 'Desabolladura', 'Preparación y pintura', 'Pulido y armado'] : ['Diagnóstico con escáner', 'Prueba de ruta', 'Inspección de la falla reportada'];
    const ot = db.insert('workorders', { number: `OT-${18900 + db.count('workorders')}`, date: ymd(), showroomId: appt.showroomId, type: appt.type, appointmentId: appt.id, vehicleId: appt.vehicleId, patente: appt.patente, owner: appt.owner, modelName: appt.modelName, brandId: appt.brandId, km, fuel: +(f.fuel.value || 50), damage: [...f.querySelectorAll('[name=dmg]:checked')].map(i => i.value), notes: f.notes.value, status: 'recepcionada', advisorId: me()?.id, checklist: items.map(t => ({ t, ok: false })), lines: plan ? [{ desc: `Pauta de mantención ${nf(plan.km)} km`, kind: 'mano_obra', qty: 1, price: plan.price }] : appt.type === 'recall' ? [{ desc: 'Campaña de seguridad (sin costo)', kind: 'mano_obra', qty: 1, price: 0 }] : [{ desc: 'Diagnóstico', kind: 'mano_obra', qty: 1, price: 39990 }], upsellItems: [], log: [{ at: new Date().toISOString(), text: 'Vehículo recepcionado', by: me()?.id }], receivedAt: new Date().toISOString(), total: 0 });
    db.update('appointments', appt.id, { status: 'recepcionada', otId: ot.id, km });
    if (appt.vehicleId) { const v = db.get('vehicles', appt.vehicleId); if (v && km > v.km) db.update('vehicles', v.id, { km }); }
    db.log('taller', `Recepción ${patenteFormat(appt.patente)} · ${ot.number}`, me()?.id);
    toast(`${ot.number} creada · el cliente ya ve el avance en su cuenta`, 'success');
    m.close(); onDone && onDone(ot);
  };
}

export function otPanelHTML(ot) {
  const done = ot.checklist.filter(c => c.ok).length, total = otTotal(ot), v = ot.vehicleId ? db.get('vehicles', ot.vehicleId) : null, m = v && model(v.modelId);
  return `<div class="grid-main"><div class="stack">
    <div class="card"><div class="card-title"><h3>${icon('wrench', 18)} ${ot.number} · <span class="mono">${patenteFormat(ot.patente)}</span></h3>${apptBadge(ot.status)}</div>
      <div class="row">${m ? `<div style="width:150px">${carSVG({ body: m.body, paint: v.hex })}</div>` : ''}<dl class="kv grow"><dt>Vehículo</dt><dd>${escape(ot.modelName)} · ${nf(ot.km)} km · comb. ${ot.fuel}%</dd><dt>Cliente</dt><dd>${escape(ot.owner)}</dd><dt>Trabajo</dt><dd>${escape(APPT_TYPES[ot.type])}</dd><dt>Asesor</dt><dd>${escape(userName(ot.advisorId))}</dd>${ot.damage?.length ? `<dt>Daños previos</dt><dd>${escape(ot.damage.join(', '))}</dd>` : ''}${ot.notes ? `<dt>Observaciones</dt><dd>${escape(ot.notes)}</dd>` : ''}</dl></div>
      <div class="row" style="margin-top:12px">${NEXT[ot.status] ? `<button class="btn btn-primary" data-next="${ot.id}">${icon('arrow', 16)} ${NEXT_LABEL[ot.status]}</button>` : ''}${ot.status === 'en_proceso' ? `<button class="btn" data-wait="${ot.id}">${icon('clock', 16)} Esperando repuestos</button>` : ''}<button class="btn btn-ghost" data-print="${ot.id}">${icon('print', 16)} Imprimir OT</button></div></div>
    <div class="card"><div class="card-title"><h3>${icon('clipboard', 18)} Checklist (${done}/${ot.checklist.length})</h3></div>${meter(done / Math.max(1, ot.checklist.length) * 100)}
      ${ot.checklist.map((c, i) => `<label class="check-row ${c.ok ? 'ok' : ''}"><input type="checkbox" data-check="${ot.id}|${i}" ${c.ok ? 'checked' : ''} ${ot.status === 'entregada' ? 'disabled' : ''}><span>${escape(c.t)}</span></label>`).join('')}</div>
    <div class="card"><div class="card-title"><h3>${icon('money', 18)} Detalle de cobro</h3><b>${money(total)}</b></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Detalle</th><th>Tipo</th><th>Cant.</th><th>Valor</th><th></th></tr></thead><tbody>${ot.lines.map((l, i) => `<tr><td>${escape(l.desc)}</td><td>${l.kind === 'repuesto' ? 'Repuesto' : 'Mano de obra'}</td><td>${l.qty}</td><td>${money(l.price * l.qty)}</td><td>${ot.status !== 'entregada' && i > 0 ? `<button class="btn btn-sm btn-ghost btn-icon" data-rmline="${ot.id}|${i}" aria-label="Quitar">${icon('trash', 15)}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
      ${ot.status !== 'entregada' ? `<form class="row" data-addline="${ot.id}" style="margin-top:10px" novalidate><input class="input grow" name="desc" placeholder="Agregar ítem (ej: filtro de aire)" aria-label="Ítem"><select class="select" name="kind" style="width:auto" aria-label="Tipo"><option value="repuesto">Repuesto</option><option value="mano_obra">Mano de obra</option></select><input class="input" name="price" type="number" min="0" step="1000" placeholder="Valor" style="max-width:130px" aria-label="Valor"><button class="btn">${icon('plus', 15)}</button></form>` : ''}</div>
  </div><div class="stack">
    <div class="card"><div class="card-title"><h3>${icon('sparkle', 18)} Adicionales (upsell)</h3></div><p class="small muted">Las recomendaciones aparecen en la cuenta del cliente para que las apruebe en línea.</p>
      ${(ot.upsellItems || []).map(x => `<div class="appt-row"><div class="who"><b>${escape(x.desc)}</b><small>${money(x.price)}</small></div><span class="badge badge-${x.status === 'aceptado' ? 'success' : x.status === 'rechazado' ? 'danger' : 'warning'}">${x.status}</span>${x.status === 'propuesto' && ot.status !== 'entregada' ? `<button class="btn btn-sm" data-ups="${ot.id}|${x.id}|aceptado">Cliente acepta</button>` : ''}</div>`).join('') || '<p class="muted small">Sin adicionales.</p>'}
      ${ot.status !== 'entregada' ? `<form class="stack" data-addup="${ot.id}" style="margin-top:10px" novalidate><input class="input" name="desc" placeholder="Ej: pastillas de freno (desgaste 80%)" aria-label="Recomendación"><div class="row"><input class="input grow" name="price" type="number" min="0" step="1000" placeholder="Valor" aria-label="Valor del adicional"><button class="btn btn-primary">${icon('plus', 15)} Proponer</button></div></form>` : ''}</div>
    <div class="card"><h3>Historial</h3><ol class="timeline">${(ot.log || []).slice().reverse().map(l => `<li><b>${escape(l.text)}</b><small>${dateTime(l.at)}${l.by ? ' · ' + escape(userName(l.by)) : ''}</small></li>`).join('')}</ol></div>
  </div></div>`;
}

// Acciones de la OT (delegadas desde el contenedor)
export async function otAction(e) {
  const t = e.target;
  const g = (sel) => t.closest(sel);
  let b;
  if ((b = g('[data-next]'))) { const ot = db.get('workorders', b.dataset.next), to = NEXT[ot.status]; if (to === 'entregada') return deliver(ot); if (to === 'lista' && ot.checklist.some(c => !c.ok) && !await confirm('Hay ítems del checklist sin completar. ¿Marcar como lista igualmente?', { ok: 'Marcar lista' })) return; setStatus(ot, to); toast(`${ot.number}: ${APPT_STATUS[to][0]}`, 'success'); return true; }
  if ((b = g('[data-wait]'))) { const ot = db.get('workorders', b.dataset.wait); setStatus(ot, 'esperando_repuestos', 'En espera de repuestos'); toast('Cliente notificado: esperando repuestos', 'info'); return true; }
  if ((b = g('[data-print]'))) { openDoc('Orden de trabajo', otHTML(db.get('workorders', b.dataset.print)), { name: 'ot' }); return; }
  if ((b = g('[data-rmline]'))) { const [id, i] = b.dataset.rmline.split('|'), ot = db.get('workorders', id); db.update('workorders', id, { lines: ot.lines.filter((_, j) => j !== +i) }); return true; }
  if ((b = g('[data-ups]'))) { const [id, x, st] = b.dataset.ups.split('|'), ot = db.get('workorders', id); db.update('workorders', id, { upsellItems: ot.upsellItems.map(u => u.id === x ? { ...u, status: st } : u), log: [...ot.log, { at: new Date().toISOString(), text: 'Adicional aprobado por teléfono', by: me()?.id }] }); toast('Adicional aprobado', 'success'); return true; }
}
export function otChange(e) {
  const c = e.target.closest('[data-check]'); if (!c) return;
  const [id, i] = c.dataset.check.split('|'), ot = db.get('workorders', id);
  db.update('workorders', id, { checklist: ot.checklist.map((x, j) => j === +i ? { ...x, ok: c.checked } : x) });
  return true;
}
export function otSubmit(e) {
  const f = e.target;
  if (f.dataset.addline) { e.preventDefault(); const ot = db.get('workorders', f.dataset.addline), d = f.desc.value.trim(), p = +f.price.value; if (!d || !(p >= 0) || f.price.value === '') return toast('Ingresa detalle y valor', 'warning'); db.update('workorders', ot.id, { lines: [...ot.lines, { desc: d, kind: f.kind.value, qty: 1, price: p }] }); toast('Ítem agregado', 'success'); return true; }
  if (f.dataset.addup) { e.preventDefault(); const ot = db.get('workorders', f.dataset.addup), d = f.desc.value.trim(), p = +f.price.value; if (!d || !(p > 0)) return toast('Ingresa recomendación y valor', 'warning'); db.update('workorders', ot.id, { upsellItems: [...(ot.upsellItems || []), { id: 'x' + Date.now().toString(36), desc: d, price: p, status: 'propuesto' }], log: [...ot.log, { at: new Date().toISOString(), text: `Adicional propuesto al cliente: ${d}`, by: me()?.id }] }); db.log('taller', `${ot.number}: adicional propuesto ${d} (${money(p)})`, me()?.id); toast('Propuesta enviada al cliente', 'success'); return true; }
}
export async function deliver(ot) {
  const m = modal({ title: `Entregar ${patenteFormat(ot.patente)}`, body: `<p>Total a pagar: <b>${money(otTotal(ot))}</b></p><div class="field"><label for="pm">Medio de pago</label><select class="select" id="pm"><option>Tarjeta de débito</option><option>Tarjeta de crédito</option><option>Transferencia</option><option>Garantía / sin costo</option></select></div><label class="check" style="margin-top:10px"><input type="checkbox" id="pc" checked> Se explicó el trabajo realizado y se agendó la próxima mantención</label>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Entregar vehículo</button>' });
  m.el.querySelector('[data-ok]').onclick = () => {
    const total = otTotal(ot);
    db.update('workorders', ot.id, { total, labor: Math.round(total * .45), parts: total - Math.round(total * .45), payment: m.el.querySelector('#pm').value });
    setStatus(db.get('workorders', ot.id), 'entregada', `Entregado al cliente · ${m.el.querySelector('#pm').value}`);
    if (ot.vehicleId) { const v = db.get('vehicles', ot.vehicleId); if (v) { const patch = { lastServiceKm: ot.type === 'mantencion' ? Math.round(ot.km / 1000) * 1000 : v.lastServiceKm, lastServiceDate: ot.type === 'mantencion' ? ymd() : v.lastServiceDate, km: Math.max(v.km, ot.km) }; if (ot.type === 'recall') { const rc = db.query('recalls', r => r.brand === v.brandId && r.models.includes(v.modelId)); patch.recallsDone = [...(v.recallsDone || []), ...rc.map(r => r.code)]; } db.update('vehicles', v.id, patch); } }
    toast('Vehículo entregado', 'success'); m.close();
  };
}
export { showroom, brand, nf };
