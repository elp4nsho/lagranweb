// Lógica de negocio de Pits Rápido: precios por vehículo, fila en vivo, agenda, flujo de la atención,
// recomendaciones, cobro (cupones / planes), stock y recordatorios.
import { db } from '../data/db.js';
import { MODELS, SEG, modelById } from '../data/catalog.js';
import { servicePrice, iso, addDays, today, normPlate, fmtPlate, validPlate, pad } from './pricing.js';
export { iso, addDays, today, normPlate, fmtPlate, validPlate, pad };

export const JOB_STATES = {
  reservado: { label: 'Reservado', badge: 'info', icon: '📅' },
  'en-fila': { label: 'En fila', badge: 'warning', icon: '⏳' },
  'en-bahia': { label: 'En bahía', badge: 'primary', icon: '🔧' },
  listo: { label: 'Listo para retiro', badge: 'success', icon: '✅' },
  pagado: { label: 'Entregado', badge: '', icon: '🏁' },
  cancelado: { label: 'Cancelado', badge: 'danger', icon: '✕' },
  'no-show': { label: 'No llegó', badge: 'danger', icon: '∅' }
};
export const SOURCES = { web: 'Reserva web', walkin: 'Sin cita', llegue: 'Check-in "Llegué"', telefono: 'Teléfono' };
export const ACTIVE = ['en-fila', 'en-bahia', 'listo'];

export const settings = () => db.getValue('settings', {});
export const saveSettings = patch => db.setValue('settings', { ...settings(), ...patch });
export const branches = (all = false) => db.query('branches', b => all || b.active !== false);
export const branchById = id => db.get('branches', id);
export const branchName = id => branchById(id)?.name || '—';
export const baysOf = (bid, all = false) => db.query('bays', y => y.branchId === bid && (all || y.active !== false));
export const services = (all = false) => db.query('services', s => all || s.active !== false).sort((a, b) => a.order - b.order);
export const serviceById = id => db.get('services', id);
export const oilById = id => db.get('oils', id);
export const segName = id => SEG[id]?.name || id;
export const userName = id => db.get('users', id)?.name || '—';
export const vehicleByPlate = p => { const n = normPlate(p); return n ? db.find('vehicles', v => normPlate(v.plate) === n) : null; };
export const customerById = id => db.get('customers', id);
export const carLabel = v => v ? `${v.make} ${v.model} ${v.year || ''}`.trim() : '';
export const priceFor = (svc, veh) => servicePrice(typeof svc === 'string' ? serviceById(svc) : svc, veh, db.all('oils'));

// Busca una patente: primero en la base de clientes; si no, consulta "simulada" al registro de vehículos.
export function lookupPlate(plate) {
  const v = vehicleByPlate(plate);
  if (v) return { found: true, vehicle: v, model: modelById(v.modelId), source: 'cliente' };
  if (!validPlate(plate)) return null;
  const n = normPlate(plate);
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const m = MODELS[h % MODELS.length];
  const year = Math.min(m.to, Math.max(m.from, 2010 + (h >> 5) % 15));
  return { found: false, model: m, source: 'registro', vehicle: { plate: fmtPlate(plate), modelId: m.id, make: m.make, model: m.model, year, segment: m.segment, oil: m.oil, liters: m.liters } };
}
export const vehFromModel = (m, year, plate = '') => ({ plate, modelId: m.id, make: m.make, model: m.model, year, segment: m.segment, oil: m.oil, liters: m.liters });

