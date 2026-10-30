// Tablero del jefe de taller / asesor: kanban de OT con arrastrar y soltar, carga por mecánico y ocupación de elevadores.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { STAGES } from '../data/catalog.js';
import { openOTs, ST_OF, canMove, setStatus, sendBudget, totals, mechanics, mechLoad, userName, taskMin, timeHM } from '../shared/domain.js';
import { plate } from '../shared/bits.js';
import { newOT } from './ots.js';

const KC = { recepcion: 'info', diagnostico: 'info', presupuesto: 'warning', aprobado: 'primary', reparacion: 'primary', control: 'warning', listo: 'success' };
let filter = '';

export default {
  id: 'tablero', label: 'Tablero de OT', icon: '🗂️', group: 'Taller', roles: ['admin', 'jefe', 'asesor'], watch: ['ots', 'bays', 'users'],
  render(el, ctx) {
    const paint = () => {
      const ots = openOTs().filter(o => !filter || o.mechanicId === filter || o.advisorId === filter);
      const card = o => { const t = totals(o), late = Date.parse(o.promisedAt) < Date.now(), pend = o.budget.filter(i => i.st === 'pendiente' && o.budgetSentAt).length, run = o.tasks.find(x => x.run), done = o.tasks.filter(x => x.done).length;
        return `<article class="card kcard" draggable="true" data-ot="${o.id}" tabindex="0" aria-label="${escape(o.code)} ${escape(o.plate)}">
          <div class="row between nowrap"><b>${escape(o.code)}</b>${plate(o.plate)}</div>
          <span>${escape(o.car)}</span><small class="muted">${escape(o.symptom.slice(0, 60))}${o.symptom.length > 60 ? '…' : ''}</small>
          ${o.tasks.length ? `<div class="progress"><i style="--v:${done / o.tasks.length * 100}%"></i></div>` : ''}
          <div class="row between small"><span>${o.mechanicId ? '👷 ' + escape(userName(o.mechanicId).split(' ')[0]) : '<span class="text-warning">sin mecánico</span>'}</span><b>${money(t.total)}</b></div>
          <div class="row small">${o.claimId ? '<span class="badge badge-info plain">🛡️ seguro</span>' : ''}${pend ? `<span class="badge badge-warning plain">🔔 ${pend} por aprobar</span>` : ''}${run ? '<span class="badge badge-primary plain">▶ trabajando</span>' : ''}${late ? '<span class="late">⏰ atrasada</span>' : ''}</div>
        </article>`; };
      const mechs = mechanics();
      const bays = db.all('bays');
      el.innerHTML = `${pageHead('Tablero de órdenes de trabajo', 'Arrastra las tarjetas entre columnas para cambiar de etapa (se validan las reglas del flujo). Clic para abrir la OT.', `<select class="select sm" data-filter aria-label="Filtrar"><option value="">Todas las OT</option>${db.query('users', u => ['mecanico', 'asesor'].includes(u.role)).map(u => `<option value="${u.id}" ${u.id === filter ? 'selected' : ''}>${escape(u.name)}</option>`).join('')}</select><button class="btn btn-primary btn-sm" data-new>+ Nueva OT</button>`)}
        <div class="kanban">${STAGES.slice(0, 7).map(([s, l, ic]) => { const list = ots.filter(o => o.status === s); return `<section class="kcol kc-${KC[s]}" data-col="${s}" aria-label="${l}"><h3><span>${ic} ${l}</span><span class="badge">${list.length}</span></h3>${list.map(card).join('')}</section>`; }).join('')}</div>
        <div class="grid-2" style="align-items:start">
          <div class="card stack"><h3 style="margin:0">Carga por mecánico</h3><small class="muted">Horas estándar pendientes vs. jornada de 8 h</small>
            ${mechs.map(m => { const L = mechLoad(m.id); const pct = Math.min(100, L.pendingH / 8 * 100); return `<div class="load-row"><span><b>${escape(m.name)}</b><small class="muted d-block">${escape(m.specialty)}</small></span><div><div class="progress"><i style="--v:${pct}%"></i></div><small class="muted">${L.tasks.length} tareas${L.running ? ` · ▶ ${escape(L.running.ot.code)} ${escape(L.running.desc.slice(0, 26))}` : ''}</small></div><b class="${pct > 95 ? 'text-danger' : ''}">${L.pendingH.toFixed(1).replace('.', ',')} h</b></div>`; }).join('')}</div>
          <div class="card stack"><h3 style="margin:0">Elevadores y bahías</h3><div class="bay-grid">${bays.map(b => { const os = openOTs().filter(o => o.bayId === b.id); return `<div class="bay-tile ${os.length ? 'busy' : ''}"><b>${escape(b.name)}</b><small class="muted">${escape(b.type)}</small>${os.length ? os.slice(0, b.id === 'bay-PT' ? 6 : 2).map(o => `<a href="#/ots/${o.id}" class="small">${escape(o.plate)} · ${escape(ST_OF(o.status).label)}</a>`).join('') + (os.length > 6 ? `<small class="muted">+${os.length - 6} más</small>` : '') : '<span class="badge badge-success plain">Libre</span>'}</div>`; }).join('')}</div></div>
        </div>`;
      el.querySelector('[data-new]').onclick = () => newOT(ctx);
      el.querySelector('[data-filter]').onchange = e => { filter = e.target.value; paint(); };
      let dragId = null;
      el.querySelectorAll('.kcard').forEach(c => {
        c.addEventListener('dragstart', e => { dragId = c.dataset.ot; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
        c.addEventListener('dragend', () => c.classList.remove('dragging'));
        c.addEventListener('click', () => ctx.go('/ots/' + c.dataset.ot));
        c.addEventListener('keydown', e => { if (e.key === 'Enter') ctx.go('/ots/' + c.dataset.ot); });
      });
      el.querySelectorAll('.kcol').forEach(col => {
        col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drop'); });
        col.addEventListener('dragleave', () => col.classList.remove('drop'));
        col.addEventListener('drop', e => {
          e.preventDefault(); col.classList.remove('drop');
          const id = dragId || e.dataTransfer.getData('text/plain'); const o = db.get('ots', id); const to = col.dataset.col;
          if (!o || o.status === to) return;
          const ok = canMove(o, to);
          if (ok !== true) { toast(ok, 'warning'); return; }
          if (to === 'presupuesto') sendBudget(id, ctx.user.id); else setStatus(id, to, ctx.user.id);
          toast(`${o.code} → ${ST_OF(to).label}`, 'success');
        });
      });
    };
    paint();
    const t = setInterval(() => { if (!document.querySelector('.modal-backdrop') && !document.querySelector('.kcard.dragging')) paint(); }, 60000);
    return { refresh: paint, destroy: () => clearInterval(t) };
  }
};
export { taskMin, timeHM };
