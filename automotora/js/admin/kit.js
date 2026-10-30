// Utilidades comunes de las secciones del panel.
import { escape, money, toast, confirm } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { carSVG } from '../shared/car.js';
import { model, brand, color } from '../shared/domain.js';

export const me = () => auth.current();
export const log = (action, detail) => db.log(action, detail, me()?.id);
export const sw = (act, id, on, label = '') => `<label class="switch" title="${escape(label)}"><input type="checkbox" data-act-change="${act}" data-id="${id}" ${on ? 'checked' : ''} aria-label="${escape(label)}"><span></span></label>`;
export async function del(col, id, label) {
  if (!await confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`, { title: 'Eliminar', ok: 'Eliminar', danger: true })) return false;
  db.remove(col, id); log('eliminar', `${col}: ${label}`); toast('Eliminado', 'success'); return true;
}
export const carCell = (modelId, colorId, sub = '') => { const m = model(modelId); if (!m) return '—'; const c = color(m, colorId) || m.colors[0]; return `<div class="cell-car">${carSVG({ body: m.body, paint: c.hex, fuel: m.fuel })}<span><b>${escape(brand(m.brandId)?.name)} ${escape(m.name)}</b><small>${sub}</small></span></div>`; };
export const opts = (list, sel, empty = '') => (empty ? `<option value="">${escape(empty)}</option>` : '') + list.map(([v, l]) => `<option value="${escape(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${escape(l)}</option>`).join('');
export const brandOpts = () => db.all('brands').map(b => [b.id, b.name]);
export const modelOpts = (filter = () => true) => db.query('models', filter).map(m => [m.id, `${brand(m.brandId)?.name} ${m.name}`]);
export const showroomOpts = () => db.all('showrooms').map(s => [s.id, s.city]);
export const sellerOpts = () => db.query('users', u => u.role === 'vendedor' && u.active !== false).map(u => [u.id, u.name]);
export { money };
