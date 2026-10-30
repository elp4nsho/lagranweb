// Jefatura: aprobar/rechazar solicitudes, calendario del equipo y evaluar desempeño.
import { escape, toast, date, modal } from '../../../assets/core/ui.js';
import { avatar, REQ_TYPES, reqBadge, personCell } from '../shared/util.js';
import { vacationBalance, fmtDays } from '../shared/vacation.js';
import { monthCal, monthLabel, shiftMonth } from '../shared/mcal.js';
import { today, fmtDay } from '../shared/dates.js';
import { scaleHTML, avg, LEVEL } from './evaluacion.js';

let tab = 'aprobaciones', ym = today().slice(0, 7);

export function decide(ctx, id, status, comment = '') {
  const { db } = ctx, r = db.get('requests', id), e = db.get('employees', r.employeeId);
  db.update('requests', id, { status, comment, approverId: ctx.me?.id, decidedAt: new Date().toISOString() });
  ctx.notify(e.id, `Tu solicitud de ${REQ_TYPES[r.type].label.toLowerCase()} del ${fmtDay(r.from)} fue ${status}${comment ? `: “${comment}”` : ''}.`);
  if (status === 'aprobada' && r.type === 'licencia') db.update('employees', e.id, { status: r.to >= today() && r.from <= today() ? 'licencia' : e.status });
  db.log('solicitud', `${ctx.user.name} ${status === 'aprobada' ? 'aprobó' : 'rechazó'} ${REQ_TYPES[r.type].label} de ${e.name}`, ctx.user.id);
  toast(`Solicitud ${status}. Notificamos a ${e.first}.`, status === 'aprobada' ? 'success' : 'warning');
}
export function rejectDialog(ctx, id) {
  const m = modal({ title: 'Rechazar solicitud', body: '<div class="field"><label for="rj">Motivo (se envía al colaborador)</label><textarea class="textarea" id="rj" rows="3" placeholder="Ej: Coincide con el cierre de mes"></textarea></div>', foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" data-ok>Rechazar</button>' });
  m.el.querySelector('[data-ok]').onclick = () => { decide(ctx, id, 'rechazada', m.el.querySelector('#rj').value.trim()); m.close(); };
}

function evaluate(ctx, rev, cycle) {
  const { db } = ctx, e = db.get('employees', rev.employeeId);
  const m = modal({ title: `Evaluar a ${e.name}`, size: 'lg', body: `<form class="stack" data-ev>
    ${rev.self ? `<div class="card" style="box-shadow:none"><b>Autoevaluación (${avg(rev.self.scores)})</b><p class="muted small" style="margin:4px 0 0">${escape(rev.self.comment)}<br>Objetivos: ${escape(rev.self.goals)}</p></div>` : '<p class="badge badge-warning">Aún no envía su autoevaluación</p>'}
    <div>${cycle.competencies.map(c => `<div class="score-row"><span><b>${escape(c)}</b>${rev.self ? `<br><small class="muted">Autoevaluación: ${rev.self.scores[c]}</small>` : ''}</span>${scaleHTML(c, rev.manager?.scores?.[c])}</div>`).join('')}</div>
    <div class="field"><label for="ev-mc">Retroalimentación</label><textarea class="textarea" id="ev-mc" name="comment" rows="3">${escape(rev.manager?.comment || '')}</textarea></div></form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Guardar evaluación</button>' });
  m.el.querySelector('[data-ok]').onclick = () => {
    const f = m.el.querySelector('[data-ev]'), scores = {};
    for (const c of cycle.competencies) { const v = f.querySelector(`[name="${CSS.escape(c)}"]:checked`); if (!v) return toast(`Califica «${c}»`, 'warning'); scores[c] = +v.value; }
    db.update('reviews', rev.id, { manager: { scores, comment: f.comment.value.trim(), at: today() } });
    ctx.notify(e.id, `Tu jefatura completó tu evaluación (${cycle.name}).`);
    db.log('desempeño', `${ctx.user.name} evaluó a ${e.name}`, ctx.user.id);
    toast('Evaluación guardada', 'success'); m.close();
  };
}

export function render(el, ctx) {
  const { db } = ctx, team = ctx.team, ids = new Set(team.map(e => e.id));
  const pend = db.query('requests', r => ids.has(r.employeeId) && r.status === 'pendiente').sort((a, b) => a.from.localeCompare(b.from));
  const cycle = db.find('cycles', c => c.status === 'abierto');
  const reviews = cycle ? db.query('reviews', r => r.cycleId === cycle.id && ids.has(r.employeeId)) : [];
  const policy = db.getValue('policy');
  const emp = id => db.get('employees', id);
  let body = '';
  if (tab === 'aprobaciones') {
    body = pend.length ? `<div class="stack">${pend.map(r => { const e = emp(r.employeeId), b = vacationBalance(db, e, policy); return `<div class="card row between"><div class="row" style="flex-wrap:nowrap">${avatar(e, 44)}<div><b>${escape(e.name)}</b> · ${REQ_TYPES[r.type].ico} ${escape(REQ_TYPES[r.type].label)}<br><span class="muted small">${escape(fmtDay(r.from))}${r.to !== r.from ? ` → ${escape(fmtDay(r.to))}` : ''} · <b>${fmtDays(r.days)}</b>${r.type === 'vacaciones' ? ` · saldo tras aprobar: ${fmtDays(b.available + r.days - r.days)}` : ''}${r.reason ? ` · “${escape(r.reason)}”` : ''}</span></div></div>
      <div class="row gap-sm"><button class="btn btn-primary btn-sm" data-ok="${r.id}">✓ Aprobar</button><button class="btn btn-sm" data-no="${r.id}">Rechazar</button></div></div>`; }).join('')}</div>` : '<div class="card empty"><span class="icon">✅</span>No tienes solicitudes pendientes.</div>';
  } else if (tab === 'calendario') {
    const reqs = db.query('requests', r => ids.has(r.employeeId) && ['aprobada', 'pendiente'].includes(r.status));
    body = `<div class="card"><div class="card-h"><h3>Ausencias del equipo</h3><div class="row gap-sm"><button class="btn btn-sm" data-m="-1" aria-label="Mes anterior">←</button><b>${escape(monthLabel(ym))}</b><button class="btn btn-sm" data-m="1" aria-label="Mes siguiente">→</button></div></div>
      ${monthCal(ym, k => reqs.filter(r => r.from <= k && r.to >= k).map(r => ({ label: emp(r.employeeId).first, title: `${emp(r.employeeId).name} · ${REQ_TYPES[r.type].label}`, cls: r.status === 'pendiente' ? 'pend' : r.type === 'licencia' ? 'lic' : '' })))}
      <p class="muted small" style="margin:10px 0 0">Azul: aprobada · amarillo: pendiente · rojo: licencia médica.</p></div>`;
  } else if (tab === 'evaluaciones') {
    body = !cycle ? '<div class="card empty">No hay ciclo abierto.</div>' : `<div class="card"><h3>${escape(cycle.name)}</h3><div class="table-wrap"><table class="table"><thead><tr><th>Colaborador</th><th>Autoevaluación</th><th>Mi evaluación</th><th></th></tr></thead><tbody>
      ${team.map(e => { const r = reviews.find(x => x.employeeId === e.id); return `<tr><td>${personCell(e)}</td><td>${r?.self ? `<span class="badge badge-success">${avg(r.self.scores)}</span>` : '<span class="badge badge-warning">Pendiente</span>'}</td><td>${r?.manager ? `<span class="badge badge-primary">${avg(r.manager.scores)} · ${LEVEL(avg(r.manager.scores))}</span>` : '<span class="muted">—</span>'}</td><td class="right">${r ? `<button class="btn btn-sm ${r.manager ? '' : 'btn-primary'}" data-eval="${r.id}">${r.manager ? 'Editar' : 'Evaluar'}</button>` : '<span class="muted small">No participa</span>'}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
  } else {
    body = `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Colaborador</th><th>Ingreso</th><th>Contrato</th><th>Vacaciones disp.</th><th>Hoy</th></tr></thead><tbody>
      ${team.map(e => { const b = vacationBalance(db, e, policy); const out = db.find('requests', r => r.employeeId === e.id && r.status === 'aprobada' && r.from <= today() && r.to >= today()); return `<tr><td>${personCell(e)}</td><td>${escape(date(e.hireDate + 'T12:00'))}</td><td>${escape(e.contractType)}</td><td>${fmtDays(b.available)}</td><td>${out ? `<span class="badge badge-warning">${escape(REQ_TYPES[out.type].label)}</span>` : '<span class="badge badge-success">Disponible</span>'}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
  }
  el.innerHTML = `<div class="page-head"><div><h1>Mi equipo</h1><p class="muted" style="margin:4px 0 0">${team.length} personas a cargo.</p></div></div>
    <div class="tabs" role="tablist">${[['aprobaciones', `Aprobaciones (${pend.length})`], ['calendario', 'Calendario'], ['evaluaciones', 'Evaluaciones'], ['equipo', 'Equipo']].map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
  el.onclick = e => {
    const t = e.target.closest('[data-tab]'), ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]'), m = e.target.closest('[data-m]'), ev = e.target.closest('[data-eval]');
    if (t) { tab = t.dataset.tab; render(el, ctx); }
    if (ok) decide(ctx, ok.dataset.ok, 'aprobada');
    if (no) rejectDialog(ctx, no.dataset.no);
    if (m) { ym = shiftMonth(ym, +m.dataset.m); render(el, ctx); }
    if (ev) evaluate(ctx, db.get('reviews', ev.dataset.eval), cycle);
  };
}
