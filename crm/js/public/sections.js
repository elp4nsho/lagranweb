// Secciones del sitio de marketing de Pulso CRM. El contenido viene del CMS (db 'site').
import { escape, money } from '../../../assets/core/ui.js';
import { icon } from '../shared/icons.js';
import { initials } from '../../../assets/core/auth.js';

export const announcement = s => s.announcement?.on && s.announcement.text ? `<div class="announce" role="note"><div class="container">${icon('bolt', 14)} ${escape(s.announcement.text)} <a href="#demo">Probar ahora →</a></div></div>` : '';

export const header = (user) => `
  <header class="site-header">
    <div class="container row between">
      <a class="brand site-brand" href="#top"><span class="logo">${icon('bolt', 18)}</span> Pulso <span class="brand-sub">CRM</span></a>
      <button class="btn btn-ghost btn-icon nav-toggle" aria-label="Abrir menú" aria-expanded="false" data-navtoggle>${icon('menu')}</button>
      <nav class="site-nav" data-sitenav>
        <a href="#funciones">Funciones</a><a href="#precios">Precios</a><a href="#clientes">Clientes</a><a href="#faq">Preguntas</a>
        ${user ? `<a class="btn btn-sm" href="app.html">Ir a mi CRM</a>` : `<a class="btn btn-sm btn-ghost" href="login.html">Iniciar sesión</a>`}
        <a class="btn btn-sm btn-primary" href="#demo">Solicitar demo</a>
      </nav>
    </div>
  </header>`;

// Ilustración: mini tablero kanban hecho con tokens del tema.
const mock = () => `
  <div class="hero-mock card" aria-hidden="true">
    <div class="mock-top"><i></i><i></i><i></i><span>Pipeline · Q4</span></div>
    <div class="mock-kpis"><div><small>Pipeline</small><b>$486 M</b></div><div><small>Forecast</small><b>$212 M</b></div><div><small>Cierre</small><b>58%</b></div></div>
    <div class="mock-board">
      ${[['Prospección', ['Viña Los Aromos', 'Textil Andina']], ['Propuesta', ['Seguros Andinos', 'BioSur']], ['Negociación', ['Solar Atacama']], ['Ganado', ['Quintral', 'Cordillera']]].map(([t, cards], i) => `
        <div class="mock-col"><small>${t}</small>${cards.map((c, k) => `<div class="mock-card ${i === 3 ? 'won' : ''} ${i === 2 && !k ? 'drag' : ''}"><b>${c}</b><span><em style="width:${40 + ((i + k) * 17) % 50}%"></em></span></div>`).join('')}</div>`).join('')}
    </div>
  </div>`;

export const hero = s => {
  const h = s.hero || {};
  return `<section class="hero section site-hero" id="top">
    <div class="container hero-grid">
      <div class="stack hero-copy hero-text" data-anim>
        <span class="eyebrow">${escape(h.eyebrow)}</span>
        <h1>${escape(h.title)}</h1>
        <p class="lead">${escape(h.subtitle)}</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#demo">${escape(h.cta || 'Solicitar demo')}</a><a class="btn btn-lg" href="#precios">${escape(h.cta2 || 'Ver planes')}</a></div>
        <small class="muted">14 días gratis · sin tarjeta · soporte en español</small>
      </div>
      <div class="hero-media" data-anim="fadeInRight" data-anim-delay="150">${mock()}</div>
    </div>
  </section>`;
};

export const proof = s => `<section class="proof"><div class="container stack">
    <div class="grid-3 stats-row">${(s.stats || []).map(x => `<div class="stat center" data-anim><span class="value">${escape(x.value)}</span><span class="label">${escape(x.label)}</span></div>`).join('')}</div>
    <p class="center muted small" style="margin:0">Equipos que ya venden con Pulso</p>
    <div class="logos">${(s.logos || []).map(l => `<span class="logo-word">${escape(l)}</span>`).join('')}</div>
  </div></section>`;

