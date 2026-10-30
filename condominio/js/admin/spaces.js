// Espacios comunes: configuración (reglas, turnos, precio, cupos) y gestión de reservas.
import { escape, money, toast, confirm, date } from '../../../assets/core/ui.js';
import { unitName, notify } from '../data/db.js';
import { icon } from '../shared/icons.js';
import { pageHead, crudTable, editForm } from '../shared/kit.js';

export function renderSpaces(el, p, q, ctx) {
  const { db, user } = ctx;
  const spaces = db.all('spaces'), today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `${pageHead('Espacios comunes', 'Reglas de uso, turnos y reservas', '<button class="btn btn-primary" data-new>+ Nuevo espacio</button>')}
    <div class="grid-2">${spaces.map(s => `<div class="card stack" style="gap:8px"><div class="row between"><span class="row" style="gap:10px"><span class="icon-tile">${icon(s.icon || 'calendar', 22)}</span><span><b>${escape(s.name)}</b><br><span class="muted small">${s.price ? money(s.price) : 'Sin costo'} · ${s.capacity} personas · ${s.perSlot > 1 ? s.perSlot + ' reservas por turno' : '1 reserva por turno'}</span></span></span>
      <label class="switch" title="Habilitado"><input type="checkbox" data-act="${s.id}" ${s.active ? 'checked' : ''}><span></span></label></div>
      <div class="row" style="gap:6px">${s.slots.map(x => `<span class="chip" style="cursor:default">${escape(x)}</span>`).join('')}</div><p class="small muted" style="margin:0">${escape(s.rules)}</p>
      <div class="row between small"><span>${db.count('bookings', b => b.spaceId === s.id && b.date >= today && b.status === 'confirmada')} reservas próximas</span><span class="row" style="gap:6px"><button class="btn btn-sm" data-edit="${s.id}">✎ Editar</button><button class="btn btn-sm btn-ghost" data-del="${s.id}">🗑</button></span></div></div>`).join('')}</div>
    <h2 style="margin:8px 0 0;font-size:22px">Reservas</h2><div data-t></div>`;
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('bookings').sort((a, b) => b.date.localeCompare(a.date)), search: b => `${unitName(b.unitId)} ${db.get('spaces', b.spaceId)?.name}`,
    filters: [{ key: 'spaceId', label: 'Espacio', options: spaces.map(s => [s.id, s.name]) }, { key: 'status', label: 'Estado', options: [['confirmada', 'Confirmada'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada']] }, { key: 'when', label: 'Fecha', options: [['prox', 'Próximas'], ['pas', 'Pasadas']], value: 'prox', fn: (b, v) => v === 'prox' ? b.date >= today : b.date < today }],
    columns: [
      { key: 'date', label: 'Fecha', render: b => `<span class="nowrap">${date(b.date + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short' })}</span><br><span class="muted small">${escape(b.slot)}</span>` },
      { key: 'spaceId', label: 'Espacio', render: b => escape(db.get('spaces', b.spaceId)?.name || '') }, { key: 'unitId', label: 'Depto', render: b => escape(unitName(b.unitId)) },
      { key: 'guests', label: 'Invitados' }, { key: 'price', label: 'Cargo', render: b => b.price ? money(b.price) : '—' },
      { key: 'status', label: 'Estado', render: b => `<span class="badge ${b.status === 'confirmada' ? 'badge-success' : b.status === 'cancelada' ? 'badge-danger' : ''}">${b.status}</span>` },
      { key: 'id', label: '', sort: false, render: b => b.status === 'confirmada' && b.date >= today ? `<button class="btn btn-sm btn-ghost" data-cancel="${b.id}">Cancelar</button>` : '' }
    ],
    csv: { name: 'reservas.csv', map: b => ({ fecha: b.date, turno: b.slot, espacio: db.get('spaces', b.spaceId)?.name, depto: unitName(b.unitId), invitados: b.guests, cargo: b.price, estado: b.status }) }
  });
  const form = s => editForm({ title: s ? `Editar ${s.name}` : 'Nuevo espacio', values: s ? { ...s, slots: s.slots.join(', ') } : { capacity: 20, price: 0, deposit: 0, perSlot: 1, maxPerMonth: 2, active: true, icon: 'calendar', slots: '10:00–14:00, 15:00–19:00' }, fields: [
    { name: 'name', label: 'Nombre', required: true }, { name: 'icon', label: 'Ícono', type: 'select', options: [['fire', 'Quincho'], ['users', 'Sala'], ['swim', 'Piscina'], ['calendar', 'Genérico']] },
    { name: 'price', label: 'Valor por reserva (CLP)', type: 'number', min: 0 }, { name: 'deposit', label: 'Garantía (CLP)', type: 'number', min: 0 },
    { name: 'capacity', label: 'Aforo (personas)', type: 'number', min: 1 }, { name: 'perSlot', label: 'Reservas por turno', type: 'number', min: 1 },
    { name: 'maxPerMonth', label: 'Máx. reservas/mes por depto', type: 'number', min: 1 }, { name: 'slots', label: 'Turnos (separados por coma)', required: true },
    { name: 'rules', label: 'Reglas de uso', type: 'textarea', full: true }, { name: 'active', label: 'Habilitado para reservas', type: 'checkbox' }] });
  const clean = r => ({ ...r, slots: r.slots.split(',').map(x => x.trim()).filter(Boolean) });
  el.querySelector('[data-new]').onclick = async () => { const r = await form(); if (r) { db.insert('spaces', clean(r)); db.log('espacios', `${user.name} creó el espacio ${r.name}`, user.id); toast('Espacio creado', 'success'); ctx.refresh(); } };
  el.addEventListener('change', e => { const c = e.target.closest('[data-act]'); if (c) { db.update('spaces', c.dataset.act, { active: c.checked }); db.log('espacios', `${user.name} ${c.checked ? 'habilitó' : 'deshabilitó'} ${db.get('spaces', c.dataset.act).name}`, user.id); toast(c.checked ? 'Espacio habilitado' : 'Espacio deshabilitado', 'success'); } });
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { const s = db.get('spaces', b.dataset.edit), r = await form(s); if (r) { db.update('spaces', s.id, clean(r)); db.log('espacios', `${user.name} editó ${r.name}`, user.id); toast('Espacio actualizado', 'success'); ctx.refresh(); } }
    if (b.dataset.del) { const s = db.get('spaces', b.dataset.del); if (db.count('bookings', x => x.spaceId === s.id && x.date >= today && x.status === 'confirmada')) return toast('Tiene reservas futuras: deshabilítalo en vez de eliminarlo', 'warning'); if (await confirm(`¿Eliminar ${s.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('spaces', s.id); toast('Espacio eliminado', 'success'); ctx.refresh(); } }
    if (b.dataset.cancel) { const bk = db.get('bookings', b.dataset.cancel); if (await confirm('¿Cancelar esta reserva? Se avisará al residente.', { danger: true, ok: 'Cancelar reserva' })) { db.update('bookings', bk.id, { status: 'cancelada' }); notify(bk.unitId, `La administración canceló tu reserva de ${db.get('spaces', bk.spaceId)?.name} del ${date(bk.date + 'T12:00')}`, '#/reservas'); db.log('reserva', `${user.name} canceló reserva de ${unitName(bk.unitId)}`, user.id); toast('Reserva cancelada', 'success'); tbl.refresh(); } }
  });
}
