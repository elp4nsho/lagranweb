// Planes de mantención prepagados: precios por segmento y compra simulada con tarjeta.
import { escape, money, toast, modal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { SEGMENTS } from '../data/catalog.js';
import { serviceById, segName, lookupPlate, validPlate, upsertCustomer, upsertVehicle, addDays, today, customerById } from '../shared/domain.js';
import { visitor } from './state.js';

export function renderPlans(el, _p, query = {}) {
  let seg = visitor.get().veh?.segment || 'sedan';
  const paint = () => {
    const plans = db.query('plans', p => p.active).sort((a, b) => a.order - b.order);
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div data-anim><span class="eyebrow">Planes prepagados</span><h1>Mantención todo el año a precio congelado</h1><p class="lead">Compra tu plan una vez y úsalo en cualquier sucursal. El precio depende del segmento de tu vehículo e incluye el aceite recomendado por el fabricante.</p></div>
      <div class="seg-chips" role="group" aria-label="Segmento">${SEGMENTS.map(g => `<button class="chip ${g.id === seg ? 'active' : ''}" data-seg="${g.id}">${g.icon} ${escape(g.name)}</button>`).join('')}</div>
      <div class="grid-auto plans-grid">${plans.map(p => `<div class="card plan-card ${p.popular ? 'popular' : ''} ${query.plan === p.id ? 'popular' : ''}">${p.popular ? '<span class="badge badge-primary ribbon">Más elegido</span>' : ''}
        <span class="svc-ico">${p.icon}</span><h3 style="margin:0">${escape(p.name)}</h3><small class="muted">${escape(p.tag)}</small>
        <div><b class="price" style="font-size:1.8em">${money(p.prices[seg])}</b> <small class="muted">${escape(segName(seg))}</small></div>
        <span class="badge badge-success plain">Ahorras ${p.savePct}% vs. precio lista</span>
        <ul class="small">${p.includes.map(i => `<li>${i.q}× ${escape(serviceById(i.s)?.name || i.s)}</li>`).join('')}</ul>
        <small class="muted">Vigencia ${p.months} meses · todas las sucursales</small>
        <button class="btn btn-primary" data-buy="${p.id}">Comprar plan</button></div>`).join('')}</div>
      <div class="grid-3 faq">${[['¿Cómo lo uso?', 'Al pagar en caja, el recepcionista marca los servicios cubiertos por tu plan y el total baja a $0.'], ['¿Sirve para otro auto?', 'El plan queda asociado a la patente que indiques al comprar. Puedes tener un plan por vehículo.'], ['¿Qué pasa si no lo uso?', 'Te enviamos recordatorios antes de que venza. Los servicios no usados vencen con el plan.']].map(([q, a]) => `<div class="card"><b>${q}</b><p class="small muted" style="margin:6px 0 0">${a}</p></div>`).join('')}</div>
    </div></section>`;
  };
  const buy = id => {
    const p = db.get('plans', id), u = auth.current(), cust = u?.role === 'cliente' ? customerById(u.customerId) : null;
    const mine = cust ? db.query('vehicles', v => v.customerId === cust.id) : [];
    const veh0 = visitor.get().veh;
    const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
    f.innerHTML = `<p class="callout small">${p.icon} <b>${escape(p.name)}</b> · ${p.includes.map(i => `${i.q}× ${escape(serviceById(i.s)?.name)}`).join(', ')}</p>
      ${mine.length ? `<div class="field"><label for="pb-v">Vehículo</label><select class="select" id="pb-v" name="veh">${mine.map(v => `<option value="${v.id}">${escape(v.plate)} · ${escape(v.make)} ${escape(v.model)}</option>`).join('')}</select></div>` : `<div class="field"><label for="pb-p">Patente del vehículo *</label><input class="input plate-input" id="pb-p" name="patente" maxlength="8" placeholder="KJTR-45" value="${escape(veh0?.plate || '')}"></div>`}
      <div class="callout small" data-q></div>
      ${cust ? '' : `<div class="grid-2"><div class="field"><label for="pb-n">Nombre *</label><input class="input" id="pb-n" name="nombre" autocomplete="name"></div><div class="field"><label for="pb-e">Correo *</label><input class="input" id="pb-e" name="email" type="email" autocomplete="email"></div><div class="field"><label for="pb-t">Celular</label><input class="input" id="pb-t" name="telefono" type="tel"></div></div>`}
      <fieldset class="fs"><legend>Pago con tarjeta (simulado)</legend><div class="grid-3">
        <div class="field" style="grid-column:span 2"><label for="pb-c">Número de tarjeta *</label><input class="input" id="pb-c" name="tarjeta" inputmode="numeric" autocomplete="cc-number" placeholder="4111 1111 1111 1111"></div>
        <div class="field"><label for="pb-x">Venc. *</label><input class="input" id="pb-x" name="vencimiento" autocomplete="cc-exp" placeholder="12/28"></div></div></fieldset>`;
    const m = modal({ title: 'Comprar plan', body: f, size: 'lg', foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-pay>Pagar</button>' });
    const vehOf = () => { if (f.elements.veh) return db.get('vehicles', f.elements.veh.value); const v = f.elements.patente.value; return validPlate(v) ? lookupPlate(v)?.vehicle : null; };
    const quote = () => { const v = vehOf(); f.querySelector('[data-q]').innerHTML = v ? `${escape(v.make)} ${escape(v.model)} · segmento <b>${escape(segName(v.segment))}</b> → total <b>${money(p.prices[v.segment])}</b>` : 'Ingresa la patente para calcular el precio de tu segmento.'; };
    f.addEventListener('input', quote); f.addEventListener('change', quote); quote();
    m.el.querySelector('[data-pay]').onclick = () => {
      const v = vehOf(), el2 = n => f.elements[n];
      const bad = { patente: !!el2('patente') && !v, nombre: !!el2('nombre') && el2('nombre').value.trim().length < 3, email: !!el2('email') && !/^\S+@\S+\.\S+$/.test(el2('email').value), tarjeta: el2('tarjeta').value.replace(/\D/g, '').length < 13, vencimiento: !/^\d{2}\/\d{2}$/.test(el2('vencimiento').value.trim()) };
      Object.entries(bad).forEach(([k, b]) => el2(k)?.classList.toggle('invalid', b));
      if (Object.values(bad).some(Boolean)) { toast('Revisa los datos marcados', 'warning'); return; }
      const c = cust || upsertCustomer({ name: el2('nombre').value.trim(), email: el2('email').value.trim(), phone: el2('telefono')?.value.trim() });
      const veh = v.id ? v : upsertVehicle(v, c.id, 0);
      const n = db.count('planPurchases');
      const pp = db.insert('planPurchases', { code: 'PL-' + (7300 + n), planId: p.id, planName: p.name, customerId: c.id, vehicleId: veh.id, plate: veh.plate, segment: veh.segment, paid: p.prices[veh.segment], remaining: Object.fromEntries(p.includes.map(i => [i.s, i.q])), status: 'activo', expiresAt: addDays(today(), p.months * 30) });
      db.log('plan', `Plan ${p.name} vendido online a ${c.name} (${veh.plate})`, u?.id || null);
      m.close();
      modal({ title: '¡Plan activado!', body: `<div class="stack confirm"><span class="big-num">🎉</span><div class="code-box"><span class="label">Código del plan</span><b>${escape(pp.code)}</b></div><p>${escape(p.name)} para <span class="plate">${escape(veh.plate)}</span> · pagado ${money(pp.paid)}. Vence el ${escape(pp.expiresAt)}.</p><p class="small muted">Lo verás en "Mi cuenta" y en caja se descontará automáticamente.</p></div>`, foot: '<a class="btn btn-primary" href="#/reservar?new=1" data-close>Reservar mi primer servicio</a>' });
    };
  };
  el.addEventListener('click', e => {
    const s = e.target.closest('[data-seg]'); if (s) { seg = s.dataset.seg; paint(); }
    const b = e.target.closest('[data-buy]'); if (b) buy(b.dataset.buy);
  });
  paint();
  if (query.plan) setTimeout(() => el.querySelector(`[data-buy="${query.plan}"]`)?.scrollIntoView({ block: 'center' }), 50);
  return { refresh: ch => { if (ch?.col === 'plans' || ['reset', 'sync'].includes(ch?.type)) paint(); } };
}
