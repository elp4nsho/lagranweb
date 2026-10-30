// Pipeline kanban con arrastrar y soltar (y menú "Mover a" en pantallas táctiles).
import { escape, money, toast, formModal, ago } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { STAGES, STAGE_LABEL, model, brand, moveLead, isOpenLead, userName, createLead, showrooms, activeModels, SOURCE_LABEL, addTimeline } from '../shared/domain.js';
import { closeSale, askLost } from './actions.js';
import { icon } from '../shared/icons.js';
import { uiGet, uiSet } from '../shared/util.js';

export function renderPipeline(v, _p, query, { user, mine }) {
  const isMgr = user.role !== 'vendedor';
  const f = { q: '', seller: isMgr ? uiGet('pipeSeller', '') : user.id, temp: '' };
  const sla = (db.getValue('leadRules', {}).slaHours || 2) * 36e5;
  v.innerHTML = `${pageHead('Pipeline', isMgr ? 'Vista de gerencia: todos los ejecutivos.' : `Tus leads activos. Arrastra las tarjetas entre etapas; los nuevos tienen SLA de ${db.getValue('leadRules', {}).slaHours || 2} h para el primer contacto.`, `<button class="btn btn-primary" data-new>${icon('plus', 16)} Lead de showroom</button>`)}
  <div class="list-toolbar"><label class="search-box">${icon('search', 16)}<input class="input" type="search" placeholder="Buscar cliente o modelo" data-q aria-label="Buscar"></label>
    ${isMgr ? `<select class="select" data-seller aria-label="Ejecutivo"><option value="">Todos los ejecutivos</option>${db.query('users', u => u.role === 'vendedor').map(u => `<option value="${u.id}" ${f.seller === u.id ? 'selected' : ''}>${escape(u.name)}</option>`).join('')}</select>` : ''}
    <select class="select" data-temp aria-label="Temperatura"><option value="">Todas las temperaturas</option><option value="caliente">Calientes</option><option value="tibio">Tibios</option><option value="frio">Fríos</option></select><span class="grow"></span><span class="small muted" data-sum></span></div>
  <div class="kanban" data-board></div>`;
  const board = v.querySelector('[data-board]');
  const recent = new Date(Date.now() - 30 * 864e5).toISOString();
  function draw() {
    const leads = db.query('leads', l => (!f.seller || l.sellerId === f.seller) && (isOpenLead(l) || (l.updatedAt || l.createdAt) >= recent) && (!f.temp || l.temp === f.temp) && (!f.q || `${l.name} ${model(l.modelId)?.name}`.toLowerCase().includes(f.q.toLowerCase())));
    const open = leads.filter(isOpenLead);
    v.querySelector('[data-sum]').textContent = `${open.length} abiertos · ${money(open.reduce((a, l) => a + (l.value || 0), 0))} en pipeline`;
    board.innerHTML = STAGES.map(s => { const list = leads.filter(l => l.stage === s).sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)); const shown = list.slice(0, 25); return `<section class="kcol" data-stage="${s}" aria-label="${STAGE_LABEL[s]}"><div class="kcol-head"><span>${STAGE_LABEL[s]}</span><small>${list.length}</small></div>
      ${shown.map(l => { const m = model(l.modelId), late = s === 'nuevo' && Date.now() - new Date(l.createdAt) > sla; return `<article class="kcard t-${l.temp || 'tibio'}" draggable="true" data-lead="${l.id}" tabindex="0"><b>${escape(l.name)}</b><span>${escape(brand(m?.brandId)?.name || '')} ${escape(m?.name || '')}</span><div class="meta"><span>${money(l.value || 0)}</span><span>${late ? `<span class="sla">${icon('alert', 12)} SLA</span>` : ago(l.updatedAt || l.createdAt)}</span></div>${isMgr ? `<small class="muted">${escape(userName(l.sellerId))}</small>` : ''}
        <select class="select kmove" data-move="${l.id}" aria-label="Mover a etapa"><option value="">Mover a…</option>${STAGES.filter(x => x !== s).map(x => `<option value="${x}">${STAGE_LABEL[x]}</option>`).join('')}</select></article>`; }).join('')}${list.length > shown.length ? `<div class="kmore">+${list.length - shown.length} más</div>` : ''}</section>`; }).join('');
  }
  async function move(id, stage) {
    const l = db.get('leads', id); if (!l || l.stage === stage) return draw();
    if (stage === 'vendido') { const ok = await closeSale(l); if (!ok) draw(); return; }
    if (stage === 'perdido') { const ok = await askLost(l); if (!ok) draw(); return; }
    const from = l.stage; moveLead(id, stage); db.log('pipeline', `${l.name}: ${STAGE_LABEL[from]} → ${STAGE_LABEL[stage]}`, user.id); toast(`${l.name} → ${STAGE_LABEL[stage]}`, 'success', 1600);
  }
  let dragId = null;
  board.addEventListener('dragstart', e => { const c = e.target.closest('.kcard'); if (!c) return; dragId = c.dataset.lead; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  board.addEventListener('dragend', e => { e.target.closest('.kcard')?.classList.remove('dragging'); board.querySelectorAll('.over').forEach(x => x.classList.remove('over')); });
  board.addEventListener('dragover', e => { const col = e.target.closest('.kcol'); if (!col) return; e.preventDefault(); board.querySelectorAll('.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
  board.addEventListener('drop', e => { const col = e.target.closest('.kcol'); if (!col) return; e.preventDefault(); col.classList.remove('over'); const id = e.dataTransfer.getData('text/plain') || dragId; document.querySelector('.dragging')?.classList.remove('dragging'); move(id, col.dataset.stage); });
  board.addEventListener('click', e => { if (e.target.closest('select')) return; const c = e.target.closest('.kcard'); if (c) location.hash = '#/lead/' + c.dataset.lead; });
  board.addEventListener('keydown', e => { const c = e.target.closest('.kcard'); if (c && e.key === 'Enter') location.hash = '#/lead/' + c.dataset.lead; });
  board.addEventListener('change', e => { const s = e.target.closest('[data-move]'); if (s && s.value) move(s.dataset.move, s.value); });
  v.querySelector('[data-q]').oninput = e => { f.q = e.target.value; draw(); };
  v.querySelector('[data-temp]').onchange = e => { f.temp = e.target.value; draw(); };
  v.querySelector('[data-seller]')?.addEventListener('change', e => { f.seller = e.target.value; uiSet('pipeSeller', f.seller); draw(); });
  v.querySelector('[data-new]').onclick = async () => {
    const ms = activeModels();
    const r = await formModal({ title: 'Nuevo lead (showroom / teléfono)', submit: 'Crear lead', fields: [{ name: 'name', label: 'Nombre del cliente', required: true }, { name: 'phone', label: 'Teléfono', type: 'tel', required: true }, { name: 'email', label: 'Correo', type: 'email' }, { name: 'modelId', label: 'Modelo de interés', type: 'select', options: ms.map(m => [m.id, `${brand(m.brandId).name} ${m.name}`]) }, { name: 'source', label: 'Origen', type: 'select', options: Object.entries(SOURCE_LABEL).filter(([k]) => k !== 'web') }, { name: 'temp', label: 'Temperatura', type: 'select', options: [['caliente', 'Caliente'], ['tibio', 'Tibio'], ['frio', 'Frío']] }, { name: 'note', label: 'Nota', type: 'textarea' }] });
    if (!r) return;
    const m = db.get('models', r.modelId);
    const l = createLead({ ...r, versionId: m.versions[0].id, showroomId: user.showroomId || 'scl', type: 'contacto', stage: 'contactado', note: r.note || `Lead ingresado por ${user.name}.` });
    db.update('leads', l.id, { sellerId: user.role === 'vendedor' ? user.id : l.sellerId });
    addTimeline(l.id, 'nota', 'Cliente atendido en showroom.', user.id);
    toast('Lead creado', 'success'); location.hash = '#/lead/' + l.id;
  };
  draw();
}
