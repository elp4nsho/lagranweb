// Base de datos, autenticación y reglas de negocio compartidas por la caja y el back-office.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('pos', { version: 2, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', supervisor: 'Supervisor', cajero: 'Cajero', bodeguero: 'Bodeguero' } });

export const PERMS = {
  admin: ['dashboard', 'products', 'inventory', 'movements', 'purchases', 'suppliers', 'branches', 'employees', 'cash', 'customers', 'users', 'settings', 'activity'],
  supervisor: ['dashboard', 'products', 'inventory', 'movements', 'purchases', 'suppliers', 'employees', 'cash', 'customers'],
  bodeguero: ['products', 'inventory', 'movements', 'purchases', 'suppliers'],
  cajero: []
};
export const BACKOFFICE = ['admin', 'supervisor', 'bodeguero'];
export const POS_ROLES = ['admin', 'supervisor', 'cajero'];
export const can = (s, u = auth.current()) => !!u && (PERMS[u.role] || []).includes(s);
export const canEdit = (s, u = auth.current()) => !!u && (u.role === 'admin' || (u.role === 'supervisor' && s !== 'branches') || (u.role === 'bodeguero' && ['inventory', 'movements', 'purchases'].includes(s)));

export const settings = () => db.getValue('settings', {});
export const saveSettings = patch => db.setValue('settings', { ...settings(), ...patch });

export const METHODS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', puntos: 'Puntos' };
export const METHOD_ICON = { efectivo: '💵', tarjeta: '💳', transferencia: '🏦', puntos: '⭐' };

export const branch = id => db.get('branches', id);
export const branchName = id => branch(id)?.name || '—';
export const register = id => db.get('registers', id);
export const category = id => db.get('categories', id);
export const userName = id => db.get('users', id)?.name || '—';
export const stockAt = (p, b) => (p.stock || {})[b] ?? 0;
export const totalStock = p => Object.values(p.stock || {}).reduce((s, n) => s + n, 0);
export const margin = p => p.price ? (p.price / (1 + (settings().iva || 19) / 100) - p.cost) / (p.price / (1 + (settings().iva || 19) / 100)) * 100 : 0;
export const isLow = (p, b) => p.trackStock && stockAt(p, b) <= p.minStock;

export function tierOf(c) {
  const tiers = (settings().loyalty?.tiers || []).slice().sort((a, b) => b.min - a.min);
  return (tiers.find(t => (c?.pointsEarned || 0) >= t.min) || { name: 'Bronce' }).name;
}

// ---------- Ventas ----------
export function nextBoleta() { const n = db.getValue('boletaSeq', 100000); db.setValue('boletaSeq', n + 1); return n; }

// Registra la venta: guarda, descuenta stock en la sucursal y actualiza puntos del cliente.
export function commitSale(sale) {
  const number = sale.number || nextBoleta();
  const row = db.insert('sales', { ...sale, id: sale.id || 's' + number, number, status: 'completada', synced: true });
  const qty = {};
  row.items.forEach(i => { qty[i.productId] = (qty[i.productId] || 0) + i.qty; });
  Object.entries(qty).forEach(([pid, q]) => {
    const p = db.get('products', pid);
    if (p && p.trackStock) db.update('products', pid, x => ({ stock: { ...x.stock, [row.branchId]: Math.max(0, stockAt(x, row.branchId) - q) } }));
  });
  if (row.customerId) db.update('customers', row.customerId, c => ({ points: Math.max(0, c.points - (row.pointsUsed || 0) + (row.pointsEarned || 0)), pointsEarned: c.pointsEarned + (row.pointsEarned || 0), visits: c.visits + 1, totalSpent: c.totalSpent + row.total, lastVisit: row.createdAt }));
  db.log('venta', `Boleta N° ${number} · ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(row.total)} · ${branchName(row.branchId)}`, row.cashierId);
  return row;
}

export function voidSale(sale, { reason = '', by } = {}) {
  db.update('sales', sale.id, { status: 'anulada', voidReason: reason, voidedBy: by?.id, voidedAt: new Date().toISOString() });
  sale.items.forEach(i => {
    const p = db.get('products', i.productId);
    if (p && p.trackStock) db.update('products', p.id, x => ({ stock: { ...x.stock, [sale.branchId]: stockAt(x, sale.branchId) + i.qty } }));
  });
  if (sale.customerId) db.update('customers', sale.customerId, c => ({ points: Math.max(0, c.points + (sale.pointsUsed || 0) - (sale.pointsEarned || 0)), pointsEarned: Math.max(0, c.pointsEarned - (sale.pointsEarned || 0)), visits: Math.max(0, c.visits - 1), totalSpent: Math.max(0, c.totalSpent - sale.total) }));
  db.log('anulación', `Anuló boleta N° ${sale.number}${reason ? ' (' + reason + ')' : ''}`, by?.id);
}

