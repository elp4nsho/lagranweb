// Libro de clases digital: asistencia por clase (P/A/T con un toque) y registro de contenidos.
import { escape, date, toast } from '../../../assets/core/ui.js';
import { pageHead, badge, empty } from '../shared/kit.js';
import { course, subject, courseStudents, fullName } from '../shared/academic.js';
import { BLOCKS, NOW, ymd, schoolDay, dayIndex, isWeekday } from '../shared/school.js';
import { todayClasses } from './home.js';

export function renderClassbook(el, { db, me }, _p, q = {}) {
  const load = db.query('teaching', t => t.teacherId === me.id);
  if (!load.length) { el.innerHTML = pageHead('Libro de clases') + empty('No tienes asignaturas asignadas.'); return; }
  const today = todayClasses(db, me);
  const first = today.find(c => !c.session) || today[0];
  let cid = q.curso || first?.courseId || load[0].courseId;
  if (!load.some(t => t.courseId === cid)) cid = load[0].courseId;
  const subsHere = load.filter(t => t.courseId === cid);
  let sid = q.asig && subsHere.some(t => t.subjectId === q.asig) ? q.asig : (first?.courseId === cid ? first.subjectId : subsHere[0].subjectId);
  let ds = q.fecha || first?.date || ymd(schoolDay(NOW));
  if (ds > ymd(NOW)) ds = ymd(NOW);
  const di = dayIndex(ds + 'T12:00');
  const blocksForDay = db.query('schedule', x => x.courseId === cid && x.subjectId === sid && x.day === di).map(x => x.block);
  const blockOpts = blocksForDay.length ? blocksForDay : BLOCKS.map((_, i) => i);
  const block = q.bloque != null && blockOpts.includes(+q.bloque) ? +q.bloque : blockOpts[0];
  const id = `${cid}|${ds}|${block}`;
  const sess = db.get('sessions', id);
  const kids = courseStudents(cid);
  const marks = {}; kids.forEach(k => { marks[k.id] = sess?.abs?.[k.id] || 'P'; });
  const history = db.query('sessions', x => x.courseId === cid && x.subjectId === sid).sort((a, b) => b.date.localeCompare(a.date) || b.block - a.block).slice(0, 12);
  const go = patch => { const p = new URLSearchParams({ curso: cid, asig: sid, fecha: ds, bloque: block, ...patch }); location.hash = '#/libro?' + p; };

  el.innerHTML = `
    ${pageHead('Libro de clases', 'Registra asistencia y contenidos de cada clase. Toca P / A / T para marcar.')}
    <div class="card"><div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr))">
      <div class="field"><label for="lb-c">Curso</label><select class="select" id="lb-c">${[...new Set(load.map(t => t.courseId))].map(c => `<option value="${c}" ${c === cid ? 'selected' : ''}>${escape(course(c).name)}</option>`).join('')}</select></div>
      <div class="field"><label for="lb-s">Asignatura</label><select class="select" id="lb-s">${subsHere.map(t => `<option value="${t.subjectId}" ${t.subjectId === sid ? 'selected' : ''}>${escape(subject(t.subjectId).short)}</option>`).join('')}</select></div>
      <div class="field"><label for="lb-d">Fecha</label><input class="input" type="date" id="lb-d" value="${ds}" max="${ymd(NOW)}"></div>
      <div class="field"><label for="lb-b">Bloque</label><select class="select" id="lb-b">${blockOpts.map(b => `<option value="${b}" ${b === block ? 'selected' : ''}>${b + 1}° · ${BLOCKS[b].join('–')}</option>`).join('')}</select></div>
    </div>
    ${!isWeekday(ds + 'T12:00') ? '<p class="notice warn" style="margin-top:12px">La fecha seleccionada es fin de semana.</p>' : !blocksForDay.length ? '<p class="notice warn" style="margin-top:12px">Esta asignatura no tiene bloques ese día según el horario; puedes registrar una clase recuperativa.</p>' : ''}
    </div>
    <div class="split">
      <form class="card stack" id="lb-form">
        <div class="card-head"><h3>${escape(course(cid).name)} · ${escape(subject(sid).short)}</h3>${sess ? badge('Firmada ' + (sess.updatedAt ? date(sess.updatedAt) : ''), 'success') : badge('Sin registrar', 'warning')}</div>
        <div class="row between"><div class="att-summary" data-sum></div><button type="button" class="btn btn-sm" data-allp>Todos presentes</button></div>
        <div class="att-list">${kids.map((k, i) => `<div class="att-row" data-sid="${k.id}"><span class="pill-num">${i + 1}</span><span class="name">${escape(fullName(k))}</span><span class="att-btns" role="radiogroup" aria-label="Asistencia de ${escape(k.firstName)}">${['P', 'A', 'T'].map(v => `<button type="button" class="att-btn" data-v="${v}" aria-pressed="${marks[k.id] === v}" title="${{ P: 'Presente', A: 'Ausente', T: 'Atrasado' }[v]}">${v}</button>`).join('')}</span></div>`).join('')}</div>
        <div class="field"><label for="lb-t">Contenido / objetivo de la clase *</label><textarea class="textarea" id="lb-t" name="topic" required placeholder="Ej: Ecuaciones de primer grado: resolución de problemas">${escape(sess?.topic || '')}</textarea></div>
        <div class="field"><label for="lb-o">Observaciones (opcional)</label><input class="input" id="lb-o" name="obs" value="${escape(sess?.obs || '')}"></div>
        <button class="btn btn-primary btn-lg" type="submit">✍ Firmar y guardar clase</button>
      </form>
      <div class="card"><h3>Leccionario</h3><p class="small muted">Últimas clases registradas de ${escape(subject(sid).short)} en ${escape(course(cid).name)}</p>
        <ul class="list compact">${history.map(h => `<li><a href="#/libro?curso=${cid}&asig=${sid}&fecha=${h.date}&bloque=${h.block}" class="small" style="flex:1"><b>${date(h.date + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short' })} · B${h.block + 1}</b><br><span class="muted">${escape(h.topic || '—')}</span></a>${Object.values(h.abs || {}).filter(v => v === 'A').length ? badge(Object.values(h.abs).filter(v => v === 'A').length + ' aus.', 'danger') : badge('100%', 'success')}</li>`).join('') || '<li class="muted small">Sin registros</li>'}</ul></div>
    </div>`;

  const sum = () => { const v = Object.values(marks); el.querySelector('[data-sum]').innerHTML = `${badge(v.filter(x => x === 'P').length + ' presentes', 'success')}${badge(v.filter(x => x === 'A').length + ' ausentes', 'danger')}${badge(v.filter(x => x === 'T').length + ' atrasos', 'warning')}`; };
  sum();
  el.querySelectorAll('.att-row').forEach(row => row.addEventListener('click', e => {
    const b = e.target.closest('.att-btn'); if (!b) return;
    marks[row.dataset.sid] = b.dataset.v;
    row.querySelectorAll('.att-btn').forEach(x => x.setAttribute('aria-pressed', x === b));
    sum();
  }));
  el.querySelector('[data-allp]').onclick = () => { kids.forEach(k => { marks[k.id] = 'P'; }); el.querySelectorAll('.att-btn').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === 'P')); sum(); };
  el.querySelector('#lb-c').onchange = e => go({ curso: e.target.value, asig: '', bloque: '' });
  el.querySelector('#lb-s').onchange = e => go({ asig: e.target.value, bloque: '' });
  el.querySelector('#lb-d').onchange = e => go({ fecha: e.target.value, bloque: '' });
  el.querySelector('#lb-b').onchange = e => go({ bloque: e.target.value });
  el.querySelector('#lb-form').addEventListener('submit', e => {
    e.preventDefault();
    const topic = e.currentTarget.topic.value.trim(), obs = e.currentTarget.obs.value.trim();
    if (!topic) { e.currentTarget.topic.classList.add('invalid'); return toast('Registra el contenido de la clase', 'warning'); }
    const abs = {}; Object.entries(marks).forEach(([k, v]) => { if (v !== 'P') abs[k] = v; });
    const data = { courseId: cid, subjectId: sid, teacherId: me.id, date: ds, block, topic, obs, abs, signed: true };
    if (sess) db.update('sessions', id, data); else db.insert('sessions', { id, ...data });
    db.log('libro', `Clase firmada: ${course(cid).name} ${subject(sid).short} ${ds} B${block + 1} (${Object.values(abs).filter(v => v === 'A').length} ausentes)`, me.id);
    toast('Clase firmada y guardada. Las familias ya ven la asistencia.', 'success');
  });
}
