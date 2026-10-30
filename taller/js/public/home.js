// Portada: búsqueda de OT, tablero "hoy en el taller", servicios, proceso y convenios con aseguradoras.
import { escape, money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { SERVICES, STAGES } from '../data/catalog.js';
import { settings, openOTs, ST_OF, otByCode, normPlate } from '../shared/domain.js';

const mask = p => p.replace(/^(..)(..)/, '$1••');
export function otLookup(el, { target = 'ot', cta = 'Ver estado' } = {}) {
  el.innerHTML = `<form class="plate-form" novalidate><label class="sr-only" for="ol-q">Código de OT o patente</label><input class="input" id="ol-q" name="buscar" placeholder="OT-24810 o patente"><button class="btn btn-primary">${escape(cta)}</button></form><small class="muted" data-msg></small>`;
  el.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const q = e.target.elements.buscar.value.trim();
    const o = otByCode(q) || db.query('ots', x => normPlate(x.plate) === normPlate(q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!o) { el.querySelector('[data-msg]').innerHTML = '<span class="text-danger">No encontramos esa OT. Revisa el código que te enviamos por WhatsApp.</span>'; return; }
    location.hash = `#/${target}/${o.code}`;
  };
}
const board = () => {
  const open = openOTs();
  const cnt = s => open.filter(o => o.status === s).length;
  return `<div class="row between"><b><span class="live-dot"></span> Hoy en el taller</b><small class="muted">${open.length} OT abiertas</small></div>
    <div class="grid-3 small" style="gap:8px">${[['recepcion', 'diagnostico'], ['presupuesto', 'aprobado', 'reparacion'], ['control', 'listo']].map((g, i) => `<div class="card" style="padding:10px;text-align:center"><b class="big-num">${g.reduce((s, x) => s + cnt(x), 0)}</b><small class="d-block muted">${['Ingreso y diagnóstico', 'Presupuesto y reparación', 'Control y listos'][i]}</small></div>`).join('')}</div>
    <div class="hero-board">${open.slice().sort((a, b) => ST_OF(b.status).i - ST_OF(a.status).i).slice(0, 5).map(o => `<div class="hero-ot small"><span class="plate">${escape(mask(o.plate))}</span><span><b>${escape(o.car)}</b><div class="progress" style="margin-top:4px"><i style="--v:${(ST_OF(o.status).i + 1) / 8 * 100}%"></i></div></span><span class="badge ${ST_OF(o.status).badge ? 'badge-' + ST_OF(o.status).badge : ''}">${escape(ST_OF(o.status).label)}</span></div>`).join('')}</div>`;
};

export function renderHome(el) {
  const paint = () => {
    const c = settings();
    el.innerHTML = `
    <section class="site-hero hero"><div class="container hero-grid">
      <div class="hero-text stack" data-anim>
        <span class="eyebrow">${escape(c.tagline)}</span>
        <h1>${escape(c.heroTitle)}</h1>
        <p class="lead">${escape(c.heroText)}</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#/cotizar">Cotizar o agendar</a><a class="btn btn-lg" href="#/presupuesto">Aprobar mi presupuesto</a></div>
        <div class="card stack" style="gap:8px"><b>¿Tu auto ya está con nosotros?</b><div data-lk></div></div>
        <div class="row facts"><div><b>8</b><small>etapas visibles en línea</small></div><div><b>24</b><small>meses de garantía en pintura</small></div><div><b>3</b><small>aseguradoras en convenio</small></div></div>
      </div>
      <div class="hero-media card stack" data-anim data-anim-delay="150"><div data-board class="stack">${board()}</div></div>
    </div></section>

    <section class="section band services"><div class="container stack">
      <div class="row between" data-anim><div><span class="eyebrow">Servicios</span><h2>Mecánica, electrónica y carrocería en un solo lugar</h2></div><a class="btn" href="#/servicios">Ver todos →</a></div>
      <div class="grid-4">${SERVICES.map(s => `<a class="card hover svc-card" href="#/servicios/${s.id}" style="text-decoration:none;color:inherit"><span class="svc-ico">${s.icon}</span><h3 style="margin:0">${escape(s.name)}</h3><p class="small muted" style="margin:0">${escape(s.desc)}</p><span class="small">${s.from ? `desde <b class="price">${money(s.from)}</b>` : '<b>Pagas solo el deducible</b>'}</span></a>`).join('')}</div>
    </div></section>

    <section class="section how"><div class="container stack">
      <div data-anim><span class="eyebrow">Cómo trabajamos</span><h2>Transparencia en cada etapa de tu OT</h2></div>
      <div class="process">${[['📥', 'Recepción con inventario', 'Registramos kilometraje, combustible, accesorios y daños previos en un diagrama, con fotos.'], ['🩺', 'Diagnóstico', 'Escáner, prueba de ruta y revisión por especialista. Te explicamos qué encontramos.'], ['📱', 'Apruebas ítem por ítem', 'Recibes el presupuesto con fotos: apruebas o rechazas cada repuesto y mano de obra, y pagas un abono.'], ['🏁', 'Seguimiento y garantía', 'Ves tu OT pasar por reparación y control de calidad. Retiras con factura y garantía escrita.']].map(([i, t, d]) => `<div class="card step-card"><span class="svc-ico">${i}</span><h3 style="margin:0">${t}</h3><p class="small muted" style="margin:0">${d}</p></div>`).join('')}</div>
      <div class="ot-timeline h" aria-hidden="true">${STAGES.map(([, l, ic], i) => `<li class="${i < 4 ? 'done' : i === 4 ? 'now' : ''}"><span class="dot">${ic}</span><small>${l}</small></li>`).join('')}</div>
    </div></section>

    <section class="section band insurers-band"><div class="container grid-2" style="align-items:center">
      <div data-anim><span class="eyebrow">Siniestros</span><h2>¿Chocaste? Nosotros hablamos con tu seguro</h2><p class="muted">Somos taller en convenio: coordinamos al liquidador, enviamos el presupuesto con fotos y solo pagas el deducible.</p><a class="btn btn-primary" href="#/cotizar?s=siniestros">Ingresar siniestro</a></div>
      <div class="stack"><div class="insurers">${db.all('insurers').filter(i => i.active).map(i => `<span class="insurer-chip">🛡️ ${escape(i.name)}</span>`).join('')}</div><p class="small muted">Deducibles desde 3 UF según tu póliza. Auto de reemplazo sujeto a cobertura.</p></div>
    </div></section>

    <section class="section cta"><div class="container grid-2" style="align-items:center">
      <div data-anim><span class="eyebrow">Garantía escrita</span><h2>Respaldamos cada trabajo</h2><p class="muted">${escape(c.guarantee)}</p><a class="btn" href="#/garantia">Consultar una garantía</a></div>
      <div class="card stack"><b>📍 ${escape(c.address)}</b><span class="small">🕘 ${escape(c.hours)}</span><span class="small">📞 ${escape(c.phone)} · 💬 ${escape(c.whatsapp)}</span><a class="btn btn-primary" href="#/cotizar">Agendar visita</a></div>
    </div></section>`;
    otLookup(el.querySelector('[data-lk]'));
  };
  paint();
  return { refresh: ch => { if (ch?.col === 'ots') { const b = el.querySelector('[data-board]'); if (b) b.innerHTML = board(); } else paint(); } };
}
