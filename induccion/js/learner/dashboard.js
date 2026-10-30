// Panel del trabajador: recordatorios, inducciones asignadas e historial.
import { escape, date } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { getPlan, getUser, assignmentPct, assignmentStatus, STATUS, certStatus, daysLeft, planModules } from '../data/model.js';

export const ring = (pct, label = 'completado') => `<div class="ring" role="img" aria-label="Progreso ${pct}%"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg" style="stroke-dasharray:326.7;stroke-dashoffset:${(326.7 * (1 - pct / 100)).toFixed(1)}"/></svg><div><strong>${pct}%</strong><span>${label}</span></div></div>`;

export function reminders(u) {
  const out = [];
  db.query('certificates', c => c.userId === u.id).forEach(c => {
    const st = certStatus(c), p = getPlan(c.planId);
    if (st === 'por_vencer') out.push(['warning', `Tu certificado de «${p?.name}» vence en ${daysLeft(c.expiresAt)} días`, `Vence el ${date(c.expiresAt)}. Pide a tu supervisor la reinducción.`, `#/certificado/${c.id}`, 'Ver certificado']);
    if (st === 'vencido' && !db.find('certificates', x => x.userId === u.id && x.planId === c.planId && x.id !== c.id && certStatus(x) !== 'vencido')) out.push(['danger', `Tu certificado de «${p?.name}» está vencido`, `Venció el ${date(c.expiresAt)}. No puedes ingresar a faena sin renovarlo.`, `#/certificado/${c.id}`, 'Ver']);
  });
  db.query('assignments', a => a.userId === u.id && !a.cancelled && !a.completedAt).forEach(a => {
    const p = getPlan(a.planId), st = assignmentStatus(a), d = daysLeft(a.dueAt);
    if (st === 'vencida') out.push(['danger', `«${p?.name}» está vencida`, `El plazo terminó el ${date(a.dueAt)}. Complétala cuanto antes.`, `#/plan/${a.id}`, 'Continuar']);
    else if (st === 'practica') out.push(['success', `Teoría aprobada en «${p?.name}»`, 'Coordina con tu supervisor la evaluación práctica en terreno para obtener tu certificado.', `#/plan/${a.id}`, 'Ver detalle']);
    else if (d <= 3) out.push(['warning', `«${p?.name}» vence en ${d} día${d === 1 ? '' : 's'}`, `Plazo: ${date(a.dueAt)}.`, `#/plan/${a.id}`, 'Continuar']);
  });
  return out;
}

export function renderDashboard(view) {
  const u = auth.current();
  const list = db.query('assignments', a => a.userId === u.id && !a.cancelled);
  const active = list.filter(a => !a.completedAt).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const done = list.filter(a => a.completedAt).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const overall = active.length ? Math.round(active.reduce((s, a) => s + assignmentPct(a), 0) / active.length) : 100;
  const sup = getUser(u.supervisorId);
  const rem = reminders(u);
  view.innerHTML = `
    <div class="lx-head">
      <div><span class="eyebrow">Mi panel</span><h1>Hola, ${escape(u.name.split(' ')[0])}</h1>
        <p class="muted" style="margin:6px 0 0">RUT ${escape(u.rut || '—')} · ${escape(u.cargo || '')} · ${escape(u.area || '')}${sup ? ` · Supervisor(a): ${escape(sup.name)}` : ''}</p></div>
      ${ring(overall, active.length ? 'en curso' : 'al día')}
    </div>
    ${rem.length ? `<div class="reminders">${rem.map(([k, t, d, href, cta]) => `<div class="reminder ${k}" role="status"><div class="grow"><b>${escape(t)}</b><span class="small">${escape(d)}</span></div><a class="btn btn-sm" href="${href}">${escape(cta)}</a></div>`).join('')}</div>` : ''}
    <h2 style="font-size:22px">Inducciones asignadas</h2>
    ${active.length ? `<div class="grid-auto">${active.map(tile).join('')}</div>` : '<div class="card empty"><span class="icon">🎉</span><p>No tienes inducciones pendientes. ¡Estás al día!</p></div>'}
    <h2 style="font-size:22px;margin-top:32px">Historial</h2>
    ${done.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Inducción</th><th>Completada</th><th>Puntaje</th><th></th></tr></thead><tbody>${done.map(a => `<tr><td>${escape(getPlan(a.planId)?.name)}</td><td>${date(a.completedAt)}</td><td>${a.bestScore}%</td><td style="text-align:right">${a.certificateId ? `<a class="btn btn-sm" href="#/certificado/${a.certificateId}">Certificado</a>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aún no completas inducciones.</p>'}`;
}

function tile(a) {
  const p = getPlan(a.planId);
  if (!p) return '';
  const pct = assignmentPct(a), st = assignmentStatus(a), [label, kind] = STATUS[st];
  const mins = planModules(p).reduce((t, m) => t + (+m.minutes || 0), 0);
  return `<article class="card plan-tile">
    <div class="row between"><span class="badge badge-${kind}">${label}</span><span class="small muted">${escape(p.code)}</span></div>
    <h3>${escape(p.name)}</h3>
    <div class="meta"><span>⏱ ${mins} min</span><span>📅 Plazo ${date(a.dueAt)}</span><span>${p.moduleIds.length} módulos</span></div>
    <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="progress" style="flex:1"><i style="--v:${pct}%"></i></div><b class="small">${pct}%</b></div>
    <a class="btn btn-primary" href="#/plan/${a.id}">${pct ? 'Continuar' : 'Comenzar'}</a>
  </article>`;
}
