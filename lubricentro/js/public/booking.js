// Reserva online: vehículo → sucursal → servicios → día y hora → datos → confirmación.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { MAKES, MODELS, modelById } from '../data/catalog.js';
import { settings, branches, branchById, branchLive, waitLabel, waitTone, services, priceFor, lookupPlate, vehFromModel, slotsFor, today, addDays, createJob, upsertCustomer, checkCoupon, validPlate, dayLabel, timeHM, customerById, oilById } from '../shared/domain.js';
import { plate } from '../shared/bits.js';
import { vehicleSpec } from './prices.js';
import { visitor } from './state.js';

const STEPS = ['Vehículo', 'Sucursal', 'Servicios', 'Día y hora', 'Confirmar'];
let bk = null;

export function renderBooking(el, _p, query = {}) {
  const v0 = visitor.get();
  if (!bk || query.new) bk = { step: 0, veh: v0.veh || null, branchId: '', services: [], day: '', slot: '', coupon: '', done: null };
  if (query.b) bk.branchId = query.b;
  if (query.s && !bk.services.includes(query.s)) bk.services = [query.s];
  if (query.p) { const r = lookupPlate(query.p); if (r) bk.veh = r.vehicle; }
  if (!bk.services.length) bk.services = ['aceite'];
  const u = auth.current(), cust = u?.role === 'cliente' ? customerById(u.customerId) : null;
  const myVehs = cust ? db.query('vehicles', v => v.customerId === cust.id) : [];

  const total = () => bk.veh ? bk.services.reduce((s, id) => s + priceFor(id, bk.veh), 0) : 0;
  const discount = () => { if (!bk.coupon) return 0; const r = checkCoupon(bk.coupon, bk.services); if (!r.ok) return 0; const c = r.coupon; const base = c.serviceId ? priceFor(c.serviceId, bk.veh) : total(); return c.type === 'pct' ? Math.round(base * c.value / 100) : Math.min(base, c.value); };
  const mins = () => bk.services.reduce((s, id) => s + (db.get('services', id)?.mins || 0), 0);

  const summary = () => `<aside class="card stack sum-box" style="gap:10px"><b>Tu reserva</b>
    ${bk.veh ? `<div class="small">${bk.veh.plate ? plate(bk.veh.plate) + ' ' : ''}${escape(bk.veh.make)} ${escape(bk.veh.model)} ${escape(bk.veh.year || '')}</div>` : '<small class="muted">Sin vehículo</small>'}
    ${bk.branchId ? `<div class="small">📍 ${escape(branchById(bk.branchId)?.name)}</div>` : ''}
    ${bk.slot ? `<div class="small">📅 ${escape(dayLabel(bk.day, { weekday: 'long', day: 'numeric', month: 'long' }))} · ${timeHM(bk.slot)}</div>` : ''}
    ${bk.veh ? `<ul class="line-list small">${bk.services.map(id => `<li><span>${escape(db.get('services', id)?.name)}</span><b>${money(priceFor(id, bk.veh))}</b></li>`).join('')}${discount() ? `<li><span>Cupón ${escape(bk.coupon)}</span><b class="text-success">−${money(discount())}</b></li>` : ''}</ul>
    <div class="total-row"><span>Total</span><b>${money(total() - discount())}</b></div><small class="muted">⏱ ~${mins()} min · pagas en la sucursal</small>` : ''}
  </aside>`;

  const stepVeh = () => `<div class="stack">
    ${bk.veh ? vehicleSpec(bk.veh) : ''}
    ${myVehs.length ? `<div class="stack" style="gap:8px"><b>Mis vehículos</b><div class="opt-list">${myVehs.map(v => `<button class="opt ${bk.veh?.plate === v.plate ? 'on' : ''}" data-myveh="${v.id}"><span class="opt-ico">🚗</span><span class="grow"><b>${escape(v.make)} ${escape(v.model)} ${v.year}</b><small>${escape(v.plate)}</small></span></button>`).join('')}</div></div>` : ''}
    <form class="card stack" data-pl novalidate><b>${bk.veh ? 'Usar otra patente' : 'Ingresa tu patente'}</b><div class="plate-form"><label class="sr-only" for="bk-plate">Patente</label><input class="input plate-input" id="bk-plate" name="patente" placeholder="KJTR-45" maxlength="8" autocomplete="off"><button class="btn">Buscar</button></div></form>
    <form class="card stack" data-mf novalidate><b>…o elige marca, modelo y año</b><div class="grid-3">
      <div class="field"><label for="bk-mk">Marca</label><select class="select" id="bk-mk" name="marca"><option value="">Elige…</option>${MAKES.map(m => `<option>${escape(m)}</option>`).join('')}</select></div>
      <div class="field"><label for="bk-md">Modelo</label><select class="select" id="bk-md" name="modelo"><option value="">—</option></select></div>
      <div class="field"><label for="bk-yr">Año</label><select class="select" id="bk-yr" name="anio"><option value="">—</option></select></div></div><button class="btn">Usar este modelo</button></form>
  </div>`;
  const stepBranch = () => `<div class="opt-list">${branches().map(b => { const l = branchLive(b.id); return `<button class="opt ${bk.branchId === b.id ? 'on' : ''}" data-branch="${b.id}"><span class="opt-ico">📍</span><span class="grow"><b>${escape(b.name)}</b><small>${escape(b.address)} · ${escape(b.hours)}</small></span><span class="badge badge-${waitTone(l.wait)}">${escape(waitLabel(l.wait))}</span></button>`; }).join('')}</div>`;
  const stepSvc = () => `<div class="opt-list">${services().map(s => `<label class="opt ${bk.services.includes(s.id) ? 'on' : ''}"><input type="checkbox" data-svc="${s.id}" ${bk.services.includes(s.id) ? 'checked' : ''}><span class="opt-ico">${s.icon}</span><span class="grow"><b>${escape(s.name)}</b><small>${escape(s.desc)} · ⏱ ${s.mins} min${s.oil ? ` · incluye ${escape(oilById(bk.veh.oil)?.short || '')}` : ''}</small></span><b class="nowrap">${money(priceFor(s, bk.veh))}</b></label>`).join('')}</div>
    <div class="row" style="margin-top:12px"><div class="field grow"><label for="bk-cp">Cupón de descuento</label><input class="input" id="bk-cp" name="cupon" placeholder="PITS10" value="${escape(bk.coupon)}"></div><button class="btn" data-cp style="align-self:flex-end">Aplicar</button></div>`;
  const stepSlot = () => {
    const days = Array.from({ length: settings().bookingDays || 10 }, (_, i) => addDays(today(), i));
    if (!bk.day) bk.day = days.find(d => slotsFor(bk.branchId, d).some(s => s.free && !s.past)) || days[0];
    const slots = slotsFor(bk.branchId, bk.day);
    return `<div class="day-chips">${days.map(d => { const ss = slotsFor(bk.branchId, d); const ok = ss.some(s => s.free && !s.past); return `<button class="day-chip ${bk.day === d ? 'on' : ''}" data-day="${d}" ${ok ? '' : 'disabled'}><small>${dayLabel(d, { weekday: 'short' })}</small><b>${+d.slice(8)}</b><small>${dayLabel(d, { month: 'short' })}</small></button>`; }).join('')}</div>
      ${slots.length ? `<div class="slot-grid" style="margin-top:12px">${slots.map(s => `<button class="slot ${bk.slot === s.iso ? 'on' : ''}" data-slot="${s.iso}" ${s.free && !s.past ? '' : 'disabled'}><b>${s.label}</b><small>${s.past ? 'pasado' : s.free ? `${s.free} cupo${s.free > 1 ? 's' : ''}` : 'lleno'}</small></button>`).join('')}</div>` : '<div class="empty">La sucursal no atiende este día.</div>'}
      <p class="small muted">Dejamos bahías libres para clientes sin cita: si no hay horario que te acomode, puedes llegar y usar "Llegué".</p>`;
  };
  const stepConfirm = () => `<form class="stack" data-cf novalidate>
    <div class="grid-2">
      <div class="field"><label for="bk-n">Nombre y apellido *</label><input class="input" id="bk-n" name="nombre" autocomplete="name" value="${escape(cust?.name || '')}"></div>
      <div class="field"><label for="bk-e">Correo *</label><input class="input" id="bk-e" name="email" type="email" autocomplete="email" value="${escape(cust?.email || '')}"></div>
      <div class="field"><label for="bk-t">Celular (WhatsApp) *</label><input class="input" id="bk-t" name="telefono" type="tel" autocomplete="tel" placeholder="+56 9 1234 5678" value="${escape(cust?.phone || '')}"></div>
      <div class="field"><label for="bk-k">Kilometraje aproximado</label><input class="input" id="bk-k" name="km" type="number" min="0" step="100" value="${bk.veh?.km || ''}"></div>
    </div>
    ${bk.veh?.plate ? '' : `<div class="field"><label for="bk-p">Patente *</label><input class="input plate-input" id="bk-p" name="patente" placeholder="KJTR-45" maxlength="8"></div>`}
    <div class="field"><label for="bk-o">Comentarios para el técnico</label><textarea class="textarea" id="bk-o" name="notas" placeholder="Ej.: ruido al frenar, testigo encendido…"></textarea></div>
    <label class="check"><input type="checkbox" name="rem" checked> Quiero recordatorios de mantención por WhatsApp</label>
    <button class="btn btn-primary btn-lg">Confirmar reserva</button></form>`;

  const done = () => { const j = bk.done; return `<section class="section page-top"><div class="container stack confirm">
    <span class="big-num">✅</span><h1>¡Reserva confirmada!</h1>
    <div class="code-box"><span class="label">Código de atención</span><b>${escape(j.code)}</b></div>
    <p class="lead">${plate(j.plate)} · ${escape(j.car)} · ${escape(branchById(j.branchId)?.name)} · ${escape(dayLabel(j.bookedFor, { weekday: 'long', day: 'numeric', month: 'long' }))} a las ${timeHM(j.bookedFor)}</p>
    <div class="callout small" style="text-align:left">📍 Al llegar, toca <b>"Llegué"</b> e ingresa tu patente: quedarás en la fila con prioridad de reserva. Te enviamos la confirmación por WhatsApp (simulado).</div>
    <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/estado/${escape(j.code)}">Seguir mi atención</a><a class="btn" href="#/llegue?b=${j.branchId}">📍 Llegué</a><a class="btn btn-ghost" href="#/reservar?new=1">Nueva reserva</a></div>
  </div></section>`; };

  const can = i => i === 0 || (i === 1 && bk.veh) || (i === 2 && bk.veh && bk.branchId) || (i === 3 && bk.veh && bk.branchId && bk.services.length) || (i === 4 && bk.slot);
  const paint = () => {
    if (bk.done) { el.innerHTML = done(); return; }
    const body = [stepVeh, stepBranch, stepSvc, stepSlot, stepConfirm][bk.step]();
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div data-anim><span class="eyebrow">Reserva online</span><h1>Reserva tu hora</h1></div>
      <ol class="stepper">${STEPS.map((s, i) => `<li class="${i < bk.step ? 'done' : i === bk.step ? 'now' : ''}"><a href="#" data-go="${i}" aria-disabled="${!can(i)}"><i>${i < bk.step ? '✓' : i + 1}</i><small>${s}</small></a></li>`).join('')}</ol>
      <div class="book-grid"><div class="card stack"><h2 style="margin:0;font-size:22px">${bk.step + 1}. ${STEPS[bk.step]}</h2>${body}
        <div class="row between">${bk.step ? '<button class="btn btn-ghost" data-back>← Atrás</button>' : '<span></span>'}${bk.step < 4 ? `<button class="btn btn-primary" data-next ${can(bk.step + 1) ? '' : 'disabled'}>Continuar →</button>` : ''}</div></div>
        ${summary()}</div>
    </div></section>`;
    wire();
  };
  const wire = () => {
    const pl = el.querySelector('[data-pl]');
    if (pl) pl.onsubmit = e => { e.preventDefault(); const i = pl.elements.patente; const r = validPlate(i.value) && lookupPlate(i.value); if (!r) { i.classList.add('invalid'); toast('Patente no válida', 'warning'); return; } bk.veh = r.vehicle; visitor.set({ veh: bk.veh }); toast(r.found ? 'Vehículo encontrado en tu historial' : `Registro: ${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.year}`, 'success'); paint(); };
    const mf = el.querySelector('[data-mf]');
    if (mf) {
      const { marca: mk, modelo: md, anio: yr } = mf.elements;
      const years = () => { const m = modelById(md.value); yr.innerHTML = m ? Array.from({ length: m.to - m.from + 1 }, (_, i) => `<option>${m.to - i}</option>`).join('') : '<option value="">—</option>'; };
      mk.onchange = () => { md.innerHTML = MODELS.filter(m => m.make === mk.value).map(m => `<option value="${m.id}">${escape(m.model)}</option>`).join('') || '<option value="">—</option>'; years(); };
      md.onchange = years;
      mf.onsubmit = e => { e.preventDefault(); const m = modelById(md.value); if (!m) { mk.classList.add('invalid'); return; } bk.veh = vehFromModel(m, +yr.value); visitor.set({ veh: bk.veh }); paint(); };
    }
    const cf = el.querySelector('[data-cf]');
    if (cf) cf.onsubmit = e => {
      e.preventDefault();
      const f = cf.elements, val = n => (f[n]?.value || '').trim();
      const bad = { nombre: val('nombre').length < 3, email: !/^\S+@\S+\.\S+$/.test(val('email')), telefono: val('telefono').replace(/\D/g, '').length < 8, ...(f.patente ? { patente: !validPlate(val('patente')) } : {}) };
      Object.entries(bad).forEach(([k, b]) => f[k]?.classList.toggle('invalid', b));
      if (Object.values(bad).some(Boolean)) { toast('Revisa los campos marcados', 'warning'); return; }
      const s = slotsFor(bk.branchId, bk.day).find(x => x.iso === bk.slot);
      if (!s || !s.free) { toast('Ese horario se acaba de ocupar, elige otro', 'warning'); bk.step = 3; bk.slot = ''; paint(); return; }
      const veh = { ...bk.veh, plate: bk.veh.plate || val('patente').toUpperCase() };
      const c = cust || upsertCustomer({ name: val('nombre'), email: val('email'), phone: val('telefono') });
      const j = createJob({ veh, customerId: c.id, branchId: bk.branchId, serviceIds: bk.services, status: 'reservado', source: 'web', bookedFor: bk.slot, km: +val('km') || 0, notes: val('notas'), coupon: checkCoupon(bk.coupon, bk.services).ok ? bk.coupon : '' });
      if (f.rem.checked) db.insert('signups', { name: c.name, phone: c.phone || val('telefono'), email: c.email, plate: j.plate, channel: 'whatsapp', every: 'km' });
      db.insert('messages', { campaignId: '', channel: 'whatsapp', to: val('telefono'), name: c.name, text: `Pits Rápido: reserva ${j.code} confirmada para ${dayLabel(j.bookedFor)} ${timeHM(j.bookedFor)} en ${branchById(j.branchId).name}.`, status: 'entregado', at: new Date().toISOString() });
      visitor.set({ veh: { ...veh, plate: j.plate }, lastCode: j.code });
      bk.done = j; paint(); window.scrollTo(0, 0);
      toast('Reserva confirmada', 'success');
    };
  };
  el.addEventListener('click', e => {
    const t = e.target;
    const go = t.closest('[data-go]'); if (go) { e.preventDefault(); const i = +go.dataset.go; if (can(i) && i <= bk.step + 1) { bk.step = i; paint(); } return; }
    if (t.closest('[data-next]')) { bk.step++; paint(); window.scrollTo(0, 0); return; }
    if (t.closest('[data-back]')) { bk.step--; paint(); return; }
    const mv = t.closest('[data-myveh]'); if (mv) { bk.veh = db.get('vehicles', mv.dataset.myveh); paint(); return; }
    const b = t.closest('[data-branch]'); if (b) { if (bk.branchId !== b.dataset.branch) { bk.slot = ''; bk.day = ''; } bk.branchId = b.dataset.branch; paint(); return; }
    const d = t.closest('[data-day]'); if (d) { bk.day = d.dataset.day; bk.slot = ''; paint(); return; }
    const s = t.closest('[data-slot]'); if (s) { bk.slot = s.dataset.slot; paint(); return; }
    if (t.closest('[data-cp]')) { const v = el.querySelector('#bk-cp').value.trim(); const r = checkCoupon(v, bk.services); if (r.ok) { bk.coupon = r.coupon.code; toast('Cupón aplicado', 'success'); } else { bk.coupon = ''; toast(r.msg, 'warning'); } paint(); }
  });
  el.addEventListener('change', e => {
    const c = e.target.closest('[data-svc]'); if (!c) return;
    bk.services = c.checked ? [...new Set([...bk.services, c.dataset.svc])] : bk.services.filter(x => x !== c.dataset.svc);
    paint();
  });
  paint();
  return { live: false };
}