// ---------- Fila y tiempos de espera ----------
const mins = (a, b = Date.now()) => (new Date(b) - new Date(a)) / 6e4;
export const elapsed = j => j.startedAt ? Math.max(0, Math.round(mins(j.startedAt, j.doneAt || Date.now()))) : 0;
export const todayJobs = (bid, fn = () => true) => { const T = today(); return db.query('jobs', j => (!bid || j.branchId === bid) && (iso(j.arrivedAt || j.bookedFor || j.createdAt) === T) && fn(j)); };
export function queueOf(bid) { return db.query('jobs', j => j.branchId === bid && j.status === 'en-fila').sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt)); }
export function branchLive(bid) {
  const bays = baysOf(bid);
  const inBay = db.query('jobs', j => j.branchId === bid && j.status === 'en-bahia');
  const queue = queueOf(bid);
  const free = bays.map(y => { const j = inBay.find(x => x.bayId === y.id); return j ? Math.max(3, j.est - elapsed(j)) : 0; });
  if (!free.length) return { bays: 0, inBay: inBay.length, queue: queue.length, wait: null, freeBays: 0, positions: {} };
  const positions = {};
  queue.forEach((j, i) => { free.sort((a, b) => a - b); positions[j.id] = { pos: i + 1, wait: Math.round(free[0]) }; free[0] += j.est; });
  free.sort((a, b) => a - b);
  return { bays: bays.length, inBay: inBay.length, queue: queue.length, wait: Math.round(free[0]), freeBays: bays.length - inBay.length, positions };
}
export const waitLabel = w => w == null ? 'Cerrada' : w <= 2 ? 'Sin espera' : `~${w} min`;
export const waitTone = w => w == null ? 'danger' : w <= 10 ? 'success' : w <= 25 ? 'warning' : 'danger';

// ---------- Agenda ----------
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export function hoursOf(b, dateIso) {
  const dow = new Date(dateIso + 'T12:00').getDay();
  if (dow === 0) return null;
  return { open: hm(b.open), close: hm(dow === 6 ? b.satClose : b.close) };
}
export function slotsFor(bid, dateIso) {
  const b = branchById(bid); if (!b) return [];
  const h = hoursOf(b, dateIso); if (!h) return [];
  const cap = Math.max(1, baysOf(bid).length - (settings().walkinBuffer ?? 1));
  const booked = db.query('jobs', j => j.branchId === bid && j.bookedFor && iso(j.bookedFor) === dateIso && !['cancelado', 'no-show'].includes(j.status));
  const out = [];
  const [y, mo, d] = dateIso.split('-').map(Number);
  for (let t = Math.ceil(h.open / 30) * 30; t <= h.close - 60; t += 30) {
    const at = new Date(y, mo - 1, d, 0, t);
    const used = booked.filter(j => new Date(j.bookedFor).getTime() === at.getTime()).length;
    out.push({ label: `${pad(Math.floor(t / 60))}:${pad(t % 60)}`, iso: at.toISOString(), used, cap, free: Math.max(0, cap - used), past: at.getTime() < Date.now() + 20 * 6e4 });
  }
  return out;
}

// ---------- Clientes / vehículos ----------
export function upsertCustomer({ name, email, phone, rut = '' }) {
  const e = String(email || '').trim().toLowerCase();
  let c = e ? db.find('customers', x => x.email.toLowerCase() === e) : null;
  if (!c && phone) c = db.find('customers', x => x.phone.replace(/\D/g, '') === String(phone).replace(/\D/g, ''));
  if (c) { if (phone && !c.phone) db.update('customers', c.id, { phone }); return c; }
  return db.insert('customers', { name, email: e, phone: phone || '', rut, comuna: '', optSms: true, optWa: true, optEmail: !!e, notes: '' });
}
export function upsertVehicle(veh, customerId, km) {
  let v = vehicleByPlate(veh.plate);
  if (v) { const patch = {}; if (km && km > (v.km || 0)) patch.km = km; if (!v.customerId && customerId) patch.customerId = customerId; if (Object.keys(patch).length) db.update('vehicles', v.id, patch); return db.get('vehicles', v.id); }
  return db.insert('vehicles', { plate: fmtPlate(veh.plate), customerId, modelId: veh.modelId, make: veh.make, model: veh.model, year: +veh.year, segment: veh.segment, oil: veh.oil, liters: veh.liters, km: +km || 0, nextDueKm: (+km || 0) + (oilById(veh.oil)?.interval || 10000), nextDueDate: addDays(today(), 180), lastServiceAt: '', history: [] });
}
export function nextCode() { const s = settings(); const n = s.nextCode || 50000; saveSettings({ nextCode: n + 1 }); return 'PR-' + n; }
function nextFolio() { const s = settings(); const n = s.nextFolio || 200000; saveSettings({ nextFolio: n + 1 }); return n; }
const mkItems = (ids, veh) => ids.map(id => { const s = serviceById(id); return { s: id, n: s.name, p: priceFor(s, veh) }; });
const estOf = ids => ids.reduce((t, id) => t + (serviceById(id)?.mins || 20), 0);

