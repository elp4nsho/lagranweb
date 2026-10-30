// Detalle del auto: galería, ficha, informe de certificación 150 puntos, historial, informe legal, precio vs mercado,
// simulador de cuota, reserva con abono (pago simulado) y agenda de visita / test drive.
import { money, escape, date, toast, modal, barChart, sleep } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { BODIES, POINTS, RESULT, SLOTS, INSPECTION } from '../data/catalog.js';
import { settings, isVisible, branchById, kmFmt, inspectionSummary, simulate, comparables, carName, carTitle, setCarStatus, nextCode, compareGet } from '../shared/domain.js';
import { nextWorkdays, fmtDay, validRut } from '../shared/util.js';
import { carArt } from '../shared/car-art.js';
import { carCard } from './cards.js';
import { wireCompare } from './buscar.js';

export function certReport(ins, { open = false } = {}) {
  if (!ins || ins.status !== 'completada') return '<p class="muted">Informe de certificación en preparación.</p>';
  const s = inspectionSummary(ins), insp = db.get('users', ins.inspectorId);
  return `<div class="stack"><div class="cert-score"><span class="cert-ring" style="--v:${s.score}"><b>${s.score}%</b></span>
      <div class="stack" style="gap:4px"><b>${s.p} aprobados · ${s.o} observaciones · ${s.f} fallas</b><small class="muted">Inspeccionado por ${escape(insp?.name || 'inspector certificado')} el ${date(ins.at)}</small>
      <div class="row" style="gap:6px"><span class="badge badge-success">✓ Aprobado</span><span class="badge badge-warning">! Observación informada</span>${s.f ? '<span class="badge badge-danger">✕ Falla</span>' : ''}</div></div></div>
    ${s.cats.map((c, ci) => `<details class="cert-cat" ${open && (c.o || c.f) ? 'open' : ''}><summary><b>${escape(c.cat)}</b><span class="cert-bar"><i class="p" style="width:${c.p / 15 * 100}%"></i><i class="o" style="width:${c.o / 15 * 100}%"></i><i class="f" style="width:${c.f / 15 * 100}%"></i></span><small>${c.p}/15</small></summary>
      <ul class="pt-list">${INSPECTION[ci][1].map((name, k) => { const i = ci * 15 + k, r = ins.results[i]; return `<li><span class="pt-ic ${r}" aria-label="${RESULT[r].label}">${RESULT[r].icon}</span><span>${escape(name)}${ins.notes?.[i] ? `<small class="muted d-block">${escape(ins.notes[i])}${ins.photos?.[i] ? ' · 📷 ' + ins.photos[i] : ''}</small>` : ''}</span></li>`; }).join('')}</ul></details>`).join('')}</div>`;
}
function marketBlock(c) {
  const comps = comparables(c), vals = [...comps.map(x => x.price), c.price];
  const lo = Math.min(...vals) * .97, hi = Math.max(...vals) * 1.03, pos = v => ((v - lo) / (hi - lo) * 100).toFixed(1);
  const avg = comps.reduce((a, x) => a + x.price, 0) / comps.length, diff = (c.price - avg) / avg * 100;
  return `<div class="stack"><p style="margin:0">Este auto está <b style="color:var(--${diff <= 0 ? 'success' : 'warning'})">${Math.abs(diff).toFixed(1)}% ${diff <= 0 ? 'bajo' : 'sobre'}</b> el precio promedio de ${comps.length} avisos comparables (${escape(carName(c))} ${c.year - 1}–${c.year + 1}).</p>
    <div class="gauge"><span class="mk" style="left:${pos(c.price)}%">Este auto ${money(c.price)}</span><span class="mk avg" style="left:${pos(avg)}%">Promedio ${money(avg)}</span></div>
    <div class="gauge-ends"><span>${money(lo)}</span><span>${money(hi)}</span></div>
    <div class="mkt-chart">${barChart([...comps.map((x, i) => ({ label: `${Math.round(x.km / 1000)}k km`, value: Math.round(x.price / 1000) })), { label: 'Este', value: Math.round(c.price / 1000), color: 'var(--accent)' }], { height: 150, format: v => money(v * 1000) })}</div>
    <small class="muted">Precios en miles de pesos según kilometraje. Fuente: muestreo semanal de portales y automotoras (simulado).</small></div>`;
}