export const itemName = i => i.name || db.get('products', i.productId)?.name || 'Producto eliminado';
export const saleCost = s => s.items.reduce((t, i) => t + (i.cost ?? db.get('products', i.productId)?.cost ?? 0) * i.qty, 0);
export const valid = s => s.status === 'completada';

// Ventas por día combinando el detalle reciente con el historial agregado.
export function salesByDay(days, branchId = null) {
  const out = [];
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const sales = db.query('sales', s => valid(s) && (!branchId || s.branchId === branchId));
  const daily = db.query('daily', d => !branchId || d.branchId === branchId);
  for (let i = days - 1; i >= 0; i--) {
    const from = t0.getTime() - i * 864e5, to = from + 864e5;
    const key = new Date(from).toISOString().slice(0, 10);
    const ss = sales.filter(s => { const t = new Date(s.createdAt).getTime(); return t >= from && t < to; });
    const dd = daily.filter(d => d.date === key);
    const total = ss.reduce((a, s) => a + s.total, 0) + dd.reduce((a, d) => a + d.total, 0);
    const cost = ss.reduce((a, s) => a + saleCost(s), 0) + dd.reduce((a, d) => a + d.cost, 0);
    const count = ss.length + dd.reduce((a, d) => a + d.count, 0);
    out.push({ date: new Date(from), key, total, cost, count });
  }
  return out;
}

// ---------- Turnos de caja ----------
export const openShiftOf = registerId => db.find('shifts', s => s.registerId === registerId && s.status === 'abierto');
export function shiftSummary(shift) {
  const ss = db.query('sales', s => s.shiftId === shift.id);
  const ok = ss.filter(valid);
  const by = { efectivo: 0, tarjeta: 0, transferencia: 0, puntos: 0 };
  ok.forEach(s => s.payments.forEach(p => { by[p.method] = (by[p.method] || 0) + p.amount; }));
  const movs = shift.movements || [];
  const withdrawals = movs.filter(m => m.type === 'retiro').reduce((a, m) => a + m.amount, 0);
  const deposits = movs.filter(m => m.type === 'ingreso').reduce((a, m) => a + m.amount, 0);
  return { sales: ok, voided: ss.length - ok.length, count: ok.length, total: ok.reduce((a, s) => a + s.total, 0), by, withdrawals, deposits, expected: shift.openingCash + by.efectivo - withdrawals + deposits };
}

// ---------- Inventario ----------
export const MOVE_TYPES = { entrada: ['Entrada', 'success'], merma: ['Merma', 'danger'], transferencia: ['Transferencia', 'info'], ajuste: ['Ajuste', 'warning'] };
export function applyMove({ type, productId, branchId, toBranchId, qty, note = '' }, user) {
  const p = db.get('products', productId);
  const q = Math.round(qty);
  const stock = { ...p.stock };
  if (type === 'entrada') stock[branchId] = stockAt(p, branchId) + q;
  else if (type === 'merma') stock[branchId] = Math.max(0, stockAt(p, branchId) - q);
  else if (type === 'ajuste') stock[branchId] = Math.max(0, stockAt(p, branchId) + q);
  else if (type === 'transferencia') { const real = Math.min(q, stockAt(p, branchId)); stock[branchId] = stockAt(p, branchId) - real; stock[toBranchId] = stockAt(p, toBranchId) + real; }
  db.update('products', p.id, { stock });
  const mv = db.insert('stockMoves', { type, productId, branchId, toBranchId: toBranchId || null, qty: q, note, userId: user?.id });
  db.log('inventario', `${MOVE_TYPES[type][0]}: ${q} × ${p.name} en ${branchName(branchId)}${toBranchId ? ' → ' + branchName(toBranchId) : ''}`, user?.id);
  return mv;
}

export const PO_STATUS = { borrador: ['Borrador', 'warning'], enviada: ['Enviada', 'info'], parcial: ['Recepción parcial', 'primary'], recibida: ['Recibida', 'success'], cancelada: ['Cancelada', 'danger'] };
export const badge = (map, k) => `<span class="badge badge-${(map[k] || [])[1] || 'info'}">${(map[k] || [k])[0]}</span>`;
