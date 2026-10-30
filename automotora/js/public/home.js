// Portada: billboard editable (CMS), herramientas, marcas, destacados, ofertas, lanzamientos y sucursales.
import { escape, money, toast, formModal } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { cms, model, brand, activeModels, fromPrice, maxBonus, campaignsFor, campaignLive, CAMPAIGN_TYPES, showrooms, createLead, color, settings } from '../shared/domain.js';
import { carOf, carSVG } from '../shared/car.js';
import { modelCard, wireCompare, sectionHead, countdown } from './cards.js';
import { fdate } from '../shared/util.js';
import { icon } from '../shared/icons.js';

let timer;
export function renderHome(el) {
  const c = cms(), sec = c.sections || {};
  const slides = (c.hero || []).map(h => ({ ...h, m: model(h.modelId) })).filter(h => h.m && h.m.status === 'activo');
  const models = activeModels();
  const featured = models.filter(m => m.featured).slice(0, 6);
  const offers = db.query('campaigns', x => campaignLive(x) && x.featured);
  const launches = db.query('models', m => m.status === 'lanzamiento').sort((a, b) => a.launchDate.localeCompare(b.launchDate));
  const brands = db.query('brands', b => b.active !== false);

  el.innerHTML = `
  ${slides.length ? `<section class="site-hero billboard" aria-roledescription="carrusel">
    <div class="container">
      <div class="hero-text" data-slide-text></div>
      <div class="hero-media"><div class="hero-stage" data-slide-art></div>
        <div class="bb-ctrl"><button class="btn btn-icon btn-ghost btn-sm" data-prev aria-label="Anterior">${icon('back', 16)}</button><div class="bb-dots">${slides.map((s, i) => `<button class="bb-dot" data-dot="${i}" aria-label="${escape(s.title)}"></button>`).join('')}</div><button class="btn btn-icon btn-ghost btn-sm" data-next aria-label="Siguiente">${icon('arrow', 16)}</button></div>
      </div>
    </div>
  </section>` : ''}
  ${sec.tools !== false ? `<section class="section tight tools-sec"><div class="container"><div class="grid-4 tools">
    ${[['#/financiamiento', 'card', 'Simula tu crédito', 'Convencional, Compra Inteligente o leasing'], ['#/tasacion', 'swap', 'Tasa tu usado', 'Precio estimado en 2 minutos'], ['#/test-drive', 'steer', 'Agenda un test drive', 'En cualquiera de nuestras 3 sucursales'], ['#/posventa', 'wrench', 'Agenda tu mantención', 'Pautas por kilometraje con precio fijo']].map(([h, i, t, s]) => `<a class="card hover tool" href="${h}" data-anim><span class="icon-bubble">${icon(i, 22)}</span><span><b>${t}</b><small class="muted">${s}</small></span></a>`).join('')}
  </div></div></section>` : ''}
  ${sec.brands !== false ? `<section class="section tight brands-sec"><div class="container">${sectionHead('Multimarca', 'Ocho marcas, un solo lugar')}
    <div class="brand-strip" data-anim>${brands.map(b => `<a class="brand-tile" href="#/modelos?marca=${b.id}"><b>${escape(b.name)}</b><small>${models.filter(m => m.brandId === b.id).length} modelos</small></a>`).join('')}</div></div></section>` : ''}
  <section class="section featured-sec"><div class="container">${sectionHead('Destacados', 'Los más buscados del mes', `<a class="btn" href="#/modelos">Ver los ${models.length} modelos ${icon('arrow', 16)}</a>`)}
    <div class="grid-3 model-grid">${featured.map(m => modelCard(m)).join('')}</div></div></section>
  ${sec.offers !== false && offers.length ? `<section class="section offers-sec"><div class="container">${sectionHead('Campañas vigentes', c.offersTitle || 'Ofertas', `<a class="btn" href="#/ofertas">Todas las ofertas</a>`)}
    <div class="grid-3 offer-grid">${offers.slice(0, 6).map(offerCard).join('')}</div></div></section>` : ''}
  ${sec.launches !== false && launches.length ? `<section class="section launches-sec"><div class="container">${sectionHead('Muy pronto', c.launchesTitle || 'Lanzamientos', '', 'Sé el primero en conocerlos: te avisamos y te reservamos un test drive.')}
    <div class="grid-3 launch-grid">${launches.map(m => `<article class="card launch-card"><div class="launch-art">${carOf(m, m.colors[0].hex)}<span class="launch-veil"></span></div>
      <span class="eyebrow">${escape(brand(m.brandId)?.name)} · ${fdate(m.launchDate)}</span><h3>${escape(m.name)}</h3><p class="muted small">${escape(m.tagline)}</p>
      <div class="row between"><span>Desde <b>${money(fromPrice(m))}</b> <small class="muted">estimado</small></span><span class="badge badge-primary">${countdown(m.launchDate).replace('Quedan', 'En').replace('Termina mañana', 'Mañana')}</span></div>
      <button class="btn btn-accent btn-sm" data-notify="${m.id}">${icon('bell', 15)} Avísame</button></article>`).join('')}</div></div></section>` : ''}
  ${sec.showrooms !== false ? `<section class="section showrooms-sec"><div class="container">${sectionHead('Sucursales', 'Showroom y taller en 3 ciudades', `<a class="btn" href="#/sucursales">Ver mapas y horarios</a>`)}
    <div class="grid-3">${showrooms().map(s => `<article class="card showroom-card"><span class="icon-bubble accent">${icon('store', 22)}</span><h3>${escape(s.city)}</h3><p class="small">${escape(s.address)}<br><span class="muted">${escape(s.hours)}</span></p>
      <div class="tag-list">${s.brands.map(b => `<span class="chip-mini">${escape(brand(b)?.name || b)}</span>`).join('')}</div><p class="small muted">${icon('wrench', 14)} Taller de ${s.bays} bahías · ${icon('phone', 14)} ${escape(s.phone)}</p></article>`).join('')}</div></div></section>` : ''}
  ${sec.testimonials !== false && c.testimonials?.length ? `<section class="section tight"><div class="container">${sectionHead('Clientes', 'Lo que dicen de nosotros')}<div class="grid-3">${c.testimonials.map(([n, t]) => `<blockquote class="card quote-card"><p>“${escape(t)}”</p><footer>${'★'.repeat(5)} <b>${escape(n)}</b></footer></blockquote>`).join('')}</div></div></section>` : ''}`;

  wireCompare(el);
  el.querySelectorAll('[data-notify]').forEach(b => b.onclick = async () => {
    const m = model(b.dataset.notify);
    const v = await formModal({ title: `Avísame del lanzamiento: ${m.name}`, submit: 'Quiero que me avisen', fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'phone', label: 'Teléfono', type: 'tel' }, { name: 'showroomId', label: 'Sucursal preferida', type: 'select', options: showrooms().filter(s => s.brands.includes(m.brandId)).map(s => [s.id, s.city]) }] });
    if (!v) return;
    createLead({ ...v, modelId: m.id, versionId: m.versions[0].id, type: 'lanzamiento', note: `Pre-registro para el lanzamiento de ${m.name}.` });
    toast('¡Listo! Te avisaremos apenas llegue a nuestros showrooms.', 'success');
  });
  if (slides.length) billboard(el, slides, (c.heroInterval || 6) * 1000);
}

