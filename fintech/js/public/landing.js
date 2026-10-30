// Landing pública de Cóndor Pay. Todo el contenido editable (hero, tarifas, tarjetas, FAQ)
// viene de la DB y se repinta al instante cuando el back-office lo cambia.
import { db, site } from '../data/db.js';
import { money, $ } from '../../../assets/core/ui.js';
import { h as html, raw } from '../shared/h.js';
import { publicHeader, publicFooter, wirePublicHeader } from '../shared/layout.js';

const FEATURES = [
  ['⚡', 'Transferencias al instante', 'Envía dinero a cualquier banco en segundos, 24/7, confirmando con un código de un solo uso.'],
  ['📷', 'Paga con QR', 'Genera tu código para cobrar o escanea el del comercio y paga sin tarjeta.'],
  ['🎯', 'Metas de ahorro', 'Separa tu plata por objetivos y activa aportes automáticos cada mes.'],
  ['📈', 'Invierte desde $5.000', 'Fondos conservadores, moderados y agresivos con rentabilidad simulada.'],
  ['🧾', 'Paga tus cuentas', 'Luz, agua, gas, internet y gastos comunes desde un solo lugar.'],
  ['💳', 'Tarjeta virtual', 'Congélala, cambia sus límites y activa compras online con un toque.'],
];
const SECURITY = [
  ['🔐', 'Clave + código 2FA', 'Cada transferencia se confirma con un código enviado a tu celular.'],
  ['🛡️', 'Motor antifraude', 'Reglas de monto, velocidad y horario detectan operaciones inusuales.'],
  ['📱', 'Control de dispositivos', 'Revisa dónde iniciaste sesión y cierra sesiones remotas.'],
  ['❄️', 'Congela tu tarjeta', 'Si la pierdes, congélala al instante y pide una nueva desde la app.'],
];

function fmtFee(f) {
  if (f.unit === '%') return `${String(f.value).replace('.', ',')}%`;
  return f.value === 0 ? 'Gratis' : money(f.value);
}

