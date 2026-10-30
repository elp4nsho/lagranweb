// Inicio del sitio público (contenido editable desde Ajustes/CMS del panel).
import { db } from '../data/db.js';
import { html, raw, escape, num } from '../../../assets/core/ui.js';
import { createMap } from '../shared/map.js';
import { courierPos, shipmentLines, ACTIVE_ST } from '../shared/sim.js';
import { stars, avatar } from '../shared/views.js';
import * as ops from '../shared/ops.js';
import { mountCalc } from './calc.js';
import { mountCoverage } from './coverage.js';

export function liveStats() {
  const t = ops.simNow();
  const today = new Date(t); today.setHours(0, 0, 0, 0);
  const all = db.all('shipments');
  const delivered = all.filter(s => s.status === 'entregado');
  const todayN = delivered.filter(s => Date.parse(s.deliveredAt) >= today.getTime()).length;
  const since = t - 30 * 864e5;
  const recent = delivered.filter(s => Date.parse(s.deliveredAt) >= since);
  const onTime = recent.length ? recent.filter(s => Date.parse(s.deliveredAt) <= Date.parse(s.slaAt)).length / recent.length * 100 : 100;
  const rated = all.filter(s => s.rating);
  const rating = rated.length ? rated.reduce((a, s) => a + s.rating.stars, 0) / rated.length : 5;
  const online = db.count('couriers', c => c.online && c.status === 'activo');
  return { todayN, onTime, rating, online, active: all.filter(s => ACTIVE_ST.includes(s.status)).length };
}

