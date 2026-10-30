// Portada: búsqueda por patente, espera en vivo por sucursal, servicios, planes y promociones.
import { escape, money, date } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { settings, services, branches, branchLive, waitLabel, waitTone, priceFor, validPlate, normPlate } from '../shared/domain.js';
import { bayArt } from '../shared/bits.js';

export function plateForm(el, { cta = 'Ver mi precio', go = p => `#/precios?p=${encodeURIComponent(p)}` } = {}) {
  el.innerHTML = `<form class="plate-form" novalidate><label class="sr-only" for="pf-plate">Patente</label>
    <input class="input plate-input" id="pf-plate" name="patente" placeholder="KJTR-45" maxlength="8" autocomplete="off">
    <button class="btn btn-primary btn-lg">${escape(cta)}</button></form><small class="muted" data-msg>Ejemplos: KJTR-45 · BB-CL-12 · FH-2231</small>`;
  const f = el.querySelector('form'), inp = f.querySelector('input');
  f.onsubmit = e => {
    e.preventDefault();
    if (!validPlate(inp.value)) { inp.classList.add('invalid'); el.querySelector('[data-msg]').innerHTML = '<span class="text-danger">Escribe una patente válida: 4 letras y 2 números (KJTR-45) o 2 letras y 4 números.</span>'; return; }
    location.hash = go(normPlate(inp.value));
  };
}

export const waitList = () => branches().map(b => { const l = branchLive(b.id); return `<li class="row between nowrap"><span><b>${escape(b.name)}</b><small class="muted d-block">${l.inBay}/${l.bays} bahías ocupadas · ${l.queue} en fila</small></span><span class="badge badge-${waitTone(l.wait)}">${escape(waitLabel(l.wait))}</span></li>`; }).join('');

