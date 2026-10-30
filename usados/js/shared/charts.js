// Gráficos SVG propios (multi-serie) pintados con tokens del tema.
import { escape } from '../../../assets/core/ui.js';

// multiLine({ x: [...labels], series: [{ name, values, color, dash, axis: 'left'|'right' }], height, leftLabel, rightLabel })
export function multiLine({ x, series, height = 240, leftLabel = '', rightLabel = '', xLabel = '' }) {
  const w = 640, pl = 46, pr = 46, pt = 14, pb = 34;
  const left = series.filter(s => s.axis !== 'right'), right = series.filter(s => s.axis === 'right');
  const maxOf = arr => Math.max(1, ...arr.flatMap(s => s.values)) * 1.08;
  const ml = maxOf(left), mr = right.length ? maxOf(right) : 1;
  const sx = i => pl + (i / Math.max(1, x.length - 1)) * (w - pl - pr);
  const sy = (v, m) => pt + (1 - v / m) * (height - pt - pb);
  const ticks = [0, .25, .5, .75, 1];
  const grid = ticks.map(t => { const y = pt + (1 - t) * (height - pt - pb); return `<line x1="${pl}" y1="${y}" x2="${w - pr}" y2="${y}" class="grid"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end">${Math.round(ml * t)}</text>${right.length ? `<text x="${w - pr + 6}" y="${y + 4}">${Math.round(mr * t)}</text>` : ''}`; }).join('');
  const every = Math.ceil(x.length / 10);
  const xl = x.map((l, i) => i % every === 0 ? `<text x="${sx(i)}" y="${height - pb + 16}" text-anchor="middle">${escape(l)}</text>` : '').join('');
  const lines = series.map(s => {
    const m = s.axis === 'right' ? mr : ml;
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v, m).toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="${s.width || 2.6}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"><title>${escape(s.name)}</title></path>`;
  }).join('');
  return `<svg class="chart mchart" viewBox="0 0 ${w} ${height}" role="img">${grid}
    <line x1="${pl}" y1="${height - pb}" x2="${w - pr}" y2="${height - pb}" class="axis"/>${xl}
    ${leftLabel ? `<text x="4" y="${pt - 2}" class="lab">${escape(leftLabel)}</text>` : ''}${rightLabel ? `<text x="${w - 4}" y="${pt - 2}" text-anchor="end" class="lab">${escape(rightLabel)}</text>` : ''}
    ${xLabel ? `<text x="${(w) / 2}" y="${height - 2}" text-anchor="middle" class="lab">${escape(xLabel)}</text>` : ''}
    ${lines}</svg>
    <div class="legend">${series.map(s => `<span><i style="background:${s.color}${s.dash ? ';opacity:.6' : ''}"></i>${escape(s.name)}</span>`).join('')}</div>`;
}

// Barras apiladas por mes: stacked({ labels, series: [{ name, values, color }] })
export function stacked({ labels, series, height = 200, format = v => v }) {
  const w = 600, pad = 28;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const max = Math.max(1, ...totals), bw = (w - pad) / labels.length;
  const bars = labels.map((l, i) => {
    let y = height;
    const segs = series.map(s => { const h = ((s.values[i] || 0) / max) * (height - 16); y -= h; return `<rect x="${pad + i * bw + bw * .18}" y="${y}" width="${bw * .64}" height="${h}" style="fill:${s.color}"><title>${escape(l)} · ${escape(s.name)}: ${escape(format(s.values[i] || 0))}</title></rect>`; }).join('');
    return `<g>${segs}<text x="${pad + i * bw + bw * .5}" y="${height + 16}" text-anchor="middle">${escape(l)}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${height + 24}" role="img"><line class="axis" x1="${pad}" y1="${height}" x2="${w}" y2="${height}"/>${bars}</svg>
    <div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${escape(s.name)}</span>`).join('')}</div>`;
}

// Barras horizontales simples con etiqueta y valor.
export function hbars(data, { format = v => v, max } = {}) {
  const m = max || Math.max(1, ...data.map(d => d.value));
  return `<div class="hbars">${data.map(d => `<div class="hbar"><span class="hb-l">${escape(d.label)}</span><span class="hb-t"><i style="width:${Math.max(2, d.value / m * 100)}%;${d.color ? `background:${d.color}` : ''}"></i></span><b>${escape(format(d.value))}</b></div>`).join('')}</div>`;
}
