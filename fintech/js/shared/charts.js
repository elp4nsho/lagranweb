// Gráficos extra (barras apiladas, multi-línea) dibujados solo con tokens del tema.
import { escape } from '../../../assets/core/ui.js';

export const PALETTE = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)', 'var(--muted)', 'var(--text)'];

// groups: [{ label, values: { serie: n } }], series: ['a','b']
export function stackedBars(groups, series, { height = 220, format = v => v } = {}) {
  const w = 600, pad = 34;
  const totals = groups.map(g => series.reduce((s, k) => s + (g.values[k] || 0), 0));
  const max = Math.max(1, ...totals);
  const bw = (w - pad) / Math.max(1, groups.length);
  const bars = groups.map((g, i) => {
    let y = height;
    const x = pad + i * bw + bw * .2;
    return `<g>${series.map((k, si) => {
      const v = g.values[k] || 0, hh = (v / max) * (height - 16);
      y -= hh;
      return v ? `<rect x="${x}" y="${y}" width="${bw * .6}" height="${hh}" style="fill:${PALETTE[si % PALETTE.length]}"><title>${escape(g.label)} · ${escape(k)}: ${escape(format(v))}</title></rect>` : '';
    }).join('')}<text x="${x + bw * .3}" y="${height + 16}" text-anchor="middle">${escape(g.label)}</text></g>`;
  }).join('');
  const grid = [0.25, .5, .75, 1].map(p => `<line class="axis" x1="${pad}" x2="${w}" y1="${height - p * (height - 16)}" y2="${height - p * (height - 16)}" stroke-dasharray="3 4" opacity=".6"/><text x="${pad - 4}" y="${height - p * (height - 16) + 4}" text-anchor="end">${escape(short(max * p))}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${height + 24}" role="img">${grid}<line class="axis" x1="${pad}" y1="${height}" x2="${w}" y2="${height}"/>${bars}</svg>
  <div class="legend">${series.map((k, i) => `<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${escape(k)}</span>`).join('')}</div>`;
}

// series: [{ name, points: [{label, value}] }]
export function multiLine(series, { height = 220, format = v => v } = {}) {
  const w = 600, pad = 34;
  const all = series.flatMap(s => s.points.map(p => p.value));
  const max = Math.max(...all), min = Math.min(...all);
  const span = max - min || 1;
  const n = series[0]?.points.length || 1;
  const step = (w - pad * 2) / Math.max(1, n - 1);
  const y = v => height - ((v - min) / span) * (height - 24) - 4;
  const lines = series.map((s, si) => {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${(pad + i * step).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${PALETTE[si % PALETTE.length]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"><title>${escape(s.name)}</title></path>`;
  }).join('');
  const labels = (series[0]?.points || []).map((p, i) => (n <= 12 || i % 2 === 0) ? `<text x="${pad + i * step}" y="${height + 16}" text-anchor="middle">${escape(p.label)}</text>` : '').join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${height + 24}" role="img"><line class="axis" x1="${pad}" y1="${height}" x2="${w - pad}" y2="${height}"/>
    <text x="${pad - 4}" y="${y(max) + 4}" text-anchor="end">${escape(format(max))}</text><text x="${pad - 4}" y="${y(min) + 4}" text-anchor="end">${escape(format(min))}</text>${lines}${labels}</svg>
    ${series.length > 1 ? `<div class="legend">${series.map((s, i) => `<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${escape(s.name)}</span>`).join('')}</div>` : ''}`;
}

export function short(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' mil M';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' M';
  if (a >= 1e3) return Math.round(n / 1e3) + ' mil';
  return String(Math.round(n));
}
