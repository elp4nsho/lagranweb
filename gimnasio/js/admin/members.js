import { escape, money, toast, confirm, formModal, dateTime, date as fmtDate } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { MEMBER_STATUS, GOALS } from '../data/catalog.js';
import { plan, branch, trainer, statusBadge, planPrice, bookingBadge, klass, discipline, qrSvg } from '../shared/domain.js';
import { collectModal } from '../shared/pay-ui.js';
import { pageHead, kv } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { progressView } from '../socio/progress.js';
import { validRut, fmtRut, cleanRut } from '../shared/rut.js';
import { ymd, addDays } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export async function editMember(m) {
  const v = await formModal({ title: m ? `Editar ${m.name}` : 'Nuevo socio', size: 'lg', fields: [
    { name: 'name', label: 'Nombre completo', required: true, value: m?.name }, { name: 'rut', label: 'RUT', required: true, value: m?.rut },
    { name: 'email', label: 'Correo', type: 'email', required: true, value: m?.email }, { name: 'phone', label: 'Teléfono', value: m?.phone },
    { name: 'birth', label: 'Nacimiento', type: 'date', value: m?.birth },
    { name: 'planId', label: 'Plan', type: 'select', options: db.all('plans').map(p => [p.id, `${p.name} · ${money(p.monthly)}`]), value: m?.planId || 'full' },
    { name: 'billing', label: 'Facturación', type: 'select', options: [['mensual', 'Mensual'], ['anual', 'Anual']], value: m?.billing },
    { name: 'branchId', label: 'Sede', type: 'select', options: db.all('branches').map(b => [b.id, b.name]), value: m?.branchId },
    { name: 'status', label: 'Estado de cobro', type: 'select', options: Object.entries(MEMBER_STATUS).map(([k, s]) => [k, s.label]), value: m?.status || 'activo' },
    { name: 'nextDue', label: 'Próximo vencimiento', type: 'date', value: m?.nextDue || addDays(ymd(), 30) },
    { name: 'trainerId', label: 'Entrenador asignado', type: 'select', options: [['', '—'], ...db.all('trainers').map(t => [t.id, t.name])], value: m?.trainerId || '' },
    { name: 'goal', label: 'Objetivo', type: 'select', options: GOALS, value: m?.goal }] });
  if (!v) return;
  if (!validRut(v.rut)) return toast('RUT inválido', 'error');
  v.rut = fmtRut(v.rut);
  if (db.find('members', x => cleanRut(x.rut) === cleanRut(v.rut) && x.id !== m?.id)) return toast('Ya existe un socio con ese RUT', 'error');
  if (v.status === 'baja' && m?.status !== 'baja') v.leftAt = ymd();
  if (m) db.update('members', m.id, v);
  else { const n = db.all('members').reduce((mx, x) => Math.max(mx, +x.code.slice(3) || 0), 10000) + 1; db.insert('members', { ...v, code: 'TF-' + n, since: ymd(), color: '#7a5cff' }); }
  db.log('socio', `${m ? 'Editado' : 'Creado'}: ${v.name}`, auth.current()?.id); toast('Socio guardado', 'success');
}

