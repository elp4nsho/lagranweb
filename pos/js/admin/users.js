// Usuarios y roles: crear cuentas, cambiar rol, desactivar, restablecer contraseña. Matriz de permisos.
import { html, raw, date, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, PERMS } from '../data/db.js';
import { pageHead, smartTable, exportCSV, log, me } from '../shared/common.js';

const SECTIONS = { dashboard: 'Dashboard', cash: 'Reportes de caja', customers: 'Clientes', products: 'Productos', inventory: 'Stock', movements: 'Movimientos', purchases: 'Compras', suppliers: 'Proveedores', branches: 'Sucursales', employees: 'Empleados', users: 'Usuarios', settings: 'Ajustes', activity: 'Actividad' };
const COLORS = ['#7c3aed', '#0891b2', '#d97706', '#059669', '#e11d48', '#2563eb'];

export function render(el) {
  const logs = db.all('_log');
  const rows = db.all('users').map(u => ({ ...u, roleName: auth.roleName(u.role), lastLogin: logs.find(l => l.user === u.id && l.action === 'login')?.at || '', active: u.active !== false }));
  el.innerHTML = html`${raw(pageHead('Usuarios y roles', 'Cuentas del equipo. Los permisos se aplican al menú y a cada ruta del panel.', '<button class="btn" data-csv>⬇ CSV</button><button class="btn btn-primary" data-new>+ Nuevo usuario</button>'))}
    <div data-t></div>
    <div class="card"><div class="card-head"><h3>Permisos por rol</h3></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Sección</th>${Object.keys(PERMS).map(r => raw(`<th>${auth.roleName(r)}</th>`))}</tr></thead><tbody>
      ${Object.entries(SECTIONS).map(([k, l]) => raw(`<tr><td>${l}</td>${Object.keys(PERMS).map(r => `<td>${PERMS[r].includes(k) ? '<span class="badge badge-success">Sí</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`))}
      </tbody></table></div>
      <p class="small muted" style="margin:12px 0 0">Cajeros solo usan la caja (sin back-office). Descuentos sobre el máximo y anulaciones piden PIN de supervisor. Bodega edita stock y compras, pero solo ve productos.</p></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    key: 'users', rows, search: u => `${u.name} ${u.email} ${u.roleName}`, defaultSort: { key: 'role', dir: 1 },
    filters: [{ key: 'role', label: 'Rol', options: Object.entries(auth.roles) }, { key: 'active', label: 'Estado', options: [['true', 'Activo'], ['false', 'Desactivado']], test: (u, v) => String(u.active) === v }],
    columns: [
      { key: 'name', label: 'Usuario', render: u => html`<div class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar" style="--av:${u.color}">${initials(u.name)}</span><span><b>${u.name}</b>${u.id === me().id ? raw(' <span class="badge badge-info plain">Tú</span>') : ''}<br><small class="muted">${u.email}</small></span></div>` },
      { key: 'role', label: 'Rol', render: u => u.id === me().id ? `<b>${u.roleName}</b>` : `<select class="select" data-role="${u.id}" style="min-height:34px;padding-block:4px" aria-label="Rol">${Object.entries(auth.roles).map(([k, l]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${l}</option>`).join('')}</select>` },
      { key: 'createdAt', label: 'Alta', render: u => date(u.createdAt) },
      { key: 'lastLogin', label: 'Último acceso', render: u => u.lastLogin ? ago(u.lastLogin) : '<span class="muted">—</span>' },
      { key: 'active', label: 'Estado', render: u => u.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Desactivado</span>' },
      { key: 'act', label: '', sort: false, class: 'actions', render: u => u.id === me().id ? '' : `<button class="btn btn-sm" data-edit="${u.id}">Editar</button><button class="btn btn-sm btn-ghost" data-pass="${u.id}" title="Restablecer contraseña">🔑</button><button class="btn btn-sm ${u.active ? 'btn-ghost' : ''}" data-toggle="${u.id}">${u.active ? 'Desactivar' : 'Activar'}</button>` }
    ]
  });
  el.addEventListener('change', e => {
    const s = e.target.closest('[data-role]');
    if (!s) return;
    const u = db.get('users', s.dataset.role);
    db.update('users', u.id, { role: s.value });
    log('usuarios', `Cambió el rol de ${u.name}: ${auth.roleName(u.role)} → ${auth.roleName(s.value)}`);
    toast(`${u.name} ahora es ${auth.roleName(s.value)}`, 'success');
  });
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-csv]')) exportCSV('usuarios', t.filtered().map(u => ({ nombre: u.name, email: u.email, rol: u.roleName, estado: u.active ? 'activo' : 'desactivado', alta: u.createdAt.slice(0, 10) })));
    const ed = e.target.closest('[data-edit]');
    if (e.target.closest('[data-new]') || ed) {
      const u = ed ? db.get('users', ed.dataset.edit) : { name: '', email: '', role: 'cajero', password: 'pampa123', branchId: 'b1', shift: 'Mañana' };
      const fields = [{ name: 'name', label: 'Nombre', value: u.name, required: true }, { name: 'email', label: 'Correo', type: 'email', value: u.email, required: true }, { name: 'role', label: 'Rol', type: 'select', value: u.role, options: Object.entries(auth.roles) }];
      if (!ed) fields.push({ name: 'password', label: 'Contraseña inicial', value: 'pampa123', required: true }, { name: 'demo', label: 'Mostrar como cuenta demo en el login', type: 'checkbox', value: false });
      const v = await formModal({ title: ed ? `Editar ${u.name}` : 'Nuevo usuario', fields });
      if (!v) return;
      if (!/^\S+@\S+\.\S+$/.test(v.email)) return toast('Correo inválido', 'warning');
      if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u.id)) return toast('Ese correo ya está registrado', 'warning');
      if (ed) { db.update('users', u.id, v); log('usuarios', `Editó a ${v.name}`); }
      else { db.insert('users', { ...v, active: true, color: COLORS[db.count('users') % COLORS.length], branchId: 'b1', shift: 'Mañana', pin: String(1000 + Math.floor(Math.random() * 9000)) }); log('usuarios', `Creó a ${v.name} (${auth.roleName(v.role)})`); }
      toast('Usuario guardado', 'success');
    }
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      const u = db.get('users', tg.dataset.toggle);
      const off = u.active !== false;
      if (off && !await confirm(`${u.name} no podrá volver a iniciar sesión hasta que lo reactives.`, { title: 'Desactivar usuario', danger: true, ok: 'Desactivar' })) return;
      db.update('users', u.id, { active: !off });
      log('usuarios', `${off ? 'Desactivó' : 'Activó'} a ${u.name}`);
      toast(`${u.name} ${off ? 'desactivado' : 'activado'}`, 'info');
    }
    const ps = e.target.closest('[data-pass]');
    if (ps) {
      const u = db.get('users', ps.dataset.pass);
      const v = await formModal({ title: `Nueva contraseña para ${u.name}`, fields: [{ name: 'password', label: 'Contraseña', value: 'temporal123', required: true }] });
      if (!v) return;
      if (v.password.length < 6) return toast('Mínimo 6 caracteres', 'warning');
      db.update('users', u.id, { password: v.password });
      log('usuarios', `Restableció la contraseña de ${u.name}`);
      toast('Contraseña actualizada', 'success');
    }
  });
}
