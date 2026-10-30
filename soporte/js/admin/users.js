// Usuarios y roles: personal (admin, supervisor, agente) y clientes; crear, cambiar rol, desactivar.
import { db, auth, ROLE_IDS } from '../data/db.js';
import { escape, date, toast, confirm, dataTable } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { openForm, field, opt } from '../shared/forms.js';
import { avatar, isEmail, exportCSV } from '../shared/util.js';
import { PERM_LABELS, MATRIX_VIEW } from '../shared/perms.js';
import { isOpen, PLANS, COMMUNES } from '../shared/constants.js';
import { icon } from '../shared/icons.js';

const state = { role: 'staff' };
const COLORS = ['#e11d48', '#2563eb', '#ca8a04', '#059669', '#7c3aed', '#0f766e', '#c2410c', '#db2777', '#475569'];

export function render(view, { user }) {
  const rows = db.query('users', u => state.role === 'staff' ? u.role !== 'cliente' : state.role === 'todos' || u.role === state.role).map(u => ({ ...u, roleName: auth.roleName(u.role), status: u.active === false ? 0 : 1, groups: (u.groupIds || []).map(g => db.get('groups', g)?.name).filter(Boolean).join(', '), open: db.count('tickets', t => t.assigneeId === u.id && isOpen(t)) }));
  view.innerHTML = `${pageHead('Usuarios y roles', `${db.count('users', u => u.role !== 'cliente' && u.active !== false)} personas del equipo · ${db.count('users', u => u.role === 'cliente')} clientes`, `<button class="btn" data-export>${icon('upload', 16)} CSV</button><button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo usuario</button>`)}
    <div class="card stack"><div class="row filters">${[['staff', 'Equipo'], ...ROLE_IDS.map(r => [r, auth.roleName(r)]), ['todos', 'Todos']].map(([k, l]) => `<button class="chip ${state.role === k ? 'active' : ''}" data-r="${k}">${l}</button>`).join('')}</div><div data-table></div></div>
    <section class="card stack"><h3 style="margin:0">${icon('key', 18)} Permisos por rol</h3><div class="table-wrap"><table class="table perm-table"><thead><tr><th>Permiso</th>${ROLE_IDS.map(r => `<th class="center">${auth.roleName(r)}</th>`).join('')}</tr></thead><tbody>${Object.entries(PERM_LABELS).map(([k, l]) => `<tr><td>${escape(l)}</td>${ROLE_IDS.map(r => `<td class="center">${MATRIX_VIEW[k].includes(r) ? '<span class="ok">✓</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <small class="muted">Los permisos se aplican al menú y a cada ruta: una URL directa sin permiso muestra “Acceso restringido”. Los clientes solo acceden al portal.</small></section>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 12, search: u => `${u.name} ${u.email} ${u.roleName}`,
    columns: [
      { key: 'name', label: 'Usuario', render: u => `<span class="user-chip">${avatar(u, 30)}<span><b>${escape(u.name)}</b>${u.id === user.id ? ' <span class="badge badge-primary plain">tú</span>' : ''}<br><small class="muted">${escape(u.email)}</small></span></span>` },
      { key: 'roleName', label: 'Rol', render: u => `<select class="select select-sm" data-role="${u.id}" ${u.id === user.id ? 'disabled' : ''} aria-label="Rol de ${escape(u.name)}">${ROLE_IDS.map(r => opt(r, auth.roleName(r), u.role)).join('')}</select>` },
      { key: 'groups', label: 'Grupos', render: u => escape(u.groups || (u.role === 'cliente' ? u.plan || '' : '—')) },
      { key: 'open', label: 'Tickets abiertos' },
      { key: 'status', label: 'Estado', render: u => u.active === false ? '<span class="badge badge-danger">Desactivado</span>' : '<span class="badge badge-success">Activo</span>' },
      { key: 'id', label: '', sort: false, render: u => `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm" data-edit="${u.id}" aria-label="Editar">${icon('edit', 14)}</button>${u.id === user.id ? '' : `<button class="btn btn-sm btn-ghost" data-toggle="${u.id}">${u.active === false ? 'Reactivar' : 'Desactivar'}</button>`}</span>` }
    ]
  });
  view.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { state.role = b.dataset.r; render(view, { user }); });
  view.querySelector('[data-new]').onclick = () => userModal(null, user);
  view.querySelector('[data-export]').onclick = () => exportCSV('usuarios.csv', rows.map(u => ({ nombre: u.name, correo: u.email, rol: u.roleName, grupos: u.groups, estado: u.active === false ? 'desactivado' : 'activo', creado: date(u.createdAt) })));
  const tbl = view.querySelector('[data-table]');
  tbl.addEventListener('change', async e => {
    const s = e.target.closest('[data-role]'); if (!s) return;
    const u = db.get('users', s.dataset.role);
    if (u.role === 'admin' && db.count('users', x => x.role === 'admin' && x.active !== false) <= 1) { s.value = u.role; return toast('Debe quedar al menos un administrador', 'warning'); }
    if (!await confirm(`¿Cambiar el rol de ${u.name} a ${auth.roleName(s.value)}?`, { ok: 'Cambiar' })) { s.value = u.role; return; }
    db.update('users', u.id, { role: s.value });
    db.log('usuarios', `Cambió el rol de ${u.name} a ${auth.roleName(s.value)}`, user.id);
    toast('Rol actualizado', 'success');
  });
  tbl.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'), tg = e.target.closest('[data-toggle]');
    if (ed) userModal(db.get('users', ed.dataset.edit), user);
    if (tg) {
      const u = db.get('users', tg.dataset.toggle);
      if (u.active !== false && u.role === 'admin' && db.count('users', x => x.role === 'admin' && x.active !== false) <= 1) return toast('Debe quedar al menos un administrador', 'warning');
      if (u.active !== false) {
        const open = db.query('tickets', t => t.assigneeId === u.id && isOpen(t));
        if (!await confirm(`¿Desactivar a ${u.name}? No podrá iniciar sesión.${open.length ? ` Sus ${open.length} tickets abiertos quedarán sin asignar.` : ''}`, { danger: true, ok: 'Desactivar' })) return;
        open.forEach(t => db.update('tickets', t.id, { assigneeId: null }));
      }
      db.update('users', u.id, { active: u.active === false });
      db.log('usuarios', `${u.active === false ? 'Reactivó' : 'Desactivó'} a ${u.name}`, user.id);
      toast(u.active === false ? 'Usuario reactivado' : 'Usuario desactivado', 'success');
    }
  });
}

