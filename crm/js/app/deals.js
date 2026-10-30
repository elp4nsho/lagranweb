// Negocios: tablero kanban con arrastrar y soltar entre etapas + vista de lista con filtros.
import { db } from '../data/db.js';
import { escape, money, date, dataTable, modal, norm } from '../../../assets/core/ui.js';
import { STAGES, OPEN_STAGES, stage } from '../shared/constants.js';
import { can, seesAll, visibleDeals } from '../shared/perms.js';
import { moneyShort, avatar, companyName, userName, sellers, exportCSV, DAY } from '../shared/util.js';
import { pageHead, dealModal, changeStage, stageBadge, opt } from './components.js';
import { icon } from '../shared/icons.js';

const state = { mode: 'kanban', owner: '', q: '', closedDays: 30, stage: '' };

export function render(view, ctx) {
  if (ctx.query.vista) state.mode = ctx.query.vista === 'lista' ? 'lista' : 'kanban';
  const user = ctx.user;
  const all = seesAll(user);
  const probs = db.getValue('settings', {}).probabilities || {};
  let deals = visibleDeals(user).filter(d => (!state.owner || d.ownerId === state.owner) && (!state.q || norm(d.title + ' ' + companyName(d.companyId)).includes(norm(state.q))));
  const open = deals.filter(d => OPEN_STAGES.includes(d.stage));
  const total = open.reduce((s, d) => s + d.amount, 0);
  const weighted = open.reduce((s, d) => s + d.amount * (probs[d.stage] ?? stage(d.stage).prob) / 100, 0);

  view.innerHTML = `
    ${pageHead('Negocios', `${open.length} abiertos · ${moneyShort(total)} en pipeline · ${moneyShort(weighted)} ponderado${all ? '' : ' · solo tus negocios'}`, `
      <div class="seg" role="tablist" aria-label="Vista">
        <button class="seg-btn ${state.mode === 'kanban' ? 'active' : ''}" data-mode="kanban" role="tab" aria-selected="${state.mode === 'kanban'}">${icon('kanban', 16)} Tablero</button>
        <button class="seg-btn ${state.mode === 'lista' ? 'active' : ''}" data-mode="lista" role="tab" aria-selected="${state.mode === 'lista'}">${icon('list', 16)} Lista</button>
      </div>
      <button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo negocio</button>`)}
    <div class="row filters">
      <input class="input select-sm" type="search" placeholder="Filtrar por nombre o empresa…" value="${escape(state.q)}" data-q style="max-width:280px" aria-label="Filtrar negocios">
      ${all ? `<select class="select select-sm" data-owner aria-label="Ejecutivo"><option value="">Todo el equipo</option>${sellers().map(u => opt(u.id, u.name, state.owner)).join('')}</select>` : ''}
      ${state.mode === 'kanban' ? `<select class="select select-sm" data-closed aria-label="Cerrados"><option value="30" ${state.closedDays == 30 ? 'selected' : ''}>Cerrados últimos 30 días</option><option value="90" ${state.closedDays == 90 ? 'selected' : ''}>Cerrados últimos 90 días</option><option value="0" ${state.closedDays == 0 ? 'selected' : ''}>Ocultar cerrados</option></select>` : ''}
    </div>
    <div data-board></div>`;
  const board = view.querySelector('[data-board]');
  state.mode === 'kanban' ? renderKanban(board, deals, probs) : renderList(board, deals);

  view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { state.mode = b.dataset.mode; location.hash = `#/negocios?vista=${state.mode}`; });
  view.querySelector('[data-new]').onclick = () => dealModal({ onSaved: d => { location.hash = `#/negocios/${d.id}`; } });
  const q = view.querySelector('[data-q]');
  q.addEventListener('input', () => { state.q = q.value; const pos = q.selectionStart; render(view, ctx); const nq = view.querySelector('[data-q]'); nq.focus(); nq.setSelectionRange(pos, pos); });
  view.querySelector('[data-owner]')?.addEventListener('change', e => { state.owner = e.target.value; render(view, ctx); });
  view.querySelector('[data-closed]')?.addEventListener('change', e => { state.closedDays = +e.target.value; render(view, ctx); });
}

