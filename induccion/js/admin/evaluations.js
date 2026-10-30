// Evaluaciones: intentos teóricos (resultados) y flujo de evaluaciones prácticas (pendiente → aprobada/rechazada).
import { pageHead, table, person, badge, html, escape, date, dateTime, downloadCSV, toast, formDialog, modal, panel, kpis } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { getPlan, getCompany, getUser, decidePractical, getModule } from '../data/model.js';
import { passStats } from './stats.js';

export async function practicalDialog(ctx, a) {
  const u = getUser(a.userId), p = getPlan(a.planId);
  const v = await formDialog({
    title: 'Evaluación práctica en terreno', submit: 'Registrar resultado',
    intro: `${escape(u?.name)} · ${escape(p?.name)}. Aprobó la teoría con ${a.bestScore}%.`,
    fields: [
      { name: 'result', label: 'Resultado', type: 'select', options: [['ok', '✓ Aprobada: emitir certificado'], ['no', '✕ Rechazada: debe repetir la evaluación']] },
      { name: 'checks', label: 'Criterios observados', type: 'multi', options: ['Uso correcto de EPP', 'Identifica riesgos del área', 'Conoce la ruta de evacuación', 'Aplica bloqueo (LOTO)', 'Respeta segregación con equipos móviles'] },
      { name: 'notes', label: 'Observaciones', type: 'textarea', placeholder: 'Ej: ejecuta la tarea según procedimiento.' }
    ]
  });
  if (!v) return;
  decidePractical(a.id, v.result === 'ok', [v.checks.length ? `Criterios: ${v.checks.join(', ')}.` : '', v.notes].filter(Boolean).join(' '), ctx.user.id);
  toast(v.result === 'ok' ? 'Evaluación aprobada: certificado emitido' : 'Evaluación rechazada: se notificó al trabajador', v.result === 'ok' ? 'success' : 'warning');
}

export function practicalTable(el, ctx, { pool, key = 'practical' } = {}) {
  const rows = db.query('assignments', a => a.practical && a.practical.status !== 'no_iniciada' && (!pool || pool.has(a.userId))).map(a => ({ ...a, _u: getUser(a.userId), _ps: a.practical.status })).filter(a => a._u);
  const K = { pendiente: ['Pendiente', 'warning'], aprobada: ['Aprobada', 'success'], rechazada: ['Rechazada', 'danger'] };
  table(el, {
    key, rows, pageSize: 8,
    search: a => `${a._u.name} ${getPlan(a.planId)?.name}`,
    filters: [{ key: '_ps', label: 'Estado', options: Object.entries(K).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'u', label: 'Trabajador', value: a => a._u.name, render: a => person(a._u, getCompany(a._u.companyId)?.name) },
      { key: 'planId', label: 'Plan', render: a => escape(getPlan(a.planId)?.name) },
      { key: 'bestScore', label: 'Teoría', render: a => `${a.bestScore}%` },
      { key: 'at', label: 'Fecha', value: a => a.practical.at || a.practical.requestedAt, render: a => date(a.practical.at || a.practical.requestedAt || a.assignedAt) },
      { key: '_ps', label: 'Estado', render: a => badge(K[a._ps][0], K[a._ps][1]) + (a.practical.by ? `<br><small class="muted">${escape(getUser(a.practical.by)?.name || '')}</small>` : '') },
      { key: 'x', label: '', sort: false, align: 'right', render: a => a._ps === 'pendiente' ? '<button class="btn btn-sm btn-primary" data-act="eval">Evaluar</button>' : a.practical.notes ? `<span class="small muted" title="${escape(a.practical.notes)}">📝</span>` : '' }
    ]
  });
  el.addEventListener('row-action', e => { if (e.detail.action === 'eval') practicalDialog(ctx, e.detail.row); });
}

