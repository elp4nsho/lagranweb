// Usuarios y roles: alta, cambio de rol, desactivación y matriz de permisos.
import { escape, toast, confirm, date, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, PERMS } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge } from '../shared/admin-kit.js';

const PERM_NAMES = { dashboard: 'Escritorio', pages: 'Páginas y secciones', projects: 'Proyectos', team: 'Equipo', testimonials: 'Testimonios', posts: 'Blog', media: 'Medios', leads: 'Leads y cotizaciones', jobs: 'Ofertas', applicants: 'Postulantes', settings: 'Ajustes', users: 'Usuarios', activity: 'Bitácora' };
const COLORS = ['#c8102e', '#1d3557', '#2d6a4f', '#7c3aed', '#b5651d', '#0e7490', '#be185d'];

function edit(ctx, u = {}) {
  const self = u.id === ctx.user.id;
  formDialog({
    title: u.id ? `Editar a ${u.name}` : 'Nuevo usuario',
    body: `<div class="grid-2">${f.text('name', 'Nombre', u.name, { required: true })}${f.text('title', 'Cargo', u.title)}</div>
      ${f.text('email', 'Correo', u.email, { required: true, type: 'email' })}
      <div class="grid-2">${f.select('role', 'Rol', Object.entries(auth.roles), u.role || 'editor')}${f.text('password', u.id ? 'Nueva contraseña (opcional)' : 'Contraseña', '', { required: !u.id, type: 'text', placeholder: u.id ? 'Dejar vacío para mantener' : 'mínimo 6 caracteres' })}</div>
      ${self ? '<p class="small muted">No puedes cambiar tu propio rol ni desactivarte.</p>' : f.sw('active', 'Cuenta activa', u.id ? u.active !== false : true)}`,
    onSubmit: v => {
      if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u.id)) { toast('Ese correo ya está en uso', 'error'); return false; }
      if (v.password && v.password.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'warning'); return false; }
      const data = { name: v.name, title: v.title, email: v.email };
      if (!self) { data.role = v.role; data.active = v.active; }
      if (v.password) data.password = v.password;
      if (u.id) db.update('users', u.id, data);
      else db.insert('users', { ...data, color: COLORS[db.count('users') % COLORS.length] });
      db.log('usuario', `${u.id ? 'Editó' : 'Creó'} al usuario ${v.name} (${auth.roleName(self ? u.role : v.role)})`, ctx.user.id);
      toast('Usuario guardado', 'success');
    }
  });
}

export default {
  id: 'users', path: '/usuarios', label: 'Usuarios y roles', icon: '⚇', group: 'Sistema', perm: 'users',
  render(el, ctx) {
    const roles = Object.keys(auth.roles);
    el.innerHTML = `${pageHead('Usuarios y roles', `${db.count('users', u => u.active !== false)} activos de ${db.count('users')}`, '<button class="btn btn-primary" data-new>＋ Nuevo usuario</button>')}
      <div data-t></div>
      <div class="card"><h3>Matriz de permisos</h3><p class="small muted">Los permisos se aplican en el menú y en cada ruta del panel.</p>
        <div class="table-wrap"><table class="table perm-table"><thead><tr><th>Sección</th>${roles.map(r => `<th>${escape(auth.roleName(r))}</th>`).join('')}</tr></thead>
        <tbody>${Object.entries(PERMS).map(([k, rs]) => `<tr><td>${PERM_NAMES[k] || k}</td>${roles.map(r => `<td>${rs.includes(r) ? '<span class="badge badge-success plain">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    el.querySelector('[data-new]').onclick = () => edit(ctx);
    table(el.querySelector('[data-t]'), {
      id: 'users', rows: db.all('users'), sort: 'name', search: u => `${u.name} ${u.email} ${u.title || ''}`,
      filters: [{ key: 'role', label: 'Rol', options: Object.entries(auth.roles) }, { key: 'active', label: 'Estado', options: [['true', 'Activo'], ['false', 'Inactivo']], test: (u, v) => String(u.active !== false) === v }],
      columns: [
        { key: 'name', label: 'Usuario', render: u => `<div class="cell-main"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')};--size:34px">${escape(initials(u.name))}</span><span><b>${escape(u.name)}${u.id === ctx.user.id ? ' <small class="badge badge-primary plain">Tú</small>' : ''}</b><small>${escape(u.email)}</small></span></div>` },
        { key: 'role', label: 'Rol', render: u => `<select class="select" data-role="${u.id}" aria-label="Rol de ${escape(u.name)}" style="min-width:140px" ${u.id === ctx.user.id ? 'disabled' : ''}>${Object.entries(auth.roles).map(([k, l]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` },
        { key: 'lastLogin', label: 'Último acceso', render: u => `<span class="small">${u.lastLogin ? ago(u.lastLogin) : 'nunca'}</span>` },
        { key: 'createdAt', label: 'Alta', render: u => `<span class="small">${date(u.createdAt)}</span>` },
        { key: 'active', label: 'Estado', render: u => badge(u.active !== false ? 'on' : 'off', { on: ['Activo', 'success'], off: ['Inactivo', 'danger'] }) }
      ],
      actions: u => actBtn('edit', 'Editar', '✎') + (u.id === ctx.user.id ? '' : actBtn('toggle', u.active !== false ? 'Desactivar' : 'Activar', u.active !== false ? '⏸' : '▶') + actBtn('del', 'Eliminar', '🗑')),
      onAction: async (a, u) => {
        if (a === 'edit') edit(ctx, u);
        if (a === 'toggle') { db.update('users', u.id, { active: u.active === false }); db.log('usuario', `${u.active === false ? 'Activó' : 'Desactivó'} a ${u.name}`, ctx.user.id); toast(u.active === false ? 'Usuario activado' : 'Usuario desactivado', 'success'); }
        if (a === 'del' && await confirm(`¿Eliminar a ${u.name}? Perderá el acceso de inmediato.`, { danger: true, ok: 'Eliminar' })) { db.remove('users', u.id); db.log('usuario', `Eliminó a ${u.name}`, ctx.user.id); toast('Usuario eliminado', 'success'); }
      },
      csv: { name: 'usuarios', map: u => ({ nombre: u.name, correo: u.email, rol: auth.roleName(u.role), activo: u.active !== false ? 'sí' : 'no' }) }
    });
    el.addEventListener('change', e => {
      const s = e.target.closest('[data-role]'); if (!s) return;
      const u = db.get('users', s.dataset.role);
      db.update('users', u.id, { role: s.value });
      db.log('usuario', `Cambió el rol de ${u.name} a ${auth.roleName(s.value)}`, ctx.user.id);
      toast(`${u.name} ahora es ${auth.roleName(s.value)}`, 'success');
    });
  }
};
