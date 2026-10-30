// Ficha de modelo + configurador interactivo (versión, color, llantas, packs, accesorios),
// vistas lateral/frontal/trasera, resumen de precio con bonos, guardar / compartir / ficha imprimible.
import { escape, money, toast, modal, formModal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { showColor, model, brand, version, features, priceConfig, encodeConfig, decodeConfig, accessoriesFor, stockFor, stockBadge, showrooms, SEGMENTS, FUELS, createLead, campaignsFor, CAMPAIGN_TYPES } from '../shared/domain.js';
import { carSVG, carOf } from '../shared/car.js';
import { simulate } from '../shared/finance.js';
import { specSheetHTML } from '../shared/docs.js';
import { fdate, uiGet, uiSet, nf } from '../shared/util.js';
import { icon } from '../shared/icons.js';
import { countdown } from './cards.js';

const VIEWS = [['side', 'Lateral'], ['front', 'Frontal'], ['rear', 'Trasera']];
const STEPS = [['version', 'Versión'], ['color', 'Color'], ['wheels', 'Llantas'], ['packs', 'Packs'], ['acc', 'Accesorios']];

export function renderModel(el, params, query = {}) {
  const fromCode = params.code ? decodeConfig(params.code) : null;
  const m = model(fromCode?.modelId || params.id);
  if (!m || m.status === 'inactivo') { el.innerHTML = `<section class="section"><div class="container empty"><h1>Modelo no disponible</h1><a class="btn btn-primary" href="#/modelos">Ver modelos</a></div></section>`; return; }
  if (m.status === 'lanzamiento') return renderLaunch(el, m);
  const b = brand(m.brandId);
  const cfg = fromCode || { modelId: m.id, versionId: m.versions[Math.min(1, m.versions.length - 1)].id, colorId: showColor(m).id, wheelId: m.wheels[0].id, packIds: [], accIds: [] };
  const st = { view: 'side', step: query.paso || 'version', fin: uiGet('cfgFin', true), trade: uiGet('cfgTrade', false), anim: false };
  let animT;

  el.innerHTML = `
  <section class="cfg-top"><div class="container cfg-title">
    <div><a class="small" href="#/modelos">${icon('back', 14)} Modelos</a><span class="eyebrow">${escape(b.name)} · ${SEGMENTS[m.segment]} · ${FUELS[m.fuel]}</span><h1>${escape(m.name)} <small class="muted">${m.year}</small></h1><p class="muted">${escape(m.tagline)}</p></div>
    <div class="cfg-quick">${[['seat', m.seats + ' asientos'], ['box', m.trunk + ' L maletero'], ['shield', `${b.warrantyYears} años garantía`]].map(([i, t]) => `<span class="chip-mini">${icon(i, 14)} ${t}</span>`).join('')}</div>
  </div></section>
  <section class="section tight cfg-sec"><div class="container configurator">
    <div class="cfg-stage card">
      <div class="stage-tabs" role="tablist">${VIEWS.map(([k, l]) => `<button class="chip" data-view="${k}" role="tab">${l}</button>`).join('')}<button class="btn btn-sm btn-ghost" data-rotate title="Girar">${icon('rotate', 16)} Girar</button><button class="btn btn-sm btn-ghost" data-anim title="Vista 360°">${icon('play', 14)} 360°</button></div>
      <div class="stage" data-stage tabindex="0" aria-label="Vista del auto: arrastra para girar"></div>
      <div class="stage-foot"><span data-colname></span><span data-stock></span></div>
      <p class="small muted center stage-hint">${icon('swap', 14)} Arrastra el auto o usa ← → para girarlo</p>
    </div>
    <div class="cfg-panel">
      <ol class="steps cfg-steps">${STEPS.map(([k, l]) => `<li><button data-step="${k}">${l}</button></li>`).join('')}</ol>
      <div class="cfg-body card" data-body></div>
      <div class="card cfg-stock"><div class="card-title"><h3>${icon('store', 18)} Disponibilidad por sucursal</h3><a class="small" href="#/stock?modelo=${m.id}">Ver todo el stock</a></div><div data-avail></div></div>
    </div>
    <aside class="cfg-summary card" data-summary aria-live="polite"></aside>
  </div></section>`;

  const stage = el.querySelector('[data-stage]'), body = el.querySelector('[data-body]'), sum = el.querySelector('[data-summary]');
  const code = () => encodeConfig(cfg);
  const syncUrl = () => { try { history.replaceState(null, '', '#/config/' + code()); } catch (e) { /* sin history */ } };

  function drawStage(flip) {
    const p = priceConfig(cfg);
    stage.innerHTML = carSVG({ body: m.body, paint: p.col.hex, view: st.view, wheel: { style: p.w.style, rim: p.w.rim }, fuel: m.fuel, plate: 'NUEVO·26', title: `${m.name} ${p.col.name}` });
    if (flip) { stage.classList.remove('flip'); void stage.offsetWidth; stage.classList.add('flip'); }
    el.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x.dataset.view === st.view));
    el.querySelector('[data-colname]').innerHTML = `<i class="swatch-dot" style="background:${p.col.hex}"></i> ${escape(p.col.name)} · ${escape(p.w.name)}`;
    el.querySelector('[data-stock]').innerHTML = stockBadge(stockFor(m.id, { versionId: cfg.versionId, colorId: cfg.colorId }));
  }
  const rotate = (d = 1) => { const i = VIEWS.findIndex(v => v[0] === st.view); st.view = VIEWS[(i + d + 3) % 3][0]; drawStage(true); };

  function drawBody() {
    el.querySelectorAll('[data-step]').forEach((x, i) => { x.parentElement.classList.toggle('current', x.dataset.step === st.step); x.parentElement.classList.toggle('done', STEPS.findIndex(s => s[0] === st.step) > i); });
    const p = priceConfig(cfg);
    let h = '';
    if (st.step === 'version') h = `<div class="opt-list">${m.versions.map(v => `<button class="opt ${v.id === cfg.versionId ? 'sel' : ''}" data-pick="versionId" data-v="${v.id}"><span><b>${escape(v.name)}</b><small>${escape(v.engine)} · ${v.hp} hp · ${escape(v.trans)} · ${escape(v.traction)}</small><small>${escape(v.cons)}</small></span><b class="opt-price">${money(v.price)}</b></button>`).join('')}</div>
      <details class="feat-box" open><summary>Equipamiento ${escape(p.v.name)}</summary><ul class="feat-list">${features(p.v).map(x => `<li>${icon('check', 14)} ${escape(x)}</li>`).join('')}</ul></details>`;
    if (st.step === 'color') h = `<div class="swatches">${m.colors.map(c => `<button class="swatch ${c.id === cfg.colorId ? 'sel' : ''}" data-pick="colorId" data-v="${c.id}" title="${escape(c.name)}"><i style="background:${c.hex}"></i><span>${escape(c.name)}<small>${c.price ? '+' + money(c.price) : 'Sin costo'}</small></span></button>`).join('')}</div>`;
    if (st.step === 'wheels') h = `<div class="opt-list">${m.wheels.map(w => `<button class="opt ${w.id === cfg.wheelId ? 'sel' : ''}" data-pick="wheelId" data-v="${w.id}"><span class="wheel-thumb">${carSVG({ body: m.body, paint: p.col.hex, wheel: { style: w.style, rim: w.rim } })}</span><span><b>${escape(w.name)}</b><small>${{ std: '5 rayos', multi: 'Multirrayo diamantado', sport: '10 rayos con caliper rojo', aero: 'Aerodinámica de baja resistencia' }[w.style]}</small></span><b class="opt-price">${w.price ? '+' + money(w.price) : 'Incluidas'}</b></button>`).join('')}</div>`;
    if (st.step === 'packs') h = `<div class="opt-list">${m.packs.map(k => `<label class="opt check-opt ${cfg.packIds.includes(k.id) ? 'sel' : ''}"><input type="checkbox" data-toggle="packIds" value="${k.id}" ${cfg.packIds.includes(k.id) ? 'checked' : ''}><span><b>${escape(k.name)}</b><small>${escape(k.desc)}</small></span><b class="opt-price">+${money(k.price)}</b></label>`).join('')}</div>`;
    if (st.step === 'acc') { const accs = accessoriesFor(m); const cats = [...new Set(accs.map(a => a.cat))]; h = cats.map(c => `<h4 class="opt-cat">${escape(c)}</h4><div class="opt-list compact">${accs.filter(a => a.cat === c).map(a => `<label class="opt check-opt ${cfg.accIds.includes(a.id) ? 'sel' : ''}"><input type="checkbox" data-toggle="accIds" value="${a.id}" ${cfg.accIds.includes(a.id) ? 'checked' : ''}><span><b>${escape(a.name)}</b></span><b class="opt-price">+${money(a.price)}</b></label>`).join('')}</div>`).join(''); }
    const i = STEPS.findIndex(s => s[0] === st.step);
    h += `<div class="row between step-nav">${i > 0 ? `<button class="btn btn-ghost" data-go="${STEPS[i - 1][0]}">${icon('back', 16)} ${STEPS[i - 1][1]}</button>` : '<span></span>'}${i < STEPS.length - 1 ? `<button class="btn btn-primary" data-go="${STEPS[i + 1][0]}">Siguiente: ${STEPS[i + 1][1]} ${icon('arrow', 16)}</button>` : `<a class="btn btn-primary" href="#/cotizar?config=${encodeURIComponent(code())}">${icon('file', 16)} Solicitar cotización</a>`}</div>`;
    body.innerHTML = h;
  }

  function drawAvail() {
    el.querySelector('[data-avail]').innerHTML = `<div class="avail">${showrooms().filter(s => s.brands.includes(m.brandId)).map(s => { const x = stockFor(m.id, { versionId: cfg.versionId, showroomId: s.id }), any = stockFor(m.id, { showroomId: s.id }); return `<div class="avail-row"><span><b>${escape(s.city)}</b><small class="muted">${x.inStock.length ? `${x.inStock.filter(u => u.colorId === cfg.colorId).length} en tu color` : any.inStock.length ? `${any.inStock.length} unidad(es) de otras versiones` : ''}</small></span>${stockBadge(x)}</div>`; }).join('')}</div>`;
  }

  function drawSummary() {
    const p = priceConfig(cfg, { financing: st.fin, tradeIn: st.trade });
    const smart = db.get('finProducts', 'fp-smart');
    const sim = smart?.active ? simulate({ product: smart, price: p.total, pie: Math.round(p.total * .3), plazo: 36 }) : null;
    const possible = campaignsFor(m).filter(c => c.type !== 'regalo' && !p.bonuses.includes(c));
    sum.innerHTML = `<div class="sum-head">${carSVG({ body: m.body, paint: p.col.hex, wheel: { style: p.w.style, rim: p.w.rim }, fuel: m.fuel })}<div><span class="eyebrow">Tu ${escape(m.name)}</span><b>${escape(p.v.name)}</b></div></div>
      <div class="sum-lines">${p.lines.map(([l, n]) => `<div class="line"><span>${escape(l)}</span><span>${n ? money(n) : 'Incluido'}</span></div>`).join('')}
      <div class="line total-list"><span>Precio lista</span><span>${money(p.list)}</span></div>
      ${p.bonuses.map(x => `<div class="line bonus"><span>${escape(x.name)}</span><span>−${money(x.amount)}</span></div>`).join('')}
      ${p.gifts.map(g => `<div class="line bonus"><span>${icon('sparkle', 14)} ${escape(g.name)}</span><span>Regalo</span></div>`).join('')}</div>
      <div class="sum-toggles"><label class="check"><input type="checkbox" data-fin ${st.fin ? 'checked' : ''}> Financiaré con Autoplaza</label><label class="check"><input type="checkbox" data-trade ${st.trade ? 'checked' : ''}> Dejo mi auto en parte de pago</label>
      ${possible.length ? `<small class="muted">${icon('tag', 13)} Puedes sumar: ${possible.map(c => `${escape(c.name)} (${money(c.amount)})`).join(', ')}</small>` : ''}</div>
      <div class="sum-total"><span>Precio final</span><b>${money(p.total)}</b></div>
      ${sim ? `<a class="sum-cuota" href="#/financiamiento?config=${encodeURIComponent(code())}">${icon('card', 16)} <span>Compra Inteligente desde <b>${money(sim.cuota)}</b>/mes<br><small class="muted">pie 30% · 36 cuotas · CAE ${sim.cae.toFixed(1).replace('.', ',')}% · VFMG ${money(sim.vfmg)}</small></span></a>` : ''}
      <div class="sum-actions">
        <a class="btn btn-primary btn-block" href="#/cotizar?config=${encodeURIComponent(code())}">${icon('file', 16)} Cotizar este auto</a>
        <a class="btn btn-block" href="#/test-drive?modelo=${m.id}">${icon('steer', 16)} Agendar test drive</a>
        <div class="row sum-mini"><button class="btn btn-sm btn-ghost" data-save>${icon('save', 15)} Guardar</button><button class="btn btn-sm btn-ghost" data-share>${icon('share', 15)} Compartir</button><a class="btn btn-sm btn-ghost" href="#/ficha/${encodeURIComponent(code())}">${icon('print', 15)} Ficha</a></div>
      </div>`;
    sum.querySelector('[data-fin]').onchange = e => { st.fin = e.target.checked; uiSet('cfgFin', st.fin); drawSummary(); };
    sum.querySelector('[data-trade]').onchange = e => { st.trade = e.target.checked; uiSet('cfgTrade', st.trade); drawSummary(); };
    sum.querySelector('[data-save]').onclick = save;
    sum.querySelector('[data-share]').onclick = share;
  }
  const all = (flip) => { drawStage(flip); drawBody(); drawAvail(); drawSummary(); syncUrl(); };

  async function save() {
    const u = auth.current();
    if (!u || u.role !== 'cliente') {
      const loc = uiGet('savedConfigs', []); uiSet('savedConfigs', [code(), ...loc.filter(c => c !== code())].slice(0, 8));
      toast('Guardada en este navegador. Ingresa a tu cuenta para tenerla en todos tus dispositivos.', 'success', 4500);
      return;
    }
    const v = await formModal({ title: 'Guardar configuración', submit: 'Guardar', fields: [{ name: 'name', label: 'Nombre para recordarla', value: `Mi ${m.name}`, required: true }] });
    if (!v) return;
    db.insert('configs', { code: code(), userId: u.id, modelId: m.id, name: v.name });
    db.log('config', `${u.name} guardó una configuración de ${m.name}`, u.id);
    toast('Configuración guardada en tu cuenta', 'success');
  }
  function share() {
    const url = location.href.split('#')[0] + '#/config/' + code();
    const mm = modal({ title: 'Compartir configuración', body: `<div class="stack"><p class="muted">Cualquiera con este enlace verá exactamente este ${escape(m.name)}.</p><input class="input mono" readonly value="${escape(url)}" data-url><div class="row"><button class="btn btn-primary" data-copy>${icon('share', 16)} Copiar enlace</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Mira mi ' + m.name + ': ' + url)}">WhatsApp</a></div></div>` });
    mm.el.querySelector('[data-copy]').onclick = async () => { const i = mm.el.querySelector('[data-url]'); i.select(); try { await navigator.clipboard.writeText(url); } catch (e) { document.execCommand?.('copy'); } toast('Enlace copiado', 'success'); };
  }

  el.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { cfg[pick.dataset.pick] = pick.dataset.v; all(pick.dataset.pick === 'colorId'); return; }
    const go = e.target.closest('[data-go], [data-step]');
    if (go) { st.step = go.dataset.go || go.dataset.step; drawBody(); return; }
    const v = e.target.closest('[data-view]');
    if (v) { st.view = v.dataset.view; drawStage(true); return; }
    if (e.target.closest('[data-rotate]')) rotate(1);
    const an = e.target.closest('[data-anim]');
    if (an) { st.anim = !st.anim; an.innerHTML = st.anim ? `${icon('pause', 14)} Detener` : `${icon('play', 14)} 360°`; clearInterval(animT); stage.classList.toggle('spinning', st.anim); if (st.anim) animT = setInterval(() => { if (!document.body.contains(stage)) return clearInterval(animT); rotate(1); }, 1500); }
  });
  el.addEventListener('change', e => {
    const t = e.target.closest('[data-toggle]'); if (!t) return;
    const k = t.dataset.toggle; cfg[k] = t.checked ? [...cfg[k], t.value] : cfg[k].filter(x => x !== t.value);
    t.closest('.opt').classList.toggle('sel', t.checked); drawStage(); drawSummary(); syncUrl();
  });
  // Girar arrastrando (mouse o dedo) y con flechas
  let x0 = null;
  stage.addEventListener('pointerdown', e => { x0 = e.clientX; stage.setPointerCapture?.(e.pointerId); });
  stage.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 30) rotate(e.clientX < x0 ? 1 : -1); x0 = null; });
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowRight') rotate(1); if (e.key === 'ArrowLeft') rotate(-1); });
  all();
}

