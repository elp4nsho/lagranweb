// Evaluación final: preguntas al azar del banco, retroalimentación inmediata, intento registrado y certificado.
import { escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { getPlan, planModules, contentDone, drawQuestions, recordAttempt, markCheckpoint, checkpoints } from '../data/model.js';

let Q = null; // { aid, qs, i, answers, checked, t0 }
export const quizActive = () => !!(Q && Q.i < Q.qs.length && Q.started);

export function renderQuiz(view, aid) {
  Q = null;
  const u = auth.current();
  const a = db.get('assignments', aid);
  if (!a || a.userId !== u.id) { view.innerHTML = '<div class="card empty"><h2>Evaluación no disponible</h2><a class="btn btn-primary" href="#/">Volver</a></div>'; return; }
  const plan = getPlan(a.planId);
  const qm = planModules(plan).find(m => m.mode === 'quiz');
  const count = qm?.quizCount || 10;
  view.innerHTML = `<a class="back" href="#/plan/${a.id}">← ${escape(plan.name)}</a><div class="card quiz-card" id="quiz"></div>`;
  const card = view.querySelector('#quiz');
  if (!contentDone(a) && !a.quizPassed) {
    const pend = planModules(plan).filter(m => m.mode !== 'quiz' && !(checkpoints(m).every(c => (a.progress?.[m.id] || []).includes(c))));
    card.innerHTML = `<span class="eyebrow">Evaluación final</span><h1 style="font-size:clamp(24px,3.4vw,34px)">Aún no está disponible</h1>
      <p class="muted">Completa primero estos módulos:</p><ul class="checklist">${pend.map(m => `<li><a class="ck" href="#/modulo/${a.id}/${m.id}" style="text-decoration:none"><span class="n">${m.order}</span><span><b>${escape(m.title)}</b><small>${m.minutes} min</small></span></a></li>`).join('')}</ul>
      <div class="row" style="margin-top:14px"><button class="btn btn-sm btn-ghost" id="demo-unlock">Completar módulos (atajo demo)</button></div>`;
    card.querySelector('#demo-unlock').onclick = () => { pend.forEach(m => checkpoints(m).forEach(c => markCheckpoint(a.id, m.id, c))); toast('Módulos marcados como completados (demo)', 'info'); renderQuiz(view, aid); };
    return;
  }
  const tries = db.count('attempts', t => t.assignmentId === a.id);
  card.innerHTML = `<span class="eyebrow">Evaluación final</span><h1 style="font-size:clamp(24px,3.4vw,34px)">Pon a prueba lo aprendido</h1>
    <p class="muted">${count} preguntas de alternativas tomadas al azar del banco. Necesitas ${plan.passScore}% para aprobar${plan.practical ? ' y luego aprobar la evaluación práctica en terreno' : ' y obtener tu certificado'}.</p>
    ${tries ? `<p class="muted">Intentos previos: ${tries} · Mejor puntaje: ${a.bestScore}%</p>` : ''}
    <div class="q-actions"><button class="btn btn-primary" id="q-start">${a.quizPassed ? 'Rendir de nuevo' : 'Comenzar evaluación'}</button>${a.certificateId ? `<a class="btn" href="#/certificado/${a.certificateId}">Ver certificado</a>` : ''}</div>`;
  card.querySelector('#q-start').onclick = () => { Q = { aid, qs: drawQuestions(plan, count), i: 0, answers: [], checked: false, t0: Date.now(), started: true }; question(card); };
}

function question(card) {
  const q = Q.qs[Q.i], n = Q.qs.length;
  card.innerHTML = `<div class="q-top"><span>Pregunta ${Q.i + 1} de ${n}</span><div class="progress"><i style="--v:${Q.i / n * 100}%"></i></div></div>
    <form id="q-form"><fieldset><legend class="q-legend" tabindex="-1">${escape(q.q)}</legend>
    ${q.options.map((o, i) => `<label class="opt"><input type="radio" name="q" value="${i}"> <span>${escape(o)}</span></label>`).join('')}</fieldset>
    <p class="feedback" id="q-fb" role="status" aria-live="polite"></p>
    <div class="q-actions"><span class="muted small">Correctas: ${Q.answers.filter((v, i) => v === Q.qs[i].answer).length}</span><button type="submit" class="btn btn-primary" id="q-submit" disabled>Responder</button></div></form>`;
  Q.checked = false;
  const form = card.querySelector('#q-form');
  form.addEventListener('change', () => { if (!Q.checked) card.querySelector('#q-submit').disabled = false; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!Q.checked) {
      const sel = form.querySelector('input:checked'); if (!sel) return;
      const v = +sel.value; Q.answers[Q.i] = v; Q.checked = true;
      [...form.querySelectorAll('.opt')].forEach((l, i) => { l.querySelector('input').disabled = true; if (i === q.answer) l.classList.add('correct'); else if (i === v) l.classList.add('wrong'); });
      const fb = card.querySelector('#q-fb');
      fb.className = 'feedback ' + (v === q.answer ? 'ok' : 'bad');
      fb.textContent = (v === q.answer ? '✓ Correcto. ' : '✗ Incorrecto. ') + (q.why || '');
      const b = card.querySelector('#q-submit'); b.textContent = Q.i < n - 1 ? 'Siguiente →' : 'Ver resultado'; b.focus();
    } else {
      Q.i++;
      if (Q.i < n) { question(card); card.querySelector('.q-legend').focus(); } else finish(card);
    }
  });
}

