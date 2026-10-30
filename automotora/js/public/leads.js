// Agendamiento de test drive y solicitud de cotización → ambos crean un lead asignado por reglas.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { activeModels, model, brand, version, showrooms, showroom, createLead, settings, decodeConfig, encodeConfig, priceConfig, userName, stockFor, stockBadge } from '../shared/domain.js';
import { carOf, carSVG } from '../shared/car.js';
import { pageHero } from './cards.js';
import { ymd, addDays, parseYmd, DOW, rutValid, rutFormat } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const contactFields = u => `<div class="grid-2">
  <div class="field"><label for="c-name">Nombre completo</label><input class="input" id="c-name" name="name" value="${escape(u?.role === 'cliente' ? u.name : '')}" required></div>
  <div class="field"><label for="c-email">Correo</label><input class="input" id="c-email" name="email" type="email" value="${escape(u?.role === 'cliente' ? u.email : '')}" required></div>
  <div class="field"><label for="c-phone">Teléfono</label><input class="input" id="c-phone" name="phone" type="tel" value="${escape(u?.role === 'cliente' ? u.phone || '' : '')}" required></div>
  <div class="field"><label for="c-rut">RUT (opcional)</label><input class="input" id="c-rut" name="rut" value="${escape(u?.role === 'cliente' ? u.rut || '' : '')}" placeholder="12.345.678-5"></div></div>`;
