// Bitácora de visitas: filtros, check-in/out, credenciales, alta manual y CSV.
import { escape, toast, time, date } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete, personCell, kpi } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { today, addDays, fmtDay, hm } from '../shared/dates.js';
import { VISIT_REASONS, VISIT_BADGE, VISIT_LABEL, registerVisit, checkInVisit, checkOutVisit, badgeFor } from '../shared/visits.js';

export function visitFields(idx, { pre } = {}) {
  return [
    { name: 'name', label: 'Nombre completo', required: true, span: 2 },
    { name: 'doc', label: 'RUT / documento' }, { name: 'org', label: 'Empresa / organización' },
    { name: 'hostId', label: 'Anfitrión', type: 'select', required: true, options: [['', 'Selecciona…'], ...idx.people.filter(p => !p.remoteOnly).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(p => [p.id, `${p.name} · ${idx.area(p)?.name || ''}`])], span: 2 },
    { name: 'reason', label: 'Motivo', type: 'select', options: VISIT_REASONS }, { name: 'email', label: 'Correo (opcional)', type: 'email' },
    ...(pre ? [{ name: 'date', label: 'Fecha', type: 'date', required: true, min: today() }, { name: 'expectedAt', label: 'Hora estimada', type: 'time', required: true }] : [])
  ];
}

export function render(el, ctx) {
  const { db, idx } = ctx, T = today();
  const all = db.query('visitors', v => v.companyId === idx.company.id);
  const todayList = all.filter(v => v.date === T);
  const done = all.filter(v => v.checkIn && v.checkOut);
  const avg = done.length ? Math.round(done.reduce((s, v) => s + (new Date(v.checkOut) - new Date(v.checkIn)) / 6e4, 0) / done.length) : 0;
  const rows = all.map(v => ({ ...v, host: idx.byId[v.hostId], hostName: idx.byId[v.hostId]?.name || '', when: v.date + ' ' + (v.checkIn ? time(v.checkIn) : v.expectedAt) }));
  el.innerHTML = `${pageHead('Visitas', `${escape(idx.company.name)} · registro de recepción`, `${ctx.can('visitas') && ['admin', 'recepcion'].includes(ctx.user.role) ? '<a class="btn" href="recepcion.html">🖥️ Abrir kiosko</a>' : ''}<button class="btn" data-act="pre">🗓 Pre-registrar</button><button class="btn btn-primary" data-act="new">＋ Registrar llegada</button>`)}
    <div class="kpis">${kpi('Visitas hoy', todayList.length)}${kpi('En el edificio', todayList.filter(v => v.status === 'en sitio').length)}${kpi('Esperadas', todayList.filter(v => v.status === 'esperada').length)}${kpi('Permanencia promedio', `${avg} min`)}${kpi('Total registradas', all.length)}</div>
    <div data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    key: 'visitas', rows, sort: 'when', dir: -1, pageSize: 12, search: r => `${r.name} ${r.org} ${r.doc} ${r.hostName} ${r.code}`,
    filters: [
      { key: 'when', label: 'Periodo', options: [['hoy', 'Hoy'], ['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['fut', 'Próximas']], test: (r, v) => v === 'hoy' ? r.date === T : v === 'fut' ? r.date > T : r.date <= T && r.date >= addDays(T, -+v) },
      { key: 'status', label: 'Estado', options: Object.entries(VISIT_LABEL), test: (r, v) => r.status === v },
      { key: 'reason', label: 'Motivo', options: VISIT_REASONS.map(x => [x, x]), test: (r, v) => r.reason === v }
    ],
    columns: [
      { key: 'when', label: 'Fecha', render: r => `<span class="nowrap">${escape(fmtDay(r.date))}</span><br><small class="muted">${r.checkIn ? `${time(r.checkIn)}${r.checkOut ? '–' + time(r.checkOut) : ''}` : `esperada ${escape(r.expectedAt)}`}</small>` },
      { key: 'name', label: 'Visitante', render: r => `<b>${escape(r.name)}</b><br><small class="muted">${escape(r.org || '')}${r.doc ? ' · ' + escape(r.doc) : ''}</small>` },
      { key: 'hostName', label: 'Anfitrión', render: r => personCell(r.host) },
      { key: 'reason', label: 'Motivo' },
      { key: 'status', label: 'Estado', render: r => `<span class="badge ${VISIT_BADGE[r.status] || ''}">${VISIT_LABEL[r.status] || r.status}</span>` },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${r.status === 'esperada' && r.date === T ? actBtn('in', r.id, 'Check-in', 'btn-primary') : ''}${r.status === 'en sitio' ? actBtn('out', r.id, 'Salida') : ''}${r.status !== 'esperada' ? actBtn('badge', r.id, '🪪', 'btn-ghost', 'Credencial') : ''}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    csv: { filename: `visitas-${idx.company.id}.csv`, map: r => ({ fecha: r.date, codigo: r.code, visitante: r.name, documento: r.doc, organizacion: r.org, anfitrion: r.hostName, motivo: r.reason, estado: VISIT_LABEL[r.status], entrada: r.checkIn ? time(r.checkIn) : '', salida: r.checkOut ? time(r.checkOut) : '' }) }
  });
  const get = id => db.get('visitors', id);
  onActs(el, {
    new: async () => { const v = await formDialog({ title: 'Registrar llegada de visita', fields: visitFields(idx), values: { reason: 'Reunión' } }); if (!v) return; const row = registerVisit(db, idx, v, ctx.user); badgeFor(db, idx, row); },
    pre: async () => { const v = await formDialog({ title: 'Pre-registrar visita', fields: visitFields(idx, { pre: true }), values: { reason: 'Reunión', date: T, expectedAt: '15:00' } }); if (!v) return; registerVisit(db, idx, v, ctx.user, { pre: true }); toast('Visita pre-registrada: aparecerá en el kiosko', 'success'); },
    in: id => { const row = checkInVisit(db, idx, get(id), ctx.user); badgeFor(db, idx, row); },
    out: id => checkOutVisit(db, get(id), ctx.user),
    badge: id => badgeFor(db, idx, get(id)),
    del: id => { const v = get(id); confirmDelete(`el registro de ${v.name}`, () => db.remove('visitors', id), { db, user: ctx.user, log: `Eliminó la visita de ${v.name}` }); }
  });
}
