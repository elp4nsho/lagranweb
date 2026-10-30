// Usuarios y roles: crear, editar rol, asignar productora, desactivar. Permisos de cada rol.
import { db, auth } from '../data/db.js';
import { html, raw, $, toast, confirm, formModal, dataTable, date } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV, userChip } from '../shared/admin-kit.js';

const PERMS = {
  admin: 'Todo el panel, configuración, usuarios y tarifas',
  soporte: 'Dashboard, eventos (lectura), pedidos y reembolsos, actividad',
  productor: 'Portal productor: sus eventos, ventas, asistentes, liquidaciones y app de acceso',
  staff: 'App de control de acceso (escaneo de entradas)',
  cliente: 'Sitio público: compras, mis entradas, transferencia y reventa'
};

export function render(el, { user }) {
  const st = { role: '' };
  el.innerHTML = html`${raw(pageHead('Usuarios y roles', 'Cuentas de la plataforma y sus permisos', `${csvButton()}<button class="btn btn-primary" id="new">+ Nuevo usuario</button>`))}
    <div class="row" style="gap:6px" id="rchips"><button class="chip active" data-r="">Todos (${db.count('users')})</button>${Object.entries(auth.roles).map(([k, l]) => raw(`<button class="chip" data-r="${k}">${l} (${db.count('users', u => u.role === k)})</button>`))}</div>
    <div id="tbl"></div>
    <div class="card"><h3>Permisos por rol</h3><div class="table-wrap"><table class="table"><tbody>${Object.entries(PERMS).map(([k, v]) => raw(html`<tr><td><b>${auth.roleName(k)}</b></td><td>${v}</td></tr>`))}</tbody></table></div></div>`;
  const orgs = () => db.all('organizers');
  const rows = () => db.query('users', u => !st.role || u.role === st.role).map(u => ({ ...u, org: u.organizerId ? db.get('organizers', u.organizerId)?.name : '', tickets: u.role === 'cliente' ? db.count('tickets', t => t.ownerId === u.id && t.status !== 'anulado') : '' }));
  const t = dataTable($('#tbl', el), {
    rows: rows(), pageSize: 10, search: r => `${r.name} ${r.email} ${r.role} ${r.org}`,
    columns: [
      { key: 'name', label: 'Usuario', render: r => userChip(r) },
      { key: 'role', label: 'Rol', render: r => `<span class="badge badge-primary">${auth.roleName(r.role)}</span>${r.org ? `<br><small class="muted">${r.org}</small>` : ''}` },
      { key: 'tickets', label: 'Entradas' },
      { key: 'createdAt', label: 'Alta', render: r => date(r.createdAt) },
      { key: 'active', label: 'Estado', render: r => (r.active !== false ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>') },
      { key: 'id', label: '', sort: false, render: r => `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-ghost" data-edit="${r.id}">Editar</button>${r.id !== user.id ? `<button class="btn btn-sm btn-ghost" data-tog="${r.id}">${r.active !== false ? 'Desactivar' : 'Activar'}</button>` : ''}</span>` }
    ]
  });
  const refresh = () => t.update(rows());
  async function edit(u = {}) {
    const r = await formModal({ title: u.id ? `Editar ${u.name}` : 'Nuevo usuario', fields: [
      { name: 'name', label: 'Nombre', required: true, value: u.name },
      { name: 'email', label: 'Correo', type: 'email', required: true, value: u.email },
      { name: 'password', label: u.id ? 'Contraseña (dejar para mantener)' : 'Contraseña', required: !u.id, value: u.id ? '' : 'demo123' },
      { name: 'role', label: 'Rol', type: 'select', options: Object.entries(auth.roles), value: u.role || 'cliente' },
      { name: 'organizerId', label: 'Productora (solo rol productor)', type: 'select', options: [['', '—'], ...orgs().map(o => [o.id, o.name])], value: u.organizerId || '' },
      { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: u.active !== false }
    ] });
    if (!r) return;
    if (db.find('users', x => x.email.toLowerCase() === r.email.toLowerCase() && x.id !== u.id)) return toast('Ese correo ya está en uso', 'error');
    if (r.role === 'productor' && !r.organizerId) return toast('Asigna una productora al usuario productor', 'warning');
    if (u.id === user.id && r.role !== 'admin') return toast('No puedes quitarte el rol de administrador a ti mismo', 'warning');
    if (!r.password) delete r.password;
    if (r.role !== 'productor') r.organizerId = '';
    if (u.id) { db.update('users', u.id, r); db.log('usuario editado', `${r.name} → ${auth.roleName(r.role)}`, user.id); }
    else { db.insert('users', { ...r, color: ['#e11d48', '#0891b2', '#7c3aed', '#16a34a', '#ea580c'][db.count('users') % 5] }); db.log('usuario creado', `${r.name} (${auth.roleName(r.role)})`, user.id); }
    toast('Usuario guardado', 'success');
  }
  el.addEventListener('click', async e => {
    if (e.target.id === 'new') edit();
    const c = e.target.closest('[data-r]'); if (c) { st.role = c.dataset.r; el.querySelectorAll('#rchips .chip').forEach(x => x.classList.toggle('active', x === c)); refresh(); }
    const ed = e.target.closest('[data-edit]'); if (ed) edit(db.get('users', ed.dataset.edit));
    const tg = e.target.closest('[data-tog]');
    if (tg) { const u = db.get('users', tg.dataset.tog); const on = u.active === false; if (!on && !await confirm(`¿Desactivar a ${u.name}? No podrá iniciar sesión.`, { danger: true, ok: 'Desactivar' })) return; db.update('users', u.id, { active: on }); db.log('usuario', `${u.name} ${on ? 'activado' : 'desactivado'}`, user.id); toast(`${u.name} ${on ? 'activado' : 'desactivado'}`); }
  });
  wireCSV(el, 'usuarios.csv', () => rows().map(r => ({ id: r.id, nombre: r.name, correo: r.email, rol: r.role, productora: r.org, activo: r.active !== false, alta: r.createdAt })));
  return { update: refresh };
}
