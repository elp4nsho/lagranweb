// Visualizaciones SVG propias de Sentinela (solo tokens del tema): gráfico en vivo,
// medidor tipo gauge, mapa de sitio y sparkline.
import { escape } from '../../../assets/core/ui.js';
import { STATUS_COLOR } from './sim.js';

// points: [{t, v}] ; thresholds: [{ value, label }]
export function lineSvg(points, { height = 180, thresholds = [], dec = 1, unit = '', timeFmt = t => new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), color = 'var(--primary)' } = {}) {
  const w = 600, padL = 46, padB = 22;
  const vals = points.map(p => p.v).filter(v => v != null);
  if (!vals.length) return `<svg class="chart" viewBox="0 0 ${w} ${height}"><text x="${w / 2}" y="${height / 2}" text-anchor="middle">Sin datos</text></svg>`;
  let min = Math.min(...vals, ...thresholds.map(t => t.value)), max = Math.max(...vals, ...thresholds.map(t => t.value));
  const span = (max - min) || 1; min -= span * .08; max += span * .08;
  const t0 = points[0].t, t1 = points.at(-1).t;
  const x = t => padL + ((t - t0) / ((t1 - t0) || 1)) * (w - padL - 8);
  const y = v => 8 + (1 - (v - min) / (max - min)) * (height - padB - 8);
  let d = '', pen = false;
  points.forEach(p => { if (p.v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`; pen = true; });
  const last = [...points].reverse().find(p => p.v != null);
  const ticks = [0, .5, 1].map(f => min + (max - min) * f);
  return `<svg class="chart" viewBox="0 0 ${w} ${height}" role="img">
    ${ticks.map(v => `<line class="axis" x1="${padL}" x2="${w - 8}" y1="${y(v)}" y2="${y(v)}" stroke-dasharray="2 5" opacity=".5"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(dec)}</text>`).join('')}
    ${thresholds.map(t => `<line x1="${padL}" x2="${w - 8}" y1="${y(t.value)}" y2="${y(t.value)}" stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${w - 10}" y="${y(t.value) - 4}" text-anchor="end" style="fill:var(--danger)">${escape(t.label)}</text>`).join('')}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" class="live-line"/>
    ${last ? `<circle cx="${x(last.t)}" cy="${y(last.v)}" r="4" fill="${color}"/>` : ''}
    <text x="${padL}" y="${height - 4}">${escape(timeFmt(t0))}</text><text x="${w - 8}" y="${height - 4}" text-anchor="end">${escape(timeFmt(t1))}</text>
    ${unit ? `<text x="4" y="12">${escape(unit)}</text>` : ''}
  </svg>`;
}

// Medidor semicircular.
export function gauge(v, { min = 0, max = 100, label = '', text = '', state = 'ok' } = {}) {
  const f = v == null ? 0 : Math.max(0, Math.min(1, (v - min) / (max - min)));
  const R = 80, cx = 100, cy = 96, len = Math.PI * R;
  const arc = `M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`;
  return `<svg class="gauge" viewBox="0 0 200 120" role="img" aria-label="${escape(label)} ${escape(text)}">
    <path d="${arc}" fill="none" stroke="var(--surface-3)" stroke-width="16" stroke-linecap="round"/>
    <path d="${arc}" fill="none" stroke="${STATUS_COLOR[state] || 'var(--primary)'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(len * f).toFixed(1)} ${len.toFixed(1)}" class="gauge-val"/>
    <text x="100" y="86" text-anchor="middle" class="gauge-text">${escape(text)}</text>
    <text x="${cx - R}" y="116" text-anchor="middle" class="gauge-mm">${min}</text><text x="${cx + R}" y="116" text-anchor="middle" class="gauge-mm">${max}</text>
  </svg>`;
}

export function sparkline(points, { w = 120, h = 32 } = {}) {
  const vals = points.map(p => p.v).filter(v => v != null);
  if (!vals.length) return '';
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const d = points.map((p, i) => p.v == null ? '' : `${i ? 'L' : 'M'}${(i / (points.length - 1) * w).toFixed(1)},${(h - 2 - (p.v - min) / span * (h - 4)).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--primary)" stroke-width="1.6"/></svg>`;
}

// Mapa de un sitio: zonas + puntos de sensores coloreados por estado.
export function siteMap(site, zones, devices, statusOf, { selected = null, placing = null } = {}) {
  const water = site.kind === 'cultivo';
  return `<svg class="site-map" viewBox="0 0 1000 600" role="img" aria-label="Mapa de ${escape(site.name)}">
    <defs><pattern id="grid-${site.id}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="var(--line)" stroke-width=".6" opacity=".5"/></pattern></defs>
    <rect x="0" y="0" width="1000" height="600" fill="var(--surface-2)"/>
    <rect x="0" y="0" width="1000" height="600" fill="url(#grid-${site.id})"/>
    ${water ? '<path d="M0 560 Q 250 530 500 560 T 1000 560" fill="none" stroke="var(--info)" stroke-width="2" opacity=".5"/><path d="M0 585 Q 250 555 500 585 T 1000 585" fill="none" stroke="var(--info)" stroke-width="2" opacity=".35"/><text x="980" y="548" text-anchor="end" class="map-label muted-label">Seno de Reloncaví</text>' : ''}
    ${zones.map(z => z.shape === 'circle'
      ? `<g class="zone"><circle cx="${z.x}" cy="${z.y}" r="${z.w / 2}" fill="var(--surface)" stroke="var(--text)" stroke-width="2" stroke-dasharray="${water ? '6 4' : '0'}" opacity=".9"/><text x="${z.x}" y="${z.y - z.w / 2 - 8}" text-anchor="middle" class="map-label">${escape(z.name)}</text></g>`
      : `<g class="zone"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" fill="var(--surface)" stroke="var(--text)" stroke-width="2" opacity=".9"/><text x="${z.x + 10}" y="${z.y + 22}" class="map-label">${escape(z.name)}</text></g>`).join('')}
    ${devices.map(d => { const st = statusOf(d); return `<g class="dot ${st} ${selected === d.id ? 'sel' : ''}" data-dev="${d.id}" tabindex="0" role="button" aria-label="${escape(d.name)}"><circle cx="${d.x}" cy="${d.y}" r="20" fill="${STATUS_COLOR[st]}" opacity=".22" class="halo"/><circle cx="${d.x}" cy="${d.y}" r="10" fill="${STATUS_COLOR[st]}" stroke="var(--surface)" stroke-width="3"/><title>${escape(d.name)}</title></g>`; }).join('')}
    ${placing ? `<g class="placing"><circle cx="${placing.x}" cy="${placing.y}" r="14" fill="none" stroke="var(--accent)" stroke-width="3"/><circle cx="${placing.x}" cy="${placing.y}" r="5" fill="var(--accent)"/></g>` : ''}
  </svg>`;
}

// Convierte un clic en coordenadas del viewBox 1000×600.
export function svgPoint(svg, evt) {
  const r = svg.getBoundingClientRect();
  return { x: Math.round((evt.clientX - r.left) / r.width * 1000), y: Math.round((evt.clientY - r.top) / r.height * 600) };
}
