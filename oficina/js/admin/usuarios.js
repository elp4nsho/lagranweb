// Usuarios y roles: alta, cambio de rol, vínculo con persona, activar/desactivar.
import { escape, toast, ago } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { avatar } from '../shared/util.js';

const PERMS = {
  admin: 'Todo el panel: empresas, pisos y editor, reglas, usuarios, ajustes, bitácora.',
  rrhh: 'Personas, áreas, puestos y reservas, salas, visitas, anuncios y bitácora.',
  recepcion: 'Kiosko de recepción, visitas, salas y anuncios.',
  empleado: 'Solo su espacio: perfil, reservas de puesto, salas, equipo y visitas.'
};

export function render(el, ctx) {
  const { db, auth } = ctx;
  const people = db.all('people'), cos = db.all('companies');
  const pName = id => people.find(p => p.id === id)?.name || '';
  const lastLogin = {}; db.all('_log').forEach(l => { if (l.action === 'login' && l.user && !lastLogin[l.user]) lastLogin[l.user] = l.at; });
  const rows = db.all('users').map(u => ({ ...u, personName: pName(u.personId), roleName: auth.roleName(u.role), last: lastLogin[u.id] || '' }));
  const fields = (u = {}) => [
    { name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true },
    { name: 'role', label: 'Rol', type: 'select', options: Object.entries(auth.roles), help: 'Define a qué apps y secciones accede.' },
    { name: 'password', label: u.id ? 'Nueva contraseña (opcional)' : 'Contraseña', type: 'text', required: !u.id, placeholder: u.id ? 'Dejar vacío para mantener' : 'mín. 6 caracteres' },
    { name: 'personId', label: 'Persona vinculada (para Mi espacio)', type: 'select', span: 2, options: [['', '— Ninguna —'], ...cos.flatMap(c => people.filter(p => p.companyId === c.id).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(p => [p.id, `${p.name} · ${c.name}`]))] },
    { name: 'active', label: 'Cuenta activa', type: 'checkbox' }, { name: 'demo', label: 'Mostrar como cuenta demo en el login', type: 'checkbox' }
  ];
  el.innerHTML = `${pageHead('Usuarios y roles', 'Quién puede entrar y qué puede hacer.', '<button class="btn btn-primary" data-act="new">＋ Nuevo usuario</button>')}
    <div class="grid-4">${Object.entries(auth.roles).map(([k, v]) => `<div class="card"><b>${escape(v)}</b> <span class="badge">${rows.filter(r => r.role === k).length}</span><p class="muted small" style="margin:6px 0 0">${PERMS[k]}</p></div>`).join('')}</div>
    <div data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    key: 'usuarios', rows, sort: 'name', search: r => `${r.name} ${r.email} ${r.roleName} ${r.personName}`,
    filters: [{ key: 'role', label: 'Rol', options: Object.entries(auth.roles), test: (r, v) => r.role === v }, { key: 'act', label: 'Estado', options: [['1', 'Activos'], ['0', 'Inactivos']], test: (r, v) => (r.active !== false) === (v === '1') }],
    columns: [
      { key: 'name', label: 'Usuario', render: r => `<span class="cell-person">${avatar(r, 32)}<span><b>${escape(r.name)}</b><small>${escape(r.email)}</small></span></span>` },
      { key: 'role', label: 'Rol', render: r => `<select class="select select-sm" data-role="${r.id}" aria-label="Rol de ${escape(r.name)}" ${r.id === ctx.user.id ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>${Object.entries(auth.roles).map(([k, v]) => `<option value="${k}" ${k === r.role ? 'selected' : ''}>${escape(v)}</option>`).join('')}</select>` },
      { key: 'personName', label: 'Persona', render: r => r.personName ? escape(r.personName) : '<span class="muted">—</span>' },
      { key: 'last', label: 'Último acceso', render: r => r.last ? escape(ago(r.last)) : '<span class="muted">nunca</span>' },
      { key: 'active', label: 'Activo', render: r => `<label class="switch"><input type="checkbox" data-active="${r.id}" ${r.active !== false ? 'checked' : ''} ${r.id === ctx.user.id ? 'disabled' : ''} aria-label="Cuenta activa"><span></span></label>` },
      { key: 'a', label: '', sort: false, render: r => `<div class="acts">${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${r.id !== ctx.user.id ? actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar') : ''}</div>` }
    ],
    csv: { filename: 'usuarios.csv', map: r => ({ nombre: r.name, correo: r.email, rol: r.roleName, persona: r.personName, activo: r.active !== false ? 'sí' : 'no' }) }
  });
  const box = el.querySelector('[data-t]');
  box.addEventListener('change', e => {
    const r = e.target.closest('[data-role]'), a = e.target.closest('[data-active]');
    if (r) { const u = db.get('users', r.dataset.role); db.update('users', u.id, { role: r.value }); db.log('usuario', `Cambió el rol de ${u.name} a ${auth.roleName(r.value)}`, ctx.user.id); toast(`${u.name} ahora es ${auth.roleName(r.value)}`, 'success'); }
    if (a) { const u = db.get('users', a.dataset.active); db.update('users', u.id, { active: a.checked }); db.log('usuario', `${a.checked ? 'Activó' : 'Desactivó'} la cuenta de ${u.name}`, ctx.user.id); toast(a.checked ? 'Cuenta activada' : 'Cuenta desactivada: ya no podrá ingresar', a.checked ? 'success' : 'warning'); }
  });
  const unique = (email, id) => db.find('users', u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id) ? 'Ya existe un usuario con ese correo' : null;
  onActs(el, {
    new: async () => {
      const v = await formDialog({ title: 'Nuevo usuario', fields: fields(), values: { role: 'empleado', active: true, demo: false }, validate: v => unique(v.email) || (v.password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : null) });
      if (!v) return;
      const p = people.find(x => x.id === v.personId);
      db.insert('users', { ...v, personId: v.personId || null, companyId: p?.companyId || null, color: '#4f46e5' });
      db.log('usuario', `Creó el usuario ${v.name} (${auth.roleName(v.role)})`, ctx.user.id);
      toast('Usuario creado', 'success');
    },
    edit: async id => {
      const u = db.get('users', id);
      const v = await formDialog({ title: `Editar ${u.name}`, fields: fields(u), values: { ...u, password: '' }, validate: v => unique(v.email, id) || (v.password && v.password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : null) || (id === ctx.user.id && (v.role !== u.role || !v.active) ? 'No puedes quitarte el rol de administrador ni desactivarte' : null) });
      if (!v) return;
      const p = people.find(x => x.id === v.personId);
      const patch = { ...v, personId: v.personId || null, companyId: p?.companyId || null };
      if (!v.password) delete patch.password;
      db.update('users', id, patch);
      db.log('usuario', `Editó el usuario ${v.name}`, ctx.user.id);
      toast('Usuario actualizado', 'success');
    },
    del: id => { const u = db.get('users', id); confirmDelete(`el usuario ${u.name}`, () => db.remove('users', id), { db, user: ctx.user, log: `Eliminó el usuario ${u.name}` }); }
  });
}
