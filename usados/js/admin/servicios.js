// Servicios: agenda de horas (sucursal / domicilio) con flujo de estados y CRUD del catálogo de servicios.
import { money, escape, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { BOOK_STATES } from '../data/catalog.js';
import { statusBadge, branchById } from '../shared/domain.js';
import { fmtDay, ymd } from '../shared/util.js';

const NEXT = { agendada: 'confirmada', confirmada: 'en-proceso', 'en-proceso': 'completada' };
async function editType(s, ctx) {
  const v = await formModal({ title: s ? `Editar ${s.name}` : 'Nuevo servicio', fields: [{ name: 'name', label: 'Nombre', required: true, value: s?.name }, { name: 'icon', label: 'Ícono', value: s?.icon || '🔧' }, { name: 'price', label: 'Precio (CLP)', type: 'number', required: true, value: s?.price },
    { name: 'mins', label: 'Duración (min)', type: 'number', value: s?.mins || 60 }, { name: 'desc', label: 'Descripción', type: 'textarea', value: s?.desc }, { name: 'home', label: 'Disponible a domicilio', type: 'checkbox', value: s?.modes?.includes('domicilio') }, { name: 'active', label: 'Activo', type: 'checkbox', value: s ? s.active : true }] });
  if (!v) return;
  const data = { name: v.name, icon: v.icon, price: v.price, mins: v.mins, desc: v.desc, active: v.active, modes: v.home ? ['sucursal', 'domicilio'] : ['sucursal'] };
  s ? db.update('serviceTypes', s.id, data) : db.insert('serviceTypes', data);
  db.log('servicios', `Servicio ${s ? 'editado' : 'creado'}: ${v.name} (${money(v.price)})`, ctx.user.id); toast('Servicio guardado', 'success');
}
export default {
  id: 'servicios', label: 'Servicios y agenda', icon: '🔧', group: 'Posventa', roles: ['admin', 'gerente', 'taller'],
  watch: ['bookings', 'serviceTypes'],
  render(el, ctx) {
    const view = ctx.params.sub || 'agenda', bks = db.all('bookings'), T = ymd();
    el.innerHTML = `${pageHead('Servicios y agenda', 'Mantenciones, revisión técnica, precompra y diagnóstico')}
      <div class="kpi-grid">${kpi('Hoy', String(bks.filter(b => b.date === T && b.status !== 'cancelada').length))}${kpi('Por confirmar', String(bks.filter(b => b.status === 'agendada').length))}${kpi('Próximos 7 días', String(bks.filter(b => b.date > T && b.date <= ymd(new Date(Date.now() + 7 * 864e5)) && b.status !== 'cancelada').length))}${kpi('Ventas 30 días', money(bks.filter(b => b.status === 'completada' && b.date >= ymd(new Date(Date.now() - 30 * 864e5))).reduce((a, b) => a + b.price, 0)))}</div>
      <div class="tabs"><a class="tab ${view === 'agenda' ? 'active' : ''}" href="#/servicios/agenda">Agenda</a><a class="tab ${view === 'catalogo' ? 'active' : ''}" href="#/servicios/catalogo">Catálogo de servicios</a></div><div data-t></div>`;
    const t = el.querySelector('[data-t]');
    t.addEventListener('click', async e => {
      const n = e.target.closest('[data-adv]'); if (n) { const b = db.get('bookings', n.dataset.adv), to = NEXT[b.status]; db.update('bookings', b.id, { status: to }); db.log('servicios', `${b.code}: ${BOOK_STATES[to].label}`, ctx.user.id); toast(`${b.code} → ${BOOK_STATES[to].label}`, 'success'); }
      const c = e.target.closest('[data-cancel]'); if (c && await confirm('¿Cancelar esta hora?', { danger: true, ok: 'Cancelar hora' })) { db.update('bookings', c.dataset.cancel, { status: 'cancelada' }); db.log('servicios', `${db.get('bookings', c.dataset.cancel).code}: cancelada`, ctx.user.id); }
      if (e.target.closest('[data-newtype]')) editType(null, ctx);
    });
    if (view === 'catalogo') return smartTable(t, {
      rows: () => db.all('serviceTypes'), search: r => r.name,
      columns: [{ key: 'name', label: 'Servicio', render: r => `${escape(r.icon)} <b>${escape(r.name)}</b>` }, { key: 'price', label: 'Precio', render: r => money(r.price) }, { key: 'mins', label: 'Duración', render: r => r.mins + ' min' }, { key: 'modes', label: 'Modalidad', render: r => r.modes.join(' / ') }, { key: 'active', label: 'Estado', render: r => r.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge">Inactivo</span>' }],
      onRow: r => editType(db.get('serviceTypes', r.id), ctx), actions: '<button class="btn btn-sm btn-primary" data-newtype>+ Servicio</button>'
    });
    return smartTable(t, {
      rows: () => db.all('bookings').map(b => ({ ...b, svc: db.get('serviceTypes', b.serviceId)?.name || '', place: b.mode === 'domicilio' ? '🏠 ' + b.address : '🏢 ' + (branchById(b.branchId)?.name || '') })).sort((a, b) => (b.date + b.slot).localeCompare(a.date + a.slot)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(BOOK_STATES).map(([k, s]) => [k, s.label]) }, { key: 'mode', label: 'Modalidad', options: [['sucursal', 'Sucursal'], ['domicilio', 'Domicilio']] }, { key: 'when', label: 'Fecha', options: [['hoy', 'Hoy'], ['futuro', 'Próximas']], test: (r, v) => v === 'hoy' ? r.date === T : r.date >= T }],
      search: r => `${r.code} ${r.name} ${r.plate} ${r.carDesc} ${r.svc}`,
      columns: [{ key: 'date', label: 'Fecha', render: r => `${fmtDay(r.date, { weekday: true })} ${r.slot}` }, { key: 'code', label: 'Código', render: r => `<span class="mono">${r.code}</span>` }, { key: 'svc', label: 'Servicio', render: r => `${escape(r.svc)}${r.plan ? ' <span class="badge badge-primary">Plan</span>' : ''}` },
        { key: 'carDesc', label: 'Auto', render: r => `${escape(r.carDesc)}<small class="muted d-block mono">${escape(r.plate)}</small>` }, { key: 'name', label: 'Cliente' }, { key: 'place', label: 'Lugar' }, { key: 'status', label: 'Estado', render: r => statusBadge(BOOK_STATES, r.status) },
        { key: 'id', label: '', sort: false, render: r => NEXT[r.status] ? `<span class="nowrap"><button class="btn btn-sm" data-adv="${r.id}">→ ${BOOK_STATES[NEXT[r.status]].label}</button>${r.status !== 'en-proceso' ? ` <button class="btn btn-sm btn-ghost" data-cancel="${r.id}" aria-label="Cancelar">✕</button>` : ''}</span>` : '' }],
      csv: { name: 'servicios', map: r => ({ codigo: r.code, fecha: r.date, hora: r.slot, servicio: r.svc, auto: r.carDesc, patente: r.plate, cliente: r.name, lugar: r.place, estado: BOOK_STATES[r.status].label, precio: r.price }) }
    });
  }
};
