// Inicio del portal: saldo de vacaciones, marcaje, último líquido, encuesta, anuncios y cumpleaños.
import { escape, money, ago, date, toast } from '../../../assets/core/ui.js';
import { avatar, REQ_TYPES, reqBadge } from '../shared/util.js';
import { vacationBalance, fmtDays } from '../shared/vacation.js';
import { todayMark, clock, ENTRY_LIMIT } from '../shared/attendance.js';
import { slipDetail } from '../shared/payroll.js';
import { periodLabel } from '../shared/payslip.js';
import { today, hm, fmtDay } from '../shared/dates.js';

export function surveyCard(db, me, user) {
  const s = db.find('surveys', x => x.status === 'abierta' && !(x.respondents || []).includes(me.id));
  if (!s) return '';
  return `<form class="card stack" data-survey="${s.id}" style="border-left:4px solid var(--accent)"><div><span class="eyebrow">Encuesta anónima · 1 minuto</span><h3 style="margin:4px 0 0">${escape(s.title)}</h3></div><p style="margin:0">${escape(s.question)}</p>
    <div class="scale" role="radiogroup" aria-label="Puntaje de 0 a 10">${Array.from({ length: 11 }, (_, i) => `<label><input type="radio" name="score" value="${i}"><span>${i}</span></label>`).join('')}</div>
    <div class="row between small muted"><span>0 = nada probable</span><span>10 = muy probable</span></div>
    <textarea class="textarea" name="comment" rows="2" placeholder="Comentario opcional (anónimo)"></textarea>
    <div><button class="btn btn-primary" type="submit">Enviar respuesta</button></div></form>`;
}
export function wireSurvey(el, db, me, user) {
  el.querySelector('[data-survey]')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, v = f.querySelector('[name=score]:checked');
    if (!v) return toast('Elige un puntaje de 0 a 10', 'warning');
    const s = db.get('surveys', f.dataset.survey);
    db.insert('responses', { surveyId: s.id, score: +v.value, deptId: me.deptId, comment: f.comment.value.trim(), date: today() });
    db.update('surveys', s.id, { respondents: [...(s.respondents || []), me.id] });
    db.log('encuesta', `Nueva respuesta en «${s.title}»`, user?.id);
    toast('¡Gracias! Tu respuesta es anónima.', 'success');
  });
}

