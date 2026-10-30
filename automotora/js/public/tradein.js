// Tasación online del usado → rango estimado, se puede usar como pie en el simulador.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { campaignLive, createLead, showrooms } from '../shared/domain.js';
import { pageHero } from './cards.js';
import { patenteValid, patenteFormat, patenteClean, uiSet, nf } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const BASE = { Toyota: 18, Kia: 14, Hyundai: 14.5, Chevrolet: 12, Mazda: 16, Nissan: 14, Suzuki: 10.5, Peugeot: 13, Volkswagen: 13.5, Ford: 18, Mitsubishi: 17, Subaru: 18, Honda: 16, Renault: 11, BMW: 35, Volvo: 32, 'Mercedes-Benz': 38, BYD: 22, Otra: 12 };
const BIG = /hilux|ranger|l200|navara|colorado|d-?max|rav|cx-?5|tucson|sportage|x-?trail|outlander|forester|santa fe|sorento|4runner|prado/i;
const COND = { excelente: ['Excelente', 1.04, 'Sin detalles, como nuevo'], bueno: ['Bueno', 1, 'Detalles de uso menores'], regular: ['Regular', .9, 'Rayones o desgaste visible'], detalles: ['Con daños', .78, 'Choques, fallas o pintura'] };

export function estimate({ brand, model, year, km, condition, owners = 1, records = true }) {
  const now = new Date().getFullYear(), age = Math.max(0, now - year);
  let v = (BASE[brand] || 12) * 1e6 * (BIG.test(model) ? 1.45 : 1);
  v *= age === 0 ? .86 : .82 * Math.pow(.9, age - 1);
  const expected = Math.max(1, age) * 15000, diff = (km - expected) / 1000;
  v *= Math.max(.7, Math.min(1.08, 1 - diff * .004));
  v *= COND[condition]?.[1] || 1;
  if (owners > 2) v *= .95;
  if (records) v *= 1.03;
  const mid = Math.max(800000, Math.round(v / 10000) * 10000);
  return { min: Math.round(mid * .94 / 10000) * 10000, max: Math.round(mid * 1.06 / 10000) * 10000, mid };
}

