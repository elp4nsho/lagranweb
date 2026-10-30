// Usuarios y roles: equipo interno y clientes. Solo el administrador puede modificar.
import { db, ROLES, STAFF, PERMS } from '../data/db.js';
import { date, ago, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { pageHead, table, csv, selectFilter } from './kit.js';

const st = { scope: 'staff', role: '', active: '' };
const COLORS = ['#4f46e5', '#e11d48', '#16a34a', '#d97706', '#0891b2', '#7c3aed'];
const SECTIONS = { dashboard: 'Resumen', kyc: 'KYC', cuentas: 'Clientes/transacciones', fraude: 'Fraude', creditos: 'Créditos', tarjetas: 'Tarjetas', productos: 'Productos', soporte: 'Soporte', auditoria: 'Auditoría', usuarios: 'Usuarios' };

export function render(el, ctx) {
  const { user: me, canWrite } = ctx;
  const all = db.all('users');
  const rows = all.filter(u => (st.scope === 'staff' ? STAFF.includes(u.role) : u.role === 'cliente') && (!st.role || u.role === st.role) && (!st.active || (st.active === 'si') === (u.active !== false)));
  const lastLogin = id => db.getValue('_log', []).find(l => l.user === id && l.action === 'login')?.at;
  el.innerHTML = pageHead('Usuarios y roles', `${all.filter(u => STAFF.includes(u.role)).length} usuarios internos · ${all.filter(u => u.role === 'cliente').length} clientes`, `<button class="btn btn-sm" data-csv>⬇ CSV</button>${canWrite ? '<button class="btn btn-sm btn-primary" data-new>+ Nuevo usuario</button>' : ''}`, !canWrite) +
    h`<div class="tabs">${[['staff', 'Equipo interno'], ['clientes', 'Clientes'], ['permisos', 'Matriz de permisos']].map(([k, l]) => h`<button class="tab ${st.scope === k ? 'active' : ''}" data-scope="${k}">${l}</button>`)}</div>`;
  if (st.scope === 'permisos') {
    el.insertAdjacentHTML('beforeend', h`<div class="table-wrap"><table class="table"><thead><tr><th>Sección</th>${STAFF.map(r => h`<th>${ROLES[r]}</th>`)}</tr></thead><tbody>
      ${Object.entries(PERMS).map(([k, p]) => h`<tr><td><b>${SECTIONS[k]}</b></td>${STAFF.map(r => h`<td>${raw(p.write.includes(r) ? '<span class="badge badge-success">Editar</span>' : p.read.includes(r) ? '<span class="badge badge-info">Ver</span>' : '<span class="badge badge-danger">Sin acceso</span>')}</td>`)}</tr>`)}
      </tbody></table></div><p class="small muted">Los clientes solo acceden a la app (app.html). El auditor ve todo en modo lectura.</p>`);
  } else {
    el.insertAdjacentHTML('beforeend', `<div class="card filters">${st.scope === 'staff' ? selectFilter('ur', 'Rol', STAFF.map(r => [r, ROLES[r]]), st.role) : ''}${selectFilter('ua', 'Activo', [['si', 'Activos'], ['no', 'Desactivados']], st.active)}</div><div data-t></div>`);
    table(el.querySelector('[data-t]'), {
      rows, search: u => `${u.name} ${u.email} ${u.rut || ''}`,
      columns: [
        { key: 'name', label: 'Usuario', render: u => h`<span class="row" style="gap:10px"><span class="avatar" style="--av:${u.color || 'var(--primary)'}">${u.name.split(' ').slice(0, 2).map(w => w[0]).join('')}</span><span><b>${u.name}</b>${u.id === me.id ? raw(' <span class="badge badge-primary">Tú</span>') : ''}<br><span class="small muted">${u.email}</span></span></span>` },
        { key: 'role', label: 'Rol', render: u => ROLES[u.role] },
        { key: 'createdAt', label: 'Alta', render: u => date(u.createdAt) },
        { key: 'login', label: 'Último acceso', sort: false, render: u => { const l = lastLogin(u.id); return l ? ago(l) : '—'; } },
        { key: 'active', label: 'Estado', render: u => raw(u.active === false ? '<span class="badge badge-danger">Desactivado</span>' : '<span class="badge badge-success">Activo</span>') },
        { key: 'act', label: '', sort: false, render: u => canWrite ? raw(`<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm btn-ghost" data-edit="${u.id}">Editar</button>${u.id !== me.id ? `<button class="btn btn-sm btn-ghost" data-toggle="${u.id}">${u.active === false ? 'Activar' : 'Desactivar'}</button><button class="btn btn-sm btn-ghost" data-del="${u.id}" aria-label="Eliminar">🗑</button>` : ''}</span>`) : '' },
      ],
    });
    el.querySelector('#ur')?.addEventListener('change', e => { st.role = e.target.value; render(el, ctx); });
    el.querySelector('#ua').onchange = e => { st.active = e.target.value; render(el, ctx); };
    el.querySelector('[data-t]').addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b || !canWrite) return;
      if (b.dataset.edit) edit(db.get('users', b.dataset.edit), me);
      if (b.dataset.toggle) {
        const u = db.get('users', b.dataset.toggle); const off = u.active !== false;
        if (off && !(await confirm(`${u.name} no podrá ingresar.`, { title: 'Desactivar usuario', ok: 'Desactivar', danger: true }))) return;
        db.update('users', u.id, { active: !off }); db.log('usuarios', `${me.name} ${off ? 'desactivó' : 'activó'} a ${u.name}`, me.id); toast(off ? 'Usuario desactivado' : 'Usuario activado', 'info');
      }
      if (b.dataset.del) {
        const u = db.get('users', b.dataset.del);
        if (u.role === 'cliente' && db.count('accounts', a => a.userId === u.id && a.balance > 0)) return toast('El cliente tiene saldo: desactívalo en vez de eliminarlo', 'warning');
        if (!(await confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`, { title: 'Eliminar usuario', ok: 'Eliminar', danger: true }))) return;
        db.remove('users', u.id); db.log('usuarios', `${me.name} eliminó a ${u.name}`, me.id); toast('Usuario eliminado', 'info');
      }
    });
  }
  el.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { st.scope = b.dataset.scope; st.role = ''; render(el, ctx); });
  el.querySelector('[data-csv]').onclick = () => csv('usuarios-condor.csv', rows.map(u => ({ nombre: u.name, correo: u.email, rol: ROLES[u.role], activo: u.active === false ? 'no' : 'sí', alta: date(u.createdAt) })));
  el.querySelector('[data-new]')?.addEventListener('click', async () => {
    const v = await formModal({ title: 'Nuevo usuario interno', fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'role', label: 'Rol', type: 'select', options: STAFF.map(r => [r, ROLES[r]]), value: 'ejecutivo' }, { name: 'password', label: 'Clave temporal', required: true, value: 'demo1234' }, { name: 'demo', label: 'Mostrar como cuenta demo en el login', type: 'checkbox' }] });
    if (!v) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return toast('Correo inválido', 'warning');
    if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase())) return toast('Ese correo ya existe', 'error');
    db.insert('users', { ...v, active: true, color: COLORS[db.count('users') % COLORS.length] });
    db.log('usuarios', `${me.name} creó el usuario ${v.name} (${ROLES[v.role]})`, me.id);
    toast('Usuario creado', 'success');
  });
}

async function edit(u, me) {
  const isStaff = STAFF.includes(u.role);
  const v = await formModal({ title: `Editar ${u.name}`, fields: [{ name: 'name', label: 'Nombre', required: true, value: u.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: u.email }, { name: 'role', label: 'Rol', type: 'select', options: Object.entries(ROLES), value: u.role }, { name: 'password', label: 'Clave (dejar igual para no cambiar)', value: u.password }] });
  if (!v) return;
  if (u.id === me.id && v.role !== 'admin') return toast('No puedes quitarte el rol de administrador a ti mismo', 'warning');
  if (db.find('users', x => x.id !== u.id && x.email.toLowerCase() === v.email.toLowerCase())) return toast('Ese correo ya existe', 'error');
  db.update('users', u.id, v);
  db.log('usuarios', `${me.name} editó a ${u.name}${v.role !== u.role ? ` · rol ${ROLES[u.role]} → ${ROLES[v.role]}` : ''}`, me.id);
  toast('Usuario actualizado', 'success');
  void isStaff;
}
