// Programas por marca: calculadora del próximo servicio según modelo + km, y plan completo de cada marca.
import { money, escape } from '../../../assets/core/ui.js';
import { auth } from '../data/db.js';
import { FUEL } from '../data/catalog.js';
import { programs, nextServices, kmFmt, customerById, tierById } from '../shared/domain.js';
import { carArt } from '../shared/car-art.js';

export function renderPrograms(el, _p, q = {}) {
  const ps = programs();
  const u = auth.current(), cust = u?.customerId && customerById(u.customerId), tier = cust && tierById(cust.tier);
  const st = { brand: q.brand && ps.some(p => p.brand === q.brand) ? q.brand : ps[0]?.brand, model: q.model || '', km: +q.km || 30000 };
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Mantención según plan del fabricante</span><h1>Programas por marca</h1><p class="lead">Elige tu modelo y kilometraje: calculamos qué servicio te corresponde, qué incluye y cuánto cuesta. Sin sorpresas y sin perder la garantía.</p></div></div>
    <div class="calc">
      <form class="card stack" id="pf" novalidate>
        <h3 style="margin:0">Tu auto</h3>
        <div class="stack">
          <div class="field"><label for="pf-b">Marca</label><select class="select" id="pf-b">${ps.map(p => `<option ${p.brand === st.brand ? 'selected' : ''}>${escape(p.brand)}</option>`).join('')}</select></div>
          <div class="field"><label for="pf-m">Modelo</label><select class="select" id="pf-m"></select></div>
          <div class="field"><label for="pf-k">Kilometraje actual (km)</label><input class="input" id="pf-k" type="number" min="0" step="500" value="${st.km}"></div>
          <div class="field"><label for="pf-r">o desliza</label><input class="range" id="pf-r" type="range" min="0" max="150000" step="1000" value="${st.km}"></div>
        </div>
        <div data-car class="car-frame"></div>
        ${tier ? `<div class="callout ok small">Precios con tu descuento <b>${escape(tier.name)}</b> (${tier.discount}%).</div>` : '<div class="callout small">Miembros Gold y Black obtienen 10–15% de descuento. <a href="#/membresias">Ver membresías</a></div>'}
      </form>
      <div class="stack" data-out></div>
    </div>
    <div class="sec-head" style="margin-top:20px"><div><h2>Todas las marcas</h2><p class="muted">Intervalos y servicios basados en los planes oficiales de cada fabricante.</p></div></div>
    <div class="grid-auto">${ps.map(p => `<article class="card stack"><div class="row between"><h3 style="margin:0">${escape(p.name)}</h3><span class="badge">${kmFmt(p.intervalKm)} / ${p.intervalMonths} m</span></div><p class="muted small" style="margin:0">${escape(p.note)}</p>
      <div class="model-chips">${p.models.map(m => `<button class="chip" type="button" data-pick="${escape(p.brand)}|${escape(m.name)}">${escape(m.name)}${m.fuel === 'electrico' ? ' ⚡' : ''}</button>`).join('')}</div></article>`).join('')}</div>
  </div></section>`;
  const b = el.querySelector('#pf-b'), m = el.querySelector('#pf-m'), k = el.querySelector('#pf-k'), rr = el.querySelector('#pf-r'), out = el.querySelector('[data-out]');
  const fill = () => { const p = ps.find(x => x.brand === b.value); m.innerHTML = p.models.map(x => `<option ${x.name === st.model ? 'selected' : ''}>${escape(x.name)}</option>`).join(''); };
  const calc = () => {
    const p = ps.find(x => x.brand === b.value), md = p.models.find(x => x.name === m.value);
    el.querySelector('[data-car]').innerHTML = carArt({ body: md?.body, color: 'var(--primary)', ev: md?.fuel === 'electrico', label: md?.name }) + `<p class="small muted" style="text-align:center;margin:6px 0">${escape(FUEL[md?.fuel] || '')} · ${md?.hp || ''} CV</p>`;
    const list = nextServices({ brand: b.value, model: m.value, km: +k.value || 0 }, 4, cust?.tier);
    out.innerHTML = `<div class="card stack"><div class="row between"><h3 style="margin:0">Próximos servicios · ${escape(b.value)} ${escape(m.value)}</h3><span class="badge">${kmFmt(+k.value || 0)} hoy</span></div>
      <ol class="svc-timeline">${list.map((s, i) => `<li class="${i === 0 ? 'next' : ''}"><div><span class="km">${kmFmt(s.km)}</span><small class="muted d-block">o ${s.months} meses</small>${i === 0 ? '<span class="badge badge-primary">Te corresponde</span>' : ''}</div>
        <div><b>${escape(s.level.name)}</b> <small class="muted">· ${s.hours} h aprox.</small><ul>${s.tasks.map(t => `<li>${escape(t)}</li>`).join('')}</ul></div>
        <div style="text-align:right">${s.price !== s.list ? `<s class="small muted">${money(s.list)}</s><br>` : ''}<b class="price">${money(s.price)}</b>${i === 0 ? `<br><a class="btn btn-primary btn-sm" style="margin-top:8px" href="#/agendar?brand=${encodeURIComponent(b.value)}&model=${encodeURIComponent(m.value)}&km=${+k.value || 0}">Agendar</a>` : ''}</div></li>`).join('')}</ol>
      <p class="small muted" style="margin:0">Incluye repuestos originales, lubricantes homologados, mano de obra e inspección multipunto digital. IVA incluido.</p></div>`;
  };
  b.onchange = () => { st.model = ''; fill(); calc(); };
  m.onchange = calc;
  k.oninput = () => { rr.value = k.value; calc(); };
  rr.oninput = () => { k.value = rr.value; calc(); };
  el.querySelector('#pf').onsubmit = e => e.preventDefault();
  el.addEventListener('click', e => { const c = e.target.closest('[data-pick]'); if (!c) return; const [bb, mm] = c.dataset.pick.split('|'); b.value = bb; st.model = mm; fill(); calc(); el.querySelector('#pf').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  fill(); calc();
}
