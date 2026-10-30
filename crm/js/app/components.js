// Piezas reutilizables del espacio de trabajo: KPIs, badges, formularios de negocio y actividad,
// y el flujo de cambio de etapa (con historial, motivo de pérdida y automatizaciones).
import { db, auth } from '../data/db.js';
import { html, raw, escape, modal, toast, money, date, time } from '../../../assets/core/ui.js';
import { STAGES, stage, ACT_TYPES, LOST_REASONS, LEAD_SOURCES } from '../shared/constants.js';
import { icon } from '../shared/icons.js';
import { seesAll, visibleDeals } from '../shared/perms.js';
import { sellers, userName, toLocalInput, toDateInput, DAY } from '../shared/util.js';
import { runAutomations, notify } from '../shared/automation.js';

export const kpi = (label, value, sub = '', cls = '') => `<div class="card kpi"><div class="stat"><span class="label">${escape(label)}</span><span class="value">${value}</span>${sub ? `<span class="delta ${cls}">${sub}</span>` : ''}</div></div>`;
export const stageBadge = id => { const s = stage(id); return `<span class="badge badge-${s.badge}">${escape(s.name)}</span>`; };
export const actIcon = type => `<span class="act-ico act-${type}">${icon(ACT_TYPES[type]?.ico || 'dot', 15)}</span>`;
export const pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div><div class="row page-actions">${actions}</div></div>`;

// Formulario en modal con HTML libre. onSubmit(form, data) → true para cerrar.
export function openForm({ title, body, submit = 'Guardar', size = '', onSubmit, onOpen, extraFoot = '' }) {
  const f = document.createElement('form');
  f.className = 'stack';
  f.noValidate = true;
  f.innerHTML = body;
  const m = modal({ title, body: f, size, foot: `${extraFoot}<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-submit>${escape(submit)}</button>` });
  const go = async e => {
    e && e.preventDefault();
    let ok = true;
    f.querySelectorAll('[required]').forEach(el => { const bad = !String(el.value).trim(); el.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Completa los campos obligatorios', 'warning');
    const data = Object.fromEntries(new FormData(f).entries());
    f.querySelectorAll('input[type=checkbox][name]').forEach(cb => { data[cb.name] = cb.checked; });
    const res = await onSubmit(f, data);
    if (res !== false) m.close();
  };
  f.addEventListener('submit', go);
  m.el.querySelector('[data-submit]').onclick = go;
  onOpen && onOpen(f, m);
  return m;
}
export const opt = (val, label, sel) => `<option value="${escape(val)}" ${String(val) === String(sel ?? '') ? 'selected' : ''}>${escape(label)}</option>`;
export const field = (label, inner, cls = '') => `<div class="field ${cls}"><label>${escape(label)}</label>${inner}</div>`;

// ---------- Actividades ----------
export function activityModal({ activity = null, defaults = {} } = {}) {
  const user = auth.current();
  const a = activity || { type: 'tarea', subject: '', dueAt: new Date(Date.now() + DAY).toISOString(), reminder: 30, ownerId: user.id, done: false, body: '', ...defaults };
  const deals = visibleDeals().filter(d => !d.closedAt || d.id === a.dealId).sort((x, y) => x.title.localeCompare(y.title));
  const owners = seesAll() ? sellers() : [user];
  openForm({
    title: activity ? 'Editar actividad' : 'Nueva actividad',
    body: `
      <div class="grid-2">
        ${field('Tipo', `<select class="select" name="type">${['tarea', 'llamada', 'reunion', 'email', 'nota'].map(t => opt(t, ACT_TYPES[t].name, a.type)).join('')}</select>`)}
        ${field('Fecha y hora', `<input class="input" type="datetime-local" name="dueAt" value="${toLocalInput(a.dueAt)}" required>`)}
      </div>
      ${field('Asunto *', `<input class="input" name="subject" value="${escape(a.subject)}" required placeholder="Ej: Llamar para revisar propuesta">`)}
      <div class="grid-2">
        ${field('Negocio', `<select class="select" name="dealId"><option value="">— Sin negocio —</option>${deals.map(d => opt(d.id, d.title, a.dealId)).join('')}</select>`)}
        ${field('Responsable', `<select class="select" name="ownerId">${owners.map(u => opt(u.id, u.name, a.ownerId)).join('')}</select>`)}
      </div>
      ${field('Recordatorio', `<select class="select" name="reminder">${[[0, 'Sin recordatorio'], [15, '15 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes'], [1440, '1 día antes']].map(([v, l]) => opt(v, l, a.reminder)).join('')}</select>`)}
      ${field('Detalle', `<textarea class="textarea" name="body" placeholder="Notas, agenda, resultado…">${escape(a.body || '')}</textarea>`)}
      <label class="check"><input type="checkbox" name="done" ${a.done ? 'checked' : ''}> Marcar como completada</label>`,
    extraFoot: activity ? '<button type="button" class="btn btn-danger" data-del style="margin-right:auto">Eliminar</button>' : '',
    onOpen: (f, m) => {
      const del = m.el.querySelector('[data-del]');
      if (del) del.onclick = () => { db.remove('activities', activity.id); db.log('actividad', `Eliminó la actividad "${activity.subject}"`, user.id); toast('Actividad eliminada', 'success'); m.close(); };
    },
    onSubmit: (f, d) => {
      const deal = d.dealId ? db.get('deals', d.dealId) : null;
      const patch = {
        type: d.type, subject: d.subject.trim(), dueAt: new Date(d.dueAt).toISOString(), dealId: d.dealId || null, companyId: deal ? deal.companyId : (a.companyId || null),
        contactId: deal ? deal.contactId : (a.contactId || null), ownerId: d.ownerId, reminder: +d.reminder, body: d.body, done: !!d.done, doneAt: d.done ? (a.doneAt || new Date().toISOString()) : null
      };
      const changedTime = !activity || activity.dueAt !== patch.dueAt || activity.reminder !== patch.reminder;
      if (changedTime) patch.reminded = false;
      if (activity) { db.update('activities', activity.id, patch); toast('Actividad actualizada', 'success'); }
      else {
        db.insert('activities', patch);
        db.log('actividad', `Agendó "${patch.subject}" (${ACT_TYPES[patch.type].name})`, user.id);
        if (patch.ownerId !== user.id) notify(patch.ownerId, `${user.name} te asignó: ${patch.subject}`, 'app.html#/tareas');
        toast('Actividad agendada', 'success');
      }
    }
  });
}
export function toggleActivity(id) {
  const a = db.get('activities', id);
  if (!a) return;
  db.update('activities', id, { done: !a.done, doneAt: !a.done ? new Date().toISOString() : null });
  if (!a.done) { db.log('actividad', `Completó "${a.subject}"`, auth.current().id); toast('¡Tarea completada!', 'success'); }
}
export function activityItem(a, { showDeal = true } = {}) {
  const deal = a.dealId ? db.get('deals', a.dealId) : null;
  const overdue = !a.done && new Date(a.dueAt) < Date.now();
  return `<div class="act-row ${a.done ? 'done' : ''}">
    <label class="check" title="Completar"><input type="checkbox" data-toggle="${a.id}" ${a.done ? 'checked' : ''} aria-label="Completar ${escape(a.subject)}"></label>
    ${actIcon(a.type)}
    <div class="act-main"><button class="linkish" data-edit-act="${a.id}">${escape(a.subject)}</button>
      <small class="muted"><span class="${overdue ? 'late' : ''}">${date(a.dueAt, { day: '2-digit', month: 'short' })} ${time(a.dueAt)}</span>${showDeal && deal ? ` · <a href="#/negocios/${deal.id}">${escape(deal.title)}</a>` : ''} · ${escape(userName(a.ownerId))}</small></div>
  </div>`;
}
// Delegación de eventos para listas de actividades.
export function wireActivityList(root) {
  root.addEventListener('change', e => { const t = e.target.closest('[data-toggle]'); if (t) toggleActivity(t.dataset.toggle); });
  root.addEventListener('click', e => { const b = e.target.closest('[data-edit-act]'); if (b) { e.preventDefault(); activityModal({ activity: db.get('activities', b.dataset.editAct) }); } });
}

// ---------- Negocios ----------
export function dealModal({ deal = null, defaults = {}, onSaved } = {}) {
  const user = auth.current();
  const d = deal || { title: '', companyId: '', contactId: '', amount: 0, stage: 'prospeccion', closeDate: new Date(Date.now() + 30 * DAY).toISOString(), ownerId: user.id, source: 'Referido', ...defaults };
  const comps = db.all('companies').sort((a, b) => a.name.localeCompare(b.name));
  const owners = seesAll() ? sellers() : [user];
  const contactOpts = cid => `<option value="">— Sin contacto —</option>` + db.query('contacts', c => c.companyId === cid).map(c => opt(c.id, c.name, d.contactId)).join('');
  openForm({
    title: deal ? 'Editar negocio' : 'Nuevo negocio',
    body: `
      ${field('Nombre del negocio *', `<input class="input" name="title" value="${escape(d.title)}" required placeholder="Ej: Licencias equipo comercial">`)}
      <div class="grid-2">
        ${field('Empresa *', `<select class="select" name="companyId" required><option value="">Selecciona…</option>${comps.map(c => opt(c.id, c.name, d.companyId)).join('')}</select>`)}
        ${field('Contacto', `<select class="select" name="contactId">${contactOpts(d.companyId)}</select>`)}
      </div>
      <div class="grid-2">
        ${field('Monto (CLP)', `<input class="input" type="number" min="0" step="10000" name="amount" value="${d.amount || 0}">`)}
        ${field('Fecha estimada de cierre', `<input class="input" type="date" name="closeDate" value="${toDateInput(d.closeDate)}">`)}
      </div>
      <div class="grid-2">
        ${field('Etapa', `<select class="select" name="stage" ${deal ? 'disabled' : ''}>${STAGES.filter(s => !['ganado', 'perdido'].includes(s.id) || deal).map(s => opt(s.id, s.name, d.stage)).join('')}</select>`)}
        ${field('Responsable', `<select class="select" name="ownerId">${owners.map(u => opt(u.id, u.name, d.ownerId)).join('')}</select>`)}
      </div>
      ${field('Origen', `<select class="select" name="source">${LEAD_SOURCES.map(s => opt(s, s, d.source)).join('')}</select>`)}
      ${deal ? '<small class="muted">Para cambiar la etapa usa el tablero o el indicador de etapas del negocio.</small>' : ''}`,
    onOpen: f => { f.companyId.addEventListener('change', () => { f.contactId.innerHTML = contactOpts(f.companyId.value); }); },
    onSubmit: (f, v) => {
      const patch = { title: v.title.trim(), companyId: v.companyId, contactId: v.contactId || null, amount: Math.max(0, +v.amount || 0), closeDate: new Date(v.closeDate + 'T12:00').toISOString(), ownerId: v.ownerId, source: v.source };
      let saved;
      if (deal) {
        saved = db.update('deals', deal.id, patch);
        if (deal.ownerId !== patch.ownerId) notify(patch.ownerId, `Te asignaron el negocio ${patch.title}`, `app.html#/negocios/${deal.id}`);
        db.log('negocio', `Editó el negocio "${patch.title}"`, user.id);
        toast('Negocio actualizado', 'success');
      } else {
        saved = db.insert('deals', { ...patch, stage: v.stage, items: [], history: [{ stage: v.stage, at: new Date().toISOString() }], closedAt: null });
        db.log('negocio', `Creó el negocio "${patch.title}" (${money(patch.amount)})`, user.id);
        runAutomations('deal.stage', saved, 'deal');
        toast('Negocio creado', 'success');
      }
      onSaved && onSaved(saved);
    }
  });
}

