// Tareas y pendientes agrupados por vencimiento, con recordatorios.
import { db } from '../data/db.js';
import { seesAll, visibleActs } from '../shared/perms.js';
import { sellers, startOfDay, addDays, exportCSV, userName } from '../shared/util.js';
import { date, time, escape } from '../../../assets/core/ui.js';
import { ACT_TYPES } from '../shared/constants.js';
import { pageHead, activityItem, wireActivityList, activityModal, opt } from './components.js';
import { icon } from '../shared/icons.js';

const state = { owner: null, type: '' };

export function render(view, { user }) {
  const all = seesAll(user);
  if (state.owner === null) state.owner = all ? '' : 'me';
  const ownerId = state.owner === 'me' ? user.id : state.owner;
  const list = visibleActs(user).filter(a => a.type !== 'sistema' && a.type !== 'nota' && (!ownerId || a.ownerId === ownerId) && (state.type ? a.type === state.type : true) && (!a.done || a.type === 'tarea'));
  const today = startOfDay(new Date()), tomorrow = addDays(today, 1), week = addDays(today, 8);
  const pend = list.filter(a => !a.done).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const groups = [
    ['Vencidas', pend.filter(a => new Date(a.dueAt) < Date.now()), 'danger'],
    ['Hoy', pend.filter(a => new Date(a.dueAt) >= Date.now() && new Date(a.dueAt) < tomorrow), 'warning'],
    ['Próximos 7 días', pend.filter(a => new Date(a.dueAt) >= tomorrow && new Date(a.dueAt) < week), 'info'],
    ['Más adelante', pend.filter(a => new Date(a.dueAt) >= week), ''],
    ['Completadas recientemente', list.filter(a => a.done && a.type === 'tarea').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')).slice(0, 10), 'success']
  ];
  view.innerHTML = `
    ${pageHead('Tareas', `${pend.length} pendientes · ${groups[0][1].length} vencidas`, `<button class="btn" data-export>${icon('upload', 16)} CSV</button><button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva tarea</button>`)}
    <div class="row filters">
      ${all ? `<select class="select select-sm" data-owner aria-label="Responsable"><option value="me" ${state.owner === 'me' ? 'selected' : ''}>Mis tareas</option><option value="" ${state.owner === '' ? 'selected' : ''}>Todo el equipo</option>${sellers().filter(u => u.id !== user.id).map(u => opt(u.id, u.name, state.owner)).join('')}</select>` : ''}
      ${[['', 'Todo'], ['tarea', 'Tareas'], ['llamada', 'Llamadas'], ['reunion', 'Reuniones']].map(([k, l]) => `<button class="chip ${state.type === k ? 'active' : ''}" data-type="${k}">${l}</button>`).join('')}
    </div>
    <div class="grid-2 tasks-grid">
      ${groups.map(([label, items, tone]) => `<section class="card stack">
        <div class="row between"><h3 style="margin:0">${label}</h3><span class="badge ${tone ? 'badge-' + tone : 'plain'}">${items.length}</span></div>
        <div class="act-list" data-list>${items.map(a => activityItem(a)).join('') || '<div class="empty small">Nada por aquí</div>'}</div>
      </section>`).join('')}
      <section class="card stack">
        <h3 style="margin:0">${icon('bell', 18)} Recordatorios</h3>
        <p class="muted small" style="margin:0">Cada actividad puede avisarte 15 min, 30 min, 1 hora o 1 día antes. Verás una alerta en pantalla y una notificación en la campana mientras tengas Pulso abierto.</p>
        ${pend.filter(a => a.reminder && !a.reminded).slice(0, 4).map(a => `<div class="row between small"><span>${escape(a.subject)}</span><span class="muted">${date(new Date(new Date(a.dueAt) - a.reminder * 60000), { day: '2-digit', month: 'short' })} ${time(new Date(new Date(a.dueAt) - a.reminder * 60000))}</span></div>`).join('') || '<small class="muted">No hay recordatorios programados.</small>'}
      </section>
    </div>`;
  view.querySelectorAll('[data-list]').forEach(el => wireActivityList(el));
  view.querySelector('[data-owner]')?.addEventListener('change', e => { state.owner = e.target.value; render(view, { user }); });
  view.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { state.type = b.dataset.type; render(view, { user }); });
  view.querySelector('[data-new]').onclick = () => activityModal();
  view.querySelector('[data-export]').onclick = () => exportCSV('tareas.csv', pend.map(a => ({ asunto: a.subject, tipo: ACT_TYPES[a.type].name, vence: `${date(a.dueAt)} ${time(a.dueAt)}`, responsable: userName(a.ownerId), negocio: a.dealId ? db.get('deals', a.dealId)?.title || '' : '' })));
}
