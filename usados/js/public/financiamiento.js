// Simulador de crédito automotriz (pie, cuotas, tasa → cuota mensual, CAE y costo total) y postulación.
import { money, escape, toast, lineChart } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { settings, simulate, isVisible, carName } from '../shared/domain.js';
import { validRut } from '../shared/util.js';

export function renderFinance(el, _p, q = {}) {
  const st = settings(), cars = db.query('cars', isVisible).sort((a, b) => a.price - b.price);
  const car = q.car && db.get('cars', q.car);
  const S = { carId: car?.id || '', price: car?.price || 14990000, piePct: 30, cuotas: 36 };
  const u = auth.current(), me = u?.role === 'cliente' ? u : null;
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Financiamiento</span><h1 style="margin:0">Simula tu crédito automotriz</h1><p class="lead">Conoce tu cuota, el CAE y el costo total antes de postular. Sin letra chica.</p></div></div>
    <div class="calc">
      <form class="card stack" id="fs" novalidate>
        <div class="field"><label for="fs-car">Auto</label><select class="select" id="fs-car"><option value="">Otro monto</option>${cars.map(c => `<option value="${c.id}" ${c.id === S.carId ? 'selected' : ''}>${escape(carName(c))} ${c.year} · ${money(c.price)}</option>`).join('')}</select></div>
        <div class="field"><label for="fs-price">Valor del auto (CLP)</label><input class="input" id="fs-price" type="number" min="3000000" step="10000" value="${S.price}"></div>
        <div class="field"><label for="fs-pie">Pie: <b data-pie></b></label><input class="range" id="fs-pie" type="range" min="${st.minPie}" max="70" step="5" value="${S.piePct}"></div>
        <div class="field"><label for="fs-n">Plazo (cuotas)</label><select class="select" id="fs-n">${[12, 24, 36, 48, 60].map(n => `<option ${n === S.cuotas ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <small class="muted">Tasa mensual referencial ${String(st.baseRate).replace('.', ',')}% (−0,1 pp con pie ≥ 40%). Incluye gastos operacionales, impuesto de timbres y seguro de desgravamen.</small>
      </form>
      <div class="stack" data-out></div>
    </div>
    <form class="card stack" id="fa" novalidate><h2 style="margin:0">Postula en línea</h2><p class="muted" style="margin:0">Respuesta de la financiera en menos de 24 horas hábiles.</p>
      <div class="grid-2"><div class="field"><label for="fa-n">Nombre completo</label><input class="input" id="fa-n" name="name" value="${escape(me?.name || '')}"></div><div class="field"><label for="fa-r">RUT</label><input class="input" id="fa-r" name="rut" value="${escape(me?.rut || '')}"></div>
        <div class="field"><label for="fa-e">Correo</label><input class="input" id="fa-e" type="email" name="email" value="${escape(me?.email || '')}"></div><div class="field"><label for="fa-p">Teléfono</label><input class="input" id="fa-p" type="tel" name="phone" value="${escape(me?.phone || '')}"></div>
        <div class="field"><label for="fa-i">Renta líquida mensual (CLP)</label><input class="input" id="fa-i" type="number" name="income" min="0" step="10000"></div>
        <div class="field"><label for="fa-w">Situación laboral</label><select class="select" id="fa-w" name="work"><option>Dependiente (contrato indefinido)</option><option>Dependiente (plazo fijo)</option><option>Independiente</option><option>Pensionado</option></select></div></div>
      <label class="check"><input type="checkbox" name="ok" required> Autorizo la evaluación de mi información comercial.</label>
      <button class="btn btn-primary btn-lg" style="align-self:flex-start">Enviar postulación</button></form>
  </div></section>`;
  const f = el.querySelector('#fs'), out = el.querySelector('[data-out]');
  const calc = () => {
    const pie = Math.round(S.price * S.piePct / 100 / 10000) * 10000, tasa = st.baseRate - (S.piePct >= 40 ? .1 : 0);
    const r = simulate({ price: S.price, pie, cuotas: S.cuotas, tasa });
    el.querySelector('[data-pie]').textContent = `${S.piePct}% · ${money(pie)}`;
    const opts = [24, 36, 48, 60].map(n => ({ n, ...simulate({ price: S.price, pie, cuotas: n, tasa }) }));
    let saldo = r.monto + r.gastos; const i = tasa / 100, base = r.cuota - r.seguro;
    const curve = Array.from({ length: S.cuotas + 1 }, (_, k) => { if (k) saldo = saldo * (1 + i) - base; return { label: k % 12 === 0 ? `${k / 12}a` : '', value: Math.max(0, Math.round(saldo / 1000)) }; }).filter((_, k) => k % 3 === 0);
    out.innerHTML = `<div class="card stack"><div class="grid-3"><div class="stat"><span class="label">Cuota mensual</span><span class="value">${money(r.cuota)}</span></div><div class="stat"><span class="label">CAE</span><span class="value">${String(r.cae).replace('.', ',')}%</span></div><div class="stat"><span class="label">Costo total del crédito</span><span class="value">${money(r.costoTotal)}</span></div></div>
      <ul class="lines small"><li><span>Monto a financiar</span><b>${money(r.monto)}</b></li><li><span>Gastos operacionales e impuestos</span><b>${money(r.gastos)}</b></li><li><span>Seguro de desgravamen (mensual)</span><b>${money(r.seguro)}</b></li><li><span>Tasa mensual</span><b>${String(tasa.toFixed(2)).replace('.', ',')}%</b></li><li><span>Total pagado (pie + cuotas)</span><b>${money(r.total)}</b></li></ul></div>
      <div class="card"><h3 style="margin-top:0">Saldo de la deuda (miles de $)</h3>${lineChart(curve, { height: 140, format: v => money(v * 1000) })}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Plazo</th><th>Cuota</th><th>CAE</th><th>Costo total</th></tr></thead><tbody>${opts.map(o => `<tr ${o.n === S.cuotas ? 'style="font-weight:700"' : ''}><td>${o.n} meses</td><td>${money(o.cuota)}</td><td>${String(o.cae).replace('.', ',')}%</td><td>${money(o.costoTotal)}</td></tr>`).join('')}</tbody></table></div>`;
    return { pie, tasa, ...r };
  };
  f.addEventListener('input', e => {
    if (e.target.id === 'fs-price') { S.price = Math.max(0, +e.target.value || 0); S.carId = ''; el.querySelector('#fs-car').value = ''; }
    if (e.target.id === 'fs-pie') S.piePct = +e.target.value;
    calc();
  });
  f.addEventListener('change', e => {
    if (e.target.id === 'fs-car') { S.carId = e.target.value; const c = db.get('cars', S.carId); if (c) { S.price = c.price; el.querySelector('#fs-price').value = c.price; } }
    if (e.target.id === 'fs-n') S.cuotas = +e.target.value;
    calc();
  });
  f.onsubmit = e => e.preventDefault();
  el.querySelector('#fa').onsubmit = e => {
    e.preventDefault();
    const fa = e.target, v = Object.fromEntries(new FormData(fa));
    if (v.name.trim().length < 3 || !validRut(v.rut) || !/^\S+@\S+\.\S+$/.test(v.email) || !(+v.income > 0)) { toast('Completa nombre, RUT válido, correo y renta', 'warning'); return; }
    if (!fa.querySelector('[name=ok]').checked) { toast('Debes autorizar la evaluación', 'warning'); return; }
    if (S.price < 3000000) { toast('El monto mínimo del auto es $3.000.000', 'warning'); return; }
    const r = calc();
    const lead = db.insert('leads', { type: 'financiamiento', carId: S.carId || null, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), rut: v.rut.trim(), status: 'nuevo', sellerId: null, source: 'web', notes: [{ at: new Date().toISOString(), by: null, text: `Postulación: pie ${money(r.pie)}, ${S.cuotas} cuotas de ${money(r.cuota)}. ${v.work}.` }] });
    db.insert('financing', { carId: S.carId || null, leadId: lead.id, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), rut: v.rut.trim(), price: S.price, pie: r.pie, cuotas: S.cuotas, tasa: r.tasa, cuota: r.cuota, cae: r.cae, income: +v.income, work: v.work, status: 'pendiente', bank: 'Financiera Ruta' });
    db.log('financiamiento', `Nueva postulación de ${v.name}: ${money(S.price)} en ${S.cuotas} cuotas`, auth.current()?.id || null);
    const ratio = r.cuota / +v.income;
    fa.innerHTML = `<div class="stack success-hero"><span class="big-ico">🏦</span><h2 style="margin:0">Postulación enviada</h2><p class="lead">${ratio <= .25 ? 'Según tu renta, la cuota representa ' + Math.round(ratio * 100) + '% de tus ingresos: <b>muy buenas probabilidades de aprobación</b>.' : 'La cuota supera el 25% de tu renta; un ejecutivo te propondrá un pie mayor o más plazo.'}</p><p class="muted">Te escribiremos a ${escape(v.email)}.</p></div>`;
    toast('Postulación recibida', 'success');
  };
  calc();
  return { live: false };
}
