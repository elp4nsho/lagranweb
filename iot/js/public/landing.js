// Página de producto de Sentinela. Hero con mini-panel en vivo (simulación real), planes
// editables desde el admin y formulario de contacto que crea leads en la base de datos.
import { db, site } from '../data/db.js';
import { money, $, toast } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { publicHeader, publicFooter, wirePublicHeader } from '../shared/layout.js';
import { value, fmt, status, history, TYPES } from '../shared/sim.js';
import { lineSvg, gauge } from '../shared/viz.js';

const FEATURES = [
  ['📡', 'Telemetría en tiempo real', 'Lecturas cada segundo de oxígeno, temperatura, pH, energía y vibración, con gráficos en vivo.'],
  ['🗺️', 'Mapa de planta', 'Ubica cada sensor en el plano de tu centro o planta y ve su estado por color.'],
  ['🚨', 'Alarmas inteligentes', 'Umbrales con duración mínima, severidad, reconocimiento, asignación y escalamiento.'],
  ['🛠️', 'Órdenes de trabajo', 'Convierte una alarma en una OT con checklist y responsable en un clic.'],
  ['⚡', 'Reportes de energía', 'Consumo por zona, costo estimado en CLP y comparación entre periodos.'],
  ['📺', 'Modo pantalla', 'Vista para la sala de control con KPIs gigantes y alarmas activas.'],
];
const CASES = [
  ['🐟', 'Salmonicultura', 'Evita mortalidades por baja de oxígeno: alarmas en jaulas y aireación a tiempo.'],
  ['❄️', 'Cadena de frío', 'Cámaras bajo −18 °C con registro auditable y alertas por apertura de puertas.'],
  ['⚙️', 'Mantención predictiva', 'Vibración de compresores y motores según ISO 10816 para anticipar fallas.'],
  ['🌱', 'Cumplimiento ambiental', 'pH de efluentes RILes monitoreado para cumplir la norma de descarga.'],
];

let timer;
function render() {
  const s = site();
  $('#head').innerHTML = publicHeader();
  $('#foot').innerHTML = publicFooter();
  $('#landing').innerHTML = h`
  <section class="hero site-hero"><div class="container hero-grid">
    <div class="hero-text" data-anim>
      <span class="eyebrow">${s.hero.eyebrow}</span>
      <h1>${s.hero.title}</h1>
      <p class="lead">${s.hero.subtitle}</p>
      <div class="row" style="margin-top:24px"><a class="btn btn-primary btn-lg" href="login.html">${s.hero.cta}</a><a class="btn btn-lg" href="#precios">Ver planes</a></div>
      <p class="small muted" style="margin-top:14px">Datos simulados de un cliente ficticio: Acuícola Fiordo, Los Lagos.</p>
    </div>
    <div class="card stack hero-media" data-anim data-anim-delay="150">
      <div class="row between"><b>Jaula 4 · oxígeno disuelto</b><span class="live-pill">EN VIVO</span></div>
      <div data-hero-chart></div>
      <div class="grid-3" data-hero-gauges></div>
    </div>
  </div></section>
  <section class="section" id="funciones" style="padding-top:0"><div class="container">
    <div class="section-head" data-anim><span class="eyebrow">Funciones</span><h2>Todo tu monitoreo en una plataforma</h2></div>
    <div class="grid-3">${FEATURES.map(([i, t, d]) => h`<article class="card hover"><div class="feature-ic">${i}</div><h3>${t}</h3><p class="muted">${d}</p></article>`)}</div>
  </div></section>
  <section class="section" id="casos" style="padding-top:0"><div class="container">
    <div class="section-head" data-anim><span class="eyebrow">Casos de uso</span><h2>Hecho para la industria del sur de Chile</h2></div>
    <div class="grid-4">${CASES.map(([i, t, d]) => h`<article class="card"><div class="feature-ic">${i}</div><h3>${t}</h3><p class="muted small">${d}</p></article>`)}</div>
  </div></section>
  <section class="section" id="precios" style="padding-top:0"><div class="container">
    <div class="section-head" data-anim><span class="eyebrow">Precios</span><h2>Planes simples, en pesos chilenos</h2><p class="muted">Valores mensuales netos (ficticios). Hardware se cotiza aparte.</p></div>
    <div class="grid-3">${s.plans.map(p => h`<article class="card plan ${p.featured ? 'featured' : ''}">
      <div class="row between"><h3 style="margin:0">${p.name}</h3>${p.featured ? raw('<span class="badge badge-primary">Más elegido</span>') : ''}</div>
      <div><span class="price">${p.price ? money(p.price) : 'A medida'}</span> ${p.price ? raw(`<span class="muted small">/ ${p.period} + IVA</span>`) : ''}</div>
      <b>${p.devices}</b><ul>${p.features.map(f => h`<li>${f}</li>`)}</ul>
      <a class="btn ${p.featured ? 'btn-primary' : ''} btn-block" href="#contacto" data-plan="${p.name}" style="margin-top:auto">Cotizar</a></article>`)}</div>
  </div></section>
  <section class="section" id="contacto" style="padding-top:0"><div class="container grid-2" style="align-items:start">
    <div data-anim><span class="eyebrow">Contacto</span><h2>Agenda una demo</h2><p class="muted">Te mostramos Sentinela con datos de tu operación. Escríbenos a ${s.contact.email} o llámanos al ${s.contact.phone}.</p></div>
    <form class="card stack" id="lead" novalidate data-anim>
      <div class="grid-2"><div class="field"><label for="ln">Nombre</label><input class="input" id="ln" name="name" required></div><div class="field"><label for="lc">Empresa</label><input class="input" id="lc" name="company" required></div></div>
      <div class="grid-2"><div class="field"><label for="le">Correo</label><input class="input" id="le" name="email" type="email" required></div><div class="field"><label for="lp">Plan de interés</label><select class="select" id="lp" name="plan">${s.plans.map(p => h`<option>${p.name}</option>`)}</select></div></div>
      <div class="field"><label for="lm">¿Qué quieres monitorear?</label><textarea class="textarea" id="lm" name="message"></textarea></div>
      <button class="btn btn-primary">Solicitar demo</button>
    </form>
  </div></section>`;
  wire();
}

