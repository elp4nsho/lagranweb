// Ayudas comunes de las secciones del panel.
import { escape } from '../../../assets/core/ui.js';
import { branches } from '../shared/domain.js';
// Sucursal por defecto según el rol (el jefe y la recepción ven la suya).
export const myBranch = ctx => ctx.user.role === 'admin' ? '' : (ctx.user.branchId || '');
export const branchOptions = () => branches(true).map(b => [b.id, b.name]);
export const branchSelect = (cur, { all = true, attr = 'data-branch', label = 'Sucursal' } = {}) => `<select class="select sm" ${attr} aria-label="${label}">${all ? `<option value="">Todas las sucursales</option>` : ''}${branches(true).map(b => `<option value="${b.id}" ${b.id === cur ? 'selected' : ''}>${escape(b.name)}</option>`).join('')}</select>`;
