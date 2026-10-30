// Venta en curso (por caja). Persiste en el navegador para sobrevivir a recargas.
import { db } from '../data/db.js';

const listeners = new Set();
let key = 'pampa:cart';
let st = blank();
function blank() { return { lines: [], customerId: null, discount: 0 }; }
const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) { /* sin storage */ } listeners.forEach(fn => fn()); };

export const cart = {
  use(registerId) { key = 'pampa:cart:' + registerId; try { st = JSON.parse(localStorage.getItem(key)) || blank(); } catch (e) { st = blank(); } listeners.forEach(fn => fn()); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  get state() { return st; },
  get lines() { return st.lines; },
  isEmpty() { return !st.lines.length; },
  add(p, qty = 1) {
    const l = st.lines.find(x => x.productId === p.id && !x.discount);
    if (l) l.qty += qty; else st.lines.push({ productId: p.id, name: p.name, price: p.price, cost: p.cost, qty, discount: 0 });
    save();
  },
  setQty(i, qty) { if (qty <= 0) st.lines.splice(i, 1); else st.lines[i].qty = qty; save(); },
  remove(i) { st.lines.splice(i, 1); save(); },
  setLineDiscount(i, pct) { st.lines[i].discount = pct; save(); },
  setDiscount(pct) { st.discount = pct; save(); },
  setCustomer(id) { st.customerId = id; save(); },
  load(s) { st = { ...blank(), ...JSON.parse(JSON.stringify(s)) }; save(); },
  clear() { st = blank(); save(); },
  totals() {
    const gross = st.lines.reduce((s, l) => s + l.price * l.qty, 0);
    const net = st.lines.reduce((s, l) => s + Math.round(l.price * l.qty * (1 - (l.discount || 0) / 100)), 0);
    // Ley de redondeo: el total se ajusta a la decena más cercana.
    const total = Math.round((net - Math.round(net * (st.discount || 0) / 100)) / 10) * 10;
    const orderDisc = net - total;
    const iva = Math.round(total - total / 1.19);
    return { gross, lineDisc: gross - net, orderDisc, discount: gross - total, total, iva, units: st.lines.reduce((s, l) => s + l.qty, 0) };
  },
  customer() { return st.customerId ? db.get('customers', st.customerId) : null; }
};