export function renderHome(el) {
  const c = settings();
  const svcs = services();
  const pop = svcs.filter(s => s.popular).concat(svcs.filter(s => !s.popular)).slice(0, 6);
  const plans = db.query('plans', p => p.active).sort((a, b) => a.order - b.order).slice(0, 3);
  const coupons = db.query('coupons', x => x.active && x.public);
  const cheap = s => priceFor(s, { segment: 'city', oil: '10w40', liters: 3.4 });
  const paint = () => {
    el.innerHTML = `
    <section class="site-hero hero">
      <div class="container hero-grid">
        <div class="hero-text stack" data-anim>
          <span class="eyebrow">${escape(c.tagline)}</span>
          <h1>${escape(c.heroTitle)}</h1>
          <p class="lead">${escape(c.heroText)}</p>
          <div class="card stack" style="gap:8px"><b>¿Cuánto cuesta para mi auto?</b><div data-pf></div></div>
          <div class="row facts"><div><b>30′</b><small>cambio de aceite</small></div><div><b>${branches().length}</b><small>sucursales</small></div><div><b>5</b><small>segmentos, precio justo</small></div></div>
        </div>
        <div class="hero-media stack" data-anim data-anim-delay="150">
          <div class="hero-art">${bayArt()}</div>
          ${c.showWait !== false ? `<div class="card stack" style="gap:10px"><div class="row between"><b><span class="live-dot"></span> Espera ahora</b><a class="small" href="#/sucursales">Ver sucursales →</a></div><ul class="mini-list" data-wait>${waitList()}</ul></div>` : ''}
        </div>
      </div>
    </section>

    <section class="section band how">
      <div class="container stack">
        <div data-anim><span class="eyebrow">Cómo funciona</span><h2>Del portón a la ruta, sin sorpresas</h2></div>
        <div class="grid-4">
          ${[['1', 'Reserva o llega', 'Agenda una hora online o llega sin cita: te mostramos la espera real de cada sucursal.'], ['2', 'Toca "Llegué"', 'Desde tu celular, ingresa tu patente al llegar y quedas en la fila automáticamente.'], ['3', 'Sigue tu auto', 'Ve en vivo en qué bahía está, qué tareas van listas y cuánto falta.'], ['4', 'Tú decides', 'Si el técnico encuentra algo, te llega la recomendación con precio: apruebas o rechazas desde el teléfono.']].map(([n, t, d]) => `<div class="card step-card"><span class="step-num">${n}</span><h3>${t}</h3><p class="muted small" style="margin:0">${d}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section services">
      <div class="container stack">
        <div class="row between" data-anim><div><span class="eyebrow">Servicios</span><h2>Lo que hacemos mientras esperas</h2></div><a class="btn" href="#/precios">Lista completa de precios →</a></div>
        <div class="grid-3">
          ${pop.map(s => `<a class="card hover svc-card" href="#/precios?s=${s.id}" style="text-decoration:none;color:inherit"><span class="svc-ico" aria-hidden="true">${s.icon}</span><h3 style="margin:0">${escape(s.name)}</h3><p class="muted small" style="margin:0">${escape(s.desc)}</p><span class="row between small"><span class="muted">⏱ ${s.mins} min</span><span>desde <b class="price">${money(cheap(s))}</b></span></span></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section band plans-teaser">
      <div class="container stack">
        <div class="row between" data-anim><div><span class="eyebrow">Planes prepagados</span><h2>Paga una vez, mantén todo el año</h2></div><a class="btn" href="#/planes">Ver planes →</a></div>
        <div class="grid-3">${plans.map(p => `<div class="card plan-card ${p.popular ? 'popular' : ''}">${p.popular ? '<span class="badge badge-primary ribbon">Más elegido</span>' : ''}<span class="svc-ico">${p.icon}</span><h3 style="margin:0">${escape(p.name)}</h3><p class="muted small" style="margin:0">${escape(p.tag)}</p><span>desde <b class="price">${money(p.prices.city)}</b></span><span class="badge badge-success plain">Ahorras ${p.savePct}%</span><a class="btn btn-primary btn-sm" href="#/planes?plan=${p.id}">Comprar</a></div>`).join('')}</div>
      </div>
    </section>

    ${coupons.length ? `<section class="section promos"><div class="container stack"><div data-anim><span class="eyebrow">Promociones vigentes</span><h2>Cupones para usar al reservar</h2></div>
      <div class="grid-3">${coupons.map(x => `<div class="card coupon"><code>${escape(x.code)}</code><b>${x.type === 'pct' ? x.value + '% de descuento' : money(x.value) + ' de descuento'}</b><span class="small muted">${escape(x.desc)}</span>${x.validTo ? `<small class="muted">Válido hasta ${date(x.validTo + 'T12:00')}</small>` : ''}</div>`).join('')}</div></div></section>` : ''}

    <section class="section band cta-rem"><div class="container grid-2" style="align-items:center">
      <div data-anim><span class="eyebrow">Recordatorios</span><h2>Te avisamos cuando le toque a tu auto</h2><p class="muted">Por WhatsApp, SMS o correo, según kilometraje o fecha. Sin spam, te das de baja cuando quieras.</p><a class="btn btn-primary" href="#/recordatorios">Activar recordatorio</a></div>
      <div class="card stack" style="gap:8px"><b>¿Ya estás en la sucursal?</b><p class="muted small" style="margin:0">Toca "Llegué", ingresa tu patente y te ubicamos en la fila sin bajarte del auto.</p><a class="btn btn-accent" href="#/llegue">📍 Llegué</a><a class="btn btn-ghost" href="#/estado">🔎 Seguir el estado de mi auto</a></div>
    </div></section>`;
    plateForm(el.querySelector('[data-pf]'));
  };
  paint();
  renderHome.again = paint;
  const t = setInterval(() => { const w = el.querySelector('[data-wait]'); if (w) w.innerHTML = waitList(); }, 20000);
  return { refresh: ch => { const w = el.querySelector('[data-wait]'); if (ch?.col === 'jobs' || ch?.col === 'bays') { if (w) w.innerHTML = waitList(); } else renderHome.again(); }, destroy: () => clearInterval(t) };
}
