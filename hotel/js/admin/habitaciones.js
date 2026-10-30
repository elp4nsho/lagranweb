// Habitaciones y tipos: CRUD de habitaciones físicas y de tipos (descripción, capacidad, amenidades).
import { escape, toast, confirm, formModal, money } from '../../../assets/core/ui.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { HK_STATES, typeById } from '../shared/hotel.js';
import { roomOcc } from './housekeeping.js';

async function editRoom(r, ctx) {
  const v = await formModal({ title: r ? `Habitación ${r.number}` : 'Nueva habitación', fields: [
    { name: 'number', label: 'Número', required: true, value: r?.number }, { name: 'floor', label: 'Piso', type: 'number', required: true, value: r?.floor ?? 1 },
    { name: 'typeId', label: 'Tipo', type: 'select', options: db.all('roomTypes').map(t => [t.id, t.name]), value: r?.typeId },
    { name: 'hk', label: 'Estado de limpieza', type: 'select', options: Object.entries(HK_STATES).map(([k, s]) => [k, s.label]), value: r?.hk || 'inspeccionada' },
    { name: 'note', label: 'Nota', value: r?.note }] });
  if (!v) return;
  if (db.find('rooms', x => x.number === v.number && x.id !== r?.id)) { toast('Ya existe ese número', 'warning'); return; }
  if (r) db.update('rooms', r.id, v); else db.insert('rooms', { ...v, assignedTo: '' });
  db.log('habitaciones', `Habitación ${v.number} ${r ? 'editada' : 'creada'}`, ctx.user.id); toast('Guardado', 'success');
}
async function editType(t, ctx) {
  const v = await formModal({ title: t ? `Tipo · ${t.name}` : 'Nuevo tipo', size: 'lg', fields: [
    { name: 'name', label: 'Nombre', required: true, value: t?.name }, { name: 'short', label: 'Bajada corta', value: t?.short },
    { name: 'desc', label: 'Descripción (sitio público)', type: 'textarea', value: t?.desc },
    { name: 'size', label: 'Tamaño (m²)', type: 'number', value: t?.size ?? 25 }, { name: 'beds', label: 'Camas', value: t?.beds || '1 queen' },
    { name: 'maxGuests', label: 'Capacidad máxima', type: 'number', value: t?.maxGuests ?? 2 }, { name: 'view', label: 'Vista', value: t?.view || 'Cerro' },
    { name: 'baseRate', label: 'Tarifa base por noche (CLP)', type: 'number', required: true, value: t?.baseRate ?? 99000 },
    { name: 'amenities', label: 'Amenidades (separadas por coma)', type: 'textarea', value: (t?.amenities || []).join(', ') },
    { name: 'active', label: 'Visible en el sitio', type: 'checkbox', value: t ? t.active !== false : true }] });
  if (!v) return;
  const data = { ...v, amenities: v.amenities.split(',').map(s => s.trim()).filter(Boolean) };
  if (t) db.update('roomTypes', t.id, data); else db.insert('roomTypes', { ...data, order: db.count('roomTypes') + 1, tone: 'primary', icon: '🛏️' });
  db.log('habitaciones', `Tipo ${v.name} ${t ? 'editado' : 'creado'} (tarifa base ${money(v.baseRate)})`, ctx.user.id); toast('Tipo guardado: el sitio público se actualizó', 'success');
}

