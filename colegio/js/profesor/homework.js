// Tareas del profesor: publicar, ver entregas, calificar y retroalimentar.
import { escape, date, dateTime, toast, confirm as ask, modal } from '../../../assets/core/ui.js';
import { pageHead, badge, smartTable, empty, formData } from '../shared/kit.js';
import { course, subject, courseStudents, fullName, gradeSpan, fmtGrade } from '../shared/academic.js';
import { NOW, ymd } from '../shared/school.js';

function hwModal(db, me, h = null) {
  const load = db.query('teaching', t => t.teacherId === me.id);
  const m = modal({
    title: h ? 'Editar tarea' : 'Nueva tarea',
    body: `<form class="form-grid" novalidate>
      <div class="field full"><label for="hw-cs">Curso y asignatura</label><select class="select" id="hw-cs" name="cs">${load.map(t => `<option value="${t.courseId}|${t.subjectId}" ${h && h.courseId === t.courseId && h.subjectId === t.subjectId ? 'selected' : ''}>${escape(course(t.courseId).name)} · ${escape(subject(t.subjectId).short)}</option>`).join('')}</select></div>
      <div class="field full"><label for="hw-t">Título *</label><input class="input" id="hw-t" name="title" required value="${escape(h?.title || '')}"></div>
      <div class="field full"><label for="hw-d">Instrucciones</label><textarea class="textarea" id="hw-d" name="description">${escape(h?.description || '')}</textarea></div>
      <div class="field"><label for="hw-due">Fecha de entrega *</label><input class="input" id="hw-due" type="date" name="due" required value="${h?.due || ymd(new Date(NOW.getTime() + 7 * 864e5))}"></div>
      <div class="field"><label for="hw-f">Material adjunto (simulado)</label><input class="input" id="hw-f" name="attachment" placeholder="guia_ejercicios.pdf" value="${escape(h?.attachment || '')}"></div>
    </form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Publicar</button>'
  });
  m.el.querySelector('[data-ok]').onclick = () => {
    const v = formData(m.el.querySelector('form'));
    if (!v.title || !v.due) return toast('Título y fecha son obligatorios', 'warning');
    const [courseId, subjectId] = v.cs.split('|');
    const data = { courseId, subjectId, teacherId: me.id, title: v.title, description: v.description, due: v.due, attachment: v.attachment };
    if (h) db.update('homework', h.id, data); else db.insert('homework', { ...data, assigned: ymd(NOW), points: 7, submissions: {} });
    db.log('tarea', `Tarea ${h ? 'editada' : 'publicada'}: ${v.title} (${course(courseId).name})`, me.id);
    toast(h ? 'Tarea actualizada' : 'Tarea publicada para estudiantes y apoderados', 'success');
    m.close();
  };
}

export function renderHomework(el, { db, me, router }) {
  const rows = db.query('homework', h => h.teacherId === me.id).map(h => {
    const n = courseStudents(h.courseId).length, subs = Object.values(h.submissions || {});
    return { ...h, courseName: course(h.courseId).name, subjectName: subject(h.subjectId).short, n, delivered: subs.length, pendingReview: subs.filter(s => s.grade == null).length, state: h.due < ymd(NOW) ? 'cerrada' : 'abierta' };
  });
  el.innerHTML = `${pageHead('Tareas', 'Publica tareas y revisa las entregas de tus estudiantes', '<button class="btn btn-primary btn-sm" data-new>+ Nueva tarea</button>')}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'p-hw', rows, search: r => r.title + r.courseName,
    filters: [{ key: 'courseId', label: 'Curso', options: [...new Set(rows.map(r => r.courseId))].map(c => [c, course(c).name]) }, { key: 'state', label: 'Estado', options: [['abierta', 'Abiertas'], ['cerrada', 'Cerradas']] }],
    columns: [
      { key: 'title', label: 'Tarea', render: r => `<b>${escape(r.title)}</b><div class="small muted">${escape(r.courseName)} · ${escape(r.subjectName)}</div>` },
      { key: 'due', label: 'Entrega', render: r => `<span class="nowrap">${date(r.due + 'T12:00')}</span>` },
      { key: 'delivered', label: 'Entregas', render: r => `${r.delivered}/${r.n}<div class="progress" style="width:90px"><i style="--v:${r.n ? r.delivered / r.n * 100 : 0}%"></i></div>` },
      { key: 'pendingReview', label: 'Por revisar', render: r => r.pendingReview ? badge(r.pendingReview, 'warning') : badge('0', 'success') },
      { key: 'state', label: 'Estado', render: r => r.state === 'abierta' ? badge('Abierta', 'primary') : badge('Cerrada') },
      { key: 'x', label: '', sort: false, render: () => '<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>' }
    ],
    onRow: r => router.go('/tareas/' + r.id),
    onAction: async (act, r) => {
      if (act === 'edit') return hwModal(db, me, db.get('homework', r.id));
      if (await ask(`¿Eliminar la tarea "${r.title}"?${r.delivered ? ` Tiene ${r.delivered} entregas.` : ''}`, { danger: true, ok: 'Eliminar' })) { db.remove('homework', r.id); db.log('tarea', `Tarea eliminada: ${r.title}`, me.id); toast('Tarea eliminada', 'success'); }
    }
  });
  el.querySelector('[data-new]').onclick = () => hwModal(db, me);
}

