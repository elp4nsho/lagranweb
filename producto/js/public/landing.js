// Landing de venta larga. Todo el contenido sale de la DB (CMS del panel) y se repinta en vivo.
import { db, landing, colors, bundles, approvedReviews, rating, heroCopy, trackVisit, captureRef, colorByKey } from '../data/db.js';
import { bottleSVG } from '../shared/bottle.js';
import { escape, money, toast, $, $$ } from '../../../assets/core/ui.js';
import { stars, reviewForm, affiliateForm } from './common.js';

const state = { color: null, reviews: 6 };
try { state.color = localStorage.getItem('aquilo:color'); } catch (e) { /* */ }

trackVisit();
const ref = captureRef();
let variant = heroCopy().variant; // asigna variante A/B una sola vez

function currentColor() {
  const list = colors().filter(c => c.active !== false);
  return list.find(c => c.key === state.color) || list.find(c => c.stock > 0) || list[0];
}

function renderHero() {
  const L = landing(), copy = heroCopy(), r = rating();
  const cheapest = bundles()[0];
  $('#promo').innerHTML = `<p>${escape(L.promoBar)} · termina en <b data-cd-inline>--:--:--</b></p>`;
  $('#heroRating').innerHTML = `<span aria-hidden="true">★★★★★</span> ${r.avg.toFixed(1).replace('.', ',')} · ${r.count} reseñas verificadas`;
  $('#heroTitle').textContent = copy.headline;
  $('#heroSub').textContent = copy.subheadline;
  $('#heroBullets').innerHTML = L.heroBullets.map(b => `<li>${escape(b)}</li>`).join('');
  $('#heroPrice').innerHTML = cheapest ? `<s class="muted">${money(cheapest.listPrice)}</s> <b>desde ${money(cheapest.price)}</b>` : '';
  $('#heroMicro').textContent = `🚚 Envío gratis · ↩️ ${L.guaranteeDays} días de prueba · 🛡️ 2 años de garantía`;
  $('#press').innerHTML = `<span class="muted small">Como se vio en</span>${L.press.map(p => `<b>${escape(p)}</b>`).join('')}`;
  $('#floatPrice').textContent = cheapest ? money(cheapest.price) : '';
  document.documentElement.dataset.variant = copy.variant || '';
  $('#refBanner').innerHTML = ref ? `<div class="container"><div class="ref-banner card"><span>🤝 Llegaste recomendado por <b>${escape(ref.name)}</b>. Tu compra apoya a ${escape(ref.name.split(' ')[0])}.</span></div></div>` : '';
}

function renderBottles() {
  const c = currentColor();
  $('#heroBottle').innerHTML = bottleSVG(c, { cls: 'bottle-hero', label: `Botella Aquilo Pulse color ${c.name}` });
  $('#stage').innerHTML = `${bottleSVG(c, { cls: 'bottle-show', label: `Aquilo Pulse en ${c.name}` })}
    <span class="hotspot hs1" tabindex="0"><span class="tip">Anillo LED de recordatorio</span></span>
    <span class="hotspot hs2" tabindex="0"><span class="tip">Pantalla con tu progreso</span></span>
    <span class="hotspot hs3" tabindex="0"><span class="tip">Doble pared al vacío</span></span>`;
  $('#colorName').textContent = c.name;
  $('#colorStock').innerHTML = c.stock <= 0 ? '<span class="badge badge-danger">Agotado</span>' : c.stock < 15 ? `<span class="badge badge-warning">¡Quedan ${c.stock}!</span>` : '<span class="badge badge-success">En stock</span>';
  $('#swatches').innerHTML = colors().filter(x => x.active !== false).map(x => `
    <button type="button" class="sw-btn ${x.key === c.key ? 'on' : ''}" style="--sw:${x.base}" data-color="${x.key}" aria-pressed="${x.key === c.key}" ${x.stock <= 0 ? 'data-out' : ''} title="${escape(x.name)}${x.stock <= 0 ? ' (agotado)' : ''}"><span class="sr-only">${escape(x.name)}</span></button>`).join('');
  const buy = $('#buyColor');
  buy.textContent = c.stock > 0 ? `Comprar en ${c.name}` : `${c.name} agotado · elige otro color`;
  buy.href = `checkout.html?color=${c.key}`;
  buy.classList.toggle('disabled', c.stock <= 0);
  $$('[data-buy]').forEach(a => { a.href = `checkout.html?color=${c.key}`; });
}