export function renderEvaluations(el, _p, ctx) {
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const ps = passStats();
  const rows = db.all('attempts').map(t => ({ ...t, _u: users[t.userId] })).filter(t => t._u);
  el.innerHTML = pageHead('Evaluaciones', 'Resultados de las evaluaciones teóricas y aprobación de evaluaciones prácticas.', '<button class="btn" data-csv>⬇ CSV intentos</button>') +
    kpis([{ label: 'Intentos registrados', value: String(ps.total) }, { label: 'Tasa de aprobación', value: ps.rate + '%' }, { label: 'Aprobación al 1er intento', value: ps.firstTry + '%' }, { label: 'Puntaje promedio', value: ps.avg + '%' }, { label: 'Prácticas pendientes', value: String(db.count('assignments', a => a.practical?.status === 'pendiente')) }]) +
    panel('Evaluaciones prácticas', '<div data-pr></div>') + panel('Intentos de evaluación teórica', '<div data-t></div>');
  practicalTable(el.querySelector('[data-pr]'), ctx);
  const t = table(el.querySelector('[data-t]'), {
    key: 'attempts', rows, pageSize: 10,
    search: r => `${r._u.name} ${r._u.rut} ${getPlan(r.planId)?.name}`,
    filters: [
      { key: 'passed', label: 'Resultado', options: [['1', 'Aprobados'], ['0', 'Reprobados']], test: (r, v) => r.passed === (v === '1') },
      { key: 'planId', label: 'Plan', options: db.all('plans').map(p => [p.id, p.name]) },
      { key: 'co', label: 'Empresa', options: db.all('companies').map(c => [c.id, c.name]), test: (r, v) => r._u.companyId === v }
    ],
    columns: [
      { key: 'at', label: 'Fecha', render: r => dateTime(r.at) },
      { key: 'u', label: 'Trabajador', value: r => r._u.name, render: r => person(r._u, r._u.rut) },
      { key: 'planId', label: 'Plan', render: r => escape(getPlan(r.planId)?.code || '') },
      { key: 'score', label: 'Puntaje', render: r => html`<b>${r.score}%</b> <small class="muted">${r.correct}/${r.total}</small>` },
      { key: 'durationSec', label: 'Duración', render: r => `${Math.round(r.durationSec / 60)} min` },
      { key: 'passed', label: 'Resultado', value: r => r.passed ? 1 : 0, render: r => badge(r.passed ? 'Aprobado' : 'Reprobado', r.passed ? 'success' : 'danger') }
    ],
    onRow: r => {
      const qs = Object.fromEntries(db.all('questions').map(q => [q.id, q]));
      modal({ title: `Intento de ${r._u.name}`, size: 'lg', body: `<p>${escape(getPlan(r.planId)?.name)} · ${dateTime(r.at)} · <b>${r.score}%</b> (${r.correct}/${r.total})</p>` + (r.answers ? `<ol class="review">${r.answers.map(a => { const q = qs[a.q]; return `<li class="${a.ok ? '' : 'x'}">${a.ok ? '✓' : '✗'} ${escape(q?.q || 'Pregunta eliminada')}<small>${q ? `Respondió: ${escape(q.options[a.a] ?? '—')} · Correcta: ${escape(q.options[q.answer])} · ${escape(getModule(q.moduleId)?.title || '')}` : ''}</small></li>`; }).join('')}</ol>` : '<p class="muted">Intento histórico importado: sin detalle por pregunta.</p>') });
    }
  });
  el.querySelector('[data-csv]').onclick = () => { const l = t.filtered(); downloadCSV('intentos.csv', l.map(r => ({ fecha: dateTime(r.at), trabajador: r._u.name, rut: r._u.rut, empresa: getCompany(r._u.companyId)?.name, plan: getPlan(r.planId)?.name, puntaje: r.score, correctas: `${r.correct}/${r.total}`, duracion_min: Math.round(r.durationSec / 60), resultado: r.passed ? 'Aprobado' : 'Reprobado' }))); toast(`${l.length} intentos exportados`, 'success'); };
}
