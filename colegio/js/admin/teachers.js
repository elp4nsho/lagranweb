// Docentes: CRUD, carga horaria y asignaciones curso/asignatura.
import { escape, modal, toast, confirm as ask, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, avatar, formData } from '../shared/kit.js';
import { course, subject, scheduleGrid, courseAvg, gradeSpan, sortedCourses } from '../shared/academic.js';

const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb', '#db2777'];

export function teacherModal(db, me, t = null) {
  const subs = db.query('subjects', s => s.active !== false);
  const m = modal({
    title: t ? `Editar docente` : 'Nuevo docente', size: 'lg',
    body: `<form class="form-grid" novalidate>
      <div class="field"><label for="t-name">Nombre completo *</label><input class="input" id="t-name" name="name" required value="${escape(t?.name || '')}"></div>
      <div class="field"><label for="t-title">Cargo</label><input class="input" id="t-title" name="title" value="${escape(t?.title || 'Profesor/a')}"></div>
      <div class="field"><label for="t-email">Correo institucional *</label><input class="input" id="t-email" name="email" type="email" required value="${escape(t?.email || '')}"></div>
      <div class="field"><label for="t-phone">Teléfono</label><input class="input" id="t-phone" name="phone" value="${escape(t?.phone || '')}"></div>
      ${t ? '' : '<div class="field"><label for="t-pass">Contraseña inicial *</label><input class="input" id="t-pass" name="password" value="profe123" required></div>'}
      <div class="field full"><span class="label">Especialidades</span><div class="row" style="gap:8px">${subs.map(s => `<label class="check chip"><input type="checkbox" name="sub_${s.id}" ${(t?.subjects || []).includes(s.id) ? 'checked' : ''}> ${escape(s.short)}</label>`).join('')}</div></div>
    </form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>'
  });
  m.el.querySelector('[data-save]').onclick = () => {
    const f = m.el.querySelector('form'), v = formData(f);
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim(); i.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Completa los campos obligatorios', 'warning');
    if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase() && u.id !== t?.id)) return toast('Ese correo ya está registrado', 'error');
    const subjects = subs.filter(s => v['sub_' + s.id]).map(s => s.id);
    const data = { name: v.name, title: v.title, email: v.email, phone: v.phone, subjects };
    if (t) db.update('users', t.id, data);
    else db.insert('users', { ...data, password: v.password, role: 'profesor', active: true, color: COLORS[db.count('users') % COLORS.length] });
    db.log('docente', `Docente ${v.name} ${t ? 'actualizado' : 'creado'}`, me.id);
    toast(t ? 'Docente actualizado' : 'Docente creado. Ya puede ingresar con su correo.', 'success');
    m.close();
  };
}

export function render(el, { db, me, isAdmin, go }) {
  const rows = db.query('users', u => u.role === 'profesor').map(u => {
    const load = db.query('teaching', t => t.teacherId === u.id);
    return { ...u, hours: db.count('schedule', x => x.teacherId === u.id), nCourses: new Set(load.map(t => t.courseId)).size, head: db.find('courses', c => c.headTeacherId === u.id)?.name || '', subjectsTxt: (u.subjects || []).map(s => subject(s).short).join(', '), status: u.active !== false ? 'activo' : 'inactivo' };
  });
  el.innerHTML = `${pageHead('Docentes', `${rows.filter(r => r.status === 'activo').length} docentes activos`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Nuevo docente</button>`)}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'teachers', rows, search: r => r.name + r.email + r.subjectsTxt,
    filters: [{ key: 'status', label: 'Estado', options: [['activo', 'Activos'], ['inactivo', 'Inactivos']] }, { key: 'sub', label: 'Especialidad', options: db.all('subjects').map(s => [s.id, s.short]), test: (r, v) => (r.subjects || []).includes(v) }],
    columns: [
      { key: 'name', label: 'Docente', render: r => `<div class="cell-user">${avatar(r)}<span><b>${escape(r.name)}</b><small>${escape(r.title || '')}</small></span></div>` },
      { key: 'subjectsTxt', label: 'Especialidades', render: r => `<span class="small">${escape(r.subjectsTxt || '—')}</span>` },
      { key: 'nCourses', label: 'Cursos' },
      { key: 'hours', label: 'Bloques/sem.', render: r => `${r.hours} <div class="progress" style="width:80px"><i style="--v:${Math.min(100, r.hours / 30 * 100)}%"></i></div>` },
      { key: 'head', label: 'Jefatura', render: r => r.head ? badge(r.head, 'primary') : '<span class="muted small">—</span>' },
      { key: 'status', label: 'Estado', render: r => r.status === 'activo' ? badge('Activo', 'success') : badge('Inactivo') },
      { key: 'x', label: '', sort: false, render: r => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button>${isAdmin ? `<button class="btn btn-sm btn-ghost" data-act="toggle">${r.status === 'activo' ? 'Desactivar' : 'Activar'}</button>` : ''}</div>` }
    ],
    onRow: r => go('/docentes/' + r.id),
    onAction: async (act, r) => {
      if (act === 'edit') return teacherModal(db, me, db.get('users', r.id));
      if (act === 'toggle') {
        const on = r.status !== 'activo';
        if (!on && !await ask(`¿Desactivar a ${r.name}? No podrá ingresar a Aula360.`, { danger: true, ok: 'Desactivar' })) return;
        db.update('users', r.id, { active: on }); db.log('docente', `${r.name} ${on ? 'activado' : 'desactivado'}`, me.id); toast(on ? 'Docente activado' : 'Docente desactivado', 'success');
      }
    }
  });
  el.querySelector('[data-new]').onclick = () => teacherModal(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('docentes.csv', rows.map(r => ({ nombre: r.name, correo: r.email, cargo: r.title, especialidades: r.subjectsTxt, cursos: r.nCourses, bloques: r.hours, jefatura: r.head, estado: r.status })));
}

export function detail(el, { db, me }, id) {
  const t = db.get('users', id);
  if (!t || t.role !== 'profesor') { el.innerHTML = '<div class="empty">Docente no encontrado</div>'; return; }
  const load = db.query('teaching', x => x.teacherId === id);
  const courses = sortedCourses(), subs = db.query('subjects', s => s.active !== false);
  el.innerHTML = `
    ${pageHead(t.name, `${escape(t.title || '')} · ${escape(t.email)}`, `<a class="btn btn-ghost btn-sm" href="#/docentes">← Docentes</a><button class="btn btn-sm" data-edit>Editar</button>`)}
    <div class="split">
      <div class="card"><div class="card-head"><h3>Asignaciones</h3><span class="small muted">${load.length} curso-asignatura</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Curso</th><th>Asignatura</th><th>Promedio</th><th></th></tr></thead><tbody>
        ${load.map(x => `<tr><td>${escape(course(x.courseId).name)}</td><td>${escape(subject(x.subjectId).short)}</td><td>${gradeSpan(courseAvg(x.courseId, x.subjectId))}</td><td><button class="btn btn-sm btn-ghost" data-rm="${x.id}">Reasignar…</button></td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">Sin asignaciones</div></td></tr>'}
        </tbody></table></div>
        <form class="row" style="margin-top:12px" data-assign>
          <select class="select" name="course" style="max-width:180px" aria-label="Curso">${courses.map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('')}</select>
          <select class="select" name="subject" style="max-width:200px" aria-label="Asignatura">${subs.map(s => `<option value="${s.id}" ${(t.subjects || [])[0] === s.id ? 'selected' : ''}>${escape(s.short)}</option>`).join('')}</select>
          <button class="btn btn-sm btn-primary">Asignar</button>
        </form>
      </div>
      <div class="card"><h3>Ficha</h3><dl class="dl"><dt>Correo</dt><dd>${escape(t.email)}</dd><dt>Teléfono</dt><dd>${escape(t.phone || '—')}</dd><dt>Especialidades</dt><dd>${escape((t.subjects || []).map(s => subject(s).short).join(', ') || '—')}</dd><dt>Jefatura</dt><dd>${escape(db.find('courses', c => c.headTeacherId === id)?.name || '—')}</dd><dt>Estado</dt><dd>${t.active !== false ? badge('Activo', 'success') : badge('Inactivo')}</dd></dl></div>
    </div>
    <div class="card"><h3>Horario del docente</h3>${scheduleGrid(null, { teacherId: id })}</div>`;
  el.querySelector('[data-edit]').onclick = () => teacherModal(db, me, t);
  el.querySelector('[data-assign]').addEventListener('submit', e => {
    e.preventDefault();
    const v = formData(e.currentTarget), key = `${v.course}|${v.subject}`;
    const ex = db.get('teaching', key);
    if (ex) db.update('teaching', key, { teacherId: id }); else db.insert('teaching', { id: key, courseId: v.course, subjectId: v.subject, teacherId: id });
    db.query('schedule', x => x.courseId === v.course && x.subjectId === v.subject).forEach(x => db.update('schedule', x.id, { teacherId: id }));
    db.log('asignacion', `${subject(v.subject).short} de ${course(v.course).name} asignada a ${t.name}`, me.id);
    toast('Asignación guardada', 'success');
  });
  el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { location.hash = '#/cursos/' + db.get('teaching', b.dataset.rm).courseId; }));
}
