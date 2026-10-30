// Reservas: agenda por día, lista filtrable, flujo de estados y CRUD.
import { escape, toast, confirm, formModal, date as fmtDate } from '../../../assets/core/ui.js';
import { pageHead, badge, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { isoDay } from '../data/seed.js';
import { openSession } from '../shared/logic.js';

export const RES_STATES = {
  pendiente: { label: 'Pendiente', badge: 'warning' },
  confirmada: { label: 'Confirmada', badge: 'success' },
  sentada: { label: 'Sentada', badge: 'primary' },
  cancelada: { label: 'Cancelada', badge: 'danger' },
  'no-show': { label: 'No asistió', badge: 'danger' }
};
const NEXT = { pendiente: ['confirmada', 'cancelada'], confirmada: ['sentada', 'no-show', 'cancelada'], sentada: [], cancelada: ['pendiente'], 'no-show': [] };
const ACTION = { confirmada: 'Confirmar', sentada: 'Sentar', cancelada: 'Cancelar', 'no-show': 'No asistió', pendiente: 'Reabrir' };

const tableOpts = () => [['', 'Sin asignar'], ...db.all('tables').sort((a, b) => a.number - b.number).map(t => [t.id, `Mesa ${t.number} · ${t.zone} (${t.seats}p)`])];

export async function editReservation(r, ctx) {
  const v = await formModal({ title: r ? `Reserva ${r.code}` : 'Nueva reserva', size: 'lg', fields: [
    { name: 'name', label: 'Nombre', required: true, value: r?.name }, { name: 'phone', label: 'Teléfono', required: true, value: r?.phone },
    { name: 'email', label: 'Correo', type: 'email', value: r?.email }, { name: 'date', label: 'Fecha', type: 'date', required: true, value: r?.date || isoDay(Date.now()) },
    { name: 'time', label: 'Hora', type: 'time', required: true, value: r?.time || '20:00' }, { name: 'party', label: 'Personas', type: 'number', required: true, value: r?.party || 2 },
    { name: 'zone', label: 'Zona', type: 'select', options: ['Sin preferencia', 'Salón', 'Terraza', 'Barra'], value: r?.zone || 'Sin preferencia' },
    { name: 'tableId', label: 'Mesa asignada', type: 'select', options: tableOpts(), value: r?.tableId || '' },
    { name: 'status', label: 'Estado', type: 'select', options: Object.entries(RES_STATES).map(([k, s]) => [k, s.label]), value: r?.status || 'confirmada' },
    { name: 'notes', label: 'Notas', type: 'textarea', value: r?.notes }] });
  if (!v) return;
  if (r) { db.update('reservations', r.id, v); db.log('reserva', `Reserva ${r.code} editada (${v.name})`, ctx.user.id); }
  else { const code = 'FA-' + (5000 + db.count('reservations')); db.insert('reservations', { ...v, code, source: 'teléfono' }); db.log('reserva', `Reserva ${code} creada para ${v.name}`, ctx.user.id); }
  toast('Reserva guardada', 'success');
}

export function setResStatus(r, st, ctx) {
  const patch = { status: st };
  if (st === 'sentada') {
    let t = r.tableId && db.get('tables', r.tableId);
    if (!t || t.status === 'ocupada') t = db.all('tables').filter(x => x.status !== 'ocupada' && x.seats >= r.party).sort((a, b) => a.seats - b.seats)[0];
    if (!t) { toast('No hay mesas libres con capacidad suficiente', 'warning'); return; }
    patch.tableId = t.id;
    openSession(t.id, { guests: r.party });
    toast(`${r.name} sentado en mesa ${t.number}`, 'success');
  } else toast(`Reserva ${RES_STATES[st].label.toLowerCase()}`, 'success');
  db.update('reservations', r.id, patch);
  db.log('reserva', `Reserva ${r.code} → ${RES_STATES[st].label}`, ctx.user.id);
}

export default {
  id: 'reservas', label: 'Reservas', icon: '📅', group: 'Operación', roles: ['admin', 'cajero', 'garzon'], watch: ['reservations', 'tables'],
  render(el, ctx) {
    const view = ctx.params.sub || 'agenda';
    const day = ctx.query.d || isoDay(Date.now());
    const shift = n => isoDay(new Date(day + 'T12:00').getTime() + n * 864e5);
    el.innerHTML = `${pageHead('Reservas', 'Agenda del día, confirmaciones y asignación de mesas', '<a class="btn btn-sm" href="reservas.html" target="_blank" rel="noopener">Formulario público ↗</a><button class="btn btn-primary btn-sm" data-new>+ Nueva reserva</button>')}
      <div class="tabs"><a class="tab ${view === 'agenda' ? 'active' : ''}" href="#/reservas/agenda">Agenda del día</a><a class="tab ${view === 'lista' ? 'active' : ''}" href="#/reservas/lista">Todas</a></div>
      <div data-body></div>`;
    const body = el.querySelector('[data-body]');
    el.addEventListener('click', e => {
      if (e.target.closest('[data-new]')) editReservation(null, ctx);
      const b = e.target.closest('[data-st]');
      if (b) setResStatus(db.get('reservations', b.dataset.id), b.dataset.st, ctx);
      const ed = e.target.closest('[data-edit]');
      if (ed) editReservation(db.get('reservations', ed.dataset.edit), ctx);
      const del = e.target.closest('[data-del]');
      if (del) { const r = db.get('reservations', del.dataset.del); confirm(`¿Eliminar la reserva de ${r.name}?`, { danger: true, ok: 'Eliminar' }).then(ok => { if (ok) { db.remove('reservations', r.id); db.log('reserva', `Reserva ${r.code} eliminada`, ctx.user.id); toast('Reserva eliminada', 'success'); } }); }
    });
    if (view === 'lista') {
      return smartTable(body, {
        rows: () => db.all('reservations').map(r => ({ ...r, when: r.date + ' ' + r.time, tableNum: db.get('tables', r.tableId)?.number || '' })),
        filters: [
          { key: 'status', label: 'Estado', options: Object.entries(RES_STATES).map(([k, s]) => [k, s.label]) },
          { key: 'period', label: 'Periodo', value: 'next', options: [['next', 'Próximas'], ['past', 'Pasadas']], test: (r, v) => v === 'next' ? r.date >= isoDay(Date.now()) : r.date < isoDay(Date.now()) },
          { key: 'source', label: 'Origen', options: ['web', 'teléfono', 'presencial'] }
        ],
        search: r => `${r.name} ${r.code} ${r.phone} ${r.email}`,
        columns: [
          { key: 'code', label: 'Código', render: r => `<code>${escape(r.code)}</code>` },
          { key: 'when', label: 'Fecha', render: r => `${escape(fmtDate(r.date + 'T12:00', { weekday: 'short', day: '2-digit', month: 'short' }))} · <b>${escape(r.time)}</b>` },
          { key: 'name', label: 'Cliente', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.phone)}</small>` },
          { key: 'party', label: 'Pers.' },
          { key: 'tableNum', label: 'Mesa', render: r => r.tableNum || '<span class="muted">—</span>' },
          { key: 'source', label: 'Origen' },
          { key: 'status', label: 'Estado', render: r => badge(RES_STATES, r.status) }
        ],
        onRow: r => editReservation(db.get('reservations', r.id), ctx),
        csv: { name: 'reservas', map: r => ({ codigo: r.code, fecha: r.date, hora: r.time, nombre: r.name, telefono: r.phone, correo: r.email, personas: r.party, zona: r.zone, mesa: r.tableNum, estado: r.status, notas: r.notes }) }
      });
    }
    const paint = () => {
      const list = db.query('reservations', r => r.date === day).sort((a, b) => a.time.localeCompare(b.time));
      const active = list.filter(r => ['pendiente', 'confirmada', 'sentada'].includes(r.status));
      const slots = [...new Set(list.map(r => r.time))];
      body.innerHTML = `<div class="row between day-nav">
          <div class="row"><a class="btn btn-sm" href="#/reservas/agenda?d=${shift(-1)}" aria-label="Día anterior">←</a><b class="day-label">${escape(fmtDate(day + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))}</b><a class="btn btn-sm" href="#/reservas/agenda?d=${shift(1)}" aria-label="Día siguiente">→</a>${day !== isoDay(Date.now()) ? '<a class="btn btn-sm btn-ghost" href="#/reservas/agenda">Hoy</a>' : ''}</div>
          <span class="muted small">${active.length} reservas activas · ${active.reduce((a, r) => a + r.party, 0)} cubiertos</span></div>
        ${slots.length ? slots.map(s => `<div class="slot-row"><div class="slot-time">${escape(s)}</div><div class="grid-auto grow">${list.filter(r => r.time === s).map(r => {
          const t = db.get('tables', r.tableId);
          return `<div class="card stack res-card st-${r.status}"><div class="row between"><b>${escape(r.name)}</b>${badge(RES_STATES, r.status)}</div>
            <small class="muted">${r.party} pers. · ${escape(r.zone)}${t ? ` · Mesa ${t.number}` : ''} · <code>${escape(r.code)}</code></small>
            ${r.notes ? `<small>📝 ${escape(r.notes)}</small>` : ''}
            <div class="row" style="gap:6px">${NEXT[r.status].map(st => `<button class="btn btn-sm ${st === 'confirmada' || st === 'sentada' ? 'btn-primary' : 'btn-ghost'}" data-st="${st}" data-id="${r.id}">${ACTION[st]}</button>`).join('')}<button class="btn btn-sm btn-ghost" data-edit="${r.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button></div></div>`;
        }).join('')}</div></div>`).join('') : '<div class="card empty"><span class="icon">📅</span>Sin reservas para este día.</div>'}`;
    };
    paint();
    return { refresh: paint };
  }
};
