// Planes de mantención por suscripción mensual (para cualquier auto) con alta y pago simulado.
import { money, escape, toast, modal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { BRANDS } from '../data/catalog.js';
import { normPlate, ymd, addDays } from '../shared/util.js';

export function renderPlans(el) {
  const plans = db.query('plans', p => p.active).sort((a, b) => a.order - b.order), u = auth.current();
  const mine = u ? db.query('subscriptions', s => (s.userId === u.id || s.email === u.email) && s.status !== 'cancelada') : [];
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Suscripción mensual</span><h1 style="margin:0">Planes de mantención</h1><p class="lead">Para cualquier auto, lo hayas comprado con nosotros o no. Sin permanencia: pausa o cancela cuando quieras.</p></div></div>
    ${mine.length ? `<div class="callout ok">Tienes ${mine.length} plan(es) activo(s). <a href="#/cuenta?tab=subs">Administrar</a></div>` : ''}
    <div class="grid-3">${plans.map(p => `<article class="card plan-card tone-${p.tone}" data-anim><div class="row between"><h2 style="margin:0">${escape(p.name)}</h2>${p.featured ? '<span class="badge badge-primary">Más elegido</span>' : ''}</div>
      <div><b class="price-xl">${money(p.price)}</b> <span class="muted">/ mes</span></div><ul>${p.includes.map(i => `<li>${escape(i)}</li>`).join('')}</ul>
      <div class="foot"><button class="btn btn-primary btn-block" data-plan="${p.id}">Contratar ${escape(p.name.replace('Plan ', ''))}</button></div></article>`).join('')}</div>
    <div class="grid-3"><div class="card stack"><b>1. Elige tu plan</b><span class="muted small">Registra tu auto y paga con tarjeta de forma mensual.</span></div><div class="card stack"><b>2. Agenda tus mantenciones</b><span class="muted small">En sucursal o a domicilio, desde tu cuenta, sin costo adicional.</span></div><div class="card stack"><b>3. Maneja tranquilo</b><span class="muted small">Asistencia en ruta 24/7 en todo Chile: grúa, batería, neumático y combustible.</span></div></div>
  </div></section>`;
  el.addEventListener('click', e => { const b = e.target.closest('[data-plan]'); if (b) subscribe(db.get('plans', b.dataset.plan)); });
}
function subscribe(p) {
  const u = auth.current(), me = u?.role === 'cliente' ? u : null;
  const cars = me ? db.query('garage', g => g.userId === me.id) : [];
  const m = modal({ title: `Contratar ${p.name} · ${money(p.price)}/mes`, body: `<form class="stack" id="sf" novalidate>
    ${cars.length ? `<div class="field"><label for="s-g">Mi auto</label><select class="select" id="s-g" name="garage"><option value="">Otro auto</option>${cars.map(g => `<option value="${g.id}">${escape(g.brand + ' ' + g.model + ' ' + g.year)} · ${escape(g.plate)}</option>`).join('')}</select></div>` : ''}
    <div class="grid-2"><div class="field"><label for="s-b">Marca</label><select class="select" id="s-b" name="brand">${BRANDS.map(b => `<option>${escape(b)}</option>`).join('')}<option>Otra</option></select></div><div class="field"><label for="s-m">Modelo</label><input class="input" id="s-m" name="model" placeholder="Ej: Yaris"></div>
      <div class="field"><label for="s-y">Año</label><input class="input" id="s-y" name="year" type="number" min="1995" max="2026" value="2020"></div><div class="field"><label for="s-pl">Patente</label><input class="input" id="s-pl" name="plate" placeholder="Ej: KJTR-45"></div></div>
    <div class="grid-2"><div class="field"><label for="s-n">Nombre</label><input class="input" id="s-n" name="name" value="${escape(me?.name || '')}"></div><div class="field"><label for="s-e">Correo</label><input class="input" id="s-e" name="email" type="email" value="${escape(me?.email || '')}"></div></div>
    <div class="field"><label for="s-cc">Número de la tarjeta (cargo mensual simulado)</label><input class="input" id="s-cc" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242"></div>
    <label class="check"><input type="checkbox" name="ok" required> Acepto el cargo mensual de ${money(p.price)}. Puedo cancelar cuando quiera.</label></form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-go>Contratar</button>' });
  const f = m.el.querySelector('#sf');
  m.el.querySelector('[data-go]').onclick = () => {
    const v = Object.fromEntries(new FormData(f)), g = v.garage && db.get('garage', v.garage);
    const car = g ? `${g.brand} ${g.model} ${g.year}` : `${v.brand} ${v.model.trim()} ${v.year}`, plate = g ? g.plate : normPlate(v.plate);
    if (!g && (!v.model.trim() || !/^[A-Z]{2,4}-?\d{2,4}$/.test(plate))) { toast('Indica modelo y patente válida', 'warning'); return; }
    if (v.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(v.email)) { toast('Completa nombre y correo', 'warning'); return; }
    if (v.card.replace(/\D/g, '').length < 15) { toast('Revisa el número de tarjeta', 'warning'); return; }
    if (!f.querySelector('[name=ok]').checked) { toast('Debes aceptar el cargo mensual', 'warning'); return; }
    db.insert('subscriptions', { planId: p.id, name: v.name.trim(), email: v.email.trim(), userId: me?.id || null, car, plate, startedAt: new Date().toISOString(), status: 'activa', price: p.price, nextBilling: ymd(addDays(new Date(), 30)) });
    if (me && !g) db.insert('garage', { userId: me.id, brand: v.brand, model: v.model.trim(), year: +v.year, plate, km: 0, color: '#5b6474', body: 'sedan' });
    db.log('suscripciones', `Nueva suscripción ${p.name}: ${v.name} · ${car}`, u?.id || null);
    m.close(); toast(`¡${p.name} activo para tu ${car}!`, 'success', 4000);
  };
}
