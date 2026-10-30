// Admisión: revisión de postulaciones con flujo de estados, entrevistas y matrícula.
import { escape, modal, toast, confirm as ask, downloadCSV, date, dateTime } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, hBars, formData } from '../shared/kit.js';
import { site, sortedCourses, course } from '../shared/academic.js';
import { ADM_STATUS, GRADES_APPLY, ymd, NOW } from '../shared/school.js';

const NEXT = {
  recibida: [['revision', 'Iniciar revisión', 'btn-primary']],
  revision: [['entrevista', 'Agendar entrevista', 'btn-primary'], ['rechazada', 'No seleccionar', 'btn-ghost']],
  entrevista: [['aceptada', 'Aceptar', 'btn-primary'], ['espera', 'Lista de espera', ''], ['rechazada', 'No seleccionar', 'btn-ghost']],
  espera: [['aceptada', 'Aceptar (vacante liberada)', 'btn-primary'], ['rechazada', 'No seleccionar', 'btn-ghost']],
  aceptada: [['matriculada', 'Formalizar matrícula', 'btn-primary']],
  rechazada: [['revision', 'Reabrir', '']],
  matriculada: []
};
let fStatus = '';
export function render(el, { db, go }) {
  const apps = db.all('applications');
  const st = site();
  const rows = apps.map(a => ({ ...a, gi: GRADES_APPLY.indexOf(a.grade) }));
  el.innerHTML = `
    ${pageHead(`Admisión ${st.admissionYear}`, `${apps.length} postulaciones · proceso ${st.admissionsOpen ? 'abierto' : 'cerrado'}`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><a class="btn btn-sm" href="index.html#/admision" target="_blank">Ver página pública ↗</a>`)}
    <div class="row" style="gap:6px">${[['', 'Todas', apps.length], ...Object.entries(ADM_STATUS).map(([k, [l]]) => [k, l, apps.filter(a => a.status === k).length])].map(([k, l, n]) => `<button class="chip ${fStatus === k ? 'active' : ''}" data-st="${k}">${l} <b>${n}</b></button>`).join('')}</div>
    <div class="split">
      <div class="card" data-t></div>
      <div class="card"><h3>Postulaciones por curso</h3>${hBars(GRADES_APPLY.map(g => ({ label: `${g} (${st.vacancies?.[g] ?? 0} vac.)`, value: apps.filter(a => a.grade === g).length, cls: apps.filter(a => a.grade === g).length > (st.vacancies?.[g] ?? 0) ? 'warning' : '' })).filter(x => x.value))}</div>
    </div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'apps', rows: rows.filter(a => !fStatus || a.status === fStatus), pageSize: 10, search: r => r.code + r.studentName + r.guardianName + r.rut,
    filters: [{ key: 'grade', label: 'Curso', options: GRADES_APPLY }],
    columns: [
      { key: 'code', label: 'Código', render: r => `<span class="mono small">${escape(r.code)}</span>` },
      { key: 'studentName', label: 'Postulante', render: r => `<b>${escape(r.studentName)}</b><div class="small muted">${escape(r.guardianName)}</div>` },
      { key: 'grade', label: 'Curso', sort: r => r.gi },
      { key: 'createdAt', label: 'Recibida', render: r => `<span class="nowrap small">${date(r.createdAt)}</span>` },
      { key: 'status', label: 'Estado', render: r => badge(...ADM_STATUS[r.status]) + (r.siblings ? ' ' + badge('Hermano/a', 'info') : '') }
    ],
    onRow: r => go('/admision/' + r.id)
  });
  el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { fStatus = b.dataset.st; render(el, { db, go }); });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('postulaciones.csv', rows.map(r => ({ codigo: r.code, postulante: r.studentName, rut: r.rut, curso: r.grade, apoderado: r.guardianName, correo: r.email, telefono: r.phone, estado: ADM_STATUS[r.status][0], puntaje: r.score ?? '', fecha: r.createdAt.slice(0, 10) })));
}

