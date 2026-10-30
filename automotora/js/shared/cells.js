// Celdas compactas reutilizables.
import { escape } from '../../../assets/core/ui.js';
import { model, brand, color } from './domain.js';
import { carSVG } from './car.js';
export const carCellHTML = (modelId, colorId, sub = '', hex) => { const m = model(modelId); if (!m) return '—'; const c = color(m, colorId) || m.colors[1] || m.colors[0]; return `<div class="cell-car">${carSVG({ body: m.body, paint: hex || c.hex, fuel: m.fuel })}<span><b>${escape(brand(m.brandId)?.name)} ${escape(m.name)}</b><small>${sub}</small></span></div>`; };
