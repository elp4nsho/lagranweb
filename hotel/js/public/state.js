// Estado del motor de reservas (persistido en la pestaña del visitante).
import { today, addDays } from '../shared/dates.js';

const KEY = 'lgw:hotel:booking';
const fresh = () => ({ checkIn: addDays(today(), 7), checkOut: addDays(today(), 9), adults: 2, children: 0, promo: '', typeId: '', extras: {}, guest: {} });
let s;
try { s = { ...fresh(), ...(JSON.parse(sessionStorage.getItem(KEY)) || {}) }; } catch (e) { s = fresh(); }
if (s.checkIn < today()) { const f = fresh(); s.checkIn = f.checkIn; s.checkOut = f.checkOut; }

export const booking = {
  get: () => s,
  set(patch) { s = { ...s, ...patch }; try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* sin storage */ } return s; },
  reset() { s = fresh(); try { sessionStorage.removeItem(KEY); } catch (e) { /* sin storage */ } return s; }
};
