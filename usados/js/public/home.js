// Portada: buscador rápido, destacados, certificación 150 puntos, vende tu auto, planes, servicios, tienda y sucursales.
import { money, escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { BRANDS, REGIONS, INSPECTION } from '../data/catalog.js';
import { settings, isVisible, compareGet, compareSet } from '../shared/domain.js';
import { carArt } from '../shared/car-art.js';
import { carCard } from './cards.js';
import { wireCompare } from './buscar.js';

export function renderHome(el) {
  const c = settings();
  const live = db.query('cars', isVisible);
  const feat = live.filter(x => x.featured).concat(live.filter(x => !x.featured)).slice(0, 6);
  const sold30 = db.count('cars', x => x.status === 'vendido' && Date.now() - new Date(x.soldAt) < 30 * 864e5);
  el.innerHTML = `
  <section class="site-hero">
    <div class="container">
      <div class="hero-text stack" data-anim>
        <span class="eyebrow">${escape(c.tagline)}</span>
        <h1>${escape(c.heroTitle)}</h1>
        <p class="lead">${escape(c.heroText)}</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#/autos">Ver ${live.length} autos</a><a class="btn btn-lg btn-ghost" href="#/vende">Vender mi auto</a></div>
        <div class="facts"><div><b>150</b><small>puntos de inspección</small></div><div><b>${c.warrantyMonths} meses</b><small>de garantía</small></div><div><b>${sold30}</b><small>autos entregados este mes</small></div></div>
      </div>
      <div class="hero-media" data-anim data-anim-delay="150">${carArt({ ...(c.heroCar || {}), label: 'SUV certificado' })}<div class="hero-badges"><span class="badge badge-success">✓ Certificado</span><span class="badge">Sin multas ni prendas</span><span class="badge">Reserva 100% reembolsable</span></div></div>
    </div>
  </section>
  <section class="section band"><div class="container">
    <form class="card quick-search" id="qs" role="search" data-anim>
      <div class="field"><label for="qs-b">Marca</label><select class="select" id="qs-b"><option value="">Todas</option>${BRANDS.map(b => `<option>${escape(b)}</option>`).join('')}</select></div>
      <div class="field"><label for="qs-body">Carrocería</label><select class="select" id="qs-body"><option value="">Todas</option><option value="suv">SUV</option><option value="sedan">Sedán</option><option value="hatch">Hatchback</option><option value="pickup">Camioneta</option></select></div>
      <div class="field"><label for="qs-p">Precio hasta</label><select class="select" id="qs-p"><option value="">Sin tope</option>${[8, 12, 16, 20, 25, 30].map(v => `<option value="${v * 1e6}">${money(v * 1e6)}</option>`).join('')}</select></div>
      <div class="field"><label for="qs-r">Región</label><select class="select" id="qs-r"><option value="">Todo Chile</option>${REGIONS.slice(0, 4).map(x => `<option>${escape(x)}</option>`).join('')}</select></div>
      <button class="btn btn-primary btn-lg">Buscar</button>
    </form></div></section>
  <section class="section"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Recién certificados</span><h2>Autos destacados</h2></div><a class="btn btn-sm" href="#/autos">Ver todo el stock</a></div>
    <div class="car-grid">${feat.map(x => carCard(x)).join('')}</div>
  </div></section>
  <section class="section band"><div class="container grid-2" style="align-items:center">
    <div class="stack" data-anim><span class="eyebrow">Certificación Ruta</span><h2>150 puntos antes de publicar un auto</h2><p class="lead">Un inspector revisa cada auto en 10 categorías. Lo que no está perfecto se repara o se informa en el aviso. Si no pasa, no se publica.</p>
      <ul class="legal-list"><li>✅ Historial de mantenciones verificado</li><li>✅ Informe sin multas, prendas ni encargo por robo</li><li>✅ Garantía mecánica de ${c.warrantyMonths} meses</li><li>✅ 7 días para devolverlo si no te convence</li></ul></div>
    <div class="grid-2">${INSPECTION.map(([cat]) => `<div class="card row" style="gap:8px;padding:12px"><span class="pt-ic p">✓</span><small><b>${escape(cat)}</b><br><span class="muted">15 puntos</span></small></div>`).join('')}</div>
  </div></section>
  <section class="section"><div class="container grid-3">
    <a class="card hover stack" href="#/vende" style="text-decoration:none;color:var(--text)" data-anim><span style="font-size:34px">🏷️</span><h3 style="margin:0">Vende o permuta tu auto</h3><p class="muted" style="margin:0">Oferta en 1 minuto, inspección gratis y pago en 24 h. Úsalo como pie para tu próximo auto.</p><span class="btn btn-primary btn-sm" style="align-self:flex-start">Tasar ahora</span></a>
    ${c.showPlans ? `<a class="card hover stack" href="#/planes" style="text-decoration:none;color:var(--text)" data-anim><span style="font-size:34px">🛡️</span><h3 style="margin:0">Planes de mantención</h3><p class="muted" style="margin:0">Desde ${money(Math.min(...db.query('plans', p => p.active).map(p => p.price)))} al mes, para cualquier auto: mantenciones y asistencia en ruta 24/7.</p><span class="btn btn-sm" style="align-self:flex-start">Ver planes</span></a>` : ''}
    <a class="card hover stack" href="#/servicios" style="text-decoration:none;color:var(--text)" data-anim><span style="font-size:34px">🔧</span><h3 style="margin:0">Servicios en sucursal o a domicilio</h3><p class="muted" style="margin:0">Mantención, preparación de revisión técnica e inspección precompra. Agenda en línea.</p><span class="btn btn-sm" style="align-self:flex-start">Agendar</span></a>
  </div></section>
  ${c.showStore ? `<section class="section band"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Tienda</span><h2>Repuestos y accesorios</h2></div><a class="btn btn-sm" href="#/tienda">Ir a la tienda</a></div>
    <div class="grid-4">${db.query('products', p => p.active && p.stock > 0).slice(0, 4).map(p => `<a class="card hover prod-card" href="#/tienda?cat=${encodeURIComponent(p.cat)}" style="text-decoration:none;color:var(--text)"><span class="prod-ico" aria-hidden="true">${p.icon}</span><b>${escape(p.name)}</b><b class="price">${money(p.price)}</b></a>`).join('')}</div>
  </div></section>` : ''}
  ${c.showTestimonials ? `<section class="section"><div class="container">
    <div class="sec-head"><div><span class="eyebrow">Clientes</span><h2>Compraron y vendieron con nosotros</h2></div></div>
    <div class="grid-auto">${db.query('testimonials', t => t.active).map(t => `<figure class="card quote" style="margin:0"><span class="stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</span><p>“${escape(t.text)}”</p><figcaption class="small"><b>${escape(t.name)}</b> <span class="muted">· ${escape(t.city)}</span></figcaption></figure>`).join('')}</div>
  </div></section>` : ''}
  <section class="section band"><div class="container narrow faq">
    <div class="sec-head"><div><span class="eyebrow">Preguntas frecuentes</span><h2>Compra con tranquilidad</h2></div></div>
    ${db.query('faqs', f => f.active).map(f => `<details><summary>${escape(f.q)}</summary><p>${escape(f.a)}</p></details>`).join('')}
  </div></section>`;
  el.querySelector('#qs').onsubmit = e => {
    e.preventDefault();
    const q = new URLSearchParams();
    [['brand', '#qs-b'], ['body', '#qs-body'], ['pmax', '#qs-p'], ['region', '#qs-r']].forEach(([k, s]) => { const v = el.querySelector(s).value; if (v) q.set(k, v); });
    location.hash = '#/autos?' + q;
  };
  wireCompare(el);
}
export { compareGet, compareSet };
