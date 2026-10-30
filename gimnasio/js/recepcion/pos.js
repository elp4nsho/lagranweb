// Punto de venta de la tienda de recepción.
import { escape, money, toast, norm, time as fmtTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { member, memberByCode, activeBranches } from '../shared/domain.js';
import { pageHead, statCard } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

const cart = new Map();
let cat = '', q = '';
export function renderPOS(v, _, __, { user }) {
  const products = db.query('products', p => p.active !== false);
  const cats = [...new Set(products.map(p => p.category))];
  const todaySales = db.query('sales', s => ymd(new Date(s.at)) === ymd());
  v.innerHTML = `${pageHead('Tienda (POS)', 'Venta rápida de bebidas, suplementos y accesorios.')}
  <div class="grid-3">${statCard('Ventas hoy', money(todaySales.reduce((s, x) => s + x.total, 0)), `<span class="muted small">${todaySales.length} boletas</span>`, 'cart')}${statCard('Productos', products.length, `<span class="muted small">${products.filter(p => p.stock <= 5).length} con stock bajo</span>`, 'tag')}${statCard('Ticket promedio', money(todaySales.length ? todaySales.reduce((s, x) => s + x.total, 0) / todaySales.length : 0), '', 'money')}</div>
  <div class="pos">
    <div class="stack">
      <div class="list-toolbar"><label class="search-box">${icon('search', 16)}<input class="input" type="search" data-q value="${escape(q)}" placeholder="Buscar producto o SKU…" aria-label="Buscar producto"></label>
        <button class="chip ${!cat ? 'active' : ''}" data-cat="">Todo</button>${cats.map(c => `<button class="chip ${cat === c ? 'active' : ''}" data-cat="${escape(c)}">${escape(c)}</button>`).join('')}</div>
      <div class="grid-auto" data-prods style="grid-template-columns:repeat(auto-fill,minmax(min(170px,100%),1fr))"></div>
    </div>
    <div class="card stack summary"><h3 class="mb0">${icon('cart', 18)} Venta actual</h3><div data-cart></div>
      <div class="field"><label for="pos-m">Socio (opcional)</label><input class="input" id="pos-m" list="pos-ml" placeholder="Código TF-…"><datalist id="pos-ml">${db.query('members', m => m.status !== 'baja').map(m => `<option value="${m.code}">${escape(m.name)}</option>`).join('')}</datalist></div>
      <div class="field"><label for="pos-pay">Medio de pago</label><select class="select" id="pos-pay"><option>Tarjeta débito</option><option>Tarjeta crédito</option><option>Efectivo</option><option>Transferencia</option></select></div>
      <button class="btn btn-primary btn-lg" data-charge>${icon('check', 18)} Cobrar</button>
      <h4 class="mb0" style="font-family:var(--font-body);font-size:13px;color:var(--muted);letter-spacing:0;text-transform:none">Últimas ventas</h4>
      <div class="small">${todaySales.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map(s => `<div class="row between" style="flex-wrap:nowrap"><span>${fmtTime(s.at)} · ${s.items.length} ítem(s)</span><b>${money(s.total)}</b></div>`).join('') || '<span class="muted">Sin ventas hoy</span>'}</div>
    </div>
  </div>`;
  const prodBox = v.querySelector('[data-prods]'), cartBox = v.querySelector('[data-cart]');
  const drawProds = () => {
    prodBox.innerHTML = products.filter(p => (!cat || p.category === cat) && (!q || norm(p.name + ' ' + p.sku).includes(norm(q)))).map(p => { const inCart = cart.get(p.id) || 0; return `<button class="prod" data-p="${p.id}" ${p.stock - inCart <= 0 ? 'disabled' : ''}><span class="muted small">${escape(p.category)} · ${p.sku}</span><b>${escape(p.name)}</b><span class="row between" style="gap:6px"><b>${money(p.price)}</b><span class="badge ${p.stock <= 5 ? 'badge-warning' : 'plain'}">${p.stock - inCart} un.</span></span></button>`; }).join('') || '<div class="empty">Sin productos</div>';
  };
  const drawCart = () => {
    const lines = [...cart.entries()].map(([id, qty]) => ({ p: db.get('products', id), qty }));
    const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    cartBox.innerHTML = lines.length ? lines.map(l => `<div class="cart-line"><span>${escape(l.p.name)}<br><small class="muted">${money(l.p.price)} c/u</small></span><span class="qty"><button class="btn btn-sm" data-dec="${l.p.id}" aria-label="Quitar uno">−</button><b>${l.qty}</b><button class="btn btn-sm" data-inc="${l.p.id}" aria-label="Agregar uno">+</button></span><b>${money(l.p.price * l.qty)}</b></div>`).join('') + `<div class="row between" style="margin-top:10px"><span>Total</span><b style="font-size:24px" data-total>${money(total)}</b></div>` : '<p class="muted mb0">Toca un producto para agregarlo.</p>';
  };
  const add = (id, d) => { const p = db.get('products', id), n = (cart.get(id) || 0) + d; if (n > p.stock) return toast('Sin stock suficiente', 'warning'); n <= 0 ? cart.delete(id) : cart.set(id, n); drawProds(); drawCart(); };
  prodBox.onclick = e => { const b = e.target.closest('[data-p]'); if (b) add(b.dataset.p, 1); };
  cartBox.onclick = e => { const b = e.target.closest('[data-inc],[data-dec]'); if (b) add(b.dataset.inc || b.dataset.dec, b.dataset.inc ? 1 : -1); };
  v.querySelector('[data-q]').oninput = e => { q = e.target.value; drawProds(); };
  v.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; v.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('active', x === b)); drawProds(); });
  v.querySelector('[data-charge]').onclick = () => {
    if (!cart.size) return toast('El carrito está vacío', 'warning');
    const items = [...cart.entries()].map(([id, qty]) => { const p = db.get('products', id); return { productId: id, name: p.name, qty, price: p.price }; });
    const total = items.reduce((s, x) => s + x.qty * x.price, 0);
    const mc = v.querySelector('#pos-m').value.trim(), m = mc ? memberByCode(mc) : null;
    items.forEach(it => db.update('products', it.productId, p => ({ stock: p.stock - it.qty })));
    db.insert('sales', { items, total, method: v.querySelector('#pos-pay').value, branchId: user.branchId || activeBranches()[0].id, memberId: m?.id || '', at: new Date().toISOString(), cashier: user.id });
    db.log('venta', `${items.map(i => `${i.qty}× ${i.name}`).join(', ')} · ${money(total)}`, user.id);
    cart.clear(); toast(`Venta registrada: ${money(total)}`, 'success');
    renderPOS(v, _, __, { user });
  };
  drawProds(); drawCart();
}
