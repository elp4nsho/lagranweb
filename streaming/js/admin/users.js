// Usuarios y roles: equipo interno (admin, editor, soporte) y suscriptores; crear, cambiar rol, desactivar.
import { db, auth } from '../data/db.js';
import { html, raw, $, toast, confirm, formModal, dataTable, date } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV, userChip } from '../shared/admin-kit.js';

const PERMS = {
  admin: 'Todo: contenido, suscriptores, planes, soporte, usuarios y restablecer datos',
  editor: 'Dashboard, catálogo, filas de la portada, billboard, licencias y textos de la landing',
  soporte: 'Dashboard, suscriptores (gestión de plan/estado) y tickets de soporte',
  suscriptor: 'App: perfiles, catálogo, reproductor, mi lista y cuenta'
};

export function render(el, { user }) {
  const st = { role: 'staff' };
  el.innerHTML = html`${raw(pageHead('Usuarios y roles', 'Cuentas y permisos', `${csvButton()}<button class="btn btn-primary" id="new">+ Nuevo usuario</button>`))}
    <div class="row" style="gap:6px" id="rchips"><button class="chip active" data-r="staff">Equipo interno</button>${Object.entries(auth.roles).map(([k, l]) => raw(`<button class="chip" data-r="${k}">${l} (${db.count('users', u => u.role === k)})</button>`))}</div>
    <div id="tbl"></div>
    <div class="card"><h3>Permisos por rol</h3><div class="table-wrap"><table class="table"><tbody>${Object.entries(PERMS).map(([k, v]) => raw(html`<tr><td><b>${auth.roleName(k)}</b></td><td>${v}</td></tr>`))}</tbody></table></div></div>`;
  const rows = () => db.query('users', u => (st.role === 'staff' ? u.role !== 'suscriptor' : u.role === st.role));
  const t = dataTable($('#tbl', el), {
    rows: rows(), search: r => `${r.name} ${r.email}`,
    columns: [
      { key: 'name', label: 'Usuario', render: r => userChip(r) },
      { key: 'role', label: 'Rol', render: r => `<span class="badge badge-primary">${auth.roleName(r.role)}</span>` },
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
      { name: 'password', label: u.id ? 'Contraseña (vacío = mantener)' : 'Contraseña', required: !u.id, value: u.id ? '' : 'demo123' },
      { name: 'role', label: 'Rol', type: 'select', options: Object.entries(auth.roles), value: u.role || 'editor' },
      { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: u.active !== false }
    ] });
    if (!r) return;
    if (db.find('users', x => x.email.toLowerCase() === r.email.toLowerCase() && x.id !== u.id)) return toast('Ese correo ya está en uso', 'error');
    if (u.id === user.id && r.role !== 'admin') return toast('No puedes quitarte el rol de administrador a ti mismo', 'warning');
    if (!r.password) delete r.password;
    if (u.id) db.update('users', u.id, r);
    else {
      const extra = r.role === 'suscriptor' ? { plan: 'estandar', subStatus: 'activa', joinedAt: new Date().toISOString(), devices: [], card: { brand: 'Visa', last4: '0000' } } : {};
      const nu = db.insert('users', { ...r, ...extra, color: ['#e11d48', '#0891b2', '#7c3aed', '#16a34a'][db.count('users') % 4] });
      if (r.role === 'suscriptor') db.insert('profiles', { userId: nu.id, name: r.name.split(' ')[0], avatar: '🦊', color: '#2563eb', kids: false, pin: '', myList: [] });
    }
    db.log('usuarios', `${u.id ? 'Editado' : 'Creado'} ${r.name} (${auth.roleName(r.role)})`, user.id); toast('Usuario guardado', 'success');
  }
  el.addEventListener('click', async e => {
    if (e.target.id === 'new') edit();
    const c = e.target.closest('[data-r]'); if (c) { st.role = c.dataset.r; el.querySelectorAll('#rchips .chip').forEach(x => x.classList.toggle('active', x === c)); refresh(); }
    const ed = e.target.closest('[data-edit]'); if (ed) edit(db.get('users', ed.dataset.edit));
    const tg = e.target.closest('[data-tog]');
    if (tg) { const u = db.get('users', tg.dataset.tog), on = u.active === false; if (!on && !await confirm(`¿Desactivar a ${u.name}? No podrá iniciar sesión.`, { danger: true, ok: 'Desactivar' })) return; db.update('users', u.id, { active: on }); db.log('usuarios', `${u.name} ${on ? 'activado' : 'desactivado'}`, user.id); toast(`${u.name} ${on ? 'activado' : 'desactivado'}`); }
  });
  wireCSV(el, 'usuarios.csv', () => rows().map(r => ({ id: r.id, nombre: r.name, correo: r.email, rol: r.role, activo: r.active !== false })));
  return { update: refresh };
}
