// Puestos fijos y reservas de puestos flexibles (gestión y liberación de no-shows).
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, personCell } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { areaTag } from '../shared/util.js';
import { today, fmtDay, hm, addDays } from '../shared/dates.js';
import { rulesFor, validateBooking, canBookDesk } from '../shared/booking.js';
import { buildIndex } from '../shared/util.js';

let tab = 'fijos';
const RES_BADGE = { reservada: 'badge-info', checkin: 'badge-success', completada: '', 'no-show': 'badge-danger', cancelada: '', liberada: 'badge-warning' };
const RES_LABEL = { reservada: 'Reservada', checkin: 'Check-in', completada: 'Completada', 'no-show': 'No asistió', cancelada: 'Cancelada', liberada: 'Liberada' };

export function render(el, ctx) {
  const { db, idx } = ctx;
  const totalDesks = idx.floors.reduce((n, f) => n + f.desks.length, 0);
  const fixed = idx.people.filter(p => p.deskId).length, flexDesks = idx.floors.reduce((n, f) => n + f.desks.filter(d => d.type === 'flexible').length, 0);
  el.innerHTML = `${pageHead('Puestos y reservas', `${escape(idx.company.name)} · ${totalDesks} puestos: ${fixed} asignados, ${flexDesks} flexibles.`, tab === 'reservas' ? '<button class="btn" data-act="release">Liberar no-shows de hoy</button><button class="btn btn-primary" data-act="newres">＋ Nueva reserva</button>' : '<a class="btn" href="#/pisos">🗺️ Asignar en el plano</a>')}
    <div class="tabs" role="tablist"><button class="tab ${tab === 'fijos' ? 'active' : ''}" role="tab" aria-selected="${tab === 'fijos'}" data-act="tab" data-id="fijos">Puestos fijos</button><button class="tab ${tab === 'reservas' ? 'active' : ''}" role="tab" aria-selected="${tab === 'reservas'}" data-act="tab" data-id="reservas">Reservas flexibles</button></div>
    <div data-t></div>`;
  const box = el.querySelector('[data-t]');
  if (tab === 'fijos') {
    const taken = new Set(idx.people.filter(p => p.deskId).map(p => p.deskId));
    const options = p => `<option value="">— Sin puesto fijo —</option>${idx.floors.map(f => `<optgroup label="${escape(f.name)}">${f.desks.filter(d => d.type !== 'bloqueado' && (!taken.has(d.id) || d.id === p.deskId)).map(d => `<option value="${d.id}" ${d.id === p.deskId ? 'selected' : ''}>${escape(d.code)}${d.type === 'flexible' ? ' · flexible' : ''}</option>`).join('')}</optgroup>`).join('')}`;
    const rows = idx.people.filter(p => !p.remoteOnly).map(p => ({ ...p, areaName: idx.area(p)?.name || '', seat: p.deskId ? idx.desk[p.deskId]?.desk.code || '' : '', floorName: p.deskId ? idx.desk[p.deskId]?.floor.name || '' : '', zone: p.deskId ? idx.desk[p.deskId]?.zone?.name || '' : '' }));
    smartTable(box, {
      key: 'asig-fijos', rows, sort: 'name', search: r => `${r.name} ${r.areaName} ${r.seat}`,
      filters: [{ key: 'has', label: 'Asignación', options: [['si', 'Con puesto'], ['no', 'Sin puesto']], test: (r, v) => (v === 'si') === !!r.deskId }, { key: 'area', label: 'Área', options: idx.areas.map(a => [a.id, a.name]), test: (r, v) => r.areaId === v }],
      columns: [
        { key: 'name', label: 'Persona', render: r => personCell(r) },
        { key: 'areaName', label: 'Área', render: r => areaTag(idx.area(r)) },
        { key: 'floorName', label: 'Piso / zona', render: r => r.deskId ? `${escape(r.floorName)}<br><small class="muted">${escape(r.zone)}</small>` : '<span class="muted small">Flexible</span>' },
        { key: 'seat', label: 'Puesto fijo', render: r => `<select class="select select-sm" data-desk-for="${r.id}" aria-label="Puesto de ${escape(r.name)}" style="min-width:150px">${options(r)}</select>` }
      ],
      csv: { filename: 'puestos-fijos.csv', map: r => ({ persona: r.name, area: r.areaName, piso: r.floorName, puesto: r.seat }) }
    });
    box.addEventListener('change', e => {
      const s = e.target.closest('[data-desk-for]'); if (!s) return;
      const p = db.get('people', s.dataset.deskFor), deskId = s.value || null;
      db.update('people', p.id, { deskId });
      if (deskId) { const f = db.find('floors', x => x.desks.some(d => d.id === deskId)); db.update('floors', f.id, { desks: f.desks.map(d => d.id === deskId ? { ...d, type: 'fijo' } : d) }); }
      db.log('puesto', deskId ? `Asignó el puesto ${idx.desk[deskId]?.desk.code} a ${p.name}` : `Quitó el puesto fijo de ${p.name}`, ctx.user.id);
      toast(deskId ? `Puesto asignado a ${p.name}` : `${p.name} quedó sin puesto fijo`, 'success');
    });
  } else {
    const rows = db.query('reservations', r => r.companyId === idx.company.id).map(r => {
      const p = idx.byId[r.personId], i = idx.desk[r.deskId];
      return { ...r, p, name: p?.name || '(eliminada)', code: i?.desk.code || r.deskId, floorName: i?.floor.name || '', statusLabel: RES_LABEL[r.status] || r.status };
    });
    const T = today();
    smartTable(box, {
      key: 'asig-res', rows, sort: 'date', dir: -1, search: r => `${r.name} ${r.code}`, pageSize: 12,
      filters: [
        { key: 'when', label: 'Fecha', options: [['hoy', 'Hoy'], ['futuras', 'Próximas'], ['pasadas', 'Pasadas']], test: (r, v) => v === 'hoy' ? r.date === T : v === 'futuras' ? r.date > T : r.date < T },
        { key: 'status', label: 'Estado', options: Object.entries(RES_LABEL), test: (r, v) => r.status === v },
        { key: 'floor', label: 'Piso', options: idx.floors.map(f => [f.id, f.name]), test: (r, v) => r.floorId === v }
      ],
      columns: [
        { key: 'date', label: 'Fecha', render: r => `<span class="nowrap">${escape(fmtDay(r.date))}</span>${r.date === T ? ' <span class="badge badge-primary">hoy</span>' : ''}` },
        { key: 'name', label: 'Persona', render: r => personCell(r.p) },
        { key: 'code', label: 'Puesto', render: r => `<span class="mono">${escape(r.code)}</span><br><small class="muted">${escape(r.floorName)}</small>` },
        { key: 'status', label: 'Estado', render: r => `<span class="badge ${RES_BADGE[r.status] || ''}">${escape(r.statusLabel)}</span>${r.checkinAt ? `<br><small class="muted">${escape(r.checkinAt.slice(11, 16))}</small>` : ''}` },
        { key: 'a', label: '', sort: false, render: r => `<div class="acts">${r.status === 'reservada' && r.date === T ? actBtn('checkin', r.id, 'Check-in') : ''}${r.status === 'reservada' && r.date >= T ? actBtn('cancel', r.id, 'Cancelar') : ''}${r.status === 'reservada' && r.date <= T ? actBtn('noshow', r.id, 'No asistió') : ''}</div>` }
      ],
      csv: { filename: 'reservas.csv', map: r => ({ fecha: r.date, persona: r.name, puesto: r.code, piso: r.floorName, estado: r.statusLabel }) }
    });
  }
  const setRes = (id, status, msg) => { const r = db.get('reservations', id); db.update('reservations', id, { status, checkinAt: status === 'checkin' ? new Date().toISOString().slice(0, 16) : r.checkinAt }); db.log('reserva', `${msg}: ${idx.byId[r.personId]?.name} · ${idx.desk[r.deskId]?.desk.code} (${r.date})`, ctx.user.id); toast(msg, 'success'); };
  onActs(el, {
    tab: id => { tab = id; render(el, ctx); },
    checkin: id => setRes(id, 'checkin', 'Check-in registrado'),
    cancel: id => setRes(id, 'cancelada', 'Reserva cancelada'),
    noshow: id => setRes(id, 'no-show', 'Marcada como no asistió'),
    release: () => {
      const rules = rulesFor(db, idx.company.id), T = today();
      const list = db.query('reservations', r => r.companyId === idx.company.id && r.date === T && r.status === 'reservada');
      if (hm() < rules.checkinDeadline && !list.length) return toast('No hay reservas pendientes de check-in hoy', 'info');
      list.forEach(r => db.update('reservations', r.id, { status: 'liberada' }));
      db.log('reserva', `Liberó ${list.length} reservas sin check-in (límite ${rules.checkinDeadline})`, ctx.user.id);
      toast(list.length ? `${list.length} puestos liberados para hoy` : 'No hay reservas sin check-in', list.length ? 'success' : 'info');
    },
    newres: async () => {
      const rules = rulesFor(db, idx.company.id);
      const people = idx.people.filter(p => !p.remoteOnly).sort((a, b) => a.name.localeCompare(b.name, 'es'));
      const desks = idx.floors.flatMap(f => f.desks.filter(d => d.type === 'flexible').map(d => [d.id, `${f.name} · ${d.code}`]));
      if (!desks.length) return toast('No hay puestos flexibles. Márcalos como flexibles en el editor de planos.', 'warning');
      const v = await formDialog({
        title: 'Nueva reserva de puesto', fields: [
          { name: 'personId', label: 'Persona', type: 'select', options: people.map(p => [p.id, p.name]), span: 2 },
          { name: 'date', label: 'Fecha', type: 'date', required: true, min: today(), max: addDays(today(), rules.maxDaysAhead) },
          { name: 'deskId', label: 'Puesto flexible', type: 'select', options: desks }
        ], values: { date: today() },
        validate: v => { const ix = buildIndex(db, idx.company.id, v.date); return validateBooking(db, ix, rules, ix.byId[v.personId], v.deskId, v.date); }
      });
      if (!v) return;
      db.insert('reservations', { ...v, companyId: idx.company.id, floorId: idx.desk[v.deskId].floor.id, status: 'reservada', checkinAt: null, by: ctx.user.id });
      db.log('reserva', `Reservó ${idx.desk[v.deskId].desk.code} para ${idx.byId[v.personId].name} el ${v.date}`, ctx.user.id);
      toast('Reserva creada', 'success');
    }
  });
}
