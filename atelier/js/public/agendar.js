// Agenda concierge: vehículo → servicio (precio según plan de marca) → logística (retiro, ventana, auto de cortesía) → confirmación.
import { money, escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { LINES, WINDOWS, COMUNAS, FUEL } from '../data/catalog.js';
import { settings, programs, nextServices, customerById, tierById, conciergeFee, drivers, nextCode, kmFmt, vehicleName } from '../shared/domain.js';
import { nextWorkdays, fmtDay, validRut, normPlate } from '../shared/util.js';
import { carArt } from '../shared/car-art.js';

const STEPS = ['Vehículo', 'Servicio', 'Retiro y entrega', 'Confirmar'];
let S = null;
const fresh = q => ({ step: 0, vehicleId: '', brand: q.brand || '', model: q.model || '', year: 2023, km: +q.km || '', plate: '', maint: !q.svc, svc: q.svc ? [q.svc] : [], mode: 'domicilio', date: '', window: '', address: '', comuna: 'Vitacura', courtesy: false, notes: '', name: '', email: '', phone: '', rut: '', done: null });

function ctx() {
  const u = auth.current(), cust = u?.role === 'cliente' ? customerById(u.customerId) : null;
  return { u, cust, tier: cust && tierById(cust.tier), myCars: cust ? db.query('vehicles', v => v.customerId === cust.id) : [] };
}
function carInfo() {
  if (S.vehicleId) { const v = db.get('vehicles', S.vehicleId); return v ? { brand: v.brand, model: v.model, km: v.km, fuel: v.fuel, body: v.body, color: v.color, plate: v.plate, year: v.year } : null; }
  const p = programs().find(x => x.brand === S.brand), m = p?.models.find(x => x.name === S.model);
  return S.brand ? { brand: S.brand, model: S.model, km: +S.km || 0, fuel: m?.fuel || 'bencina', body: m?.body || 'sedan', color: 'var(--primary)', plate: S.plate, year: S.year } : null;
}
function quote() {
  const { cust, tier } = ctx(), car = carInfo();
  const lines = [];
  let maintSvc = null;
  if (S.maint && car) { maintSvc = nextServices(car, 1, cust?.tier)[0]; if (maintSvc) lines.push({ desc: `${maintSvc.level.name} ${kmFmt(maintSvc.km)}`, price: maintSvc.price, list: maintSvc.list, hours: maintSvc.hours, line: 'mantencion' }); }
  S.svc.forEach(id => { const s = db.get('services', id); if (s) { const disc = tier && s.line !== 'mantencion' ? tier.discount / 100 : 0; lines.push({ desc: s.name, price: Math.round(s.price * (1 - disc) / 1000) * 1000, list: s.price, hours: s.hours, line: s.line, id }); } });
  const fee = S.mode === 'taller' ? 0 : conciergeFee(cust);
  const sub = lines.reduce((a, l) => a + l.price, 0), list = lines.reduce((a, l) => a + l.list, 0);
  return { lines, fee, sub, savings: list - sub, total: sub + fee, maintSvc, hours: lines.reduce((a, l) => a + l.hours, 0) };
}
function slotsUsed(date, win) { return db.count('concierge', c => c.date === date && c.window === win && c.status !== 'cancelado'); }
function courtesyFree(date) {
  const fleet = db.count('fleet', f => f.type.startsWith('cortesia') && f.status !== 'mantencion');
  const used = db.count('concierge', c => c.date === date && c.courtesyCarId && !['entregado', 'cancelado'].includes(c.status));
  return Math.max(0, fleet - used);
}

export function renderBooking(el, _p, q = {}) {
  if (!S || q.svc || q.brand || S.done) S = fresh(q);
  const { cust, myCars } = ctx();
  if (cust && !S.name) Object.assign(S, { name: cust.name, email: cust.email, phone: cust.phone, rut: cust.rut, address: cust.address, comuna: cust.comuna });
  if (cust && !S.vehicleId && !S.brand && myCars[0]) S.vehicleId = myCars[0].id;
  if (!S.brand && !S.vehicleId) { const p = programs()[0]; S.brand = p?.brand; S.model = p?.models[0]?.name; }
  draw(el);
  return { live: false };
}

function summary() {
  const car = carInfo(), qt = quote(), c = settings();
  return `<aside class="card stack book-summary"><h3 style="margin:0">Resumen</h3>
    ${car ? `<div class="car-frame">${carArt({ body: car.body, color: car.color, ev: car.fuel === 'electrico' })}</div><b>${escape(car.brand)} ${escape(car.model)}</b><small class="muted">${car.year || ''} · ${kmFmt(car.km)}${car.plate ? ' · ' + escape(car.plate) : ''}</small>` : '<p class="muted">Elige tu vehículo.</p>'}
    <ul class="lines small">${qt.lines.map(l => `<li><span>${escape(l.desc)}</span><b>${money(l.price)}</b></li>`).join('') || '<li class="muted">Sin servicios aún</li>'}
      ${S.mode !== 'taller' ? `<li><span>Concierge retiro + entrega${S.courtesy ? ' · auto de cortesía' : ''}</span><b>${qt.fee ? money(qt.fee) : 'Incluido'}</b></li>` : ''}</ul>
    ${qt.savings > 0 ? `<small class="pos" style="color:var(--success)">Ahorras ${money(qt.savings)} con tu membresía</small>` : ''}
    <div class="total-row"><span>Total estimado</span><b>${money(qt.total)}</b></div>
    <small class="muted">IVA incluido. El precio final se confirma tras la inspección digital; nada adicional se hace sin tu aprobación. ${escape(c.hours)}</small></aside>`;
}

function stepBody() {
  const { cust, myCars, tier } = ctx();
  const ps = programs();
  if (S.step === 0) {
    const p = ps.find(x => x.brand === S.brand) || ps[0];
    return `<h2 style="margin:0">¿Qué auto atendemos?</h2>
      ${myCars.length ? `<div class="opt-grid">${myCars.map(v => `<label class="opt"><input type="radio" name="veh" value="${v.id}" ${S.vehicleId === v.id ? 'checked' : ''}><span><b>${escape(vehicleName(v))}</b><small>${escape(v.plate)} · ${kmFmt(v.km)}</small></span></label>`).join('')}
        <label class="opt"><input type="radio" name="veh" value="" ${!S.vehicleId ? 'checked' : ''}><span><b>Otro auto</b><small>Agregarlo a mi garage</small></span></label></div>` : ''}
      <div class="grid-2" ${S.vehicleId ? 'hidden' : ''} data-newcar>
        <div class="field"><label for="b-brand">Marca</label><select class="select" id="b-brand" name="brand">${ps.map(x => `<option ${x.brand === S.brand ? 'selected' : ''}>${escape(x.brand)}</option>`).join('')}</select></div>
        <div class="field"><label for="b-model">Modelo</label><select class="select" id="b-model" name="model">${p.models.map(m => `<option ${m.name === S.model ? 'selected' : ''}>${escape(m.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="b-year">Año</label><select class="select" id="b-year" name="year">${Array.from({ length: 10 }, (_, i) => 2026 - i).map(y => `<option ${y === +S.year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label for="b-km">Kilometraje actual (km)</label><input class="input" id="b-km" name="km" type="number" min="0" step="100" value="${escape(S.km)}" placeholder="Ej: 28000"></div>
        <div class="field"><label for="b-plate">Patente</label><input class="input" id="b-plate" name="plate" value="${escape(S.plate)}" placeholder="Ej: KJTR-45" maxlength="8"></div>
      </div>`;
  }
  if (S.step === 1) {
    const car = carInfo(), [ms] = car ? nextServices(car, 1, cust?.tier) : [];
    const groups = Object.entries(LINES).filter(([k]) => k !== 'mantencion').map(([k, l]) => {
      const list = db.query('services', s => s.active && s.line === k && (k !== 'ev' || car?.fuel !== 'bencina'));
      return list.length ? `<h4 style="margin:10px 0 0">${l.icon} ${escape(l.label)}</h4><div class="opt-grid">${list.map(s => `<label class="opt"><input type="checkbox" name="svc" value="${s.id}" ${S.svc.includes(s.id) ? 'checked' : ''}><span><b>${escape(s.name)}</b><small>${s.priceFrom ? 'desde ' : ''}${money(s.price)} · ${s.hours} h</small></span></label>`).join('')}</div>` : '';
    }).join('');
    return `<h2 style="margin:0">¿Qué necesita?</h2>
      ${ms ? `<label class="opt" style="width:100%"><input type="checkbox" name="maint" ${S.maint ? 'checked' : ''}><span class="grow"><b>🔧 Mantención programada: ${escape(ms.level.name)} ${kmFmt(ms.km)}</b><small>Calculado según el plan de ${escape(car.brand)} para ${escape(car.model)} con ${kmFmt(car.km)}: ${escape(ms.tasks.join(' · '))}</small></span><b class="price">${money(ms.price)}</b></label>` : '<div class="callout warn">Tu marca no tiene programa activo; elige servicios específicos.</div>'}
      ${groups}${tier ? `<div class="callout ok small">Tu membresía ${escape(tier.name)} aplica ${tier.discount}% de descuento.</div>` : ''}`;
  }
  if (S.step === 2) {
    const days = nextWorkdays(10), cap = Math.max(1, drivers().length);
    if (!S.date) S.date = days[0];
    const free = courtesyFree(S.date), c = settings();
    return `<h2 style="margin:0">Retiro y entrega</h2>
      <div class="opt-grid">${[['domicilio', '🏠 Retiro en domicilio', 'Retiramos y devolvemos en tu casa'], ['oficina', '🏢 Retiro en oficina', 'Ideal mientras trabajas'], ['taller', '🛠️ Lo llevo yo', 'Te esperamos con café en Vitacura']].map(([k, t, d]) => `<label class="opt"><input type="radio" name="mode" value="${k}" ${S.mode === k ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}</div>
      <span class="label">Día</span><div class="day-strip">${days.map(d => `<button type="button" class="opt ${S.date === d ? 'on' : ''}" data-date="${d}"><small>${fmtDay(d, { weekday: true }).split(' ')[0]}</small><b>${fmtDay(d).split(' ')[0]}</b><small>${fmtDay(d).split(' ').slice(1).join(' ')}</small></button>`).join('')}</div>
      <span class="label">Ventana de ${S.mode === 'taller' ? 'llegada' : 'retiro'}</span>
      <div class="win-grid">${WINDOWS.map(w => { const left = cap - slotsUsed(S.date, w); return `<button type="button" class="opt ${S.window === w ? 'on' : ''}" data-win="${w}" ${left <= 0 && S.mode !== 'taller' ? 'aria-disabled="true" disabled' : ''}><span><b>${w}</b><small>${S.mode === 'taller' ? 'Disponible' : left > 0 ? `${left} chofer${left === 1 ? '' : 'es'} libre${left === 1 ? '' : 's'}` : 'Completo'}</small></span></button>`; }).join('')}</div>
      <div class="grid-2" ${S.mode === 'taller' ? 'hidden' : ''}>
        <div class="field"><label for="b-addr">Dirección de retiro</label><input class="input" id="b-addr" name="address" autocomplete="street-address" value="${escape(S.address)}" placeholder="Calle, número, depto/oficina"></div>
        <div class="field"><label for="b-com">Comuna</label><select class="select" id="b-com" name="comuna">${Object.keys(COMUNAS).map(k => `<option ${S.comuna === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      </div>
      ${c.courtesyEnabled ? `<label class="opt" style="width:100%" ${!free ? 'aria-disabled="true"' : ''}><input type="checkbox" name="courtesy" ${S.courtesy && free ? 'checked' : ''} ${!free ? 'disabled' : ''}><span class="grow"><b>🚗 Auto de cortesía eléctrico</b><small>${free ? `${free} disponible${free === 1 ? '' : 's'} para ese día. Te lo dejamos al retirar tu auto.` : 'Sin autos de cortesía disponibles ese día.'}</small></span></label>` : ''}
      <div class="field"><label for="b-notes">Indicaciones (opcional)</label><textarea class="textarea" id="b-notes" name="notes" placeholder="Ej: conserjería, estacionamiento de visitas, ruido al frenar…">${escape(S.notes)}</textarea></div>`;
  }
  return `<h2 style="margin:0">Tus datos</h2>
    <div class="grid-2">
      <div class="field"><label for="b-name">Nombre completo</label><input class="input" id="b-name" name="name" autocomplete="name" value="${escape(S.name)}"></div>
      <div class="field"><label for="b-rut">RUT</label><input class="input" id="b-rut" name="rut" value="${escape(S.rut)}" placeholder="12.345.678-5"></div>
      <div class="field"><label for="b-email">Correo</label><input class="input" id="b-email" name="email" type="email" autocomplete="email" value="${escape(S.email)}"></div>
      <div class="field"><label for="b-phone">Teléfono / WhatsApp</label><input class="input" id="b-phone" name="phone" type="tel" autocomplete="tel" value="${escape(S.phone)}" placeholder="+56 9"></div>
    </div>
    <label class="check"><input type="checkbox" name="terms" required ${S.terms ? 'checked' : ''}> Acepto que el chofer conduzca mi vehículo y los términos del servicio concierge.</label>
    <p class="error small" style="color:var(--danger);margin:0" data-err hidden></p>`;
}

function draw(el) {
  if (S.done) return drawDone(el);
  el.innerHTML = `<section class="section"><div class="container stack">
    <div><span class="eyebrow">Agenda concierge</span><h1>Agendar servicio</h1></div>
    <ol class="steps">${STEPS.map((s, i) => `<li class="${i < S.step ? 'done' : i === S.step ? 'on' : ''}">${s}</li>`).join('')}</ol>
    <div class="book-grid"><form class="card stack" id="bk" novalidate>${stepBody()}
      <div class="row between" style="margin-top:8px"><button type="button" class="btn btn-ghost" data-back ${S.step === 0 ? 'hidden' : ''}>← Atrás</button><span class="grow"></span><button class="btn btn-primary btn-lg">${S.step === 3 ? 'Confirmar agenda' : 'Continuar →'}</button></div></form>
      ${summary()}</div></div></section>`;
  const f = el.querySelector('#bk');
  const sync = () => {
    const v = n => f.elements[n];
    if (S.step === 0) { const r = f.querySelector('input[name=veh]:checked'); if (r) S.vehicleId = r.value; if (v('brand')) { S.brand = v('brand').value; S.model = v('model').value; S.year = v('year').value; S.km = v('km').value; S.plate = v('plate').value; } }
    if (S.step === 1) { S.maint = !!v('maint')?.checked; S.svc = [...f.querySelectorAll('input[name=svc]:checked')].map(x => x.value); }
    if (S.step === 2) { S.mode = f.querySelector('input[name=mode]:checked')?.value || 'domicilio'; S.address = v('address').value; S.comuna = v('comuna').value; S.courtesy = !!v('courtesy')?.checked; S.notes = v('notes').value; }
    if (S.step === 3) { ['name', 'rut', 'email', 'phone'].forEach(k => { S[k] = v(k).value.trim(); }); S.terms = f.querySelector('[name=terms]').checked; }
  };
  const redraw = () => { const y = scrollY; draw(el); scrollTo(0, y); };
  f.addEventListener('change', e => {
    sync();
    if (e.target.name === 'brand') { const p = programs().find(x => x.brand === S.brand); S.model = p?.models[0]?.name; redraw(); return; }
    if (['veh', 'model', 'maint', 'svc', 'mode', 'courtesy', 'year'].includes(e.target.name)) redraw();
  });
  f.addEventListener('click', e => {
    const d = e.target.closest('[data-date]'), w = e.target.closest('[data-win]');
    if (d) { sync(); S.date = d.dataset.date; S.window = ''; redraw(); }
    if (w && !w.disabled) { sync(); S.window = w.dataset.win; redraw(); }
    if (e.target.closest('[data-back]')) { sync(); S.step--; draw(el); scrollTo(0, 0); }
  });
  f.addEventListener('submit', e => {
    e.preventDefault(); sync();
    const err = m => { toast(m, 'warning'); const p = f.querySelector('[data-err]'); if (p) { p.hidden = false; p.textContent = m; } };
    if (S.step === 0 && !S.vehicleId) {
      if (!(+S.km >= 0) || S.km === '') { f.elements.km.classList.add('invalid'); return err('Indica el kilometraje actual'); }
      S.plate = normPlate(S.plate);
      if (S.plate && !/^[A-Z]{2,4}-?\d{2,4}$/.test(S.plate)) { f.elements.plate.classList.add('invalid'); return err('Patente inválida (ej: KJTR-45)'); }
    }
    if (S.step === 1 && !S.maint && !S.svc.length) return err('Elige al menos un servicio');
    if (S.step === 2) {
      if (!S.window) return err('Elige una ventana horaria');
      if (S.mode !== 'taller' && S.address.length < 5) { f.elements.address.classList.add('invalid'); return err('Indica la dirección de retiro'); }
    }
    if (S.step === 3) {
      if (S.name.length < 3) return err('Ingresa tu nombre');
      if (!/^\S+@\S+\.\S+$/.test(S.email)) return err('Correo inválido');
      if (S.phone.replace(/\D/g, '').length < 8) return err('Teléfono inválido');
      if (S.rut && !validRut(S.rut)) return err('RUT inválido');
      if (!S.terms) return err('Debes aceptar los términos del concierge');
      return confirmBooking(el);
    }
    S.step++; draw(el); scrollTo(0, 0);
  });
}

function confirmBooking(el) {
  const { u, cust: me } = ctx(), qt = quote();
  let cust = me || db.find('customers', c => c.email.toLowerCase() === S.email.toLowerCase());
  if (!cust) cust = db.insert('customers', { name: S.name, rut: S.rut, email: S.email, phone: S.phone, address: S.address, comuna: S.comuna, tier: null, since: new Date().toISOString(), notes: 'Cliente nuevo desde agenda web' });
  else if (!me) db.update('customers', cust.id, { phone: S.phone || cust.phone, address: S.address || cust.address, comuna: S.comuna || cust.comuna });
  let v = S.vehicleId && db.get('vehicles', S.vehicleId);
  const car = carInfo();
  if (!v) v = db.insert('vehicles', { customerId: cust.id, brand: car.brand, model: car.model, year: +S.year, plate: S.plate || 'POR-DEF', vin: '', color: '#5b6474', colorName: 'Por confirmar', km: +S.km || 0, fuel: car.fuel, body: car.body, hp: programs().find(p => p.brand === car.brand)?.models.find(m => m.name === car.model)?.hp, docs: [], addedAt: new Date().toISOString() });
  const code = nextCode();
  const line = qt.lines[0]?.line || 'mantencion';
  const items = qt.lines.flatMap(l => l.line === 'mantencion' ? [{ desc: `${l.desc} · mano de obra`, kind: 'mo', qty: 1, price: Math.round(l.price * .45 / 1000) * 1000 }, { desc: 'Repuestos y lubricantes originales', kind: 'rep', qty: 1, price: l.price - Math.round(l.price * .45 / 1000) * 1000 }] : [{ desc: l.desc, kind: 'mo', qty: 1, price: l.price }]);
  if (qt.fee) items.push({ desc: 'Servicio concierge (retiro y entrega)', kind: 'conc', qty: 1, price: qt.fee });
  const start = S.window.slice(0, 5);
  const wo = db.insert('workOrders', { code, customerId: cust.id, vehicleId: v.id, line, title: qt.lines.map(l => l.desc).join(' + '), serviceIds: qt.lines.filter(l => l.id).map(l => l.id), status: 'agendada', advisorId: 'u-asesor', techId: null,
    scheduledAt: new Date(`${S.date}T${start}:00`).toISOString(), km: car.km, items, laborHours: qt.hours, loggedMins: 0, courtesyCar: S.courtesy, notes: S.notes, source: 'web', history: [{ status: 'agendada', at: new Date().toISOString(), note: 'Agendado en el sitio web' }] });
  if (S.mode !== 'taller') {
    const load = d => db.count('concierge', c => c.driverId === d.id && c.date === S.date);
    const drv = drivers().sort((a, b) => load(a) - load(b))[0];
    const courtesyCar = S.courtesy ? db.find('fleet', f => f.type.startsWith('cortesia') && f.status === 'disponible') : null;
    const c = db.insert('concierge', { woId: wo.id, code, customerId: cust.id, vehicleId: v.id, kind: S.mode, address: S.address, comuna: S.comuna, date: S.date, window: S.window, driverId: drv?.id || null, status: 'programado', fee: qt.fee, courtesyCarId: courtesyCar?.id || null });
    db.update('workOrders', wo.id, { conciergeId: c.id });
  }
  db.log('agenda', `Nueva agenda ${code}: ${car.brand} ${car.model} · ${S.mode === 'taller' ? 'llega al taller' : 'retiro ' + S.comuna} ${S.date} ${S.window}`, u?.id || null);
  S.done = { code, total: qt.total };
  toast(`Agenda confirmada · ${code}`, 'success');
  drawDone(el);
}
function drawDone(el) {
  const d = S.done;
  el.innerHTML = `<section class="section"><div class="container narrow"><div class="card stack success-hero" data-anim="bounceIn">
    <span class="big-ico" aria-hidden="true">🏁</span><h1 style="margin:0">¡Listo! Tu agenda está confirmada</h1>
    <p class="lead">Código de seguimiento <b class="mono">${escape(d.code)}</b> · Total estimado ${money(d.total)}</p>
    <p class="muted">${S.mode === 'taller' ? `Te esperamos el ${fmtDay(S.date, { weekday: true })} entre ${S.window}.` : `El chofer llegará el ${fmtDay(S.date, { weekday: true })} entre ${S.window} a ${escape(S.address)}, ${escape(S.comuna)}. Te avisaremos por WhatsApp cuando vaya en camino.`}</p>
    <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/seguimiento/${escape(d.code)}">Seguir mi auto</a><button class="btn btn-ghost" data-new>Agendar otro</button>${auth.current()?.role === 'cliente' ? '<a class="btn" href="#/garage">Ir a mi garage</a>' : ''}</div></div></div></section>`;
  el.querySelector('[data-new]').onclick = () => { S = null; renderBooking(el, {}, {}); };
}
export { FUEL };
