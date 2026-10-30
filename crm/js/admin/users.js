// Usuarios: alta, edición, cambio de rol, equipo, desactivación con traspaso de cartera.
import { db, auth, ROLE_IDS } from '../data/db.js';
import { escape, date, ago, toast, confirm, dataTable, modal } from '../../../assets/core/ui.js';
import { pageHead, openForm, field, opt } from '../app/components.js';
import { avatar, exportCSV, isEmail } from '../shared/util.js';
import { OPEN_STAGES } from '../shared/constants.js';
import { notify } from '../shared/automation.js';
import { icon } from '../shared/icons.js';

const state = { role: '', status: 'activos' };
const COLORS = ['#e11d48', '#2563eb', '#ca8a04', '#059669', '#7c3aed', '#0f766e', '#c2410c', '#db2777', '#4f46e5', '#64748b'];

export function render(view, { user }) {
  const teams = db.all('teams');
  const rows = db.query('users', u => (!state.role || u.role === state.role) && (state.status === 'todos' || (state.status === 'activos' ? u.active !== false : u.active === false)))
    .map(u => ({ ...u, roleName: auth.roleName(u.role), team: teams.find(t => t.id === u.teamId)?.name || '—', deals: db.count('deals', d => d.ownerId === u.id && OPEN_STAGES.includes(d.stage)), status: u.active === false ? 0 : 1 }));
  view.innerHTML = `
    ${pageHead('Usuarios', `${db.count('users', u => u.active !== false)} activos de ${db.count('users')}`, `<button class="btn" data-export>${icon('upload', 16)} CSV</button><button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo usuario</button>`)}
    <div class="card stack">
      <div class="row filters">
        ${[['', 'Todos los roles'], ...ROLE_IDS.map(r => [r, auth.roleName(r)])].map(([k, l]) => `<button class="chip ${state.role === k ? 'active' : ''}" data-role="${k}">${l}</button>`).join('')}
        <select class="select select-sm" data-status aria-label="Estado" style="margin-left:auto">${[['activos', 'Activos'], ['inactivos', 'Desactivados'], ['todos', 'Todos']].map(([k, l]) => opt(k, l, state.status)).join('')}</select>
      </div>
      <div data-table></div>
    </div>`;
  dataTable(view.querySelector('[data-table]'), {
    rows, pageSize: 10, search: u => `${u.name} ${u.email} ${u.roleName} ${u.team}`,
    columns: [
      { key: 'name', label: 'Usuario', render: u => `<span class="user-chip">${avatar(u, 32)}<span><b>${escape(u.name)}</b>${u.id === user.id ? ' <span class="badge badge-primary plain">tú</span>' : ''}<br><small class="muted">${escape(u.email)}</small></span></span>` },
      { key: 'roleName', label: 'Rol', render: u => `<select class="select select-sm" data-setrole="${u.id}" aria-label="Rol de ${escape(u.name)}" ${u.id === user.id ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>${ROLE_IDS.map(r => opt(r, auth.roleName(r), u.role)).join('')}</select>` },
      { key: 'team', label: 'Equipo' },
      { key: 'deals', label: 'Negocios abiertos' },
      { key: 'status', label: 'Estado', render: u => u.active === false ? '<span class="badge badge-danger">Desactivado</span>' : '<span class="badge badge-success">Activo</span>' },
      { key: 'id', label: '', sort: false, render: u => `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-sm" data-edit="${u.id}" aria-label="Editar ${escape(u.name)}">${icon('edit', 14)}</button>${u.id === user.id ? '' : `<button class="btn btn-sm ${u.active === false ? '' : 'btn-ghost'}" data-toggle="${u.id}">${u.active === false ? 'Reactivar' : 'Desactivar'}</button>`}</span>` }
    ]
  });
  view.querySelectorAll('[data-role]').forEach(b => b.onclick = () => { state.role = b.dataset.role; render(view, { user }); });
  view.querySelector('[data-status]').onchange = e => { state.status = e.target.value; render(view, { user }); };
  view.querySelector('[data-new]').onclick = () => userModal();
  view.querySelector('[data-export]').onclick = () => exportCSV('usuarios.csv', rows.map(u => ({ nombre: u.name, correo: u.email, rol: u.roleName, equipo: u.team, estado: u.active === false ? 'desactivado' : 'activo', creado: date(u.createdAt) })));
  const tbl = view.querySelector('[data-table]');
  tbl.addEventListener('change', async e => {
    const s = e.target.closest('[data-setrole]');
    if (!s) return;
    const u = db.get('users', s.dataset.setrole);
    if (u.role === 'admin' && db.count('users', x => x.role === 'admin' && x.active !== false) <= 1) { toast('Debe quedar al menos un administrador activo', 'warning'); s.value = u.role; return; }
    if (!await confirm(`¿Cambiar el rol de ${u.name} a ${auth.roleName(s.value)}?`, { ok: 'Cambiar rol' })) { s.value = u.role; return; }
    db.update('users', u.id, { role: s.value });
    db.log('usuarios', `Cambió el rol de ${u.name} a ${auth.roleName(s.value)}`, user.id);
    notify(u.id, `Tu rol ahora es ${auth.roleName(s.value)}`, 'app.html#/');
    toast('Rol actualizado', 'success');
  });
  tbl.addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), tg = e.target.closest('[data-toggle]');
    if (ed) userModal(db.get('users', ed.dataset.edit));
    if (tg) toggleActive(db.get('users', tg.dataset.toggle), user);
  });
}