function renderLaunch(el, m) {
  const b = brand(m.brandId);
  el.innerHTML = `<section class="site-hero launch-hero"><div class="container"><div class="hero-text"><span class="eyebrow">${escape(b.name)} · Lanzamiento ${fdate(m.launchDate)}</span><h1>${escape(m.name)}</h1><p class="lead">${escape(m.tagline)}</p><p>Precio estimado desde <b>${money(m.versions[0].price)}</b> · <span class="badge badge-primary">${countdown(m.launchDate)}</span></p>
    <form class="card stack launch-form" novalidate><b>Pre-registro</b><div class="grid-2"><div class="field"><label for="ln">Nombre</label><input class="input" id="ln" name="name" required></div><div class="field"><label for="le">Correo</label><input class="input" id="le" name="email" type="email" required></div></div><button class="btn btn-primary">${icon('bell', 16)} Avísame del lanzamiento</button></form></div>
    <div class="hero-media"><div class="hero-stage">${carOf(m, m.colors[0].hex)}</div></div></div></section>`;
  el.querySelector('form').onsubmit = e => {
    e.preventDefault(); const f = e.target;
    if (!f.name.value.trim() || !/\S+@\S+\.\S+/.test(f.email.value)) return toast('Ingresa nombre y un correo válido', 'warning');
    createLead({ name: f.name.value.trim(), email: f.email.value.trim(), modelId: m.id, versionId: m.versions[0].id, showroomId: 'scl', type: 'lanzamiento', note: `Pre-registro lanzamiento ${m.name}.` });
    f.innerHTML = `<p>${icon('check', 18)} ¡Listo! Te avisaremos antes que a nadie.</p>`;
  };
}

export function renderSpec(el, { code }) {
  const c = decodeConfig(code);
  el.innerHTML = `<section class="section tight"><div class="container stack spec-page">
    <div class="row between no-print"><a class="btn btn-ghost" href="#/config/${encodeURIComponent(code)}">${icon('back', 16)} Volver al configurador</a><button class="btn btn-primary" data-print>${icon('print', 16)} Imprimir / guardar PDF</button></div>
    <div class="paper print-area">${c ? specSheetHTML(code) : '<p>Configuración no válida.</p>'}</div></div></section>`;
  el.querySelector('[data-print]').onclick = () => window.print();
}
export { nf };
