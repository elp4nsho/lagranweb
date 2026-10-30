// Tienda de servicios: agenda de mantención, preparación revisión técnica, inspección precompra (sucursal o domicilio). Sucursales.
import { money, escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { SLOTS } from '../data/catalog.js';
import { nextCode, isVisible } from '../shared/domain.js';
import { nextWorkdays, fmtDay, normPlate } from '../shared/util.js';

export function renderServices(el, _p, q = {}) {
  const types = db.query('serviceTypes', s => s.active), u = auth.current(), me = u?.role === 'cliente' ? u : null;
  const sub = me && db.find('subscriptions', s => (s.userId === me.id || s.email === me.email) && s.status === 'activa');
  const cars = me ? db.query('garage', g => g.userId === me.id) : [];
  const S = { svc: q.svc || types[0]?.id, mode: 'sucursal' };
  const draw = () => {
    const t = db.get('serviceTypes', S.svc) || types[0];
    if (!t.modes.includes(S.mode)) S.mode = t.modes[0];
    const branches = db.query('branches', b => b.active && b.services);
    const included = sub && t.id === 'st1';
    el.innerHTML = `<section class="section"><div class="container stack">
      <div class="sec-head"><div><span class="eyebrow">Servicios</span><h1 style="margin:0">Agenda un servicio</h1><p class="lead">En nuestras sucursales o a domicilio en Santiago. Precios con IVA y repuestos estándar incluidos.</p></div></div>
      <div class="grid-3">${types.map(s => `<button type="button" class="card hover opt ${S.svc === s.id ? 'on' : ''}" data-svc="${s.id}" style="flex-direction:column;gap:6px"><span style="font-size:28px">${s.icon}</span><b>${escape(s.name)}</b><small>${escape(s.desc)}</small><span><b class="price">${money(s.price)}</b> <small class="muted">· ${s.mins} min · ${s.modes.includes('domicilio') ? 'sucursal o domicilio' : 'en sucursal'}</small></span></button>`).join('')}</div>
      <form class="card stack" id="sv" novalidate><h2 style="margin:0">${escape(t.name)}</h2>
        ${included ? `<div class="callout ok small">Incluido en tu ${escape(db.get('plans', sub.planId)?.name || 'plan')}: sin costo.</div>` : ''}
        <div class="opt-grid">${t.modes.map(m => `<label class="opt"><input type="radio" name="mode" value="${m}" ${S.mode === m ? 'checked' : ''}><span><b>${m === 'sucursal' ? '🏢 En sucursal' : '🏠 A domicilio'}</b><small>${m === 'sucursal' ? 'Te esperamos con café y Wi-Fi' : 'Vamos a tu casa u oficina (RM)'}</small></span></label>`).join('')}</div>
        <div class="grid-3">${S.mode === 'sucursal' ? `<div class="field"><label for="sv-b">Sucursal</label><select class="select" id="sv-b" name="branch">${branches.map(b => `<option value="${b.id}">${escape(b.name)}</option>`).join('')}</select></div>` : `<div class="field"><label for="sv-a">Dirección</label><input class="input" id="sv-a" name="address" placeholder="Calle, número, comuna"></div>`}
          <div class="field"><label for="sv-d">Día</label><select class="select" id="sv-d" name="date">${nextWorkdays(10).map(d => `<option value="${d}">${fmtDay(d, { weekday: true })}</option>`).join('')}</select></div>
          <div class="field"><label for="sv-s">Hora</label><select class="select" id="sv-s" name="slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select></div></div>
        ${cars.length ? `<div class="field"><label for="sv-g">Auto</label><select class="select" id="sv-g" name="garage">${cars.map(g => `<option value="${g.id}">${escape(g.brand + ' ' + g.model)} · ${escape(g.plate)}</option>`).join('')}<option value="">Otro auto</option></select></div>` : ''}
        <div class="grid-2" ${cars.length ? 'data-other hidden' : ''}><div class="field"><label for="sv-c">Marca y modelo</label><input class="input" id="sv-c" name="car" placeholder="Ej: Toyota Yaris 2019"></div><div class="field"><label for="sv-pl">Patente</label><input class="input" id="sv-pl" name="plate" placeholder="Ej: KJTR-45"></div></div>
        <div class="grid-3"><div class="field"><label for="sv-n">Nombre</label><input class="input" id="sv-n" name="name" value="${escape(me?.name || '')}"></div><div class="field"><label for="sv-e">Correo</label><input class="input" id="sv-e" type="email" name="email" value="${escape(me?.email || '')}"></div><div class="field"><label for="sv-p">Teléfono</label><input class="input" id="sv-p" type="tel" name="phone" value="${escape(me?.phone || '')}"></div></div>
        <div class="row between"><b class="price">${included ? 'Incluido en tu plan' : money(t.price)}</b><button class="btn btn-primary btn-lg">Confirmar hora</button></div></form>
    </div></section>`;
  };
  el.addEventListener('click', e => { const b = e.target.closest('[data-svc]'); if (b) { S.svc = b.dataset.svc; draw(); } });
  el.addEventListener('change', e => {
    if (e.target.name === 'mode') { S.mode = e.target.value; draw(); }
    if (e.target.name === 'garage') { const o = el.querySelector('[data-other]'); if (o) o.hidden = !!e.target.value; }
  });
  el.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f)), t = db.get('serviceTypes', S.svc);
    const g = v.garage && db.get('garage', v.garage);
    const carDesc = g ? `${g.brand} ${g.model}` : (v.car || '').trim(), plate = g ? g.plate : normPlate(v.plate);
    if (!carDesc || !/^[A-Z]{2,4}-?\d{2,4}$/.test(plate)) { toast('Indica el auto y una patente válida', 'warning'); return; }
    if (S.mode === 'domicilio' && (v.address || '').trim().length < 6) { toast('Indica la dirección', 'warning'); return; }
    if (v.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(v.email) || v.phone.replace(/\D/g, '').length < 8) { toast('Completa nombre, correo y teléfono', 'warning'); return; }
    const included = sub && t.id === 'st1';
    const bk = db.insert('bookings', { code: nextCode('bookings', 'SV-', 1200), serviceId: t.id, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), carDesc, plate, date: v.date, slot: v.slot, mode: S.mode, branchId: S.mode === 'sucursal' ? v.branch : null, address: v.address || '', status: 'agendada', price: included ? 0 : t.price, plan: !!included, userId: me?.id || null });
    db.log('servicios', `Nueva hora ${bk.code}: ${t.name} · ${carDesc} · ${v.date} ${v.slot}`, u?.id || null);
    el.querySelector('#sv').innerHTML = `<div class="stack success-hero"><span class="big-ico">🔧</span><h2 style="margin:0">Hora confirmada · ${bk.code}</h2><p class="lead">${escape(t.name)} el ${fmtDay(v.date, { weekday: true })} a las ${v.slot} ${S.mode === 'sucursal' ? 'en ' + escape(db.get('branches', v.branch)?.name || '') : 'en ' + escape(v.address)}.</p><button type="button" class="btn" data-again>Agendar otro servicio</button></div>`;
    el.querySelector('[data-again]').onclick = draw;
    toast('Servicio agendado', 'success');
  });
  draw();
  return { live: false };
}

export function renderBranches(el) {
  const bs = db.query('branches', b => b.active);
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="sec-head"><div><span class="eyebrow">Sucursales</span><h1 style="margin:0">Encuéntranos en ${bs.length} ciudades</h1></div></div>
    <div class="grid-auto">${bs.map(b => { const n = db.count('cars', c => c.branchId === b.id && isVisible(c)); return `<div class="card stack"><h3 style="margin:0">📍 ${escape(b.name)}</h3><span>${escape(b.address)}, ${escape(b.comuna)}</span><small class="muted">${escape(b.region)} · ${escape(b.hours)}</small><span>📞 ${escape(b.phone)}</span>
      <div class="row" style="gap:6px"><span class="badge badge-success">${n} autos</span>${b.services ? '<span class="badge badge-info">Taller y servicios</span>' : ''}</div><a class="btn btn-sm" href="#/autos?region=${encodeURIComponent(b.region)}">Ver autos en ${escape(b.region)}</a></div>`; }).join('')}</div>
  </div></section>`;
}