export function createJob({ veh, customerId, branchId, serviceIds, status, source, bookedFor = '', km = 0, notes = '', coupon = '', user = null, photos = 0 }) {
  const v = upsertVehicle(veh, customerId, km);
  const items = mkItems(serviceIds, v);
  const now = new Date().toISOString();
  const j = db.insert('jobs', { code: nextCode(), branchId, bayId: '', vehicleId: v.id, customerId, plate: v.plate, car: carLabel(v), segment: v.segment, items, upsells: [], tasks: [], status, source, bookedFor, arrivedAt: status === 'en-fila' ? now : '', startedAt: '', doneAt: '', paidAt: '', km: +km || v.km, techId: '', est: estOf(serviceIds), discount: 0, coupon: '', total: items.reduce((s, i) => s + i.p, 0), pay: null, photos, notes });
  if (coupon) applyCoupon(j.id, coupon);
  db.log('atencion', `${j.code} · ${v.plate} · ${status === 'reservado' ? 'reserva' : 'ingreso'} en ${branchName(branchId)} (${SOURCES[source] || source})`, user);
  return db.get('jobs', j.id);
}
export function recalc(id) {
  const j = db.get('jobs', id);
  const sub = j.items.reduce((s, i) => s + (i.plan ? 0 : i.p), 0);
  let discount = 0;
  const c = j.coupon && db.find('coupons', x => x.code === j.coupon);
  if (c) {
    const base = c.serviceId ? j.items.filter(i => i.s === c.serviceId && !i.plan).reduce((s, i) => s + i.p, 0) : sub;
    discount = c.type === 'pct' ? Math.round(base * c.value / 100) : Math.min(base, c.value);
  }
  db.update('jobs', id, { discount, total: Math.max(0, sub - discount), est: j.items.reduce((t, i) => t + (serviceById(i.s)?.mins || 15), 0) });
}
export function checkCoupon(code, serviceIds = []) {
  const c = db.find('coupons', x => x.code.toUpperCase() === String(code).trim().toUpperCase());
  if (!c || !c.active) return { ok: false, msg: 'Cupón no válido' };
  if (c.validTo && c.validTo < today()) return { ok: false, msg: 'El cupón está vencido' };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, msg: 'El cupón alcanzó su límite de usos' };
  if (c.serviceId && serviceIds.length && !serviceIds.includes(c.serviceId)) return { ok: false, msg: `Aplica solo a ${serviceById(c.serviceId)?.name}` };
  return { ok: true, coupon: c };
}
export function applyCoupon(id, code) {
  const j = db.get('jobs', id);
  if (!code) { db.update('jobs', id, { coupon: '' }); recalc(id); return { ok: true }; }
  const r = checkCoupon(code, j.items.map(i => i.s));
  if (!r.ok) return r;
  db.update('jobs', id, { coupon: r.coupon.code }); recalc(id);
  return r;
}