export const features = s => `<section class="section" id="funciones"><div class="container stack">
    <div class="center section-head" data-anim><span class="eyebrow">Funciones</span><h2>Todo lo que tu equipo comercial necesita</h2><p class="muted">Sin planillas paralelas ni correos perdidos.</p></div>
    <div class="grid-3">${(s.features || []).map(f => `<article class="card hover feature"><span class="feat-ico">${icon(f.icon, 24)}</span><h3>${escape(f.title)}</h3><p class="muted" style="margin:0">${escape(f.text)}</p></article>`).join('')}</div>
  </div></section>`;

export const how = () => `<section class="section how"><div class="container stack">
    <div class="center section-head" data-anim><span class="eyebrow">Cómo funciona</span><h2>Del primer contacto al cierre</h2></div>
    <div class="grid-3 steps">${[['target', 'Captura', 'Los formularios de tu web crean leads con puntaje automático y se asignan por round-robin.'], ['kanban', 'Avanza', 'Arrastra cada negocio por las etapas, agenda tareas y envía secuencias de seguimiento.'], ['trophy', 'Cierra y mide', 'Genera la cotización, marca el negocio como ganado y mira el avance contra la meta.']].map(([ic, t, d], i) => `<div class="step-card" data-anim data-anim-delay="${i * 120}"><span class="step-n">${i + 1}</span><span class="feat-ico">${icon(ic, 22)}</span><h3>${t}</h3><p class="muted" style="margin:0">${d}</p></div>`).join('')}</div>
  </div></section>`;

export const pricing = (s, annual) => {
  const disc = s.annualDiscount ?? 20;
  return `<section class="section" id="precios"><div class="container stack">
    <div class="center section-head" data-anim><span class="eyebrow">Precios</span><h2>Planes simples, en pesos chilenos</h2><p class="muted">Precios + IVA. Cambia de plan cuando quieras.</p>
      <div class="seg billing" role="group" aria-label="Facturación"><button class="seg-btn ${annual ? '' : 'active'}" data-billing="m" aria-pressed="${!annual}">Mensual</button><button class="seg-btn ${annual ? 'active' : ''}" data-billing="a" aria-pressed="${annual}">Anual <span class="badge badge-success plain">-${disc}%</span></button></div>
    </div>
    <div class="grid-3 plans">${(s.plans || []).map(p => {
      const price = annual ? Math.round(p.price * (1 - disc / 100) / 100) * 100 : p.price;
      return `<article class="card plan ${p.highlight ? 'featured' : ''}">
        ${p.highlight ? '<span class="badge badge-primary plan-tag">Más popular</span>' : ''}
        <h3>${escape(p.name)}</h3>
        <div class="price"><b>${money(price)}</b><small class="muted">${escape(p.note)}${annual ? ' · facturado anual' : ''}</small></div>
        <ul class="checks">${(p.features || []).map(f => `<li>${icon('check', 16)} ${escape(f)}</li>`).join('')}</ul>
        <a class="btn ${p.highlight ? 'btn-primary' : ''} btn-block" href="#demo" data-plan="${escape(p.name)}">Probar ${escape(p.name)}</a>
      </article>`;
    }).join('')}</div>
  </div></section>`;
};

export const testimonials = s => `<section class="section testimonials" id="clientes"><div class="container stack">
    <div class="center section-head" data-anim><span class="eyebrow">Clientes</span><h2>Lo que dicen los equipos que usan Pulso</h2></div>
    <div class="grid-3">${(s.testimonials || []).map(t => `<figure class="card quote"><blockquote>“${escape(t.quote)}”</blockquote><figcaption class="user-chip"><span class="avatar" style="--size:40px">${escape(initials(t.name))}</span><span><b>${escape(t.name)}</b><br><small class="muted">${escape(t.role)} · ${escape(t.company)}</small></span></figcaption></figure>`).join('')}</div>
  </div></section>`;

