// Base de datos y autenticación compartidas por la tienda y el panel.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('tienda', { version: 6, seed });
export const auth = createAuth(db, {
  roles: { admin: 'Administrador', manager: 'Gestor de tienda', warehouse: 'Bodega', customer: 'Cliente' }
});

export const STAFF = ['admin', 'manager', 'warehouse'];

// Qué secciones del panel ve cada rol (se usa para el menú y para proteger rutas).
export const PERMS = {
  admin: ['dashboard', 'products', 'categories', 'orders', 'customers', 'coupons', 'inventory', 'reviews', 'content', 'settings', 'users', 'activity'],
  manager: ['dashboard', 'products', 'categories', 'orders', 'customers', 'coupons', 'inventory', 'reviews', 'content'],
  warehouse: ['orders', 'inventory']
};
export const can = (section, user = auth.current()) => !!user && (PERMS[user.role] || []).includes(section);

export const settings = () => db.getValue('settings', {});
export function saveSettings(patch) {
  const s = { ...settings(), ...patch };
  db.setValue('settings', s);
  return s;
}

// ---------- Estados de pedido ----------
export const ORDER_FLOW = ['pagado', 'preparando', 'enviado', 'entregado'];
export const ORDER_STATUS = {
  pendiente: { label: 'Pago pendiente', badge: 'warning' },
  pagado: { label: 'Pagado', badge: 'info' },
  preparando: { label: 'Preparando', badge: 'primary' },
  enviado: { label: 'Enviado', badge: 'info' },
  entregado: { label: 'Entregado', badge: 'success' },
  cancelado: { label: 'Cancelado', badge: 'danger' },
  reembolsado: { label: 'Reembolsado', badge: 'danger' }
};
export const statusBadge = s => `<span class="badge badge-${(ORDER_STATUS[s] || {}).badge || 'info'}">${(ORDER_STATUS[s] || { label: s }).label}</span>`;
export function nextStatus(s) {
  if (s === 'pendiente') return 'pagado';
  const i = ORDER_FLOW.indexOf(s);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
}

// ---------- Productos ----------
export const category = id => db.get('categories', id);
export const productStock = p => p.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
export const findVariant = (p, size, color) => p.variants.find(v => v.size === size && v.color === color) || null;
export const variantBySku = (p, sku) => p.variants.find(v => v.sku === sku) || null;
export function productRating(p) {
  const rv = db.query('reviews', r => r.productId === p.id && r.status === 'aprobada');
  return { count: rv.length, avg: rv.length ? rv.reduce((s, r) => s + r.rating, 0) / rv.length : 0 };
}
export const isVisible = p => p.status === 'activo' && (category(p.categoryId)?.active !== false);
export const colorHex = (p, name) => (p.colors.find(c => c.name === name) || p.colors[0] || {}).hex;

// ---------- Cupones y totales ----------
export function findCoupon(code) {
  if (!code) return null;
  return db.find('coupons', c => c.code.toUpperCase() === String(code).trim().toUpperCase());
}
export function checkCoupon(c, subtotal) {
  if (!c) return 'Cupón no existe';
  if (!c.active) return 'Este cupón no está activo';
  if (c.expiresAt && new Date(c.expiresAt + 'T23:59:59') < new Date()) return 'Este cupón expiró';
  if (c.usageLimit && c.used >= c.usageLimit) return 'Este cupón alcanzó su límite de usos';
  if (c.minTotal && subtotal < c.minTotal) return `Compra mínima de ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(c.minTotal)}`;
  return '';
}
export function totals(lines, { couponCode = '', shippingId = 'std' } = {}) {
  const s = settings();
  const subtotal = lines.reduce((t, l) => t + l.price * l.qty, 0);
  const coupon = findCoupon(couponCode);
  const couponError = couponCode ? checkCoupon(coupon, subtotal) : '';
  let discount = 0, freeShipCoupon = false;
  if (coupon && !couponError) {
    if (coupon.type === 'percent') discount = Math.round(subtotal * coupon.value / 100);
    else if (coupon.type === 'fixed') discount = Math.min(subtotal, coupon.value);
    else if (coupon.type === 'shipping') freeShipCoupon = true;
  }
  const rates = s.shipping?.rates || [];
  const rate = rates.find(r => r.id === shippingId) || rates[0] || { id: 'std', name: 'Despacho', price: 0 };
  const threshold = s.shipping?.freeThreshold || 0;
  const free = freeShipCoupon || (threshold > 0 && subtotal - discount >= threshold);
  const shipping = lines.length ? (free ? 0 : rate.price) : 0;
  const total = Math.max(0, subtotal - discount + shipping);
  return { subtotal, discount, shipping, total, rate, free, coupon: couponError ? null : coupon, couponError, threshold, missing: Math.max(0, threshold - (subtotal - discount)), iva: Math.round(total - total / 1.19) };
}

// ---------- Pedidos ----------
export function placeOrder({ user, customer, address, lines, couponCode, shippingId, payment }) {
  const t = totals(lines, { couponCode, shippingId });
  const number = db.getValue('orderSeq', 2000);
  db.setValue('orderSeq', number + 1);
  const status = payment === 'transferencia' ? 'pendiente' : 'pagado';
  const at = new Date().toISOString();
  const history = [{ status: 'pendiente', at, note: 'Pedido recibido' }];
  if (status === 'pagado') history.push({ status: 'pagado', at, note: 'Pago con tarjeta aprobado' });
  const order = db.insert('orders', {
    id: 'o-' + number, number, userId: user?.id || null, customer, address: t.rate.id === 'pickup' ? null : address,
    items: lines.map(l => ({ productId: l.productId, name: l.name, sku: l.sku, size: l.size, color: l.color, price: l.price, qty: l.qty })),
    subtotal: t.subtotal, discount: t.discount, couponCode: t.coupon ? t.coupon.code : '', shipping: t.shipping,
    shippingMethod: t.rate.name, shippingId: t.rate.id, total: t.total, payment, status, history, tracking: '', refunded: 0, notes: []
  });
  // Descuenta stock por variante y suma vendidos.
  lines.forEach(l => db.update('products', l.productId, p => {
    const v = variantBySku(p, l.sku);
    if (v) v.stock = Math.max(0, v.stock - l.qty);
    return { variants: p.variants, sold: (p.sold || 0) + l.qty };
  }));
  if (t.coupon) db.update('coupons', t.coupon.id, c => ({ used: (c.used || 0) + 1 }));
  db.log('pedido', `Nuevo pedido #${number} de ${customer.name} por ${new Intl.NumberFormat('es-CL').format(t.total)}`, user?.id || null);
  return order;
}

export function setOrderStatus(order, status, { note = '', by = auth.current() } = {}) {
  const history = [...(order.history || []), { status, at: new Date().toISOString(), note, by: by?.name }];
  const patch = { status, history };
  if (status === 'enviado' && !order.tracking) patch.tracking = 'STK' + Math.floor(10000000 + Math.random() * 89999999);
  db.update('orders', order.id, patch);
  db.log('pedido', `Pedido #${order.number} → ${ORDER_STATUS[status].label}${note ? ' (' + note + ')' : ''}`, by?.id);
}

export function restockOrder(order) {
  order.items.forEach(l => db.update('products', l.productId, p => {
    const v = variantBySku(p, l.sku);
    if (v) v.stock += l.qty;
    return { variants: p.variants, sold: Math.max(0, (p.sold || 0) - l.qty) };
  }));
}

export const orderNo = o => '#' + o.number;