export function render(el, ctx) {
  const { db } = ctx, me = ctx.me, T = today();
  const bal = vacationBalance(db, me, db.getValue('policy'));
  const mark = todayMark(db, me.id);
  const lastSlip = db.query('payslips', p => p.employeeId === me.id).sort((a, b) => b.period.localeCompare(a.period))[0];
  const pend = db.query('requests', r => r.employeeId === me.id && r.status === 'pendiente');
  const next = db.query('requests', r => r.employeeId === me.id && r.status === 'aprobada' && r.to >= T).sort((a, b) => a.from.localeCompare(b.from))[0];
  const ann = db.query('announcements', a => a.published).sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date)).slice(0, 3);
  const mm = T.slice(5, 7);
  const bdays = db.query('employees', e => e.status !== 'desvinculado' && e.birth.slice(5, 7) === mm).sort((a, b) => a.birth.slice(8).localeCompare(b.birth.slice(8))).slice(0, 6);
  const cycle = db.find('cycles', c => c.status === 'abierto');
  const myRev = cycle && db.find('reviews', r => r.cycleId === cycle.id && r.employeeId === me.id);
  const teamIds = new Set(ctx.team.map(e => e.id));
  const teamPend = db.count('requests', r => teamIds.has(r.employeeId) && r.status === 'pendiente');
  el.innerHTML = `
    <div class="card row between" style="align-items:center"><div class="row" style="flex-wrap:nowrap">${avatar(me, 60)}<div><span class="eyebrow">${escape(ctx.dept(me.deptId)?.name || '')}</span><h1 style="font-size:clamp(24px,4vw,32px);margin:4px 0">Hola, ${escape(me.first)} 👋</h1><p class="muted" style="margin:0">${escape(me.position)} · ${escape(fmtDay(T, { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div></div>
      ${teamPend ? `<a class="btn btn-accent" href="#/equipo">👥 ${teamPend} solicitud${teamPend > 1 ? 'es' : ''} por aprobar</a>` : ''}</div>
    <div class="kpis">
      <a class="card kpi" href="#/solicitudes" style="text-decoration:none;color:inherit"><div class="stat"><span class="label">Vacaciones disponibles</span><span class="value">${fmtDays(bal.available)}</span><span class="delta">${bal.used} usados este año · ${bal.pending} pendientes</span></div></a>
      <a class="card kpi" href="#/liquidaciones" style="text-decoration:none;color:inherit"><div class="stat"><span class="label">Último líquido</span><span class="value">${lastSlip ? money(slipDetail(lastSlip).liquido) : '—'}</span><span class="delta">${lastSlip ? escape(periodLabel(lastSlip.period)) : 'Sin liquidaciones'}</span></div></a>
      <a class="card kpi" href="#/solicitudes" style="text-decoration:none;color:inherit"><div class="stat"><span class="label">Solicitudes pendientes</span><span class="value">${pend.length}</span><span class="delta">${next ? `Próx. ausencia: ${escape(fmtDay(next.from))}` : 'Sin ausencias próximas'}</span></div></a>
      <a class="card kpi" href="#/evaluacion" style="text-decoration:none;color:inherit"><div class="stat"><span class="label">Evaluación</span><span class="value">${!cycle ? '—' : myRev?.self ? '✓ Enviada' : 'Pendiente'}</span><span class="delta">${cycle ? escape(cycle.name) : 'Sin ciclo abierto'}</span></div></a>
    </div>
    <div class="dash-grid">
      <div class="card span-4 clock-card"><h3>Marcaje de hoy</h3><div class="time" data-time>${hm()}</div>
        <p class="muted small" style="margin:0 0 12px">${mark ? `Entrada ${mark.in}${mark.out ? ` · Salida ${mark.out}` : ''}` : `Aún no marcas entrada (límite ${ENTRY_LIMIT})`}</p>
        <button class="btn ${mark && !mark.out ? 'btn-accent' : 'btn-primary'} btn-lg btn-block" data-clock ${mark?.out ? 'disabled' : ''}>${!mark ? '▶ Marcar entrada' : !mark.out ? '■ Marcar salida' : 'Jornada registrada'}</button>
        <a class="small" href="#/asistencia" style="display:inline-block;margin-top:10px">Ver mi asistencia →</a></div>
      <div class="span-8 stack">${surveyCard(db, me, ctx.user)}
        <div class="card"><div class="card-h"><h3>Comunicados</h3><a class="small" href="#/anuncios">Ver todos</a></div><div class="stack" style="gap:12px">${ann.map(a => `<div><b>${a.pinned ? '📌 ' : ''}${escape(a.title)}</b> <span class="badge plain">${escape(a.category)}</span><p class="muted small" style="margin:4px 0 0">${escape(a.body)}</p></div>`).join('')}</div></div></div>
      <div class="card span-6"><div class="card-h"><h3>Mis solicitudes</h3><a class="btn btn-sm btn-primary" href="#/solicitudes">＋ Nueva</a></div>${db.query('requests', r => r.employeeId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map(r => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${REQ_TYPES[r.type]?.ico} ${escape(REQ_TYPES[r.type]?.label)} · ${escape(fmtDay(r.from))}${r.to !== r.from ? ` → ${escape(fmtDay(r.to))}` : ''}</span>${reqBadge(r.status)}</div>`).join('') || '<p class="muted">Aún no tienes solicitudes.</p>'}</div>
      <div class="card span-6"><div class="card-h"><h3>🎂 Cumpleaños del mes</h3><a class="small" href="#/celebraciones">Ver más</a></div>${bdays.map(e => `<div class="cele">${avatar(e, 34)}<span><b>${escape(e.name)}</b><br><small class="muted">${escape(ctx.dept(e.deptId)?.name || '')}</small></span><span class="when">${escape(fmtDay(T.slice(0, 4) + e.birth.slice(4), { day: 'numeric', month: 'short' }))}</span></div>`).join('') || '<p class="muted">Sin cumpleaños este mes.</p>'}</div>
    </div>`;
  el.querySelector('[data-clock]')?.addEventListener('click', () => clock(db, me, ctx.user));
  wireSurvey(el, db, me, ctx.user);
  clearInterval(el.__tick); el.__tick = setInterval(() => { const t = el.querySelector('[data-time]'); if (t) t.textContent = hm(); }, 10000);
}
export { date, ago };
