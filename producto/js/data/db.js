// "Backend" de Aquilo: DB compartida entre la landing, el checkout, el seguimiento y el panel.
import { createDB, uid } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('producto', { version: 4, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', marketing: 'Marketing', soporte: 'Soporte' } });

export const STAFF = ['admin', 'marketing', 'soporte'];

export const STATUS = {
  pagado: { label: 'Pagado', type: 'info' },
  preparando: { label: 'Preparando', type: 'warning' },
  enviado: { label: 'Enviado', type: 'primary' },
  entregado: { label: 'Entregado', type: 'success' },
  cancelado: { label: 'Cancelado', type: 'danger' },
  reembolsado: { label: 'Reembolsado', type: 'danger' }
};
export const FLOW = ['pagado', 'preparando', 'enviado', 'entregado'];
export const NEXT = { pagado: 'preparando', preparando: 'enviado', enviado: 'entregado' };

export const landing = () => db.getValue('landing');
export const shop = () => db.getValue('shop');
export const abtest = () => db.getValue('abtest');
export const colors = () => db.all('colors').sort((a, b) => a.order - b.order);
export const colorByKey = k => db.find('colors', c => c.key === k);
export const bundles = (all = false) => db.all('bundles').filter(b => all || b.active).sort((a, b) => a.order - b.order);
export const approvedReviews = () => db.query('reviews', r => r.status === 'aprobada').sort((a, b) => (b.featured - a.featured) || b.createdAt.localeCompare(a.createdAt));
export const isSold = o => !['cancelado', 'reembolsado'].includes(o.status);
export const today = () => new Date().toISOString().slice(0, 10);

export function rating() {
  const list = approvedReviews();
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, c: list.filter(r => r.rating === n).length }));
  return { avg, count: list.length, dist };
}

// ---------- Cupones ----------
export function checkCoupon(code, subtotal) {
  const c = db.find('coupons', x => x.code.toUpperCase() === String(code || '').trim().toUpperCase());
  if (!c) return { ok: false, msg: 'Cupón no existe' };
  if (!c.active) return { ok: false, msg: 'Cupón inactivo' };
  if (c.expires && c.expires < today()) return { ok: false, msg: 'Cupón vencido' };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, msg: 'Cupón agotado' };
  const discount = c.type === 'pct' ? Math.round(subtotal * c.value / 100) : Math.min(c.value, subtotal);
  return { ok: true, coupon: c, discount, msg: c.type === 'pct' ? `${c.value}% de descuento` : `$${c.value.toLocaleString('es-CL')} de descuento` };
}

// ---------- Tráfico simulado ----------
function bumpTraffic(field, n = 1) {
  const key = today();
  const row = db.find('traffic', t => t.date === key);
  if (row) db.update('traffic', row.id, { [field]: (row[field] || 0) + n });
  else db.insert('traffic', { id: 't' + key, date: key, visits: field === 'visits' ? n : 0, checkouts: field === 'checkouts' ? n : 0 });
}
const once = (k, fn) => { try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { /* sin storage */ } fn(); };
export const trackVisit = () => once('aquilo:visit', () => bumpTraffic('visits'));
export const trackCheckout = () => once('aquilo:checkout-start', () => bumpTraffic('checkouts'));
export const addTraffic = (visits, checkouts) => { bumpTraffic('visits', visits); bumpTraffic('checkouts', checkouts); };

// ---------- Afiliados (?ref=CODE) ----------
const REF_KEY = 'aquilo:ref';
export function captureRef() {
  const code = new URLSearchParams(location.search).get('ref');
  if (code) {
    const a = db.find('affiliates', x => x.code.toUpperCase() === code.toUpperCase() && x.status === 'activo');
    if (a) {
      try { localStorage.setItem(REF_KEY, JSON.stringify({ code: a.code, until: Date.now() + 30 * 864e5 })); } catch (e) { /* */ }
      once('aquilo:refclick:' + a.code, () => db.update('affiliates', a.id, { clicks: (a.clicks || 0) + 1 }));
    }
  }
  return currentRef();
}
export function currentRef() {
  try {
    const v = JSON.parse(localStorage.getItem(REF_KEY));
    if (!v || v.until < Date.now()) return null;
    return db.find('affiliates', x => x.code === v.code && x.status === 'activo');
  } catch (e) { return null; }
}
export function affiliateStats(a) {
  const orders = db.query('orders', o => o.ref === a.code && isSold(o));
  const revenue = orders.reduce((s, o) => s + o.total - o.shipping, 0);
  const earned = orders.reduce((s, o) => s + Math.round((o.total - o.shipping) * a.commission / 100), 0);
  const paid = db.query('payouts', p => p.affiliateId === a.id && p.status === 'pagado').reduce((s, p) => s + p.amount, 0);
  return { orders: orders.length, revenue, earned, paid, balance: earned - paid, conv: a.clicks ? orders.length / a.clicks * 100 : 0 };
}

// ---------- Prueba A/B ----------
const abCache = {};
export function abVariant() {
  const t = abtest();
  if (!t || t.status !== 'activo') return null;
  const key = 'aquilo:ab:' + t.id;
  let v = abCache[key];
  if (!v) try { v = localStorage.getItem(key); } catch (e) { /* */ }
  if (v !== 'A' && v !== 'B') {
    v = Math.random() * 100 < t.split ? 'A' : 'B';
    abCache[key] = v;
    try { localStorage.setItem(key, v); } catch (e) { /* */ }
    const stats = structuredClone(t.stats);
    stats[v].visitors++;
    db.setValue('abtest', { ...t, stats });
  }
  return v;
}
export function heroCopy() {
  const L = landing(), t = abtest();
  const v = abVariant();
  if (v && t.variants[v]) return { headline: t.variants[v].headline, subheadline: t.variants[v].subheadline, variant: v };
  return { headline: L.headline, subheadline: L.subheadline, variant: '' };
}
export function abConversion(v) {
  const t = abtest();
  if (!v || !t || t.status !== 'activo') return;
  const stats = structuredClone(t.stats);
  stats[v].conversions++;
  db.setValue('abtest', { ...t, stats });
}

// ---------- Pedidos ----------
export function nextOrderNumber() {
  const max = db.all('orders').reduce((m, o) => Math.max(m, +o.number.slice(3) || 0), 10000);
  return 'AQ-' + (max + 1);
}
export function adjustStock(items, sign = -1) {
  const count = {};
  items.forEach(k => { count[k] = (count[k] || 0) + 1; });
  Object.entries(count).forEach(([k, n]) => {
    const c = colorByKey(k);
    if (c) db.update('colors', c.id, { stock: Math.max(0, c.stock + sign * n), sold: Math.max(0, (c.sold || 0) - sign * n) });
  });
}
export function setOrderStatus(order, status, note = '', user = null) {
  const prev = order.status;
  const history = [...order.history, { status, at: new Date().toISOString(), note: note || STATUS[status].label }];
  const patch = { status, history };
  if (status === 'enviado' && !order.tracking) { patch.carrier = shop().carrier; patch.tracking = 'RS' + Math.floor(1e7 + Math.random() * 9e7); }
  db.update('orders', order.id, patch);
  if (['cancelado', 'reembolsado'].includes(status) && isSold({ status: prev })) adjustStock(order.items, +1);
  db.log('Pedido actualizado', `${order.number}: ${STATUS[prev].label} → ${STATUS[status].label}`, user);
}
export function sendEmail(to, subject, automation = '') {
  db.insert('emails', { id: uid('e'), to, subject, automation, status: 'enviado' });
}