// ---------- Flujo de la atención ----------
export function checkInJob(id, user = null, km = 0) {
  const j = db.get('jobs', id);
  db.update('jobs', id, { status: 'en-fila', arrivedAt: new Date().toISOString(), ...(km ? { km } : {}) });
  db.log('atencion', `${j.code} · ${j.plate} llegó a ${branchName(j.branchId)}`, user);
}
export function startJob(id, bayId, techId, user = null) {
  const j = db.get('jobs', id);
  const tasks = j.items.flatMap(i => serviceById(i.s)?.tasks || [i.n]).map(t => ({ t, d: false }));
  db.update('jobs', id, { status: 'en-bahia', bayId, techId, startedAt: new Date().toISOString(), tasks, arrivedAt: j.arrivedAt || new Date().toISOString() });
  db.log('bahia', `${j.code} · ${j.plate} entra a ${db.get('bays', bayId)?.name} (${branchName(j.branchId)})`, user);
}
export function toggleTask(id, idx) { db.update('jobs', id, j => ({ tasks: j.tasks.map((t, i) => i === idx ? { ...t, d: !t.d } : t) })); }
export function finishJob(id, user = null) {
  const j = db.get('jobs', id);
  db.update('jobs', id, { status: 'listo', doneAt: new Date().toISOString(), tasks: j.tasks.map(t => ({ ...t, d: true })), upsells: j.upsells.map(u => u.st === 'pendiente' ? { ...u, st: 'sin-respuesta' } : u) });
  db.log('bahia', `${j.code} · ${j.plate} terminado en ${db.get('bays', j.bayId)?.name || 'bahía'}`, user);
}
export function addUpsell(id, { label, s = '', p, icon = '💡', note = '' }, user = null) {
  const j = db.get('jobs', id);
  db.update('jobs', id, { upsells: [...j.upsells, { id: 'up' + Date.now().toString(36), label, s, p, icon, note, st: 'pendiente', at: new Date().toISOString() }] });
  db.log('upsell', `${j.code} · recomendación: ${label}`, user);
}
export function respondUpsell(id, upId, ok, who = 'cliente') {
  const j = db.get('jobs', id);
  const u = j.upsells.find(x => x.id === upId);
  if (!u || u.st !== 'pendiente') return;
  const ups = j.upsells.map(x => x.id === upId ? { ...x, st: ok ? 'aprobado' : 'rechazado', by: who, respondedAt: new Date().toISOString() } : x);
  const patch = { upsells: ups };
  if (ok) {
    patch.items = [...j.items, { s: u.s || 'extra', n: u.s ? serviceById(u.s)?.name || u.label : u.label, p: u.p, up: true }];
    if (j.status === 'en-bahia') patch.tasks = [...j.tasks, ...((u.s && serviceById(u.s)?.tasks) || [u.label]).map(t => ({ t, d: false }))];
  }
  db.update('jobs', id, patch); recalc(id);
  db.log('upsell', `${j.code} · ${u.label}: ${ok ? 'APROBADA' : 'rechazada'} por ${who}`, null);
}
export function cancelJob(id, status = 'cancelado', user = null) {
  const j = db.get('jobs', id);
  db.update('jobs', id, { status, bayId: j.status === 'en-bahia' ? '' : j.bayId });
  db.log('atencion', `${j.code} · ${JOB_STATES[status].label}`, user);
}

// Planes disponibles para una atención (por vehículo).
export const plansForVehicle = vid => db.query('planPurchases', p => p.vehicleId === vid && p.status === 'activo' && p.expiresAt >= today());
export function togglePlanItem(jobId, idx) {
  const j = db.get('jobs', jobId), it = j.items[idx];
  if (!it.plan) {
    const pp = plansForVehicle(j.vehicleId).find(p => (p.remaining[it.s] || 0) > 0);
    if (!pp) return false;
    db.update('jobs', jobId, { items: j.items.map((x, i) => i === idx ? { ...x, plan: pp.id } : x) });
  } else db.update('jobs', jobId, { items: j.items.map((x, i) => i === idx ? { ...x, plan: '' } : x) });
  recalc(jobId); return true;
}

// Cobro: emite boleta, descuenta stock, consume plan y actualiza el próximo mantenimiento.
export function payJob(id, method, user = null) {
  const j = db.get('jobs', id);
  const folio = nextFolio();
  db.update('jobs', id, { status: 'pagado', paidAt: new Date().toISOString(), pay: { m: method, folio, by: user } });
  j.items.filter(i => i.plan).forEach(i => db.update('planPurchases', i.plan, p => { const remaining = { ...p.remaining, [i.s]: Math.max(0, (p.remaining[i.s] || 0) - 1) }; return { remaining, status: Object.values(remaining).some(n => n > 0) ? 'activo' : 'agotado' }; }));
  if (j.coupon) { const c = db.find('coupons', x => x.code === j.coupon); if (c) db.update('coupons', c.id, { uses: (c.uses || 0) + 1 }); }
  const v = db.get('vehicles', j.vehicleId);
  if (v) {
    const patch = { km: Math.max(v.km || 0, j.km || 0) };
    if (j.items.some(i => i.s === 'aceite')) { patch.lastServiceAt = today(); patch.nextDueKm = Math.round(((j.km || v.km) + (oilById(v.oil)?.interval || 10000)) / 100) * 100; patch.nextDueDate = addDays(today(), 180); }
    db.update('vehicles', v.id, patch);
    consumeStock(j, v);
  }
  db.log('caja', `${j.code} · boleta N° ${folio} · ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(j.total)}`, user);
  return folio;
}
function consumeStock(j, v) {
  const take = (pred, qty) => { const p = db.find('products', pred); if (p) db.update('products', p.id, x => ({ stock: { ...x.stock, [j.branchId]: Math.max(0, (x.stock[j.branchId] || 0) - qty) } })); };
  const euro = ['5w40e', '0w40p'].includes(v.oil) || v.segment === 'premium';
  for (const i of j.items) {
    if (i.s === 'aceite') { take(p => p.oil === v.oil, Math.ceil(v.liters || 4)); take(p => p.sku === (euro ? 'FL-OIL-E' : 'FL-OIL-A'), 1); }
    if (i.s === 'filtros') { take(p => p.sku === 'FL-AIR', 1); take(p => p.sku === 'FL-CAB', 1); }
    if (i.s === 'frenos') take(p => p.sku === (euro ? 'FR-PAST-E' : 'FR-PAST-A'), 1);
    if (i.s === 'liquido-frenos') take(p => p.sku === 'FR-DOT4', 1);
    if (i.s === 'refrigerante') take(p => p.sku === 'RF-ORG', 1);
    if (i.s === 'bateria') take(p => p.sku === ({ city: 'BT-45', sedan: 'BT-60', suv: 'BT-75', pickup: 'BT-75', premium: 'BT-90A' })[v.segment], 1);
    if (i.s === 'extra' && /plumilla/i.test(i.n)) take(p => p.sku === 'PL-UNI', 1);
  }
}
export const lowStock = (bid = '') => db.query('products', p => p.active !== false && (bid ? [bid] : Object.keys(p.stock)).some(b => (p.stock[b] || 0) < p.min));

