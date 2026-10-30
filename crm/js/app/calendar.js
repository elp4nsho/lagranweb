// Calendario semanal de actividades (llamadas, reuniones, tareas). En móvil se muestra como agenda.
import { db } from '../data/db.js';
import { escape, time, date } from '../../../assets/core/ui.js';
import { ACT_TYPES } from '../shared/constants.js';
import { seesAll, visibleActs } from '../shared/perms.js';
import { startOfWeek, addDays, sameDay, sellers, userName } from '../shared/util.js';
import { pageHead, activityModal, actIcon, opt } from './components.js';
import { icon } from '../shared/icons.js';

const state = { week: null, owner: null, types: ['llamada', 'reunion', 'tarea', 'email'] };
const H0 = 8, H1 = 20, ROW = 48;
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function render(view, { user }) {
  if (!state.week) state.week = startOfWeek(new Date());
  const all = seesAll(user);
  if (state.owner === null) state.owner = all ? '' : 'me';
  const ws = state.week, we = addDays(ws, 7);
  const ownerId = state.owner === 'me' ? user.id : state.owner;
  const acts = visibleActs(user).filter(a => a.type !== 'sistema' && state.types.includes(a.type) && (!ownerId || a.ownerId === ownerId) && new Date(a.dueAt) >= ws && new Date(a.dueAt) < we);
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const title = `${date(ws, { day: 'numeric', month: 'short' })} – ${date(addDays(ws, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`;

  view.innerHTML = `
    ${pageHead('Calendario', `${acts.length} actividades esta semana`, `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva actividad</button>`)}
    <div class="card stack">
      <div class="row between">
        <div class="row" style="gap:6px"><button class="btn btn-sm" data-nav="-1" aria-label="Semana anterior">←</button><button class="btn btn-sm" data-nav="0">Hoy</button><button class="btn btn-sm" data-nav="1" aria-label="Semana siguiente">→</button><b class="cal-title">${title}</b></div>
        <div class="row" style="gap:6px">
          ${all ? `<select class="select select-sm" data-owner aria-label="Ver calendario de"><option value="me" ${state.owner === 'me' ? 'selected' : ''}>Mi calendario</option><option value="" ${state.owner === '' ? 'selected' : ''}>Todo el equipo</option>${sellers().filter(u => u.id !== user.id).map(u => opt(u.id, u.name, state.owner)).join('')}</select>` : ''}
          ${['llamada', 'reunion', 'tarea', 'email'].map(t => `<button class="chip ${state.types.includes(t) ? 'active' : ''}" data-type="${t}">${ACT_TYPES[t].name}</button>`).join('')}
        </div>
      </div>
      <div class="cal-week" style="--rows:${H1 - H0};--row:${ROW}px">
        <div class="cal-head"><span></span>${days.map(d => `<span class="${sameDay(d, new Date()) ? 'today' : ''}"><small>${DAYS[(d.getDay() + 6) % 7]}</small><b>${d.getDate()}</b></span>`).join('')}</div>
        <div class="cal-body">
          <div class="cal-hours">${[...Array(H1 - H0)].map((_, i) => `<span>${String(H0 + i).padStart(2, '0')}:00</span>`).join('')}</div>
          ${days.map((d, di) => `<div class="cal-day ${sameDay(d, new Date()) ? 'today' : ''}" data-day="${di}">
            ${[...Array(H1 - H0)].map((_, h) => `<button class="cal-slot" data-slot="${di}-${H0 + h}" aria-label="Agendar ${DAYS[di]} ${H0 + h}:00"></button>`).join('')}
            ${acts.filter(a => sameDay(a.dueAt, d)).map(a => {
              const t = new Date(a.dueAt); const mins = (t.getHours() - H0) * 60 + t.getMinutes();
              const top = Math.max(0, Math.min((H1 - H0) * 60 - 30, mins)) / 60 * ROW;
              const h = (a.type === 'reunion' ? 60 : 30) / 60 * ROW - 2;
              return `<button class="cal-ev ev-${a.type} ${a.done ? 'done' : ''}" style="top:${top}px;height:${h}px" data-ev="${a.id}" title="${escape(a.subject)} · ${escape(userName(a.ownerId))}"><b>${time(a.dueAt)}</b> ${escape(a.subject)}</button>`;
            }).join('')}
            ${sameDay(d, new Date()) ? `<i class="cal-now" style="top:${((new Date().getHours() - H0) * 60 + new Date().getMinutes()) / 60 * ROW}px"></i>` : ''}
          </div>`).join('')}
        </div>
      </div>
      <div class="cal-agenda">
        ${days.map(d => { const list = acts.filter(a => sameDay(a.dueAt, d)).sort((a, b) => a.dueAt.localeCompare(b.dueAt)); return `<div class="agenda-day ${sameDay(d, new Date()) ? 'today' : ''}"><h4>${date(d, { weekday: 'long', day: 'numeric', month: 'short' })}</h4>${list.map(a => `<button class="agenda-ev ${a.done ? 'done' : ''}" data-ev="${a.id}">${actIcon(a.type)}<span><b>${time(a.dueAt)}</b> ${escape(a.subject)}<br><small class="muted">${escape(userName(a.ownerId))}</small></span></button>`).join('') || '<small class="muted">Sin actividades</small>'}</div>`; }).join('')}
      </div>
    </div>`;

  view.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { const n = +b.dataset.nav; state.week = n ? addDays(state.week, 7 * n) : startOfWeek(new Date()); render(view, { user }); });
  view.querySelector('[data-owner]')?.addEventListener('change', e => { state.owner = e.target.value; render(view, { user }); });
  view.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { const t = b.dataset.type; state.types = state.types.includes(t) ? state.types.filter(x => x !== t) : [...state.types, t]; render(view, { user }); });
  view.querySelector('[data-new]').onclick = () => activityModal({ defaults: { type: 'reunion' } });
  view.querySelectorAll('[data-slot]').forEach(s => s.onclick = () => {
    const [di, h] = s.dataset.slot.split('-').map(Number);
    const t = addDays(ws, di); t.setHours(h, 0, 0, 0);
    activityModal({ defaults: { type: 'reunion', dueAt: t.toISOString(), ownerId: ownerId || user.id } });
  });
  view.querySelectorAll('[data-ev]').forEach(b => b.onclick = e => { e.stopPropagation(); activityModal({ activity: db.get('activities', b.dataset.ev) }); });
}
