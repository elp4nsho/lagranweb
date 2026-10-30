// Lógica de negocio del taller: OT y sus etapas, presupuesto por ítem, abono, tareas con cronómetro,
// hallazgos, solicitudes a bodega, siniestros, entrega con factura/boleta y garantía.
import { db } from '../data/db.js';
import { ST, STAGES, OPEN, LABOR } from '../data/catalog.js';

const pad = n => String(n).padStart(2, '0');
export const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return iso(new Date(y, m - 1, d + n)); };
export const normPlate = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const validPlate = s => /^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})$/.test(normPlate(s));
export function fmtPlate(s) { const p = normPlate(s); if (/^[A-Z]{4}\d{2}$/.test(p)) return p.slice(0, 4) + '-' + p.slice(4); if (/^[A-Z]{2}\d{4}$/.test(p)) return p.slice(0, 2) + '-' + p.slice(2); return p; }
export const fmtKm = n => new Intl.NumberFormat('es-CL').format(Math.round(n || 0)) + ' km';
export const timeHM = d => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
export const dayLabel = (d, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(String(d).length === 10 ? d + 'T12:00' : d).toLocaleDateString('es-CL', o);
export const clp = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n || 0));

export const settings = () => db.getValue('settings', {});
export const saveSettings = p => db.setValue('settings', { ...settings(), ...p });
export const userName = id => db.get('users', id)?.name || '—';
export const customerById = id => db.get('customers', id);
export const vehicleByPlate = p => { const n = normPlate(p); return n ? db.find('vehicles', v => normPlate(v.plate) === n) : null; };
export const otByCode = c => { const s = String(c || '').trim().toUpperCase(); return db.find('ots', o => o.code === s || o.code === 'OT-' + s) || null; };
export const mechanics = () => db.query('users', u => u.role === 'mecanico' && u.active !== false);
export const insurerName = id => db.get('insurers', id)?.name || '—';
export const ST_OF = s => ST[s] || { label: s, icon: '', badge: '' };
export { ST, STAGES, OPEN };

function counter(key, prefix) { const s = settings(); const n = s[key]; saveSettings({ [key]: n + 1 }); return prefix + n; }

// ---------- Totales ----------
export function totals(o) {
  const live = o.budget.filter(i => i.st !== 'rechazado');
  const sum = arr => arr.reduce((s, i) => s + i.qty * i.price, 0);
  const parts = sum(live.filter(i => i.kind === 'repuesto')), labor = sum(live.filter(i => i.kind !== 'repuesto'));
  const approved = sum(o.budget.filter(i => i.st === 'aprobado'));
  const pending = sum(o.budget.filter(i => i.st === 'pendiente'));
  const total = parts + labor, net = Math.round(total / 1.19);
  const claim = o.claimId ? db.get('claims', o.claimId) : null;
  const deposit = o.deposit?.amount || 0;
  const customerPays = claim && ['aprobado', 'pagado'].includes(claim.status) ? Math.min(total, claim.deductible) : total;
  return { parts, labor, total, net, iva: total - net, approved, pending, deposit, claim, customerPays, balance: Math.max(0, customerPays - deposit), hours: live.filter(i => i.kind === 'mano').reduce((s, i) => s + (i.hours || 0) * i.qty, 0) };
}
export const laborPrice = (hours, cat = '') => Math.round(hours * (/Pintura|Carrocería/.test(cat) ? settings().paintRate : settings().laborRate) / 10) * 10;

// ---------- Etapas ----------
export function setStatus(id, status, user = null, extra = {}) {
  const o = db.get('ots', id);
  if (!o || o.status === status) return;
  db.update('ots', id, { status, ...extra, timeline: [...o.timeline, { s: status, at: new Date().toISOString(), by: user }] });
  db.log('ot', `${o.code} · ${ST_OF(o.status).label} → ${ST_OF(status).label}`, user);
}
// Reglas de avance (el kanban y los botones las respetan)
export function canMove(o, to) {
  if (to === 'cancelada') return o.status !== 'entregado' ? true : 'No se puede cancelar una OT entregada';
  const a = ST_OF(o.status).i, b = ST_OF(to).i;
  if (to === 'presupuesto' && !o.budget.length) return 'Agrega ítems al presupuesto antes de enviarlo';
  if (to === 'aprobado' && !o.budget.some(i => i.st === 'aprobado') && !(o.claimId && ['aprobado', 'pagado'].includes(db.get('claims', o.claimId)?.status))) return 'El cliente (o la aseguradora) aún no aprueba ítems';
  if (to === 'reparacion' && (!o.mechanicId)) return 'Asigna un mecánico antes de iniciar la reparación';
  if (to === 'listo' && o.tasks.some(t => !t.done)) return 'Hay tareas sin terminar';
  if (to === 'entregado') return 'Usa "Entregar y facturar" para cerrar la OT';
  if (b > a + 1 && to !== 'presupuesto') return `Paso no permitido: primero "${STAGES[a + 1]?.[1]}"`;
  return true;
}

