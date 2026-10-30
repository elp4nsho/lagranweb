// Simulador de financiamiento (contado, convencional, Compra Inteligente, crédito verde, leasing)
// y pre-evaluación en línea con RUT y renta.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { activeModels, model, brand, version, decodeConfig, priceConfig, createLead, showrooms, FIN_STATUS } from '../shared/domain.js';
import { simulate, preEvaluate, plazosOf, scoreTone } from '../shared/finance.js';
import { gauge } from '../shared/charts.js';
import { carOf } from '../shared/car.js';
import { pageHero } from './cards.js';
import { rutValid, rutFormat, uiGet, uiSet, nf1 } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export function renderFinance(el, _p, query) {
  const models = activeModels().sort((a, b) => (brand(a.brandId).name + a.name).localeCompare(brand(b.brandId).name + b.name));
  const products = db.query('finProducts', p => p.active);
  const cfg = query.config ? decodeConfig(query.config) : null;
  const tradeCredit = uiGet('tradeCredit', null);
  const s = {
    modelId: cfg?.modelId || query.modelo || 'tucson', versionId: cfg?.versionId || null, price: 0, configPrice: null,
    kind: 'inteligente', productId: null, piePct: 30, plazo: 36, useTrade: !!tradeCredit
  };
  if (cfg) s.configPrice = priceConfig(cfg, { financing: true }).total;
  const pageEl = el;
  pageEl.innerHTML = `${pageHero('Financiamiento', 'Simula tu crédito automotriz', 'Compara cuota, CAE y costo total entre crédito convencional, Compra Inteligente y leasing. Pre-evalúate en línea en 1 minuto.', 'card')}
  <section class="section tight"><div class="container fin-layout">
    <div class="card stack fin-form">
      <div class="grid-2"><div class="field"><label for="fm">Modelo</label><select class="select" id="fm">${models.map(m => `<option value="${m.id}" ${m.id === s.modelId ? 'selected' : ''}>${escape(brand(m.brandId).name)} ${escape(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="fv">Versión</label><select class="select" id="fv"></select></div></div>
      <div class="field"><label>Forma de pago</label><div class="seg-tabs" data-kinds></div></div>
      <div class="field"><label for="fpie">Pie: <b data-pie-l></b></label><input type="range" id="fpie" min="0" max="70" step="5" value="${s.piePct}"></div>
      ${tradeCredit ? `<label class="check trade-use"><input type="checkbox" id="ftrade" ${s.useTrade ? 'checked' : ''}> Usar mi tasación como pie: <b>${escape(tradeCredit.label)}</b> · ${money(tradeCredit.value)}</label>` : `<p class="small muted">${icon('swap', 14)} ¿Tienes un auto? <a href="#/tasacion">Tásalo</a> y úsalo como pie.</p>`}
      <div class="field" data-plazo-wrap><label>Plazo</label><div class="chips" data-plazos></div></div>
      <div class="fin-prod small muted" data-prod-desc></div>
    </div>
    <div class="card fin-result" data-result aria-live="polite"></div>
    <div class="card fin-table-card"><div class="card-title"><h3>Compara plazos</h3><span class="muted small" data-tbl-sub></span></div><div class="table-wrap"><table class="table"><thead><tr><th>Plazo</th><th>Cuota</th><th>CAE</th><th>Costo total</th></tr></thead><tbody data-tbl></tbody></table></div></div>
  </div></section>
  <section class="section tight" id="preeval"><div class="container"><div class="card preeval-card">
    <div class="preeval-intro"><span class="eyebrow">${icon('shield', 14)} Pre-evaluación en línea</span><h2>¿Calificas? Averígualo ahora</h2><p class="muted">Con tu RUT y renta líquida hacemos una evaluación preliminar. No afecta tu historial. Un analista te contactará para confirmar.</p></div>
    <form class="stack" data-pre novalidate>
      <div class="grid-2">
        <div class="field"><label for="p-rut">RUT</label><input class="input" id="p-rut" name="rut" placeholder="12.345.678-5" required inputmode="text"></div>
        <div class="field"><label for="p-name">Nombre completo</label><input class="input" id="p-name" name="name" required></div>
        <div class="field"><label for="p-email">Correo</label><input class="input" id="p-email" name="email" type="email" required></div>
        <div class="field"><label for="p-phone">Teléfono</label><input class="input" id="p-phone" name="phone" type="tel"></div>
        <div class="field"><label for="p-renta">Renta líquida mensual (CLP)</label><input class="input" id="p-renta" name="renta" type="number" min="0" step="10000" required></div>
        <div class="field"><label for="p-emp">Situación laboral</label><select class="select" id="p-emp" name="employment"><option value="dependiente">Dependiente (contrato indefinido)</option><option value="independiente">Independiente / honorarios</option><option value="empresa">Empresa / persona con giro</option></select></div>
        <div class="field"><label for="p-sen">Antigüedad laboral (años)</label><input class="input" id="p-sen" name="seniority" type="number" min="0" max="50" value="3"></div>
        <div class="field"><label for="p-debt">Otras deudas mensuales (CLP)</label><input class="input" id="p-debt" name="otherDebt" type="number" min="0" step="10000" value="0"></div>
      </div>
      <label class="check small"><input type="checkbox" name="ok" required> Autorizo la consulta de mis antecedentes comerciales (simulado).</label>
      <button class="btn btn-primary btn-lg">${icon('shield', 18)} Pre-evaluarme</button>
    </form>
    <div data-pre-res></div>
  </div></div></section>`;

  const $ = q => pageEl.querySelector(q);
  const u = auth.current();
  const prefill = () => { if (u?.role === 'cliente') { $('#p-name').value = u.name; $('#p-email').value = u.email; if (u.rut) $('#p-rut').value = u.rut; if (u.phone) $('#p-phone').value = u.phone; } };
  prefill();
  const m = () => model(s.modelId);
  const prodsFor = kind => products.filter(p => p.type === kind && (!p.onlyFuel || p.onlyFuel.includes(m().fuel)));
  const product = () => s.kind === 'contado' ? null : (products.find(p => p.id === s.productId && p.type === s.kind && (!p.onlyFuel || p.onlyFuel.includes(m().fuel))) || prodsFor(s.kind)[0]);
  const price = () => s.configPrice ?? (version(m(), s.versionId) || m().versions[0]).price;

  function fillVersions() {
    $('#fv').innerHTML = m().versions.map(v => `<option value="${v.id}" ${v.id === s.versionId ? 'selected' : ''}>${escape(v.name)} · ${money(v.price)}</option>`).join('') + (s.configPrice ? `<option value="cfg" selected>Mi configuración · ${money(s.configPrice)}</option>` : '');
    if (!s.versionId || !version(m(), s.versionId)) s.versionId = m().versions[0].id;
  }
  function drawKinds() {
    const kinds = [['contado', 'Contado'], ['convencional', 'Convencional'], ['inteligente', 'Compra Inteligente'], ['leasing', 'Leasing empresas']].filter(([k]) => k === 'contado' || prodsFor(k).length);
    const green = products.filter(p => p.onlyFuel?.includes(m().fuel));
    $('[data-kinds]').innerHTML = kinds.map(([k, l]) => `<button type="button" class="seg-tab ${s.kind === k ? 'active' : ''}" data-kind="${k}">${l}</button>`).join('')
      + (green.length && s.kind === 'convencional' ? `<div class="chips sub-prods">${prodsFor('convencional').map(p => `<button type="button" class="chip ${product()?.id === p.id ? 'active' : ''}" data-prod="${p.id}">${escape(p.name.split('(')[0])}</button>`).join('')}</div>` : '');
  }
  function draw() {
    const p = product(), P = price();
    if (s.kind !== 'contado' && !p) s.kind = 'contado';
    drawKinds();
    const min = p?.minPie || 0; if (s.piePct < min) s.piePct = min;
    $('#fpie').min = 0; $('#fpie').value = s.piePct;
    const trade = s.useTrade && tradeCredit ? tradeCredit.value : 0;
    const pie = Math.max(0, Math.round(P * s.piePct / 100) - 0);
    $('[data-pie-l]').textContent = `${s.piePct}% · ${money(pie)}${trade ? ` + retoma ${money(trade)}` : ''}`;
    const pl = p ? plazosOf(p) : [];
    if (p && !pl.includes(s.plazo)) s.plazo = pl.includes(36) ? 36 : pl[0];
    $('[data-plazo-wrap]').hidden = !p;
    $('[data-plazos]').innerHTML = pl.map(n => `<button type="button" class="chip ${n === s.plazo ? 'active' : ''}" data-plazo="${n}">${n} meses</button>`).join('');
    $('[data-prod-desc]').innerHTML = p ? `${icon('alert', 14)} <b>${escape(p.name)}:</b> ${escape(p.desc)} Pie mínimo ${p.minPie}%. Tasa mensual ${nf1(p.rates[s.plazo], 2)}%.` : 'Pagas el total al momento de facturar (transferencia, vale vista o tarjeta para la reserva).';
    const pieLow = p && (pie + trade) < P * p.minPie / 100;
    const r = simulate({ product: p, price: P, pie, plazo: s.plazo, tradeIn: trade });
    const mm = m(), col = mm.colors[1] || mm.colors[0];
    $('[data-result]').innerHTML = `<div class="fin-car">${carOf(mm, col.hex)}<div><span class="eyebrow">${escape(brand(mm.brandId).name)}</span><b>${escape(mm.name)}</b><small class="muted">${money(P)}${s.configPrice ? ' · tu configuración con bonos' : ''}</small></div></div>
      ${pieLow ? `<p class="badge badge-warning">El pie mínimo de este producto es ${p.minPie}%</p>` : ''}
      ${r.kind === 'contado' ? `<div class="big-num"><small>Total a pagar</small><b>${money(Math.max(0, P - trade))}</b></div><p class="muted small">${trade ? `Precio ${money(P)} menos tu usado ${money(trade)}.` : 'Sin intereses ni gastos de crédito.'}</p>`
      : `<div class="big-num"><small>${r.kind === 'leasing' ? 'Cuota neta mensual' : 'Cuota mensual'}</small><b>${money(r.cuota)}</b><span>${r.n} cuotas${r.kind === 'leasing' ? ` · con IVA ${money(r.cuotaIva)}` : ''}</span></div>
      <div class="fin-kpis"><div><small>CAE</small><b>${nf1(r.cae, 2)}%</b></div><div><small>Costo total del crédito</small><b>${money(r.kind === 'leasing' ? r.totalIva : r.total)}</b></div>${r.vfmg ? `<div><small>Cuota final (VFMG)</small><b>${money(r.vfmg)}</b></div>` : ''}${r.kind === 'leasing' ? `<div><small>IVA recuperable</small><b>${money(r.ivaRecuperable)}</b></div>` : ''}</div>
      <div class="sum-lines">${r.rows.map(([l, n]) => `<div class="line"><span>${l}</span><span>${money(n)}</span></div>`).join('')}${r.seguro ? `<div class="line"><span>Seguro de desgravamen (mensual)</span><span>${money(r.seguro)}</span></div>` : ''}</div>
      ${r.vfmg ? `<div class="vfmg-box"><b>Al terminar las ${r.n} cuotas puedes:</b><ul><li>${icon('refresh', 14)} <b>Renovar</b>: entregas el auto y su valor cubre la cuota final; el excedente va de pie para uno nuevo.</li><li>${icon('key', 14)} <b>Quedártelo</b>: pagas o refinancias la cuota final de ${money(r.vfmg)}.</li><li>${icon('back', 14)} <b>Devolverlo</b>: Autoplaza garantiza ese valor si cumples km y mantenciones.</li></ul></div>` : ''}`}
      ${r.kind === 'contado' ? '' : `<a class="btn btn-primary btn-block" href="#preeval" data-goeval>${icon('shield', 16)} Solicitar este crédito</a>`}
      <p class="small muted">Simulación referencial. CAE calculado según flujo de cuotas, gastos y seguros. Sujeto a evaluación crediticia.</p>`;
    $('[data-goeval]') && ($('[data-goeval]').onclick = e => { e.preventDefault(); document.getElementById('preeval').scrollIntoView({ behavior: 'smooth' }); });
    $('[data-tbl-sub]').textContent = p ? p.name : '';
    $('[data-tbl]').innerHTML = p ? pl.map(n => { const x = simulate({ product: p, price: P, pie, plazo: n, tradeIn: trade }); return `<tr class="${n === s.plazo ? 'sel-row' : ''}"><td>${n} meses</td><td><b>${money(x.cuota)}</b></td><td>${nf1(x.cae, 2)}%</td><td>${money(x.kind === 'leasing' ? x.totalIva : x.total)}</td></tr>`; }).join('') : '<tr><td colspan="4" class="muted">Elige una opción de crédito para comparar plazos.</td></tr>';
    s.last = { r, P, pie, trade, p };
  }
  pageEl.addEventListener('click', e => {
    const k = e.target.closest('[data-kind]'); if (k) { s.kind = k.dataset.kind; s.productId = null; draw(); }
    const pr = e.target.closest('[data-prod]'); if (pr) { s.productId = pr.dataset.prod; draw(); }
    const pl = e.target.closest('[data-plazo]'); if (pl) { s.plazo = +pl.dataset.plazo; draw(); }
  });
  $('#fm').onchange = e => { s.modelId = e.target.value; s.versionId = null; s.configPrice = null; fillVersions(); draw(); };
  $('#fv').onchange = e => { if (e.target.value !== 'cfg') { s.versionId = e.target.value; s.configPrice = null; } draw(); };
  $('#fpie').oninput = e => { s.piePct = +e.target.value; draw(); };
  $('#ftrade')?.addEventListener('change', e => { s.useTrade = e.target.checked; draw(); });
  fillVersions(); draw();

  $('[data-pre]').onsubmit = e => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f));
    let bad = false;
    const mark = (n, ok) => { f.elements[n].classList.toggle('invalid', !ok); if (!ok) bad = true; };
    mark('rut', rutValid(v.rut)); mark('name', v.name.trim().length > 2); mark('email', /\S+@\S+\.\S+/.test(v.email)); mark('renta', +v.renta > 0);
    if (!f.elements.ok.checked) { bad = true; toast('Debes autorizar la consulta de antecedentes', 'warning'); }
    if (bad) return toast('Revisa los campos marcados (RUT válido, correo y renta).', 'warning');
    const { r, P, pie, trade, p } = s.last;
    // Pagando al contado no hay crédito que evaluar
    if (r.kind === 'contado') return toast('Elige una forma de pago con crédito (convencional, Compra Inteligente o leasing) para pre-evaluarte.', 'warning');
    const cuota = r.cuota || 0;
    const ev = preEvaluate({ rut: v.rut, renta: +v.renta, cuota: r.kind === 'leasing' ? r.cuotaIva : cuota, otherDebt: +v.otherDebt || 0, employment: v.employment, seniority: +v.seniority || 0, piePct: (pie + trade) / P * 100 });
    const mm = m(), vv = version(mm, s.versionId) || mm.versions[0];
    const lead = createLead({ name: v.name.trim(), email: v.email.trim(), phone: v.phone, rut: rutFormat(v.rut), modelId: mm.id, versionId: vv.id, showroomId: showrooms().find(x => x.brands.includes(mm.brandId))?.id || 'scl', type: 'financiamiento', stage: 'credito', temp: ev.decision === 'preaprobada' ? 'caliente' : 'tibio', note: `Solicitud de crédito en línea (${p?.name || 'contado'}). Pre-evaluación: ${ev.score} pts.` });
    const app = db.insert('finApps', { number: `SOL-${7200 + db.count('finApps')}`, leadId: lead.id, customerId: auth.current()?.role === 'cliente' ? auth.current().id : null, name: v.name.trim(), rut: rutFormat(v.rut), email: v.email.trim(), phone: v.phone, employment: v.employment, seniority: +v.seniority || 0, renta: +v.renta, otherDebt: +v.otherDebt || 0, modelId: mm.id, versionId: vv.id, price: P, pie: pie + trade, plazo: r.n || 0, productId: p?.id || null, cuota: Math.round(cuota), score: ev.score, preDecision: ev.decision, status: 'recibida', analystId: null, conditions: ev.conditions, notes: [], decidedAt: null });
    db.log('crédito', `Solicitud ${app.number} de ${app.name} (${ev.score} pts)`);
    const tone = scoreTone(ev.score);
    const title = { preaprobada: '¡Estás pre-aprobado!', condiciones: 'Pre-aprobado con condiciones', rechazada: 'Por ahora no podemos pre-aprobarte' }[ev.decision];
    $('[data-pre-res]').innerHTML = `<div class="pre-result tone-${tone}">${gauge(ev.score, { label: 'Puntaje', tone })}<div><h3>${title}</h3><p>Carga financiera estimada: <b>${Math.round(ev.load * 100)}%</b> de tu renta.${ev.conditions ? ` Condición: <b>${escape(ev.conditions)}</b>.` : ''}</p>
      <p class="small muted">Solicitud <b class="mono">${app.number}</b> enviada al área de crédito. ${ev.decision === 'rechazada' ? 'Un ejecutivo te propondrá alternativas (más pie, otro plazo o un codeudor).' : 'Un analista confirmará la aprobación en menos de 24 horas hábiles.'}</p>
      ${auth.current()?.role === 'cliente' ? `<a class="btn btn-sm" href="#/cuenta/financiamiento">Seguir mi solicitud</a>` : `<a class="btn btn-sm" href="login.html?next=index.html%23%2Fcuenta%2Ffinanciamiento">Ingresa para seguir el estado</a>`}</div></div>`;
    f.reset(); prefill();
    toast(`Solicitud ${app.number} enviada`, 'success');
  };
}
export { FIN_STATUS };
