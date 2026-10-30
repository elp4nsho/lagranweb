// Calendario del equipo: quién va a la oficina cada día de la semana.
import { escape } from '../../../assets/core/ui.js';
import { buildIndex, avatar } from '../shared/util.js';
import { today, addDays, startOfWeek, fmtDay, DOW } from '../shared/dates.js';

let week = null, scope = 'area';
const LABEL = { oficina: 'Oficina', reunion: 'Oficina', remoto: 'Remoto', vacaciones: 'Vacaciones' };

export function render(el, ctx) {
  const { db } = ctx, me = ctx.me;
  week ||= startOfWeek(today());
  const days = [0, 1, 2, 3, 4].map(i => addDays(week, i));
  const idxs = days.map(k => buildIndex(db, me.companyId, k));
  const base = idxs[0];
  const mgrId = me.managerId;
  let people = scope === 'area' ? base.people.filter(p => p.areaId === me.areaId || p.id === mgrId) : scope === 'directos' ? base.people.filter(p => p.managerId === mgrId || p.id === mgrId || p.managerId === me.id) : base.people.slice();
  people.sort((a, b) => (b.id === me.id) - (a.id === me.id) || a.name.localeCompare(b.name, 'es'));
  if (scope === 'empresa') people = people.slice(0, 60);
  const cell = (ix, p, k) => {
    if (k < today() && ix.statusOf(p) !== 'vacaciones') { const s = ix.statusOf(p); return `<span class="cell ${s === 'reunion' ? 'oficina' : s}">${LABEL[s]}</span>`; }
    const s = ix.statusOf(p); const r = ix.resByPerson[p.id];
    return `<span class="cell ${s === 'reunion' ? 'oficina' : s}" title="${r ? `Reserva ${ix.desk[r.deskId]?.desk.code}` : ''}">${LABEL[s]}${r ? ' · ' + escape(ix.desk[r.deskId]?.desk.code || '') : ''}</span>`;
  };
  const totals = idxs.map(ix => people.filter(p => ['oficina', 'reunion'].includes(ix.statusOf(p))).length);
  el.innerHTML = `<div class="page-head"><div><h1 style="font-size:clamp(24px,4vw,34px)">Calendario del equipo</h1><p class="muted" style="margin:0">Planifica tus días en la oficina según quién va. Los días se calculan con los patrones semanales, reservas y vacaciones.</p></div></div>
    <div class="row between"><div class="row gap-sm"><button class="btn btn-sm" data-w="-7" aria-label="Semana anterior">←</button><b>Semana del ${escape(fmtDay(week, { day: 'numeric', month: 'long' }))}</b><button class="btn btn-sm" data-w="7" aria-label="Semana siguiente">→</button><button class="btn btn-sm btn-ghost" data-w="0">Hoy</button></div>
      <div class="tabs" role="tablist">${[['area', 'Mi área'], ['directos', 'Equipo directo'], ['empresa', 'Empresa']].map(([k, l]) => `<button class="tab ${scope === k ? 'active' : ''}" role="tab" aria-selected="${scope === k}" data-scope="${k}">${l}</button>`).join('')}</div></div>
    <div class="table-wrap"><table class="table tcal compact"><thead><tr><th>Persona</th>${days.map(k => `<th class="${k === today() ? 'today' : ''}">${DOW[new Date(k + 'T12:00').getDay()]} ${escape(fmtDay(k, { day: 'numeric' }))}</th>`).join('')}</tr></thead>
      <tbody>${people.map(p => `<tr><td><span class="cell-person">${avatar(p, 28)}<span><b>${escape(p.name)}${p.id === me.id ? ' (tú)' : ''}</b><small>${escape(p.cargo)}</small></span></span></td>${days.map((k, i) => `<td>${cell(idxs[i], idxs[i].byId[p.id] || p, k)}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><th>En oficina</th>${totals.map(n => `<th>${n} / ${people.length}</th>`).join('')}</tr></tfoot></table></div>
    <p class="muted small">¿Quieres cambiar tus días habituales? Edítalos en <a href="#/perfil">Mi perfil</a> o reserva un puesto para un día puntual.</p>`;
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { week = +b.dataset.w ? addDays(week, +b.dataset.w) : startOfWeek(today()); render(el, ctx); });
  el.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { scope = b.dataset.scope; render(el, ctx); });
}
