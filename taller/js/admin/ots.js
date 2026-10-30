// Órdenes de trabajo: listado con filtros y ficha completa (resumen, ingreso con diagrama de daños,
// constructor de presupuesto con baremo y catálogo, trabajos, documentos, entrega y facturación).
import { escape, money, toast, confirm, modal, formModal, dateTime, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, tabs } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { CHECKLIST, DAMAGE, OT_TYPES, STAGES, PAY } from '../data/catalog.js';
import { ST_OF, totals, setStatus, canMove, createOT, addItem, updateItem, removeItem, sendBudget, decideBudget, buildTasks, deliver, userName, customerById, vehicleByPlate, validPlate, fmtPlate, fmtKm, laborPrice, mechanics, taskMin, insurerName, settings, OPEN, timeHM, dayLabel } from '../shared/domain.js';
import { plate, stBadge, timelineHTML, carDiagram, fuelGauge, budgetTable, invoiceModal, warrantyHTML, claimBadge, PRIO } from '../shared/bits.js';

const tabState = {};
const NEXT = { recepcion: 'diagnostico', diagnostico: 'presupuesto', presupuesto: 'aprobado', aprobado: 'reparacion', reparacion: 'control', control: 'listo' };

export async function newOT(ctx, preset = {}) {
  const v = await formModal({ title: 'Nueva orden de trabajo', size: 'lg', fields: [
    { name: 'plate', label: 'Patente', required: true, value: preset.plate || '', placeholder: 'KJTR-45' },
    { name: 'car', label: 'Marca y modelo (si es nuevo)', value: preset.car || '', placeholder: 'Toyota Hilux' }, { name: 'year', label: 'Año', type: 'number', value: preset.year || 2019 },
    { name: 'name', label: 'Cliente (nombre)', value: preset.name || '' }, { name: 'phone', label: 'Celular', value: preset.phone || '' }, { name: 'email', label: 'Correo', type: 'email', value: preset.email || '' },
    { name: 'type', label: 'Tipo de trabajo', type: 'select', options: Object.entries(OT_TYPES), value: preset.type || 'mecanica' },
    { name: 'km', label: 'Kilometraje', type: 'number', required: true, value: preset.km || '' }, { name: 'fuel', label: 'Combustible (0 a 8)', type: 'number', value: 4 },
    { name: 'symptom', label: 'Motivo de ingreso / síntomas', type: 'textarea', required: true, value: preset.symptom || '' }] });
  if (!v) return null;
  if (!validPlate(v.plate)) { toast('Patente no válida', 'warning'); return null; }
  let veh = vehicleByPlate(v.plate), cust = veh ? customerById(veh.customerId) : null;
  if (!cust) {
    if (v.name.trim().length < 3) { toast('Indica el nombre del cliente (vehículo nuevo)', 'warning'); return null; }
    cust = db.find('customers', c => v.email && c.email.toLowerCase() === v.email.toLowerCase()) || db.insert('customers', { name: v.name.trim(), phone: v.phone, email: v.email, rut: '', address: '', company: '', notes: '' });
  }
  const [make, ...model] = (v.car || 'Vehículo particular').split(' ');
  const o = createOT({ veh: veh || { plate: fmtPlate(v.plate), make, model: model.join(' ') || '', year: v.year }, customerId: cust.id, type: v.type, symptom: v.symptom, km: v.km, fuel: Math.max(0, Math.min(8, v.fuel)), user: ctx.user.id, advisorId: ctx.user.role === 'asesor' ? ctx.user.id : '', requestId: preset.requestId || '' });
  toast(`${o.code} creada`, 'success');
  ctx.go('/ots/' + o.id);
  return o;
}

