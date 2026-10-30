// Lógica de negocio de Atelier Torque compartida por sitio, panel y apps de rol.
import { money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { WO_STATES, CONC_STATES, LINES } from '../data/catalog.js';
import { round, ymd } from './util.js';

export const settings = () => db.getValue('settings', {});
export const customerById = id => db.get('customers', id);
export const vehicleById = id => db.get('vehicles', id);
export const userById = id => db.get('users', id);
export const tierById = id => db.get('tiers', id);
export const vehicleName = v => v ? `${v.brand} ${v.model}` : '—';
export const vehicleLabel = v => v ? `${v.brand} ${v.model} · ${v.plate}` : '—';
export const isEv = v => v?.fuel === 'electrico';
export const kmFmt = n => `${Math.round(n || 0).toLocaleString('es-CL')} km`;
export const woTotal = wo => (wo.items || []).reduce((a, i) => a + i.qty * i.price, 0);
export const woOpen = wo => !['entregada', 'cancelada'].includes(wo.status);
export const woState = s => WO_STATES[s] || { label: s, badge: '' };
export const concState = s => CONC_STATES[s] || { label: s, badge: '' };
export const lineOf = id => LINES[id] || { label: id, icon: '•', short: id };
export const techs = () => db.query('users', u => u.role === 'tecnico' && u.active !== false);
export const drivers = () => db.query('users', u => u.role === 'chofer' && u.active !== false);

// ---------- Programas por marca ----------
export const programs = (all = false) => db.query('programs', p => all || p.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
export const programFor = brand => db.find('programs', p => p.brand === brand && p.active !== false);
export const modelOf = (p, name) => p?.models.find(m => m.name === name) || null;
export const allModels = () => programs().flatMap(p => p.models.map(m => ({ ...m, brand: p.brand })));
// Próximos servicios del plan de fábrica para un modelo y kilometraje.
export function nextServices({ brand, model, km = 0, fuel }, count = 3, tierId) {
  const p = programFor(brand);
  if (!p) return [];
  const m = modelOf(p, model) || { factor: 1, fuel };
  const ev = (m.fuel || fuel) === 'electrico';
  const disc = (tierById(tierId)?.discount || 0) / 100;
  let n = Math.floor((km || 0) / p.intervalKm) + 1;
  const out = [];
  for (let i = 0; i < count; i++, n++) {
    const level = [...p.levels].sort((a, b) => b.every - a.every).find(l => n % l.every === 0) || p.levels[0];
    const list = round(level.base * (m.factor || 1) * (ev ? .7 : 1));
    out.push({ n, km: n * p.intervalKm, months: n * p.intervalMonths, level, tasks: ev ? (level.tasksEv || level.tasks) : level.tasks, list, price: round(list * (1 - disc)), hours: level.hours, program: p });
  }
  return out;
}

// ---------- Membresías ----------
export const tiers = () => db.query('tiers', t => t.active !== false).sort((a, b) => a.order - b.order);
export function conciergeFee(customer) {
  const t = customer && tierById(customer.tier);
  if (!t) return settings().conciergeFee || 0;
  const used = db.count('concierge', c => c.customerId === customer.id && c.date >= ymd(new Date(Date.now() - 365 * 864e5)) && c.status !== 'cancelado');
  return used < t.conciergeFree ? 0 : settings().conciergeFee || 0;
}

// ---------- Órdenes ----------
export function nextCode() {
  const max = db.all('workOrders').reduce((a, w) => Math.max(a, +String(w.code).slice(3) || 0), 24000);
  return 'OT-' + (max + 1);
}
export function setWoStatus(woId, status, userId, note = '') {
  const wo = db.get('workOrders', woId);
  if (!wo || wo.status === status) return wo;
  const patch = { status, history: [...(wo.history || []), { status, at: new Date().toISOString(), by: userId, note }] };
  if (status === 'entregada') patch.deliveredAt = new Date().toISOString();
  db.update('workOrders', woId, patch);
  // Sincroniza el concierge
  const c = wo.conciergeId && db.get('concierge', wo.conciergeId);
  if (c) {
    if (status === 'lista' && ['en-taller', 'retirado'].includes(c.status)) db.update('concierge', c.id, { status: 'listo' });
    if (['recepcion', 'inspeccion', 'aprobacion', 'en-proceso', 'control'].includes(status) && ['programado', 'en-camino', 'retirado', 'listo'].includes(c.status)) db.update('concierge', c.id, { status: 'en-taller' });
    if (status === 'entregada' && c.status !== 'entregado') db.update('concierge', c.id, { status: 'entregado', delivery: { ...(c.delivery || {}), at: new Date().toISOString() } });
    if (status === 'cancelada') db.update('concierge', c.id, { status: 'cancelado' });
  }
  db.log('ordenes', `${wo.code}: ${WO_STATES[status]?.label || status}${note ? ' · ' + note : ''}`, userId);
  return db.get('workOrders', woId);
}
export function setConcStatus(cId, status, userId, patch = {}) {
  const c = db.get('concierge', cId);
  if (!c) return;
  db.update('concierge', cId, { status, ...patch, ...(status === 'en-camino' ? { startedAt: new Date().toISOString() } : {}), ...(status === 'en-entrega' ? { deliveryStartedAt: new Date().toISOString() } : {}) });
  const wo = db.get('workOrders', c.woId);
  if (wo) {
    if (status === 'en-taller' && wo.status === 'agendada') setWoStatus(wo.id, 'recepcion', userId, 'Recibido por concierge');
    if (status === 'entregado' && wo.status !== 'entregada') setWoStatus(wo.id, 'entregada', userId, 'Entregado por concierge');
  }
  db.log('concierge', `${c.code}: ${CONC_STATES[status]?.label || status}`, userId);
}

// ---------- Inspecciones ----------
export function inspectionStats(ins) {
  const c = { ok: 0, atencion: 0, urgente: 0, pending: 0 };
  (ins?.items || []).forEach(i => { if (i.s) c[i.s]++; else c.pending++; });
  return c;
}
export const pendingApprovals = ins => (ins?.items || []).filter(i => i.rec && i.ap == null);
export function quoteWithApprovals(wo, ins, choice = {}) {
  const base = woTotal(wo);
  const extra = (ins?.items || []).filter((i, k) => i.rec && i.ap == null && choice[k]).reduce((a, i) => a + i.rec.price, 0);
  return { base, extra, total: base + extra };
}
// ---------- Dyno ----------
// Curva sintética a partir de la potencia máxima y su régimen: torque = CV × 7023 / rpm.
export function dynoCurve({ hp, rpm }, redline = 7000, boost = 0) {
  const pts = [];
  for (let x = 2000; x <= redline; x += 250) {
    const f = x <= rpm ? .3 + .7 * Math.pow((x - 2000) / Math.max(1, rpm - 2000), .8 - boost * .25) : 1 - .25 * Math.pow((x - rpm) / Math.max(1, redline - rpm + 400), 1.6);
    const p = hp * Math.min(1, Math.max(.2, f));
    pts.push({ rpm: x, hp: Math.round(p), nm: Math.round(p * 7023 / x) });
  }
  return pts;
}
export const dynoPeakNm = d => Math.max(...dynoCurve(d.before, d.redline).map(p => p.nm));
export const statusBadge = (map, s) => { const m = map[s] || { label: s, badge: '' }; return `<span class="badge ${m.badge ? 'badge-' + m.badge : ''}">${m.label}</span>`; };
export { money };
