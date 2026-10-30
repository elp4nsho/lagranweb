import { escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { plan, branch, activeBranches, discipline, klass, weekCount, bookingBadge } from '../shared/domain.js';
import { timetable } from '../shared/timetable.js';
import { pageHead } from '../shared/shell.js';
import { ymd, fmtShort } from '../shared/dates.js';
import { icon } from '../shared/icons.js';
import { classModal } from './shared.js';

const st = { branch: '', disc: '', off: 0 };
export function renderClasses(v, _, __, { m }) {
  const p = plan(m.planId);
  const branches = p.allBranches ? activeBranches() : [branch(m.branchId)];
  if (!st.branch || !branches.some(b => b.id === st.branch)) st.branch = m.branchId;
  const discs = db.query('disciplines', d => d.active !== false);
  const mine = db.query('bookings', b => b.memberId === m.id && b.date >= ymd() && ['reservada', 'espera'].includes(b.status));
  v.innerHTML = `${pageHead('Reservar clases', `Esta semana llevas <b>${weekCount(m.id, ymd())}</b> de ${p.classesPerWeek >= 99 ? '∞' : p.classesPerWeek} clases de tu plan. Toca una clase para reservar o cancelar.`)}
  <div class="card stack">
    <div class="row" style="gap:8px">${branches.map(b => `<button class="chip ${st.branch === b.id ? 'active' : ''}" data-br="${b.id}">${icon('pin', 14)} ${escape(b.name)}</button>`).join('')}${!p.allBranches ? '<span class="muted small">Tu plan incluye solo tu sede. El plan Black da acceso a todas.</span>' : ''}</div>
    <div class="row between"><div class="row" style="gap:8px"><button class="chip ${!st.disc ? 'active' : ''}" data-d="">Todas</button>${discs.map(d => `<button class="chip ${st.disc === d.id ? 'active' : ''}" data-d="${d.id}">${escape(d.name)}</button>`).join('')}</div>
    <div class="row" style="gap:6px"><button class="btn btn-sm" data-w="-1" ${st.off <= 0 ? 'disabled' : ''} aria-label="Semana anterior">${icon('back', 14)}</button><button class="btn btn-sm" data-w="1" ${st.off >= 1 ? 'disabled' : ''} aria-label="Semana siguiente">${icon('arrow', 14)}</button></div></div>
  </div>
  ${timetable({ branchId: st.branch, disc: st.disc, offset: st.off, memberId: m.id, clickable: true })}
  <div class="card"><h3>Mis reservas</h3>${mine.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Clase</th><th>Sede</th><th>Estado</th><th></th></tr></thead><tbody>${mine.sort((a, b) => (a.date + klass(a.classId).time).localeCompare(b.date + klass(b.classId).time)).map(b => { const c = klass(b.classId); return `<tr><td style="text-transform:capitalize">${escape(fmtShort(b.date))} ${c.time}</td><td>${escape(discipline(c.disciplineId)?.name)}</td><td>${escape(branch(c.branchId)?.name)}</td><td>${bookingBadge(b.status)}</td><td><button class="btn btn-sm" data-class="${c.id}" data-date="${b.date}">Gestionar</button></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted mb0">Aún no tienes reservas.</p>'}</div>`;
  v.querySelectorAll('[data-br]').forEach(b => b.onclick = () => { st.branch = b.dataset.br; renderClasses(v, _, __, { m }); });
  v.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { st.disc = b.dataset.d; renderClasses(v, _, __, { m }); });
  v.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { st.off += +b.dataset.w; renderClasses(v, _, __, { m }); });
  v.querySelectorAll('[data-class]').forEach(b => b.onclick = () => classModal(m, b.dataset.class, b.dataset.date));
}