export default {
  id: 'habitaciones', label: 'Habitaciones', icon: '🛏️', group: 'Producto', roles: ['admin', 'revenue'], watch: ['rooms', 'roomTypes'],
  render(el, ctx) {
    const tab = ctx.params.sub || 'tipos';
    el.innerHTML = `${pageHead('Habitaciones', `${db.count('rooms')} habitaciones · ${db.count('roomTypes')} tipos`, `<button class="btn btn-primary btn-sm" data-new>+ ${tab === 'tipos' ? 'Nuevo tipo' : 'Nueva habitación'}</button>`)}
      <div class="tabs"><a class="tab ${tab === 'tipos' ? 'active' : ''}" href="#/habitaciones/tipos">Tipos</a><a class="tab ${tab === 'lista' ? 'active' : ''}" href="#/habitaciones/lista">Habitaciones</a></div><div data-b></div>`;
    const box = el.querySelector('[data-b]');
    el.querySelector('[data-new]').onclick = () => tab === 'tipos' ? editType(null, ctx) : editRoom(null, ctx);
    box.addEventListener('click', async e => {
      const d = e.target.closest('[data-del]'); if (!d) return;
      const [kind, id] = d.dataset.del.split('|');
      if (kind === 'room') { const r = db.get('rooms', id); if (db.count('reservations', x => x.roomId === id && ['confirmada', 'check-in'].includes(x.status))) { toast('Tiene reservas activas', 'warning'); return; } if (await confirm(`¿Eliminar la habitación ${r.number}?`, { danger: true, ok: 'Eliminar' })) { db.remove('rooms', id); db.log('habitaciones', `Habitación ${r.number} eliminada`, ctx.user.id); } }
      else { const t = db.get('roomTypes', id); if (db.count('rooms', r => r.typeId === id)) { toast('Hay habitaciones de este tipo; muévelas primero', 'warning'); return; } if (await confirm(`¿Eliminar el tipo ${t.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('roomTypes', id); db.log('habitaciones', `Tipo ${t.name} eliminado`, ctx.user.id); } }
    });
    if (tab === 'tipos') return smartTable(box, {
      rows: () => db.all('roomTypes').map(t => ({ ...t, count: db.count('rooms', r => r.typeId === t.id) })),
      columns: [
        { key: 'name', label: 'Tipo', render: t => `<b>${escape(t.icon || '')} ${escape(t.name)}</b><small class="muted d-block">${escape(t.short)}</small>` },
        { key: 'count', label: 'Hab.' }, { key: 'size', label: 'm²' }, { key: 'maxGuests', label: 'Capac.' },
        { key: 'baseRate', label: 'Tarifa base', render: t => `<b>${money(t.baseRate)}</b>` },
        { key: 'active', label: 'Sitio', render: t => t.active !== false ? '<span class="badge badge-success">Visible</span>' : '<span class="badge">Oculto</span>' },
        { key: 'id', label: '', sort: false, render: t => `<button class="btn btn-sm btn-ghost" data-del="type|${t.id}" aria-label="Eliminar">🗑</button>` }
      ],
      onRow: t => editType(db.get('roomTypes', t.id), ctx),
      csv: { name: 'tipos-habitacion', map: t => ({ tipo: t.name, habitaciones: t.count, m2: t.size, capacidad: t.maxGuests, tarifa_base: t.baseRate }) }
    });
    return smartTable(box, {
      rows: () => db.all('rooms').map(r => ({ ...r, typeName: typeById(r.typeId)?.name || '', occ: roomOcc(r)[0] })),
      filters: [{ key: 'typeId', label: 'Tipo', options: db.all('roomTypes').map(t => [t.id, t.name]) }, { key: 'floor', label: 'Piso', options: [1, 2, 3, 4, 5] }, { key: 'hk', label: 'Limpieza', options: Object.entries(HK_STATES).map(([k, s]) => [k, s.label]) }],
      search: r => `${r.number} ${r.typeName}`, pageSize: 25,
      columns: [
        { key: 'number', label: 'N°', render: r => `<b>${r.number}</b>` }, { key: 'floor', label: 'Piso' }, { key: 'typeName', label: 'Tipo' },
        { key: 'occ', label: 'Hoy' }, { key: 'hk', label: 'Limpieza', render: r => `<span class="badge badge-${HK_STATES[r.hk].badge}">${HK_STATES[r.hk].label}</span>` },
        { key: 'note', label: 'Nota', render: r => `<small>${escape(r.note || '')}</small>` },
        { key: 'id', label: '', sort: false, render: r => `<button class="btn btn-sm btn-ghost" data-del="room|${r.id}" aria-label="Eliminar">🗑</button>` }
      ],
      onRow: r => editRoom(db.get('rooms', r.id), ctx),
      csv: { name: 'habitaciones', map: r => ({ numero: r.number, piso: r.floor, tipo: r.typeName, limpieza: r.hk, nota: r.note }) }
    });
  }
};