// Cambia la etapa de un negocio. Devuelve true si se aplicó.
export async function changeStage(dealId, to) {
  const user = auth.current();
  const d = db.get('deals', dealId);
  if (!d || d.stage === to) return false;
  let lostReason = null;
  if (to === 'perdido') {
    lostReason = await new Promise(resolve => {
      let done = false;
      const m = modal({
        title: 'Marcar como perdido',
        body: `<div class="stack"><p>¿Por qué se perdió <b>${escape(d.title)}</b>?</p><div class="field"><label for="lr">Motivo</label><select class="select" id="lr">${LOST_REASONS.map(r => `<option>${escape(r)}</option>`).join('')}</select></div></div>`,
        foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" data-ok>Marcar perdido</button>',
        onClose: () => !done && resolve(null)
      });
      m.el.querySelector('[data-ok]').onclick = () => { done = true; const v = m.el.querySelector('#lr').value; m.close(); resolve(v); };
    });
    if (!lostReason) return false;
  }
  const now = new Date().toISOString();
  const closed = ['ganado', 'perdido'].includes(to);
  const updated = db.update('deals', dealId, x => ({ stage: to, history: [...(x.history || []), { stage: to, at: now }], closedAt: closed ? now : null, lostReason: to === 'perdido' ? lostReason : null, closeDate: closed ? now : x.closeDate }));
  db.insert('activities', { type: 'sistema', subject: `Etapa cambiada a ${stage(to).name}${lostReason ? ` (${lostReason})` : ''}`, dealId, companyId: d.companyId, ownerId: user.id, done: true, dueAt: now, doneAt: now, reminded: true });
  db.log('negocio', `Movió "${d.title}" de ${stage(d.stage).name} a ${stage(to).name}`, user.id);
  const fired = [...runAutomations('deal.stage', updated, 'deal'), ...(to === 'ganado' ? runAutomations('deal.won', updated, 'deal') : []), ...(to === 'perdido' ? runAutomations('deal.lost', updated, 'deal') : [])];
  if (to === 'ganado') { toast(`¡Negocio ganado! ${money(d.amount)}`, 'success', 4500); if (d.ownerId !== user.id) notify(d.ownerId, `¡${d.title} se marcó como ganado!`, `app.html#/negocios/${d.id}`); }
  else toast(`Movido a ${stage(to).name}`, to === 'perdido' ? 'warning' : 'info');
  fired.forEach(f => toast(`Automatización · ${f}`, 'info', 4500));
  return true;
}
export const ownerSelect = (name, selected, all = true) => `<select class="select" name="${name}" aria-label="Responsable">${all ? opt('', 'Todo el equipo', selected) : ''}${sellers().map(u => opt(u.id, u.name, selected)).join('')}</select>`;
