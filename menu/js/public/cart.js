// Carrito del comensal (por mesa, guardado en el navegador del cliente).
import { db } from '../data/db.js';
import { dishById } from '../shared/logic.js';

const listeners = new Set();
let key = 'lgw:menu:cart:none';
let lines = [];

function persist() { try { localStorage.setItem(key, JSON.stringify(lines)); } catch (e) { /* sin storage */ } listeners.forEach(fn => fn()); }

export const cart = {
  init(table) {
    key = `lgw:menu:cart:${table || 'none'}`;
    try { lines = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { lines = []; }
    lines = lines.filter(l => dishById(l.dishId));
  },
  lines: () => lines.slice(),
  count: () => lines.reduce((s, l) => s + l.qty, 0),
  total: () => lines.reduce((s, l) => s + l.price * l.qty, 0),
  qtyOf: dishId => lines.filter(l => l.dishId === dishId).reduce((s, l) => s + l.qty, 0),
  add(line) {
    const same = lines.find(l => l.dishId === line.dishId && l.sig === line.sig && l.note === line.note);
    if (same) same.qty += line.qty; else lines.push({ ...line, key: Math.random().toString(36).slice(2, 9) });
    persist();
  },
  setQty(k, qty) { const l = lines.find(x => x.key === k); if (!l) return; l.qty = qty; if (qty <= 0) lines = lines.filter(x => x !== l); persist(); },
  clear() { lines = []; persist(); },
  // Quita platos que pasaron a agotados
  prune() {
    const before = lines.length;
    lines = lines.filter(l => dishById(l.dishId)?.available !== false);
    if (lines.length !== before) persist();
    return before - lines.length;
  },
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
};

db.subscribe(() => cart.prune());
