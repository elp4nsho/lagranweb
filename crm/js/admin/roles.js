// Matriz de permisos por rol (editable). El administrador siempre conserva todos los permisos.
import { db, auth, ROLE_IDS } from '../data/db.js';
import { escape, toast, confirm } from '../../../assets/core/ui.js';
import { PERMS, DEFAULT_PERMS } from '../shared/perms.js';
import { pageHead } from '../app/components.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const matrix = db.getValue('perms', DEFAULT_PERMS);
  const groups = [...new Set(PERMS.map(p => p[2]))];
  view.innerHTML = `
    ${pageHead('Roles y permisos', 'Define qué puede hacer cada rol. Los cambios se aplican al instante en todas las sesiones.', `<button class="btn" data-defaults>Restaurar valores por defecto</button>`)}
    <div class="grid-3">${ROLE_IDS.map(r => `<div class="card kpi"><div class="stat"><span class="label">${escape(auth.roleName(r))}</span><span class="value">${db.count('users', u => u.role === r && u.active !== false)}</span><span class="delta">${r === 'admin' ? 'Todos los permisos' : `${(matrix[r] || []).length} de ${PERMS.length} permisos`}</span></div></div>`).join('')}</div>
    <div class="table-wrap"><table class="table perm-table"><thead><tr><th>Permiso</th>${ROLE_IDS.map(r => `<th class="center">${escape(auth.roleName(r))}</th>`).join('')}</tr></thead><tbody>
      ${groups.map(g => `<tr class="group-row"><td colspan="${ROLE_IDS.length + 1}"><b>${escape(g)}</b></td></tr>` + PERMS.filter(p => p[2] === g).map(([id, label]) => `<tr><td>${escape(label)}<br><small class="muted"><code>${id}</code></small></td>${ROLE_IDS.map(r => `<td class="center"><label class="switch"><input type="checkbox" data-perm="${id}" data-r="${r}" ${r === 'admin' || (matrix[r] || []).includes(id) ? 'checked' : ''} ${r === 'admin' ? 'disabled' : ''} aria-label="${escape(label)} para ${escape(auth.roleName(r))}"><span></span></label></td>`).join('')}</tr>`).join('')).join('')}
    </tbody></table></div>
    <p class="muted small">${icon('shield', 14)} Las guardas se aplican tanto al menú como a las rutas: si un rol pierde un permiso, la sección desaparece y la URL directa muestra “Acceso restringido”. Los ejecutivos sin “Ver métricas de todo el equipo” solo ven sus propios negocios.</p>`;
  view.querySelectorAll('[data-perm]').forEach(c => c.onchange = () => {
    const m = JSON.parse(JSON.stringify(db.getValue('perms', DEFAULT_PERMS)));
    const set = new Set(m[c.dataset.r] || []);
    c.checked ? set.add(c.dataset.perm) : set.delete(c.dataset.perm);
    m[c.dataset.r] = [...set];
    db.setValue('perms', m);
    db.log('permisos', `${c.checked ? 'Otorgó' : 'Quitó'} "${PERMS.find(p => p[0] === c.dataset.perm)[1]}" a ${auth.roleName(c.dataset.r)}`, user.id);
    toast('Permiso actualizado', 'success');
  });
  view.querySelector('[data-defaults]').onclick = async () => {
    if (!await confirm('¿Restaurar la matriz de permisos por defecto?', { ok: 'Restaurar' })) return;
    db.setValue('perms', JSON.parse(JSON.stringify(DEFAULT_PERMS)));
    db.log('permisos', 'Restauró los permisos por defecto', user.id);
    toast('Permisos restaurados', 'success');
  };
}
