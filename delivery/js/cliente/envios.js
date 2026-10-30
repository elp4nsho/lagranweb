// Historial de envíos del cliente + detalle con mapa, línea de tiempo, POD, calificación y acciones.
import { db } from '../data/db.js';
import { html, raw, money, dateTime, date, toast, confirm, downloadCSV, formModal } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead } from '../shared/shell.js';
import { STATUS, SERVICE_LABEL, INCIDENT_TYPES, statusLabel } from '../shared/status.js';
import { statusBadge, timelineHtml, podHtml, detailsHtml, courierCard, progressHtml, etaText, openChat, ratingForm, stars } from '../shared/views.js';
import { createMap } from '../shared/map.js';
import { shipmentLines, courierPos, hasLeg, ACTIVE_ST } from '../shared/sim.js';
import * as ops from '../shared/ops.js';

const FILTERS = [['todos', 'Todos'], ['activos', 'En curso'], ['entregado', 'Entregados'], ['problemas', 'Fallidos / cancelados']];

export function mountEnvios(el, ctx, q = {}) {
  let f = q.f || 'todos';
  el.innerHTML = html`${raw(pageHead('Mis envíos', 'Historial completo con estados en vivo.', '<button class="btn" data-csv>⇩ Exportar CSV</button><a class="btn btn-primary" href="#/nuevo">＋ Nuevo</a>'))}
    <div class="chips" data-chips>${FILTERS.map(([k, l]) => raw(html`<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}</button>`))}</div><div data-table></div>`;
  const rows = () => db.query('shipments', s => s.customerId === ctx.customer().id)
    .filter(s => f === 'todos' || (f === 'activos' ? ACTIVE_ST.includes(s.status) : f === 'problemas' ? ['fallido', 'cancelado'].includes(s.status) : s.status === f))
    .map(s => ({ ...s, dest: s.receiver.name, comuna: s.receiver.comuna, late: ops.isLate(s) }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const table = dataTable(el.querySelector('[data-table]'), {
    rows: rows(), pageSize: 12, search: s => `${s.code} ${s.dest} ${s.comuna} ${s.sender.comuna} ${s.batch || ''} ${statusLabel(s.status)}`,
    onRow: s => ctx.go('/envios/' + s.id),
    columns: [
      { key: 'code', label: 'Código', render: s => html`<b class="mono">${s.code}</b>${s.batch ? raw(html`<br><small class="muted">${s.batch}</small>`) : ''}` },
      { key: 'createdAt', label: 'Fecha', render: s => date(s.createdAt) },
      { key: 'dest', label: 'Destinatario', render: s => html`${s.dest}<br><small class="muted">${s.sender.comuna} → ${s.comuna}</small>` },
      { key: 'service', label: 'Servicio', render: s => SERVICE_LABEL[s.service] },
      { key: 'price', label: 'Total', render: s => money(s.price + (s.tip || 0)) },
      { key: 'status', label: 'Estado', render: s => raw(statusBadge(s.status, s.late)) }
    ]
  });
  if (q.q) { const i = el.querySelector('[data-q]'); i.value = q.q; i.dispatchEvent(new Event('input')); }
  el.querySelector('[data-chips]').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b)); table.update(rows()); };
  el.querySelector('[data-csv]').onclick = () => downloadCSV('mis-envios-rayo.csv', rows().map(s => ({ codigo: s.code, fecha: dateTime(s.createdAt), origen: s.sender.comuna, destino: s.comuna, destinatario: s.dest, servicio: SERVICE_LABEL[s.service], estado: statusLabel(s.status), total: s.price + (s.tip || 0) })));
  return { refresh: () => table.update(rows()) };
}

