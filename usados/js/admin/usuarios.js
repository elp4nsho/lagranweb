// Usuarios y roles: crear, cambiar rol, desactivar, eliminar. Matriz de permisos.
import { escape, toast, confirm, formModal, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { COLORS } from '../data/catalog.js';

export const PERMS = [
  ['Dashboard', ['admin', 'gerente', 'vendedor']], ['Inventario', ['admin', 'gerente', 'vendedor']], ['Compras por tasación', ['admin', 'gerente']], ['Leads, ventas y créditos', ['admin', 'gerente', 'vendedor']],
  ['Suscripciones, servicios y tienda', ['admin', 'gerente', 'taller']], ['Sucursales y bitácora', ['admin', 'gerente']], ['Contenido y usuarios', ['admin']],
  ['App vendedor', ['admin', 'gerente', 'vendedor']], ['App inspector', ['admin', 'gerente', 'inspector']], ['Mi cuenta (sitio)', ['cliente']]
];

async function editUser(u, ctx) {
  const v = await formModal({ title: u ? `Editar · ${u.name}` : 'Nuevo usuario', fields: [
    { name: 'name', label: 'Nombre', required: true, value: u?.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: u?.email },
    { name: 'password', label: u ? 'Contraseña (deja igual para no cambiar)' : 'Contraseña', required: true, value: u?.password || 'demo123' },
    { name: 'role', label: 'Rol', type: 'select', options: Object.entries(auth.roles), value: u?.role || 'vendedor' },
    { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: u ? u.active !== false : true }] });
  if (!v) return;
  if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u?.id)) { toast('Ese correo ya existe', 'warning'); return; }
  if (u && u.id === ctx.user.id && (v.role !== 'admin' || !v.active)) { toast('No puedes quitarte el rol de administrador ni desactivarte', 'warning'); return; }
  if (u) { db.update('users', u.id, v); db.log('usuarios', `Usuario editado: ${v.name} (${auth.roleName(v.role)}${v.active ? '' : ', desactivado'})`, ctx.user.id); }
  else { db.insert('users', { ...v, color: COLORS[db.count('users') % COLORS.length], demo: false, ...(v.role === 'cliente' ? { phone: '', rut: '' } : {}) }); db.log('usuarios', `Usuario creado: ${v.name} (${auth.roleName(v.role)})`, ctx.user.id); }
  toast('Usuario guardado', 'success');
}

export default {
  id: 'usuarios', label: 'Usuarios y roles', icon: '🔐', group: 'Sistema', roles: ['admin'], watch: ['users'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Usuarios y roles', 'Cuentas del equipo con acceso al sistema', '<button class="btn btn-primary btn-sm" data-new>+ Nuevo usuario</button>')}<div data-list></div>
      <div class="card stack"><h3 style="margin:0">Permisos por rol</h3><div class="table-wrap"><table class="table perm-table"><thead><tr><th>Módulo</th>${Object.values(auth.roles).map(r => `<th>${escape(r)}</th>`).join('')}</tr></thead><tbody>
      ${PERMS.map(([m, rs]) => `<tr><td>${escape(m)}</td>${Object.keys(auth.roles).map(r => `<td>${rs.includes(r) ? '<span class="badge badge-success plain">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-new]')) editUser(null, ctx);
      const t = e.target.closest('[data-toggle]');
      if (t) {
        const u = db.get('users', t.dataset.toggle);
        if (u.id === ctx.user.id) { toast('No puedes desactivar tu propia cuenta', 'warning'); return; }
        db.update('users', u.id, { active: u.active === false }); db.log('usuarios', `${u.name} ${u.active === false ? 'reactivado' : 'desactivado'}`, ctx.user.id);
        toast(u.active === false ? 'Cuenta reactivada' : 'Cuenta desactivada', 'success');
      }
      const d = e.target.closest('[data-delu]');
      if (d) {
        const u = db.get('users', d.dataset.delu);
        if (u.id === ctx.user.id) { toast('No puedes eliminar tu propia cuenta', 'warning'); return; }
        if (await confirm(`¿Eliminar la cuenta de ${u.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('users', u.id); db.log('usuarios', `Usuario eliminado: ${u.name}`, ctx.user.id); toast('Usuario eliminado', 'success'); }
      }
    });
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('users').map(u => ({ ...u, roleName: auth.roleName(u.role), lastLogin: db.getValue('_log', []).find(l => l.user === u.id && l.action === 'login')?.at || '' })),
      filters: [{ key: 'role', label: 'Rol', options: Object.entries(auth.roles) }, { key: 'active', label: 'Estado', options: [['true', 'Activas'], ['false', 'Desactivadas']], test: (r, v) => String(r.active !== false) === v }],
      search: r => `${r.name} ${r.email}`,
      columns: [
        { key: 'name', label: 'Usuario', render: r => `<span class="row nowrap" style="gap:10px"><span class="avatar" style="--av:${escape(r.color || 'var(--primary)')}">${escape(initials(r.name))}</span><span><b>${escape(r.name)}</b>${r.id === ctx.user.id ? ' <span class="badge badge-primary plain">Tú</span>' : ''}<small class="muted d-block">${escape(r.email)}</small></span></span>` },
        { key: 'roleName', label: 'Rol', render: r => `<span class="badge plain">${escape(r.roleName)}</span>` },
        { key: 'lastLogin', label: 'Último acceso', render: r => r.lastLogin ? ago(r.lastLogin) : '<span class="muted">—</span>' },
        { key: 'active', label: 'Estado', render: r => r.active !== false ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-danger">Desactivada</span>' },
        { key: 'id', label: '', sort: false, render: r => `<span class="nowrap"><button class="btn btn-sm" data-toggle="${r.id}">${r.active !== false ? 'Desactivar' : 'Activar'}</button> <button class="btn btn-sm btn-ghost" data-delu="${r.id}" aria-label="Eliminar">🗑</button></span>` }
      ],
      onRow: r => editUser(db.get('users', r.id), ctx),
      csv: { name: 'usuarios', map: r => ({ nombre: r.name, correo: r.email, rol: r.roleName, activo: r.active !== false ? 'sí' : 'no' }) }
    });
  }
};