export function mountHome(el) {
  const st = ops.settings();
  const stats = liveStats();
  el.innerHTML = html`
  <section class="hero section site-hero">
    <div class="container hero-grid">
      <div class="stack hero-copy hero-text" data-anim>
        <span class="eyebrow" data-cms="heroEyebrow">${st.heroEyebrow}</span>
        <h1 data-cms="heroTitle">${st.heroTitle}</h1>
        <p class="lead muted" data-cms="heroSubtitle">${st.heroSubtitle}</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#/solicitar" data-cms="heroCta">${st.heroCta}</a><a class="btn btn-lg btn-ghost" href="#/tarifas">Cotizar ahora</a></div>
        <form class="track-form" id="hero-track"><label class="sr-only" for="hero-code">Código de seguimiento</label>
          <input class="input" id="hero-code" placeholder="Código de seguimiento, ej. RX-48213" autocomplete="off"><button class="btn btn-accent">Rastrear</button></form>
        <div class="demo-codes row small" id="demo-codes"></div>
      </div>
      <div class="card hero-map-card hero-media" data-anim="zoomIn">
        <div class="live-pill"><span class="dot-live"></span><span id="live-n">${stats.online}</span> repartidores en ruta ahora</div>
        <div class="hero-map"></div>
      </div>
    </div>
  </section>
  <section class="stats-strip"><div class="container grid-4" id="stats"></div></section>
  <section class="section" id="como"><div class="container stack">
    <div class="sec-head" data-anim><span class="eyebrow">Cómo funciona</span><h2>Cuatro pasos, cero llamadas para preguntar "¿dónde viene?"</h2></div>
    <div class="grid-4 steps">
      ${[['01', 'Cotiza', 'Elige comuna de origen, destino y tamaño. Ves el precio final al tiro, sin letra chica.'], ['02', 'Solicita', 'Completa el formulario y recibe tu código de seguimiento RX-·····.'], ['03', 'Retiramos', 'El repartidor más cercano acepta el pedido y pasa por tu paquete en minutos.'], ['04', 'Entregamos', 'Sigues la ruta en vivo, chateas con el repartidor y recibes la firma de quien recibe.']]
        .map(([n, t, d]) => raw(html`<div class="card hover step"><span class="step-n">${n}</span><h3>${t}</h3><p class="muted">${d}</p></div>`))}
    </div></div></section>
  <section class="section alt" id="tarifas"><div class="container stack">
    <div class="sec-head" data-anim><span class="eyebrow">Tarifas</span><h2>Calcula tu envío</h2><p class="muted">Precio transparente, IVA incluido. Las tarifas se actualizan en vivo desde nuestra consola.</p></div>
    <div id="calc"></div></div></section>
  <section class="section" id="cobertura"><div class="container" id="coverage"></div></section>
  <section class="section alt" id="empresas"><div class="container grid-2 biz">
    <div class="stack" data-anim><span class="eyebrow">Empresas</span><h2 data-cms="businessTitle">${st.businessTitle}</h2><p class="muted" data-cms="businessText">${st.businessText}</p>
      <ul class="checks"><li>Carga masiva de envíos desde planilla</li><li>Facturación mensual y libreta de direcciones</li><li>Seguimiento en vivo para tus clientes</li><li>Reportes de cumplimiento y calificaciones</li></ul>
      <div class="row"><a class="btn btn-primary" href="login.html#registro">Crear cuenta empresa</a><a class="btn btn-ghost" href="login.html">Ya tengo cuenta</a></div></div>
    <div class="grid-2 biz-cards">
      <div class="card stat" data-anim><span class="label">Entregas hoy</span><span class="value" data-stat="today">${num(stats.todayN)}</span><span class="delta up">en vivo</span></div>
      <div class="card stat" data-anim><span class="label">A tiempo (30 días)</span><span class="value" data-stat="ontime">${stats.onTime.toFixed(1).replace('.', ',')}%</span></div>
      <div class="card stat" data-anim><span class="label">Calificación</span><span class="value" data-stat="rating">${stats.rating.toFixed(2).replace('.', ',')}</span><span>${stars(stats.rating)}</span></div>
      <div class="card stat" data-anim><span class="label">Envíos en curso</span><span class="value" data-stat="active">${stats.active}</span></div>
    </div></div></section>
  <section class="section" id="repartidores"><div class="container">
    <div class="card cta-card" data-anim><div class="stack" style="gap:8px"><span class="eyebrow">Flota Rayo</span><h2 data-cms="courierTitle">${st.courierTitle}</h2><p class="muted" data-cms="courierText">${st.courierText}</p></div>
    <a class="btn btn-accent btn-lg" href="repartidor.html">Abrir app del repartidor</a></div></div></section>
  <section class="section alt" id="opiniones"><div class="container stack">
    <div class="sec-head" data-anim><span class="eyebrow">Opiniones</span><h2>Lo que dicen quienes reciben</h2></div>
    <div class="grid-3" id="reviews"></div></div></section>
  <section class="section" id="faq"><div class="container narrow stack">
    <div class="sec-head" data-anim><span class="eyebrow">Preguntas frecuentes</span><h2>Dudas comunes</h2></div>
    <div class="faq" id="faqs"></div></div></section>`;

  // Mapa en vivo
  const map = createMap(el.querySelector('.hero-map'), { hq: true, labels: true, label: 'Repartidores de Rayo Express en vivo' });
  map.fit([[-33.38, -70.70], [-33.53, -70.54]]);
  const calc = mountCalc(el.querySelector('#calc'));
  const cov = mountCoverage(el.querySelector('#coverage'));
  el.querySelector('#hero-track').addEventListener('submit', e => {
    e.preventDefault();
    const v = el.querySelector('#hero-code').value.trim().toUpperCase().replace(/\s+/g, '');
    if (v) location.hash = '#/rastrear/' + encodeURIComponent(/^\d+$/.test(v) ? 'RX-' + v : v);
  });

  const drawMap = () => {
    const t = ops.simNow();
    const ships = ops.activeShipments();
    const cs = db.query('couriers', c => c.online && c.status === 'activo');
    map.setMarkers(cs.map(c => ({ id: c.id, kind: 'courier', pos: courierPos(c, ships, t), state: ships.some(s => s.courierId === c.id && s.status !== 'pendiente') ? 'busy' : 'free', title: c.name.split(' ')[0] })));
    map.setLines(ships.filter(s => s.status === 'en_camino').flatMap(s => shipmentLines(s, t).filter(l => l.kind === 'done')));
  };
  const drawDyn = () => {
    const s = liveStats();
    el.querySelector('#live-n').textContent = s.online;
    el.querySelector('#stats').innerHTML = html`
      <div class="stat"><span class="value">${num(s.todayN)}</span><span class="label">entregas hoy</span></div>
      <div class="stat"><span class="value">${s.onTime.toFixed(1).replace('.', ',')}%</span><span class="label">a tiempo, últimos 30 días</span></div>
      <div class="stat"><span class="value">${s.rating.toFixed(1).replace('.', ',')} ★</span><span class="label">calificación promedio</span></div>
      <div class="stat"><span class="value">${Object.values(ops.pricing().comunaZone).filter(Boolean).length}</span><span class="label">comunas cubiertas</span></div>`;
    const set = (k, v) => { const x = el.querySelector(`[data-stat="${k}"]`); if (x) x.textContent = v; };
    set('today', num(s.todayN)); set('active', s.active);
    // Códigos de prueba: algunos en curso + el entregado de demo
    const act = ops.activeShipments().filter(x => x.status !== 'pendiente').sort((a, b) => (b.demo ? 1 : 0) - (a.demo ? 1 : 0)).slice(0, 3).map(x => x.code);
    const codes = [...new Set([...act, 'RX-30981'])];
    el.querySelector('#demo-codes').innerHTML = '<span class="muted">Prueba con:</span>' + codes.map(c => html`<a class="chip" href="#/rastrear/${c}">${c}</a>`).join('');
  };
  const drawContent = () => {
    const st2 = ops.settings();
    el.querySelectorAll('[data-cms]').forEach(n => { const v = st2[n.dataset.cms]; if (v != null && n.textContent !== v) n.textContent = v; });
    const revs = db.query('shipments', s => s.rating && s.rating.stars >= 4 && s.rating.comment).sort((a, b) => Date.parse(b.rating.at) - Date.parse(a.rating.at)).slice(0, 3);
    el.querySelector('#reviews').innerHTML = revs.map(s => html`<figure class="card review">${stars(s.rating.stars)}<blockquote>"${s.rating.comment}"</blockquote><figcaption class="row" style="gap:10px">${avatar(s.receiver.name, 'var(--accent)', 32)}<span><b>${s.receiver.name}</b><small class="muted"> · ${s.receiver.comuna}</small></span></figcaption></figure>`).join('');
    el.querySelector('#faqs').innerHTML = (st2.faqs || []).map(f => html`<details class="card"><summary>${f.q}</summary><p class="muted">${f.a}</p></details>`).join('');
  };
  drawMap(); drawDyn(); drawContent();
  return {
    tick() { drawMap(); },
    refresh() { drawDyn(); drawContent(); calc.refresh(); cov.refresh(); },
    destroy() { map.destroy(); cov.destroy(); }
  };
}
