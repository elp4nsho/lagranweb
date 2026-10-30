// Plano del salón (compartido por garzón y editor de mesas). Coordenadas en % (lienzo 100 × 62).
import { escape } from '../../../assets/core/ui.js';
import { tableState, TABLE_STATES } from './logic.js';

export const ZONES = [
  { name: 'Salón', x: 0, y: 0, w: 62, h: 62 },
  { name: 'Terraza', x: 62, y: 0, w: 38, h: 62 },
  { name: 'Barra', x: 43, y: 45, w: 19, h: 17 }
];
export const H = 62;

export function tableSize(t) {
  const w = t.shape === 'rect' ? 6 + t.seats * 1.1 : 6 + t.seats * .45;
  const h = t.shape === 'rect' ? 7.5 : w;
  return { w, h };
}

export function floorHtml(tables, { selected = null, extra = () => '' } = {}) {
  return `<div class="floor" role="group" aria-label="Plano del salón">
    ${ZONES.map(z => `<div class="zone zone-${z.name === 'Barra' ? 'bar' : z.name === 'Terraza' ? 'terrace' : 'hall'}" style="left:${z.x}%;top:${z.y / H * 100}%;width:${z.w}%;height:${z.h / H * 100}%"><span>${escape(z.name)}</span></div>`).join('')}
    ${tables.map(t => {
      const s = tableState(t), sz = tableSize(t);
      return `<button type="button" class="tbl shape-${t.shape} st-${s} ${selected === t.id ? 'sel' : ''}" data-t="${t.id}" style="left:${t.x}%;top:${t.y / H * 100}%;width:${sz.w}%;height:${sz.h / H * 100}%" aria-label="Mesa ${t.number}, ${TABLE_STATES[s].label}, ${t.seats} personas">
        <b>${t.number}</b><small>${t.seats}p</small>${extra(t)}</button>`;
    }).join('')}
  </div>`;
}

export const legendHtml = () => `<div class="row legend">${Object.entries(TABLE_STATES).map(([k, v]) => `<span class="lg-item"><i class="lg-dot st-${k}"></i>${v.label}</span>`).join('')}</div>`;