function renderBenefits() {
  $('#benefits').innerHTML = landing().benefits.map(b => `<article class="card hover benefit"><span class="b-ico" aria-hidden="true">${escape(b.icon)}</span><h3>${escape(b.title)}</h3><p class="muted">${escape(b.text)}</p></article>`).join('');
  const cell = v => /^s[ií]$/i.test(v) ? '<span class="yes" aria-label="Sí">✓</span>' : /^no$/i.test(v) ? '<span class="no" aria-label="No">✕</span>' : escape(v);
  $('#compare').innerHTML = `<caption class="sr-only">Comparación entre Aquilo Pulse y otras botellas</caption>
    <thead><tr><th scope="col">Característica</th><th scope="col" class="us">Aquilo Pulse</th><th scope="col">Otras</th></tr></thead>
    <tbody>${landing().comparison.map(([a, b, c]) => `<tr><th scope="row">${escape(a)}</th><td class="us">${cell(b)}</td><td>${cell(c)}</td></tr>`).join('')}</tbody>`;
}

function renderReviews() {
  const r = rating(), list = approvedReviews();
  $('#score').innerHTML = `<div class="score-num"><b>${r.avg.toFixed(1).replace('.', ',')}</b>${stars(r.avg)}<small class="muted">${r.count} reseñas</small></div>
    <div class="dist">${r.dist.map(d => `<div class="dist-row"><span>${d.n}★</span><span class="progress"><i style="--v:${r.count ? d.c / r.count * 100 : 0}%"></i></span><span class="muted">${d.c}</span></div>`).join('')}</div>`;
  $('#reviews').innerHTML = list.slice(0, state.reviews).map(rv => {
    const c = colorByKey(rv.color);
    return `<article class="card review">${stars(rv.rating)}<h3>${escape(rv.title)}</h3><p>${escape(rv.text)}</p>
      <footer class="row"><span class="avatar" style="--av:${c ? c.dark : 'var(--primary)'}">${escape(rv.name[0])}</span>
      <span class="small"><b>${escape(rv.name)}</b>${rv.city ? ' · ' + escape(rv.city) : ''}<br><span class="muted">${rv.verified ? 'Compra verificada' : 'Reseña'}${c ? ' · ' + escape(c.name) : ''}</span></span></footer></article>`;
  }).join('') || '<p class="muted">Aún no hay reseñas publicadas.</p>';
  $('#moreReviews').hidden = state.reviews >= list.length;
}

function renderPlans() {
  const L = landing();
  const list = bundles();
  const base = list.find(b => b.qty === 1);
  $('#plans').innerHTML = list.map(b => {
    const save = b.listPrice - b.price;
    const per = Math.round(b.price / b.qty);
    const featured = /popular/i.test(b.badge);
    return `<article class="card plan ${featured ? 'featured' : ''}">
      ${b.badge ? `<span class="ribbon">${escape(b.badge)}</span>` : ''}
      <h3>${escape(b.name)}</h3><p class="muted">${escape(b.desc)}</p>
      <p class="plan-price"><s class="muted">${money(b.listPrice)}</s><b>${money(b.price)}</b></p>
      <p class="plan-save">${b.qty > 1 ? `${money(per)} c/u · ` : ''}Ahorras ${money(save)} (${Math.round(save / b.listPrice * 100)}%)</p>
      <ul class="checks">${b.perks.map(p => `<li>${escape(p)}</li>`).join('')}</ul>
      <a class="btn ${featured ? 'btn-primary' : ''} btn-block" href="checkout.html?pack=${b.id}&color=${currentColor().key}">Elegir ${b.qty} unidad${b.qty > 1 ? 'es' : ''}</a>
    </article>`;
  }).join('');
  void base;
  $('#guarantee').innerHTML = `<div class="seal" aria-hidden="true"><b>${L.guaranteeDays}</b><small>días</small></div>
    <div><h3>${escape(L.guaranteeTitle)}</h3><p class="muted">${escape(L.guaranteeText)}</p></div>`;
  $('#faqList').innerHTML = L.faq.map((f, i) => `<details class="card" ${i === 0 ? 'open' : ''}><summary>${escape(f.q)}</summary><p class="muted">${escape(f.a)}</p></details>`).join('');
  const c = currentColor();
  $('#finalCta').innerHTML = `${bottleSVG(c, { cls: 'bottle-final' })}
    <div class="stack"><h2>${escape(L.finalTitle)}</h2><p class="muted">${escape(L.finalText)}</p>
    <div><a class="btn btn-primary btn-lg" href="checkout.html?color=${c.key}">Aprovechar la oferta →</a></div></div>`;
}

