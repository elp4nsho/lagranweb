// Gestión de repartidores: flota, vehículos, documentos, zonas, calificaciones y estado.
import { db } from '../data/db.js';
import { html, raw, money, modal, formModal, confirm, toast, date, barChart, downloadCSV } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead, kpi } from '../shared/shell.js';
import { VEHICLES, VEHICLE_ICON, DOC_STATUS, badgeOf } from '../shared/status.js';
import { avatar, stars } from '../shared/views.js';
import { series, inRange } from './stats.js';
import * as ops from '../shared/ops.js';

const docIssue = c => c.docs.some(d => d.status !== 'aprobado' || (d.expires && Date.parse(d.expires) < Date.now() + 15 * 864e5));
const CHIPS = [['todos', 'Todos'], ['online', 'En línea'], ['busy', 'En ruta'], ['docs', 'Documentos por revisar'], ['susp', 'Suspendidos']];

export function courierFields(c = {}) {
  return [
    { name: 'name', label: 'Nombre completo', required: true, value: c.name },
    { name: 'email', label: 'Correo (usuario de la app)', type: 'email', required: true, value: c.email },
    { name: 'phone', label: 'Teléfono', required: true, value: c.phone },
    { name: 'vehicle', label: 'Vehículo', type: 'select', options: Object.entries(VEHICLES), value: c.vehicle || 'moto' },
    { name: 'model', label: 'Modelo', required: true, value: c.model },
    { name: 'plate', label: 'Patente', required: true, value: c.plate },
    { name: 'zA', label: 'Zona A · Centro-Oriente', type: 'checkbox', value: c.zones ? c.zones.includes('A') : true },
    { name: 'zB', label: 'Zona B · Anillo intermedio', type: 'checkbox', value: c.zones ? c.zones.includes('B') : false },
    { name: 'zC', label: 'Zona C · Periferia', type: 'checkbox', value: c.zones ? c.zones.includes('C') : false },
    { name: 'status', label: 'Estado de la cuenta', type: 'select', options: [['activo', 'Activo'], ['suspendido', 'Suspendido']], value: c.status || 'activo' }
  ];
}

export function mountRepartidores(el, ctx) {
  let f = 'todos';
  el.innerHTML = html`${raw(pageHead('Repartidores', 'Flota, documentos y desempeño.', `<button class="btn" data-csv>⇩ CSV</button>${ctx.can('couriers.edit') ? '<button class="btn btn-primary" data-new>＋ Nuevo repartidor</button>' : ''}`))}
    <div class="kpis" data-kpis></div>
    <div class="chips" data-chips>${CHIPS.map(([k, l]) => raw(html`<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}</button>`))}</div><div data-t></div>`;
  const all = () => db.all('couriers').map(c => { const q = ops.courierQueue(c.id); return { ...c, load: q.length, issue: docIssue(c), email: db.get('users', c.userId)?.email || '' }; });
  const rows = () => all().filter(c => f === 'todos' || (f === 'online' ? c.online && c.status === 'activo' : f === 'busy' ? c.load : f === 'docs' ? c.issue : c.status === 'suspendido'));
  const kpis = () => {
    const a = all();
    el.querySelector('[data-kpis]').innerHTML = kpi('Flota activa', a.filter(c => c.status === 'activo').length) + kpi('En línea', a.filter(c => c.online && c.status === 'activo').length) + kpi('En ruta', a.filter(c => c.load).length) + kpi('Calificación promedio', (a.reduce((s, c) => s + c.rating, 0) / a.length).toFixed(2).replace('.', ',') + ' ★') + kpi('Docs por revisar', a.filter(c => c.issue).length);
  };
  const table = dataTable(el.querySelector('[data-t]'), {
    rows: rows(), pageSize: 15, search: c => `${c.name} ${c.plate} ${c.model} ${VEHICLES[c.vehicle]} ${c.base}`, onRow: c => openCourier(c.id, ctx),
    columns: [
      { key: 'name', label: 'Repartidor', render: c => raw(html`<span class="row" style="gap:10px;flex-wrap:nowrap">${avatar(c.name, c.color, 32)}<span><b>${c.name}</b><br><small class="muted">${c.phone}</small></span></span>`) },
      { key: 'vehicle', label: 'Vehículo', render: c => html`${VEHICLE_ICON[c.vehicle]} ${VEHICLES[c.vehicle]}<br><small class="muted">${c.model} · ${c.plate}</small>` },
      { key: 'zones', label: 'Zonas', render: c => raw(c.zones.map(z => `<span class="badge zone-${z}">${z}</span>`).join(' ')) },
      { key: 'online', label: 'Estado', render: c => raw(c.status !== 'activo' ? '<span class="badge badge-danger">Suspendido</span>' : !c.online ? '<span class="badge">Offline</span>' : c.load ? `<span class="badge badge-info">En ruta (${c.load})</span>` : '<span class="badge badge-success">Libre</span>') },
      { key: 'rating', label: 'Calificación', render: c => raw(html`${stars(c.rating)} <small>${String(c.rating).replace('.', ',')}</small>`) },
      { key: 'trips', label: 'Viajes' },
      { key: 'issue', label: 'Documentos', render: c => raw(c.issue ? '<span class="badge badge-warning">Revisar</span>' : '<span class="badge badge-success">Al día</span>') }
    ]
  });
  el.querySelector('[data-chips]').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b)); table.update(rows()); };
  el.querySelector('[data-new]')?.addEventListener('click', () => editCourier(null, ctx));
  el.querySelector('[data-csv]').onclick = () => downloadCSV('repartidores-rayo.csv', all().map(c => ({ nombre: c.name, telefono: c.phone, vehiculo: VEHICLES[c.vehicle], patente: c.plate, zonas: c.zones.join('/'), estado: c.status, en_linea: c.online ? 'sí' : 'no', calificacion: c.rating, viajes: c.trips })));
  kpis();
  let sig = '';
  return { refresh() { const n = JSON.stringify(all().map(c => [c.id, c.online, c.load, c.status, c.rating, c.issue, c.name, c.vehicle])); if (n === sig) return; sig = n; table.update(rows()); kpis(); } };
}

