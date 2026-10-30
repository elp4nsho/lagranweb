// Métricas compartidas por dashboard y reportes.
import { db } from '../data/db.js';
import * as ops from '../shared/ops.js';

export const DAY = 864e5;
export const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const onTime = s => s.status === 'entregado' && Date.parse(s.deliveredAt) <= Date.parse(s.slaAt);
export function series(days, fn) {
  const t0 = dayStart(ops.simNow());
  const out = [];
  for (let i = days - 1; i >= 0; i--) { const a = t0 - i * DAY; out.push({ a, b: a + DAY, label: new Date(a).toLocaleDateString('es-CL', days > 14 ? { day: 'numeric' } : { weekday: 'short', day: 'numeric' }) }); }
  return out.map(d => ({ label: d.label, value: fn(d.a, d.b), a: d.a }));
}
export function inRange(list, field, a, b) { return list.filter(s => { const x = Date.parse(s[field]); return x >= a && x < b; }); }
export function summary(days) {
  const t = ops.simNow(), a = dayStart(t) - (days - 1) * DAY;
  const all = db.all('shipments');
  const created = all.filter(s => Date.parse(s.createdAt) >= a);
  const delivered = all.filter(s => s.status === 'entregado' && Date.parse(s.deliveredAt) >= a);
  const rev = created.filter(s => s.status !== 'cancelado').reduce((x, s) => x + s.price, 0);
  const ot = delivered.length ? delivered.filter(onTime).length / delivered.length * 100 : 100;
  const rated = delivered.filter(s => s.rating);
  return { created, delivered, rev, onTime: ot, rating: rated.length ? rated.reduce((x, s) => x + s.rating.stars, 0) / rated.length : 0, failed: created.filter(s => s.status === 'fallido').length, cancelled: created.filter(s => s.status === 'cancelado').length };
}
