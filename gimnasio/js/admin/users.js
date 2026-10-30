import { escape, toast, confirm, formModal, date as fmtDate } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { trainer, member } from '../shared/domain.js';
import { icon } from '../shared/icons.js';

const PERMS = {
  admin: 'Todo el panel: planes, horario, sedes, marketing, usuarios y configuración',
  recepcion: 'Kiosco de check-in, POS, socios, pagos y tienda',
  entrenador: 'App entrenador: sus clases, asistencia, rutinas y clientes',
  socio: 'App del socio: reservas, carnet, rutina, progreso y pagos'
};
export function renderUsers(v, _, __, { user: me }) {
  v.innerHTML = `${pageHead('Usuarios y roles', 'Cuentas de acceso al sistema y sus permisos.', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo usuario</button>`)}
  <div class="grid-4">${Object.entries(auth.roles).map(([k, l]) => `<div class="card"><b>${escape(l)}</b> <span class="badge">${db.count('users', u => u.role === k)}</span><p class="muted small mb0" style="margin-top:6px">${PERMS[k]}</p></div>`).join('')}</div>
  <div class="card" data-list></div>`;
  const edit = async u => {
    const val = await formModal({ title: u ? `Editar ${u.name}` : 'Nuevo usuario', fields: [
      { name: 'name', label: 'Nombre', required: true, value: u?.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: u?.email },
      { name: 'password', label: 'Contraseña', required: true, value: u?.password || 'demo123' },
      { name: 'role', label: 'Rol', type: 'select', options: Object.entries(auth.roles), value: u?.role || 'recepcion' },
      { name: 'trainerId', label: 'Entrenador vinculado (solo rol Entrenador)', type: 'select', options: [['', '—'], ...db.all('trainers').map(d => [d.id, d.name])], value: u?.trainerId || '' },
      { name: 'memberId', label: 'Socio vinculado (solo rol Socio)', type: 'select', options: [['', '—'], ...db.all('members').sort((a, b) => a.name.localeCompare(b.name)).map(p => [p.id, `${p.name} · ${p.code}`])], value: u?.memberId || '' },
      { name: 'branchId', label: 'Sede (recepción)', type: 'select', options: [['', '—'], ...db.all('branches').map(b => [b.id, b.name])], value: u?.branchId || '' },
      { name: 'active', label: 'Cuenta activa', type: 'checkbox', value: u ? u.active !== false : true }] });
    if (!val) return;
    if (db.find('users', x => x.email.toLowerCase() === val.email.toLowerCase() && x.id !== u?.id)) return toast('Ese correo ya está en uso', 'error');
    if (val.role === 'entrenador' && !val.trainerId) return toast('Vincula un entrenador para ese rol', 'warning');
    if (val.role === 'socio' && !val.memberId) return toast('Vincula un socio para ese rol', 'warning');
    if (u?.id === me.id && (val.role !== 'admin' || !val.active)) return toast('No puedes quitarte el rol de administrador ni desactivarte', 'warning');
    if (val.role !== 'entrenador') val.trainerId = ''; if (val.role !== 'socio') val.memberId = '';
    u ? db.update('users', u.id, val) : db.insert('users', { ...val, color: ['#4f46e5', '#0891b2', '#db2777', '#059669', '#ea580c'][db.count('users') % 5] });
    db.log('usuario', `${u ? 'Editado' : 'Creado'}: ${val.name} (${auth.roleName(val.role)})`, me.id); toast('Usuario guardado', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('users'),
    search: u => `${u.name} ${u.email}`,
    filters: [{ key: 'role', label: 'Rol', options: Object.entries(auth.roles) }, { key: 'st', label: 'Estado', options: [['1', 'Activos'], ['0', 'Inactivos']], test: (u, val) => (u.active !== false) === (val === '1') }],
    columns: [
      { key: 'name', label: 'Usuario', render: u => `<div class="cell-user"><span class="avatar" style="--size:32px;--av:${u.color || 'var(--primary)'}">${escape(initials(u.name))}</span><span><b>${escape(u.name)}${u.id === me.id ? ' (tú)' : ''}</b><small>${escape(u.email)}</small></span></div>` },
      { key: 'role', label: 'Rol', render: u => `<span class="badge badge-primary">${escape(auth.roleName(u.role))}</span>` },
      { key: 'link', label: 'Vínculo', sort: false, render: u => `<small>${escape(u.trainerId ? trainer(u.trainerId)?.name : u.memberId ? member(u.memberId)?.name : '—')}</small>` },
      { key: 'createdAt', label: 'Creado', render: u => `<small>${escape(fmtDate(u.createdAt))}</small>` },
      { key: 'active', label: 'Activo', render: u => `<label class="switch"><input type="checkbox" data-toggle="${u.id}" ${u.active !== false ? 'checked' : ''} ${u.id === me.id ? 'disabled' : ''}><span></span></label>` },
      { key: 'id', label: '', sort: false, render: u => `<div class="acts-cell">${actBtn('edit', u.id, 'edit', 'Editar')}${u.id !== me.id ? actBtn('del', u.id, 'trash', 'Eliminar') : ''}</div>` }
    ],
    onRow: u => edit(db.get('users', u.id)),
    onAction: async (act, id) => {
      const u = db.get('users', id);
      if (act === 'edit') return edit(u);
      if (await confirm(`¿Eliminar la cuenta de ${u.name}?`, { title: 'Eliminar usuario', danger: true, ok: 'Eliminar' })) { db.remove('users', id); db.log('usuario', `Eliminado: ${u.name}`, me.id); toast('Usuario eliminado', 'success'); }
    },
    csv: { name: 'usuarios.csv', map: u => ({ nombre: u.name, correo: u.email, rol: auth.roleName(u.role), activo: u.active !== false ? 'sí' : 'no' }) }
  });
  v.querySelector('[data-list]').addEventListener('change', e => {
    const t = e.target.closest('[data-toggle]'); if (!t) return;
    const u = db.update('users', t.dataset.toggle, { active: t.checked });
    db.log('usuario', `${u.name} ${t.checked ? 'activado' : 'desactivado'}`, me.id); toast(`Cuenta ${t.checked ? 'activada' : 'desactivada'}`, 'success');
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