function finish(card) {
  const a = db.get('assignments', Q.aid), plan = getPlan(a.planId);
  const correct = Q.answers.filter((v, i) => v === Q.qs[i].answer).length;
  const res = recordAttempt(a, { correct, total: Q.qs.length, durationSec: Math.round((Date.now() - Q.t0) / 1000), answers: Q.qs.map((q, i) => ({ q: q.id, a: Q.answers[i], ok: Q.answers[i] === q.answer })) });
  const after = db.get('assignments', a.id);
  if (res.passed) toast('¡Aprobaste la evaluación!', 'success'); else toast('No alcanzaste el puntaje mínimo', 'warning');
  card.innerHTML = `<span class="eyebrow">Resultado</span><h1 style="font-size:clamp(24px,3.4vw,34px)" tabindex="-1">${res.passed ? '¡Felicitaciones, aprobaste!' : 'No alcanzaste el puntaje mínimo'}</h1>
    <p class="score-big ${res.passed ? 'pass' : 'fail'}">${res.score}%</p>
    <p class="muted">${correct} de ${Q.qs.length} correctas · Mínimo: ${plan.passScore}%</p>
    ${res.passed && plan.practical && !after.certificateId ? '<div class="reminder success"><div class="grow"><b>Siguiente paso: evaluación práctica</b><span class="small">Tu supervisor fue notificado para evaluarte en terreno. Al aprobarla se emitirá tu certificado.</span></div></div>' : ''}
    <div class="q-actions" style="justify-content:flex-start">
      ${after.certificateId ? `<a class="btn btn-primary" href="#/certificado/${after.certificateId}" id="go-cert">Ver mi certificado</a>` : ''}
      <button class="btn ${res.passed ? '' : 'btn-primary'}" id="q-retry">Reintentar</button>
      <a class="btn btn-ghost" href="#/plan/${a.id}">Volver a la inducción</a></div>
    <h2 style="font-size:18px;margin-top:24px">Revisión</h2><ol class="review">${Q.qs.map((q, i) => { const ok = Q.answers[i] === q.answer; return `<li class="${ok ? '' : 'x'}">${ok ? '✓' : '✗'} ${escape(q.q)}<small>Respuesta correcta: ${escape(q.options[q.answer])}</small></li>`; }).join('')}</ol>`;
  Q.started = false;
  card.querySelector('#q-retry').onclick = () => { Q = { aid: a.id, qs: drawQuestions(plan, Q.qs.length), i: 0, answers: [], checked: false, t0: Date.now(), started: true }; question(card); };
  card.querySelector('h1').focus();
}
