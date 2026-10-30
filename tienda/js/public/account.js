// Mi cuenta: resumen, pedidos con seguimiento, direcciones, favoritos y perfil.
import { html, raw, money, date, toast, formModal, confirm } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, statusBadge } from '../data/db.js';
import { wishlist } from '../shared/cart.js';
import { productCard, emptyState } from './parts.js';
import { trackBar, timeline, orderItems, orderSummary } from './orders.js';

const TABS = [['', 'Resumen'], ['pedidos', 'Mis pedidos'], ['direcciones', 'Direcciones'], ['favoritos', 'Favoritos'], ['perfil', 'Perfil']];

export function renderAccount(view, tab = '', sub = '') {
  const u = auth.current();
  if (!u || u.role !== 'customer') {
    view.innerHTML = html`<section class="section"><div class="container" style="max-width:560px">${raw(emptyState('👤', u ? 'Esta sección es para clientes' : 'Inicia sesión', u ? 'Estás conectado con una cuenta del equipo. Entra al panel o cierra sesión para usar una cuenta de cliente.' : 'Accede a tus pedidos, direcciones y favoritos.',
      u ? '<a class="btn btn-primary" href="admin.html">Ir al panel</a>' : `<div class="row" style="justify-content:center"><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/cuenta')}">Iniciar sesión</a><a class="btn" href="login.html?tab=registro&next=${encodeURIComponent('index.html#/cuenta')}">Crear cuenta</a></div>`))}</div></section>`;
    return;
  }
  const orders = db.query('orders', o => o.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let body = '';
  if (tab === 'pedidos' && sub) body = orderDetail(orders.find(o => o.id === sub));
  else if (tab === 'pedidos') body = ordersList(orders);
  else if (tab === 'direcciones') body = addresses(u);
  else if (tab === 'favoritos') body = favorites();
  else if (tab === 'perfil') body = profile(u);
  else body = summary(u, orders);

  view.innerHTML = html`<section class="section tight"><div class="container">
    <div class="row" style="margin-bottom:22px"><span class="avatar" style="--av:${u.color || 'var(--primary)'};--size:52px">${initials(u.name)}</span><div><h1 style="margin:0;font-size:clamp(24px,3vw,34px)">Hola, ${u.name.split(' ')[0]}</h1><small class="muted">Cliente desde ${date(u.createdAt, { month: 'long', year: 'numeric' })}</small></div></div>
    <div class="account">
      <nav class="account-nav card">${TABS.map(([k, l]) => raw(`<a href="#/cuenta${k ? '/' + k : ''}" class="${tab === k ? 'active' : ''}">${l}</a>`))}<a href="#" data-logout>Cerrar sesión</a></nav>
      <div class="stack">${raw(body)}</div>
    </div>
  </div></section>`;

  view.addEventListener('click', async e => {
    if (e.target.closest('[data-logout]')) { e.preventDefault(); auth.logout(); location.hash = '#/'; toast('Sesión cerrada', 'info'); return; }
    const ed = e.target.closest('[data-addr-edit]'), del = e.target.closest('[data-addr-del]'), def = e.target.closest('[data-addr-def]');
    if (e.target.closest('[data-addr-new]') || ed) {
      const a = ed ? (u.addresses || []).find(x => x.id === ed.dataset.addrEdit) : {};
      const v = await formModal({ title: ed ? 'Editar dirección' : 'Nueva dirección', fields: [
        { name: 'label', label: 'Nombre (ej: Casa)', value: a.label || '', required: true },
        { name: 'name', label: 'Recibe', value: a.name || u.name, required: true },
        { name: 'street', label: 'Calle y número', value: a.street || '', required: true },
        { name: 'comuna', label: 'Comuna', value: a.comuna || '', required: true },
        { name: 'region', label: 'Región', value: a.region || 'Metropolitana', required: true },
        { name: 'phone', label: 'Teléfono', value: a.phone || u.phone || '' }
      ] });
      if (!v) return;
      const list = (u.addresses || []).slice();
      if (ed) Object.assign(list.find(x => x.id === a.id), v);
      else list.push({ id: 'a' + Date.now().toString(36), ...v, isDefault: !list.length });
      db.update('users', u.id, { addresses: list });
      toast('Dirección guardada', 'success');
    }
    if (del && await confirm('¿Eliminar esta dirección?', { danger: true, ok: 'Eliminar' })) {
      const list = (u.addresses || []).filter(x => x.id !== del.dataset.addrDel);
      if (list.length && !list.some(x => x.isDefault)) list[0].isDefault = true;
      db.update('users', u.id, { addresses: list });
      toast('Dirección eliminada', 'info');
    }
    if (def) {
      db.update('users', u.id, { addresses: (u.addresses || []).map(x => ({ ...x, isDefault: x.id === def.dataset.addrDef })) });
      toast('Dirección predeterminada actualizada', 'success');
    }
  });
  view.querySelector('#profile-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    if (!d.name.trim()) return toast('El nombre es obligatorio', 'warning');
    const patch = { name: d.name.trim(), phone: d.phone.trim(), newsletter: !!d.newsletter };
    if (d.password) {
      if (d.current !== u.password) return toast('La contraseña actual no es correcta', 'error');
      if (d.password.length < 6) return toast('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
      patch.password = d.password;
    }
    db.update('users', u.id, patch);
    db.log('cuenta', `${patch.name} actualizó su perfil`, u.id);
    toast('Perfil actualizado', 'success');
  });
}

function summary(u, orders) {
  const spent = orders.filter(o => !['cancelado', 'reembolsado'].includes(o.status)).reduce((s, o) => s + o.total, 0);
  const active = orders.filter(o => ['pendiente', 'pagado', 'preparando', 'enviado'].includes(o.status));
  return html`<div class="grid-3">
      <div class="card stat"><span class="label">Pedidos</span><span class="value">${orders.length}</span></div>
      <div class="card stat"><span class="label">Total comprado</span><span class="value">${money(spent)}</span></div>
      <div class="card stat"><span class="label">Favoritos</span><span class="value">${wishlist.ids().length}</span></div>
    </div>
    <div class="card stack"><div class="card-head"><h3>Pedidos en curso</h3><a href="#/cuenta/pedidos" class="small">Ver todos</a></div>
      ${active.length ? active.map(o => raw(html`<a class="card" style="box-shadow:none;color:var(--text)" href="#/cuenta/pedidos/${o.id}"><div class="row between"><b>#${o.number}</b>${raw(statusBadge(o.status))}</div><small class="muted">${date(o.createdAt)} · ${o.items.length} producto(s) · ${money(o.total)}</small><div style="margin-top:10px">${raw(trackBar(o))}</div></a>`)) : raw('<p class="muted">No tienes pedidos en curso.</p>')}
    </div>`;
}

function ordersList(orders) {
  if (!orders.length) return emptyState('📦', 'Aún no tienes pedidos', 'Cuando compres, aquí podrás seguir cada envío.', '<a class="btn btn-primary" href="#/catalogo">Ir al catálogo</a>');
  return html`<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th class="right">Total</th><th></th></tr></thead><tbody>
    ${orders.map(o => raw(html`<tr><td><b>#${o.number}</b><br><small class="muted">${o.items.reduce((s, i) => s + i.qty, 0)} unidad(es)</small></td><td>${date(o.createdAt)}</td><td>${raw(statusBadge(o.status))}</td><td class="right">${money(o.total)}</td><td class="actions"><a class="btn btn-sm" href="#/cuenta/pedidos/${o.id}">Ver</a></td></tr>`))}
  </tbody></table></div>`;
}

function orderDetail(o) {
  if (!o) return emptyState('📦', 'Pedido no encontrado', '', '<a class="btn" href="#/cuenta/pedidos">Volver</a>');
  return html`<a href="#/cuenta/pedidos" class="small">← Mis pedidos</a>
    <div class="row between"><h2 style="margin:0">Pedido #${o.number}</h2>${raw(statusBadge(o.status))}</div>
    <div class="card stack"><div class="card-head"><h3>Seguimiento</h3>${o.tracking ? raw(html`<span class="small">Courier: Starken · <b class="mono">${o.tracking}</b></span>`) : ''}</div>${raw(trackBar(o))}${raw(timeline(o))}</div>
    <div class="card stack"><h3 style="margin:0">Productos</h3>${raw(orderItems(o))}<hr style="margin:0">${raw(orderSummary(o))}</div>
    <div class="card"><dl class="kv"><dt>Despacho</dt><dd>${o.shippingMethod}</dd>${o.address ? raw(html`<dt>Dirección</dt><dd>${o.address.street}, ${o.address.comuna}, ${o.address.region}</dd>`) : ''}<dt>Pago</dt><dd>${o.payment === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}</dd></dl></div>`;
}

function addresses(u) {
  const list = u.addresses || [];
  return html`<div class="row between"><h2 style="margin:0">Mis direcciones</h2><button class="btn btn-primary" data-addr-new>+ Nueva dirección</button></div>
    ${list.length ? raw(html`<div class="grid-2">${list.map(a => raw(html`<div class="card stack" style="gap:6px"><div class="row between"><b>${a.label}</b>${a.isDefault ? raw('<span class="badge badge-success">Predeterminada</span>') : ''}</div><span>${a.name}</span><span class="muted">${a.street}<br>${a.comuna}, ${a.region}<br>${a.phone || ''}</span>
      <div class="row" style="gap:6px;margin-top:6px"><button class="btn btn-sm" data-addr-edit="${a.id}">Editar</button>${!a.isDefault ? raw(html`<button class="btn btn-sm btn-ghost" data-addr-def="${a.id}">Predeterminar</button>`) : ''}<button class="btn btn-sm btn-ghost" data-addr-del="${a.id}">Eliminar</button></div></div>`))}</div>`) : raw(emptyState('📍', 'Sin direcciones', 'Agrega una para comprar más rápido.'))}`;
}

function favorites() {
  const items = wishlist.ids().map(id => db.get('products', id)).filter(p => p && p.status === 'activo');
  return html`<h2 style="margin:0">Favoritos</h2>${items.length ? raw(`<div class="products">${items.map(productCard).join('')}</div>`) : raw(emptyState('♡', 'Sin favoritos', 'Toca el corazón en cualquier producto para guardarlo aquí.', '<a class="btn btn-primary" href="#/catalogo">Explorar</a>'))}`;
}

function profile(u) {
  return html`<form class="card stack" id="profile-form" style="max-width:560px"><h2 style="margin:0">Perfil</h2>
    <div class="field"><label for="pf-name">Nombre</label><input class="input" id="pf-name" name="name" value="${u.name}"></div>
    <div class="field"><label for="pf-email">Correo</label><input class="input" id="pf-email" value="${u.email}" disabled></div>
    <div class="field"><label for="pf-phone">Teléfono</label><input class="input" id="pf-phone" name="phone" value="${u.phone || ''}"></div>
    <label class="check"><input type="checkbox" name="newsletter" ${u.newsletter ? 'checked' : ''}> Quiero recibir novedades y ofertas</label>
    <h3 style="margin:8px 0 0">Cambiar contraseña</h3>
    <div class="form-grid"><div class="field"><label for="pf-cur">Contraseña actual</label><input class="input" id="pf-cur" name="current" type="password"></div><div class="field"><label for="pf-new">Nueva contraseña</label><input class="input" id="pf-new" name="password" type="password"></div></div>
    <button class="btn btn-primary">Guardar cambios</button></form>`;
}
