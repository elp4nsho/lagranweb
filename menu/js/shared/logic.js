// Reglas de negocio compartidas por la carta (mesa), garzón, cocina y panel.
import { db } from '../data/db.js';
import { STATIONS, TAGS } from '../data/seed.js';

export { STATIONS, TAGS };

export const settings = () => db.getValue('settings', {});
export const saveSettings = patch => db.setValue('settings', { ...settings(), ...patch });

export const TABLE_STATES = {
  libre: { label: 'Libre', badge: 'success' },
  ocupada: { label: 'Ocupada', badge: 'info' },
  cuenta: { label: 'Pidió cuenta', badge: 'warning' },
  llamando: { label: 'Llamando', badge: 'danger' }
};
export function tableState(t) {
  if (!t) return 'libre';
  if (t.calling) return 'llamando';
  if (t.billRequested) return 'cuenta';
  return t.status === 'ocupada' ? 'ocupada' : 'libre';
}

export const ITEM_STATES = {
  pendiente: { label: 'En cola', en: 'Queued', badge: 'info' },
  preparando: { label: 'Preparando', en: 'Cooking', badge: 'warning' },
  listo: { label: 'Listo', en: 'Ready', badge: 'success' },
  entregado: { label: 'Entregado', en: 'Served', badge: 'primary' },
  anulado: { label: 'Anulado', en: 'Voided', badge: 'danger' }
};
export const ORDER_STATES = {
  enviado: { label: 'Enviado', badge: 'info' },
  preparando: { label: 'En preparación', badge: 'warning' },
  listo: { label: 'Listo', badge: 'success' },
  entregado: { label: 'Entregado', badge: 'primary' },
  pagado: { label: 'Pagado', badge: 'success' },
  cancelado: { label: 'Cancelado', badge: 'danger' }
};

export const dishById = id => db.get('dishes', id);
export const dishName = (item, lang = 'es') => { const d = dishById(item.dishId); return d ? (d.name[lang] || d.name.es) : (item.name || 'Plato'); };
export const itemStation = item => item.station || dishById(item.dishId)?.station || 'caliente';
export const lineTotal = items => items.filter(i => i.status !== 'anulado').reduce((s, i) => s + i.price * i.qty, 0);

export function deriveOrderStatus(o) {
  if (o.status === 'pagado' || o.status === 'cancelado') return o.status;
  const items = o.items.filter(i => i.status !== 'anulado');
  if (!items.length) return 'cancelado';
  if (items.every(i => i.status === 'entregado')) return 'entregado';
  if (items.every(i => ['listo', 'entregado'].includes(i.status))) return 'listo';
  if (items.some(i => i.status !== 'pendiente')) return 'preparando';
  return 'enviado';
}

// Actualiza ítems de un pedido (fn recibe el ítem y devuelve el patch o null)
export function patchItems(orderId, fn) {
  return db.update('orders', orderId, o => {
    const items = o.items.map(i => { const p = fn(i); return p ? { ...i, ...p } : i; });
    const next = { ...o, items };
    return { items, status: deriveOrderStatus(next) };
  });
}

export function nextOrderNumber() {
  const n = (db.getValue('orderSeq', 1000) || 1000) + 1;
  db.setValue('orderSeq', n);
  return n;
}

export function openSession(tableId, { guests = 2, waiterId = null } = {}) {
  const t = db.get('tables', tableId);
  if (t.sessionId) { const s = db.get('sessions', t.sessionId); if (s && s.status === 'abierta') return s; }
  const s = db.insert('sessions', { tableId, tableNumber: t.number, guests, status: 'abierta', openedAt: new Date().toISOString(), subtotal: 0, tip: 0, total: 0, waiterId: waiterId || t.waiterId || null });
  db.update('tables', tableId, { status: 'ocupada', sessionId: s.id, calling: false, billRequested: false, waiterId: s.waiterId });
  return s;
}