export function detail(el, { db, me }, id) {
  const a = db.get('applications', id);
  if (!a) { el.innerHTML = '<div class="empty">Postulación no encontrada</div>'; return; }
  const st = site();
  el.innerHTML = `
    ${pageHead(a.studentName, `<span class="mono">${escape(a.code)}</span> · Postula a ${escape(a.grade)} · ${badge(...ADM_STATUS[a.status])}`, `<a class="btn btn-ghost btn-sm" href="#/admision">← Postulaciones</a>`)}
    <div class="split">
      <div class="stack">
        <div class="card"><h3>Antecedentes</h3><dl class="dl">
          <dt>Estudiante</dt><dd>${escape(a.studentName)}</dd><dt>RUT</dt><dd>${escape(a.rut)}</dd><dt>Nacimiento</dt><dd>${a.birth ? date(a.birth + 'T12:00') : '—'}</dd>
          <dt>Establecimiento de origen</dt><dd>${escape(a.prevSchool || '—')}</dd><dt>Hermanos en el colegio</dt><dd>${a.siblings ? 'Sí' : 'No'}</dd><dt>Motivo</dt><dd>${escape(a.reason || '—')}</dd>
          <dt>Apoderado/a</dt><dd>${escape(a.guardianName)}</dd><dt>Contacto</dt><dd>${escape(a.email)} · ${escape(a.phone)}</dd>
          <dt>Vacantes en ${escape(a.grade)}</dt><dd>${st.vacancies?.[a.grade] ?? 0}</dd>
          ${a.interview ? `<dt>Entrevista</dt><dd>${dateTime(a.interview)}</dd>` : ''}
        </dl></div>
        <div class="card"><h3>Evaluación</h3><form class="row" data-score><div class="field" style="flex:1"><label for="ad-score">Puntaje de evaluación (0–100)</label><input class="input" id="ad-score" name="score" type="number" min="0" max="100" value="${a.score ?? ''}"></div><button class="btn">Guardar puntaje</button></form>
          <form class="stack" data-note style="margin-top:12px"><div class="field"><label for="ad-note">Agregar nota interna</label><textarea class="textarea" id="ad-note" name="note" style="min-height:70px"></textarea></div><button class="btn btn-sm">Agregar nota</button></form></div>
      </div>
      <div class="stack">
        <div class="card"><h3>Acciones</h3><div class="stack" style="gap:8px">${(NEXT[a.status] || []).map(([s, l, cls]) => `<button class="btn ${cls} btn-block" data-to="${s}">${l}</button>`).join('') || '<p class="muted mb-0">Proceso finalizado.</p>'}</div></div>
        <div class="card"><h3>Historial</h3><ul class="timeline">${[...a.history].reverse().map((h, i) => `<li class="${i === 0 ? 'current' : 'done'}"><b>${escape(ADM_STATUS[h.status]?.[0] || 'Nota')}</b><div class="small muted">${dateTime(h.at)}${h.by ? ' · ' + escape(db.get('users', h.by)?.name || '') : ''}</div><div class="small">${escape(h.note || '')}</div></li>`).join('')}</ul></div>
      </div>
    </div>`;
  const push = (patch, entry) => { db.update('applications', id, x => ({ ...patch, history: [...x.history, { at: new Date().toISOString(), by: me.id, ...entry }] })); };
  el.querySelector('[data-score]').addEventListener('submit', e => { e.preventDefault(); const v = Number(e.currentTarget.score.value); if (isNaN(v) || v < 0 || v > 100) return toast('Puntaje entre 0 y 100', 'warning'); db.update('applications', id, { score: v }); db.log('admision', `Puntaje ${v} para ${a.code}`, me.id); toast('Puntaje guardado', 'success'); });
  el.querySelector('[data-note]').addEventListener('submit', e => { e.preventDefault(); const t = e.currentTarget.note.value.trim(); if (!t) return; push({}, { status: a.status, note: t }); toast('Nota agregada', 'success'); });
  el.querySelectorAll('[data-to]').forEach(b => b.onclick = () => transition(db, me, a, b.dataset.to, push));
}