function live() {
  const devs = db.all('devices');
  const o2 = devs.find(d => d.type === 'oxigeno' && d.anomaly) || devs.find(d => d.type === 'oxigeno');
  const ch = document.querySelector('[data-hero-chart]');
  if (!ch || !o2) return;
  const now = Date.now();
  ch.innerHTML = lineSvg(history(o2, now - 120000, now, 90), { height: 170, thresholds: [{ value: 5, label: 'Crítico 5 mg/L' }], dec: 1 });
  const picks = [devs.find(d => d.type === 'temperatura' && d.tag === 'camara'), devs.find(d => d.type === 'vibracion' && d.anomaly), devs.find(d => d.type === 'energia' && d.tag === 'general')].filter(Boolean);
  const range = { temperatura: [-25, 0], vibracion: [0, 12], energia: [0, 500] };
  document.querySelector('[data-hero-gauges]').innerHTML = picks.map(d => { const v = value(d); const [mn, mx] = range[d.type]; return `<div class="gauge-card">${gauge(v, { min: mn, max: mx, text: fmt(d, v), state: status(d, v), label: d.name })}<span class="name">${TYPES[d.type].label}</span></div>`; }).join('');
}

function wire() {
  document.querySelectorAll('[data-plan]').forEach(a => a.addEventListener('click', () => { const s = document.querySelector('#lp'); if (s) s.value = a.dataset.plan; }));
  $('#lead').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.elements;
    const v = { name: f.name.value.trim(), company: f.company.value.trim(), email: f.email.value.trim(), plan: f.plan.value, message: f.message.value.trim() };
    if (!v.name || !v.company || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { toast('Completa nombre, empresa y un correo válido', 'warning'); return; }
    db.insert('leads', { ...v, status: 'nuevo' });
    db.log('lead', `Nueva solicitud de demo: ${v.name} (${v.company}) · plan ${v.plan}`, null);
    e.target.reset();
    toast('¡Gracias! Te contactaremos en menos de 24 horas.', 'success');
  });
  live();
}

render();
wirePublicHeader();
clearInterval(timer); timer = setInterval(live, 1000);
db.subscribe(ch => { if (ch.type === 'value' || ch.type === 'reset' || ch.type === 'sync') { if (!document.activeElement?.closest('#lead')) render(); } });
