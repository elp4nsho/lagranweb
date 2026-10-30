// Estudiantes: CRUD, filtros, ficha con notas, asistencia, anotaciones y pagos.
import { escape, modal, toast, confirm as ask, downloadCSV, date, money, barChart } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, formData, printHTML, avatar } from '../shared/kit.js';
import { course, sortedCourses, fullName, generalAvg, attendanceOf, gradeSpan, pctTxt, riskOf, gradesTable, reportCard, annBadge, user, subject, months, monthLabel, homeworkOf, hwStatus } from '../shared/academic.js';
import { PAY_STATUS, currentSemester, ymd, NOW } from '../shared/school.js';
import { rutFor } from '../data/seed.js';

export function studentModal(db, me, s = null) {
  const courses = sortedCourses();
  const guardians = db.query('users', u => u.role === 'apoderado').sort((a, b) => a.name.localeCompare(b.name));
  const m = modal({
    title: s ? `Editar estudiante` : 'Matricular estudiante', size: 'lg',
    body: `<form class="form-grid" novalidate>
      <div class="field"><label for="s-first">Nombres *</label><input class="input" id="s-first" name="firstName" required value="${escape(s?.firstName || '')}"></div>
      <div class="field"><label for="s-l1">Apellido paterno *</label><input class="input" id="s-l1" name="lastName" required value="${escape(s?.lastName || '')}"></div>
      <div class="field"><label for="s-l2">Apellido materno</label><input class="input" id="s-l2" name="lastName2" value="${escape(s?.lastName2 || '')}"></div>
      <div class="field"><label for="s-rut">RUT *</label><input class="input" id="s-rut" name="rut" required value="${escape(s?.rut || rutFor(23000000 + Math.floor(Math.random() * 900000)))}"></div>
      <div class="field"><label for="s-birth">Fecha de nacimiento</label><input class="input" id="s-birth" name="birth" type="date" value="${escape(s?.birth || '')}"></div>
      <div class="field"><label for="s-gender">Género</label><select class="select" id="s-gender" name="gender"><option value="F" ${s?.gender === 'F' ? 'selected' : ''}>Femenino</option><option value="M" ${s?.gender === 'M' ? 'selected' : ''}>Masculino</option><option value="X" ${s?.gender === 'X' ? 'selected' : ''}>Otro / prefiere no decir</option></select></div>
      <div class="field"><label for="s-course">Curso *</label><select class="select" id="s-course" name="courseId">${courses.map(c => `<option value="${c.id}" ${s?.courseId === c.id ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="s-status">Estado</label><select class="select" id="s-status" name="status">${[['activo', 'Activo'], ['retirado', 'Retirado']].map(([v, l]) => `<option value="${v}" ${s?.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field full"><label for="s-guardian">Apoderado/a</label><select class="select" id="s-guardian" name="guardianId"><option value="__new">+ Crear nuevo apoderado…</option>${guardians.map(g => `<option value="${g.id}" ${s?.guardianId === g.id ? 'selected' : ''}>${escape(g.name)} · ${escape(g.email)}</option>`).join('')}</select></div>
      <div class="field" data-newg><label for="s-gname">Nombre apoderado/a</label><input class="input" id="s-gname" name="gName"></div>
      <div class="field" data-newg><label for="s-gemail">Correo apoderado/a</label><input class="input" id="s-gemail" name="gEmail" type="email"></div>
      <div class="field full"><label for="s-health">Antecedentes de salud</label><input class="input" id="s-health" name="health" value="${escape(s?.health || '')}"></div>
      <label class="check full"><input type="checkbox" name="pie" ${s?.pie ? 'checked' : ''}> Pertenece al Programa de Integración Escolar (PIE)</label>
    </form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>'
  });
  const f = m.el.querySelector('form'), gsel = f.elements.guardianId;
  if (!s) gsel.value = guardians[0] ? '__new' : '__new';
  const toggleNew = () => m.el.querySelectorAll('[data-newg]').forEach(x => x.classList.toggle('hide', gsel.value !== '__new'));
  gsel.addEventListener('change', toggleNew); toggleNew();
  m.el.querySelector('[data-save]').onclick = () => {
    const v = formData(f);
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim(); i.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (v.guardianId === '__new' && (!v.gName || !v.gEmail)) { ok = false; f.elements.gName.classList.add('invalid'); f.elements.gEmail.classList.add('invalid'); }
    if (!ok) return toast('Completa los campos obligatorios', 'warning');
    if (db.find('students', x => x.rut.replace(/\./g, '') === v.rut.replace(/\./g, '') && x.id !== s?.id)) return toast('Ya existe un estudiante con ese RUT', 'error');
    let gid = v.guardianId;
    if (gid === '__new') {
      if (db.find('users', u => u.email.toLowerCase() === v.gEmail.toLowerCase())) return toast('El correo del apoderado ya existe; selecciónalo de la lista', 'error');
      gid = db.insert('users', { name: v.gName, email: v.gEmail, password: 'apoderado123', role: 'apoderado', active: true, color: '#0d9488', children: [] }).id;
    }
    const data = { firstName: v.firstName, lastName: v.lastName, lastName2: v.lastName2, rut: v.rut, birth: v.birth, gender: v.gender, courseId: v.courseId, status: v.status, guardianId: gid, health: v.health, pie: !!v.pie };
    let id = s?.id;
    if (s) {
      if (s.guardianId !== gid) { const old = db.get('users', s.guardianId); if (old) db.update('users', old.id, { children: (old.children || []).filter(c => c !== s.id) }); }
      db.update('students', s.id, data);
    } else id = db.insert('students', { ...data, enrolled: ymd(NOW) }).id;
    const g = db.get('users', gid);
    if (!(g.children || []).includes(id)) db.update('users', gid, { children: [...(g.children || []), id] });
    db.log('estudiante', `${s ? 'Ficha actualizada' : 'Matrícula'}: ${v.firstName} ${v.lastName} (${course(v.courseId).name})`, me.id);
    toast(s ? 'Ficha actualizada' : 'Estudiante matriculado', 'success');
    m.close();
  };
}

export function render(el, { db, me, isAdmin, go }) {
  const rows = db.all('students').map(s => { const r = riskOf(s.id); return { ...s, name: fullName(s), courseName: course(s.courseId).name, grade: course(s.courseId).grade, avg: r.avg, att: r.att, risk: r.level || '', guardian: user(s.guardianId)?.name || '—' }; });
  el.innerHTML = `${pageHead('Estudiantes', `${rows.filter(r => r.status === 'activo').length} estudiantes activos`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Matricular</button>`)}<div class="card" data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    id: 'students', rows, pageSize: 12, search: r => r.name + r.rut + r.guardian,
    filters: [
      { key: 'courseId', label: 'Curso', options: sortedCourses().map(c => [c.id, c.name]) },
      { key: 'status', label: 'Estado', options: [['activo', 'Activos'], ['retirado', 'Retirados']] },
      { key: 'risk', label: 'Riesgo', options: [['alto', 'Alto'], ['medio', 'Medio'], ['__any', 'Cualquiera']], test: (r, v) => v === '__any' ? !!r.risk : r.risk === v }
    ],
    columns: [
      { key: 'name', label: 'Estudiante', render: r => `<div class="cell-user">${avatar({ name: r.firstName + ' ' + r.lastName, color: r.gender === 'F' ? 'var(--accent)' : 'var(--primary)' }, 32)}<span><b>${escape(r.name)}</b><small>${escape(r.rut)}</small></span></div>` },
      { key: 'courseName', label: 'Curso', sort: r => r.grade },
      { key: 'avg', label: 'Promedio', render: r => gradeSpan(r.avg) },
      { key: 'att', label: 'Asistencia', render: r => `<span class="${r.att < 85 ? 'text-danger' : ''}">${pctTxt(r.att)}</span>` },
      { key: 'risk', label: 'Riesgo', render: r => r.risk ? badge(r.risk === 'alto' ? 'Alto' : 'Medio', r.risk === 'alto' ? 'danger' : 'warning') : '<span class="muted small">—</span>' },
      { key: 'status', label: 'Estado', render: r => r.status === 'activo' ? badge('Activo', 'success') : badge('Retirado') },
      { key: 'x', label: '', sort: false, render: () => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button>${isAdmin ? '<button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button>' : ''}</div>` }
    ],
    onRow: r => go('/estudiantes/' + r.id),
    onAction: async (act, r) => {
      if (act === 'edit') return studentModal(db, me, db.get('students', r.id));
      if (await ask(`¿Eliminar definitivamente a ${r.name}? Para conservar su historial, mejor márcalo como "Retirado".`, { danger: true, ok: 'Eliminar' })) {
        const g = db.get('users', r.guardianId); if (g) db.update('users', g.id, { children: (g.children || []).filter(c => c !== r.id) });
        db.remove('students', r.id); db.log('estudiante', `Estudiante eliminado: ${r.name}`, me.id); toast('Estudiante eliminado', 'success');
      }
    }
  });
  el.querySelector('[data-new]').onclick = () => studentModal(db, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('estudiantes.csv', t.filtered().map(r => ({ nombre: r.name, rut: r.rut, curso: r.courseName, promedio: r.avg ?? '', asistencia: r.att != null ? r.att.toFixed(1) : '', riesgo: r.risk, apoderado: r.guardian, estado: r.status })));
}

let tab = 'notas', sem = null;
export function detail(el, ctx, id) {
  const { db, me } = ctx;
  const s = db.get('students', id);
  if (!s) { el.innerHTML = '<div class="empty">Estudiante no encontrado</div>'; return; }
  sem ||= currentSemester();
  const g = user(s.guardianId), att = attendanceOf(id), risk = riskOf(id), c = course(s.courseId);
  el.innerHTML = `
    ${pageHead(fullName(s), `${escape(c.name)} · RUT ${escape(s.rut)} ${s.pie ? '· ' + badge('PIE', 'info') : ''} ${s.status !== 'activo' ? badge('Retirado') : ''}`, `<a class="btn btn-ghost btn-sm" href="#/estudiantes">← Estudiantes</a><button class="btn btn-sm" data-edit>Editar ficha</button><button class="btn btn-sm btn-primary" data-print>⎙ Informe de notas</button>`)}
    ${risk.level ? `<div class="notice ${risk.level === 'alto' ? 'danger' : 'warn'}"><b>Riesgo ${risk.level}:</b> ${escape(risk.reasons.join(' · '))}</div>` : ''}
    <div class="kpi-row">
      <div class="card stat"><span class="label">Promedio anual</span><span class="value">${gradeSpan(generalAvg(id))}</span></div>
      <div class="card stat"><span class="label">Asistencia</span><span class="value ${att.pct < 85 ? 'text-danger' : ''}">${pctTxt(att.pct)}</span><span class="small muted">${att.absent} inasistencias · ${att.late} atrasos</span></div>
      <div class="card stat"><span class="label">Anotaciones</span><span class="value">${db.count('annotations', a => a.studentId === id)}</span><span class="small muted">${db.count('annotations', a => a.studentId === id && a.type === 'positiva')} positivas</span></div>
      <div class="card stat"><span class="label">Apoderado/a</span><span class="value" style="font-size:18px">${escape(g?.name || '—')}</span><span class="small muted">${escape(g?.phone || '')}</span></div>
    </div>
    <div class="tabs" role="tablist">${[['notas', 'Notas'], ['asistencia', 'Asistencia'], ['anotaciones', 'Anotaciones'], ['tareas', 'Tareas'], ['pagos', 'Pagos'], ['ficha', 'Ficha']].map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div data-body></div>`;
  const body = el.querySelector('[data-body]');
  if (tab === 'notas') {
    body.innerHTML = `<div class="card stack"><div class="row">${[1, 2].map(x => `<button class="chip ${sem === x ? 'active' : ''}" data-sem="${x}">${x}° semestre</button>`).join('')}</div>${gradesTable(id, sem)}<p class="small muted mb-0">Notas en rojo bajo 4,0. Pasa el cursor sobre una nota para ver la evaluación y su ponderación.</p></div>`;
    body.querySelectorAll('[data-sem]').forEach(b => b.onclick = () => { sem = +b.dataset.sem; detail(el, ctx, id); });
  } else if (tab === 'asistencia') {
    const data = months().map(m => { const x = att.byMonth[m]; return { label: monthLabel(m), value: x && x.days ? Math.round((1 - x.absent / x.days) * 100) : 0, color: x && x.days && (1 - x.absent / x.days) < .85 ? 'var(--danger)' : null }; }).filter(d => d.value);
    const recent = db.query('sessions', x => x.courseId === s.courseId && x.abs?.[id]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    body.innerHTML = `<div class="grid-2"><div class="card"><h3>Asistencia mensual (%)</h3>${barChart(data, { format: v => v + '%' })}</div>
      <div class="card"><h3>Registros recientes</h3><ul class="list compact">${recent.map(x => `<li>${x.abs[id] === 'A' ? badge('Ausente', 'danger') : badge('Atraso', 'warning')}<span class="small">${date(x.date + 'T12:00')} · Bloque ${x.block + 1} · ${escape(subject(x.subjectId).short)}</span></li>`).join('') || '<li class="muted">Sin inasistencias en las últimas semanas.</li>'}</ul></div></div>`;
  } else if (tab === 'anotaciones') {
    const list = db.query('annotations', a => a.studentId === id).sort((a, b) => b.date.localeCompare(a.date));
    body.innerHTML = `<div class="card"><div class="card-head"><h3>Hoja de vida</h3><button class="btn btn-sm btn-primary" data-ann>+ Registrar anotación</button></div><ul class="list">${list.map(a => `<li>${annBadge(a.type)}<span><b class="small">${date(a.date + 'T12:00')} · ${escape(subject(a.subjectId).short)} · ${escape(user(a.teacherId)?.name || '')}</b><br>${escape(a.text)}</span></li>`).join('') || '<li class="muted">Sin anotaciones</li>'}</ul></div>`;
    body.querySelector('[data-ann]').onclick = () => annotationModal(db, me, s);
  } else if (tab === 'tareas') {
    const hw = homeworkOf(s.courseId);
    body.innerHTML = `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Tarea</th><th>Asignatura</th><th>Entrega</th><th>Estado</th><th>Nota</th></tr></thead><tbody>${hw.map(h => { const [l, k, sub] = hwStatus(h, id); return `<tr><td>${escape(h.title)}</td><td>${escape(subject(h.subjectId).short)}</td><td class="nowrap">${date(h.due + 'T12:00')}</td><td>${badge(l, k)}</td><td>${sub?.grade != null ? gradeSpan(sub.grade) : '—'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  } else if (tab === 'pagos') {
    const pays = db.query('payments', p => p.studentId === id).sort((a, b) => a.month.localeCompare(b.month));
    body.innerHTML = `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Mes</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th>Pagado</th></tr></thead><tbody>${pays.map(p => `<tr><td style="text-transform:capitalize">${monthLabel(p.month)}</td><td>${money(p.amount)}${p.beca ? ' ' + badge('Beca 50%', 'info') : ''}</td><td>${date(p.due + 'T12:00')}</td><td>${badge(...PAY_STATUS[p.status])}</td><td class="small">${p.paidAt ? date(p.paidAt) + ' · ' + escape(p.method) : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else {
    body.innerHTML = `<div class="grid-2"><div class="card"><h3>Datos del estudiante</h3><dl class="dl"><dt>Nombre</dt><dd>${escape(fullName(s))}</dd><dt>RUT</dt><dd>${escape(s.rut)}</dd><dt>Nacimiento</dt><dd>${s.birth ? date(s.birth + 'T12:00') : '—'}</dd><dt>Dirección</dt><dd>${escape(s.address || '—')}</dd><dt>Salud</dt><dd>${escape(s.health || 'Sin antecedentes')}</dd><dt>Ingreso</dt><dd>${s.enrolled ? date(s.enrolled + 'T12:00') : '—'}</dd></dl></div>
      <div class="card"><h3>Apoderado/a</h3><dl class="dl"><dt>Nombre</dt><dd>${escape(g?.name || '—')}</dd><dt>Correo</dt><dd>${escape(g?.email || '—')}</dd><dt>Teléfono</dt><dd>${escape(g?.phone || '—')}</dd><dt>Pupilos</dt><dd>${(g?.children || []).map(cid => db.get('students', cid)).filter(Boolean).map(k => `<a href="#/estudiantes/${k.id}">${escape(k.firstName)}</a>`).join(', ')}</dd></dl>${g ? `<a class="btn btn-sm" href="#/apoderados/${g.id}" style="margin-top:12px">Ver apoderado</a>` : ''}</div></div>`;
  }
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; detail(el, ctx, id); });
  el.querySelector('[data-edit]').onclick = () => studentModal(db, me, s);
  el.querySelector('[data-print]').onclick = () => printHTML(reportCard(id));
}

export function annotationModal(db, me, s, defaults = {}) {
  const subs = db.query('teaching', t => t.courseId === s.courseId);
  const m = modal({
    title: `Anotación · ${s.firstName} ${s.lastName}`,
    body: `<form class="stack" novalidate>
      <div class="row" role="radiogroup" aria-label="Tipo">${[['positiva', 'Positiva'], ['negativa', 'Negativa'], ['observacion', 'Observación']].map(([v, l], i) => `<label class="check chip"><input type="radio" name="type" value="${v}" ${(defaults.type || 'positiva') === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="field"><label for="an-sub">Asignatura</label><select class="select" id="an-sub" name="subjectId">${subs.map(t => `<option value="${t.subjectId}" ${defaults.subjectId === t.subjectId ? 'selected' : ''}>${escape(subject(t.subjectId).name)}</option>`).join('')}</select></div>
      <div class="field"><label for="an-text">Descripción *</label><textarea class="textarea" id="an-text" name="text" required></textarea></div>
      <label class="check"><input type="checkbox" name="notify" checked> Notificar al apoderado/a</label>
    </form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Registrar</button>'
  });
  m.el.querySelector('[data-save]').onclick = () => {
    const v = formData(m.el.querySelector('form'));
    if (!v.text) { m.el.querySelector('textarea').classList.add('invalid'); return toast('Escribe la descripción', 'warning'); }
    db.insert('annotations', { studentId: s.id, courseId: s.courseId, subjectId: v.subjectId, teacherId: me.role === 'profesor' ? me.id : db.get('teaching', `${s.courseId}|${v.subjectId}`)?.teacherId, type: v.type, text: v.text, date: ymd(NOW), seenByGuardian: false, notified: !!v.notify, by: me.id });
    db.log('anotacion', `Anotación ${v.type} a ${s.firstName} ${s.lastName}`, me.id);
    toast('Anotación registrada' + (v.notify ? ' y notificada al apoderado' : ''), 'success');
    m.close();
  };
}
