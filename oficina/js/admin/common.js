// Piezas compartidas de las secciones del panel.
import { escape, confirm, toast } from '../../../assets/core/ui.js';
import { avatar } from '../shared/util.js';

export const pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h1>${escape(title)}</h1>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div><div class="row gap-sm">${actions}</div></div>`;
export const personCell = (p, sub) => p ? `<span class="cell-person">${avatar(p, 32)}<span><b>${escape(p.name)}</b><small>${escape(sub ?? p.cargo ?? '')}</small></span></span>` : '<span class="muted">—</span>';
export const actBtn = (act, id, label, cls = 'btn-ghost', title = '') => `<button type="button" class="btn btn-sm ${cls}" data-act="${act}" data-id="${escape(id)}" ${title ? `title="${escape(title)}" aria-label="${escape(title)}"` : ''}>${label}</button>`;
export async function confirmDelete(what, fn, { user, db, log } = {}) {
  if (!(await confirm(`¿Eliminar ${what}? Esta acción no se puede deshacer.`, { title: 'Eliminar', ok: 'Eliminar', danger: true }))) return false;
  fn();
  if (db && log) db.log('eliminar', log, user?.id);
  toast('Eliminado', 'success');
  return true;
}
// Delegación: el.onclick → handlers[act](id, btn)
export function onActs(el, handlers) {
  if (el.__acts) el.removeEventListener('click', el.__acts);
  el.__acts = e => {
    const b = e.target.closest('[data-act]');
    if (!b || !el.contains(b) || b.disabled) return;
    const h = handlers[b.dataset.act];
    if (h) { e.preventDefault(); h(b.dataset.id, b); }
  };
  el.addEventListener('click', el.__acts);
}
export const kpi = (label, value, delta = '', cls = '') => `<div class="card kpi"><div class="stat"><span class="label">${escape(label)}</span><span class="value">${value}</span>${delta ? `<span class="delta ${cls}">${delta}</span>` : ''}</div></div>`;
