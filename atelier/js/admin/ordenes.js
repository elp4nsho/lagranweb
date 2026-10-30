// Órdenes de trabajo: lista con filtros, tablero por estado, aprobaciones, detalle con flujo de estados e ítems.
import { money, escape, dateTime, date, toast, modal, confirm, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { WO_STATES, WO_FLOW, LINES, CONC_STATES } from '../data/catalog.js';
import { woTotal, vehicleById, customerById, userById, vehicleName, techs, setWoStatus, statusBadge, nextCode, inspectionStats, pendingApprovals, nextServices, kmFmt, lineOf } from '../shared/domain.js';
import { lightSummary, inspectionItems, batteryBlock, approve } from '../public/inspeccion.js';
import { carArt } from '../shared/car-art.js';

const KIND = { mo: 'Mano de obra', rep: 'Repuesto', rec: 'Adicional aprobado', conc: 'Concierge', ins: 'Insumo' };
const nextOf = s => { const i = WO_FLOW.indexOf(s); return i >= 0 && i < WO_FLOW.length - 1 ? WO_FLOW[i + 1] : null; };

export function woDetail(id, ctx) {
  const draw = () => {
    const w = db.get('workOrders', id);
    if (!w) return '<p>No encontrada.</p>';
    const v = vehicleById(w.vehicleId), c = customerById(w.customerId), conc = w.conciergeId && db.get('concierge', w.conciergeId);
    const ins = w.inspectionId && db.get('inspections', w.inspectionId), nx = nextOf(w.status), pend = pendingApprovals(ins);
    const step = WO_FLOW.indexOf(w.status);
    return `<div class="stack">
      <div class="wo-flow">${WO_FLOW.map((s, i) => `<span class="${w.status === 'cancelada' ? '' : i < step ? 'done' : i === step ? 'on' : ''}">${escape(WO_STATES[s].label)}</span>`).join('')}${w.status === 'cancelada' ? '<span class="on">Cancelada</span>' : ''}</div>
      <div class="grid-2"><div class="car-frame">${carArt({ body: v?.body, color: v?.color, ev: v?.fuel === 'electrico' })}</div>
        <dl class="dl small"><dt>Vehículo</dt><dd>${escape(vehicleName(v))} · <span class="mono">${escape(v?.plate || '')}</span></dd><dt>Cliente</dt><dd>${escape(c?.name || '')}${c?.tier ? ` <span class="badge badge-primary">${escape(c.tier)}</span>` : ''}<small class="muted d-block">${escape(c?.phone || '')}</small></dd>
          <dt>Línea</dt><dd>${escape(lineOf(w.line).label)}</dd><dt>Kilometraje</dt><dd>${kmFmt(w.km)}</dd><dt>Agendada</dt><dd>${dateTime(w.scheduledAt || w.createdAt)}</dd>${w.deliveredAt ? `<dt>Entregada</dt><dd>${dateTime(w.deliveredAt)}</dd>` : ''}
          <dt>Horas</dt><dd>${w.laborHours} h facturables · ${Math.round((w.loggedMins || 0) / 6) / 10} h registradas</dd>${w.nps != null ? `<dt>NPS</dt><dd>${w.nps}/10 ${w.npsComment ? `<small class="muted d-block">“${escape(w.npsComment)}”</small>` : ''}</dd>` : ''}</dl></div>
      <div class="grid-2">
        <div class="field"><label for="wd-tech">Técnico</label><select class="select" id="wd-tech"><option value="">Sin asignar</option>${techs().map(t => `<option value="${t.id}" ${w.techId === t.id ? 'selected' : ''}>${escape(t.name)} · ${escape(t.specialty || '')}</option>`).join('')}</select></div>
        <div class="field"><label for="wd-adv">Asesor</label><select class="select" id="wd-adv">${db.query('users', u => u.role === 'asesor' || u.role === 'gerente').map(t => `<option value="${t.id}" ${w.advisorId === t.id ? 'selected' : ''}>${escape(t.name)}</option>`).join('')}</select></div>
      </div>
      <div class="stack" style="gap:6px"><div class="row between"><h4 style="margin:0">Ítems</h4><button class="btn btn-sm" data-additem>+ Agregar ítem</button></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Descripción</th><th>Tipo</th><th>Cant.</th><th>Precio</th><th></th></tr></thead><tbody>
        ${w.items.map((it, k) => `<tr><td>${escape(it.desc)}</td><td><span class="badge">${escape(KIND[it.kind] || it.kind)}</span></td><td>${it.qty}</td><td>${money(it.qty * it.price)}</td><td><button class="btn btn-sm btn-ghost" data-delitem="${k}" aria-label="Quitar">✕</button></td></tr>`).join('')}
        </tbody></table></div><div class="total-row"><span>Total (IVA incl.)</span><b>${money(woTotal(w))}</b></div></div>
      ${ins ? `<div class="card stack" style="box-shadow:none"><div class="row between"><h4 style="margin:0">Inspección digital</h4><a class="btn btn-sm" href="index.html#/inspeccion/${ins.id}" target="_blank" rel="noopener">Ver como cliente ↗</a></div>${lightSummary(ins)}
        ${pend.length ? `<div class="callout warn small">${pend.length} recomendación(es) esperando al cliente: ${pend.map(p => escape(p.rec.desc)).join(', ')}.</div><div class="row"><button class="btn btn-sm btn-primary" data-phone="all">Registrar aprobación telefónica (todo)</button><button class="btn btn-sm" data-phone="none">Cliente rechazó adicionales</button></div>` : ''}
        <details><summary class="small">Ver detalle de puntos</summary>${batteryBlock(ins.battery)}${inspectionItems(ins)}</details></div>` : ''}
      ${conc ? `<div class="callout small">🚘 Concierge ${escape(conc.kind)} · ${escape(conc.comuna)} · ${escape(conc.date)} ${escape(conc.window || '')} · ${statusBadge(CONC_STATES, conc.status)} · chofer ${escape(userById(conc.driverId)?.name || 'sin asignar')}${w.courtesyCar ? ' · con auto de cortesía' : ''}</div>` : ''}
      <div class="field"><label for="wd-notes">Notas internas</label><textarea class="textarea" id="wd-notes" style="min-height:70px">${escape(w.notes || '')}</textarea></div>
      ${(w.history || []).length ? `<details><summary class="small">Historial (${w.history.length})</summary><ul class="mini-list small" style="margin-top:8px">${w.history.map(h => `<li>${dateTime(h.at)} · <b>${escape(WO_STATES[h.status]?.label || h.status)}</b>${h.by ? ' · ' + escape(userById(h.by)?.name || '') : ''}${h.note ? ` <span class="muted">— ${escape(h.note)}</span>` : ''}</li>`).join('')}</ul></details>` : ''}
      ${(w.timeLogs || []).length ? `<details><summary class="small">Registro de tiempos (${w.timeLogs.length})</summary><ul class="mini-list small" style="margin-top:8px">${w.timeLogs.map(t => `<li>${dateTime(t.at)} · ${escape(userById(t.techId)?.name || '')} · <b>${t.mins} min</b> ${escape(t.note || '')}</li>`).join('')}</ul></details>` : ''}
    </div>`;
  };
  const w0 = db.get('workOrders', id);
  const foot = () => { const w = db.get('workOrders', id), nx = nextOf(w.status); return `${!['entregada', 'cancelada'].includes(w.status) ? '<button class="btn btn-danger btn-sm" data-cancel>Cancelar OT</button>' : ''}<span class="grow"></span><button class="btn btn-sm" data-save>Guardar</button>${nx && w.status !== 'cancelada' ? `<button class="btn btn-primary btn-sm" data-next="${nx}">→ ${escape(WO_STATES[nx].label)}</button>` : ''}`; };
  const m = modal({ title: `${w0.code} · ${w0.title}`, size: 'lg', body: draw(), foot: foot() });
  const repaint = () => { m.el.querySelector('.modal-body').innerHTML = draw(); m.el.querySelector('.modal-foot').innerHTML = foot(); };
  const save = () => { const w = db.get('workOrders', id); db.update('workOrders', id, { techId: m.el.querySelector('#wd-tech').value || null, advisorId: m.el.querySelector('#wd-adv').value, notes: m.el.querySelector('#wd-notes').value }); db.log('ordenes', `${w.code}: datos actualizados`, ctx.user.id); };
  m.el.addEventListener('click', async e => {
    const w = db.get('workOrders', id);
    if (e.target.closest('[data-save]')) { save(); toast('OT guardada', 'success'); repaint(); }
    const n = e.target.closest('[data-next]');
    if (n) {
      if (n.dataset.next === 'aprobacion' && !w.inspectionId) toast('Sin inspección digital: el técnico debe completarla desde su app', 'warning');
      save(); setWoStatus(id, n.dataset.next, ctx.user.id); toast(`${w.code} → ${WO_STATES[n.dataset.next].label}`, 'success'); repaint();
    }
    if (e.target.closest('[data-cancel]') && await confirm(`¿Cancelar ${w.code}?`, { danger: true, ok: 'Cancelar OT' })) { setWoStatus(id, 'cancelada', ctx.user.id); repaint(); }
    const p = e.target.closest('[data-phone]');
    if (p) { const ins = db.get('inspections', w.inspectionId); const choice = {}; if (p.dataset.phone === 'all') ins.items.forEach((it, k) => { if (it.rec && it.ap == null) choice[k] = true; }); approve(ins.id, choice, 'asesor'); repaint(); }
    const d = e.target.closest('[data-delitem]');
    if (d) { db.update('workOrders', id, { items: w.items.filter((_, k) => k !== +d.dataset.delitem) }); repaint(); }
    if (e.target.closest('[data-additem]')) {
      const parts = db.all('parts');
      const v = await formModal({ title: 'Agregar ítem', fields: [{ name: 'src', label: 'Desde inventario (opcional)', type: 'select', options: [['', '— Ítem libre —'], ...parts.map(p => [p.id, `${p.name} · ${p.brand} (${p.stock} en stock) · ${money(p.price)}`])] }, { name: 'desc', label: 'Descripción (si es libre)' }, { name: 'kind', label: 'Tipo', type: 'select', options: Object.entries(KIND) }, { name: 'qty', label: 'Cantidad', type: 'number', value: 1, required: true }, { name: 'price', label: 'Precio unitario (si es libre)', type: 'number', value: 0 }] });
      if (!v) return;
      const part = v.src && db.get('parts', v.src);
      if (!part && !v.desc) { toast('Indica una descripción', 'warning'); return; }
      const item = part ? { desc: `${part.name} (${part.sku})`, kind: 'rep', qty: v.qty || 1, price: part.price, partId: part.id } : { desc: v.desc, kind: v.kind, qty: v.qty || 1, price: v.price || 0 };
      db.update('workOrders', id, { items: [...db.get('workOrders', id).items, item] });
      if (part) db.update('parts', part.id, { stock: Math.max(0, part.stock - item.qty) });
      db.log('ordenes', `${w.code}: ítem agregado «${item.desc}»`, ctx.user.id); toast('Ítem agregado', 'success'); repaint();
    }
  });
}

async function newWO(ctx) {
  const vs = db.all('vehicles').map(v => [v.id, `${vehicleName(v)} · ${v.plate} · ${customerById(v.customerId)?.name || ''}`]);
  const v = await formModal({ title: 'Nueva orden de trabajo', size: 'lg', fields: [
    { name: 'vehicleId', label: 'Vehículo (cliente)', type: 'select', options: vs, required: true },
    { name: 'kind', label: 'Trabajo', type: 'select', options: [['maint', 'Mantención según programa'], ...db.query('services', s => s.active).map(s => [s.id, `${lineOf(s.line).short} · ${s.name} (${money(s.price)})`])] },
    { name: 'km', label: 'Kilometraje de ingreso (km)', type: 'number' }, { name: 'date', label: 'Fecha', type: 'date', value: new Date().toISOString().slice(0, 10), required: true },
    { name: 'techId', label: 'Técnico', type: 'select', options: [['', 'Sin asignar'], ...techs().map(t => [t.id, t.name])] }, { name: 'notes', label: 'Notas', type: 'textarea' }] });
  if (!v) return;
  const veh = db.get('vehicles', v.vehicleId), km = v.km || veh.km;
  let items, title, line, hours, serviceIds = [];
  if (v.kind === 'maint') { const [s] = nextServices({ ...veh, km }, 1); if (!s) { toast('La marca no tiene programa activo', 'warning'); return; } title = `${s.level.name} ${kmFmt(s.km)}`; line = 'mantencion'; hours = s.hours; items = [{ desc: `${title} · mano de obra`, kind: 'mo', qty: 1, price: Math.round(s.price * .45 / 1000) * 1000 }, { desc: 'Repuestos y lubricantes originales', kind: 'rep', qty: 1, price: s.price - Math.round(s.price * .45 / 1000) * 1000 }]; }
  else { const s = db.get('services', v.kind); title = s.name; line = s.line; hours = s.hours; serviceIds = [s.id]; items = [{ desc: s.name, kind: 'mo', qty: 1, price: s.price }]; }
  const w = db.insert('workOrders', { code: nextCode(), customerId: veh.customerId, vehicleId: veh.id, line, title, serviceIds, status: 'agendada', advisorId: ctx.user.id, techId: v.techId || null, scheduledAt: new Date(v.date + 'T09:00:00').toISOString(), km, items, laborHours: hours, loggedMins: 0, notes: v.notes, source: 'panel', history: [{ status: 'agendada', at: new Date().toISOString(), by: ctx.user.id }] });
  db.log('ordenes', `OT creada ${w.code}: ${title} · ${vehicleName(veh)}`, ctx.user.id);
  toast(`OT ${w.code} creada`, 'success');
  woDetail(w.id, ctx);
}

export default {
  id: 'ordenes', label: 'Órdenes de trabajo', icon: '🧾', group: 'Taller', roles: ['admin', 'gerente', 'asesor'],
  watch: ['workOrders', 'inspections', 'concierge'],
  render(el, ctx) {
    const view = ctx.params.sub || 'lista';
    el.innerHTML = `${pageHead('Órdenes de trabajo', 'Recepción, inspección, aprobaciones del cliente y entrega', '<button class="btn btn-primary btn-sm" data-new>+ Nueva OT</button>')}
      <div class="tabs"><a class="tab ${view === 'lista' ? 'active' : ''}" href="#/ordenes/lista">Lista</a><a class="tab ${view === 'tablero' ? 'active' : ''}" href="#/ordenes/tablero">Tablero</a><a class="tab ${view === 'aprobaciones' ? 'active' : ''}" href="#/ordenes/aprobaciones">Aprobaciones <span class="badge">${db.count('workOrders', w => w.status === 'aprobacion')}</span></a></div><div data-body></div>`;
    el.addEventListener('click', e => { if (e.target.closest('[data-new]')) newWO(ctx); const k = e.target.closest('[data-wo]'); if (k) woDetail(k.dataset.wo, ctx); });
    const body = el.querySelector('[data-body]');
    if (view === 'tablero') {
      const open = db.query('workOrders', w => !['entregada', 'cancelada'].includes(w.status));
      body.innerHTML = `<div class="kanban">${WO_FLOW.slice(0, 7).map(s => { const l = open.filter(w => w.status === s); return `<div class="kcol"><h4>${escape(WO_STATES[s].label)} <span class="badge">${l.length}</span></h4>${l.map(w => { const v = vehicleById(w.vehicleId); return `<button class="kcard" data-wo="${w.id}"><b class="mono">${w.code}</b> ${lineOf(w.line).icon}<br>${escape(vehicleName(v))}<br><small class="muted">${escape(userById(w.techId)?.name || 'Sin técnico')} · ${money(woTotal(w))}</small></button>`; }).join('') || '<small class="muted">—</small>'}</div>`; }).join('')}</div>`;
      return;
    }
    if (view === 'aprobaciones') {
      const list = db.query('workOrders', w => w.status === 'aprobacion');
      body.innerHTML = list.length ? `<div class="grid-auto">${list.map(w => { const ins = db.get('inspections', w.inspectionId), s = inspectionStats(ins), p = pendingApprovals(ins); return `<div class="card stack"><div class="row between"><b class="mono">${w.code}</b><span class="badge badge-warning">${p.length} por aprobar</span></div><span>${escape(vehicleName(vehicleById(w.vehicleId)))}<small class="muted d-block">${escape(customerById(w.customerId)?.name || '')} · ${escape(customerById(w.customerId)?.phone || '')}</small></span>
        <div class="row" style="gap:6px"><span class="badge badge-success">${s.ok} bien</span><span class="badge badge-warning">${s.atencion} atención</span><span class="badge badge-danger">${s.urgente} acción</span></div><small>${money(p.reduce((a, i) => a + i.rec.price, 0))} en adicionales sugeridos</small><button class="btn btn-sm btn-primary" data-wo="${w.id}">Gestionar</button></div>`; }).join('')}</div>` : '<div class="card empty">No hay inspecciones esperando aprobación.</div>';
      return;
    }
    return smartTable(body, {
      rows: () => db.all('workOrders').map(w => { const v = vehicleById(w.vehicleId); return { ...w, vehicle: vehicleName(v), plate: v?.plate || '', customer: customerById(w.customerId)?.name || '', tech: userById(w.techId)?.name || '', total: woTotal(w), when: w.scheduledAt || w.createdAt }; }).sort((a, b) => b.when.localeCompare(a.when)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(WO_STATES).map(([k, s]) => [k, s.label]), value: ctx.query.status || '' }, { key: 'line', label: 'Línea', options: Object.entries(LINES).map(([k, l]) => [k, l.short]) }, { key: 'techId', label: 'Técnico', options: techs().map(t => [t.id, t.name]) },
        { key: 'open', label: 'Abiertas', options: [['1', 'Solo abiertas']], test: r => !['entregada', 'cancelada'].includes(r.status) }],
      search: r => `${r.code} ${r.vehicle} ${r.plate} ${r.customer} ${r.title}`,
      columns: [
        { key: 'code', label: 'OT', render: r => `<b class="mono">${r.code}</b>` },
        { key: 'when', label: 'Fecha', render: r => date(r.when) },
        { key: 'vehicle', label: 'Vehículo', render: r => `${escape(r.vehicle)}<small class="muted d-block mono">${escape(r.plate)}</small>` },
        { key: 'customer', label: 'Cliente' },
        { key: 'title', label: 'Trabajo', render: r => `${lineOf(r.line).icon} ${escape(r.title)}` },
        { key: 'tech', label: 'Técnico' },
        { key: 'status', label: 'Estado', render: r => statusBadge(WO_STATES, r.status) },
        { key: 'total', label: 'Total', render: r => money(r.total) }
      ],
      onRow: r => woDetail(r.id, ctx),
      csv: { name: 'ordenes', map: r => ({ ot: r.code, fecha: r.when.slice(0, 10), vehiculo: r.vehicle, patente: r.plate, cliente: r.customer, trabajo: r.title, linea: lineOf(r.line).short, tecnico: r.tech, estado: WO_STATES[r.status]?.label, total: r.total, nps: r.nps ?? '' }) }
    });
  }
};