export function renderCar(el, { id }) {
  const paint = () => {
    const c = db.get('cars', id), st = settings();
    if (!c || !(isVisible(c) || c.status === 'vendido')) { el.innerHTML = '<section class="section"><div class="container card empty stack"><span style="font-size:40px">🚗</span>Este auto no está disponible.<a class="btn btn-primary" href="#/autos">Ver autos disponibles</a></div></section>'; return; }
    const b = branchById(c.branchId), ins = c.inspectionId && db.get('inspections', c.inspectionId);
    const sim = simulate({ price: c.price, pie: Math.round(c.price * .3), cuotas: 36, tasa: st.baseRate });
    const similar = db.query('cars', x => isVisible(x) && x.id !== c.id && (x.body === c.body || x.brand === c.brand)).slice(0, 3);
    const sold = c.status === 'vendido', reserved = c.status === 'reservado';
    el.innerHTML = `<section class="section" style="padding-top:24px"><div class="container stack">
      <a href="#/autos" class="small">← Volver a la búsqueda</a>
      <div class="detail-grid">
        <div class="stack">
          <div class="gallery-main">${carArt({ body: c.body, color: c.color, ev: c.fuel === 'Eléctrico', label: `${carTitle(c)} color ${c.colorName}` })}</div>
          <div class="thumbs">${['Frente ¾', 'Interior', 'Tablero', 'Maleta', 'Motor', 'Llantas', 'Asientos traseros', 'Vista 360°'].slice(0, 4).map(t => `<span class="thumb">📷<br>${t}</span>`).join('')}</div>
          <div class="card stack"><h2 style="margin:0">Ficha técnica</h2><div class="spec-grid">
            ${[['Año', c.year], ['Kilometraje', kmFmt(c.km)], ['Transmisión', c.transmission], ['Combustible', c.fuel], ['Carrocería', BODIES[c.body]], ['Motor', c.engine === 'EV' ? 'Eléctrico' : c.engine + ' L'], ['Potencia', c.hp + ' CV'], ['Puertas', c.doors], ['Color', c.colorName], ['Dueños', c.owners], ['Patente', c.plate.slice(0, 2) + '••-••'], ['Stock', c.stock]].map(([k, v]) => `<div class="spec"><small>${k}</small><b>${escape(String(v))}</b></div>`).join('')}</div>
            ${(c.equipment || []).length ? `<h3 style="margin:8px 0 0">Equipamiento</h3><ul class="equip">${c.equipment.map(e => `<li>${escape(e)}</li>`).join('')}</ul>` : ''}</div>
          <div class="card stack" id="cert"><div class="row between"><h2 style="margin:0">Informe de certificación · 150 puntos</h2><span class="badge badge-success">✓ Ruta Certificada</span></div>${certReport(ins, { open: true })}</div>
          <div class="grid-2">
            <div class="card stack"><h3 style="margin:0">Historial de mantenciones</h3>${(c.history || []).length ? `<ol class="mini-list small">${c.history.map(h => `<li class="row between" style="gap:6px;flex-wrap:nowrap"><span><b>${escape(h.desc)}</b><small class="muted d-block">${escape(h.where)} · ${fmtDay(h.date, { year: true })}</small></span><span class="nowrap">${kmFmt(h.km)}</span></li>`).join('')}</ol>` : '<p class="muted">Sin registros.</p>'}</div>
            <div class="card stack"><h3 style="margin:0">Informe legal</h3><ul class="legal-list small"><li>✅ <span><b>Sin multas impagas</b> (Registro de Multas, consulta ${fmtDay(new Date(Date.now() - 2 * 864e5))})</span></li><li>✅ <span><b>Sin prendas ni prohibiciones</b> (certificado de anotaciones vigentes)</span></li><li>✅ <span><b>Sin encargo por robo</b></span></li><li>✅ <span>Revisión técnica vigente hasta <b>${c.rtUntil ? fmtDay(c.rtUntil, { year: true }) : '—'}</b></span></li><li>✅ <span>Permiso de circulación y SOAP al día</span></li><li>✅ <span>${c.owners} dueño${c.owners > 1 ? 's' : ''} anterior${c.owners > 1 ? 'es' : ''}, kilometraje verificado</span></li></ul><span class="badge badge-success" style="align-self:flex-start">Sin deudas</span></div>
          </div>
          <div class="card stack"><h2 style="margin:0">Precio vs. mercado</h2>${marketBlock(c)}</div>
        </div>
        <aside class="stack detail-side"><div class="card stack">
          <div class="row" style="gap:6px">${sold ? '<span class="badge badge-danger">Vendido</span>' : reserved ? '<span class="badge badge-warning">Reservado</span>' : '<span class="badge badge-success">✓ Certificado</span>'}<span class="badge">${escape(b?.name || '')}</span></div>
          <h1 style="margin:0;font-size:clamp(24px,3vw,34px)">${escape(c.brand)} ${escape(c.model)}</h1><span class="muted">${escape(c.version)} · ${c.year} · ${kmFmt(c.km)}</span>
          <b class="price-xl">${money(c.price)}</b>
          ${!sold ? `<div class="callout small">Cuota desde <b>${money(sim.cuota)}</b>/mes · 36 cuotas con 30% de pie · CAE ${String(sim.cae).replace('.', ',')}% <a href="#/financiamiento?car=${c.id}">Simular</a></div>
          ${reserved ? '<p class="callout warn small" style="margin:0">Este auto tiene una reserva activa. Puedes dejar tus datos para avisarte si se libera.</p>' : `<a class="btn btn-primary btn-lg btn-block" href="#/reservar/${c.id}">Reservar con ${money(st.deposit)}</a>`}
          <button class="btn btn-block" data-visit="test-drive">🚗 Agendar test drive</button><button class="btn btn-ghost btn-block" data-visit="visita">🏢 Agendar visita / consulta</button>
          <label class="check small"><input type="checkbox" data-cmp="${c.id}" ${compareGet().includes(c.id) ? 'checked' : ''}> Agregar al comparador</label>` : '<p class="muted">Este auto ya fue vendido. Mira opciones similares abajo.</p>'}
          <hr style="margin:4px 0"><ul class="mini-list small"><li>🛡️ Garantía mecánica ${st.warrantyMonths} meses</li><li>↩️ Reserva reembolsable 100% por ${st.reserveDays} días</li><li>🔁 Recibimos tu auto en parte de pago · <a href="#/vende">tasar</a></li><li>📍 ${escape(b?.address || '')}, ${escape(b?.comuna || '')}</li></ul></div></aside>
      </div>
      ${similar.length ? `<h2 style="margin:20px 0 0">También te puede interesar</h2><div class="car-grid">${similar.map(x => carCard(x)).join('')}</div>` : ''}
    </div></section>`;
  };
  el.addEventListener('click', e => { const v = e.target.closest('[data-visit]'); if (v) visitModal(db.get('cars', id), v.dataset.visit); });
  paint();
  wireCompare(el);
  return { refresh: () => { const t = el.querySelector('.compare-tray'); paint(); if (t) el.appendChild(t); } };
}

