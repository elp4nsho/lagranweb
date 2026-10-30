// Libro de notas: evaluaciones ponderadas, ingreso de notas 1,0–7,0 y promedios en vivo.
import { escape, date, toast, confirm as ask, downloadCSV } from '../../../assets/core/ui.js';
import { pageHead, badge, empty } from '../shared/kit.js';
import { course, subject, courseStudents, fullName, evalsOf, weighted, fmtGrade, gradeCls } from '../shared/academic.js';
import { currentSemester, NOW } from '../shared/school.js';
import { evalModal } from '../admin/evaluations.js';

const parse = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : Math.round(n * 10) / 10; };

export function renderGradebook(el, { db, me }, _p, q = {}) {
  const load = db.query('teaching', t => t.teacherId === me.id);
  if (!load.length) { el.innerHTML = pageHead('Notas') + empty('No tienes asignaturas asignadas.'); return; }
  let cid = q.curso && load.some(t => t.courseId === q.curso) ? q.curso : load[0].courseId;
  const subsHere = load.filter(t => t.courseId === cid);
  const sid = q.asig && subsHere.some(t => t.subjectId === q.asig) ? q.asig : subsHere[0].subjectId;
  const sem = +(q.sem || currentSemester());
  const evals = evalsOf(cid, sid, sem);
  const kids = courseStudents(cid);
  const wsum = evals.reduce((a, e) => a + e.weight, 0);
  const draft = {}; // evalId -> { studentId: value }
  evals.forEach(e => { draft[e.id] = { ...(e.scores || {}) }; });
  const go = patch => { location.hash = '#/notas?' + new URLSearchParams({ curso: cid, asig: sid, sem, ...patch }); };

  el.innerHTML = `
    ${pageHead('Libro de notas', 'Escala 1,0 a 7,0 · nota de aprobación 4,0 · promedio ponderado', `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-sm" data-new>+ Evaluación</button>`)}
    <div class="row">
      <select class="select" data-c style="max-width:200px" aria-label="Curso">${[...new Set(load.map(t => t.courseId))].map(c => `<option value="${c}" ${c === cid ? 'selected' : ''}>${escape(course(c).name)}</option>`).join('')}</select>
      <select class="select" data-s style="max-width:200px" aria-label="Asignatura">${subsHere.map(t => `<option value="${t.subjectId}" ${t.subjectId === sid ? 'selected' : ''}>${escape(subject(t.subjectId).short)}</option>`).join('')}</select>
      <div class="row" style="gap:6px">${[1, 2].map(s => `<button class="chip ${s === sem ? 'active' : ''}" data-sem="${s}">${s}° semestre</button>`).join('')}</div>
      ${wsum !== 100 && evals.length ? badge(`Ponderaciones suman ${wsum}%`, 'warning') : evals.length ? badge('Ponderaciones 100%', 'success') : ''}
    </div>
    ${evals.length ? `<form class="card stack" id="gb">
      <div class="table-wrap"><table class="table gradebook"><thead><tr><th class="sticky-col">Estudiante</th>
        ${evals.map(e => `<th title="${escape(e.name)}"><button type="button" class="btn btn-sm btn-ghost" data-edit="${e.id}" style="padding:0 6px">${escape(e.type.split(' ')[0])} ${escape(e.name.match(/\d+/)?.[0] || '')}</button><span class="small">${date(e.date + 'T12:00', { day: '2-digit', month: 'short' })} · ${e.weight}%</span>${e.status === 'programada' ? '<span class="small muted">programada</span>' : e.status === 'pendiente' ? '<span class="small text-warning">por calificar</span>' : ''}</th>`).join('')}
        <th>Promedio</th></tr></thead><tbody>
        ${kids.map(k => `<tr data-sid="${k.id}"><th scope="row" class="sticky-col"><span class="small">${escape(k.lastName)} ${escape(k.lastName2 || '')}, ${escape(k.firstName)}</span></th>
          ${evals.map(e => { const v = e.scores?.[k.id]; return `<td><input class="input ${gradeCls(v)}" inputmode="decimal" data-e="${e.id}" value="${v != null ? fmtGrade(v) : ''}" aria-label="Nota ${escape(k.firstName)} ${escape(e.name)}"></td>`; }).join('')}
          <td><b class="grade" data-avg></b></td></tr>`).join('')}
      </tbody><tfoot><tr><th class="sticky-col">Promedio curso</th>${evals.map(e => `<td><b class="grade" data-eavg="${e.id}"></b></td>`).join('')}<td><b class="grade" data-tavg></b></td></tr></tfoot></table></div>
      <div class="row between"><span class="small muted">Puedes escribir 5,5 o 5.5. Las notas bajo 4,0 se marcan en rojo. Tab/Enter avanza.</span><button class="btn btn-primary btn-lg" type="submit">Guardar notas</button></div>
    </form>` : `<div class="card">${empty('No hay evaluaciones en este semestre. Crea la primera.', '✓')}</div>`}`;

  const fe = evs => { const vals = Object.values(evs).filter(v => v != null); return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null; };
  const paintAvgs = () => {
    el.querySelectorAll('tr[data-sid]').forEach(tr => {
      const sidK = tr.dataset.sid;
      const avg = weighted(evals.map(e => ({ ...e, scores: draft[e.id] })), sidK);
      const b = tr.querySelector('[data-avg]'); b.textContent = fmtGrade(avg); b.className = 'grade ' + gradeCls(avg);
    });
    evals.forEach(e => { const b = el.querySelector(`[data-eavg="${e.id}"]`); const v = fe(draft[e.id]); if (b) { b.textContent = fmtGrade(v); b.className = 'grade ' + gradeCls(v); } });
    const all = kids.map(k => weighted(evals.map(e => ({ ...e, scores: draft[e.id] })), k.id)).filter(v => v != null);
    const t = el.querySelector('[data-tavg]'); if (t) { const v = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length * 10) / 10 : null; t.textContent = fmtGrade(v); t.className = 'grade ' + gradeCls(v); }
  };
  paintAvgs();
  el.querySelectorAll('input[data-e]').forEach(inp => {
    inp.addEventListener('input', () => {
      const v = parse(inp.value), sidK = inp.closest('tr').dataset.sid;
      const bad = inp.value.trim() !== '' && (v == null || v < 1 || v > 7);
      inp.classList.toggle('invalid', bad);
      inp.classList.toggle('grade-low', !bad && v != null && v < 4);
      if (!bad) { if (v == null) delete draft[inp.dataset.e][sidK]; else draft[inp.dataset.e][sidK] = v; }
      paintAvgs();
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const all = [...el.querySelectorAll(`input[data-e="${inp.dataset.e}"]`)]; const nx = all[all.indexOf(inp) + 1]; nx ? nx.focus() : inp.blur(); } });
  });
  el.querySelector('#gb')?.addEventListener('submit', e => {
    e.preventDefault();
    if (el.querySelector('input.invalid')) return toast('Hay notas fuera del rango 1,0 – 7,0', 'error');
    let n = 0;
    evals.forEach(ev => {
      const scores = draft[ev.id];
      const complete = kids.every(k => scores[k.id] != null);
      const changed = JSON.stringify(scores) !== JSON.stringify(ev.scores || {});
      if (changed || (complete && ev.status !== 'calificada')) { db.update('evaluations', ev.id, { scores, status: complete ? 'calificada' : Object.keys(scores).length ? 'pendiente' : (new Date(ev.date + 'T23:59') < NOW ? 'pendiente' : 'programada') }); n++; }
    });
    db.log('notas', `Notas guardadas: ${course(cid).name} ${subject(sid).short} (${n} evaluaciones)`, me.id);
    toast(n ? 'Notas guardadas. Apoderados y estudiantes ya las ven.' : 'No había cambios', n ? 'success' : 'info');
  });
  el.querySelector('[data-c]').onchange = e => go({ curso: e.target.value, asig: '' });
  el.querySelector('[data-s]').onchange = e => go({ asig: e.target.value });
  el.querySelectorAll('[data-sem]').forEach(b => b.onclick = () => go({ sem: b.dataset.sem }));
  el.querySelector('[data-new]').onclick = () => evalModal(db, me, null, { courseIds: [...new Set(load.map(t => t.courseId))], teacherId: me.id, preset: { courseId: cid, subjectId: sid } });
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const ev = db.get('evaluations', b.dataset.edit);
    evalModal(db, me, ev, { courseIds: [cid], teacherId: me.id });
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV(`notas-${cid}-${sid}-s${sem}.csv`, kids.map(k => ({ estudiante: fullName(k), ...Object.fromEntries(evals.map(e => [e.name, fmtGrade(e.scores?.[k.id])])), promedio: fmtGrade(weighted(evals, k.id)) })));
  void ask;
}
