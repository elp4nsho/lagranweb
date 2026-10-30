// Portada: hero editable, calculadora rápida, líneas de servicio, concierge, inspección, dyno, membresías, testimonios y FAQ.
import { money, escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { LINES } from '../data/catalog.js';
import { settings, programs, nextServices, tiers, kmFmt, vehicleById } from '../shared/domain.js';
import { carArt } from '../shared/car-art.js';
import { dynoChart } from './dyno.js';

export function quickCalc(el) {
  const ps = programs();
  el.innerHTML = `<form class="card stack" id="qc" novalidate>
    <div class="row between"><h3 style="margin:0">¿Qué mantención le toca a tu auto?</h3><span class="badge badge-primary">Plan de fábrica</span></div>
    <div class="grid-3">
      <div class="field"><label for="qc-b">Marca</label><select class="select" id="qc-b">${ps.map(p => `<option>${escape(p.brand)}</option>`).join('')}</select></div>
      <div class="field"><label for="qc-m">Modelo</label><select class="select" id="qc-m"></select></div>
      <div class="field"><label for="qc-k">Kilometraje actual (km)</label><input class="input" id="qc-k" type="number" min="0" step="500" value="28000"></div>
    </div><div data-out></div></form>`;
  const b = el.querySelector('#qc-b'), m = el.querySelector('#qc-m'), k = el.querySelector('#qc-k'), out = el.querySelector('[data-out]');
  const fillModels = () => { const p = ps.find(x => x.brand === b.value); m.innerHTML = p.models.map(x => `<option>${escape(x.name)}</option>`).join(''); };
  const calc = () => {
    const [n] = nextServices({ brand: b.value, model: m.value, km: +k.value || 0 }, 1);
    out.innerHTML = n ? `<div class="callout row between"><span><b>${escape(n.level.name)}</b> a los ${kmFmt(n.km)} <span class="muted">(o ${n.months} meses)</span><br><small class="muted">${escape(n.tasks.slice(0, 3).join(' · '))}</small></span>
      <span class="row"><b class="price">${money(n.price)}</b><a class="btn btn-primary btn-sm" href="#/agendar?brand=${encodeURIComponent(b.value)}&model=${encodeURIComponent(m.value)}&km=${+k.value || 0}">Agendar</a></span></div>` : '';
  };
  b.onchange = () => { fillModels(); calc(); }; m.onchange = calc; k.oninput = calc;
  el.querySelector('form').onsubmit = e => e.preventDefault();
  fillModels(); calc();
}

export function renderHome(el) {
  const c = settings();
  const feat = db.query('services', s => s.active && s.featured).slice(0, 6);
  const dy = db.query('dyno', d => d.public).sort((a, b) => b.at.localeCompare(a.at))[0];
  const dyV = dy && vehicleById(dy.vehicleId);
  const counts = Object.fromEntries(Object.keys(LINES).map(l => [l, db.count('services', s => s.active && s.line === l)]));
  el.innerHTML = `
  <section class="site-hero">
    <div class="container">
      <div class="hero-text stack" data-anim>
        <span class="eyebrow">${escape(c.tagline)}</span>
        <h1>${escape(c.heroTitle)}</h1>
        <p class="lead">${escape(c.heroText)}</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#/agendar">Agendar con retiro concierge</a><a class="btn btn-lg btn-ghost" href="#/programas">Calcular mi mantención</a></div>
        <div class="facts">${(c.stats || []).map(([v, l]) => `<div><b>${escape(v)}</b><small>${escape(l)}</small></div>`).join('')}</div>
      </div>
      <div class="hero-media" data-anim data-anim-delay="150">${carArt({ ...(c.heroCar || {}), label: c.heroCar?.label || 'Auto deportivo' })}
        <div class="hero-badges"><span class="badge">🔧 Plan de fábrica</span><span class="badge">⚡ Alta tensión certificada</span><span class="badge">🏁 Dyno propio</span></div></div>
    </div>
  </section>
  <section class="section band"><div class="container" data-qc data-anim></div></section>
  <section class="section"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Especialidades</span><h2>Cinco talleres en uno</h2></div><a class="btn btn-sm" href="#/servicios">Ver todos los servicios</a></div>
    <div class="grid-auto">${Object.entries(LINES).map(([k, l], i) => `<a class="card hover line-card tone-${['primary', 'accent', 'info', 'success', 'warning'][i]}" href="${k === 'mantencion' ? '#/programas' : '#/servicios/' + k}"><span class="ico" aria-hidden="true">${l.icon}</span><h3 style="margin:0">${escape(l.label)}</h3><span class="muted small">${k === 'mantencion' ? programs().length + ' programas por marca' : counts[k] + ' servicios'}</span></a>`).join('')}</div>
  </div></section>
  <section class="section band"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Concierge</span><h2>No vienes al taller: el taller va por ti</h2><p class="muted">Retiro y entrega en tu casa u oficina en ventanas de 2 horas${c.courtesyEnabled ? ', con auto de cortesía eléctrico' : ''}.</p></div><a class="btn btn-primary btn-sm" href="#/seguimiento">Ver un seguimiento en vivo</a></div>
    <div class="grid-4 how">
      <div class="card stack"><h3 style="margin:0">Agenda en 2 minutos</h3><p class="muted" style="margin:0">Eliges servicio, ventana horaria y dirección. Calculamos el precio según el plan de tu marca.</p></div>
      <div class="card stack"><h3 style="margin:0">Retiro documentado</h3><p class="muted" style="margin:0">El chofer registra fotos en 6 ángulos, kilometraje, nivel de carga y tu firma digital.</p></div>
      <div class="card stack"><h3 style="margin:0">Inspección digital</h3><p class="muted" style="margin:0">Recibes un informe con semáforo, fotos y videos. Apruebas en línea solo lo que quieras.</p></div>
      <div class="card stack"><h3 style="margin:0">Entrega impecable</h3><p class="muted" style="margin:0">Tu auto vuelve lavado, con el libro de mantenciones digital actualizado.</p></div>
    </div>
  </div></section>
  <section class="section"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Destacados</span><h2>Servicios más pedidos</h2></div></div>
    <div class="grid-3">${feat.map(s => `<article class="card hover svc-card"><span class="svc-ico" aria-hidden="true">${s.icon}</span><h3 style="margin:0">${escape(s.name)}</h3><p class="muted small" style="margin:0">${escape(s.desc)}</p>
      <div class="foot"><b class="price">${s.priceFrom ? 'desde ' : ''}${money(s.price)}</b><a class="btn btn-sm btn-primary" href="#/agendar?svc=${s.id}">Agendar</a></div></article>`).join('')}</div>
  </div></section>
  ${c.showDyno && dy ? `<section class="section band"><div class="container grid-2" style="align-items:center">
    <div class="stack" data-anim><span class="eyebrow">Dinamómetro propio</span><h2>Potencia medida, no prometida</h2><p class="lead">Cada reprogramación se mide antes y después en nuestro dyno de rodillos. Último resultado: <b>${escape(dyV ? dyV.brand + ' ' + dyV.model : '')}</b>, ${escape(dy.stage)}.</p>
      <div class="row"><span class="gain">+${dy.after.hp - dy.before.hp} CV</span><span class="muted">${dy.before.hp} → ${dy.after.hp} CV en rueda</span></div><a class="btn btn-sm" href="#/dyno/${dy.id}">Ver curva completa</a></div>
    <div class="card" data-anim>${dynoChart(dy, { height: 220 })}</div></div></section>` : ''}
  ${c.showMemberships ? `<section class="section"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Membresías</span><h2>Silver, Gold y Black</h2><p class="muted">Concierge ilimitado, autos de cortesía y descuentos en todo el atelier.</p></div><a class="btn btn-sm" href="#/membresias">Comparar planes</a></div>
    <div class="grid-3">${tiers().map(t => `<div class="card tier-card tone-${t.tone}"><h3 style="margin:0">${escape(t.name)}</h3><b class="price">${money(t.price)} <small class="muted">/ año</small></b><ul class="small">${t.perks.slice(0, 3).map(p => `<li>${escape(p)}</li>`).join('')}</ul></div>`).join('')}</div>
  </div></section>` : ''}
  ${c.showTestimonials ? `<section class="section band"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Clientes</span><h2>Lo que dicen en el pit lane</h2></div></div>
    <div class="grid-3">${db.query('testimonials', t => t.active).map(t => `<figure class="card quote" style="margin:0"><span class="stars" aria-label="${t.rating} de 5">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</span><p>“${escape(t.text)}”</p><figcaption class="small"><b>${escape(t.name)}</b> <span class="muted">· ${escape(t.car)}</span></figcaption></figure>`).join('')}</div>
  </div></section>` : ''}
  <section class="section"><div class="container narrow faq">
    <div class="sec-head"><div><span class="eyebrow">Preguntas frecuentes</span><h2>Antes de agendar</h2></div></div>
    ${db.query('faqs', f => f.active).map(f => `<details><summary>${escape(f.q)}</summary><p>${escape(f.a)}</p></details>`).join('')}
  </div></section>`;
  quickCalc(el.querySelector('[data-qc]'));
}
