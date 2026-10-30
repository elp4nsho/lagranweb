// Complementos de gráficos: dona con leyenda formateada y barras horizontales.
import { escape } from '../../../assets/core/ui.js';
const PALETTE = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)', 'var(--muted)'];
export function donut(data, { format = v => v, center = '', size = 170 } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1, r = 70, c = 2 * Math.PI * r;
  let off = 0;
  const arcs = data.map((d, i) => { const len = (d.value / total) * c; const s = `<circle r="${r}" cx="90" cy="90" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"><title>${escape(d.label)}: ${escape(format(d.value))}</title></circle>`; off += len; return s; }).join('');
  return `<div class="donut-wrap"><svg class="chart" viewBox="0 0 180 180" style="width:${size}px;max-width:100%;flex:none">${arcs}<text x="90" y="96" text-anchor="middle" style="font-size:18px;font-weight:700;fill:var(--text)">${escape(center)}</text></svg>
    <ul class="legend">${data.map((d, i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${escape(d.label)}</span><b>${escape(format(d.value))}</b><small class="muted">${Math.round(d.value / total * 100)}%</small></li>`).join('')}</ul></div>`;
}
export function hbars(data, { format = v => v, max } = {}) {
  const m = max || Math.max(1, ...data.map(d => d.value));
  return `<div class="bar-list">${data.map(d => `<div class="it"><span>${escape(d.label)}</span><b>${escape(format(d.value))}</b><div class="progress"><i style="--v:${Math.min(100, d.value / m * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>`;
}
