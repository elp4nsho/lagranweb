// Motor de tarifas puro (sin DB): temporada × fin de semana × tarifa base del tipo.
import { parse, isWeekendNight, eachNight } from '../shared/dates.js';

const md = s => s.slice(5); // 'MM-DD'
export function seasonFor(day, seasons) {
  const k = md(day);
  const hits = seasons.filter(s => s.active !== false && (s.from <= s.to ? k >= s.from && k <= s.to : k >= s.from || k <= s.to));
  return hits.sort((a, b) => b.multiplier - a.multiplier)[0] || null;
}
export function rateFor(type, day, seasons, settings) {
  const s = seasonFor(day, seasons);
  const mult = (s ? s.multiplier : 1) * (isWeekendNight(day) ? (settings.weekendMult || 1) : 1);
  return { rate: Math.round(type.baseRate * mult / 1000) * 1000, season: s?.name || 'Regular' };
}
export function quoteCore(type, checkIn, checkOut, { seasons, settings, extras = [], extrasCatalog = [], adults = 2, children = 0, offer = null }) {
  const nights = eachNight(checkIn, checkOut).map(d => ({ date: d, ...rateFor(type, d, seasons, settings) }));
  const roomTotal = nights.reduce((a, n) => a + n.rate, 0);
  const n = nights.length;
  const extrasLines = extras.map(e => {
    const c = extrasCatalog.find(x => x.id === e.extraId); if (!c) return null;
    const units = c.per === 'noche' ? n * (e.qty || 1) : c.per === 'persona-noche' ? n * (adults + children) * (e.qty || 1) : (e.qty || 1);
    return { extraId: c.id, name: c.name, qty: e.qty || 1, units, price: c.price, total: c.price * units };
  }).filter(Boolean);
  const extrasTotal = extrasLines.reduce((a, l) => a + l.total, 0);
  const discount = offer && n >= (offer.minNights || 1) ? Math.round(roomTotal * offer.discountPct / 100) : 0;
  return { nights, n, roomTotal, extrasLines, extrasTotal, discount, total: roomTotal + extrasTotal - discount, offerCode: discount ? offer.code : '' };
}
export { parse };
