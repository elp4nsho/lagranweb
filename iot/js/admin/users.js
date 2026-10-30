// Usuarios y roles de Sentinela (admin, ingeniero, operador, solo lectura).
import { db, ROLES, PERMS } from '../data/db.js';
import { date, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pageHead, table, csv, selectFilter } from '../shared/common.js';

const st = { role: '', active: '', tab: 'usuarios' };
const COLORS = ['#16a34a', '#0891b2', '#d97706', '#7c3aed', '#e11d48', '#4f46e5'];
const LABEL = { 'app.alarmas': 'Consola · alarmas', 'app.reglas': 'Consola · reglas', 'app.ordenes': 'Consola · órdenes', 'app.turnos': 'Consola · bitácora', 'admin.panel': 'Admin · acceso', 'admin.sitios': 'Admin · sitios', 'admin.dispositivos': 'Admin · dispositivos', 'admin.firmware': 'Admin · firmware', 'admin.usuarios': 'Admin · usuarios', 'admin.apikeys': 'Admin · claves API', 'admin.auditoria': 'Admin · auditoría', 'admin.exportar': 'Admin · exportar', 'admin.web': 'Admin · sitio web' };

export function render(el, ctx) {
  const w = ctx.canWrite, me = ctx.user;
  const all = db.all('users');
  const rows = all.filter(u => (!st.role || u.role === st.role) && (!st.active || (st.active === 'si') === (u.active !== false)));
  const lastLogin = id => db.getValue('_log', []).find(l => l.user === id && l.action === 'login')?.at;
  el.innerHTML = pageHead('Usuarios y roles', `${all.length} usuarios`, `<button class="btn btn-sm" data-csv>⬇ CSV</button>${w ? '<button class="btn btn-sm btn-primary" data-new>+ Nuevo usuario</button>' : ''}`, !w) +
    h`<div class="tabs">${[['usuarios', 'Usuarios'], ['permisos', 'Matriz de permisos']].map(([k, l]) => h`<button class="tab ${st.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`)}</div>`;
  if (st.tab === 'permisos') {
    el.insertAdjacentHTML('beforeend', h`<div class="table-wrap"><table class="table"><thead><tr><th>Sección</th>${Object.values(ROLES).map(r => h`<th>${r}</th>`)}</tr></thead><tbody>${Object.entries(PERMS).map(([k, p]) => h`<tr><td><b>${LABEL[k]}</b></td>${Object.keys(ROLES).map(r => h`<td>${raw(p.write.includes(r) ? '<span class="badge badge-success">Editar</span>' : p.read.includes(r) ? '<span class="badge badge-info">Ver</span>' : '<span class="badge badge-danger">Sin acceso</span>')}</td>`)}</tr>`)}</tbody></table></div><p class="small muted">Todos los roles ven el panel en vivo, mapa, dispositivos y energía de la consola.</p>`);
  } else {
    el.insertAdjacentHTML('beforeend', `<div class="card filters">${selectFilter('ur', 'Rol', Object.entries(ROLES), st.role)}${selectFilter('ua', 'Estado', [['si', 'Activos'], ['no', 'Desactivados']], st.active)}</div><div data-t></div>`);
    table(el.querySelector('[data-t]'), {
      rows, search: u => `${u.name} ${u.email}`,
      columns: [
        { key: 'name', label: 'Usuario', render: u => h`<span class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar" style="--av:${u.color}">${u.name.split(' ').slice(0, 2).map(x => x[0]).join('')}</span><span><b>${u.name}</b>${u.id === me.id ? raw(' <span class="badge badge-primary">Tú</span>') : ''}<br><span class="small muted">${u.email}</span></span></span>` },
        { key: 'role', label: 'Rol', render: u => ROLES[u.role] },
        { key: 'createdAt', label: 'Alta', render: u => date(u.createdAt) },
        { key: 'll', label: 'Último acceso', sort: false, render: u => { const l = lastLogin(u.id); return l ? ago(l) : '—'; } },
        { key: 'active', label: 'Estado', render: u => raw(u.active === false ? '<span class="badge badge-danger">Desactivado</span>' : '<span class="badge badge-success">Activo</span>') },
        { key: 'act', label: '', sort: false, render: u => w ? raw(`<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-ghost" data-edit="${u.id}">Editar</button>${u.id !== me.id ? `<button class="btn btn-sm btn-ghost" data-toggle="${u.id}">${u.active === false ? 'Activar' : 'Desactivar'}</button><button class="btn btn-sm btn-ghost" data-del="${u.id}" aria-label="Eliminar">🗑</button>` : ''}</span>`) : '' },
      ],
    });
    el.querySelector('#ur').onchange = e => { st.role = e.target.value; ctx.refresh(); };
    el.querySelector('#ua').onchange = e => { st.active = e.target.value; ctx.refresh(); };
    el.querySelector('[data-t]').addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b || !w) return;
      if (b.dataset.edit) edit(db.get('users', b.dataset.edit), me);
      if (b.dataset.toggle) { const u = db.get('users', b.dataset.toggle); const off = u.active !== false; if (off && !(await confirm(`${u.name} no podrá ingresar.`, { title: 'Desactivar', ok: 'Desactivar', danger: true }))) return; db.update('users', u.id, { active: !off }); db.log('usuarios', `${me.name} ${off ? 'desactivó' : 'activó'} a ${u.name}`, me.id); toast(off ? 'Usuario desactivado' : 'Usuario activado', 'info'); }
      if (b.dataset.del) { const u = db.get('users', b.dataset.del); if (!(await confirm(`¿Eliminar a ${u.name}?`, { title: 'Eliminar usuario', ok: 'Eliminar', danger: true }))) return; db.remove('users', u.id); db.log('usuarios', `${me.name} eliminó a ${u.name}`, me.id); toast('Usuario eliminado', 'info'); }
    });
  }
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; ctx.refresh(); });
  el.querySelector('[data-csv]').onclick = () => csv('usuarios-sentinela.csv', rows.map(u => ({ nombre: u.name, correo: u.email, rol: ROLES[u.role], activo: u.active === false ? 'no' : 'sí', alta: u.createdAt })));
  el.querySelector('[data-new]')?.addEventListener('click', async () => {
    const v = await formModal({ title: 'Nuevo usuario', fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'role', label: 'Rol', type: 'select', options: Object.entries(ROLES), value: 'operador' }, { name: 'password', label: 'Clave temporal', required: true, value: 'demo1234' }, { name: 'demo', label: 'Mostrar en cuentas demo del login', type: 'checkbox' }] });
    if (!v) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return toast('Correo inválido', 'warning');
    if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase())) return toast('Ese correo ya existe', 'error');
    db.insert('users', { ...v, active: true, color: COLORS[db.count('users') % COLORS.length] }); db.log('usuarios', `${me.name} creó a ${v.name} (${ROLES[v.role]})`, me.id); toast('Usuario creado', 'success');
  });
}
async function edit(u, me) {
  const v = await formModal({ title: `Editar ${u.name}`, fields: [{ name: 'name', label: 'Nombre', required: true, value: u.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: u.email }, { name: 'role', label: 'Rol', type: 'select', options: Object.entries(ROLES), value: u.role }, { name: 'password', label: 'Clave', required: true, value: u.password }] });
  if (!v) return;
  if (u.id === me.id && v.role !== 'admin') return toast('No puedes quitarte el rol de administrador', 'warning');
  if (db.find('users', x => x.id !== u.id && x.email.toLowerCase() === v.email.toLowerCase())) return toast('Ese correo ya existe', 'error');
  db.update('users', u.id, v); db.log('usuarios', `${me.name} editó a ${u.name}${v.role !== u.role ? ` · rol → ${ROLES[v.role]}` : ''}`, me.id); toast('Usuario actualizado', 'success');
}