export async function editCourier(c, ctx) {
  const u = c ? db.get('users', c.userId) : null;
  const v = await formModal({ title: c ? `Editar ${c.name}` : 'Nuevo repartidor', fields: courierFields(c ? { ...c, email: u?.email } : {}), submit: c ? 'Guardar' : 'Crear repartidor' });
  if (!v) return;
  const zones = ['A', 'B', 'C'].filter(z => v['z' + z]);
  if (!zones.length) { toast('Selecciona al menos una zona', 'warning'); return; }
  const data = { name: v.name, phone: v.phone, vehicle: v.vehicle, model: v.model, plate: v.plate.toUpperCase(), zones, status: v.status };
  if (c) {
    db.update('couriers', c.id, { ...data, online: v.status === 'activo' ? c.online : false });
    if (u) db.update('users', u.id, { name: v.name, email: v.email, phone: v.phone, active: v.status === 'activo' });
    db.log('repartidor', `Editado ${v.name}`, ctx.user.id);
    toast('Repartidor actualizado', 'success');
  } else {
    if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase())) { toast('Ese correo ya existe', 'error'); return; }
    const id = 'c' + Date.now().toString(36);
    const nu = db.insert('users', { name: v.name, email: v.email, password: 'demo123', role: 'repartidor', courierId: id, color: '#0891b2', active: true, phone: v.phone });
    db.insert('couriers', { id, userId: nu.id, ...data, color: '#0891b2', online: false, rating: 5, ratings: 0, trips: 0, joinedAt: new Date().toISOString(), pos: [-33.43, -70.62], phase: Math.random() * 6, base: 'Providencia',
      docs: [{ name: 'Licencia de conducir', status: 'pendiente', expires: null }, { name: 'Cédula de identidad', status: 'pendiente', expires: null }, { name: 'Certificado de antecedentes', status: 'pendiente', expires: null }] });
    db.log('repartidor', `Alta de ${v.name} (clave inicial demo123)`, ctx.user.id);
    toast(`Repartidor creado. Puede entrar con ${v.email} / demo123`, 'success');
  }
}

