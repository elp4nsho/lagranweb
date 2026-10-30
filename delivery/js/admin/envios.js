// Tabla de envíos con filtros (estado, servicio, comuna, repartidor, fecha), SLA y exportación.
import { db } from '../data/db.js';
import { html, raw, money, dateTime, time, downloadCSV, escape } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead } from '../shared/shell.js';
import { STATUS, SERVICE_LABEL, statusLabel } from '../shared/status.js';
import { statusBadge } from '../shared/views.js';
import { COMUNAS } from '../data/geo.js';
import { ACTIVE_ST, fmtEta } from '../shared/sim.js';
import { newShipmentModal } from './shipment.js';
import * as ops from '../shared/ops.js';
import { dayStart, DAY } from './stats.js';

const CHIPS = [['todos', 'Todos'], ['pendiente', 'Pendientes'], ['curso', 'En curso'], ['atrasados', '⏰ Atrasados'], ['entregado', 'Entregados'], ['fallido', 'Fallidos'], ['cancelado', 'Cancelados']];

export function mountEnvios(el, ctx, _p, q = {}) {
  const st = { f: q.f || 'todos', service: '', comuna: '', courier: q.courier || '', customer: q.customer || '', range: q.f === 'atrasados' || q.f === 'curso' ? 'todo' : '30' };
  const couriers = db.all('couriers').sort((a, b) => a.name.localeCompare(b.name));
  el.innerHTML = html`${raw(pageHead('Envíos', 'Todos los envíos de la operación, con estado y SLA en vivo.', `<button class="btn" data-csv>⇩ CSV</button>${ctx.can('envios.create') ? '<button class="btn btn-primary" data-new>＋ Nuevo envío</button>' : ''}`))}
    <div class="chips" data-chips>${CHIPS.map(([k, l]) => raw(html`<button class="chip ${k === st.f ? 'active' : ''}" data-f="${k}">${l} <span data-c="${k}"></span></button>`))}</div>
    <div class="filters card" style="padding:12px">
      <select class="select" data-k="range" aria-label="Rango de fechas"><option value="1">Hoy</option><option value="7">7 días</option><option value="30" selected>30 días</option><option value="todo">Todo</option></select>
      <select class="select" data-k="service" aria-label="Servicio"><option value="">Todos los servicios</option>${Object.entries(SERVICE_LABEL).map(([k, v]) => raw(html`<option value="${k}">${v}</option>`))}</select>
      <select class="select" data-k="comuna" aria-label="Comuna"><option value="">Todas las comunas</option>${COMUNAS.map(c => c.n).sort((a, b) => a.localeCompare(b, 'es')).map(c => raw(html`<option>${c}</option>`))}</select>
      <select class="select" data-k="courier" aria-label="Repartidor"><option value="">Todos los repartidores</option>${couriers.map(c => raw(html`<option value="${c.id}">${c.name}</option>`))}</select>
      <button class="btn btn-sm btn-ghost" data-clear>Limpiar filtros</button>
    </div><div data-t></div>`;
  el.querySelectorAll('[data-k]').forEach(s => { s.value = st[s.dataset.k]; s.onchange = () => { st[s.dataset.k] = s.value; table.update(rows()); counts(); }; });
  const base = () => {
    const t = ops.simNow(), from = st.range === 'todo' ? 0 : dayStart(t) - (Number(st.range) - 1) * DAY;
    return db.all('shipments').filter(s => (Date.parse(s.createdAt) >= from || ACTIVE_ST.includes(s.status) && st.range !== '1')
      && (!st.service || s.service === st.service) && (!st.comuna || s.sender.comuna === st.comuna || s.receiver.comuna === st.comuna)
      && (!st.courier || s.courierId === st.courier) && (!st.customer || s.customerId === st.customer));
  };
  const match = (s, f) => f === 'todos' || (f === 'curso' ? ['asignado', 'retirado', 'en_camino'].includes(s.status) : f === 'atrasados' ? ops.isLate(s) : s.status === f);
  const custs = Object.fromEntries(db.all('customers').map(c => [c.id, c.name]));
  const cour = Object.fromEntries(couriers.map(c => [c.id, c.name]));
  const rows = () => base().filter(s => match(s, st.f)).map(s => ({ ...s, late: ops.isLate(s), cust: custs[s.customerId] || 'Ocasional', cour: cour[s.courierId] || '—', route: `${s.sender.comuna} → ${s.receiver.comuna}`, total: s.price + (s.tip || 0) }))
    .sort((a, b) => (b.late - a.late) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const counts = () => { const b = base(); CHIPS.forEach(([k]) => { const n = el.querySelector(`[data-c="${k}"]`); if (n) n.textContent = b.filter(s => match(s, k)).length; }); };
  const t0 = () => ops.simNow();
  const table = dataTable(el.querySelector('[data-t]'), {
    rows: rows(), pageSize: 15, search: s => `${s.code} ${s.cust} ${s.cour} ${s.route} ${s.receiver.name} ${s.sender.name} ${s.batch || ''}`,
    onRow: s => ctx.open(s.id),
    columns: [
      { key: 'code', label: 'Código', render: s => html`<b class="mono">${s.code}</b><br><small class="muted">${dateTime(s.createdAt)}</small>` },
      { key: 'cust', label: 'Cliente', render: s => html`${s.cust}<br><small class="muted">${s.channel}</small>` },
      { key: 'route', label: 'Ruta', render: s => html`${s.route}<br><small class="muted">${SERVICE_LABEL[s.service]} · ${s.size}</small>` },
      { key: 'cour', label: 'Repartidor' },
      { key: 'slaAt', label: 'SLA', render: s => { if (!ACTIVE_ST.includes(s.status)) return s.deliveredAt ? (Date.parse(s.deliveredAt) <= Date.parse(s.slaAt) ? raw('<span class="badge badge-success plain">A tiempo</span>') : raw('<span class="badge badge-warning plain">Tarde</span>')) : '—'; const d = Date.parse(s.slaAt) - t0(); return d < 0 ? raw(html`<span class="text-danger">+${fmtEta(-d)}</span>`) : html`${time(s.slaAt)}`; } },
      { key: 'total', label: 'Total', render: s => money(s.total) },
      { key: 'status', label: 'Estado', render: s => raw(statusBadge(s.status, s.late)) }
    ]
  });
  if (q.q) { const i = el.querySelector('[data-q]'); i.value = q.q; i.dispatchEvent(new Event('input')); }
  el.querySelector('[data-chips]').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; st.f = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b)); if (st.f === 'atrasados') { st.range = 'todo'; el.querySelector('[data-k="range"]').value = 'todo'; } table.update(rows()); counts(); };
  el.querySelector('[data-clear]').onclick = () => { Object.assign(st, { service: '', comuna: '', courier: '', customer: '', range: '30' }); el.querySelectorAll('[data-k]').forEach(s => { s.value = st[s.dataset.k]; }); table.update(rows()); counts(); };
  el.querySelector('[data-new]')?.addEventListener('click', () => newShipmentModal(ctx));
  el.querySelector('[data-csv]').onclick = () => { downloadCSV(`envios-rayo-${new Date().toISOString().slice(0, 10)}.csv`, rows().map(s => ({ codigo: s.code, creado: dateTime(s.createdAt), cliente: s.cust, origen: s.sender.comuna, destino: s.receiver.comuna, servicio: SERVICE_LABEL[s.service], tamano: s.size, km: s.km, repartidor: s.cour, estado: statusLabel(s.status), atrasado: s.late ? 'sí' : 'no', precio: s.price, propina: s.tip || 0 }))); db.log('exportación', 'CSV de envíos', ctx.user.id); };
  counts();
  let last = 0, timer;
  return { refresh() { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); table.update(rows()); counts(); }, Math.max(0, 2000 - (Date.now() - last))); }, destroy() { clearTimeout(timer); } };
}
