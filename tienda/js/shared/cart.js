// Carrito y favoritos del visitante. El carrito vive en el navegador (por visitante);
// precios, nombres y stock se leen siempre de la DB, así un cambio en el panel se refleja al tiro.
import { db, auth, variantBySku, totals } from '../data/db.js';

const KEY = 'raiz:cart', WKEY = 'raiz:wish';
const listeners = new Set();
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } };
let state = read(KEY, { lines: [], coupon: '', shippingId: 'std' });
const emit = () => { write(KEY, state); listeners.forEach(fn => fn()); };
window.addEventListener('storage', e => { if (e.key === KEY) { state = read(KEY, state); listeners.forEach(fn => fn()); } });

export const cart = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  raw: () => state,
  // Líneas resueltas contra la DB (descarta productos borrados o variantes que ya no existen).
  lines() {
    return state.lines.map(l => {
      const p = db.get('products', l.productId);
      const v = p && variantBySku(p, l.sku);
      if (!p || !v || p.status !== 'activo') return null;
      return { ...l, product: p, name: p.name, price: p.price, size: v.size, color: v.color, stock: v.stock, qty: l.qty, short: l.qty > v.stock };
    }).filter(Boolean);
  },
  count() { return this.lines().reduce((s, l) => s + l.qty, 0); },
  totals() { return totals(this.lines(), { couponCode: state.coupon, shippingId: state.shippingId }); },
  add(productId, sku, qty = 1) {
    const p = db.get('products', productId), v = p && variantBySku(p, sku);
    if (!v) return { ok: false, msg: 'Variante no disponible' };
    const ex = state.lines.find(l => l.sku === sku);
    const have = ex ? ex.qty : 0;
    if (have + qty > v.stock) return { ok: false, msg: v.stock ? `Solo quedan ${v.stock} unidades` : 'Sin stock en esta variante' };
    ex ? (ex.qty += qty) : state.lines.push({ productId, sku, qty });
    emit();
    return { ok: true };
  },
  setQty(sku, qty) {
    const l = state.lines.find(x => x.sku === sku);
    if (!l) return { ok: false };
    const p = db.get('products', l.productId), v = p && variantBySku(p, sku);
    if (qty <= 0) { state.lines = state.lines.filter(x => x.sku !== sku); emit(); return { ok: true }; }
    if (v && qty > v.stock) { l.qty = v.stock; emit(); return { ok: false, msg: `Stock máximo: ${v.stock}` }; }
    l.qty = qty; emit();
    return { ok: true };
  },
  remove(sku) { state.lines = state.lines.filter(x => x.sku !== sku); emit(); },
  setCoupon(code) { state.coupon = (code || '').trim().toUpperCase(); emit(); },
  setShipping(id) { state.shippingId = id; emit(); },
  clear() { state = { lines: [], coupon: '', shippingId: state.shippingId || 'std' }; emit(); }
};

export const wishlist = {
  ids() {
    const u = auth.current();
    return u && u.role === 'customer' ? (u.wishlist || []) : read(WKEY, []);
  },
  has(id) { return this.ids().includes(id); },
  toggle(id) {
    const ids = this.ids();
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    const u = auth.current();
    if (u && u.role === 'customer') db.update('users', u.id, { wishlist: next });
    else { write(WKEY, next); listeners.forEach(fn => fn()); }
    return next.includes(id);
  }
};