function renderKanban(board, deals, probs) {
  const since = Date.now() - state.closedDays * DAY;
  const cols = STAGES.filter(s => OPEN_STAGES.includes(s.id) || state.closedDays > 0);
  board.innerHTML = `<div class="kanban" data-kanban>${cols.map(s => {
    const list = deals.filter(d => d.stage === s.id && (OPEN_STAGES.includes(s.id) || new Date(d.closedAt) > since)).sort((a, b) => b.amount - a.amount);
    const sum = list.reduce((a, d) => a + d.amount, 0);
    return `<section class="kcol kcol-${s.id}" data-stage="${s.id}" aria-label="${s.name}">
      <header class="kcol-head"><div class="row between" style="gap:6px"><b>${s.name}</b><span class="badge plain">${list.length}</span></div>
        <small class="muted">${moneyShort(sum)} · ${probs[s.id] ?? s.prob}%</small></header>
      <div class="kcol-body" data-drop="${s.id}">
        ${list.map(d => card(d)).join('') || '<div class="kempty">Suelta un negocio aquí</div>'}
      </div></section>`;
  }).join('')}</div>`;

  const kb = board.querySelector('[data-kanban]');
  let dragId = null;
  kb.addEventListener('dragstart', e => {
    const c = e.target.closest('[data-deal]');
    if (!c) return;
    dragId = c.dataset.deal;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    c.classList.add('is-dragging');
    document.body.classList.add('dragging');
  });
  kb.addEventListener('dragend', e => {
    e.target.closest('[data-deal]')?.classList.remove('is-dragging');
    document.body.classList.remove('dragging');
    kb.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
  });
  kb.addEventListener('dragover', e => {
    const col = e.target.closest('[data-stage]');
    if (!col) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    kb.querySelectorAll('.over').forEach(x => x !== col && x.classList.remove('over'));
    col.classList.add('over');
  });
  kb.addEventListener('drop', async e => {
    const col = e.target.closest('[data-stage]');
    if (!col) return;
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    col.classList.remove('over');
    document.body.classList.remove('dragging');
    if (id) await changeStage(id, col.dataset.stage);
  });
  // Alternativa sin arrastre (móvil y teclado): botón "Mover".
  kb.addEventListener('click', e => {
    const mv = e.target.closest('[data-move]');
    if (!mv) return;
    e.preventDefault();
    const d = db.get('deals', mv.dataset.move);
    const m = modal({ title: 'Mover negocio', body: `<p class="muted">${escape(d.title)}</p><div class="stack" style="gap:8px">${STAGES.map(s => `<button class="btn ${s.id === d.stage ? 'btn-primary' : ''} btn-block" data-to="${s.id}" ${s.id === d.stage ? 'disabled' : ''}>${s.name}</button>`).join('')}</div>` });
    m.el.addEventListener('click', async ev => { const b = ev.target.closest('[data-to]'); if (b) { m.close(); await changeStage(d.id, b.dataset.to); } });
  });
}

function card(d) {
  const late = !d.closedAt && new Date(d.closeDate) < Date.now();
  const u = db.get('users', d.ownerId);
  return `<article class="kcard" draggable="true" data-deal="${d.id}" tabindex="0">
    <a class="kcard-title" href="#/negocios/${d.id}" draggable="false">${escape(d.title)}</a>
    <small class="muted">${escape(companyName(d.companyId))}</small>
    <div class="row between kcard-foot">
      <b>${moneyShort(d.amount)}</b>
      <span class="row" style="gap:6px">
        ${d.stage === 'perdido' && d.lostReason ? `<span class="badge badge-danger plain" title="Motivo">${escape(d.lostReason)}</span>` : `<span class="small ${late ? 'late' : 'muted'}" title="Cierre estimado">${icon('clock', 12)} ${date(d.closeDate, { day: '2-digit', month: 'short' })}</span>`}
        ${avatar(u, 22)}
      </span>
    </div>
    <button class="btn btn-ghost btn-sm kmove" data-move="${d.id}" aria-label="Mover ${escape(d.title)} a otra etapa">Mover ${icon('arrow', 12)}</button>
  </article>`;
}

function renderList(board, deals) {
  const rows = deals.filter(d => !state.stage || d.stage === state.stage).map(d => ({ ...d, company: companyName(d.companyId), owner: userName(d.ownerId), prob: stage(d.stage).prob, stageIdx: STAGES.findIndex(s => s.id === d.stage) }));
  board.innerHTML = `<div class="card stack">
    <div class="row filters">${[['', 'Todas'], ...STAGES.map(s => [s.id, s.name])].map(([k, l]) => `<button class="chip ${state.stage === k ? 'active' : ''}" data-st="${k}">${l}</button>`).join('')}
      ${can('export') ? `<button class="btn btn-sm" data-export style="margin-left:auto">${icon('upload', 14)} CSV</button>` : ''}</div>
    <div data-table></div></div>`;
  dataTable(board.querySelector('[data-table]'), {
    rows, pageSize: 15, search: d => `${d.title} ${d.company} ${d.owner}`,
    columns: [
      { key: 'title', label: 'Negocio', render: d => `<a href="#/negocios/${d.id}"><b>${escape(d.title)}</b></a><br><small class="muted">${escape(d.company)}</small>` },
      { key: 'stageIdx', label: 'Etapa', render: d => stageBadge(d.stage) },
      { key: 'amount', label: 'Monto', render: d => money(d.amount) },
      { key: 'prob', label: 'Prob.', render: d => `${d.prob}%` },
      { key: 'closeDate', label: 'Cierre', render: d => date(d.closeDate) },
      { key: 'owner', label: 'Ejecutivo', render: d => `<span class="user-chip">${avatar(db.get('users', d.ownerId), 22)}<span>${escape(d.owner)}</span></span>` }
    ],
    onRow: d => { location.hash = `#/negocios/${d.id}`; }
  });
  board.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { state.stage = b.dataset.st; renderList(board, deals); });
  board.querySelector('[data-export]')?.addEventListener('click', () => exportCSV('negocios.csv', rows.map(d => ({ negocio: d.title, empresa: d.company, etapa: stage(d.stage).name, monto: d.amount, probabilidad: d.prob, cierre: date(d.closeDate), ejecutivo: d.owner, origen: d.source, motivo_perdida: d.lostReason || '' }))));
}
