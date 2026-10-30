// Informes de notas: sábana por curso, vista previa e impresión individual o masiva.
import { escape, modal, downloadCSV, toast } from '../../../assets/core/ui.js';
import { pageHead, printHTML } from '../shared/kit.js';
import { sortedCourses, courseStudents, courseSubjects, subjectAvg, generalAvg, attendanceOf, gradeSpan, pctTxt, fullName, reportCard, fmtGrade, course } from '../shared/academic.js';

let sel = null, sem = 'anual';
export function render(el, { db, me }) {
  const courses = sortedCourses();
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  sel = q.get('curso') || sel || courses[0]?.id;
  if (!db.get('courses', sel)) sel = courses[0]?.id;
  const kids = courseStudents(sel), subs = courseSubjects(sel);
  const data = kids.map(k => ({ k, avgs: subs.map(t => subjectAvg(k.id, t.subjectId, sem, sel)), gen: generalAvg(k.id, sem), att: attendanceOf(k.id).pct }));
  el.innerHTML = `
    ${pageHead('Informes de notas', 'Sábana de notas por curso e informes imprimibles para las familias', `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-all>⎙ Imprimir informes del curso</button>`)}
    <div class="row">
      <select class="select" data-c style="max-width:220px" aria-label="Curso">${courses.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select>
      <div class="row" style="gap:6px">${[['1', '1° semestre'], ['2', '2° semestre'], ['anual', 'Anual']].map(([v, l]) => `<button class="chip ${String(sem) === v ? 'active' : ''}" data-sem="${v}">${l}</button>`).join('')}</div>
    </div>
    <div class="card"><div class="table-wrap"><table class="table grades"><thead><tr><th>Estudiante</th>${subs.map(t => `<th title="${escape(t.subject.name)}">${escape(t.subject.code)}</th>`).join('')}<th class="avg-col">Prom.</th><th>Asist.</th><th></th></tr></thead><tbody>
      ${data.map(({ k, avgs, gen, att }) => `<tr><th scope="row"><a href="#/estudiantes/${k.id}">${escape(k.lastName)} ${escape(k.lastName2 || '')}, ${escape(k.firstName)}</a></th>${avgs.map(v => `<td>${gradeSpan(v)}</td>`).join('')}<td class="avg-col">${gradeSpan(gen)}</td><td class="${att < 85 ? 'text-danger' : ''}">${pctTxt(att)}</td><td><button class="btn btn-sm btn-ghost" data-rc="${k.id}">Informe</button></td></tr>`).join('')}
    </tbody><tfoot><tr><th>Promedio curso</th>${subs.map((t, i) => { const vals = data.map(d => d.avgs[i]).filter(v => v != null); return `<td>${gradeSpan(vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null)}</td>`; }).join('')}<td class="avg-col">${gradeSpan((() => { const v = data.map(d => d.gen).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; })())}</td><td></td><td></td></tr></tfoot></table></div>
    <p class="small muted" style="margin-top:10px">Notas en rojo: bajo 4,0. Códigos: ${subs.map(t => `${escape(t.subject.code)} = ${escape(t.subject.short)}`).join(' · ')}</p></div>`;
  el.querySelector('[data-c]').onchange = e => { sel = e.target.value; location.hash = '#/informes?curso=' + sel; };
  el.querySelectorAll('[data-sem]').forEach(b => b.onclick = () => { sem = b.dataset.sem === 'anual' ? 'anual' : +b.dataset.sem; render(el, { db, me }); });
  el.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => {
    const m = modal({ title: 'Vista previa · Informe de notas', size: 'lg', body: reportCard(b.dataset.rc), foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-print>⎙ Imprimir / PDF</button>' });
    m.el.querySelector('[data-print]').onclick = () => { db.log('informe', `Informe de notas impreso: ${fullName(db.get('students', b.dataset.rc))}`, me.id); m.close(); printHTML(reportCard(b.dataset.rc)); };
  });
  el.querySelector('[data-all]').onclick = () => { if (!kids.length) return toast('El curso no tiene estudiantes', 'warning'); db.log('informe', `Informes de notas impresos: ${course(sel).name} (${kids.length})`, me.id); printHTML(kids.map(k => reportCard(k.id)).join('')); };
  el.querySelector('[data-csv]').onclick = () => downloadCSV(`sabana-${sel}-${sem}.csv`, data.map(({ k, avgs, gen, att }) => ({ estudiante: fullName(k), rut: k.rut, ...Object.fromEntries(subs.map((t, i) => [t.subject.code, fmtGrade(avgs[i])])), promedio: fmtGrade(gen), asistencia: att != null ? att.toFixed(1) : '' })));
}
