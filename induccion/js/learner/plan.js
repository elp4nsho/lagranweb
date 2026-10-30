// Detalle de una inducción asignada: módulos en orden, estado, intentos y evaluación práctica.
import { escape, date, dateTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { getPlan, getUser, planModules, modulePct, assignmentPct, assignmentStatus, STATUS, contentDone } from '../data/model.js';
import { ring } from './dashboard.js';

const PRACT = { no_iniciada: ['Se habilita al aprobar la teoría', ''], pendiente: ['Pendiente de evaluación en terreno', 'warning'], aprobada: ['Aprobada', 'success'], rechazada: ['Rechazada: vuelve a rendir la evaluación', 'danger'] };

export function renderPlan(view, aid) {
  const u = auth.current();
  const a = db.get('assignments', aid);
  if (!a || a.userId !== u.id) { view.innerHTML = '<div class="card empty"><h2>Inducción no encontrada</h2><a class="btn btn-primary" href="#/">Volver</a></div>'; return; }
  const p = getPlan(a.planId), mods = planModules(p);
  const st = assignmentStatus(a), [label, kind] = STATUS[st];
  const unlocked = contentDone(a);
  const tries = db.query('attempts', t => t.assignmentId === a.id).sort((x, y) => new Date(y.at) - new Date(x.at));
  view.innerHTML = `
    <a class="back" href="#/">← Mis inducciones</a>
    <div class="lx-head">
      <div><span class="eyebrow">${escape(p.code)} · <span class="badge badge-${kind}">${label}</span></span><h1>${escape(p.name)}</h1>
      <p class="muted" style="margin:6px 0 0;max-width:62ch">${escape(p.description)}</p>
      <p class="small muted" style="margin:6px 0 0">Asignada por ${escape(getUser(a.assignedBy)?.name || 'Prevención')} el ${date(a.assignedAt)} · Plazo ${date(a.dueAt)} · Aprobación ${p.passScore}%</p></div>
      ${ring(assignmentPct(a))}
    </div>
    <ol class="mod-steps">${mods.map((m, i) => {
      const pct = Math.round(modulePct(a, m) * 100);
      const isQuiz = m.mode === 'quiz', locked = isQuiz && !unlocked && !a.quizPassed;
      const href = isQuiz ? `#/evaluacion/${a.id}` : `#/modulo/${a.id}/${m.id}`;
      const cta = isQuiz ? (a.quizPassed ? 'Ver resultado' : locked ? 'Ver requisitos' : 'Rendir evaluación') : pct >= 100 ? 'Repasar' : pct ? 'Continuar' : 'Comenzar';
      return `<li class="card mod-step ${pct >= 100 ? 'done' : ''} ${locked ? 'locked' : ''}">
        <span class="n">${pct >= 100 ? '✓' : i + 1}</span>
        <div><h3>${escape(m.title)}</h3><p>${escape(m.desc)}</p><p class="small">${m.minutes} min · ${isQuiz ? (a.quizPassed ? `Aprobada (${a.bestScore}%)` : a.bestScore ? `Mejor puntaje ${a.bestScore}%` : 'Sin intentos') : `${pct}% completado`}${a.time?.[m.id] ? ` · ${a.time[m.id]} min dedicados` : ''}</p></div>
        <a class="btn ${locked ? '' : 'btn-primary'}" href="${href}">${cta}</a>
      </li>`;
    }).join('')}</ol>
    ${p.practical ? `<div class="card" style="margin-top:16px"><h3>Evaluación práctica en terreno</h3><p class="muted" style="margin:0">Estado: <span class="badge ${PRACT[a.practical?.status || 'no_iniciada'][1] ? 'badge-' + PRACT[a.practical?.status || 'no_iniciada'][1] : ''}">${PRACT[a.practical?.status || 'no_iniciada'][0]}</span>${a.practical?.notes ? ` · Observación: ${escape(a.practical.notes)}` : ''}</p></div>` : ''}
    ${a.certificateId ? `<div class="reminder success" style="margin-top:16px"><div class="grow"><b>¡Inducción completada!</b><span class="small">Tu certificado ya está disponible.</span></div><a class="btn btn-primary btn-sm" href="#/certificado/${a.certificateId}">Ver certificado</a></div>` : ''}
    ${tries.length ? `<h2 style="font-size:20px;margin-top:28px">Intentos de evaluación</h2><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Puntaje</th><th>Correctas</th><th>Resultado</th></tr></thead><tbody>${tries.map(t => `<tr><td>${dateTime(t.at)}</td><td>${t.score}%</td><td>${t.correct}/${t.total}</td><td><span class="badge badge-${t.passed ? 'success' : 'danger'}">${t.passed ? 'Aprobado' : 'Reprobado'}</span></td></tr>`).join('')}</tbody></table></div>` : ''}`;
}