export function renderTradeIn(el) {
  const u = auth.current();
  const bono = db.query('campaigns', c => campaignLive(c) && c.type === 'retoma')[0];
  const years = Array.from({ length: 19 }, (_, i) => new Date().getFullYear() - i);
  el.innerHTML = `${pageHero('Tasación', 'Tasa tu usado en 2 minutos', `Recibimos tu auto en parte de pago, de cualquier marca.${bono ? ` Además suma el <b>${escape(bono.name)}</b> de ${money(bono.amount)}.` : ''}`, 'swap')}
  <section class="section tight"><div class="container trade-layout">
    <form class="card stack" data-form novalidate>
      <div class="grid-2">
        <div class="field"><label for="t-pat">Patente</label><input class="input mono" id="t-pat" name="patente" placeholder="Ej: KJTR45" maxlength="8" required></div>
        <div class="field"><label for="t-brand">Marca</label><select class="select" id="t-brand" name="brand" required><option value="">Selecciona</option>${Object.keys(BASE).map(b => `<option>${b}</option>`).join('')}</select></div>
        <div class="field"><label for="t-model">Modelo</label><input class="input" id="t-model" name="model" placeholder="Ej: Yaris" required></div>
        <div class="field"><label for="t-year">Año</label><select class="select" id="t-year" name="year" required>${years.map(y => `<option ${y === 2020 ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label for="t-km">Kilometraje</label><input class="input" id="t-km" name="km" type="number" min="0" step="1000" required></div>
        <div class="field"><label for="t-own">N° de dueños</label><select class="select" id="t-own" name="owners"><option value="1">1 (único dueño)</option><option value="2">2</option><option value="3">3 o más</option></select></div>
      </div>
      <div class="field"><label>Estado general</label><div class="cond-grid">${Object.entries(COND).map(([k, [l, , d]], i) => `<label class="cond ${i === 1 ? 'sel' : ''}"><input type="radio" name="condition" value="${k}" ${i === 1 ? 'checked' : ''}><b>${l}</b><small>${d}</small></label>`).join('')}</div></div>
      <label class="check"><input type="checkbox" name="records" checked> Mantenciones al día en servicio autorizado</label>
      <hr><b>¿Dónde te enviamos la oferta?</b>
      <div class="grid-2">
        <div class="field"><label for="t-name">Nombre</label><input class="input" id="t-name" name="name" value="${escape(u?.role === 'cliente' ? u.name : '')}" required></div>
        <div class="field"><label for="t-email">Correo</label><input class="input" id="t-email" name="email" type="email" value="${escape(u?.role === 'cliente' ? u.email : '')}" required></div>
      </div>
      <button class="btn btn-primary btn-lg">${icon('gauge', 18)} Calcular tasación</button>
    </form>
    <div class="trade-side" data-res><div class="card empty">${icon('swap', 40)}<h3>Tu tasación aparecerá aquí</h3><p class="muted">Rango de precio estimado según mercado, año, kilometraje y estado. La oferta final se confirma con una inspección de 20 minutos en sucursal.</p></div></div>
  </div></section>`;
  const form = el.querySelector('[data-form]');
  form.addEventListener('change', e => { if (e.target.name === 'condition') form.querySelectorAll('.cond').forEach(c => c.classList.toggle('sel', c.contains(e.target))); });
  form.onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    let bad = false;
    const mark = (n, ok) => { form.elements[n].classList.toggle('invalid', !ok); if (!ok) bad = true; };
    mark('patente', patenteValid(v.patente)); mark('brand', !!v.brand); mark('model', v.model.trim().length > 0); mark('km', v.km !== '' && +v.km >= 0); mark('name', v.name.trim().length > 1); mark('email', /\S+@\S+\.\S+/.test(v.email));
    if (bad) return toast('Revisa los campos marcados (patente formato BBBB12 o BB1234).', 'warning');
    const est = estimate({ brand: v.brand, model: v.model, year: +v.year, km: +v.km, condition: v.condition, owners: +v.owners, records: !!v.records });
    const rec = db.insert('tradeins', { patente: patenteClean(v.patente), brand: v.brand, model: v.model.trim(), year: +v.year, km: +v.km, condition: v.condition === 'detalles' ? 'regular' : v.condition, estimateMin: est.min, estimateMax: est.max, offer: 0, status: 'estimada', customer: v.name.trim(), email: v.email.trim(), customerId: u?.role === 'cliente' ? u.id : null });
    db.log('tasación', `${rec.customer}: ${v.brand} ${v.model} ${v.year} (${money(est.min)}–${money(est.max)})`);
    const label = `${v.brand} ${v.model.trim()} ${v.year} · ${patenteFormat(v.patente)}`;
    el.querySelector('[data-res]').innerHTML = `<div class="card stack trade-result">
      <span class="eyebrow">${escape(label)}</span><h3>Tu auto vale entre</h3>
      <div class="range-big"><b>${money(est.min)}</b><span>—</span><b>${money(est.max)}</b></div>
      <div class="range-bar"><i style="--a:30%;--b:70%"></i></div>
      <ul class="small check-list"><li>${icon('check', 14)} ${nf(+v.km)} km (${+v.km / Math.max(1, new Date().getFullYear() - v.year) > 18000 ? 'sobre' : 'dentro de'} lo esperado para su año)</li><li>${icon('check', 14)} Estado ${COND[v.condition][0].toLowerCase()}</li>${bono ? `<li>${icon('tag', 14)} + ${escape(bono.name)}: <b>${money(bono.amount)}</b> extra al comprar un 0 km</li>` : ''}</ul>
      <button class="btn btn-primary" data-use>${icon('card', 16)} Usar ${money(est.mid)} como pie</button>
      <button class="btn" data-insp>${icon('calendar', 16)} Agendar inspección para oferta firme</button>
      <p class="small muted">Tasación referencial N° ${escape(rec.id.slice(-6).toUpperCase())}. Válida por 7 días.</p></div>`;
    el.querySelector('[data-use]').onclick = () => { uiSet('tradeCredit', { label, value: est.mid, id: rec.id }); toast('Tasación guardada como pie en el simulador', 'success'); location.hash = '#/financiamiento'; };
    el.querySelector('[data-insp]').onclick = () => {
      db.update('tradeins', rec.id, { status: 'inspeccion' });
      createLead({ name: rec.customer, email: rec.email, modelId: 'corolla', versionId: 'corolla-1', showroomId: showrooms()[0].id, type: 'contacto', note: `Solicita inspección de su ${label} (tasación ${money(est.min)}–${money(est.max)}).` });
      toast('Listo: un ejecutivo te llamará para coordinar la inspección.', 'success');
    };
  };
}