async function transition(db, me, a, to, push) {
  const st = site();
  const label = ADM_STATUS[to][0];
  if (to === 'entrevista') {
    const m = modal({ title: 'Agendar entrevista familiar', body: `<form class="stack"><div class="field"><label for="iv-d">Fecha y hora</label><input class="input" id="iv-d" type="datetime-local" name="when" value="${ymd(new Date(NOW.getTime() + 3 * 864e5))}T10:00" required></div><label class="check"><input type="checkbox" name="mail" checked> Enviar correo de citación a ${escape(a.email)}</label></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Agendar</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const v = formData(m.el.querySelector('form'));
      if (!v.when) return toast('Indica fecha y hora', 'warning');
      push({ status: 'entrevista', interview: new Date(v.when).toISOString() }, { status: 'entrevista', note: `Entrevista agendada para ${dateTime(v.when)}.${v.mail ? ' Citación enviada por correo.' : ''}` });
      db.log('admision', `${a.code}: entrevista agendada`, me.id); toast('Entrevista agendada', 'success'); m.close();
    };
    return;
  }
  if (to === 'matriculada') {
    const courses = sortedCourses();
    const m = modal({ title: 'Formalizar matrícula', body: `<form class="stack"><p class="muted">Se creará la ficha del estudiante y la cuenta del apoderado/a en Aula360.</p><div class="field"><label for="mt-c">Curso asignado (año en curso, demo)</label><select class="select" id="mt-c" name="courseId">${courses.map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('')}</select></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Matricular</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const { courseId } = formData(m.el.querySelector('form'));
      let g = db.find('users', u => u.email.toLowerCase() === a.email.toLowerCase());
      if (!g) g = db.insert('users', { name: a.guardianName, email: a.email, phone: a.phone, password: 'apoderado123', role: 'apoderado', active: true, color: '#0d9488', children: [] });
      const parts = a.studentName.split(' ');
      const s = db.insert('students', { firstName: parts.slice(0, Math.max(1, parts.length - 2)).join(' '), lastName: parts.at(-2) || '', lastName2: parts.at(-1) || '', rut: a.rut, birth: a.birth, gender: 'X', courseId, guardianId: g.id, status: 'activo', pie: false, enrolled: ymd(NOW) });
      db.update('users', g.id, { children: [...(g.children || []), s.id] });
      push({ status: 'matriculada', studentId: s.id }, { status: 'matriculada', note: `Matrícula formalizada en ${course(courseId).name}.` });
      db.log('admision', `${a.code}: matriculado/a en ${course(courseId).name}`, me.id); toast('Matrícula formalizada. Ficha y cuenta de apoderado creadas.', 'success'); m.close();
    };
    return;
  }
  if (!await ask(`¿Cambiar el estado de ${a.studentName} a "${label}"?`, { ok: label, danger: to === 'rechazada' })) return;
  if (to === 'aceptada') {
    const vac = { ...(st.vacancies || {}) };
    if ((vac[a.grade] ?? 0) <= 0) toast(`No quedan vacantes en ${a.grade}; se acepta igualmente (sobrecupo)`, 'warning');
    else { vac[a.grade]--; db.setValue('site', { ...st, vacancies: vac }); }
  }
  const notes = { revision: 'Documentación en evaluación.', aceptada: 'Postulación aceptada. Se notificó a la familia.', espera: 'Quedó en lista de espera.', rechazada: 'No fue posible asignar vacante.' };
  push({ status: to }, { status: to, note: notes[to] || '' });
  db.log('admision', `${a.code}: ${label}`, me.id);
  toast(`Estado actualizado: ${label}`, 'success');
}
