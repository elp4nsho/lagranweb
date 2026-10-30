// Metas mensuales por ejecutivo: avance real, forecast del mes e historial.
import { db } from '../data/db.js';
import { escape, money, pct, toast, barChart } from '../../../assets/core/ui.js';
import { OPEN_STAGES, stage } from '../shared/constants.js';
import { can, seesAll } from '../shared/perms.js';
import { moneyShort, monthKey, monthLabel, lastMonths, reps, avatar } from '../shared/util.js';
import { pageHead } from './components.js';
import { icon } from '../shared/icons.js';

const state = { offset: 0 };

export function render(view, { user }) {
  const edit = can('goals.edit');
  const all = seesAll(user);
  const month = lastMonths(1, state.offset)[0];
  const people = all ? reps() : [user];
  const probs = db.getValue('settings', {}).probabilities || {};
  const rows = people.map(u => {
    const g = db.find('goals', x => x.userId === u.id && x.month === month);
    const won = db.query('deals', d => d.ownerId === u.id && d.stage === 'ganado' && monthKey(d.closedAt) === month).reduce((s, d) => s + d.amount, 0);
    const fc = db.query('deals', d => d.ownerId === u.id && OPEN_STAGES.includes(d.stage) && monthKey(d.closeDate) === month).reduce((s, d) => s + d.amount * (probs[d.stage] ?? stage(d.stage).prob) / 100, 0);
    return { u, target: g?.target || 0, won, fc, pct: g?.target ? won / g.target * 100 : 0 };
  });
  const tTarget = rows.reduce((s, r) => s + r.target, 0), tWon = rows.reduce((s, r) => s + r.won, 0);
  const hist = lastMonths(6, state.offset).map(m => ({ m, target: db.query('goals', g => g.month === m && people.some(p => p.id === g.userId)).reduce((s, g) => s + g.target, 0), won: db.query('deals', d => d.stage === 'ganado' && monthKey(d.closedAt) === m && people.some(p => p.id === d.ownerId)).reduce((s, d) => s + d.amount, 0) }));

  view.innerHTML = `
    ${pageHead('Metas', all ? 'Metas mensuales del equipo' : 'Tu meta mensual', `<div class="row" style="gap:6px"><button class="btn btn-sm" data-m="-1" aria-label="Mes anterior">←</button><b class="month-title">${monthLabel(month, true)}</b><button class="btn btn-sm" data-m="1" aria-label="Mes siguiente">→</button></div>`)}
    <div class="grid-3">
      <div class="card kpi"><div class="stat"><span class="label">Meta ${all ? 'del equipo' : ''}</span><span class="value">${moneyShort(tTarget)}</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Ganado</span><span class="value">${moneyShort(tWon)}</span><span class="delta ${tWon >= tTarget ? 'up' : 'down'}">${pct(tTarget ? tWon / tTarget * 100 : 0)} de cumplimiento</span></div></div>
      <div class="card kpi"><div class="stat"><span class="label">Forecast restante del mes</span><span class="value">${moneyShort(rows.reduce((s, r) => s + r.fc, 0))}</span></div></div>
    </div>
    <section class="card stack">
      <div class="row between"><h3 style="margin:0">Avance por ejecutivo</h3>${edit ? `<button class="btn btn-primary btn-sm" data-save>${icon('check', 14)} Guardar metas</button>` : ''}</div>
      <div class="goal-list">${rows.map(r => `<div class="goal-row">
        <span class="user-chip">${avatar(r.u, 34)}<span><b>${escape(r.u.name)}</b><br><small class="muted">${escape(r.u.title || '')}</small></span></span>
        <div class="goal-bar"><div class="progress goal-progress"><i style="--v:${Math.min(100, r.pct)}%"></i></div>
          <small class="muted">${money(r.won)} ganado · forecast ${moneyShort(r.fc)} · <b class="${r.pct >= 100 ? 'ok' : ''}">${pct(r.pct)}</b>${r.pct >= 100 ? ' · ¡meta cumplida!' : ''}</small></div>
        ${edit ? `<label class="goal-input"><span class="sr-only">Meta de ${escape(r.u.name)}</span><input class="input select-sm" type="number" min="0" step="500000" value="${r.target}" data-goal="${r.u.id}"></label>` : `<b>${moneyShort(r.target)}</b>`}
      </div>`).join('')}</div>
    </section>
    <section class="card stack">
      <h3 style="margin:0">Meta vs. ganado (6 meses)</h3>
      <div class="legend small"><span><i class="lg-goal"></i> Meta</span><span><i class="lg-won"></i> Ganado</span></div>
      ${barChart(hist.flatMap(h => [{ label: monthLabel(h.m), value: h.target, color: 'var(--surface-3)' }, { label: '', value: h.won, color: h.won >= h.target ? 'var(--success)' : 'var(--primary)' }]), { format: money })}
    </section>`;
  view.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { state.offset += +b.dataset.m; render(view, { user }); });
  view.querySelector('[data-save]')?.addEventListener('click', () => {
    view.querySelectorAll('[data-goal]').forEach(inp => {
      const uid = inp.dataset.goal, target = Math.max(0, +inp.value || 0);
      const g = db.find('goals', x => x.userId === uid && x.month === month);
      if (g) { if (g.target !== target) db.update('goals', g.id, { target }); } else db.insert('goals', { id: `g-${uid}-${month}`, userId: uid, month, target });
    });
    db.log('metas', `Actualizó metas de ${monthLabel(month, true)}`, user.id);
    toast('Metas guardadas', 'success');
  });
}