export function openCourier(id, ctx) {
  const m = modal({ title: 'Repartidor', size: 'lg', body: '<div data-b></div>', onClose: () => unsub() });
  const box = m.el.querySelector('[data-b]');
  const draw = () => {
    const c = db.get('couriers', id); if (!c) { m.close(); return; }
    const all = db.query('shipments', s => s.courierId === id);
    const delivered = all.filter(s => s.status === 'entregado');
    const ot = delivered.length ? delivered.filter(s => Date.parse(s.deliveredAt) <= Date.parse(s.slaAt)).length / delivered.length * 100 : 100;
    const d14 = series(14, (a, b) => inRange(delivered, 'deliveredAt', a, b).length);
    const comments = delivered.filter(s => s.rating?.comment).sort((a, b) => Date.parse(b.rating.at) - Date.parse(a.rating.at)).slice(0, 4);
    const q = ops.courierQueue(id);
    const edit = ctx.can('couriers.edit');
    box.innerHTML = html`<div class="stack">
      <div class="row" style="flex-wrap:nowrap">${avatar(c.name, c.color, 56)}<div class="grow"><h3 style="margin:0">${c.name}</h3><small class="muted">${VEHICLE_ICON[c.vehicle]} ${c.model} · ${c.plate} · ${c.phone}${ops.isControlled(c.id) ? ' · 📱 usando la app' : ''}</small><div>${stars(c.rating)} ${String(c.rating).replace('.', ',')} (${c.ratings} calificaciones)</div></div>
        ${edit ? raw(html`<div class="row" style="gap:6px"><button class="btn btn-sm" data-a="edit">Editar</button>${c.status === 'activo' ? raw(html`<button class="btn btn-sm" data-a="online">${c.online ? 'Desconectar' : 'Conectar'}</button><button class="btn btn-sm btn-danger" data-a="suspend">Suspender</button>`) : raw('<button class="btn btn-sm btn-primary" data-a="activate">Reactivar</button>')}${ctx.can('couriers.delete') ? raw('<button class="btn btn-sm btn-ghost" data-a="delete" aria-label="Eliminar">🗑</button>') : ''}</div>`) : ''}</div>
      <div class="kpis">${raw(kpi('Entregas', delivered.length))}${raw(kpi('A tiempo', ot.toFixed(0) + '%'))}${raw(kpi('Fallidos', all.filter(s => s.status === 'fallido').length))}${raw(kpi('Generado', money(delivered.reduce((a, s) => a + s.price, 0))))}</div>
      <div class="detail-grid">
        <div class="stack"><div><b>Entregas · 14 días</b>${raw(barChart(d14, { height: 120 }))}</div>
          <div><b>Ahora</b><p class="muted" style="margin:4px 0">${c.status !== 'activo' ? 'Cuenta suspendida' : !c.online ? 'Desconectado' : q.length ? q.map(s => s.code + ' (' + s.status + ')').join(', ') : 'En línea, libre'}</p></div>
          <div><b>Zonas</b><div class="row" style="gap:6px">${c.zones.map(z => raw(`<span class="badge zone-${z}">${ops.pricing().zones[z]?.name}</span>`))}</div></div></div>
        <div class="stack"><b>Documentos</b><div class="list">${c.docs.map((d, i) => raw(html`<div class="list-item"><span class="grow"><b>${d.name}</b><small class="muted">${d.expires ? 'Vence ' + date(d.expires) : 'Sin fecha'}${d.expires && Date.parse(d.expires) < Date.now() ? ' · VENCIDO' : ''}</small></span>${raw(badgeOf(DOC_STATUS, d.expires && Date.parse(d.expires) < Date.now() && d.status === 'aprobado' ? 'vencido' : d.status))}${ctx.can('couriers.docs') && d.status !== 'aprobado' ? raw(html`<button class="btn btn-sm btn-primary" data-doc="${i}" data-v="aprobado">Aprobar</button><button class="btn btn-sm" data-doc="${i}" data-v="rechazado">Rechazar</button>`) : ''}</div>`))}</div>
          <b>Comentarios recientes</b>${comments.length ? comments.map(s => raw(html`<div class="small"><span class="stars">${'★'.repeat(s.rating.stars)}</span> "${s.rating.comment}" <span class="muted">· ${date(s.rating.at)}</span></div>`)) : raw('<span class="muted small">Sin comentarios</span>')}</div>
      </div></div>`;
  };
  box.addEventListener('click', async e => {
    const c = db.get('couriers', id);
    const d = e.target.closest('[data-doc]');
    if (d) {
      const docs = c.docs.map((x, i) => i === +d.dataset.doc ? { ...x, status: d.dataset.v, expires: d.dataset.v === 'aprobado' && (!x.expires || Date.parse(x.expires) < Date.now()) ? new Date(Date.now() + 365 * 864e5).toISOString() : x.expires } : x);
      db.update('couriers', id, { docs });
      db.log('documento', `${c.docs[+d.dataset.doc].name} de ${c.name}: ${d.dataset.v}`, ctx.user.id);
      toast(`Documento ${d.dataset.v}`, 'success'); return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'edit') { m.close(); editCourier(c, ctx); }
    if (a === 'online') { db.update('couriers', id, { online: !c.online }); db.log('repartidor', `${c.name} ${c.online ? 'desconectado' : 'conectado'} por despacho`, ctx.user.id); }
    if (a === 'suspend' && await confirm(`¿Suspender a ${c.name}? No recibirá ofertas.`, { danger: true, ok: 'Suspender' })) { db.update('couriers', id, { status: 'suspendido', online: false }); db.update('users', c.userId, { active: false }); db.log('repartidor', `${c.name} suspendido`, ctx.user.id); toast('Repartidor suspendido', 'success'); }
    if (a === 'activate') { db.update('couriers', id, { status: 'activo' }); db.update('users', c.userId, { active: true }); db.log('repartidor', `${c.name} reactivado`, ctx.user.id); toast('Repartidor reactivado', 'success'); }
    if (a === 'delete') {
      if (ops.courierQueue(id).length) { toast('Tiene envíos en curso: reasígnalos primero', 'warning'); return; }
      if (!(await confirm(`¿Eliminar a ${c.name} y su usuario? Su historial de envíos se conserva.`, { danger: true, ok: 'Eliminar' }))) return;
      db.remove('couriers', id); if (c.userId) db.remove('users', c.userId); db.log('repartidor', `${c.name} eliminado`, ctx.user.id); toast('Repartidor eliminado', 'success'); m.close();
    }
  });
  const unsub = db.subscribe(() => draw());
  draw();
}