function offerCard(x) {
  const ms = x.scope === 'modelos' ? x.modelIds.map(model).filter(Boolean) : [];
  const m = ms[0];
  return `<article class="card hover offer-card">
    <div class="offer-top"><span class="badge badge-${x.type === 'regalo' ? 'success' : x.type === 'financiamiento' ? 'info' : 'danger'}">${CAMPAIGN_TYPES[x.type]}</span><small class="muted">${countdown(x.to)}</small></div>
    ${m ? `<div class="offer-art">${carOf(m, m.colors[3]?.hex || m.colors[0].hex)}</div>` : `<div class="offer-art big-amount">${icon(x.type === 'retoma' ? 'swap' : 'tag', 42)}</div>`}
    <h3>${escape(x.name)}</h3>
    <p class="offer-amount">${x.type === 'regalo' ? 'Regalo valorizado en ' : 'Hasta '}<b>${money(x.amount)}</b></p>
    <p class="muted small">${escape(x.desc)}</p>
    <p class="small">${ms.length ? ms.map(mm => escape(mm.name)).join(', ') : x.scope === 'marca' ? 'Toda la gama ' + escape(brand(x.brandId)?.name) : 'Todos los modelos'} · hasta el ${fdate(x.to)}</p>
    ${m ? `<a class="btn btn-sm btn-primary" href="#/modelo/${m.id}">Configurar ${escape(m.name)}</a>` : `<a class="btn btn-sm" href="${x.type === 'retoma' ? '#/tasacion' : '#/modelos'}">${x.type === 'retoma' ? 'Tasar mi auto' : 'Ver modelos'}</a>`}
  </article>`;
}
export { offerCard };

function billboard(el, slides, ms) {
  let i = 0;
  const txt = el.querySelector('[data-slide-text]'), art = el.querySelector('[data-slide-art]');
  const show = k => {
    i = (k + slides.length) % slides.length;
    const s = slides[i], m = s.m, b = brand(m.brandId), col = color(m, s.colorId) || m.colors[0], bonus = maxBonus(m);
    txt.innerHTML = `<span class="eyebrow">${escape(b.name)} · ${escape(s.badge || '')}</span><h1>${escape(s.title)}</h1><p class="lead">${escape(s.text)}</p>
      <div class="hero-price"><small class="muted">Desde</small> <b>${money(fromPrice(m))}</b>${bonus ? ` <span class="badge badge-danger">Bonos hasta ${money(bonus)}</span>` : ''}</div>
      <div class="row hero-ctas"><a class="btn btn-primary btn-lg" href="#/modelo/${m.id}">${icon('palette', 18)} Configúralo</a><a class="btn btn-lg" href="#/test-drive?modelo=${m.id}">${icon('steer', 18)} Test drive</a></div>`;
    art.innerHTML = `<div class="stage-floor"></div>${carSVG({ body: m.body, paint: col.hex, fuel: m.fuel, wheel: { style: m.wheels[1]?.style || 'multi', rim: m.wheels[1]?.rim || 'two' }, title: m.name })}<span class="stage-color">${escape(col.name)}</span>`;
    art.classList.remove('enter'); void art.offsetWidth; art.classList.add('enter');
    el.querySelectorAll('.bb-dot').forEach((d, j) => d.classList.toggle('active', j === i));
  };
  show(0);
  const restart = () => { clearInterval(timer); timer = setInterval(() => { if (!document.body.contains(art)) return clearInterval(timer); if (!art.matches(':hover')) show(i + 1); }, ms); };
  el.querySelector('[data-prev]').onclick = () => { show(i - 1); restart(); };
  el.querySelector('[data-next]').onclick = () => { show(i + 1); restart(); };
  el.querySelectorAll('[data-dot]').forEach(d => d.onclick = () => { show(+d.dataset.dot); restart(); });
  restart();
}
