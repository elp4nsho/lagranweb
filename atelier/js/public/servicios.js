// Servicios por línea (performance, estética, EV, diagnóstico) con precios desde el panel.
import { money, escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { LINES } from '../data/catalog.js';
import { programs } from '../shared/domain.js';

const INTRO = {
  performance: ['Más potencia, medida y documentada', 'Reprogramaciones con respaldo del archivo original, piezas de alto flujo y dinamómetro propio para validar cada caballo.'],
  estetica: ['Protección que se nota de cerca', 'Recubrimientos cerámicos, films PPF autorregenerables y detailing de concurso, en una sala con luz calibrada.'],
  ev: ['Especialistas en alta tensión', 'Diagnóstico de salud de batería (SOH), servicio térmico, software y cargadores domiciliarios con declaración SEC.'],
  diagnostico: ['Diagnóstico con herramientas de fábrica', 'Escáneres originales, alineación 3D y frenos de alto desempeño, con presupuesto aprobado en línea.']
};
export function renderServices(el, { line } = {}) {
  const lines = Object.entries(LINES).filter(([k]) => k !== 'mantencion');
  const cur = LINES[line] && line !== 'mantencion' ? line : '';
  const list = db.query('services', s => s.active && (!cur || s.line === cur)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const [t, d] = INTRO[cur] || ['Servicios del atelier', 'Todo lo que tu auto necesita, en un solo lugar y con retiro concierge.'];
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">${cur ? escape(LINES[cur].label) : 'Servicios'}</span><h1>${escape(t)}</h1><p class="lead">${escape(d)}</p></div></div>
    <div class="row" role="tablist"><a class="chip ${!cur ? 'active' : ''}" href="#/servicios">Todos</a>${lines.map(([k, l]) => `<a class="chip ${cur === k ? 'active' : ''}" href="#/servicios/${k}">${l.icon} ${escape(l.short)}</a>`).join('')}<a class="chip" href="#/programas">🔧 Mantención por marca</a></div>
    ${cur === 'ev' ? `<div class="card grid-2" style="align-items:center"><div class="stack"><h3 style="margin:0">¿Cuánta batería le queda a tu eléctrico?</h3><p class="muted" style="margin:0">El informe SOH mide la capacidad real de la batería, el balance de las celdas y la autonomía. Es el documento que piden los compradores de usados eléctricos.</p><a class="btn btn-primary btn-sm" style="align-self:flex-start" href="#/agendar?svc=sv-soh">Agendar diagnóstico SOH</a></div>
      <div class="row" style="justify-content:center"><span class="soh" style="--v:94"><b>94%</b></span><div class="stack small" style="gap:4px"><span>🔋 Capacidad útil: <b>71,4 kWh</b></span><span>⚖️ Desbalance de celdas: <b>12 mV</b></span><span>🛣️ Autonomía real: <b>438 km</b></span></div></div></div>` : ''}
    <div class="grid-3 svc-list-grid">${list.map(s => `<article class="card hover svc-card"><span class="svc-ico" aria-hidden="true">${s.icon}</span><div class="row between"><h3 style="margin:0">${escape(s.name)}</h3>${s.featured ? '<span class="badge badge-primary">Destacado</span>' : ''}</div>
      <p class="muted small" style="margin:0">${escape(s.desc)}</p><ul>${(s.includes || []).map(i => `<li>${escape(i)}</li>`).join('')}</ul>
      <div class="foot"><span><b class="price">${s.priceFrom ? 'desde ' : ''}${money(s.price)}</b><small class="muted d-block">${s.hours} h aprox. · ${escape(LINES[s.line]?.short || '')}</small></span><a class="btn btn-sm btn-primary" href="#/agendar?svc=${s.id}">Agendar</a></div></article>`).join('') || '<div class="card empty">No hay servicios activos en esta línea.</div>'}</div>
    ${!cur ? `<div class="callout">¿Buscas la mantención de tu ${escape(programs().map(p => p.brand).slice(0, 3).join(', '))}…? Revisa los <a href="#/programas">programas por marca</a>.</div>` : ''}
  </div></section>`;
}