export const guide = () => `<section class="section guide-band"><div class="container">
    <div class="card guide" data-anim>
      <div class="stack" style="gap:8px"><span class="eyebrow">Guía gratuita</span><h2 style="margin:0">10 claves para ordenar tu pipeline B2B</h2><p class="muted" style="margin:0">Plantillas de etapas, criterios de calificación y métricas que usan los mejores equipos de Chile.</p></div>
      <form class="guide-form" data-guide novalidate>
        <label class="sr-only" for="g-name">Nombre</label><input class="input" id="g-name" name="name" placeholder="Tu nombre" required>
        <label class="sr-only" for="g-email">Correo</label><input class="input" id="g-email" name="email" type="email" placeholder="correo@empresa.cl" required>
        <label class="sr-only" for="g-company">Empresa</label><input class="input" id="g-company" name="company" placeholder="Empresa" required>
        <button class="btn btn-accent" type="submit">Descargar guía</button>
        <small class="muted guide-msg" data-guidemsg role="status"></small>
      </form>
    </div>
  </div></section>`;

export const demo = (s, plan) => `<section class="section demo" id="demo"><div class="container demo-grid">
    <div class="stack" data-anim>
      <span class="eyebrow">Demo personalizada</span>
      <h2>Agenda 30 minutos con nuestro equipo</h2>
      <p class="muted">Te mostramos Pulso con datos de tu industria y te ayudamos a migrar tus planillas.</p>
      <ul class="checks"><li>${icon('check', 16)} Respuesta en menos de 24 horas hábiles</li><li>${icon('check', 16)} Configuración inicial gratis</li><li>${icon('check', 16)} Importación de contactos incluida</li></ul>
      <p class="small muted">¿Prefieres hablar? <b>${escape(s.contactPhone || '')}</b> · ${escape(s.contactEmail || '')}</p>
    </div>
    <form class="card stack demo-form" data-demo novalidate>
      <div class="grid-2">
        <div class="field"><label for="d-name">Nombre *</label><input class="input" id="d-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="d-email">Correo corporativo *</label><input class="input" id="d-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="d-company">Empresa *</label><input class="input" id="d-company" name="company" required autocomplete="organization"></div>
        <div class="field"><label for="d-phone">Teléfono</label><input class="input" id="d-phone" name="phone" placeholder="+56 9 …" autocomplete="tel"></div>
        <div class="field"><label for="d-size">Tamaño del equipo</label><select class="select" id="d-size" name="size"><option value="1-10">1 a 10 personas</option><option value="11-50" selected>11 a 50</option><option value="51-200">51 a 200</option><option value="201-500">201 a 500</option><option value="500+">Más de 500</option></select></div>
        <div class="field"><label for="d-plan">Plan de interés</label><select class="select" id="d-plan" name="interest">${(s.plans || []).map(p => `<option ${plan === p.name ? 'selected' : ''}>Plan ${escape(p.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="d-msg">¿Qué te gustaría resolver?</label><textarea class="textarea" id="d-msg" name="message" placeholder="Ej: somos 12 vendedores y usamos Excel para el seguimiento"></textarea></div>
      <label class="check small"><input type="checkbox" name="consent" required> Acepto que Pulso me contacte sobre esta solicitud.</label>
      <button class="btn btn-primary btn-lg" type="submit">Solicitar demo</button>
    </form>
  </div></section>`;

export const faq = s => `<section class="section" id="faq"><div class="container narrow stack">
    <div class="center section-head" data-anim><span class="eyebrow">Preguntas frecuentes</span><h2>¿Dudas?</h2></div>
    ${(s.faq || []).map(f => `<details class="card faq-item" data-anim><summary>${escape(f.q)}</summary><p class="muted">${escape(f.a)}</p></details>`).join('')}
  </div></section>`;

export const footer = s => `<footer class="site-footer"><div class="container row between">
    <div class="stack" style="gap:4px"><a class="brand" href="#top"><span class="logo">${icon('bolt', 16)}</span> Pulso CRM</a><small class="muted">Marca ficticia para demostración · Santiago de Chile</small></div>
    <nav class="row small"><a href="#funciones">Funciones</a><a href="#precios">Precios</a><a href="login.html">Acceso clientes</a><a href="admin.html">Administración</a></nav>
    <small class="muted">${escape(s.contactEmail || '')} · ${escape(s.contactPhone || '')}</small>
  </div></footer>`;
