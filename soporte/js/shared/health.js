// Salud de cada servicio derivada de los incidentes: barras diarias y disponibilidad.
import { db } from '../data/db.js';
import { IMPACTS } from './constants.js';
import { DAY } from './util.js';

// Peor impacto de cada día y disponibilidad estimada por servicio (derivada de los incidentes).
export function serviceHealth(svcId, days = 90) {
  const incs = db.query('incidents', i => i.serviceIds.includes(svcId));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let lost = 0;
  const bars = [];
  for (let d = days - 1; d >= 0; d--) {
    const s = today.getTime() - d * DAY, e = s + DAY;
    let worst = 0, list = [];
    incs.forEach(i => {
      const a = new Date(i.createdAt).getTime(), b = i.resolvedAt ? new Date(i.resolvedAt).getTime() : Date.now();
      const ov = Math.min(b, e) - Math.max(a, s);
      if (ov > 0) { worst = Math.max(worst, IMPACTS[i.impact].w); lost += ov * { menor: .15, mayor: .5, critico: 1 }[i.impact]; list.push(i.title); }
    });
    bars.push({ day: s, level: worst, list });
  }
  const active = incs.filter(i => i.status !== 'resuelto');
  const level = Math.max(0, ...active.map(i => IMPACTS[i.impact].w));
  return { bars, uptime: 100 - lost / (days * DAY) * 100, level, active };
}
export const LEVEL = [{ name: 'Operativo', cls: 'ok' }, { name: 'Degradado', cls: 'minor' }, { name: 'Interrupción parcial', cls: 'major' }, { name: 'Caída total', cls: 'crit' }];

