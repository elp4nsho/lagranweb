// Tienda de repuestos y accesorios: catálogo con filtros, carrito (navegador) y checkout con pago simulado.
import { money, escape, toast, debounce, norm, sleep } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { settings, cartGet, cartSet, nextCode } from '../shared/domain.js';

export function addToCart(id, qty = 1) {
  const p = db.get('products', id); if (!p) return;
  const cart = cartGet(), line = cart.find(x => x.id === id), have = line?.qty || 0;
  if (have + qty > p.stock) { toast(`Solo quedan ${p.stock} unidades`, 'warning'); return; }
  cartSet(line ? cart.map(x => x.id === id ? { ...x, qty: x.qty + qty } : x) : [...cart, { id, qty }]);
  toast(`${p.name} agregado al carrito`, 'success', 1600);
}
export function renderStore(el, _p, q = {}) {
  const S = { cat: q.cat || '', q: '' };
  const cats = [...new Set(db.query('products', p => p.active).map(p => p.cat))];
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Tienda</span><h1 style="margin:0">Repuestos y accesorios</h1><p class="lead">Despacho a todo Chile (${money(settings().shipping)}, gratis sobre ${money(settings().freeShippingOver)}) o retiro gratis en sucursal.</p></div><a class="btn btn-primary btn-sm" href="#/carrito">🛒 Ver carrito</a></div>
    <div class="row"><input class="input" type="search" placeholder="Buscar producto…" aria-label="Buscar producto" style="max-width:280px" data-q><span class="row" style="gap:6px"><button class="chip ${!S.cat ? 'active' : ''}" data-cat="">Todo</button>${cats.map(c => `<button class="chip ${S.cat === c ? 'active' : ''}" data-cat="${escape(c)}">${escape(c)}</button>`).join('')}</span></div>
    <div class="grid-auto prod-grid" data-list></div></div></section>`;
  const paint = () => {
    const list = db.query('products', p => p.active && (!S.cat || p.cat === S.cat) && (!S.q || norm(p.name + ' ' + p.compat).includes(norm(S.q))));
    el.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('active', b.dataset.cat === S.cat));
    el.querySelector('[data-list]').innerHTML = list.map(p => `<article class="card hover prod-card"><span class="prod-ico" aria-hidden="true">${p.icon}</span><small class="muted">${escape(p.cat)}</small><b>${escape(p.name)}</b><span class="muted small">Compatible: ${escape(p.compat)}</span>
      <div class="foot"><span><b class="price">${money(p.price)}</b><small class="d-block ${p.stock ? 'muted' : ''}" ${p.stock ? '' : 'style="color:var(--danger)"'}>${p.stock ? p.stock + ' en stock' : 'Agotado'}</small></span><button class="btn btn-sm btn-primary" data-add="${p.id}" ${p.stock ? '' : 'disabled'}>Agregar</button></div></article>`).join('') || '<div class="card empty">Sin productos.</div>';
  };
  el.addEventListener('click', e => { const c = e.target.closest('[data-cat]'); if (c) { S.cat = c.dataset.cat; paint(); } const a = e.target.closest('[data-add]'); if (a) addToCart(a.dataset.add); });
  el.querySelector('[data-q]').addEventListener('input', debounce(e => { S.q = e.target.value; paint(); }, 150));
  paint();
  return { refresh: paint };
}

export function renderCart(el) {
  const st = settings(), u = auth.current(), me = u?.role === 'cliente' ? u : null;
  let delivery = 'despacho';
  const paint = () => {
    const lines = cartGet().map(l => ({ ...l, p: db.get('products', l.id) })).filter(l => l.p);
    const sub = lines.reduce((a, l) => a + l.qty * l.p.price, 0), ship = delivery === 'despacho' && sub < st.freeShippingOver ? st.shipping : 0;
    const branches = db.query('branches', b => b.active);
    el.innerHTML = `<section class="section"><div class="container stack"><div><span class="eyebrow">Tienda</span><h1 style="margin:0">Carrito</h1></div>
      ${lines.length ? `<div class="book-grid"><div class="stack"><div class="card">${lines.map(l => `<div class="cart-line"><span class="prod-ico" aria-hidden="true">${l.p.icon}</span><span><b>${escape(l.p.name)}</b><small class="muted d-block">${money(l.p.price)} c/u</small></span>
          <span class="qty"><button class="btn btn-sm btn-icon" data-dec="${l.id}" aria-label="Quitar uno">−</button><b>${l.qty}</b><button class="btn btn-sm btn-icon" data-inc="${l.id}" aria-label="Agregar uno">+</button></span><b>${money(l.qty * l.p.price)}</b></div>`).join('')}</div>
        <form class="card stack" id="co" novalidate><h3 style="margin:0">Entrega y pago</h3>
          <div class="opt-grid"><label class="opt"><input type="radio" name="delivery" value="despacho" ${delivery === 'despacho' ? 'checked' : ''}><span><b>🚚 Despacho a domicilio</b><small>${sub >= st.freeShippingOver ? 'Gratis' : money(st.shipping)} · 2 a 4 días hábiles</small></span></label><label class="opt"><input type="radio" name="delivery" value="retiro" ${delivery === 'retiro' ? 'checked' : ''}><span><b>🏢 Retiro en sucursal</b><small>Gratis · listo en 24 h</small></span></label></div>
          <div class="grid-2"><div class="field"><label for="co-n">Nombre</label><input class="input" id="co-n" name="name" value="${escape(me?.name || '')}"></div><div class="field"><label for="co-e">Correo</label><input class="input" id="co-e" type="email" name="email" value="${escape(me?.email || '')}"></div>
            <div class="field"><label for="co-p">Teléfono</label><input class="input" id="co-p" type="tel" name="phone" value="${escape(me?.phone || '')}"></div>
            ${delivery === 'despacho' ? `<div class="field"><label for="co-a">Dirección</label><input class="input" id="co-a" name="address" autocomplete="street-address"></div><div class="field"><label for="co-c">Comuna</label><input class="input" id="co-c" name="comuna"></div>` : `<div class="field"><label for="co-b">Sucursal</label><select class="select" id="co-b" name="branch">${branches.map(b => `<option value="${b.id}">${escape(b.name)}</option>`).join('')}</select></div>`}</div>
          <div class="field"><label for="co-cc">Número de la tarjeta</label><input class="input" id="co-cc" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242"></div>
          <div class="grid-2"><div class="field"><label for="co-x">Vencimiento (MM/AA)</label><input class="input" id="co-x" name="exp" placeholder="12/29"></div><div class="field"><label for="co-v">CVV</label><input class="input" id="co-v" name="cvv" maxlength="4" inputmode="numeric"></div></div>
          <button class="btn btn-primary btn-lg">Pagar ${money(sub + ship)}</button></form></div>
        <aside class="card stack book-summary"><h3 style="margin:0">Resumen</h3><ul class="lines small"><li><span>Subtotal</span><b>${money(sub)}</b></li><li><span>Despacho</span><b>${ship ? money(ship) : 'Gratis'}</b></li></ul><div class="total-row"><span>Total</span><b>${money(sub + ship)}</b></div>${sub < st.freeShippingOver && delivery === 'despacho' ? `<small class="muted">Agrega ${money(st.freeShippingOver - sub)} más para despacho gratis.</small>` : ''}<small class="muted">🔒 Pago simulado.</small></aside></div>`
      : '<div class="card empty stack"><span style="font-size:40px">🛒</span>Tu carrito está vacío.<a class="btn btn-primary" href="#/tienda">Ir a la tienda</a></div>'}</div></section>`;
  };
  el.addEventListener('click', e => {
    const d = e.target.closest('[data-dec]'), i = e.target.closest('[data-inc]');
    if (d) { cartSet(cartGet().map(x => x.id === d.dataset.dec ? { ...x, qty: x.qty - 1 } : x).filter(x => x.qty > 0)); paint(); }
    if (i) { addToCart(i.dataset.inc); paint(); }
  });
  el.addEventListener('change', e => { if (e.target.name === 'delivery') { delivery = e.target.value; paint(); } });
  el.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f));
    if (v.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(v.email) || v.phone.replace(/\D/g, '').length < 8) { toast('Completa nombre, correo y teléfono', 'warning'); return; }
    if (delivery === 'despacho' && ((v.address || '').trim().length < 5 || !(v.comuna || '').trim())) { toast('Indica dirección y comuna', 'warning'); return; }
    if (v.card.replace(/\D/g, '').length < 15 || !/^\d{2}\/\d{2}$/.test(v.exp.trim()) || !/^\d{3,4}$/.test(v.cvv)) { toast('Revisa los datos de la tarjeta', 'warning'); return; }
    const lines = cartGet().map(l => ({ ...l, p: db.get('products', l.id) })).filter(l => l.p);
    const short = lines.find(l => l.qty > l.p.stock); if (short) { toast(`Sin stock suficiente de ${short.p.name}`, 'warning'); return; }
    const btn = f.querySelector('button.btn-primary'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando…';
    await sleep(700);
    const sub = lines.reduce((a, l) => a + l.qty * l.p.price, 0), ship = delivery === 'despacho' && sub < st.freeShippingOver ? st.shipping : 0;
    const o = db.insert('orders', { code: nextCode('orders', 'PD-', 7000), userId: me?.id || null, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), address: v.address || '', comuna: v.comuna || '', delivery, branchId: v.branch || null, shipping: ship, items: lines.map(l => ({ productId: l.id, name: l.p.name, qty: l.qty, price: l.p.price })), subtotal: sub, total: sub + ship, status: 'pagado', card: v.card.replace(/\D/g, '').slice(-4) });
    lines.forEach(l => db.update('products', l.id, { stock: l.p.stock - l.qty }));
    db.log('tienda', `Pedido ${o.code} pagado: ${money(o.total)} (${lines.length} producto/s)`, u?.id || null);
    cartSet([]);
    el.innerHTML = `<section class="section"><div class="container narrow"><div class="card stack success-hero"><span class="big-ico">📦</span><h1 style="margin:0">¡Gracias por tu compra!</h1><p class="lead">Pedido <b class="mono">${o.code}</b> por ${money(o.total)}. ${delivery === 'despacho' ? 'Te avisaremos cuando salga a despacho.' : 'Te avisaremos cuando esté listo para retiro.'}</p><div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/tienda">Seguir comprando</a>${me ? '<a class="btn" href="#/cuenta?tab=orders">Mis pedidos</a>' : ''}</div></div></div></section>`;
    toast('Pago aprobado', 'success');
  });
  paint();
  return { live: false };
}