export function renderMembers(v, _, query) {
  const all = db.all('members');
  v.innerHTML = `${pageHead('Socios', `${all.filter(m => m.status === 'activo').length} activos · ${all.length} en total`, `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo socio</button>`)}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('members').map(m => ({ ...m, pname: plan(m.planId)?.name, price: planPrice(m) })),
    search: m => `${m.name} ${m.code} ${m.rut} ${m.email}`,
    filters: [
      { key: 'status', label: 'Estado', options: Object.entries(MEMBER_STATUS).map(([k, s]) => [k, s.label]) },
      { key: 'planId', label: 'Plan', options: db.all('plans').map(p => [p.id, p.name]) },
      { key: 'branchId', label: 'Sede', options: db.all('branches').map(b => [b.id, b.name]) }
    ],
    columns: [
      { key: 'name', label: 'Socio', render: m => `<div class="cell-user"><span class="avatar" style="--size:32px;--av:${m.color}">${escape(initials(m.name))}</span><span><b>${escape(m.name)}</b><small>${m.code} · ${escape(m.email)}</small></span></div>` },
      { key: 'pname', label: 'Plan', render: m => `${escape(m.pname)}<br><small class="muted">${m.billing} · ${money(m.price)}</small>` },
      { key: 'branchId', label: 'Sede', render: m => escape(branch(m.branchId)?.name) },
      { key: 'since', label: 'Desde' }, { key: 'nextDue', label: 'Vence', render: m => `<span class="${m.nextDue < ymd() && m.status !== 'baja' ? 'badge badge-danger' : ''}">${m.nextDue}</span>` },
      { key: 'status', label: 'Estado', render: m => statusBadge(m.status) },
      { key: 'id', label: '', sort: false, render: m => `<div class="acts-cell">${actBtn('view', m.id, 'eye', 'Ficha')}${actBtn('pay', m.id, 'money', 'Cobrar')}${actBtn('edit', m.id, 'edit', 'Editar')}${actBtn('del', m.id, 'trash', 'Eliminar')}</div>` }
    ],
    onRow: m => location.hash = '#/socios/' + m.id,
    onAction: async (act, id) => {
      const m = db.get('members', id);
      if (act === 'view') location.hash = '#/socios/' + id;
      if (act === 'edit') editMember(m);
      if (act === 'pay') collectModal(m);
      if (act === 'del') {
        if (db.count('payments', p => p.memberId === id)) { if (await confirm(`${m.name} tiene historial de pagos. ¿Darlo de baja en vez de eliminarlo?`, { title: 'Dar de baja', ok: 'Dar de baja', danger: true })) { db.update('members', id, { status: 'baja', leftAt: ymd() }); db.log('socio', `Baja: ${m.name}`, auth.current()?.id); toast('Socio dado de baja', 'success'); } return; }
        if (await confirm(`¿Eliminar a ${m.name}?`, { title: 'Eliminar socio', danger: true, ok: 'Eliminar' })) { db.remove('members', id); toast('Socio eliminado', 'success'); }
      }
    },
    csv: { name: 'socios.csv', map: m => ({ codigo: m.code, nombre: m.name, rut: m.rut, correo: m.email, telefono: m.phone, plan: m.pname, facturacion: m.billing, sede: branch(m.branchId)?.name, estado: MEMBER_STATUS[m.status]?.label, desde: m.since, vence: m.nextDue }) }
  });
  v.querySelector('[data-new]').onclick = () => editMember(null);
  if (query.nuevo) { history.replaceState(null, '', '#/socios'); editMember(null); }
}

export function renderMember(v, { id }) {
  const m = db.get('members', id);
  if (!m) { v.innerHTML = '<div class="card empty">Socio no encontrado. <a href="#/socios">Volver</a></div>'; return; }
  const p = plan(m.planId);
  const pays = db.query('payments', x => x.memberId === id).sort((a, b) => b.at.localeCompare(a.at));
  const visits = db.query('checkins', k => k.memberId === id).sort((a, b) => b.at.localeCompare(a.at));
  const books = db.query('bookings', b => b.memberId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  v.innerHTML = `${pageHead(m.name, `<a href="#/socios">${icon('back', 14)} Socios</a> · ${m.code} · ${statusBadge(m.status)}`, `<button class="btn" data-edit>${icon('edit', 16)} Editar</button>${m.status === 'congelado' ? `<button class="btn" data-unfreeze>${icon('snow', 16)} Descongelar</button>` : ''}<button class="btn btn-primary" data-pay>${icon('money', 16)} Cobrar ${money(planPrice(m))}</button>`)}
  <div class="grid-main">
    <div class="stack">
      <div class="card"><h3>Pagos</h3><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Concepto</th><th>Medio</th><th>Monto</th><th>Estado</th></tr></thead><tbody>
        ${pays.map(x => `<tr><td><small>${escape(dateTime(x.at))}</small></td><td>${escape(x.concept)}</td><td><small>${escape(x.method)}</small></td><td>${money(x.amount)}</td><td>${x.status === 'pagado' ? '<span class="badge badge-success">Pagado</span>' : '<span class="badge badge-danger">Fallido</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Sin pagos</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Reservas de clases</h3>${books.map(b => { const c = klass(b.classId); return `<div class="row between small" style="margin-bottom:6px"><span>${b.date} ${c?.time} · ${escape(discipline(c?.disciplineId)?.name)}</span>${bookingBadge(b.status)}</div>`; }).join('') || '<p class="muted mb0">Sin reservas.</p>'}</div>
      ${db.count('progress', x => x.memberId === id) ? progressView(id) : ''}
    </div>
    <div class="stack">
      <div class="card">${kv([['RUT', escape(m.rut)], ['Correo', escape(m.email)], ['Teléfono', escape(m.phone)], ['Plan', `${escape(p?.name)} (${m.billing})`], ['Sede', escape(branch(m.branchId)?.name)], ['Socio desde', m.since], ['Vence', m.nextDue], ['Entrenador', escape(trainer(m.trainerId)?.name || '—')], ['Objetivo', escape(m.goal || '—')], ['Visitas (28 d)', visits.length], ['Última visita', visits[0] ? escape(dateTime(visits[0].at)) : '—']])}</div>
      <div class="card center"><div style="width:150px;margin:0 auto">${qrSvg(m.code)}</div><b class="mono">${m.code}</b></div>
    </div>
  </div>`;
  v.querySelector('[data-edit]').onclick = () => editMember(m);
  v.querySelector('[data-pay]').onclick = () => collectModal(m);
  v.querySelector('[data-unfreeze]')?.addEventListener('click', () => { db.update('members', id, { status: 'activo', freezeUntil: '' }); toast('Membresía reactivada', 'success'); });
}
