// Usuarios y roles: alta, cambio de rol, activar/desactivar, restablecer clave, matriz de permisos.
import { db, auth } from '../data/db.js';
import { html, raw, formModal, confirm, toast, ago, downloadCSV } from '../../../assets/core/ui.js';
import { dataTable } from '../shared/table.js';
import { pageHead, kpi } from '../shared/shell.js';
import { avatar } from '../shared/views.js';
import { SECTIONS } from './perms.js';

const ROLE_BADGE = { admin: 'primary', despachador: 'info', soporte: 'warning', repartidor: 'success', cliente: '' };

export function mountUsuarios(el, ctx) {
  let f = 'todos';
  el.innerHTML = html`${raw(pageHead('Usuarios y roles', 'Accesos a la consola, la app del repartidor y el portal de clientes.', '<button class="btn" data-csv>⇩ CSV</button><button class="btn btn-primary" data-new>＋ Nuevo usuario</button>'))}
    <div class="kpis" data-k></div>
    <div class="chips" data-chips>${[['todos', 'Todos'], ...Object.entries(auth.roles), ['inactivos', 'Inactivos']].map(([k, l]) => raw(html`<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}</button>`))}</div><div data-t></div>
    <div class="card"><div class="card-title"><h3>Matriz de permisos</h3><span class="muted small">Se aplica al menú y a cada ruta de la consola</span></div><div class="table-wrap"><table class="table perm-table"><thead><tr><th>Sección</th>${['admin', 'despachador', 'soporte'].map(r => raw(html`<th>${auth.roleName(r)}</th>`))}</tr></thead><tbody>
      ${SECTIONS.map(s => raw(html`<tr><td>${s.ico} ${s.label}</td>${['admin', 'despachador', 'soporte'].map(r => raw(s.roles.includes(r) ? '<td class="ok">✓</td>' : '<td class="no">—</td>'))}</tr>`))}
      <tr><td>🛵 App repartidor</td><td class="no">—</td><td class="no">—</td><td class="no">—</td></tr></tbody></table></div><p class="muted small" style="margin:10px 0 0">Repartidores solo acceden a repartidor.html y clientes a cliente.html.</p></div>`;
  const lastLogin = () => { const m = {}; db.getValue('_log', []).forEach(l => { if (l.action === 'login' && l.user && !m[l.user]) m[l.user] = l.at; }); return m; };
  const rows = () => { const ll = lastLogin(); return db.all('users').filter(u => f === 'todos' || (f === 'inactivos' ? u.active === false : u.role === f)).map(u => ({ ...u, last: ll[u.id] || '' })); };
  const kp = () => { const u = db.all('users'); el.querySelector('[data-k]').innerHTML = kpi('Usuarios', u.length) + kpi('Equipo Rayo', u.filter(x => ['admin', 'despachador', 'soporte'].includes(x.role)).length) + kpi('Repartidores', u.filter(x => x.role === 'repartidor').length) + kpi('Clientes con acceso', u.filter(x => x.role === 'cliente').length); };
  const table = dataTable(el.querySelector('[data-t]'), {
    rows: rows(), pageSize: 12, search: u => `${u.name} ${u.email} ${auth.roleName(u.role)}`,
    columns: [
      { key: 'name', label: 'Usuario', render: u => raw(html`<span class="row" style="gap:10px;flex-wrap:nowrap">${avatar(u.name, u.color, 30)}<span><b>${u.name}</b>${u.id === ctx.user.id ? raw(' <span class="badge plain">Tú</span>') : ''}<br><small class="muted">${u.email}</small></span></span>`) },
      { key: 'role', label: 'Rol', render: u => raw(html`<span class="badge ${ROLE_BADGE[u.role] ? 'badge-' + ROLE_BADGE[u.role] : ''}">${auth.roleName(u.role)}</span>`) },
      { key: 'active', label: 'Estado', render: u => raw(u.active === false ? '<span class="badge badge-danger">Inactivo</span>' : '<span class="badge badge-success">Activo</span>') },
      { key: 'last', label: 'Último acceso', render: u => u.last ? ago(u.last) : '—' },
      { key: 'id', label: 'Acciones', sort: false, render: u => raw(html`<span class="actions"><button class="btn btn-sm" data-edit="${u.id}">Editar</button>${u.id !== ctx.user.id ? raw(html`<button class="btn btn-sm" data-toggle="${u.id}">${u.active === false ? 'Activar' : 'Desactivar'}</button><button class="btn btn-sm btn-ghost" data-pw="${u.id}" title="Restablecer clave">🔑</button><button class="btn btn-sm btn-ghost" data-del="${u.id}" aria-label="Eliminar">🗑</button>`) : ''}</span>`) }
    ]
  });
  const customers = () => db.all('customers').filter(c => !c.userId).map(c => [c.id, c.name]);
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.f) { f = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b)); table.update(rows()); return; }
    if (b.dataset.csv !== undefined) downloadCSV('usuarios-rayo.csv', db.all('users').map(u => ({ nombre: u.name, correo: u.email, rol: auth.roleName(u.role), activo: u.active === false ? 'no' : 'sí' })));
    if (b.dataset.new !== undefined) {
      const v = await formModal({ title: 'Nuevo usuario', fields: [
        { name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true },
        { name: 'role', label: 'Rol', type: 'select', options: Object.entries(auth.roles), value: 'despachador' },
        { name: 'password', label: 'Contraseña inicial', required: true, value: 'demo123' },
        { name: 'customerId', label: 'Cliente asociado (solo rol Cliente)', type: 'select', options: [['', '— Crear cliente nuevo —'], ...customers()] }] });
      if (!v) return;
      if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase())) { toast('Ese correo ya existe', 'error'); return; }
      const extra = {};
      if (v.role === 'repartidor') {
        const id = 'c' + Date.now().toString(36);
        db.insert('couriers', { id, name: v.name, vehicle: 'moto', model: 'Por definir', plate: 'POR-DEF', zones: ['A'], phone: '', color: '#0891b2', status: 'activo', online: false, rating: 5, ratings: 0, trips: 0, joinedAt: new Date().toISOString(), pos: [-33.43, -70.62], phase: 1, docs: [{ name: 'Licencia de conducir', status: 'pendiente', expires: null }, { name: 'Cédula de identidad', status: 'pendiente', expires: null }] });
        extra.courierId = id;
      }
      if (v.role === 'cliente') extra.customerId = v.customerId || db.insert('customers', { type: 'persona', name: v.name, email: v.email, plan: 'Persona', comuna: 'Providencia', active: true }).id;
      const u = db.insert('users', { name: v.name, email: v.email, password: v.password, role: v.role, color: '#4f46e5', active: true, ...extra });
      if (extra.courierId) db.update('couriers', extra.courierId, { userId: u.id });
      if (extra.customerId) db.update('customers', extra.customerId, { userId: u.id });
      db.log('usuarios', `Alta de ${v.name} (${auth.roleName(v.role)})`, ctx.user.id); toast('Usuario creado', 'success');
    }
    if (b.dataset.edit) {
      const u = db.get('users', b.dataset.edit);
      const self = u.id === ctx.user.id;
      const opts = Object.entries(auth.roles).filter(([k]) => !self || k === 'admin');
      const v = await formModal({ title: `Editar ${u.name}`, fields: [{ name: 'name', label: 'Nombre', required: true, value: u.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: u.email }, { name: 'role', label: self ? 'Rol (no puedes cambiar tu propio rol)' : 'Rol', type: 'select', options: opts, value: u.role }, { name: 'phone', label: 'Teléfono', value: u.phone }] });
      if (!v) return;
      if ((v.role === 'repartidor' && !u.courierId) || (v.role === 'cliente' && !u.customerId)) { toast('Para ese rol crea un usuario nuevo (requiere perfil de repartidor o cliente)', 'warning'); return; }
      db.update('users', u.id, v);
      db.log('usuarios', `${u.name}: datos/rol actualizados${v.role !== u.role ? ` (${auth.roleName(u.role)} → ${auth.roleName(v.role)})` : ''}`, ctx.user.id); toast('Usuario actualizado', 'success');
    }
    if (b.dataset.toggle) { const u = db.get('users', b.dataset.toggle); db.update('users', u.id, { active: u.active === false }); db.log('usuarios', `${u.name} ${u.active === false ? 'activado' : 'desactivado'}`, ctx.user.id); toast(`Usuario ${u.active === false ? 'activado' : 'desactivado'}`, 'success'); }
    if (b.dataset.pw) { const u = db.get('users', b.dataset.pw); if (await confirm(`¿Restablecer la clave de ${u.name} a "demo123"?`, { ok: 'Restablecer' })) { db.update('users', u.id, { password: 'demo123' }); db.log('usuarios', `Clave restablecida: ${u.name}`, ctx.user.id); toast('Clave restablecida a demo123', 'success'); } }
    if (b.dataset.del) { const u = db.get('users', b.dataset.del); if (await confirm(`¿Eliminar el usuario ${u.name}? (sus datos operativos se conservan)`, { danger: true, ok: 'Eliminar' })) { db.remove('users', u.id); db.log('usuarios', `Eliminado ${u.name}`, ctx.user.id); toast('Usuario eliminado', 'success'); } }
  });
  kp();
  let sig = '';
  return { refresh() { const n = JSON.stringify(db.all('users').map(u => [u.id, u.role, u.active, u.name, u.email])); if (n === sig) return; sig = n; table.update(rows()); kp(); } };
}
