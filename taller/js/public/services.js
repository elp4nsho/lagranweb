// Servicios: listado por área y ficha con trabajos típicos y precio referencial (baremo × tarifa).
import { escape, money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { SERVICES } from '../data/catalog.js';
import { laborPrice } from '../shared/domain.js';

const CATS = { mecanica: ['Mantención', 'Frenos', 'Transmisión'], scanner: ['Diagnóstico', 'Electricidad'], motor: ['Motor', 'Transmisión'], suspension: ['Suspensión', 'Frenos'], electricidad: ['Electricidad'], ac: ['Aire acondicionado'], pintura: ['Pintura', 'Carrocería'], siniestros: ['Carrocería', 'Pintura'] };

export function renderServices(el) {
  const groups = [...new Set(SERVICES.map(s => s.cat))];
  el.innerHTML = `<section class="section page-top"><div class="container stack">
    <div data-anim><span class="eyebrow">Servicios</span><h1>Todo lo que tu auto necesita</h1><p class="lead">Trabajamos todas las marcas y segmentos: desde citycars hasta camionetas, SUV y vehículos premium. Precios referenciales; el valor final lo ves y apruebas en tu presupuesto.</p></div>
    ${groups.map(g => `<h2 style="margin:12px 0 0">${escape(g)}</h2><div class="grid-2">${SERVICES.filter(s => s.cat === g).map(s => `<a class="card hover svc-card" href="#/servicios/${s.id}" style="text-decoration:none;color:inherit"><div class="row between nowrap"><span class="svc-ico">${s.icon}</span><span class="small">${s.from ? `desde <b class="price">${money(s.from)}</b>` : '<b>Solo deducible</b>'}</span></div><h3 style="margin:0">${escape(s.name)}</h3><p class="small muted" style="margin:0">${escape(s.desc)}</p><ul class="bullets">${s.bullets.map(b => `<li>${escape(b)}</li>`).join('')}</ul></a>`).join('')}</div>`).join('')}
  </div></section>`;
}

export function renderService(el, { id }) {
  const s = SERVICES.find(x => x.id === id);
  if (!s) { location.hash = '#/servicios'; return; }
  const labor = db.query('labor', l => l.active !== false && (CATS[id] || []).includes(l.cat));
  el.innerHTML = `<section class="section page-top site-hero"><div class="container grid-2" style="align-items:center">
      <div class="hero-text stack" data-anim><a class="small" href="#/servicios">← Servicios</a><span class="svc-hero-ico">${s.icon}</span><h1>${escape(s.name)}</h1><p class="lead">${escape(s.desc)}</p><div class="row"><a class="btn btn-primary btn-lg" href="#/cotizar?s=${s.id}">Cotizar ${escape(s.name.toLowerCase())}</a></div></div>
      <div class="hero-media card stack"><b>Qué incluye</b><ul class="mini-list">${s.bullets.map(b => `<li>✓ ${escape(b)}</li>`).join('')}</ul>${s.from ? `<p class="callout small">Desde <b>${money(s.from)}</b> IVA incluido. Mano de obra a ${money(/Pintura|Carrocería/.test(CATS[id]?.[0]) ? db.getValue('settings').paintRate : db.getValue('settings').laborRate)} por hora según baremo.</p>` : '<p class="callout small">Con seguro pagas solo el deducible de tu póliza.</p>'}</div>
    </div></section>
    ${labor.length ? `<section class="section band"><div class="container stack"><h2>Trabajos frecuentes y tiempos estándar</h2>
      <div class="table-wrap"><table class="table"><thead><tr><th>Trabajo</th><th>Área</th><th class="num">Horas estándar</th><th class="num">Mano de obra ref.</th></tr></thead><tbody>${labor.map(l => `<tr><td><b>${escape(l.name)}</b></td><td>${escape(l.cat)}</td><td class="num">${String(l.hours).replace('.', ',')} h</td><td class="num">${money(laborPrice(l.hours, l.cat))}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">Repuestos aparte, cotizados según marca, modelo y disponibilidad. Siempre apruebas antes de que empecemos.</p></div></section>` : ''}`;
}
