// Usuarios y roles: crear, editar, cambiar rol, desactivar, restablecer clave y matriz de permisos.
import { db } from '../data/db.js';
import { pageHead, table, badge } from '../shared/admin-kit.js';
import { escape, date, ago, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';

const COLORS = ['#7b5cff', '#e8437a', '#0f9d8a', '#d48a1a', '#2f7de1', '#8a4fd8', '#c2410c'];

async function edit(u, ctx) {
  const roles = Object.entries(ctx.auth.roles);
  const v = await formModal({ title: u ? `Editar ${u.name}` : 'Nuevo usuario', fields: [
    { name: 'name', label: 'Nombre', value: u?.name || '', required: true },
    { name: 'email', label: 'Correo', type: 'email', value: u?.email || '', required: true },
    { name: 'role', label: 'Rol', type: 'select', value: u?.role || roles[roles.length - 1][0], options: roles },
    ...(u ? [] : [{ name: 'password', label: 'Contraseña inicial', value: 'cambiar123', required: true }]),
    { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: u ? u.active !== false : true },
    { name: 'demo', label: 'Mostrar como cuenta demo en el login', type: 'checkbox', value: u ? !!u.demo : false }
  ] });
  if (!v) return;
  if (!/^\S+@\S+\.\S+$/.test(v.email)) return toast('Correo inválido', 'error');
  if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u?.id)) return toast('Ya existe un usuario con ese correo', 'error');
  if (u && u.id === ctx.user.id && (v.role !== 'admin' || !v.active)) return toast('No puedes quitarte el rol de administrador ni desactivarte', 'warning');
  if (u) { db.update('users', u.id, v); db.log('Usuario editado', `${v.name} · ${ctx.auth.roleName(v.role)}${v.active ? '' : ' (inactivo)'}`, ctx.user.id); }
  else { db.insert('users', { ...v, color: COLORS[db.count('users') % COLORS.length] }); db.log('Usuario creado', `${v.name} · ${ctx.auth.roleName(v.role)}`, ctx.user.id); }
  toast('Usuario guardado', 'success');
}

export default {
  id: 'usuarios', label: 'Usuarios y roles', ico: '👥', group: 'Administración', roles: ['admin'],
  render(view, ctx) {
    const rows = db.all('users');
    const lastLogin = id => db.all('_log').find(l => l.user === id && l.action === 'login')?.at;
    const staff = ctx.sections.filter(s => !s.hidden);
    const roleKeys = Object.keys(ctx.auth.roles);
    view.innerHTML = `${pageHead('Usuarios y roles', `${rows.length} usuarios · ${rows.filter(u => u.active !== false).length} activos`, '<button class="btn btn-primary" data-new>＋ Nuevo usuario</button>')}
      <div class="card" id="tbl"></div>
      <div class="card"><div class="card-title"><h3>Permisos por rol</h3><span class="small muted">Se aplican en el menú y en cada ruta del panel</span></div>
        <div class="table-wrap"><table class="table perm-grid"><thead><tr><th>Sección</th>${roleKeys.map(r => `<th>${escape(ctx.auth.roleName(r))}</th>`).join('')}</tr></thead>
        <tbody>${staff.map(s => `<tr><td>${s.ico} ${escape(s.label)}</td>${roleKeys.map(r => `<td>${!s.roles || s.roles.includes(r) ? '<span class="yes" aria-label="Sí">✓</span>' : '<span class="muted" aria-label="No">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    table(view.querySelector('#tbl'), {
      id: 'users', rows, search: u => `${u.name} ${u.email} ${u.role}`,
      filters: [{ key: 'role', label: 'Rol', options: Object.entries(ctx.auth.roles) }, { key: 'active', label: 'Estado', options: [['true', 'Activo'], ['false', 'Inactivo']], test: (u, v) => String(u.active !== false) === v }],
      columns: [
        { key: 'name', label: 'Usuario', render: u => `<span class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')}">${escape(initials(u.name))}</span><span><b>${escape(u.name)}</b>${u.id === ctx.user.id ? ' <span class="badge badge-primary plain">Tú</span>' : ''}<br><small class="muted">${escape(u.email)}</small></span></span>` },
        { key: 'role', label: 'Rol', render: u => `<select class="select" data-role="${u.id}" aria-label="Rol de ${escape(u.name)}" style="min-height:32px;padding:4px 30px 4px 10px;font-size:13px" ${u.id === ctx.user.id ? 'disabled' : ''}>${Object.entries(ctx.auth.roles).map(([k, l]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${escape(l)}</option>`).join('')}</select>` },
        { key: 'active', label: 'Estado', value: u => +(u.active !== false), render: u => u.active !== false ? badge('Activo', 'success') : badge('Inactivo', 'danger') },
        { key: 'login', label: 'Último acceso', value: u => lastLogin(u.id) || '', render: u => lastLogin(u.id) ? escape(ago(lastLogin(u.id))) : '<span class="muted">—</span>' },
        { key: 'createdAt', label: 'Alta', render: u => escape(date(u.createdAt)) },
        { key: 'act', label: '', sort: false, render: u => u.id === ctx.user.id ? '' : `<div class="t-actions"><button class="btn btn-sm" data-toggle="${u.id}">${u.active !== false ? 'Desactivar' : 'Activar'}</button><button class="btn btn-sm btn-ghost" data-pass="${u.id}">Clave</button><button class="btn btn-sm btn-ghost" data-edit="${u.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${u.id}" aria-label="Eliminar">✕</button></div>` }
      ],
      csv: { name: 'usuarios.csv', map: u => ({ nombre: u.name, correo: u.email, rol: ctx.auth.roleName(u.role), activo: u.active !== false ? 'sí' : 'no', alta: u.createdAt.slice(0, 10) }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-new]')) edit(null, ctx);
      if (t.dataset.edit) edit(db.get('users', t.dataset.edit), ctx);
      if (t.dataset.toggle) { const u = db.get('users', t.dataset.toggle); db.update('users', u.id, { active: u.active === false }); db.log('Usuario', `${u.name} ${u.active === false ? 'activado' : 'desactivado'}`, ctx.user.id); toast(`${u.name} ${u.active === false ? 'activado' : 'desactivado'}`, 'success'); }
      if (t.dataset.pass) { const u = db.get('users', t.dataset.pass); const v = await formModal({ title: `Nueva clave para ${u.name}`, fields: [{ name: 'password', label: 'Contraseña', value: '', required: true }] }); if (v) { db.update('users', u.id, { password: v.password }); db.log('Clave restablecida', u.name, ctx.user.id); toast('Contraseña actualizada', 'success'); } }
      if (t.dataset.del) { const u = db.get('users', t.dataset.del); if (await confirm(`¿Eliminar a ${u.name}? Perderá el acceso.`, { danger: true, ok: 'Eliminar' })) { db.remove('users', u.id); db.log('Usuario eliminado', u.name, ctx.user.id); toast('Usuario eliminado', 'success'); } }
    };
    view.onchange = e => {
      const id = e.target.dataset.role; if (!id) return;
      const u = db.update('users', id, { role: e.target.value });
      db.log('Rol cambiado', `${u.name} → ${ctx.auth.roleName(u.role)}`, ctx.user.id); toast(`${u.name} ahora es ${ctx.auth.roleName(u.role)}`, 'success');
    };
  }
};