function render() {
  const s = site();
  const products = db.query('products', p => p.active).sort((a, b) => a.order - b.order);
  const funds = db.query('funds', f => f.active);
  $('#head').innerHTML = publicHeader();
  $('#foot').innerHTML = publicFooter();
  $('#landing').innerHTML = html`
  <section class="hero"><div class="container hero-grid">
    <div data-anim>
      <span class="eyebrow">${s.hero.eyebrow}</span>
      <h1>${s.hero.title}</h1>
      <p class="lead">${s.hero.subtitle}</p>
      <div class="row" style="margin-top:24px">
        <a class="btn btn-primary btn-lg" href="abrir-cuenta.html">${s.hero.cta}</a>
        <a class="btn btn-lg" href="login.html">Probar la app demo</a>
      </div>
      <p class="small muted" style="margin-top:14px">⚠️ ${s.notice}</p>
    </div>
    <div data-anim data-anim-delay="150">
      <div class="phone" aria-hidden="true">
        <div class="notch"></div>
        <div class="row between"><b>Hola, Camila 👋</b><span class="badge badge-success">Demo</span></div>
        <div class="bank-card"><div class="row between"><span class="chip-ic"></span><b>Cóndor</b></div><span class="num">•••• •••• •••• 4821</span><div class="meta"><span>Saldo disponible<b>$1.284.350</b></span><span>Vence<b>08/29</b></span></div></div>
        <div class="mini"><span>🛒 Súper Andino</span><b class="amt">−$23.490</b></div>
        <div class="mini"><span>💰 Remuneración</span><b class="amt pos">+$1.850.000</b></div>
        <div class="mini"><span>🎯 Viaje a Torres del Paine</span><b>65%</b></div>
      </div>
    </div>
  </div></section>

  <section class="container" data-anim>
    <div class="stats-band">${s.stats.map(([v, l]) => html`<div class="card"><div class="stat"><span class="value">${v}</span><span class="label">${l}</span></div></div>`)}</div>
  </section>

  <section class="section" id="beneficios"><div class="container">
    <div class="section-head" data-anim><span class="eyebrow">Beneficios</span><h2>Todo tu banco en una app</h2><p class="muted">Diseñado para el día a día en Chile: transferencias, pagos, ahorro e inversión sin letra chica.</p></div>
    <div class="grid-3">${FEATURES.map(([ic, t, d]) => html`<article class="card hover"><div class="feature-ic">${ic}</div><h3>${t}</h3><p class="muted">${d}</p></article>`)}</div>
  </div></section>

  <section class="section" id="tarjetas" style="padding-top:0"><div class="container">
    <div class="section-head" data-anim><span class="eyebrow">Tarjetas</span><h2>Elige tu tarjeta Cóndor</h2></div>
    <div class="grid-3">${products.map(p => html`
      <article class="card product-card ${p.featured ? 'featured' : ''}">
        <div class="bank-card mini-card"><div class="row between"><span class="chip-ic"></span><b>${p.kind}</b></div><span class="num">•••• ${String(1000 + p.name.length * 377).slice(-4)}</span><div class="meta"><span>${p.name}</span></div></div>
        <div class="row between"><h3 style="margin:0">${p.name}</h3>${p.featured ? raw('<span class="badge badge-primary">Recomendada</span>') : ''}</div>
        <p class="muted" style="margin:0">${p.desc}</p>
        <div><span class="price">${p.annualFee ? money(p.annualFee) : 'Sin costo'}</span> <span class="muted small">${p.annualFee ? 'comisión anual' : 'de mantención'}</span></div>
        <ul>${p.perks.map(x => html`<li>${x}</li>`)}</ul>
        <a class="btn ${p.featured ? 'btn-primary' : ''} btn-block" href="abrir-cuenta.html" style="margin-top:auto">Solicitar</a>
      </article>`)}</div>
  </div></section>

  <section class="section" id="tarifas" style="padding-top:0"><div class="container grid-2" style="align-items:start">
    <div data-anim>
      <span class="eyebrow">Tarifas transparentes</span><h2>Sin costos escondidos</h2>
      <p class="muted">Estas son todas nuestras comisiones y tasas vigentes (ficticias). Se actualizan en tiempo real desde el back-office.</p>
      <div class="table-wrap"><table class="table"><tbody>
        ${s.fees.map(f => html`<tr><td>${f.label}</td><td class="right"><b>${fmtFee(f)}</b></td></tr>`)}
        <tr><td>Límite diario de transferencias</td><td class="right"><b>${money(s.limits.transferDaily)}</b></td></tr>
      </tbody></table></div>
    </div>
    <div class="card" data-anim data-anim-delay="120">
      <h3>Fondos de inversión</h3>
      <p class="muted small">Rentabilidad anual simulada de los últimos 12 meses.</p>
      <div class="stack" style="gap:10px">${funds.map(f => html`<div class="row between"><span><b>${f.name}</b><br><span class="small muted">${f.risk} · desde ${money(f.minInvest)}</span></span><span class="badge badge-success">+${String(f.annual).replace('.', ',')}%</span></div>`)}</div>
    </div>
  </div></section>

  <section class="section" id="seguridad" style="padding-top:0"><div class="container">
    <div class="section-head" data-anim><span class="eyebrow">Seguridad</span><h2>Tu plata (ficticia) protegida</h2></div>
    <div class="grid-4">${SECURITY.map(([ic, t, d]) => html`<article class="card"><div class="feature-ic">${ic}</div><h3>${t}</h3><p class="muted small">${d}</p></article>`)}</div>
  </div></section>

  <section class="section" id="faq" style="padding-top:0"><div class="container grid-2" style="align-items:start">
    <div data-anim><span class="eyebrow">Preguntas frecuentes</span><h2>¿Dudas?</h2><p class="muted">Si no encuentras tu respuesta, escríbenos desde la sección Ayuda de la app.</p></div>
    <div class="faq" data-anim>${s.faq.map((f, i) => html`<details ${i === 0 ? 'open' : ''}><summary>${f.q}</summary><p>${f.a}</p></details>`)}</div>
  </div></section>

  <section class="section cta-band" style="padding-top:0"><div class="container card" data-anim>
    <h2>Abre tu cuenta Cóndor en 5 minutos</h2>
    <p class="muted">Solo necesitas tu RUT, tu celular y una selfie (simulada).</p>
    <div class="row" style="justify-content:center"><a class="btn btn-primary btn-lg" href="abrir-cuenta.html">${s.hero.cta}</a><a class="btn btn-lg btn-ghost" href="login.html">Ver cuentas demo</a></div>
  </div></section>`;
}

render();
wirePublicHeader();
db.subscribe(render);
