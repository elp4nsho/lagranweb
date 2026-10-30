// Gráficos complementarios (SVG con tokens): dona, barras horizontales, barras apiladas, embudo, medidor.
import { escape } from '../../../assets/core/ui.js';
export const PALETTE = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)', 'var(--text)', 'var(--muted)'];

export function donut(data, { format = v => v, center = '', size = 170 } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1, r = 70, c = 2 * Math.PI * r;
  let off = 0;
  const arcs = data.map((d, i) => { const len = (d.value / total) * c; const s = `<circle r="${r}" cx="90" cy="90" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"><title>${escape(d.label)}: ${escape(format(d.value))}</title></circle>`; off += len; return s; }).join('');
  return `<div class="donut-wrap"><svg class="chart" viewBox="0 0 180 180" style="width:${size}px;max-width:100%;flex:none">${arcs}<text x="90" y="96" text-anchor="middle" style="font-size:18px;font-weight:700;fill:var(--text)">${escape(center)}</text></svg>
    <ul class="legend">${data.map((d, i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${escape(d.label)}</span><b>${escape(format(d.value))}</b><small class="muted">${Math.round(d.value / total * 100)}%</small></li>`).join('')}</ul></div>`;
}
export function hbars(data, { format = v => v, max } = {}) {
  const m = max || Math.max(1, ...data.map(d => d.value));
  return `<div class="bar-list">${data.map(d => `<div class="it"><span>${d.html || escape(d.label)}</span><b>${escape(format(d.value))}</b><div class="progress"><i style="--v:${Math.min(100, d.value / m * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>`;
}
// rows: [{ label, values: { key: n } }], keys: [{ key, label }]
export function stackedBars(rows, keys, { height = 220, format = v => v } = {}) {
  const w = 600, pad = 30, max = Math.max(1, ...rows.map(r => keys.reduce((s, k) => s + (r.values[k.key] || 0), 0)));
  const bw = (w - pad) / rows.length;
  const bars = rows.map((r, i) => {
    let y = height; const x = pad + i * bw + bw * .16, tot = keys.reduce((s, k) => s + (r.values[k.key] || 0), 0);
    const segs = keys.map((k, j) => { const v = r.values[k.key] || 0, h = v / max * (height - 18); y -= h; return v ? `<rect x="${x}" y="${y}" width="${bw * .68}" height="${h}" style="fill:${PALETTE[j % PALETTE.length]}"><title>${escape(r.label)} · ${escape(k.label)}: ${escape(format(v))}</title></rect>` : ''; }).join('');
    return `<g>${segs}<text x="${x + bw * .34}" y="${y - 4}" text-anchor="middle" style="font-weight:700;fill:var(--text)">${tot}</text><text x="${x + bw * .34}" y="${height + 16}" text-anchor="middle">${escape(r.label)}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${height + 24}" role="img"><line class="axis" x1="${pad}" y1="${height}" x2="${w}" y2="${height}"/>${bars}</svg>
    <ul class="legend-inline">${keys.map((k, j) => `<li><i style="background:${PALETTE[j % PALETTE.length]}"></i>${escape(k.label)}</li>`).join('')}</ul>`;
}
// Embudo de conversión
export function funnel(steps) {
  const top = Math.max(1, steps[0]?.value || 1);
  return `<div class="funnel">${steps.map((s, i) => `<div class="funnel-step"><span class="funnel-lbl">${escape(s.label)}</span><div class="funnel-track"><div class="funnel-bar" style="--w:${Math.max(3, s.value / top * 100).toFixed(1)}%"></div></div><b>${s.value}</b><small class="muted">${i ? Math.round(s.value / Math.max(1, steps[i - 1].value) * 100) + '%' : '100%'}</small></div>`).join('')}</div>`;
}
// Medidor semicircular (score crediticio, ocupación…)
export function gauge(value, { min = 300, max = 950, label = '', tone = 'primary' } = {}) {
  const p = Math.max(0, Math.min(1, (value - min) / (max - min))), r = 80, c = Math.PI * r;
  return `<svg class="chart gauge" viewBox="0 0 200 120" role="img" aria-label="${escape(label)} ${value}">
    <path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="var(--surface-3)" stroke-width="16" stroke-linecap="round"/>
    <path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="var(--${tone})" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}"/>
    <text x="100" y="92" text-anchor="middle" style="font-size:30px;font-weight:800;fill:var(--text)">${escape(value)}</text>
    <text x="100" y="114" text-anchor="middle" style="font-size:11px">${escape(label)}</text></svg>`;
}
// Mini barra de progreso con etiqueta
export const meter = (pct, tone = '') => `<div class="progress ${tone ? 'tone-' + tone : ''}"><i style="--v:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></div>`;