// ---------- Cuenta regresiva ----------
const pad = n => String(n).padStart(2, '0');
function tick() {
  const L = landing();
  const left = Math.max(0, new Date(L.countdownEnd) - Date.now());
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
  const box = $('#countdown');
  if (!left) {
    box.innerHTML = '<p class="badge badge-warning">La oferta de lanzamiento terminó · precios vigentes</p>';
    $$('[data-cd-inline]').forEach(el => { el.textContent = 'pronto'; });
    return;
  }
  const html = `<p class="muted">${escape(L.countdownLabel)}</p><div class="cd-boxes">
    ${[[d, 'días'], [h, 'horas'], [m, 'min'], [s, 'seg']].map(([v, l]) => `<div class="card cd-box"><b>${pad(v)}</b><small>${l}</small></div>`).join('')}</div>`;
  if (box.dataset.sig !== L.countdownEnd || !box.firstChild) { box.innerHTML = html; box.dataset.sig = L.countdownEnd; }
  else $$('.cd-box b', box).forEach((b, i) => { b.textContent = pad([d, h, m, s][i]); });
  $$('[data-cd-inline]').forEach(el => { el.textContent = `${d ? d + 'd ' : ''}${pad(h)}:${pad(m)}:${pad(s)}`; });
}

function renderAll() {
  renderHero(); renderBottles(); renderBenefits(); renderReviews(); renderPlans(); tick();
}

// ---------- Eventos ----------
$('#swatches').addEventListener('click', e => {
  const b = e.target.closest('[data-color]');
  if (!b) return;
  state.color = b.dataset.color;
  try { localStorage.setItem('aquilo:color', state.color); } catch (err) { /* */ }
  renderBottles(); renderPlans();
  const c = currentColor();
  toast(c.stock > 0 ? `Color ${c.name} seleccionado` : `${c.name} está agotado por ahora`, c.stock > 0 ? 'info' : 'warning', 1800);
});
$('#moreReviews').addEventListener('click', () => { state.reviews += 6; renderReviews(); });
[$('#writeReview'), $('#footReview')].forEach(b => b.addEventListener('click', e => { e.preventDefault(); reviewForm(); }));
$('#affApply').addEventListener('click', e => { e.preventDefault(); affiliateForm(); });
$('#buyColor').addEventListener('click', e => { if (e.currentTarget.classList.contains('disabled')) { e.preventDefault(); toast('Ese color está agotado, elige otro', 'warning'); } });

const floatBuy = $('#floatBuy'), head = $('#siteHead');
function onScroll() {
  const show = $('#hero').getBoundingClientRect().bottom < 0 && $('#precios').getBoundingClientRect().top > innerHeight * .5;
  floatBuy.classList.toggle('on', show);
  floatBuy.setAttribute('aria-hidden', String(!show));
  floatBuy.tabIndex = show ? 0 : -1;
  head.classList.toggle('scrolled', scrollY > 10);
}
addEventListener('scroll', onScroll, { passive: true });

db.subscribe(ch => {
  // Los cambios de tráfico/visitas no necesitan repintar la landing.
  if (ch.col === 'traffic' || ch.col === 'affiliates' || ch.col === 'emails' || ch.type === 'log') return;
  if (ch.type === 'value' && ch.key === 'abtest') { const v = heroCopy().variant; if (v === variant && document.documentElement.dataset.variant === v) return; variant = v; }
  renderAll();
});

renderAll();
onScroll();
setInterval(tick, 1000);
