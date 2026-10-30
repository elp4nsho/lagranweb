// Apoderados: CRUD, vínculo con pupilos, estado de pagos y comunicaciones.
import { escape, formModal, toast, confirm as ask, downloadCSV, date, money } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, avatar } from '../shared/kit.js';
import { course, fullName, commsFor, monthLabel } from '../shared/academic.js';
import { PAY_STATUS, MEET_STATUS } from '../shared/school.js';

async function edit(db, me, g = null) {
  const v = await formModal({
    title: g ? 'Editar apoderado/a' : 'Nuevo apoderado/a', fields: [
      { name: 'name', label: 'Nombre completo', required: true, value: g?.name },
      { name: 'rut', label: 'RUT', value: g?.rut },
      { name: 'email', label: 'Correo', type: 'email', required: true, value: g?.email },
      { name: 'phone', label: 'Teléfono', value: g?.phone },
      ...(g ? [] : [{ name: 'password', label: 'Contraseña inicial', required: true, value: 'apoderado123' }]),
      { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: g ? g.active !== false : true }
    ]
  });
  if (!v) return;
  if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase() && u.id !== g?.id)) return toast('Ese correo ya está registrado', 'error');
  if (g) db.update('users', g.id, v); else db.insert('users', { ...v, role: 'apoderado', children: [], color: '#0d9488' });
  db.log('apoderado', `Apoderado ${v.name} ${g ? 'actualizado' : 'creado'}`, me.id);
  toast(g ? 'Apoderado actualizado' : 'Apoderado creado', 'success');
}

export function render(el, { db, me, isAdmin, go }) {
  const rows = db.query('users', u => u.role === 'apoderado').map(g => {
    const kids = (g.children || []).map(id => db.get('students', id)).filter(Boolean);
    const overdue = db.count('payments', p => p.guardianId === g.id && p.status === 'vencido');
    return { ...g, kids: kids.map(k => `${k.firstName} (${course(k.courseId).name})`).join(', '), nKids: kids.length, overdue, status: g.active !== false ? 'activo' : 'inactivo', courseIds: kids.map(k => k.courseId) };
  });
  el.innerHTML = `${pageHead('Apoderados', `${rows.length} familias registradas`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Nuevo apoderado</button>`)}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'guardians', rows, pageSize: 12, search: r => r.name + r.email + r.kids + (r.rut || ''),
    filters: [
      { key: 'course', label: 'Curso pupilo', options: db.all('courses').sort((a, b) => a.grade - b.grade).map(c => [c.id, c.name]), test: (r, v) => r.courseIds.includes(v) },
      { key: 'pay', label: 'Pagos', options: [['mora', 'Con cuotas vencidas'], ['ok', 'Al día']], test: (r, v) => v === 'mora' ? r.overdue > 0 : r.overdue === 0 }
    ],
    columns: [
      { key: 'name', label: 'Apoderado/a', render: r => `<div class="cell-user">${avatar(r, 32)}<span><b>${escape(r.name)}</b><small>${escape(r.email)}</small></span></div>` },
      { key: 'kids', label: 'Pupilos', render: r => `<span class="small">${escape(r.kids || '—')}</span>` },
      { key: 'phone', label: 'Teléfono', render: r => `<span class="nowrap small">${escape(r.phone || '—')}</span>` },
      { key: 'overdue', label: 'Pagos', render: r => r.overdue ? badge(`${r.overdue} vencida${r.overdue > 1 ? 's' : ''}`, 'danger') : badge('Al día', 'success') },
      { key: 'status', label: 'Cuenta', render: r => r.status === 'activo' ? badge('Activa', 'success') : badge('Inactiva') },
      { key: 'x', label: '', sort: false, render: r => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button>${isAdmin && !r.nKids ? '<button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button>' : ''}</div>` }
    ],
    onRow: r => go('/apoderados/' + r.id),
    onAction: async (act, r) => {
      if (act === 'edit') return edit(db, me, db.get('users', r.id));
      if (await ask(`¿Eliminar la cuenta de ${r.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('users', r.id); db.log('apoderado', `Apoderado eliminado: ${r.name}`, me.id); toast('Apoderado eliminado', 'success'); }
    }
  });
  el.querySelector('[data-new]').onclick = () => edit(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('apoderados.csv', rows.map(r => ({ nombre: r.name, rut: r.rut || '', correo: r.email, telefono: r.phone || '', pupilos: r.kids, cuotas_vencidas: r.overdue })));
}

export function detail(el, { db, me }, id) {
  const g = db.get('users', id);
  if (!g || g.role !== 'apoderado') { el.innerHTML = '<div class="empty">Apoderado no encontrado</div>'; return; }
  const kids = (g.children || []).map(k => db.get('students', k)).filter(Boolean);
  const pays = db.query('payments', p => p.guardianId === id && p.status !== 'futuro').sort((a, b) => b.month.localeCompare(a.month));
  const comms = commsFor(kids.map(k => k.courseId));
  const meets = db.query('meetings', m => m.guardianId === id);
  el.innerHTML = `
    ${pageHead(g.name, `${escape(g.email)} · ${escape(g.phone || '')}`, `<a class="btn btn-ghost btn-sm" href="#/apoderados">← Apoderados</a><button class="btn btn-sm" data-edit>Editar</button>`)}
    <div class="grid-3">
      <div class="card"><h3>Pupilos</h3><ul class="list compact">${kids.map(k => `<li><a href="#/estudiantes/${k.id}">${escape(fullName(k))}</a><span class="small muted">${escape(course(k.courseId).name)}</span></li>`).join('') || '<li class="muted">Sin pupilos asociados</li>'}</ul></div>
      <div class="card"><h3>Comunicados</h3><p class="big-num">${comms.filter(c => c.reads?.[id]).length}/${comms.length}</p><p class="small muted">leídos con acuse de recibo</p></div>
      <div class="card"><h3>Entrevistas</h3><ul class="list compact">${meets.map(m => `<li>${badge(...MEET_STATUS[m.status])}<span class="small">${escape(m.reason)}<br><span class="muted">${date(m.preferred + 'T12:00')} ${m.slot}</span></span></li>`).join('') || '<li class="muted">Sin solicitudes</li>'}</ul></div>
    </div>
    <div class="card"><h3>Mensualidades</h3><div class="table-wrap"><table class="table"><thead><tr><th>Mes</th><th>Estudiante</th><th>Monto</th><th>Estado</th></tr></thead><tbody>
    ${pays.map(p => `<tr><td style="text-transform:capitalize">${monthLabel(p.month)}</td><td>${escape(db.get('students', p.studentId)?.firstName || '')}</td><td>${money(p.amount)}</td><td>${badge(...PAY_STATUS[p.status])}</td></tr>`).join('')}</tbody></table></div></div>`;
  el.querySelector('[data-edit]').onclick = () => edit(db, me, g);
}
