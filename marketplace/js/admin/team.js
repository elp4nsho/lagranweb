// Usuarios y roles: alta de cuentas (equipo y miembros), cambio de rol, activación y matriz de permisos.
import { escape, modal, toast, confirm as ask, downloadCSV, ago } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, avatar, formData } from '../shared/kit.js';
import { SECTIONS } from './main.js';

const ROLE_KIND = { admin: 'primary', moderador: 'info', soporte: 'success', freelancer: 'warning', cliente: '' };
const COLORS = ['#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706', '#2563eb'];

function userModal(db, auth, me, u = null) {
  const m = modal({
    title: u ? `Editar cuenta · ${u.name}` : 'Nueva cuenta',
    body: `<form class="form-grid" novalidate>
      <div class="field full"><label for="u-n">Nombre *</label><input class="input" id="u-n" name="name" required value="${escape(u?.name || '')}"></div>
      <div class="field"><label for="u-e">Correo *</label><input class="input" id="u-e" name="email" type="email" required value="${escape(u?.email || '')}"></div>
      <div class="field"><label for="u-p">${u ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label><input class="input" id="u-p" name="password" ${u ? '' : 'required value="cambiar123"'}></div>
      <div class="field"><label for="u-r">Rol</label><select class="select" id="u-r" name="role" ${u?.id === me.id ? 'disabled' : ''}>${Object.entries(auth.roles).map(([k, l]) => `<option value="${k}" ${u?.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="u-t">Cargo</label><input class="input" id="u-t" name="title" value="${escape(u?.title || '')}"></div>
      <label class="check full"><input type="checkbox" name="active" ${u ? (u.active !== false ? 'checked' : '') : 'checked'} ${u?.id === me.id ? 'disabled' : ''}> Cuenta activa</label>
    </form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>'
  });
  const f = m.el.querySelector('form');
  m.el.querySelector('[data-save]').onclick = () => {
    const v = formData(f);
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim(); i.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Completa los campos obligatorios', 'warning');
    if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u?.id)) return toast('Ese correo ya está en uso', 'error');
    const role = u?.id === me.id ? me.role : v.role;
    const data = { name: v.name, email: v.email, title: v.title, role, active: u?.id === me.id ? true : !!v.active };
    if (role === 'cliente' && !u?.favorites) data.favorites = [];
    if (role === 'freelancer' && !u?.skills) Object.assign(data, { skills: [], portfolio: [], languages: ['Español'], responseHrs: 6, bio: '', mainCategory: 'diseno', verified: false });
    if (v.password) data.password = v.password;
    if (u) {
      db.update('users', u.id, data);
      if (u.role !== role) db.log('usuarios', `Rol de ${v.name}: ${auth.roleName(u.role)} → ${auth.roleName(role)}`, me.id);
      else db.log('usuarios', `Cuenta actualizada: ${v.name}`, me.id);
    } else { db.insert('users', { ...data, color: COLORS[db.count('users') % COLORS.length] }); db.log('usuarios', `Cuenta creada: ${v.name} (${auth.roleName(role)})`, me.id); }
    toast('Cuenta guardada', 'success');
    m.close();
  };
}

export function render(el, { db, auth, me }) {
  const lastLogin = {};
  db.all('_log').forEach(l => { if (l.action === 'login' && l.user && !lastLogin[l.user]) lastLogin[l.user] = l.at; });
  const rows = db.all('users').map(u => ({ ...u, roleName: auth.roleName(u.role), status: u.active !== false ? 'activo' : 'inactivo', last: lastLogin[u.id] || '' }));
  const counts = Object.keys(auth.roles).map(r => [r, rows.filter(u => u.role === r).length]);
  el.innerHTML = `
    ${pageHead('Usuarios y roles', `${rows.length} cuentas · ${counts.map(([r, n]) => `${n} ${auth.roleName(r).toLowerCase()}`).join(' · ')}`, `<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ Nueva cuenta</button>`)}
    <div class="card" data-t></div>
    <div class="card"><div class="card-head"><h3>Matriz de permisos</h3><span class="small muted">Se aplica en el menú y en cada ruta</span></div>
      <div class="table-wrap"><table class="table perm-grid"><thead><tr><th>Sección</th><th>Admin</th><th>Moderador</th><th>Soporte</th><th>Freelancer</th><th>Cliente</th></tr></thead><tbody>
      ${SECTIONS.map(s => `<tr><td>${s.ico} ${escape(s.label)}</td>${['admin', 'moderador', 'soporte', 'freelancer', 'cliente'].map(r => `<td>${s.roles.includes(r) ? '<span class="text-success">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
      <tr><td>💼 Panel freelancer (servicios, pedidos, ganancias)</td><td>—</td><td>—</td><td>—</td><td class="text-success">✓</td><td>—</td></tr>
      <tr><td>🛒 Panel cliente (pedidos, proyectos, pagos)</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="text-success">✓</td></tr>
      </tbody></table></div></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'users', rows, pageSize: 12, search: r => r.name + r.email + r.roleName,
    filters: [{ key: 'role', label: 'Rol', options: Object.entries(auth.roles) }, { key: 'status', label: 'Estado', options: [['activo', 'Activas'], ['inactivo', 'Desactivadas']] }],
    columns: [
      { key: 'name', label: 'Usuario', render: r => `<div class="cell-user">${avatar(r, 32)}<span><b>${escape(r.name)}${r.id === me.id ? ' <span class="muted small">(tú)</span>' : ''}</b><small>${escape(r.email)}</small></span></div>` },
      { key: 'roleName', label: 'Rol', render: r => badge(r.roleName, ROLE_KIND[r.role]) + (r.demo ? ' <span class="small muted">demo</span>' : '') },
      { key: 'last', label: 'Último ingreso', render: r => r.last ? `<span class="small">${ago(r.last)}</span>` : '<span class="small muted">—</span>' },
      { key: 'status', label: 'Estado', render: r => r.status === 'activo' ? badge('Activa', 'success') : badge('Desactivada', 'danger') },
      { key: 'x', label: '', sort: false, render: r => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button>${r.id !== me.id ? `<button class="btn btn-sm btn-ghost" data-act="toggle">${r.status === 'activo' ? 'Desactivar' : 'Activar'}</button>` : ''}</div>` }
    ],
    onAction: async (act, r) => {
      if (act === 'edit') return userModal(db, auth, me, db.get('users', r.id));
      const on = r.status !== 'activo';
      if (!on && !await ask(`¿Desactivar la cuenta de ${r.name}? No podrá ingresar.`, { danger: true, ok: 'Desactivar' })) return;
      db.update('users', r.id, { active: on }); db.log('usuarios', `Cuenta ${on ? 'activada' : 'desactivada'}: ${r.name}`, me.id); toast(on ? 'Cuenta activada' : 'Cuenta desactivada', 'success');
    }
  });
  el.querySelector('[data-new]').onclick = () => userModal(db, auth, me);
  el.querySelector('[data-csv]').onclick = () => downloadCSV('usuarios.csv', rows.map(r => ({ nombre: r.name, correo: r.email, rol: r.roleName, estado: r.status })));
}
