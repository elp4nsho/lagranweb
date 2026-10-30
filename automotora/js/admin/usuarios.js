// Usuarios, roles y matriz de permisos.
import { escape, toast, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, ROLES } from '../data/db.js';
import { pageHead } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { showroom } from '../shared/domain.js';
import { sw, log, del, opts, showroomOpts, me } from './kit.js';
import { icon } from '../shared/icons.js';

const MATRIX = [['Dashboard comercial', ['admin', 'gerente']], ['Modelos, precios y campañas', ['admin', 'gerente']], ['Inventario, leads, cotizaciones, ventas, entregas', ['admin', 'gerente']], ['Aprobar descuentos sobre margen', ['admin', 'gerente']], ['Solicitudes de crédito', ['admin', 'gerente', 'analista']], ['Productos y tasas', ['admin']], ['Taller: citas, OT, pautas, recalls, repuestos', ['admin', 'asesor']], ['Contenido del sitio (CMS)', ['admin', 'gerente']], ['Sucursales, usuarios, configuración, bitácora', ['admin']], ['App ventas (pipeline)', ['admin', 'gerente', 'vendedor']], ['App crédito', ['admin', 'gerente', 'analista']], ['App posventa', ['admin', 'asesor']], ['Cuenta de cliente', ['cliente']]];

export function renderUsers(v) {
  v.innerHTML = `${pageHead('Usuarios y roles', 'El rol define qué menús ve cada persona y qué rutas puede abrir (las demás muestran "Acceso restringido").', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nuevo usuario</button>`)}
  <div class="card" data-list></div>
  <div class="card"><h3>${icon('shield', 18)} Matriz de permisos</h3><div class="table-wrap"><table class="table perm-table"><thead><tr><th>Módulo</th>${Object.values(ROLES).map(r => `<th>${r}</th>`).join('')}</tr></thead><tbody>${MATRIX.map(([m, rs]) => `<tr><td>${m}</td>${Object.keys(ROLES).map(r => `<td>${rs.includes(r) ? `<span style="color:var(--success)">${icon('check', 16)}</span>` : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  const lv = listView(v.querySelector('[data-list]'), { rows: () => db.all('users'), search: u => u.name + u.email,
    filters: [{ key: 'role', label: 'Rol', options: Object.entries(ROLES) }],
    columns: [{ key: 'name', label: 'Usuario', render: u => ({ __raw: true, value: `<div class="cell-user"><span class="avatar" style="--size:32px;--av:${u.color || 'var(--primary)'}">${escape(initials(u.name))}</span><span><b>${escape(u.name)}</b><small>${escape(u.email)}</small></span></div>` }) },
      { key: 'role', label: 'Rol', render: u => ({ __raw: true, value: `<select class="select inline-edit" data-act-change="role" data-id="${u.id}" aria-label="Rol" style="max-width:190px" ${u.id === me().id ? 'disabled' : ''}>${opts(Object.entries(ROLES), u.role)}</select>` }) },
      { key: 'showroomId', label: 'Sucursal', render: u => escape(u.showroomId ? showroom(u.showroomId)?.city : '—') },
      { key: 'goal', label: 'Meta mensual', render: u => u.role === 'vendedor' ? `${u.goal || 8} u.` : '—' },
      { key: 'demo', label: 'Demo', render: u => u.demo ? '<span class="badge badge-info plain">demo</span>' : '' },
      { key: 'active', label: 'Activo', render: u => ({ __raw: true, value: u.id === me().id ? '<span class="muted small">tú</span>' : sw('active', u.id, u.active !== false, 'Activo') }) },
      { key: 'x', label: '', sort: false, render: u => ({ __raw: true, value: acts(actBtn('edit', u.id, 'edit', 'Editar'), u.id !== me().id ? actBtn('del', u.id, 'trash', 'Eliminar') : '') }) }],
    onRow: u => edit(u),
    onAction: async (a, id, el) => { const u = db.get('users', id); if (a === 'edit') edit(u); if (a === 'del') await del('users', id, u.name) && lv.refresh(); if (a === 'active') { db.update('users', id, { active: el.checked }); log('usuarios', `${u.name} ${el.checked ? 'activado' : 'desactivado'}`); toast(el.checked ? 'Usuario activado' : 'Usuario desactivado: ya no puede ingresar', 'success'); } if (a === 'role') { db.update('users', id, { role: el.value }); log('usuarios', `${u.name}: rol ${ROLES[el.value]}`); toast('Rol actualizado', 'success'); lv.refresh(); } },
    csv: { name: 'usuarios.csv', map: u => ({ nombre: u.name, email: u.email, rol: ROLES[u.role], sucursal: u.showroomId || '', activo: u.active !== false }) } });
  async function edit(u) {
    const r = await formModal({ title: u ? 'Editar usuario' : 'Nuevo usuario', fields: [{ name: 'name', label: 'Nombre', value: u?.name, required: true }, { name: 'email', label: 'Correo', type: 'email', value: u?.email, required: true }, { name: 'password', label: 'Contraseña', value: u?.password || 'autoplaza123', required: true }, { name: 'role', label: 'Rol', type: 'select', options: Object.entries(ROLES), value: u?.role || 'vendedor' }, { name: 'showroomId', label: 'Sucursal', type: 'select', options: [['', '—'], ...showroomOpts()], value: u?.showroomId || 'scl' }, { name: 'goal', label: 'Meta mensual (ejecutivos)', type: 'number', value: u?.goal || 8 }] });
    if (!r) return;
    if (!/\S+@\S+\.\S+/.test(r.email)) return toast('Correo inválido', 'warning');
    if (db.find('users', x => x.email.toLowerCase() === r.email.toLowerCase() && x.id !== u?.id)) return toast('Ese correo ya existe', 'warning');
    if (u?.id === me().id && r.role !== u.role) return toast('No puedes cambiar tu propio rol', 'warning');
    u ? db.update('users', u.id, r) : db.insert('users', { ...r, active: true, color: ['#0ea5e9', '#16a34a', '#ea580c', '#9333ea'][db.count('users') % 4], brands: [] });
    log('usuarios', `${u ? 'Editado' : 'Nuevo'} ${r.name} (${ROLES[r.role]})`); toast('Usuario guardado', 'success'); lv.refresh();
  }
  v.querySelector('[data-new]').onclick = () => edit(null);
}
export { auth };
