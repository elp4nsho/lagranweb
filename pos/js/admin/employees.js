// Empleados y turnos: asignación a sucursal y jornada, PIN de caja y desempeño en turnos de caja.
import { html, raw, money, dateTime, toast, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, branchName } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log, me } from '../shared/common.js';

const JORNADAS = { 'Mañana': '07:00 – 15:00', 'Tarde': '15:00 – 22:00', 'Completo': '09:00 – 18:00' };

export function render(el) {
  const shifts = db.all('shifts');
  const rows = db.query('users', u => u.role !== 'admin' || u.branchId).concat(db.query('users', u => u.role === 'admin' && !u.branchId)).map(u => {
    const my = shifts.filter(s => s.userId === u.id);
    const closed = my.filter(s => s.status === 'cerrado');
    return { ...u, roleName: auth.roleName(u.role), bname: u.branchId ? branchName(u.branchId) : 'Todas', nShifts: my.length, sold: my.reduce((a, s) => a + (s.salesTotal || 0), 0), diff: closed.reduce((a, s) => a + (s.difference || 0), 0), withDiff: closed.filter(s => s.difference).length, open: my.some(s => s.status === 'abierto'), active: u.active !== false };
  });
  const isAdmin = me().role === 'admin';
  const today = Object.keys(JORNADAS).map(j => ({ j, people: rows.filter(r => r.active && r.shift === j) }));
  el.innerHTML = html`${raw(pageHead('Empleados y turnos', 'Jornadas, sucursal asignada y resultados en caja de cada persona.', '<button class="btn" data-csv>⬇ CSV</button>'))}
    <div class="cols-3">${today.map(t => raw(html`<div class="card"><div class="card-head"><h3>${t.j}</h3><span class="small muted">${JORNADAS[t.j]}</span></div><div class="row" style="gap:6px">${t.people.map(p => raw(html`<span class="avatar" style="--av:${p.color};--size:32px" title="${p.name} · ${p.bname}">${initials(p.name)}</span>`))}</div><small class="muted">${t.people.length} persona(s)</small></div>`))}</div>
    <div data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'employees', rows, search: r => `${r.name} ${r.email} ${r.bname}`, defaultSort: { key: 'sold', dir: -1 },
    filters: [{ key: 'branchId', label: 'Sucursal', options: db.all('branches').map(b => [b.id, b.name]) }, { key: 'role', label: 'Rol', options: Object.entries(auth.roles) }, { key: 'shift', label: 'Jornada', options: Object.keys(JORNADAS).map(j => [j, j]) }],
    columns: [
      { key: 'name', label: 'Persona', render: r => html`<div class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar" style="--av:${r.color}">${initials(r.name)}</span><span><b>${r.name}</b>${!r.active ? raw(' <span class="badge plain">Inactivo</span>') : ''}<br><small class="muted">${r.roleName}</small></span></div>` },
      { key: 'bname', label: 'Sucursal' },
      { key: 'shift', label: 'Jornada', render: r => html`${r.shift || '—'}<br><small class="muted">${JORNADAS[r.shift] || ''}</small>` },
      { key: 'nShifts', label: 'Turnos de caja', render: r => `${r.nShifts}${r.open ? ' <span class="badge badge-success">En caja</span>' : ''}` },
      { key: 'sold', label: 'Vendido', render: r => r.sold ? `<b>${money(r.sold)}</b>` : '<span class="muted">—</span>' },
      { key: 'diff', label: 'Dif. acumulada', render: r => r.withDiff ? `<span style="color:var(--${r.diff < 0 ? 'danger' : 'warning'})">${money(r.diff)}</span><br><small class="muted">${r.withDiff} cierre(s) con dif.</small>` : '<span class="badge badge-success">Sin diferencias</span>' },
      { key: 'act', label: '', sort: false, class: 'actions', render: r => `<button class="btn btn-sm" data-assign="${r.id}">Asignar</button>` }
    ]
  });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-csv]')) exportCSV('empleados', t.filtered().map(r => ({ nombre: r.name, rol: r.roleName, sucursal: r.bname, jornada: r.shift, turnos_caja: r.nShifts, vendido: r.sold, diferencia: r.diff })));
    const a = e.target.closest('[data-assign]');
    if (a) {
      const u = db.get('users', a.dataset.assign);
      const fields = [
        { name: 'branchId', label: 'Sucursal', type: 'select', value: u.branchId || '', options: [['', 'Todas (casa matriz)'], ...db.all('branches').map(b => [b.id, b.name])] },
        { name: 'shift', label: 'Jornada', type: 'select', value: u.shift, options: Object.keys(JORNADAS).map(j => [j, `${j} (${JORNADAS[j]})`]) }
      ];
      if (isAdmin) fields.push({ name: 'pin', label: 'PIN de caja (4 dígitos)', value: u.pin || '' });
      const v = await formModal({ title: `Asignar · ${u.name}`, fields });
      if (!v) return;
      if (v.pin !== undefined && v.pin && !/^\d{4}$/.test(v.pin)) return toast('El PIN debe tener 4 dígitos', 'warning');
      db.update('users', u.id, { ...v, branchId: v.branchId || null });
      log('empleados', `${u.name}: ${v.branchId ? branchName(v.branchId) : 'todas'} · jornada ${v.shift}`);
      toast('Asignación guardada', 'success');
    }
  });
}
