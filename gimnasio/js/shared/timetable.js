// Grilla semanal de clases (sitio público y app del socio).
import { escape } from '../../../assets/core/ui.js';
import { discipline, trainer, classesOn, occupancy, myBooking, classStart, branch } from './domain.js';
import { ymd, addDays, weekStart, parseYmd, DOW_S } from './dates.js';

export function weekDays(offset = 0) { const ws = addDays(weekStart(ymd()), offset * 7); return Array.from({ length: 7 }, (_, i) => addDays(ws, i)); }

export function timetable({ branchId, disc = '', offset = 0, memberId = null, clickable = false, showBranch = false }) {
  const days = weekDays(offset), today = ymd();
  return `<div class="scroll-x"><div class="timetable">${days.map(d => {
    const x = parseYmd(d);
    const list = classesOn(d, branchId).filter(c => !disc || c.disciplineId === disc);
    return `<div class="col"><h4 class="${d === today ? 'today' : ''}">${DOW_S[x.getDay()]} ${x.getDate()}</h4>
      ${list.map(c => {
        const ds = discipline(c.disciplineId), t = trainer(c.trainerId), o = occupancy(c, d);
        const past = classStart(c, d) < new Date(), mine = memberId && myBooking(memberId, c.id, d);
        const tag = clickable && !past ? 'button' : 'div';
        return `<${tag} class="cls ${past ? 'past' : ''} ${o.free === 0 ? 'full' : ''} ${mine ? 'mine' : ''}" style="--c:${ds?.color}" ${tag === 'button' ? `data-class="${c.id}" data-date="${d}"` : ''}>
          <small class="mono">${c.time} · ${c.duration}′</small><b>${escape(ds?.name)}</b><small>${escape(t?.name || '')}${showBranch ? ' · ' + escape(branch(c.branchId)?.name) : ''}</small>
          <div class="occ"><div class="progress"><i style="--v:${Math.min(100, o.pct)}%"></i></div><small>${past ? 'Finalizada' : o.free ? `${o.free} cupos` : `Llena${o.wait ? ` · ${o.wait} en espera` : ''}`}${mine ? ' · <b style="display:inline">Reservada ✓</b>' : ''}</small></div>
        </${tag}>`;
      }).join('') || '<p class="muted small center">Sin clases</p>'}</div>`;
  }).join('')}</div></div>`;
}