function itemModal(o, it, ctx) {
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `<div class="field"><label for="it-d">Descripción *</label><input class="input" id="it-d" name="desc" value="${escape(it.desc)}"></div>
    <div class="grid-3"><div class="field"><label for="it-q">Cantidad</label><input class="input" id="it-q" name="qty" type="number" min="1" value="${it.qty}"></div><div class="field"><label for="it-p">Precio unitario</label><input class="input" id="it-p" name="price" type="number" min="0" step="10" value="${it.price}"></div>${it.kind === 'mano' ? `<div class="field"><label for="it-h">Horas</label><input class="input" id="it-h" name="hours" type="number" min="0" step="0.1" value="${it.hours || 0}"></div>` : '<span></span>'}</div>
    <div class="grid-2"><div class="field"><label for="it-pr">Prioridad</label><select class="select" id="it-pr" name="prio">${Object.entries(PRIO).map(([k, [l]]) => `<option value="${k}" ${k === it.prio ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label for="it-s">Estado</label><select class="select" id="it-s" name="st">${['pendiente', 'aprobado', 'rechazado'].map(s => `<option ${s === it.st ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
    <div class="field"><label for="it-n">Nota para el cliente</label><input class="input" id="it-n" name="note" value="${escape(it.note || '')}"></div>
    <label class="check"><input type="checkbox" name="photo" ${it.photo ? 'checked' : ''}> Adjuntar foto del técnico</label>`;
  const m = modal({ title: 'Editar ítem', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>' });
  m.el.querySelector('[data-ok]').onclick = () => {
    const g = n => f.elements[n];
    if (g('desc').value.trim().length < 3) { g('desc').classList.add('invalid'); return; }
    updateItem(o.id, it.id, { desc: g('desc').value.trim(), qty: Math.max(1, +g('qty').value || 1), price: Math.max(0, +g('price').value || 0), ...(g('hours') ? { hours: +g('hours').value || 0 } : {}), prio: g('prio').value, st: g('st').value, note: g('note').value.trim(), photo: g('photo').checked });
    if (g('st').value === 'aprobado') buildTasks(o.id);
    db.log('presupuesto', `${o.code} · ítem editado: ${g('desc').value.trim()}`, ctx.user.id); m.close();
  };
}

export function deliverModal(o, ctx) {
  const t = totals(o);
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `<div class="inv-tot" style="justify-self:stretch"><div><span>Total trabajos</span><b>${money(t.total)}</b></div>${t.claim ? `<div><span>Paga ${escape(insurerName(t.claim.insurerId))}</span><b>${money(t.total - t.customerPays)}</b></div><div><span>Deducible cliente</span><b>${money(t.customerPays)}</b></div>` : ''}<div><span>Abono recibido</span><b>−${money(t.deposit)}</b></div><div class="big"><span>Saldo a cobrar</span><b>${money(t.balance)}</b></div></div>
    <div class="grid-2"><div class="field"><label for="dv-k">Documento</label><select class="select" id="dv-k" name="kind"><option value="boleta">Boleta</option><option value="factura">Factura</option></select></div><div class="field"><label for="dv-m">Medio de pago del saldo</label><select class="select" id="dv-m" name="method">${PAY.map(([k, l]) => `<option value="${k}" ${t.claim && k === 'seguro' ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <label class="check"><input type="checkbox" name="ok" checked> Cliente revisó el vehículo y recibe conforme (llaves, documentos, inventario)</label>`;
  const m = modal({ title: `Entregar ${o.code}`, body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Entregar y emitir documento</button>' });
  m.el.querySelector('[data-ok]').onclick = () => {
    if (!f.elements.ok.checked) { toast('Confirma la conformidad del cliente', 'warning'); return; }
    if (t.claim && !['aprobado', 'pagado'].includes(t.claim.status)) { toast('El siniestro aún no está aprobado por la aseguradora', 'warning'); return; }
    const { inv, w } = deliver(o.id, { method: f.elements.method.value, kind: f.elements.kind.value }, ctx.user.id);
    m.close(); toast(`Entregada · ${inv.kind} N° ${inv.number} · garantía ${w.code}`, 'success'); invoiceModal(inv);
  };
}

function detail(el, ctx, id) {
  const tab = tabState[id] || 'resumen';
  let dmgType = 'abolladura';
  const paint = () => {
    const o = db.get('ots', id);
    if (!o) { el.innerHTML = '<div class="card empty">OT no encontrada. <a href="#/ots">Volver</a></div>'; return; }
    const cu = customerById(o.customerId), v = db.get('vehicles', o.vehicleId), t = totals(o), cur = tabState[id] || 'resumen';
    const claim = o.claimId ? db.get('claims', o.claimId) : null;
    const nx = NEXT[o.status];
    const edit = !['entregado', 'cancelada'].includes(o.status);
    el.innerHTML = `<div class="page-head"><div><a class="small" href="#/ots">← Órdenes de trabajo</a><h1>${escape(o.code)} <small class="muted" style="font-size:.5em">${escape(OT_TYPES[o.type] || '')}</small></h1><p class="muted" style="margin:4px 0 0">${plate(o.plate)} ${escape(o.car)} · ${escape(cu?.name || '')} · ${escape(cu?.phone || '')}</p></div>
      <div class="row">${stBadge(o.status)}${nx && edit ? `<button class="btn btn-primary btn-sm" data-move="${nx}">→ ${escape(ST_OF(nx).label)}</button>` : ''}${o.status === 'listo' ? '<button class="btn btn-primary btn-sm" data-deliver>🏁 Entregar y facturar</button>' : ''}${o.status === 'control' ? '<button class="btn btn-sm" data-move="reparacion">↩ Devolver a reparación</button>' : ''}${edit ? '<button class="btn btn-ghost btn-sm" data-cancel>Cancelar OT</button>' : ''}<a class="btn btn-ghost btn-sm" href="index.html#/ot/${o.code}" target="_blank">Vista cliente ↗</a></div></div>
      <div class="ot-timeline h">${STAGES.map(([s, l, ic], i) => `<li class="${i < ST_OF(o.status).i ? 'done' : i === ST_OF(o.status).i ? 'now' : ''}"><span class="dot">${ic}</span><small>${l}</small></li>`).join('')}</div>
      ${tabs([['resumen', 'Resumen'], ['ingreso', 'Ingreso e inventario'], ['presupuesto', `Presupuesto (${o.budget.length})`], ['trabajos', `Trabajos (${o.tasks.filter(x => x.done).length}/${o.tasks.length})`], ['documentos', 'Documentos']], cur)}
      <div data-body></div>`;
    const body = el.querySelector('[data-body]');
    if (cur === 'resumen') body.innerHTML = `<div class="grid-2" style="align-items:start"><div class="stack">
        <div class="card stack"><div class="grid-2 small detail-grid"><div><span class="label">Vehículo</span><b>${escape(o.car)}</b>VIN ${escape(v?.vin || '—')} · ${escape(v?.color || '')}</div><div><span class="label">Ingreso</span><b>${fmtKm(o.km)}</b>${fuelGauge(o.fuel)}</div>
          <div><span class="label">Asesor</span><select class="select sm" data-set="advisorId" ${edit ? '' : 'disabled'}>${db.query('users', u => ['asesor', 'jefe', 'admin'].includes(u.role)).map(u => `<option value="${u.id}" ${u.id === o.advisorId ? 'selected' : ''}>${escape(u.name)}</option>`).join('')}</select></div>
          <div><span class="label">Mecánico responsable</span><select class="select sm" data-set="mechanicId" ${edit ? '' : 'disabled'}><option value="">— Sin asignar —</option>${mechanics().map(u => `<option value="${u.id}" ${u.id === o.mechanicId ? 'selected' : ''}>${escape(u.name)} · ${escape(u.specialty)}</option>`).join('')}</select></div>
          <div><span class="label">Bahía / elevador</span><select class="select sm" data-set="bayId" ${edit ? '' : 'disabled'}><option value="">—</option>${db.all('bays').map(b => `<option value="${b.id}" ${b.id === o.bayId ? 'selected' : ''}>${escape(b.name)}</option>`).join('')}</select></div>
          <div><span class="label">Entrega comprometida</span><input class="input sm" type="date" data-set="promisedAt" value="${o.promisedAt.slice(0, 10)}" ${edit ? '' : 'disabled'}></div></div></div>
        <div class="card stack"><b>Motivo de ingreso</b><p style="margin:0">${escape(o.symptom)}</p><div class="field"><label for="dx">Diagnóstico técnico</label><textarea class="textarea" id="dx" data-dx ${edit ? '' : 'disabled'}>${escape(o.diagnosis)}</textarea></div>${edit ? '<button class="btn btn-sm" data-savedx style="justify-self:start">Guardar diagnóstico</button>' : ''}
          ${(o.findings || []).map(fd => `<p class="callout warn small">🔎 ${escape(fd.text)} · ${escape(userName(fd.by))} · ${dateTime(fd.at)}</p>`).join('')}</div>
        ${claim ? `<div class="card claim-card st-${claim.status}"><div class="row between"><b>🛡️ ${escape(claim.number)}</b>${claimBadge(claim.status)}</div><small>${escape(insurerName(claim.insurerId))} · Póliza ${escape(claim.policy)} · liquidador ${escape(claim.liquidator)}</small><small>Deducible ${claim.deductibleUF} UF (${money(claim.deductible)}) · ${claim.approved ? 'aprobado ' + money(claim.approved) : 'monto en evaluación'}</small><a class="small" href="#/seguros">Ver siniestros →</a></div>` : ''}
      </div><div class="card">${timelineHTML(o)}</div></div>`;
    if (cur === 'ingreso') body.innerHTML = `<div class="grid-2" style="align-items:start"><div class="card stack"><b>Inventario de ingreso</b>
        <div class="grid-2"><div class="field"><label for="in-km">Kilometraje</label><input class="input" id="in-km" type="number" data-km value="${o.km}" ${edit ? '' : 'disabled'}></div><div class="field"><label for="in-f">Combustible: <b data-fv>${o.fuel}/8</b></label><input id="in-f" type="range" min="0" max="8" value="${o.fuel}" data-fuel ${edit ? '' : 'disabled'}></div></div>
        <div class="check-grid">${CHECKLIST.map(([k, l]) => `<label class="check"><input type="checkbox" data-chk="${k}" ${o.intake.check[k] ? 'checked' : ''} ${edit ? '' : 'disabled'}> ${escape(l)}</label>`).join('')}</div>
        <div class="field"><label for="in-n">Observaciones</label><textarea class="textarea" id="in-n" data-inotes ${edit ? '' : 'disabled'}>${escape(o.intake.notes || '')}</textarea></div>
        <div class="row"><span class="small">📷 ${o.photos || 0} fotos</span>${edit ? '<button class="btn btn-sm" data-photo>📷 Tomar foto</button><button class="btn btn-primary btn-sm" data-saveintake>Guardar inventario</button>' : ''}</div></div>
      <div class="card stack"><div class="row between"><b>Daños previos</b><small class="muted">${edit ? 'Elige el tipo y haz clic sobre el auto. Clic en un punto para quitarlo.' : ''}</small></div>
        ${edit ? `<div class="dmg-legend">${Object.entries(DAMAGE).map(([k, d]) => `<button class="chip dmg-type ${k === dmgType ? 'active' : ''}" data-dt="${k}">${d.icon} ${escape(d.label)}</button>`).join('')}</div>` : ''}
        <div data-diag>${carDiagram(o.intake.damages, { editable: edit })}</div>
        <ol class="small" style="margin:0;padding-left:18px">${o.intake.damages.map(d => `<li>${escape(DAMAGE[d.type]?.label || d.type)}${d.note ? ': ' + escape(d.note) : ''}</li>`).join('') || '<li class="muted">Sin daños marcados</li>'}</ol></div></div>`;
    if (cur === 'presupuesto') {
      const labor = db.query('labor', l => l.active !== false), parts = db.query('parts', p => p.active !== false);
      body.innerHTML = `${o.budgetSentAt ? `<p class="callout small">📨 Enviado al cliente ${dateTime(o.budgetSentAt)} · link: <a href="index.html#/presupuesto/${o.code}" target="_blank">index.html#/presupuesto/${escape(o.code)}</a> · ${o.budget.filter(i => i.st === 'pendiente').length} ítems esperando respuesta</p>` : ''}
        ${edit ? `<div class="grid-3 builder">
          <form class="card stack" data-add="mano" novalidate><b>+ Mano de obra (baremo)</b><select class="select" name="labor" aria-label="Trabajo">${labor.map(l => `<option value="${l.id}">${escape(l.name)} · ${String(l.hours).replace('.', ',')} h</option>`).join('')}</select><div class="row"><input class="input sm" name="qty" type="number" min="1" value="1" aria-label="Cantidad" style="width:80px"><select class="select sm" name="prio" aria-label="Prioridad">${Object.entries(PRIO).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn btn-sm btn-primary">Agregar</button></div><small class="muted">Tarifa ${money(settings().laborRate)}/h · pintura ${money(settings().paintRate)}/h</small></form>
          <form class="card stack" data-add="repuesto" novalidate><b>+ Repuesto (catálogo)</b><select class="select" name="part" aria-label="Repuesto">${parts.map(p => `<option value="${p.id}">${escape(p.name)} · ${money(p.price)} · stock ${p.stock}</option>`).join('')}</select><div class="row"><input class="input sm" name="qty" type="number" min="1" value="1" aria-label="Cantidad" style="width:80px"><select class="select sm" name="prio" aria-label="Prioridad">${Object.entries(PRIO).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn btn-sm btn-primary">Agregar</button></div></form>
          <form class="card stack" data-add="libre" novalidate><b>+ Ítem libre</b><input class="input" name="desc" placeholder="Ej.: Repuesto especial importado" aria-label="Descripción"><div class="row"><select class="select sm" name="kind" aria-label="Tipo"><option value="repuesto">Repuesto</option><option value="mano">Mano de obra</option></select><input class="input sm" name="price" type="number" min="0" placeholder="Precio" aria-label="Precio" style="width:110px"><button class="btn btn-sm btn-primary">Agregar</button></div></form>
        </div>` : ''}
        <div class="card stack">${budgetTable(o, { mode: edit ? 'edit' : 'view' })}
        ${edit ? `<div class="row"><button class="btn btn-primary" data-send ${o.budget.length ? '' : 'disabled'}>📨 ${o.budgetSentAt ? 'Reenviar' : 'Enviar'} presupuesto al cliente</button><button class="btn" data-inperson ${o.budget.some(i => i.st === 'pendiente') ? '' : 'disabled'}>✍️ Cliente aprobó presencialmente</button>${claim ? `<span class="small muted">Siniestro: la aseguradora revisa este presupuesto en su portal.</span>` : ''}</div>` : ''}</div>`;
    }
    if (cur === 'trabajos') {
      const reqs = db.query('partRequests', r => r.otId === id);
      body.innerHTML = `<div class="grid-2" style="align-items:start"><div class="card stack"><b>Tareas (de la mano de obra aprobada)</b>
        ${o.tasks.map(x => { const m = taskMin(x); return `<div class="task-row ${x.done ? 'done' : ''} ${x.run ? 'running' : ''}"><div><span class="t-desc"><b>${escape(x.desc)}</b></span><small class="muted d-block">Estándar ${String(x.std).replace('.', ',')} h · real ${(m / 60).toFixed(1).replace('.', ',')} h ${x.done ? '· ✓ terminada' : x.run ? '· ▶ en curso' : ''}</small></div>
          <select class="select sm" data-tmech="${x.id}" aria-label="Mecánico" ${edit ? '' : 'disabled'}><option value="">—</option>${mechanics().map(u => `<option value="${u.id}" ${u.id === x.mech ? 'selected' : ''}>${escape(u.name)}</option>`).join('')}</select></div>`; }).join('') || '<p class="muted">Sin tareas: se crean cuando se aprueba la mano de obra.</p>'}
        <div class="row small"><span>Horas estándar <b>${o.tasks.reduce((s, x) => s + x.std, 0).toFixed(1)}</b></span><span>Horas reales <b>${(o.tasks.reduce((s, x) => s + taskMin(x), 0) / 60).toFixed(1)}</b></span></div></div>
        <div class="stack"><div class="card stack"><b>Repuestos solicitados a bodega</b>${reqs.map(r => `<div class="row between small"><span>${r.qty}× ${escape(db.get('parts', r.partId)?.name || '')}<small class="muted d-block">${escape(userName(r.mechanicId))} · ${dateTime(r.createdAt)}</small></span><span class="badge ${r.status === 'entregado' ? 'badge-success' : 'badge-warning'}">${escape(r.status)}</span></div>`).join('') || '<p class="muted small">Sin solicitudes.</p>'}</div>
        <div class="card stack"><b>Hallazgos del mecánico</b>${(o.findings || []).map(fd => `<p class="small" style="margin:0">🔎 ${escape(fd.text)}${fd.photo ? ' 📷' : ''} <small class="muted">· ${escape(userName(fd.by))}</small></p>`).join('') || '<p class="muted small">Sin hallazgos.</p>'}</div></div></div>`;
    }
    if (cur === 'documentos') {
      const inv = o.invoiceId ? db.get('invoices', o.invoiceId) : null, w = db.find('warranties', x => x.otId === id);
      body.innerHTML = `<div class="grid-3" style="align-items:start">
        <div class="card stack"><b>💳 Pagos</b><div class="inv-tot" style="justify-self:stretch"><div><span>Total</span><b>${money(t.total)}</b></div><div><span>Abono</span><b>${money(t.deposit)}</b></div>${o.deposit ? `<small class="muted">${dateTime(o.deposit.paidAt)} · ${escape(o.deposit.method)}</small>` : ''}<div class="big"><span>Saldo</span><b>${money(t.balance)}</b></div></div>${edit && !o.deposit ? '<button class="btn btn-sm" data-dep>Registrar abono</button>' : ''}</div>
        <div class="card stack"><b>🧾 Documento tributario</b>${inv ? `<span>${inv.kind} N° ${inv.number} · ${money(inv.total)}</span><button class="btn btn-sm" data-inv>Ver / imprimir</button>` : '<span class="muted small">Se emite al entregar.</span>'}</div>
        <div class="stack"><b>🛡️ Garantía</b>${w ? warrantyHTML(w) : '<span class="muted small">Se genera al entregar.</span>'}</div></div>`;
    }
  };
  el.addEventListener('click', async e => {
    const o = db.get('ots', id); if (!o) return;
    const b = e.target.closest('button, [data-tab]');
    const tb = e.target.closest('[data-tab]'); if (tb) { tabState[id] = tb.dataset.tab; paint(); return; }
    const mv = e.target.closest('[data-move]'); if (mv) { const ok = canMove(o, mv.dataset.move); if (ok !== true) { toast(ok, 'warning'); return; } if (mv.dataset.move === 'presupuesto') sendBudget(id, ctx.user.id); else setStatus(id, mv.dataset.move, ctx.user.id); toast(`${o.code} → ${ST_OF(mv.dataset.move).label}`, 'success'); return; }
    if (e.target.closest('[data-deliver]')) { deliverModal(o, ctx); return; }
    if (e.target.closest('[data-cancel]')) { if (await confirm(`¿Cancelar ${o.code}? Queda en el historial.`, { danger: true, ok: 'Cancelar OT' })) setStatus(id, 'cancelada', ctx.user.id, { bayId: '' }); return; }
    if (e.target.closest('[data-savedx]')) { db.update('ots', id, { diagnosis: el.querySelector('[data-dx]').value.trim() }); if (o.status === 'recepcion') setStatus(id, 'diagnostico', ctx.user.id); toast('Diagnóstico guardado', 'success'); return; }
    if (e.target.closest('[data-photo]')) { db.update('ots', id, { photos: (o.photos || 0) + 1 }); toast('Foto agregada (simulada)', 'success'); return; }
    if (e.target.closest('[data-saveintake]')) { const check = Object.fromEntries([...el.querySelectorAll('[data-chk]')].map(c => [c.dataset.chk, c.checked])); db.update('ots', id, { km: +el.querySelector('[data-km]').value || o.km, fuel: +el.querySelector('[data-fuel]').value, intake: { ...o.intake, check, notes: el.querySelector('[data-inotes]').value.trim() } }); db.log('ot', `${o.code} · inventario de ingreso actualizado`, ctx.user.id); toast('Inventario guardado', 'success'); return; }
    const dt = e.target.closest('[data-dt]'); if (dt) { dmgType = dt.dataset.dt; el.querySelectorAll('[data-dt]').forEach(x => x.classList.toggle('active', x === dt)); return; }
    const mk = e.target.closest('.cd-mark'); if (mk && el.querySelector('.car-diagram.editable')) { db.update('ots', id, { intake: { ...o.intake, damages: o.intake.damages.filter((_, i) => i !== +mk.dataset.dmg) } }); return; }
    const svg = e.target.closest('.car-diagram.editable');
    if (svg) { const r = svg.getBoundingClientRect(); const x = Math.round((e.clientX - r.left) / r.width * 400), y = Math.round((e.clientY - r.top) / r.height * 200); db.update('ots', id, { intake: { ...o.intake, damages: [...o.intake.damages, { x, y, type: dmgType, note: '' }] } }); return; }
    const ei = e.target.closest('[data-edit-item]'); if (ei) { itemModal(o, o.budget.find(i => i.id === ei.dataset.editItem), ctx); return; }
    const di = e.target.closest('[data-del-item]'); if (di) { removeItem(id, di.dataset.delItem); return; }
    if (e.target.closest('[data-send]')) { const ok = canMove(o, 'presupuesto'); if (ok !== true) { toast(ok, 'warning'); return; } sendBudget(id, ctx.user.id); db.log('whatsapp', `Mensaje a ${customerById(o.customerId)?.phone}: "Tu presupuesto ${o.code} está listo: mecanicalosandes.cl/#/presupuesto/${o.code}"`, ctx.user.id); toast('Presupuesto enviado por WhatsApp (simulado)', 'success'); return; }
    if (e.target.closest('[data-inperson]')) { if (await confirm('Se marcarán como aprobados todos los ítems pendientes.', { ok: 'Aprobar todo' })) { decideBudget(id, Object.fromEntries(o.budget.filter(i => i.st === 'pendiente').map(i => [i.id, true])), { by: `asesor (${ctx.user.name})`, user: ctx.user.id }); toast('Aprobación registrada', 'success'); } return; }
    if (e.target.closest('[data-dep]')) { const v = await formModal({ title: 'Registrar abono', fields: [{ name: 'amount', label: 'Monto', type: 'number', required: true, value: Math.round(totals(o).approved * .3 / 10) * 10 }, { name: 'method', label: 'Medio', type: 'select', options: PAY.slice(0, 4) }] }); if (v) { db.update('ots', id, { deposit: { amount: v.amount, method: v.method, paidAt: new Date().toISOString() } }); db.log('caja', `${o.code} · abono ${money(v.amount)}`, ctx.user.id); } return; }
    if (e.target.closest('[data-inv]')) { invoiceModal(db.get('invoices', o.invoiceId)); return; }
    return b;
  });
  el.addEventListener('submit', e => {
    const f = e.target.closest('[data-add]'); if (!f) return; e.preventDefault();
    const o = db.get('ots', id), k = f.dataset.add, q = Math.max(1, +f.elements.qty?.value || 1);
    if (k === 'mano') { const l = db.get('labor', f.elements.labor.value); addItem(id, { kind: 'mano', laborId: l.id, desc: l.name, hours: l.hours, qty: q, price: laborPrice(l.hours, l.cat), prio: f.elements.prio.value }); }
    if (k === 'repuesto') { const p = db.get('parts', f.elements.part.value); addItem(id, { kind: 'repuesto', partId: p.id, desc: p.name, qty: q, price: p.price, prio: f.elements.prio.value, note: p.stock < q ? 'Sujeto a disponibilidad (pedido a proveedor)' : '' }); }
    if (k === 'libre') { const d = f.elements.desc.value.trim(), pr = +f.elements.price.value; if (d.length < 3 || !pr) { toast('Describe el ítem e indica precio', 'warning'); return; } addItem(id, { kind: f.elements.kind.value, desc: d, qty: 1, price: pr, hours: f.elements.kind.value === 'mano' ? Math.round(pr / settings().laborRate * 10) / 10 : 0, prio: 'recomendado' }); }
    db.log('presupuesto', `${o.code} · ítem agregado`, ctx.user.id); toast('Ítem agregado', 'success');
  });
  el.addEventListener('change', e => {
    const o = db.get('ots', id);
    const s = e.target.closest('[data-set]'); if (s) { const k = s.dataset.set; const val = k === 'promisedAt' ? new Date(s.value + 'T18:00').toISOString() : s.value; db.update('ots', id, { [k]: val, ...(k === 'mechanicId' ? { tasks: o.tasks.map(x => x.mech ? x : { ...x, mech: val }) } : {}) }); db.log('ot', `${o.code} · ${k === 'mechanicId' ? 'mecánico: ' + userName(val) : k === 'bayId' ? 'bahía: ' + (db.get('bays', val)?.name || '—') : k === 'advisorId' ? 'asesor: ' + userName(val) : 'entrega comprometida: ' + s.value}`, ctx.user.id); toast('Actualizado', 'success'); return; }
    const tm = e.target.closest('[data-tmech]'); if (tm) { db.update('ots', id, { tasks: o.tasks.map(x => x.id === tm.dataset.tmech ? { ...x, mech: tm.value } : x) }); return; }
    if (e.target.matches('[data-fuel]')) el.querySelector('[data-fv]').textContent = e.target.value + '/8';
  });
  el.addEventListener('input', e => { if (e.target.matches('[data-fuel]')) el.querySelector('[data-fv]').textContent = e.target.value + '/8'; });
  paint();
  return { refresh: paint };
}

export default {
  id: 'ots', label: 'Órdenes de trabajo', icon: '📋', group: 'Taller', roles: ['admin', 'jefe', 'asesor'], watch: ['ots', 'claims', 'partRequests', 'invoices', 'warranties'],
  render(el, ctx) {
    if (ctx.params.sub) return detail(el, ctx, ctx.params.sub);
    el.innerHTML = `${pageHead('Órdenes de trabajo', 'Todas las OT del taller. Haz clic para abrir la ficha completa.', '<button class="btn btn-primary btn-sm" data-new>+ Nueva OT</button>')}<div data-list></div>`;
    el.querySelector('[data-new]').onclick = () => newOT(ctx);
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('ots').map(o => ({ ...o, cust: customerById(o.customerId)?.name || '', total: totals(o).total, adv: userName(o.advisorId), mech: o.mechanicId ? userName(o.mechanicId) : '—', stI: ST_OF(o.status).i })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', value: '', options: [...STAGES.map(([k, l]) => [k, l]), ['cancelada', 'Cancelada'], ['abiertas', 'Abiertas']], test: (r, v) => v === 'abiertas' ? OPEN.includes(r.status) : r.status === v }, { key: 'type', label: 'Tipo', options: Object.entries(OT_TYPES) }, { key: 'mechanicId', label: 'Mecánico', options: mechanics().map(u => [u.id, u.name]) }, { key: 'advisorId', label: 'Asesor', options: db.query('users', u => u.role === 'asesor').map(u => [u.id, u.name]) }],
      search: r => `${r.code} ${r.plate} ${r.cust} ${r.car}`,
      columns: [
        { key: 'code', label: 'OT', render: r => `<code><b>${escape(r.code)}</b></code><small class="muted d-block">${escape(date(r.createdAt))}</small>` },
        { key: 'plate', label: 'Vehículo', render: r => `${plate(r.plate)}<small class="muted d-block">${escape(r.car)}</small>` },
        { key: 'cust', label: 'Cliente' }, { key: 'type', label: 'Tipo', render: r => `<small>${escape(OT_TYPES[r.type] || r.type)}</small>` },
        { key: 'mech', label: 'Mecánico' }, { key: 'total', label: 'Total', render: r => money(r.total) },
        { key: 'stI', label: 'Estado', render: r => stBadge(r.status) }
      ],
      onRow: r => ctx.go('/ots/' + r.id),
      csv: { name: 'ordenes-trabajo', map: r => ({ ot: r.code, fecha: r.createdAt.slice(0, 10), patente: r.plate, vehiculo: r.car, cliente: r.cust, tipo: r.type, asesor: r.adv, mecanico: r.mech, total: r.total, estado: ST_OF(r.status).label }) }
    });
  }
};
export { timeHM, dayLabel };