export function renderHomeworkDetail(el, { db, me }, { id }) {
  const h = db.get('homework', id);
  if (!h || h.teacherId !== me.id) { el.innerHTML = empty('Tarea no encontrada'); return; }
  const kids = courseStudents(h.courseId);
  el.innerHTML = `
    ${pageHead(h.title, `${escape(course(h.courseId).name)} · ${escape(subject(h.subjectId).short)} · entrega ${date(h.due + 'T12:00')}`, '<a class="btn btn-ghost btn-sm" href="#/tareas">← Tareas</a>')}
    <div class="card"><p class="mb-0">${escape(h.description || '')}</p>${h.attachment ? `<p class="small muted mb-0">📎 ${escape(h.attachment)}</p>` : ''}</div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Estudiante</th><th>Entrega</th><th>Archivo</th><th>Nota</th><th>Retroalimentación</th><th></th></tr></thead><tbody>
      ${kids.map(k => { const s = h.submissions?.[k.id]; return `<tr data-sid="${k.id}"><td>${escape(fullName(k))}</td>
        <td>${s ? `${badge(s.status === 'atrasada' ? 'Atrasada' : 'Entregada', s.status === 'atrasada' ? 'warning' : 'success')}<div class="small muted">${dateTime(s.at)}</div>` : h.due < ymd(NOW) ? badge('No entregó', 'danger') : badge('Pendiente')}</td>
        <td class="small">${s ? `📎 ${escape(s.file || 'trabajo.pdf')}${s.note ? `<div class="muted">“${escape(s.note)}”</div>` : ''}` : '—'}</td>
        <td>${s ? `<input class="input cell-grade" data-g value="${s.grade != null ? fmtGrade(s.grade) : ''}" inputmode="decimal" aria-label="Nota" style="width:70px;min-height:34px">` : '—'}</td>
        <td>${s ? `<input class="input" data-fb value="${escape(s.feedback || '')}" placeholder="Comentario" style="min-height:34px" aria-label="Retroalimentación">` : ''}</td>
        <td>${s ? '<button class="btn btn-sm" data-save>Guardar</button>' : ''}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;
  el.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    const tr = b.closest('tr'), sid = tr.dataset.sid;
    const g = parseFloat(tr.querySelector('[data-g]').value.replace(',', '.'));
    if (tr.querySelector('[data-g]').value && (isNaN(g) || g < 1 || g > 7)) return toast('La nota debe estar entre 1,0 y 7,0', 'warning');
    const fb = tr.querySelector('[data-fb]').value.trim();
    db.update('homework', id, x => ({ submissions: { ...x.submissions, [sid]: { ...x.submissions[sid], grade: isNaN(g) ? null : Math.round(g * 10) / 10, feedback: fb } } }));
    db.log('tarea', `Entrega revisada: ${h.title} · ${db.get('students', sid).firstName}`, me.id);
    toast('Revisión guardada', 'success');
  });
  void gradeSpan;
}
