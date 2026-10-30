// Usuarios y roles: CRUD, activar/desactivar, sucursal asignada y matriz de permisos aplicada en el panel.
import { escape, toast, confirm, formModal, ago } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { pageHead, smartTable } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { COLORS } from '../data/catalog.js';


export const PERMS = [
  ['Dashboard', ['admin', 'jefe']], ['Tablero kanban y OT', ['admin', 'jefe', 'asesor']], ['Solicitudes, clientes, seguros, garantías, facturas', ['admin', 'jefe', 'asesor']],
  ['Bodega, repuestos y compras', ['admin', 'jefe', 'bodega', 'asesor']], ['Mecánicos, baremo y tarifas', ['admin', 'jefe']], ['App del mecánico', ['admin', 'jefe', 'mecanico']],
  ['Portal aseguradoras', ['admin', 'aseguradora']], ['Contenido del sitio y usuarios', ['admin']], ['Mi cuenta (sitio)', ['cliente']]
];

async function editUser(u, ctx) {
  const v = await formModal({ title: u ? `Editar · ${u.name}` : 'Nuevo usuario', fields: [
    { name: 'name', label: 'Nombre', required: true, value: u?.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: u?.email },
    { name: 'password', label: 'Contraseña', required: true, value: u?.password || 'demo123' },
    { name: 'role', label: 'Rol', type: 'select', options: Object.entries(auth.roles), value: u?.role || 'asesor' },
    { name: 'insurerId', label: 'Aseguradora (solo rol aseguradora)', type: 'select', options: [['', '—'], ...db.all('insurers').map(i => [i.id, i.name])], value: u?.insurerId || '' },
    { name: 'phone', label: 'Celular', value: u?.phone },
    { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: u ? u.active !== false : true }] });
  if (!v) return;
  if (!/^\S+@\S+\.\S+$/.test(v.email)) { toast('Correo no válido', 'warning'); return; }
  if (db.find('users', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== u?.id)) { toast('Ese correo ya existe', 'warning'); return; }
  if (u && u.id === ctx.user.id && (v.role !== 'admin' || !v.active)) { toast('No puedes quitarte el rol de administrador ni desactivarte', 'warning'); return; }
  if (v.role === 'aseguradora' && !v.insurerId) { toast('Asocia la cuenta a una aseguradora', 'warning'); return; }
  const extra = v.role === 'cliente' ? { customerId: u?.customerId || (db.find('customers', c => c.email.toLowerCase() === v.email.toLowerCase()) || db.insert('customers', { name: v.name, email: v.email, phone: v.phone || '', rut: '', address: '', company: '', notes: '' })).id } : v.role === 'mecanico' && !u?.specialty ? { specialty: 'Mecánica general', tariff: 10000, level: 'Técnico', hoursDay: 8 } : {};
  if (u) db.update('users', u.id, { ...v, ...extra });
  else db.insert('users', { ...v, ...extra, color: COLORS[db.count('users') % COLORS.length], demo: false });
  db.log('usuarios', `Usuario ${u ? 'editado' : 'creado'}: ${v.name} (${auth.roleName(v.role)}${v.active ? '' : ', desactivado'})`, ctx.user.id);
  toast('Usuario guardado', 'success');
}

export default {
  id: 'usuarios', label: 'Usuarios y roles', icon: '🔐', group: 'Sistema', roles: ['admin'], watch: ['users'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Usuarios y roles', 'Cuentas con acceso. Los permisos se aplican ocultando el menú y bloqueando las rutas.', '<button class="btn btn-primary btn-sm" data-new>+ Nuevo usuario</button>')}<div data-list></div>
      <div class="card stack"><h3 style="margin:0">Permisos por rol</h3><div class="table-wrap"><table class="table"><thead><tr><th>Módulo</th>${Object.values(auth.roles).map(r => `<th>${escape(r)}</th>`).join('')}</tr></thead><tbody>
      ${PERMS.map(([m, rs]) => `<tr><td>${escape(m)}</td>${Object.keys(auth.roles).map(r => `<td>${rs.includes(r) ? '<span class="badge badge-success plain">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-new]')) editUser(null, ctx);
      const t = e.target.closest('[data-toggle]');
      if (t) { const u = db.get('users', t.dataset.toggle); if (u.id === ctx.user.id) { toast('No puedes desactivar tu propia cuenta', 'warning'); return; } db.update('users', u.id, { active: u.active === false }); db.log('usuarios', `${u.name} ${u.active === false ? 'reactivado' : 'desactivado'}`, ctx.user.id); toast(u.active === false ? 'Cuenta reactivada' : 'Cuenta desactivada', 'success'); }
      const d = e.target.closest('[data-delu]');
      if (d) { const u = db.get('users', d.dataset.delu); if (u.id === ctx.user.id) { toast('No puedes eliminar tu propia cuenta', 'warning'); return; } if (await confirm(`¿Eliminar la cuenta de ${u.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('users', u.id); db.log('usuarios', `Usuario eliminado: ${u.name}`, ctx.user.id); toast('Usuario eliminado', 'success'); } }
    });
    return smartTable(el.querySelector('[data-list]'), {
      rows: () => db.all('users').map(u => ({ ...u, roleName: auth.roleName(u.role), branch: u.insurerId ? db.get('insurers', u.insurerId)?.name : u.specialty || '—', lastLogin: db.getValue('_log', []).find(l => l.user === u.id && l.action === 'login')?.at || '' })),
      filters: [{ key: 'role', label: 'Rol', options: Object.entries(auth.roles) }, { key: 'active', label: 'Estado', options: [['true', 'Activas'], ['false', 'Desactivadas']], test: (r, v) => String(r.active !== false) === v }],
      search: r => `${r.name} ${r.email}`,
      columns: [
        { key: 'name', label: 'Usuario', render: r => `<span class="row nowrap" style="gap:10px"><span class="avatar" style="--av:${escape(r.color || 'var(--primary)')}">${escape(initials(r.name))}</span><span><b>${escape(r.name)}</b>${r.id === ctx.user.id ? ' <span class="badge badge-primary plain">Tú</span>' : ''}<small class="muted d-block">${escape(r.email)}</small></span></span>` },
        { key: 'roleName', label: 'Rol', render: r => `<span class="badge plain">${escape(r.roleName)}</span>` }, { key: 'branch', label: 'Detalle' },
        { key: 'lastLogin', label: 'Último acceso', render: r => r.lastLogin ? ago(r.lastLogin) : '<span class="muted">—</span>' },
        { key: 'active', label: 'Estado', render: r => r.active !== false ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-danger">Desactivada</span>' },
        { key: 'id', label: '', sort: false, render: r => `<span class="nowrap no-row"><button class="btn btn-sm" data-toggle="${r.id}">${r.active !== false ? 'Desactivar' : 'Activar'}</button> <button class="btn btn-sm btn-ghost" data-delu="${r.id}" aria-label="Eliminar">🗑</button></span>` }
      ],
      onRow: r => editUser(db.get('users', r.id), ctx),
      csv: { name: 'usuarios', map: r => ({ nombre: r.name, correo: r.email, rol: r.roleName, detalle: r.branch, activo: r.active !== false ? 'sí' : 'no' }) }
    });
  }
};