// Historial de un vehículo: atenciones del sistema + registros antiguos.
export function vehicleHistory(v) {
  const recent = db.query('jobs', j => j.vehicleId === v.id && j.status === 'pagado').map(j => ({ d: iso(j.paidAt), km: j.km, s: j.items.map(i => i.n).join(' + '), t: j.total, b: j.branchId, f: j.pay?.folio, jobId: j.id }));
  return [...recent, ...(v.history || [])].sort((a, b) => b.d.localeCompare(a.d));
}
export function dueInfo(v) {
  if (!v) return null;
  const kmLeft = (v.nextDueKm || 0) - (v.km || 0);
  const days = v.nextDueDate ? Math.round((new Date(v.nextDueDate + 'T12:00') - new Date(today() + 'T12:00')) / 864e5) : 999;
  const tone = kmLeft <= 0 || days < 0 ? 'danger' : kmLeft < 1500 || days < 30 ? 'warning' : 'success';
  const label = kmLeft <= 0 || days < 0 ? 'Mantención vencida' : kmLeft < 1500 || days < 30 ? 'Mantención próxima' : 'Al día';
  return { kmLeft, days, tone, label };
}

// ---------- Series para el dashboard ----------
export function dailySeries(days = 30, bid = '') {
  const T = today(), out = [];
  const stats = db.all('dailyStats');
  const jobs = db.query('jobs', j => j.status === 'pagado' && (!bid || j.branchId === bid));
  const byDay = {};
  jobs.forEach(j => { const d = iso(j.paidAt); (byDay[d] ||= []).push(j); });
  for (let k = days - 1; k >= 0; k--) {
    const d = addDays(T, -k);
    const js = byDay[d];
    if (js || k < 13) {
      const list = js || [];
      const ups = list.flatMap(j => j.upsells);
      out.push({ d, cars: list.length, rev: list.reduce((s, j) => s + j.total, 0), wait: list.length ? list.reduce((s, j) => s + Math.max(0, mins(j.arrivedAt, j.startedAt)), 0) / list.length : 0, upO: ups.length, upA: ups.filter(u => u.st === 'aprobado').length, bayMin: list.reduce((s, j) => s + mins(j.startedAt, j.doneAt), 0), live: true });
    } else {
      const ss = stats.filter(s => s.d === d && (!bid || s.b === bid));
      out.push({ d, cars: ss.reduce((s, x) => s + x.cars, 0), rev: ss.reduce((s, x) => s + x.rev, 0), wait: ss.length ? ss.reduce((s, x) => s + x.wait, 0) / ss.length : 0, upO: ss.reduce((s, x) => s + x.upO, 0), upA: ss.reduce((s, x) => s + x.upA, 0), bayMin: ss.reduce((s, x) => s + x.bayMin, 0) });
    }
  }
  return out;
}
export const fmtKm = n => new Intl.NumberFormat('es-CL').format(Math.round(n || 0)) + ' km';
export const timeHM = d => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
export const dayLabel = (d, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString('es-CL', opts);
