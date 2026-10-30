import { escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { activeBranches } from '../shared/domain.js';
import { timetable } from '../shared/timetable.js';
import { icon } from '../shared/icons.js';

const st = { branch: '', disc: '', off: 0 };
export function renderSchedule(el) {
  const branches = activeBranches();
  if (!st.branch) st.branch = branches[0]?.id;
  const discs = db.query('disciplines', d => d.active !== false);
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="section-head" data-anim><div><span class="eyebrow">Horario de clases</span><h1 class="mb0">Semana de entrenamiento</h1><p class="muted mb0">Reserva tu cupo desde la app del socio hasta 2 horas antes.</p></div><a class="btn btn-primary" href="socio.html#/clases">${icon('calendar', 16)} Reservar en mi app</a></div>
    <div class="card stack">
      <div class="row" style="gap:8px">${branches.map(b => `<button class="chip ${st.branch === b.id ? 'active' : ''}" data-br="${b.id}">${icon('pin', 14)} ${escape(b.name)}</button>`).join('')}</div>
      <div class="row between"><div class="row" style="gap:8px"><button class="chip ${!st.disc ? 'active' : ''}" data-d="">Todas</button>${discs.map(d => `<button class="chip ${st.disc === d.id ? 'active' : ''}" data-d="${d.id}">${escape(d.name)}</button>`).join('')}</div>
      <div class="row" style="gap:6px"><button class="btn btn-sm" data-w="-1" ${st.off <= 0 ? 'disabled' : ''} aria-label="Semana anterior">${icon('back', 14)}</button><button class="btn btn-sm" data-w="1" ${st.off >= 1 ? 'disabled' : ''} aria-label="Semana siguiente">${icon('arrow', 14)}</button></div></div>
    </div>
    <div data-tt>${timetable({ branchId: st.branch, disc: st.disc, offset: st.off })}</div>
  </div></section>`;
  el.querySelectorAll('[data-br]').forEach(b => b.onclick = () => { st.branch = b.dataset.br; renderSchedule(el); });
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { st.disc = b.dataset.d; renderSchedule(el); });
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { st.off += +b.dataset.w; renderSchedule(el); });
}
