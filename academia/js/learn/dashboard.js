// Panel del estudiante: racha, XP, insignias, continuar aprendiendo y mis cursos.
import { escape, date, num, ago } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { getCourse, getUser, coursePct, streak, xp, badges, lessonsOf } from '../data/model.js';
import { cover } from '../shared/bits.js';

export function renderDashboard(view) {
  const u = auth.current();
  const es = db.query('enrollments', e => e.userId === u.id).sort((a, b) => new Date(b.lastActivityAt || b.enrolledAt) - new Date(a.lastActivityAt || a.enrolledAt));
  const st = streak(u.id), points = xp(u.id), level = Math.floor(points / 500) + 1;
  const bs = badges(u.id);
  const days = [...Array(7)].map((_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return { k: d.toISOString().slice(0, 10), l: d.toLocaleDateString('es-CL', { weekday: 'narrow' }) }; });
  const act = new Set(db.query('activity', a => a.userId === u.id).map(a => a.date));
  const weekMin = db.query('activity', a => a.userId === u.id && days.some(d => d.k === a.date)).reduce((t, a) => t + a.minutes, 0);
  const cont = es.find(e => !e.completedAt);
  const lesson = cont && lessonsOf(getCourse(cont.courseId)).find(l => l.id === cont.lastLessonId);
  view.innerHTML = `
    <div class="learn-head"><div><span class="eyebrow">Mi aprendizaje</span><h1>Hola, ${escape(u.name.split(' ')[0])} 👋</h1></div><a class="btn" href="index.html#/cursos">Explorar más cursos</a></div>
    <div class="gami">
      <div class="card"><div class="row" style="gap:10px"><span class="flame" aria-hidden="true">🔥</span><div class="stat"><span class="label">Racha</span><span class="value">${st} día${st === 1 ? '' : 's'}</span></div></div><div class="week" aria-label="Actividad de la semana">${days.map(d => `<span class="${act.has(d.k) ? 'on' : ''}" title="${d.k}">${d.l}</span>`).join('')}</div></div>
      <div class="card"><div class="stat"><span class="label">Nivel ${level}</span><span class="value">${num(points)} XP</span><span class="small muted">${500 - points % 500} XP para el nivel ${level + 1}</span></div><div class="progress" style="margin-top:8px"><i style="--v:${points % 500 / 5}%"></i></div></div>
      <div class="card"><div class="stat"><span class="label">Esta semana</span><span class="value">${weekMin} min</span><span class="small muted">de estudio</span></div></div>
      <div class="card"><div class="stat"><span class="label">Cursos terminados</span><span class="value">${es.filter(e => e.completedAt).length} / ${es.length}</span><span class="small muted">${bs.filter(b => b.ok).length} insignias</span></div></div>
    </div>
    ${cont ? `<div class="card my-course" style="margin-bottom:22px">${cover(getCourse(cont.courseId))}<div><span class="eyebrow">Continuar aprendiendo</span><h3>${escape(getCourse(cont.courseId).title)}</h3><p class="small muted" style="margin:0 0 10px">Última lección: ${escape(lesson?.title || '')} · ${ago(cont.lastActivityAt || cont.enrolledAt)}</p><div class="row" style="flex-wrap:nowrap"><div class="progress" style="flex:1"><i style="--v:${coursePct(cont)}%"></i></div><b class="small">${coursePct(cont)}%</b></div><a class="btn btn-primary" style="margin-top:12px" href="#/curso/${cont.courseId}/${cont.lastLessonId}">Continuar ▶</a></div></div>` : ''}
    <h2 style="font-size:22px">Mis cursos (${es.length})</h2>
    ${es.length ? `<div class="grid-auto">${es.map(e => { const c = getCourse(e.courseId); if (!c) return ''; const p = coursePct(e); return `<article class="card course-card">${cover(c)}<div class="course-body"><h3>${escape(c.title)}</h3><p class="small muted">${escape(getUser(c.instructorId)?.name || '')}</p><div class="row" style="flex-wrap:nowrap;gap:8px"><div class="progress" style="flex:1"><i style="--v:${p}%"></i></div><b class="small">${p}%</b></div><p class="small muted course-meta">${e.completedAt ? `Terminado el ${date(e.completedAt)}` : `Inscrito el ${date(e.enrolledAt)}`}</p><a class="btn ${e.completedAt ? '' : 'btn-primary'} btn-sm" href="#/curso/${c.id}">${e.completedAt ? 'Repasar' : p ? 'Continuar' : 'Comenzar'}</a></div></article>`; }).join('')}</div>`
      : '<div class="card empty"><span class="icon">📚</span><p>Aún no tienes cursos.</p><a class="btn btn-primary" href="index.html#/cursos">Explorar catálogo</a></div>'}
    <h2 style="font-size:22px;margin-top:32px">Insignias</h2>
    <div class="badges">${bs.map(b => `<div class="badge-tile ${b.ok ? '' : 'off'}" title="${escape(b.desc)}"><span class="i" aria-hidden="true">${b.icon}</span><b>${escape(b.name)}</b><small>${escape(b.desc)}</small></div>`).join('')}</div>`;
}