export function sessionOrders(sessionId) {
  return db.query('orders', o => o.sessionId === sessionId && o.status !== 'cancelado').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function sessionTotals(sessionId, tipPct = 0) {
  const subtotal = sessionOrders(sessionId).reduce((s, o) => s + lineTotal(o.items), 0);
  const tip = Math.round(subtotal * tipPct / 100 / 10) * 10;
  return { subtotal, tip, total: subtotal + tip };
}

// Descuenta insumos según la receta de cada plato
function consumeStock(items) {
  if (!settings().decrementStock) return;
  const need = {};
  items.forEach(i => (dishById(i.dishId)?.recipe || []).forEach(rc => { need[rc.ing] = (need[rc.ing] || 0) + rc.qty * i.qty; }));
  Object.entries(need).forEach(([ing, q]) => {
    const row = db.get('ingredients', ing);
    if (row) db.update('ingredients', ing, { stock: Math.max(0, Math.round((row.stock - q) * 100) / 100) });
  });
}

// Envía a cocina: items = [{ dishId, qty, price, mods:[texto], note }]
export function sendOrder(tableId, items, { source = 'mesa', waiterId = null, note = '', guests } = {}) {
  const t = db.get('tables', tableId);
  const s = openSession(tableId, { guests: guests || 2, waiterId });
  const number = nextOrderNumber();
  const rows = items.map((i, k) => {
    const d = dishById(i.dishId);
    return { id: 'it' + number + '-' + k, dishId: i.dishId, name: d?.name.es || i.name, qty: i.qty, price: i.price, mods: i.mods || [], note: i.note || '', station: d?.station || 'caliente', status: 'pendiente' };
  });
  const o = db.insert('orders', { number, tableId, tableNumber: t.number, sessionId: s.id, items: rows, status: 'enviado', source, waiterId: waiterId || t.waiterId || null, note });
  const tot = sessionTotals(s.id);
  db.update('sessions', s.id, { subtotal: tot.subtotal, total: tot.subtotal });
  consumeStock(rows);
  db.log('pedido', `Pedido #${number} · Mesa ${t.number} · ${rows.reduce((a, i) => a + i.qty, 0)} ítems (${source === 'mesa' ? 'desde la mesa' : 'garzón'})`, waiterId);
  return o;
}

export function callWaiter(tableId, type = 'garzon') {
  const t = db.get('tables', tableId);
  const existing = db.find('calls', c => c.tableId === tableId && c.type === type && c.status === 'pendiente');
  if (!existing) db.insert('calls', { tableId, tableNumber: t.number, type, status: 'pendiente' });
  db.update('tables', tableId, type === 'cuenta' ? { billRequested: true } : { calling: true });
  db.log(type === 'cuenta' ? 'cuenta' : 'llamado', `Mesa ${t.number} ${type === 'cuenta' ? 'pidió la cuenta' : 'llamó al garzón'}`);
}

export function attendCall(callId, userId) {
  const c = db.get('calls', callId);
  if (!c) return;
  db.update('calls', callId, { status: 'atendida', attendedBy: userId, attendedAt: new Date().toISOString() });
  if (c.type === 'garzon') db.update('tables', c.tableId, { calling: false });
}

export function closeSession(sessionId, { tipPct = 0, method = 'Tarjeta', split = 1, userId = null } = {}) {
  const s = db.get('sessions', sessionId);
  if (!s || s.status !== 'abierta') return null;
  const tot = sessionTotals(sessionId, tipPct);
  const now = new Date().toISOString();
  sessionOrders(sessionId).forEach(o => db.update('orders', o.id, { status: 'pagado', closedAt: now, items: o.items.map(i => i.status === 'anulado' ? i : { ...i, status: 'entregado' }) }));
  db.update('sessions', sessionId, { status: 'pagada', closedAt: now, tipPct, tip: tot.tip, subtotal: tot.subtotal, total: tot.total, method, split });
  db.query('calls', c => c.tableId === s.tableId && c.status === 'pendiente').forEach(c => db.update('calls', c.id, { status: 'atendida', attendedBy: userId, attendedAt: now }));
  db.update('tables', s.tableId, { status: 'libre', sessionId: null, calling: false, billRequested: false });
  db.log('cobro', `Mesa ${s.tableNumber} pagó ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(tot.total)} (${method}${split > 1 ? `, dividido en ${split}` : ''})`, userId);
  return db.get('sessions', sessionId);
}

export function freeTable(tableId, userId) {
  const t = db.get('tables', tableId);
  if (t.sessionId) {
    const s = db.get('sessions', t.sessionId);
    if (s && s.status === 'abierta' && !sessionOrders(s.id).length) db.remove('sessions', s.id);
  }
  db.update('tables', tableId, { status: 'libre', sessionId: null, calling: false, billRequested: false });
  db.log('mesa', `Mesa ${t.number} liberada`, userId);
}

// Paletas: tono de ilustración según token
export const TONES = ['primary', 'accent', 'success', 'warning', 'info', 'danger'];

// Horario: ¿abierto ahora?
export function openNow(now = new Date()) {
  const h = settings().hours || [];
  const toMin = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
  const m = now.getHours() * 60 + now.getMinutes();
  const today = h.find(x => x.day === now.getDay());
  if (today && !today.closed && today.open) {
    let c = toMin(today.close); if (c <= toMin(today.open)) c += 1440;
    if (m >= toMin(today.open) && m < c) return { open: true, until: today.close };
  }
  const y = h.find(x => x.day === (now.getDay() + 6) % 7);
  if (y && !y.closed && y.close && toMin(y.close) < toMin(y.open) && m < toMin(y.close)) return { open: true, until: y.close };
  return { open: false, today };
}

// Patrón tipo QR determinista (SVG) para una URL — ilustrativo, no escaneable.
export function qrSvg(text, size = 25) {
  let h = 2166136261;
  for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const cells = [];
  const finder = (x, y) => (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (finder(x, y) || (x === 7 || y === 7 || x === size - 8 || y === size - 8) && (x < 8 || x >= size - 8) && (y < 8 || y >= size - 8)) continue;
    if (y === 6 || x === 6) { if ((x + y) % 2 === 0) cells.push(`M${x} ${y}h1v1h-1z`); continue; }
    if (rand() > .52) cells.push(`M${x} ${y}h1v1h-1z`);
  }
  const eye = (x, y) => `M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z M${x + 2} ${y + 2}h3v3h-3z`;
  return `<svg class="qr" viewBox="-2 -2 ${size + 4} ${size + 4}" role="img" aria-label="Código QR"><rect x="-2" y="-2" width="${size + 4}" height="${size + 4}" fill="var(--qr-bg, #fff)"/><path fill="var(--qr-fg, #000)" fill-rule="evenodd" d="${eye(0, 0)} ${eye(size - 7, 0)} ${eye(0, size - 7)} ${cells.join(' ')}"/></svg>`;
}