function readContact(f) {
  const v = Object.fromEntries(new FormData(f));
  let bad = false;
  const mark = (n, ok) => { f.elements[n].classList.toggle('invalid', !ok); if (!ok) bad = true; };
  mark('name', v.name.trim().length > 2); mark('email', /\S+@\S+\.\S+/.test(v.email)); mark('phone', v.phone.replace(/\D/g, '').length >= 8);
  if (v.rut) mark('rut', rutValid(v.rut));
  return bad ? null : { ...v, name: v.name.trim(), email: v.email.trim(), rut: v.rut ? rutFormat(v.rut) : '' };
}
const modelOptions = sel => activeModels().sort((a, b) => (brand(a.brandId).name + a.name).localeCompare(brand(b.brandId).name + b.name)).map(m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${escape(brand(m.brandId).name)} ${escape(m.name)}</option>`).join('');

export function renderTestDrive(el, _p, query) {
  const u = auth.current();
  const s = { modelId: model(query.modelo)?.status === 'activo' ? query.modelo : 'sportage', showroomId: null, date: null, slot: null };
  el.innerHTML = `${pageHero('Test drive', 'Maneja antes de decidir', 'Elige modelo, sucursal y horario. Un ejecutivo te esperará con el auto listo (45 minutos, con licencia vigente).', 'steer')}
  <section class="section tight"><div class="container booking-layout">
    <form class="stack" data-form novalidate>
      <div class="card stack"><h3>${icon('car', 18)} 1. Modelo</h3><div class="td-model"><select class="select" name="modelId" aria-label="Modelo">${modelOptions(s.modelId)}</select><div data-art></div></div></div>
      <div class="card stack"><h3>${icon('store', 18)} 2. Sucursal</h3><div class="pick-grid" data-shows></div></div>
      <div class="card stack"><h3>${icon('calendar', 18)} 3. Día y hora</h3><div class="days-strip" data-days></div><div class="slots" data-slots></div></div>
      <div class="card stack"><h3>${icon('user', 18)} 4. Tus datos</h3>${contactFields(u)}<label class="check"><input type="checkbox" name="license" required> Tengo licencia de conducir clase B vigente</label>
        <button class="btn btn-primary btn-lg">${icon('check', 18)} Confirmar test drive</button></div>
    </form>
    <aside class="card summary" data-sum></aside>
  </div></section>`;
  const f = el.querySelector('[data-form]');
  const draw = () => {
    const m = model(s.modelId), srs = showrooms().filter(x => x.brands.includes(m.brandId));
    if (!srs.find(x => x.id === s.showroomId)) s.showroomId = srs[0]?.id;
    el.querySelector('[data-art]').innerHTML = carOf(m, m.colors[1]?.hex) + stockBadge(stockFor(m.id));
    el.querySelector('[data-shows]').innerHTML = srs.map(x => `<button type="button" class="pick ${x.id === s.showroomId ? 'sel' : ''}" data-show="${x.id}">${icon('pin', 20)}<span><b>${escape(x.city)}</b><small>${escape(x.address)}</small></span></button>`).join('');
    const days = Array.from({ length: 12 }, (_, i) => addDays(ymd(), i + 1)).filter(d => parseYmd(d).getDay() !== 0).slice(0, 10);
    if (!days.includes(s.date)) s.date = days[0];
    el.querySelector('[data-days]').innerHTML = days.map(d => { const x = parseYmd(d); return `<button type="button" class="day-btn ${d === s.date ? 'sel' : ''}" data-day="${d}"><small>${DOW[x.getDay()]}</small><b>${x.getDate()}</b><small>${x.toLocaleDateString('es-CL', { month: 'short' })}</small></button>`; }).join('');
    const taken = db.query('testdrives', t => t.showroomId === s.showroomId && t.date === s.date && t.status === 'agendado').map(t => t.slot + (t.modelId === s.modelId ? '' : '#'));
    const sat = parseYmd(s.date).getDay() === 6;
    const slots = (settings().testDriveSlots || []).filter(t => !sat || t < '14:00');
    el.querySelector('[data-slots]').innerHTML = slots.map(t => { const busy = taken.includes(t); return `<button type="button" class="slot ${t === s.slot ? 'sel' : ''}" data-slot="${t}" ${busy ? 'disabled title="Ocupado"' : ''}>${t}</button>`; }).join('');
    if (taken.includes(s.slot)) s.slot = null;
    const sr = showroom(s.showroomId);
    el.querySelector('[data-sum]').innerHTML = `<h3>Resumen</h3><div class="line"><span>Modelo</span><span>${escape(brand(m.brandId).name)} ${escape(m.name)}</span></div><div class="line"><span>Sucursal</span><span>${escape(sr?.city || '—')}</span></div><div class="line"><span>Fecha</span><span>${parseYmd(s.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div><div class="line"><span>Hora</span><span>${s.slot || 'Elige un horario'}</span></div><p class="small muted">${icon('clock', 14)} Duración aprox. 45 min · Trae tu licencia y cédula.</p>`;
  };
  el.addEventListener('click', e => {
    const a = e.target.closest('[data-show]'); if (a) { s.showroomId = a.dataset.show; s.slot = null; draw(); }
    const d = e.target.closest('[data-day]'); if (d) { s.date = d.dataset.day; s.slot = null; draw(); }
    const t = e.target.closest('[data-slot]'); if (t && !t.disabled) { s.slot = t.dataset.slot; draw(); }
  });
  f.elements.modelId.onchange = e => { s.modelId = e.target.value; draw(); };
  f.onsubmit = e => {
    e.preventDefault();
    if (!s.slot) return toast('Elige un horario disponible', 'warning');
    const c = readContact(f); if (!c) return toast('Revisa tus datos de contacto', 'warning');
    if (!f.elements.license.checked) return toast('Necesitas licencia de conducir vigente', 'warning');
    const m = model(s.modelId);
    const lead = createLead({ name: c.name, email: c.email, phone: c.phone, rut: c.rut, modelId: m.id, versionId: m.versions[0].id, showroomId: s.showroomId, type: 'test_drive', stage: 'test_drive', temp: 'caliente', note: `Test drive agendado en la web: ${s.date} ${s.slot}.` });
    const td = db.insert('testdrives', { leadId: lead.id, customerId: u?.role === 'cliente' ? u.id : null, modelId: m.id, showroomId: s.showroomId, date: s.date, slot: s.slot, status: 'agendado', sellerId: lead.sellerId });
    db.log('test drive', `${c.name} agendó ${m.name} · ${s.date} ${s.slot}`);
    el.querySelector('.booking-layout').innerHTML = `<div class="card ticket stack"><div class="check-big">${icon('check', 36)}</div><h2>¡Test drive confirmado!</h2><div class="code">TD-${td.id.slice(-5).toUpperCase()}</div>
      <p>${escape(brand(m.brandId).name)} ${escape(m.name)} · ${escape(showroom(s.showroomId).name)}<br><b>${parseYmd(s.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${s.slot}</b></p>
      <p class="muted">${lead.sellerId ? `Te atenderá <b>${escape(userName(lead.sellerId))}</b>. ` : ''}Te enviamos la confirmación a ${escape(c.email)}.</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/modelo/${m.id}">Configurar mi ${escape(m.name)}</a><a class="btn" href="#/financiamiento?modelo=${m.id}">Simular crédito</a></div></div>`;
    window.scrollTo(0, 0);
  };
  draw();
}

export function renderQuote(el, _p, query) {
  const u = auth.current();
  let cfg = query.config ? decodeConfig(query.config) : null;
  if (!cfg) { const m = model(query.modelo) || model('tucson'); cfg = { modelId: m.id, versionId: m.versions[0].id, colorId: m.colors[0].id, wheelId: 'w1', packIds: [], accIds: [] }; }
  el.innerHTML = `${pageHero('Cotización', 'Recibe tu cotización formal', 'Un ejecutivo te enviará la cotización con bonos vigentes, stock y alternativas de financiamiento en menos de 2 horas hábiles.', 'file')}
  <section class="section tight"><div class="container booking-layout">
    <form class="stack" data-form novalidate>
      <div class="card stack"><h3>${icon('car', 18)} Tu auto</h3><div class="grid-2"><div class="field"><label for="q-m">Modelo</label><select class="select" id="q-m">${modelOptions(cfg.modelId)}</select></div><div class="field"><label for="q-v">Versión</label><select class="select" id="q-v"></select></div></div>
        <p class="small muted">${icon('palette', 14)} ¿Quieres elegir color, llantas y accesorios? <a data-cfglink href="#">Ábrelo en el configurador</a>.</p></div>
      <div class="card stack"><h3>${icon('user', 18)} Tus datos</h3>${contactFields(u)}
        <div class="grid-2"><div class="field"><label for="q-sr">Sucursal</label><select class="select" id="q-sr" name="showroomId"></select></div>
        <div class="field"><label for="q-pay">¿Cómo piensas pagar?</label><select class="select" id="q-pay" name="pay"><option value="credito">Con crédito automotriz</option><option value="contado">Contado</option><option value="leasing">Leasing (empresa)</option></select></div></div>
        <label class="check"><input type="checkbox" name="trade"> Quiero dejar mi auto en parte de pago</label>
        <div class="field"><label for="q-msg">Comentarios</label><textarea class="textarea" id="q-msg" name="msg" placeholder="Ej: necesito el auto antes de fin de mes"></textarea></div>
        <button class="btn btn-primary btn-lg">${icon('mail', 18)} Solicitar cotización</button></div>
    </form>
    <aside class="card summary" data-sum></aside>
  </div></section>`;
  const f = el.querySelector('[data-form]');
  const draw = () => {
    const m = model(cfg.modelId);
    el.querySelector('#q-v').innerHTML = m.versions.map(v => `<option value="${v.id}" ${v.id === cfg.versionId ? 'selected' : ''}>${escape(v.name)} · ${money(v.price)}</option>`).join('');
    el.querySelector('#q-sr').innerHTML = showrooms().filter(s => s.brands.includes(m.brandId)).map(s => `<option value="${s.id}">${escape(s.name)}</option>`).join('');
    el.querySelector('[data-cfglink]').href = '#/config/' + encodeConfig(cfg);
    const p = priceConfig(cfg, { financing: f.elements.pay.value !== 'contado', tradeIn: f.elements.trade.checked });
    el.querySelector('[data-sum]').innerHTML = `${carSVG({ body: m.body, paint: p.col.hex, wheel: { style: p.w.style, rim: p.w.rim }, fuel: m.fuel })}<h3>${escape(brand(m.brandId).name)} ${escape(m.name)}</h3>
      ${p.lines.map(([l, n]) => `<div class="line"><span>${escape(l)}</span><span>${n ? money(n) : 'Incluido'}</span></div>`).join('')}
      ${p.bonuses.map(b => `<div class="line bonus"><span>${escape(b.name)}</span><span>−${money(b.amount)}</span></div>`).join('')}
      <div class="sum-total"><span>Precio referencial</span><b>${money(p.total)}</b></div>${stockBadge(stockFor(m.id, { versionId: cfg.versionId }))}`;
  };
  el.querySelector('#q-m').onchange = e => { const m = model(e.target.value); cfg = { modelId: m.id, versionId: m.versions[0].id, colorId: m.colors[0].id, wheelId: 'w1', packIds: [], accIds: [] }; draw(); };
  el.querySelector('#q-v').onchange = e => { cfg.versionId = e.target.value; draw(); };
  f.elements.pay.onchange = draw; f.elements.trade.onchange = draw;
  f.onsubmit = e => {
    e.preventDefault();
    const c = readContact(f); if (!c) return toast('Revisa tus datos de contacto', 'warning');
    const m = model(cfg.modelId), p = priceConfig(cfg, { financing: c.pay !== 'contado', tradeIn: !!c.trade });
    const lead = createLead({ name: c.name, email: c.email, phone: c.phone, rut: c.rut, modelId: m.id, versionId: cfg.versionId, showroomId: c.showroomId, type: 'cotizacion', configCode: encodeConfig(cfg), payment: c.pay, wantsTrade: !!c.trade, value: p.total, note: `Solicitud de cotización web (${p.col.name}, ${money(p.total)}). Pago: ${c.pay}${c.trade ? ', con retoma' : ''}.${c.msg ? ' Comentario: ' + c.msg : ''}` });
    el.querySelector('.booking-layout').innerHTML = `<div class="card ticket stack"><div class="check-big">${icon('check', 36)}</div><h2>¡Solicitud recibida!</h2><p>${lead.sellerId ? `<b>${escape(userName(lead.sellerId))}</b> preparará` : 'Un ejecutivo preparará'} tu cotización formal del <b>${escape(m.name)}</b> y te contactará a ${escape(c.email)}.</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/test-drive?modelo=${m.id}">Agendar test drive</a>${u?.role === 'cliente' ? '<a class="btn" href="#/cuenta/cotizaciones">Ver en mi cuenta</a>' : '<a class="btn" href="#/tasacion">Tasar mi auto</a>'}</div></div>`;
    window.scrollTo(0, 0);
  };
  draw();
}
export { version };
