import { escape, date as fmtDate } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { member, plan, statusBadge } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { progressView, addMeasurement } from '../socio/progress.js';
import { icon } from '../shared/icons.js';

export function renderClients(v, _, __, { t }) {
  v.innerHTML = `${pageHead('Mis clientes', 'Socios asignados a ti para seguimiento personalizado.')}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.query('members', m => m.trainerId === t.id).map(m => { const pr = db.query('progress', p => p.memberId === m.id).sort((a, b) => b.date.localeCompare(a.date)); const lastV = db.query('checkins', k => k.memberId === m.id).sort((a, b) => b.at.localeCompare(a.at))[0]; return { ...m, last: pr[0]?.weight || '', lastDate: pr[0]?.date || '', visit: lastV?.at || '', routine: db.find('routines', r => r.memberId === m.id && r.active)?.name || '' }; }),
    search: m => `${m.name} ${m.code}`,
    columns: [
      { key: 'name', label: 'Socio', render: m => `<div class="cell-user"><span class="avatar" style="--size:32px;--av:${m.color}">${escape(initials(m.name))}</span><span><b>${escape(m.name)}</b><small>${m.code} · ${escape(plan(m.planId)?.name)}</small></span></div>` },
      { key: 'goal', label: 'Objetivo' }, { key: 'status', label: 'Estado', render: m => statusBadge(m.status) },
      { key: 'last', label: 'Último peso', render: m => m.last ? `${m.last} kg <small class="muted">(${escape(fmtDate(m.lastDate, { day: 'numeric', month: 'short' }))})</small>` : '—' },
      { key: 'visit', label: 'Última visita', render: m => m.visit ? escape(fmtDate(m.visit, { day: 'numeric', month: 'short' })) : '—' },
      { key: 'routine', label: 'Rutina', render: m => m.routine ? escape(m.routine) : `<a href="#/rutinas/nueva?socio=${m.id}">Asignar</a>` },
      { key: 'id', label: '', sort: false, render: m => `<div class="acts-cell">${actBtn('view', m.id, 'chart', 'Ver progreso')}</div>` }
    ],
    onRow: m => location.hash = '#/clientes/' + m.id, onAction: (_, id) => location.hash = '#/clientes/' + id,
    empty: 'Aún no tienes clientes asignados.'
  });
}
export function renderClient(v, { id }) {
  const m = member(id);
  if (!m) { v.innerHTML = '<div class="card empty">Socio no encontrado</div>'; return; }
  const logs = db.query('logs', l => l.memberId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  v.innerHTML = `${pageHead(m.name, `<a href="#/clientes">${icon('back', 14)} Clientes</a> · ${escape(m.goal || '')} · ${statusBadge(m.status)}`, `<button class="btn" data-add>${icon('plus', 16)} Medición</button><a class="btn btn-primary" href="#/rutinas/nueva?socio=${m.id}">${icon('dumbbell', 16)} Nueva rutina</a>`)}
  ${progressView(id)}
  <div class="card"><h3>Últimos registros de entrenamiento</h3>${logs.map(l => `<div class="row between small" style="margin-bottom:6px"><span>${escape(l.ex)} · ${l.sets}×${escape(l.reps)} ${l.weight ? l.weight + ' kg' : ''}</span><span class="muted">${escape(fmtDate(l.date))}</span></div>`).join('') || '<p class="muted mb0">Sin registros.</p>'}</div>`;
  v.querySelector('[data-add]').onclick = () => addMeasurement(id);
}
