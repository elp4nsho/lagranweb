// Clientes y freelancers: búsqueda, verificación de identidad, suspensión y ficha con métricas.
import { escape, money, date, toast, confirm as ask, downloadCSV, formModal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, avatar } from '../shared/kit.js';
import { freelancerStats, levelOf, levelBadge, stars, balanceOf, ORDER_STATUS, statusBadge, category } from '../shared/market.js';

export function render(el, { db, me, go }) {
  const canEdit = ['admin', 'moderador'].includes(me.role);
  const rows = db.query('users', u => ['cliente', 'freelancer'].includes(u.role)).map(u => {
    if (u.role === 'freelancer') { const s = freelancerStats(u.id); return { ...u, n: s.done, spend: s.earnings, rating: s.rating, level: levelOf(u.id).level, status: u.active !== false ? 'activo' : 'suspendido' }; }
    const os = db.query('orders', o => o.clientId === u.id && o.status !== 'cancelado');
    return { ...u, n: os.length, spend: os.reduce((a, o) => a + o.total, 0), rating: 0, level: '', status: u.active !== false ? 'activo' : 'suspendido' };
  });
  el.innerHTML = `${pageHead('Clientes y freelancers', `${rows.filter(r => r.role === 'freelancer').length} freelancers · ${rows.filter(r => r.role === 'cliente').length} clientes`, '<button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button>')}<div class="card" data-t></div>`;
  const t = smartTable(el.querySelector('[data-t]'), {
    id: 'members', rows, pageSize: 12, search: r => r.name + r.email + (r.company || '') + (r.title || ''),
    filters: [{ key: 'role', label: 'Tipo', options: [['freelancer', 'Freelancers'], ['cliente', 'Clientes']] }, { key: 'verified', label: 'Verificación', options: [['1', 'Verificados'], ['0', 'Sin verificar']], test: (r, v) => String(r.verified ? 1 : 0) === v }, { key: 'status', label: 'Estado', options: [['activo', 'Activos'], ['suspendido', 'Suspendidos']] }],
    columns: [
      { key: 'name', label: 'Usuario', render: r => `<div class="cell-user">${avatar(r, 32)}<span><b>${escape(r.name)}</b><small>${escape(r.email)}</small></span></div>` },
      { key: 'role', label: 'Tipo', render: r => r.role === 'freelancer' ? `${badge('Freelancer', 'primary')} ${r.level !== 'nuevo' ? levelBadge(r.level) : ''}` : `${badge('Cliente', 'info')}<div class="small muted">${escape(r.company || '')}</div>` },
      { key: 'n', label: 'Pedidos' },
      { key: 'spend', label: 'Facturado / gastado', render: r => money(r.spend) },
      { key: 'verified', label: 'Identidad', render: r => r.verified ? badge('Verificada', 'success') : badge('Pendiente', 'warning') },
      { key: 'status', label: 'Estado', render: r => r.status === 'activo' ? badge('Activo', 'success') : badge('Suspendido', 'danger') },
      { key: 'x', label: '', sort: false, render: r => canEdit ? `<div class="actions">${r.verified ? '' : '<button class="btn btn-sm btn-ghost" data-act="verify">Verificar</button>'}<button class="btn btn-sm btn-ghost" data-act="toggle">${r.status === 'activo' ? 'Suspender' : 'Reactivar'}</button></div>` : '' }
    ],
    onRow: r => go('/usuarios/' + r.id),
    onAction: async (act, r) => {
      if (act === 'verify') { db.update('users', r.id, { verified: true }); db.log('usuarios', `Identidad verificada: ${r.name}`, me.id); return toast(`${r.name} verificado/a`, 'success'); }
      if (r.status === 'activo') {
        const v = await formModal({ title: `Suspender a ${r.name}`, fields: [{ name: 'reason', label: 'Motivo (queda en bitácora)', type: 'select', options: ['Incumplimiento de términos', 'Fraude o pagos fuera de la plataforma', 'Contenido inapropiado', 'Solicitud del usuario'] }], submit: 'Suspender' });
        if (!v) return;
        db.update('users', r.id, { active: false, suspendedReason: v.reason }); db.log('usuarios', `Cuenta suspendida: ${r.name} (${v.reason})`, me.id); toast('Cuenta suspendida', 'warning');
      } else { db.update('users', r.id, { active: true, suspendedReason: '' }); db.log('usuarios', `Cuenta reactivada: ${r.name}`, me.id); toast('Cuenta reactivada', 'success'); }
    }
  });
  el.querySelector('[data-csv]').onclick = () => downloadCSV('usuarios-marketplace.csv', t.filtered().map(r => ({ nombre: r.name, correo: r.email, tipo: r.role, pedidos: r.n, monto: r.spend, verificado: r.verified ? 'sí' : 'no', estado: r.status })));
}

export function detail(el, { db, me }, id) {
  const u = db.get('users', id);
  if (!u || !['cliente', 'freelancer'].includes(u.role)) { el.innerHTML = '<div class="empty">Usuario no encontrado</div>'; return; }
  const isF = u.role === 'freelancer';
  const orders = db.query('orders', o => (isF ? o.freelancerId : o.clientId) === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const s = isF ? freelancerStats(id) : null, bal = isF ? balanceOf(id) : null;
  el.innerHTML = `
    ${pageHead(u.name, `${escape(u.email)} · ${isF ? escape(u.title || '') : escape(u.company || 'Cliente')} · miembro desde ${date(u.createdAt)}`, `<a class="btn btn-ghost btn-sm" href="#/usuarios">← Volver</a>${isF ? `<a class="btn btn-sm" href="index.html#/freelancer/${u.id}" target="_blank">Perfil público ↗</a>` : ''}`)}
    ${u.active === false ? `<div class="notice danger">Cuenta suspendida${u.suspendedReason ? ': ' + escape(u.suspendedReason) : ''}.</div>` : ''}
    <div class="kpi-row">${isF ? `<div class="card stat"><span class="label">Nivel</span><span class="value" style="font-size:20px">${levelBadge(levelOf(id).level)}</span></div><div class="card stat"><span class="label">Valoración</span><span class="value" style="font-size:20px">${stars(s.rating, s.reviews)}</span></div><div class="card stat"><span class="label">Disponible</span><span class="value">${money(bal.available)}</span></div><div class="card stat"><span class="label">A tiempo</span><span class="value">${Math.round(s.onTime * 100)}%</span></div>` : `<div class="card stat"><span class="label">Pedidos</span><span class="value">${orders.length}</span></div><div class="card stat"><span class="label">Gasto total</span><span class="value">${money(orders.filter(o => o.status !== 'cancelado').reduce((a, o) => a + o.total, 0))}</span></div><div class="card stat"><span class="label">Proyectos publicados</span><span class="value">${db.count('briefs', b => b.clientId === id)}</span></div>`}</div>
    <div class="card"><h3>Pedidos</h3><div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Servicio</th><th>Categoría</th><th>Precio</th><th>Estado</th></tr></thead><tbody>${orders.slice(0, 20).map(o => `<tr><td>${['admin', 'soporte'].includes(me.role) ? `<a href="#/pedidos/${o.id}">${escape(o.code)}</a>` : escape(o.code)}</td><td class="small">${escape(o.title)}</td><td class="small">${escape(category(o.categoryId).name)}</td><td>${money(o.price)}</td><td>${statusBadge(ORDER_STATUS, o.status)}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sin pedidos</div></td></tr>'}</tbody></table></div></div>`;
  void ask;
}
