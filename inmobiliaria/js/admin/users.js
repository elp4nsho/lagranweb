// Usuarios y roles: crear, cambiar rol, desactivar, restablecer clave. Muestra la matriz de permisos.
import { escape, confirm, toast, date } from '../../../assets/core/ui.js';
import { ROLES } from '../data/db.js';
import { pageHead, crudTable, editForm, avatar } from '../shared/kit.js';

const MATRIX = [
  ['Dashboard', ['admin', 'editor']], ['Propiedades y proyectos', ['admin', 'editor']], ['Aprobar publicaciones', ['admin', 'editor']], ['Contenido del sitio (CMS)', ['admin', 'editor']],
  ['Leads, visitas, propietarios', ['admin']], ['Contratos y cobranza', ['admin']], ['Configuración y UF', ['admin']], ['Usuarios y bitácora', ['admin']],
  ['App de corredores', ['corredor', 'admin']], ['Publicar propiedad / seguir estado', ['propietario', 'cliente']], ['Favoritos y alertas', ['cliente', 'propietario']]
];

export function renderUsers(el, p, q, ctx) {
  const { db, user } = ctx;
  el.innerHTML = `${pageHead('Usuarios y roles', `${db.count('users')} cuentas · ${db.count('users', u => u.active === false)} desactivadas`, '<button class="btn btn-primary" data-new>+ Nuevo usuario</button>')}
    <div data-t></div>
    <div class="card"><h3>Permisos por rol</h3><div class="table-wrap"><table class="table"><thead><tr><th>Permiso</th>${Object.values(ROLES).map(r => `<th>${escape(r)}</th>`).join('')}</tr></thead><tbody>
      ${MATRIX.map(([n, rs]) => `<tr><td>${escape(n)}</td>${Object.keys(ROLES).map(r => `<td>${rs.includes(r) ? '<span class="badge badge-success">Sí</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  const form = u => editForm({ title: u ? 'Editar usuario' : 'Nuevo usuario', size: '', values: u || { role: 'cliente', active: true, color: '#1e4db7' }, fields: [
    { name: 'name', label: 'Nombre', required: true, full: true }, { name: 'email', label: 'Correo', type: 'email', required: true, full: true },
    { name: 'role', label: 'Rol', type: 'select', options: Object.entries(ROLES) }, { name: 'phone', label: 'Teléfono' },
    { name: 'password', label: u ? 'Nueva contraseña (opcional)' : 'Contraseña', type: 'text', required: !u }, { name: 'color', label: 'Color avatar', type: 'color' },
    { name: 'active', label: 'Cuenta activa', type: 'checkbox' }] });
  const tbl = crudTable(el.querySelector('[data-t]'), {
    rows: () => db.all('users'), search: u => `${u.name} ${u.email}`,
    filters: [{ key: 'role', label: 'Rol', options: Object.entries(ROLES) }, { key: 'active', label: 'Estado', options: [['true', 'Activa'], ['false', 'Desactivada']], fn: (u, v) => String(u.active !== false) === v }],
    columns: [
      { key: 'name', label: 'Usuario', render: u => `<div class="row" style="gap:10px;flex-wrap:nowrap">${avatar(u.name, u.color)}<div><b>${escape(u.name)}</b>${u.id === user.id ? ' <span class="badge badge-primary plain">Tú</span>' : ''}<br><span class="muted small">${escape(u.email)}</span></div></div>` },
      { key: 'role', label: 'Rol', render: u => `<select class="select select-sm" data-role="${u.id}" ${u.id === user.id ? 'disabled' : ''} aria-label="Rol">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${v}</option>`).join('')}</select>` },
      { key: 'active', label: 'Activa', render: u => `<label class="switch"><input type="checkbox" data-act="${u.id}" ${u.active !== false ? 'checked' : ''} ${u.id === user.id ? 'disabled' : ''}><span></span></label>` },
      { key: 'demo', label: 'Demo', render: u => u.demo ? '<span class="badge badge-info plain">Demo</span>' : '' },
      { key: 'createdAt', label: 'Creada', render: u => `<span class="small">${date(u.createdAt)}</span>` },
      { key: 'id', label: '', sort: false, render: u => `<div class="actions"><button class="btn btn-sm btn-ghost" data-edit="${u.id}">✎</button>${u.id !== user.id ? `<button class="btn btn-sm btn-ghost" data-del="${u.id}">🗑</button>` : ''}</div>` }
    ],
    csv: { name: 'usuarios.csv', map: u => ({ nombre: u.name, correo: u.email, rol: ROLES[u.role], activa: u.active !== false ? 'sí' : 'no', creada: date(u.createdAt) }) }
  });
  el.querySelector('[data-new]').onclick = async () => {
    const r = await form(); if (!r) return;
    if (db.find('users', x => x.email.toLowerCase() === r.email.toLowerCase())) return toast('Ya existe un usuario con ese correo', 'error');
    db.insert('users', r); db.log('usuarios', `${user.name} creó a ${r.name} (${ROLES[r.role]})`, user.id); toast('Usuario creado', 'success'); tbl.refresh();
  };
  el.addEventListener('change', e => {
    const r = e.target.closest('[data-role]');
    if (r) { const u = db.get('users', r.dataset.role); db.update('users', u.id, { role: r.value }); db.log('usuarios', `${user.name} cambió el rol de ${u.name} a ${ROLES[r.value]}`, user.id); toast(`${u.name} ahora es ${ROLES[r.value]}`, 'success'); }
    const a = e.target.closest('[data-act]');
    if (a) { const u = db.get('users', a.dataset.act); db.update('users', u.id, { active: a.checked }); db.log('usuarios', `${user.name} ${a.checked ? 'activó' : 'desactivó'} a ${u.name}`, user.id); toast(a.checked ? 'Cuenta activada' : 'Cuenta desactivada: ya no podrá ingresar', a.checked ? 'success' : 'warning'); }
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) {
      const u = db.get('users', b.dataset.edit), r = await form({ ...u, password: '' }); if (!r) return;
      if (!r.password) delete r.password;
      if (u.id === user.id) { r.role = u.role; r.active = true; }
      db.update('users', u.id, r); db.log('usuarios', `${user.name} editó a ${r.name}`, user.id); toast('Usuario actualizado', 'success'); tbl.refresh();
    }
    if (b.dataset.del) { const u = db.get('users', b.dataset.del); if (await confirm(`¿Eliminar la cuenta de ${u.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('users', u.id); db.log('usuarios', `${user.name} eliminó a ${u.name}`, user.id); toast('Usuario eliminado', 'success'); tbl.refresh(); } }
  });
}