function userModal(u, me) {
  const groups = db.all('groups');
  openForm({
    title: u ? 'Editar usuario' : 'Nuevo usuario', size: 'lg',
    body: `<div class="grid-2">${field('Nombre *', `<input class="input" name="name" value="${escape(u?.name || '')}" required>`)}${field('Correo *', `<input class="input" name="email" type="email" value="${escape(u?.email || '')}" required>`)}
      ${field('Rol', `<select class="select" name="role" ${u?.id === me.id ? 'disabled' : ''}>${ROLE_IDS.map(r => opt(r, auth.roleName(r), u?.role || 'agente')).join('')}</select>`)}${field(u ? 'Nueva contraseña (opcional)' : 'Contraseña *', `<input class="input" name="password" value="${u ? '' : 'demo123'}" ${u ? '' : 'required'} autocomplete="new-password">`)}
      ${field('Cargo (equipo) / Plan (cliente)', `<input class="input" name="title" value="${escape(u?.title || u?.plan || '')}" list="plans"><datalist id="plans">${PLANS.map(p => `<option value="${p}">`).join('')}</datalist>`)}${field('Comuna (clientes)', `<select class="select" name="commune"><option value="">—</option>${COMMUNES.map(c => opt(c, c, u?.commune)).join('')}</select>`)}</div>
      <div class="field"><label>Grupos (agentes)</label><div class="row">${groups.map(g => `<label class="check"><input type="checkbox" name="g-${g.id}" ${(u?.groupIds || []).includes(g.id) ? 'checked' : ''}> ${escape(g.name)}</label>`).join('')}</div></div>
      <div class="field"><label>Color</label><div class="row color-row">${COLORS.map((c, i) => `<label class="color-pick"><input type="radio" name="color" value="${c}" ${(u?.color || COLORS[0]) === c ? 'checked' : ''}><span class="avatar" style="--av:${c}" aria-label="Color ${i + 1}"></span></label>`).join('')}</div></div>`,
    onSubmit: (f, v) => {
      if (!isEmail(v.email)) { toast('Correo no válido', 'warning'); return false; }
      if (db.find('users', x => x.email.toLowerCase() === v.email.trim().toLowerCase() && x.id !== u?.id)) { toast('Ese correo ya está en uso', 'warning'); return false; }
      const role = u?.id === me.id ? u.role : v.role;
      const patch = { name: v.name.trim(), email: v.email.trim().toLowerCase(), role, color: v.color, groupIds: groups.filter(g => v['g-' + g.id]).map(g => g.id), commune: v.commune, ...(role === 'cliente' ? { plan: v.title } : { title: v.title }) };
      if (v.password) patch.password = v.password;
      if (u) db.update('users', u.id, patch); else db.insert('users', { ...patch, active: true });
      db.log('usuarios', `${u ? 'Editó' : 'Creó'} a ${patch.name} (${auth.roleName(role)})`, me.id);
      toast(u ? 'Usuario actualizado' : `Usuario creado · clave ${v.password}`, 'success');
    }
  });
}