export function createOT({ veh, customerId, type = 'mecanica', symptom = '', km = 0, fuel = 4, advisorId = '', user = null, requestId = '', photos = 0 }) {
  let v = vehicleByPlate(veh.plate);
  if (!v) v = db.insert('vehicles', { plate: fmtPlate(veh.plate), customerId, make: veh.make, model: veh.model, year: +veh.year || 2018, vin: veh.vin || '', color: veh.color || '', km: +km || 0, history: [] });
  else db.update('vehicles', v.id, { km: Math.max(v.km || 0, +km || 0), customerId: v.customerId || customerId });
  const code = counter('nextOT', 'OT-');
  const o = db.insert('ots', { code, vehicleId: v.id, customerId, plate: v.plate, car: `${v.make} ${v.model} ${v.year}`, type, status: 'recepcion', advisorId: advisorId || user || '', mechanicId: '', bayId: 'bay-PT', km: +km || v.km, fuel, intake: { check: {}, damages: [], notes: '' }, symptom, diagnosis: '', budget: [], budgetSentAt: '', deposit: null, tasks: [], timeline: [{ s: 'recepcion', at: new Date().toISOString(), by: user }], promisedAt: new Date(Date.now() + 3 * 864e5).toISOString(), deliveredAt: '', claimId: '', invoiceId: '', photos, notes: '', requestId });
  db.log('ot', `${code} creada · ${v.plate} (${o.car})`, user);
  return o;
}

// ---------- Presupuesto ----------
export function addItem(id, it) { db.update('ots', id, o => ({ budget: [...o.budget, { id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), st: 'pendiente', photo: false, note: '', prio: 'urgente', qty: 1, ...it }] })); }
export function updateItem(id, itemId, patch) { db.update('ots', id, o => ({ budget: o.budget.map(i => i.id === itemId ? { ...i, ...patch } : i) })); }
export function removeItem(id, itemId) { db.update('ots', id, o => ({ budget: o.budget.filter(i => i.id !== itemId) })); }
export function sendBudget(id, user) {
  const o = db.get('ots', id);
  db.update('ots', id, { budgetSentAt: new Date().toISOString() });
  if (o.status !== 'presupuesto') setStatus(id, 'presupuesto', user);
  db.log('ot', `${o.code} · presupuesto enviado al cliente (${clp(totals(o).total)})`, user);
}
// Decisión del cliente (web) o del asesor: { itemId: true|false }, abono opcional.
export function decideBudget(id, decisions, { by = 'cliente', deposit = null, user = null } = {}) {
  const o = db.get('ots', id);
  const budget = o.budget.map(i => i.id in decisions ? { ...i, st: decisions[i.id] ? 'aprobado' : 'rechazado' } : i);
  const patch = { budget, ...(deposit ? { deposit } : {}) };
  db.update('ots', id, patch);
  const ok = budget.filter(i => i.st === 'aprobado').length;
  db.log('presupuesto', `${o.code} · ${by}: ${ok} ítems aprobados, ${budget.filter(i => i.st === 'rechazado').length} rechazados${deposit ? ` · abono ${clp(deposit.amount)}` : ''}`, user);
  if (ok && ['presupuesto', 'diagnostico'].includes(o.status)) { buildTasks(id); setStatus(id, 'aprobado', user); }
  else if (ok) buildTasks(id);
}
export function buildTasks(id) {
  const o = db.get('ots', id);
  const have = new Set(o.tasks.map(t => t.itemId));
  const add = o.budget.filter(i => i.kind === 'mano' && i.st === 'aprobado' && !have.has(i.id)).map(i => ({ id: 't' + i.id, itemId: i.id, desc: i.desc, mech: o.mechanicId || '', std: +((i.hours || 1) * i.qty).toFixed(1), spent: 0, run: null, done: false }));
  if (add.length) db.update('ots', id, { tasks: [...o.tasks, ...add] });
}

