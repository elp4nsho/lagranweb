// Credencial de visita imprimible con código tipo QR decorativo (no escaneable).
import { modal, escape, date } from '../../../assets/core/ui.js';
import { hash, initials } from './util.js';

export function qrSVG(text) {
  const N = 25; let seed = hash(text); const cells = [];
  const rnd = () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; seed ^= seed >>> 13; return (seed >>> 0) / 4294967296; };
  for (let y = 0; y < N; y++) { cells.push([]); for (let x = 0; x < N; x++) cells[y].push(rnd() < .48); }
  const finder = (ox, oy) => { for (let yy = -1; yy <= 7; yy++) for (let xx = -1; xx <= 7; xx++) { const X = ox + xx, Y = oy + yy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue; cells[Y][X] = xx >= 0 && xx <= 6 && yy >= 0 && yy <= 6 && (xx === 0 || xx === 6 || yy === 0 || yy === 6 || (xx >= 2 && xx <= 4 && yy >= 2 && yy <= 4)); } };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  let d = '';
  for (let r = 0; r < N; r++) { let run = -1; for (let c = 0; c <= N; c++) { const on = c < N && cells[r][c]; if (on && run < 0) run = c; if (!on && run >= 0) { d += `M${run} ${r}h${c - run}v1h-${c - run}z`; run = -1; } } }
  // El código va en blanco y negro para que siempre se lea (es una ilustración).
  return `<svg class="badge-qr" viewBox="-2 -2 ${N + 4} ${N + 4}" role="img" aria-label="Código de la credencial"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><path d="${d}" fill="#111" shape-rendering="crispEdges"/></svg>`;
}

export function badgeHTML(v, { company, host, where, wifi }) {
  return `<div class="visit-badge" id="visitBadge">
    <div class="vb-top"><span class="vb-co"><span class="vb-logo">${escape(company?.short || '')}</span>${escape(company?.name || '')}</span><span class="vb-kind">VISITA</span></div>
    <div class="vb-body">
      <span class="avatar" style="--size:64px;--av:var(--primary)" aria-hidden="true">${escape(initials(v.name))}</span>
      <div class="vb-name">${escape(v.name)}</div>${v.org ? `<div class="muted">${escape(v.org)}</div>` : ''}
      <dl class="vb-dl"><dt>Visita a</dt><dd>${escape(host?.name || '—')}</dd><dt>Destino</dt><dd>${escape(where || 'Recepción')}</dd><dt>Motivo</dt><dd>${escape(v.reason)}</dd><dt>Fecha</dt><dd>${escape(date(v.checkIn || new Date()))}</dd>${wifi ? `<dt>Wi-Fi</dt><dd>${escape(wifi)}</dd>` : ''}</dl>
      ${qrSVG(v.code + v.name)}<div class="vb-code mono">${escape(v.code)}</div>
    </div>
    <div class="vb-foot">Válida solo por hoy · Devuélvela en recepción al salir</div></div>`;
}

export function showBadge(v, ctx) {
  const m = modal({ title: 'Credencial de visita', body: badgeHTML(v, ctx), foot: '<button type="button" class="btn btn-ghost" data-print>🖨 Imprimir</button><button type="button" class="btn btn-primary" data-close>Listo</button>' });
  m.el.querySelector('[data-print]').onclick = () => {
    document.body.classList.add('printing-badge');
    const done = () => { document.body.classList.remove('printing-badge'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  };
  return m;
}
