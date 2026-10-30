// Lógica de negocio de Ruta Certificada: precios, financiamiento (cuota y CAE), tasación, certificación y flujo de inventario.
import { money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { MODELS, CAR_STATES, POINTS, INSPECTION, CONDITIONS } from '../data/catalog.js';
import { marketValue, listPrice } from '../data/seed.js';

export const settings = () => db.getValue('settings', {});
export const carName = c => c ? `${c.brand} ${c.model}` : '—';
export const carTitle = c => c ? `${c.brand} ${c.model} ${c.version || ''} ${c.year}`.replace(/\s+/g, ' ') : '—';
export const kmFmt = n => `${Math.round(n || 0).toLocaleString('es-CL')} km`;
export const branchById = id => db.get('branches', id);
export const userById = id => db.get('users', id);
export const reconCost = c => (c?.recon || []).reduce((a, x) => a + x.amount, 0);
export const daysInStock = c => Math.round(((c.soldAt ? new Date(c.soldAt) : Date.now()) - new Date(c.acquiredAt)) / 864e5);
export const isVisible = c => ['publicado', 'reservado'].includes(c.status);
export const statusBadge = (map, s) => { const m = map[s] || { label: s, badge: '' }; return `<span class="badge ${m.badge ? 'badge-' + m.badge : ''}">${m.label}</span>`; };
export const sellers = () => db.query('users', u => u.role === 'vendedor' && u.active !== false);
export { marketValue, listPrice, money };

// ---------- Financiamiento ----------
// Cuota francesa + seguros y gastos; CAE = tasa mensual efectiva (IRR) × 12, como exige la norma chilena.
export function simulate({ price, pie, cuotas, tasa }) {
  const M = Math.max(0, price - pie), i = tasa / 100;
  const gastos = Math.round(M * .02 + 89000), seguro = Math.round(M * .00045);
  const base = i ? (M + gastos) * i / (1 - Math.pow(1 + i, -cuotas)) : (M + gastos) / cuotas;
  const cuota = Math.round(base + seguro);
  let lo = 0, hi = .2;
  for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; const pv = cuota * (1 - Math.pow(1 + mid, -cuotas)) / mid; pv > M ? (lo = mid) : (hi = mid); }
  return { monto: M, gastos, seguro, cuota, total: cuota * cuotas + pie, cae: Math.round(lo * 12 * 1000) / 10, costoTotal: cuota * cuotas };
}

// ---------- Tasación ----------
export function modelInfo(brand, model) { return MODELS.find(m => m.brand.toLowerCase() === String(brand).toLowerCase() && m.model.toLowerCase() === String(model).toLowerCase()) || null; }
export function valuate({ brand, model, year, km, condition }) {
  const m = modelInfo(brand, model) || { newPrice: avgNew(brand) };
  const v = marketValue(m, +year, +km) * (CONDITIONS[condition]?.[1] || .9);
  return { market: Math.round(v / 10000) * 10000, min: Math.round(v * .8 / 10000) * 10000, max: Math.round(v * .88 / 10000) * 10000, known: !!modelInfo(brand, model) };
}
function avgNew(brand) { const l = MODELS.filter(m => m.brand.toLowerCase() === String(brand).toLowerCase()); return l.length ? l.reduce((a, m) => a + m.newPrice, 0) / l.length : 16000000; }

// ---------- Certificación ----------
export function inspectionSummary(ins) {
  const r = ins?.results || '';
  const cats = INSPECTION.map(([cat], ci) => { const s = r.slice(ci * 15, ci * 15 + 15); return { cat, p: [...s].filter(x => x === 'p').length, o: [...s].filter(x => x === 'o').length, f: [...s].filter(x => x === 'f').length, pend: [...s].filter(x => x === '-').length }; });
  const tot = k => cats.reduce((a, c) => a + c[k], 0);
  return { cats, p: tot('p'), o: tot('o'), f: tot('f'), pend: tot('pend'), score: Math.round(tot('p') / 150 * 1000) / 10 };
}
export const pointName = i => POINTS[i]?.name || '';

// ---------- Inventario ----------
export function setCarStatus(id, status, userId, note = '') {
  const c = db.get('cars', id);
  if (!c) return;
  const patch = { status };
  if (status === 'publicado' && !c.publishedAt) patch.publishedAt = new Date().toISOString();
  if (status === 'vendido' && !c.soldAt) { patch.soldAt = new Date().toISOString(); patch.soldPrice = c.soldPrice || c.price; }
  db.update('cars', id, patch);
  db.log('inventario', `${c.stock} ${carName(c)}: ${CAR_STATES[status]?.label || status}${note ? ' · ' + note : ''}`, userId);
}
export const nextCode = (col, prefix, start) => prefix + (db.all(col).reduce((a, x) => Math.max(a, +String(x.code || '').replace(/\D/g, '') || 0), start) + 1);
export const nextStock = () => 'RC-' + (db.all('cars').reduce((a, c) => Math.max(a, +c.stock.slice(3) || 0), 1000) + 1);

// Precio vs mercado: avisos comparables sintéticos (deterministas por auto) alrededor del valor de mercado.
export function comparables(c) {
  let s = [...c.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 7 }, (_, i) => ({ km: Math.max(5000, Math.round(c.km * (.7 + rnd() * .6) / 1000) * 1000), price: Math.round(c.marketPrice * (.9 + rnd() * .22) / 10000) * 10000, src: ['Portal A', 'Portal B', 'Automotora', 'Particular'][i % 4] }));
}
// Carrito y comparador: comodidades por visitante (navegador), con respaldo en memoria si no hay almacenamiento.
const mem = {};
const store = (kind, key) => ({
  get() { try { const v = window[kind].getItem(key); if (v != null) return JSON.parse(v); } catch (e) { /* sin almacenamiento */ } return mem[key] || []; },
  set(v) { mem[key] = v; try { window[kind].setItem(key, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } window.dispatchEvent(new Event(key)); }
});
const cart = store('localStorage', 'ruta:cart'), cmp = store('sessionStorage', 'ruta:compare');
export const cartGet = () => cart.get(), cartSet = v => cart.set(v), compareGet = () => cmp.get(), compareSet = v => cmp.set(v);
export const POINTS_N = POINTS.length;