function prefill() { const u = auth.current(); return u?.role === 'cliente' ? { name: u.name, email: u.email, phone: u.phone || '', rut: u.rut || '' } : { name: '', email: '', phone: '', rut: '' }; }
function visitModal(c, type) {
  const p = prefill(), days = nextWorkdays(8);
  const m = modal({ title: type === 'test-drive' ? `Test drive · ${carName(c)}` : `Visita · ${carName(c)}`, body: `<form class="stack" id="vf" novalidate>
    <div class="grid-2"><div class="field"><label for="v-d">Día</label><select class="select" id="v-d" name="date">${days.map(d => `<option value="${d}">${fmtDay(d, { weekday: true })}</option>`).join('')}</select></div>
      <div class="field"><label for="v-s">Hora</label><select class="select" id="v-s" name="slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select></div></div>
    <div class="field"><label for="v-n">Nombre</label><input class="input" id="v-n" name="name" autocomplete="name" value="${escape(p.name)}"></div>
    <div class="grid-2"><div class="field"><label for="v-e">Correo</label><input class="input" id="v-e" name="email" type="email" value="${escape(p.email)}"></div><div class="field"><label for="v-p">Teléfono</label><input class="input" id="v-p" name="phone" type="tel" value="${escape(p.phone)}"></div></div>
    ${type === 'test-drive' ? '<label class="check"><input type="checkbox" name="license" required> Tengo licencia de conducir clase B vigente</label>' : '<div class="field"><label for="v-m">Mensaje (opcional)</label><textarea class="textarea" id="v-m" name="msg" style="min-height:70px"></textarea></div>'}
    <small class="muted">Sucursal ${escape(branchById(c.branchId)?.name || '')}: ${escape(branchById(c.branchId)?.address || '')}</small></form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-send>Confirmar</button>' });
  const f = m.el.querySelector('#vf');
  m.el.querySelector('[data-send]').onclick = () => {
    const v = Object.fromEntries(new FormData(f)), lic = f.querySelector('[name=license]');
    if (v.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(v.email) || v.phone.replace(/\D/g, '').length < 8) { toast('Completa nombre, correo y teléfono válidos', 'warning'); return; }
    if (lic && !lic.checked) { toast('Para el test drive necesitas licencia clase B vigente', 'warning'); return; }
    db.insert('leads', { type, carId: c.id, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), rut: prefill().rut, status: 'nuevo', sellerId: null, source: 'web', scheduledAt: `${v.date}T${v.slot}`, branchId: c.branchId, notes: v.msg ? [{ at: new Date().toISOString(), by: null, text: v.msg }] : [] });
    db.log('leads', `Nuevo ${type === 'test-drive' ? 'test drive' : 'visita'}: ${v.name} · ${carName(c)} ${c.stock} · ${v.date} ${v.slot}`, auth.current()?.id || null);
    m.close(); toast(`¡Agendado! Te esperamos el ${fmtDay(v.date, { weekday: true })} a las ${v.slot}`, 'success', 4500);
  };
}

export function renderReserve(el, { id }) {
  const c = db.get('cars', id), st = settings(), p = prefill();
  if (!c || c.status !== 'publicado') { el.innerHTML = `<section class="section"><div class="container narrow card empty stack">Este auto no está disponible para reserva.<a class="btn btn-primary" href="#/auto/${id}">Volver al auto</a></div></section>`; return; }
  el.innerHTML = `<section class="section"><div class="container stack">
    <div><span class="eyebrow">Reserva en línea</span><h1 style="margin:0">Reserva tu ${escape(carName(c))}</h1></div>
    <div class="book-grid"><form class="card stack" id="rf" novalidate>
      <h3 style="margin:0">Tus datos</h3>
      <div class="grid-2"><div class="field"><label for="r-n">Nombre completo</label><input class="input" id="r-n" name="name" autocomplete="name" value="${escape(p.name)}"></div><div class="field"><label for="r-rut">RUT</label><input class="input" id="r-rut" name="rut" value="${escape(p.rut)}" placeholder="12.345.678-5"></div>
        <div class="field"><label for="r-e">Correo</label><input class="input" id="r-e" type="email" name="email" value="${escape(p.email)}"></div><div class="field"><label for="r-p">Teléfono</label><input class="input" id="r-p" type="tel" name="phone" value="${escape(p.phone)}"></div></div>
      <h3 style="margin:8px 0 0">Pago del abono (simulado)</h3>
      <div class="field"><label for="r-cc">Número de la tarjeta</label><input class="input" id="r-cc" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" autocomplete="cc-number"></div>
      <div class="grid-2"><div class="field"><label for="r-exp">Vencimiento (MM/AA)</label><input class="input" id="r-exp" name="exp" placeholder="12/29" autocomplete="cc-exp"></div><div class="field"><label for="r-cvv">CVV</label><input class="input" id="r-cvv" name="cvv" inputmode="numeric" maxlength="4" autocomplete="cc-csc"></div></div>
      <label class="check"><input type="checkbox" name="terms" required> Acepto las condiciones: el auto queda reservado ${st.reserveDays} días y el abono se descuenta del precio o se devuelve completo.</label>
      <p class="small" style="color:var(--danger);margin:0" data-err hidden></p>
      <button class="btn btn-primary btn-lg">Pagar ${money(st.deposit)} y reservar</button></form>
      <aside class="card stack book-summary"><div class="car-frame">${carArt({ body: c.body, color: c.color })}</div><b>${escape(carTitle(c))}</b><small class="muted">${kmFmt(c.km)} · ${escape(c.transmission)} · ${escape(branchById(c.branchId)?.name || '')}</small>
        <ul class="lines small"><li><span>Precio</span><b>${money(c.price)}</b></li><li><span>Abono de reserva</span><b>${money(st.deposit)}</b></li><li><span>Saldo a pagar</span><b>${money(c.price - st.deposit)}</b></li></ul>
        <small class="muted">🔒 Pago simulado: no ingreses datos reales. Usa 4242 4242 4242 4242.</small></aside></div></div></section>`;
  const f = el.querySelector('#rf');
  f.onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f)), err = m => { const x = f.querySelector('[data-err]'); x.hidden = false; x.textContent = m; toast(m, 'warning'); };
    if (v.name.trim().length < 3) return err('Ingresa tu nombre');
    if (!validRut(v.rut)) return err('RUT inválido');
    if (!/^\S+@\S+\.\S+$/.test(v.email)) return err('Correo inválido');
    if (v.phone.replace(/\D/g, '').length < 8) return err('Teléfono inválido');
    const cc = v.card.replace(/\D/g, '');
    if (cc.length < 15 || !/^\d{2}\/\d{2}$/.test(v.exp.trim()) || !/^\d{3,4}$/.test(v.cvv)) return err('Revisa los datos de la tarjeta');
    if (!f.querySelector('[name=terms]').checked) return err('Debes aceptar las condiciones');
    const btn = f.querySelector('button.btn-primary'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando pago…';
    await sleep(900);
    if (db.get('cars', id).status !== 'publicado') { btn.disabled = false; return err('Lo sentimos, alguien acaba de reservar este auto.'); }
    const lead = db.insert('leads', { type: 'reserva', carId: id, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), rut: v.rut.trim(), status: 'negociacion', sellerId: null, source: 'web', branchId: c.branchId, notes: [{ at: new Date().toISOString(), by: null, text: `Reserva pagada en línea (${money(st.deposit)}).` }] });
    const code = nextCode('reservations', 'RS-', 300);
    const exp = new Date(Date.now() + st.reserveDays * 864e5).toISOString().slice(0, 10);
    db.insert('reservations', { code, carId: id, leadId: lead.id, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), rut: v.rut.trim(), deposit: st.deposit, card: cc.slice(-4), paidAt: new Date().toISOString(), expiresAt: exp, status: 'activa' });
    setCarStatus(id, 'reservado', auth.current()?.id || null, `reserva ${code}`);
    el.innerHTML = `<section class="section"><div class="container narrow"><div class="card stack success-hero" data-anim="bounceIn"><span class="big-ico">🎉</span><h1 style="margin:0">¡Reservado!</h1>
      <p class="lead">Tu ${escape(carName(c))} queda reservado hasta el <b>${fmtDay(exp, { weekday: true, year: true })}</b>. Código <b class="mono">${code}</b> · tarjeta terminada en ${cc.slice(-4)}.</p>
      <p class="muted">Un vendedor te contactará hoy para coordinar la firma y el financiamiento.</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/financiamiento?car=${id}">Simular financiamiento</a>${auth.current()?.role === 'cliente' ? '<a class="btn" href="#/cuenta">Ver en mi cuenta</a>' : ''}<a class="btn btn-ghost" href="#/autos">Seguir viendo</a></div></div></div></section>`;
  };
  return { live: false };
}
export { POINTS };