function toggleActive(u, me) {
  if (u.active === false) {
    db.update('users', u.id, { active: true });
    db.log('usuarios', `Reactivó a ${u.name}`, me.id);
    return toast(`${u.name} reactivado`, 'success');
  }
  if (u.role === 'admin' && db.count('users', x => x.role === 'admin' && x.active !== false) <= 1) return toast('Debe quedar al menos un administrador activo', 'warning');
  const open = db.query('deals', d => d.ownerId === u.id && OPEN_STAGES.includes(d.stage));
  const others = db.query('users', x => x.id !== u.id && x.active !== false && x.role !== 'admin');
  const m = modal({
    title: `Desactivar a ${u.name}`,
    body: `<div class="stack"><p>No podrá iniciar sesión. Su historial se conserva.</p>${open.length ? `<div class="field"><label for="to">Traspasar sus ${open.length} negocios abiertos y leads a</label><select class="select" id="to">${others.map(x => opt(x.id, x.name)).join('')}</select></div>` : ''}</div>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" data-ok>Desactivar</button>'
  });
  m.el.querySelector('[data-ok]').onclick = () => {
    const to = m.el.querySelector('#to')?.value;
    if (to) {
      open.forEach(d => db.update('deals', d.id, { ownerId: to }));
      db.query('leads', l => l.ownerId === u.id && !['convertido', 'descartado'].includes(l.status)).forEach(l => db.update('leads', l.id, { ownerId: to }));
      db.query('activities', a => a.ownerId === u.id && !a.done).forEach(a => db.update('activities', a.id, { ownerId: to }));
      notify(to, `Recibiste la cartera de ${u.name} (${open.length} negocios)`, 'app.html#/negocios');
    }
    db.update('users', u.id, { active: false });
    db.log('usuarios', `Desactivó a ${u.name}${to ? ` y traspasó su cartera a ${db.get('users', to).name}` : ''}`, me.id);
    toast(`${u.name} desactivado`, 'success');
    m.close();
  };
}

function userModal(u = null) {
  const me = auth.current();
  const teams = db.all('teams');
  openForm({
    title: u ? 'Editar usuario' : 'Nuevo usuario',
    body: `<div class="grid-2">
      ${field('Nombre completo *', `<input class="input" name="name" value="${escape(u?.name || '')}" required>`)}
      ${field('Correo *', `<input class="input" type="email" name="email" value="${escape(u?.email || '')}" required>`)}
      ${field('Cargo', `<input class="input" name="title" value="${escape(u?.title || '')}">`)}
      ${field(u ? 'Nueva contraseña (opcional)' : 'Contraseña *', `<input class="input" name="password" type="text" value="${u ? '' : 'demo123'}" ${u ? '' : 'required'} autocomplete="new-password">`)}
      ${field('Rol', `<select class="select" name="role" ${u?.id === me.id ? 'disabled' : ''}>${ROLE_IDS.map(r => opt(r, auth.roleName(r), u?.role || 'ejecutivo')).join('')}</select>`)}
      ${field('Equipo', `<select class="select" name="teamId"><option value="">Sin equipo</option>${teams.map(t => opt(t.id, t.name, u?.teamId)).join('')}</select>`)}
    </div>
    <div class="field"><label>Color del avatar</label><div class="row color-row">${COLORS.map((c, i) => `<label class="color-pick"><input type="radio" name="color" value="${c}" ${(u?.color || COLORS[0]) === c || (!u && i === 0) ? 'checked' : ''}><span style="--av:${c}" class="avatar" aria-label="Color ${i + 1}"></span></label>`).join('')}</div></div>
    <label class="check"><input type="checkbox" name="demo" ${u?.demo ? 'checked' : ''}> Mostrar como acceso rápido en la pantalla de login</label>`,
    onSubmit: (f, v) => {
      if (!isEmail(v.email)) { toast('Correo no válido', 'warning'); return false; }
      if (db.find('users', x => x.email.toLowerCase() === v.email.trim().toLowerCase() && x.id !== u?.id)) { toast('Ese correo ya está en uso', 'warning'); return false; }
      const patch = { name: v.name.trim(), email: v.email.trim().toLowerCase(), title: v.title.trim(), teamId: v.teamId || null, color: v.color, demo: !!v.demo };
      if (u?.id !== me.id && v.role) patch.role = v.role;
      if (v.password) patch.password = v.password;
      if (u) { db.update('users', u.id, patch); db.log('usuarios', `Editó a ${patch.name}`, me.id); toast('Usuario actualizado', 'success'); }
      else { db.insert('users', { ...patch, active: true }); db.log('usuarios', `Creó a ${patch.name} (${auth.roleName(patch.role)})`, me.id); toast(`Usuario creado. Clave: ${v.password}`, 'success', 5000); }
    }
  });
}