// ---------- Tareas con cronómetro ----------
const elapsedMin = t => t.run ? (Date.now() - Date.parse(t.run)) / 6e4 : 0;
export const taskMin = t => (t.spent || 0) + elapsedMin(t);
export function startTask(otId, taskId, user) {
  // Pausa cualquier otra tarea corriendo del mismo mecánico (no se puede estar en dos a la vez)
  db.query('ots', o => o.tasks.some(t => t.run && t.mech === user)).forEach(o => { if (o.id !== otId || o.tasks.some(t => t.run && t.id !== taskId)) db.update('ots', o.id, { tasks: o.tasks.map(t => t.run && t.mech === user && !(o.id === otId && t.id === taskId) ? { ...t, spent: Math.round(taskMin(t)), run: null } : t) }); });
  const o = db.get('ots', otId);
  db.update('ots', otId, { tasks: o.tasks.map(t => t.id === taskId ? { ...t, run: new Date().toISOString(), mech: t.mech || user } : t) });
  if (o.status === 'aprobado') setStatus(otId, 'reparacion', user);
}
export function pauseTask(otId, taskId) { db.update('ots', otId, o => ({ tasks: o.tasks.map(t => t.id === taskId ? { ...t, spent: Math.round(taskMin(t)), run: null } : t) })); }
export function finishTask(otId, taskId, user) {
  db.update('ots', otId, o => ({ tasks: o.tasks.map(t => t.id === taskId ? { ...t, spent: Math.max(1, Math.round(taskMin(t))), run: null, done: true } : t) }));
  const o = db.get('ots', otId); db.log('taller', `${o.code} · tarea terminada: ${o.tasks.find(t => t.id === taskId)?.desc}`, user);
}
export function addFinding(otId, { text, photo = true, suggest = null }, user) {
  const o = db.get('ots', otId);
  db.update('ots', otId, { findings: [...(o.findings || []), { at: new Date().toISOString(), by: user, text, photo }] });
  if (suggest) addItem(otId, { ...suggest, note: text, photo, prio: suggest.prio || 'recomendado', fromFinding: true });
  db.log('taller', `${o.code} · hallazgo: ${text}`, user);
}
export function requestPart(otId, partId, qty, user, note = '') {
  const o = db.get('ots', otId);
  db.insert('partRequests', { otId, otCode: o.code, partId, qty, mechanicId: user, status: 'solicitado', note });
  db.log('bodega', `${o.code} · ${userName(user)} solicita ${qty}× ${db.get('parts', partId)?.name}`, user);
}
export function deliverPart(reqId, user) {
  const rq = db.get('partRequests', reqId), p = db.get('parts', rq.partId);
  if (!p || p.stock < rq.qty) return false;
  db.update('parts', p.id, { stock: p.stock - rq.qty });
  db.update('partRequests', reqId, { status: 'entregado', deliveredAt: new Date().toISOString(), by: user });
  db.log('bodega', `${rq.otCode} · entregado ${rq.qty}× ${p.name} a ${userName(rq.mechanicId)}`, user);
  return true;
}

// ---------- Entrega ----------
const WMONTHS = { 'Frenos': 6, 'Suspensión': 6, 'Motor': 12, 'Transmisión': 12, 'Electricidad': 12, 'Aire acondicionado': 6, 'Pintura': 24, 'Carrocería': 24, 'Mantención': 3, 'Diagnóstico': 1 };
export function deliver(id, { method, kind = 'boleta' }, user) {
  const o = db.get('ots', id), t = totals(o);
  const inv = db.insert('invoices', { number: +counter('nextInvoice', ''), otId: id, otCode: o.code, customerId: o.customerId, plate: o.plate, kind, parts: t.parts, labor: t.labor, net: t.net, iva: t.iva, total: t.total, customerPaid: t.customerPays, insurerPays: t.total - t.customerPays, issuedAt: new Date().toISOString(), method, paid: true });
  const cats = o.budget.filter(i => i.kind === 'mano' && i.st === 'aprobado').map(i => LABOR.find(l => l[0] === i.laborId)?.[2] || 'Diagnóstico');
  const months = Math.max(3, ...cats.map(c => WMONTHS[c] || 3));
  const w = db.insert('warranties', { code: counter('nextWarranty', 'GAR-'), otId: id, otCode: o.code, plate: o.plate, customerId: o.customerId, desc: o.budget.filter(i => i.kind === 'mano' && i.st === 'aprobado').map(i => i.desc).join(', ') || 'Trabajos de la OT', months, km: months * 2000, from: today(), until: addDays(today(), months * 30), status: 'vigente', claims: [] });
  setStatus(id, 'entregado', user, { deliveredAt: new Date().toISOString(), invoiceId: inv.id, bayId: '' });
  if (o.claimId) db.update('claims', o.claimId, { status: 'pagado' });
  db.update('vehicles', o.vehicleId, v => ({ km: Math.max(v.km || 0, o.km || 0) }));
  db.log('caja', `${o.code} · ${kind} N° ${inv.number} ${clp(t.total)} · garantía ${w.code} (${months} meses)`, user);
  return { inv, w };
}

// ---------- Indicadores ----------
export function stageHours(o) {
  const out = {};
  o.timeline.forEach((e, i) => { const next = o.timeline[i + 1]; const end = next ? Date.parse(next.at) : (o.status === e.s && e.s !== 'entregado' ? Date.now() : null); if (end) out[e.s] = (out[e.s] || 0) + (end - Date.parse(e.at)) / 3600e3; });
  return out;
}
export const openOTs = () => db.query('ots', o => OPEN.includes(o.status));
export function mechLoad(id) {
  const ts = openOTs().flatMap(o => o.tasks.filter(t => t.mech === id && !t.done).map(t => ({ ...t, ot: o })));
  return { tasks: ts, pendingH: ts.reduce((s, t) => s + Math.max(0, t.std - taskMin(t) / 60), 0), running: ts.find(t => t.run) };
}
export function vehicleHistory(v) {
  const sys = db.query('ots', o => o.vehicleId === v.id && o.status === 'entregado').map(o => ({ d: iso(o.deliveredAt), km: o.km, s: o.budget.filter(i => i.st === 'aprobado' && i.kind === 'mano').map(i => i.desc).join(', ') || o.symptom, t: totals(o).total, ot: o.code, otId: o.id }));
  return [...sys, ...(v.history || [])].sort((a, b) => b.d.localeCompare(a.d));
}
