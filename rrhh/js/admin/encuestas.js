// Encuestas de clima (eNPS): crear, abrir/cerrar y ver resultados con gráficos.
import { escape, toast, date, barChart, donutChart, lineChart } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete, kpi } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { enps } from './dashboard.js';
import { today } from '../shared/dates.js';

export function render(el, ctx) {
  const { db } = ctx;
  const active = db.count('employees', e => e.status === 'activo');
  const rows = db.all('surveys').map(s => { const rs = db.query('responses', r => r.surveyId === s.id); return { ...s, n: rs.length, score: enps(rs), rate: Math.round(rs.length / (active || 1) * 100) }; });
  const trend = rows.slice().sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  el.innerHTML = `${pageHead('Encuestas eNPS', 'eNPS = % promotores (9–10) − % detractores (0–6). Respuestas anónimas desde el portal.', '<button class="btn btn-primary" data-act="new">＋ Nueva encuesta</button>')}
    <div class="card"><h3>Evolución del eNPS</h3>${lineChart(trend.map(s => ({ label: s.title.replace('Pulso eNPS ', ''), value: Math.max(0, s.score) })), { format: v => `eNPS ${v}` })}</div><div data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    key: 'surv', rows, sort: 'openedAt', dir: -1,
    columns: [
      { key: 'title', label: 'Encuesta', render: r => `<b>${escape(r.title)}</b><br><small class="muted">${escape(date(r.openedAt + 'T12:00'))}</small>` },
      { key: 'status', label: 'Estado', render: r => `<span class="badge ${r.status === 'abierta' ? 'badge-success' : ''}">${escape(r.status)}</span>` },
      { key: 'n', label: 'Respuestas', render: r => `${r.n} <small class="muted">(${r.rate} %)</small>` },
      { key: 'score', label: 'eNPS', render: r => `<b>${r.score}</b>` },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('res', r.id, 'Resultados')}${r.status === 'abierta' ? actBtn('close', r.id, 'Cerrar') : actBtn('open', r.id, 'Reabrir', 'btn-ghost')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    onRow: r => ctx.go(`/encuestas/${r.id}`)
  });
  onActs(el, {
    new: async () => {
      const v = await formDialog({ title: 'Nueva encuesta eNPS', fields: [{ name: 'title', label: 'Título', required: true, span: 2 }, { name: 'question', label: 'Pregunta (0 a 10)', type: 'textarea', required: true, span: 2 }], values: { title: `Pulso eNPS ${today().slice(0, 7)}`, question: '¿Qué tan probable es que recomiendes Grupo Cordillera como lugar para trabajar?' } });
      if (!v) return;
      db.query('surveys', s => s.status === 'abierta').forEach(s => db.update('surveys', s.id, { status: 'cerrada', closedAt: today() }));
      db.insert('surveys', { ...v, status: 'abierta', openedAt: today(), closedAt: null, respondents: [] });
      db.query('employees', e => e.status === 'activo').forEach(e => ctx.notify(e.id, `Nueva encuesta anónima: ${v.title}`));
      db.log('encuesta', `Abrió la encuesta ${v.title}`, ctx.user.id); toast('Encuesta publicada en el portal', 'success');
    },
    res: id => ctx.go(`/encuestas/${id}`),
    close: id => { db.update('surveys', id, { status: 'cerrada', closedAt: today() }); db.log('encuesta', 'Cerró una encuesta', ctx.user.id); toast('Encuesta cerrada', 'success'); },
    open: id => { db.query('surveys', s => s.status === 'abierta').forEach(s => db.update('surveys', s.id, { status: 'cerrada' })); db.update('surveys', id, { status: 'abierta' }); toast('Encuesta reabierta', 'success'); },
    del: id => { const s = db.get('surveys', id); confirmDelete(`la encuesta «${s.title}» y sus respuestas`, () => { db.query('responses', r => r.surveyId === id).forEach(r => db.remove('responses', r.id)); db.remove('surveys', id); }, { db, user: ctx.user, log: `Eliminó la encuesta ${s.title}` }); }
  });
}

export function renderResults(el, ctx, { id }) {
  const { db } = ctx, s = db.get('surveys', id);
  if (!s) { el.innerHTML = '<div class="card empty">Encuesta no encontrada.</div>'; return; }
  const rs = db.query('responses', r => r.surveyId === id), n = rs.length || 1;
  const pro = rs.filter(r => r.score >= 9).length, pas = rs.filter(r => r.score >= 7 && r.score <= 8).length, det = rs.filter(r => r.score <= 6).length;
  const depts = db.all('departments').map(d => { const x = rs.filter(r => r.deptId === d.id); return { label: d.name.split(' ')[0], value: x.length >= 3 ? Math.max(0, enps(x)) : 0, n: x.length }; });
  el.innerHTML = `${pageHead(s.title, escape(s.question), '<a class="btn btn-ghost" href="#/encuestas">← Encuestas</a>')}
    <div class="kpis">${kpi('eNPS', `<span class="enps-big">${enps(rs)}</span>`)}${kpi('Respuestas', rs.length)}${kpi('Promotores', `${Math.round(pro / n * 100)} %`)}${kpi('Detractores', `${Math.round(det / n * 100)} %`)}${kpi('Promedio', (rs.reduce((a, r) => a + r.score, 0) / n).toFixed(1).replace('.', ','))}</div>
    <div class="dash-grid">
      <div class="card span-4"><h3>Segmentos</h3>${donutChart([{ label: 'Promotores (9–10)', value: pro, color: 'var(--success)' }, { label: 'Pasivos (7–8)', value: pas, color: 'var(--warning)' }, { label: 'Detractores (0–6)', value: det, color: 'var(--danger)' }], { label: String(enps(rs)) })}</div>
      <div class="card span-8"><h3>Distribución de puntajes</h3>${barChart(Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: rs.filter(r => r.score === i).length, color: i >= 9 ? 'var(--success)' : i >= 7 ? 'var(--warning)' : 'var(--danger)' })), { format: v => `${v} respuestas` })}</div>
      <div class="card span-6"><h3>eNPS por área</h3>${barChart(depts, { format: v => `eNPS ${v}` })}<p class="muted small">Áreas con menos de 3 respuestas se muestran en 0 para resguardar el anonimato.</p></div>
      <div class="card span-6"><h3>Comentarios (${rs.filter(r => r.comment).length})</h3><ul class="log-list">${rs.filter(r => r.comment).slice(0, 12).map(r => `<li><span class="badge ${r.score >= 9 ? 'badge-success' : r.score >= 7 ? 'badge-warning' : 'badge-danger'}">${r.score}</span><span>${escape(r.comment)}</span></li>`).join('') || '<li class="muted">Sin comentarios.</li>'}</ul></div>
    </div>`;
}