export function mountEnvio(el, ctx, id) {
  let map = null, key = '';
  const get = () => ops.withGeo(db.get('shipments', id));
  const s0 = get();
  if (!s0 || s0.customerId !== ctx.customer().id) { el.innerHTML = '<div class="card empty"><span class="icon">📦</span>Envío no encontrado. <a href="#/envios">Volver</a></div>'; return {}; }
  function draw() {
    const s = get(); if (!s) return;
    const k = [s.status, s.courierId, !!s.pod, !!s.rating, (s.chat || []).length].join('|');
    if (k === key) return;
    key = k;
    map?.destroy(); map = null;
    const c = ops.courierOf(s);
    const active = ACTIVE_ST.includes(s.status);
    const canCancel = ['pendiente', 'asignado'].includes(s.status);
    el.innerHTML = html`<div class="page-head"><div><a class="small" href="#/envios">← Mis envíos</a><h1 class="mono">${s.code}</h1><div class="row" style="gap:6px">${raw(statusBadge(s.status, ops.isLate(s)))}<span class="muted small">Creado ${dateTime(s.createdAt)}</span></div></div>
      <div class="row"><a class="btn" href="index.html#/rastrear/${s.code}" target="_blank" rel="noopener">Seguimiento público ↗</a>${c ? raw('<button class="btn" data-chat>Chat</button>') : ''}<a class="btn" href="#/nuevo?repeat=${s.id}">Repetir envío</a>${canCancel ? raw('<button class="btn btn-danger" data-cancel>Cancelar</button>') : ''}</div></div>
      <div class="detail-grid">
        <div class="stack">
          ${s.route ? raw('<div class="card map-card"><div class="mini-map" style="height:320px;border:0"></div></div>') : ''}
          ${active ? raw(html`<div class="card stack"><b data-eta>${etaText(s)}</b><div data-prog>${raw(progressHtml(s))}</div></div>`) : ''}
          <div class="card"><b>Estado</b>${raw(timelineHtml(s))}</div>
        </div>
        <div class="stack">
          <div class="card">${raw(courierCard(c))}</div>
          ${s.pod ? raw(`<div class="card">${podHtml(s)}</div>`) : ''}
          ${s.status === 'entregado' && !s.rating ? raw('<div class="card" data-rate></div>') : ''}
          ${s.rating ? raw(html`<div class="card"><b>Tu calificación</b><div>${stars(s.rating.stars)}</div>${s.rating.comment ? raw(html`<p class="muted small">"${s.rating.comment}"</p>`) : ''}</div>`) : ''}
          <div class="card"><b>Detalle</b>${raw(detailsHtml(s))}<dl class="kv"><dt>Pago</dt><dd>${s.paid ? 'Pagado' : s.invoice ? 'En factura ' + s.invoice : 'Se incluirá en la factura del mes'}</dd><dt>Canal</dt><dd>${s.channel}${s.batch ? ' · lote ' + s.batch : ''}</dd></dl></div>
          <button class="btn btn-ghost" data-claim>Reportar un problema</button>
        </div>
      </div>`;
    if (s.route) {
      map = createMap(el.querySelector('.mini-map'), { label: 'Ruta del envío' });
      map.fit(s.route.concat(hasLeg(s) && s.status === 'asignado' ? s.plan.pre : []));
      tick();
    }
    el.querySelector('[data-chat]')?.addEventListener('click', () => openChat(id, 'cliente'));
    const rt = el.querySelector('[data-rate]'); if (rt) rt.appendChild(ratingForm(s));
    el.querySelector('[data-cancel]')?.addEventListener('click', async () => {
      if (!(await confirm(`¿Cancelar el envío ${s.code}? ${s.paid ? 'Te devolvemos el 100% a tu tarjeta.' : ''}`, { title: 'Cancelar envío', ok: 'Sí, cancelar', danger: true }))) return;
      ops.cancel(get(), 'Cancelado por el cliente', ctx.user.id);
      db.log('envío cancelado', `${s.code} cancelado por ${ctx.user.name}`, ctx.user.id);
      toast('Envío cancelado', 'success');
    });
    el.querySelector('[data-claim]').onclick = () => newClaim(ctx, s);
  }
  function tick() {
    const s = get(); if (!s || !map) return;
    const t = ops.simNow(), c = ops.courierOf(s);
    const marks = [{ id: 'a', kind: 'pickup', pos: s.pickup, title: 'Retiro' }, { id: 'b', kind: 'drop', pos: s.drop, title: 'Entrega' }];
    if (c && ACTIVE_ST.includes(s.status)) marks.push({ id: 'c', kind: 'courier', pos: hasLeg(s) ? courierPos(c, [s], t) : ops.posOf(c), state: 'busy', title: c.name });
    map.setMarkers(marks); map.setLines(shipmentLines(s, t));
    const e = el.querySelector('[data-eta]'); if (e) e.textContent = etaText(s);
    const p = el.querySelector('[data-prog]'); if (p) p.innerHTML = progressHtml(s);
  }
  draw();
  return { refresh: draw, tick, destroy() { map?.destroy(); } };
}

export async function newClaim(ctx, s) {
  const mine = db.query('shipments', x => x.customerId === ctx.customer().id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 40);
  const v = await formModal({ title: 'Nuevo reclamo', fields: [
    { name: 'code', label: 'Envío', type: 'select', options: mine.map(x => [x.code, `${x.code} · ${x.receiver.name} · ${statusLabel(x.status)}`]), value: s?.code },
    { name: 'type', label: 'Motivo', type: 'select', options: Object.entries(INCIDENT_TYPES), value: 'retraso' },
    { name: 'description', label: 'Descripción', type: 'textarea', required: true }], submit: 'Enviar reclamo' });
  if (!v) return null;
  const sh = ops.findByCode(v.code);
  const n = 'INC-' + (1100 + db.count('incidents'));
  const inc = db.insert('incidents', { number: n, shipmentCode: v.code, customerId: ctx.customer().id, courierId: sh?.courierId || null, type: v.type, priority: ['dano', 'extravio'].includes(v.type) ? 'alta' : 'media', status: 'abierto', description: v.description, assigneeId: null, compensation: 0, notes: [] });
  db.log('reclamo creado', `${n} por ${ctx.customer().name} (${v.code})`, ctx.user.id);
  ops.feed(`Nuevo reclamo ${n} de ${ctx.customer().name}`, 'warning');
  toast(`Reclamo ${n} enviado`, 'success');
  return inc;
}
