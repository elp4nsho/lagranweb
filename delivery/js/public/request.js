// Solicitud de envío pública (invitado o cliente con sesión). Pago con tarjeta simulado.
import { db, authFor } from '../data/db.js';
import { html, raw, money, toast, escape } from '../../../assets/core/ui.js';
import * as ops from '../shared/ops.js';
import { comunaOptions, sizeOptions, serviceOptions } from './calc.js';

export function shipmentFormHtml(P, q = {}, { addresses = [], prefix = 'r' } = {}) {
  const def = addresses.find(a => a.isDefault) || addresses[0];
  const s = { from: q.from || def?.comuna || 'Providencia', to: q.to || 'Las Condes', size: q.size || 'M', service: q.service || 'estandar' };
  const book = list => list.length ? html`<select class="select select-sm" data-book aria-label="Libreta de direcciones"><option value="">Libreta de direcciones…</option>${list.map(a => raw(html`<option value="${a.id}">${a.label} · ${a.addr}, ${a.comuna}</option>`))}</select>` : '';
  return html`
  <fieldset class="card stack"><legend class="row between"><span class="step-tag">A</span> Retiro ${raw(book(addresses).replace('data-book', 'data-book="s"'))}</legend>
    <div class="grid-2"><div class="field"><label for="${prefix}-sname">Nombre o empresa *</label><input class="input" id="${prefix}-sname" name="sname" required value="${def?.name || ''}"></div>
    <div class="field"><label for="${prefix}-sphone">Teléfono *</label><input class="input" id="${prefix}-sphone" name="sphone" type="tel" required value="${def?.phone || ''}" placeholder="+56 9 1234 5678"></div></div>
    <div class="grid-2"><div class="field"><label for="${prefix}-saddr">Dirección *</label><input class="input" id="${prefix}-saddr" name="saddr" required value="${def?.addr || ''}" placeholder="Calle, número, depto"></div>
    <div class="field"><label for="${prefix}-from">Comuna *</label><select class="select" id="${prefix}-from" name="from">${raw(comunaOptions(P, s.from))}</select></div></div>
  </fieldset>
  <fieldset class="card stack"><legend class="row between"><span class="step-tag b">B</span> Entrega ${raw(book(addresses).replace('data-book', 'data-book="r"'))}</legend>
    <div class="grid-2"><div class="field"><label for="${prefix}-rname">Quién recibe *</label><input class="input" id="${prefix}-rname" name="rname" required></div>
    <div class="field"><label for="${prefix}-rphone">Teléfono *</label><input class="input" id="${prefix}-rphone" name="rphone" type="tel" required placeholder="+56 9 1234 5678"></div></div>
    <div class="grid-2"><div class="field"><label for="${prefix}-raddr">Dirección *</label><input class="input" id="${prefix}-raddr" name="raddr" required placeholder="Calle, número, depto"></div>
    <div class="field"><label for="${prefix}-to">Comuna *</label><select class="select" id="${prefix}-to" name="to">${raw(comunaOptions(P, s.to))}</select></div></div>
  </fieldset>
  <fieldset class="card stack"><legend><span class="step-tag">✦</span> Paquete y servicio</legend>
    <div class="sizes">${raw(sizeOptions(P, 'size', s.size))}</div>
    <div class="seg">${raw(serviceOptions(P, 'service', s.service))}</div>
    <div class="grid-2"><div class="field"><label for="${prefix}-notes">Notas para el repartidor</label><input class="input" id="${prefix}-notes" name="notes" placeholder="Ej: dejar en conserjería"></div>
    <div class="field"><label for="${prefix}-tip">Propina</label><select class="select" id="${prefix}-tip" name="tip"><option value="0">Sin propina</option><option value="500">$500</option><option value="1000">$1.000</option><option value="2000">$2.000</option></select></div></div>
  </fieldset>`;
}

// Conecta libretas y validaciones; devuelve lector de datos.
export function wireShipmentForm(form, addresses, onChange) {
  form.addEventListener('change', e => {
    const b = e.target.closest('[data-book]');
    if (b && b.value) {
      const a = addresses.find(x => x.id === b.value), p = b.dataset.book;
      if (a) {
        form.elements[p + 'name'].value = a.name; form.elements[p + 'phone'].value = a.phone; form.elements[p + 'addr'].value = a.addr;
        form.elements[p === 's' ? 'from' : 'to'].value = a.comuna;
      }
      b.value = '';
    }
    onChange && onChange();
  });
  form.addEventListener('input', e => { e.target.classList.remove('invalid'); onChange && onChange(); });
  return {
    read() {
      const f = form.elements;
      return {
        sender: { name: f.sname.value.trim(), phone: f.sphone.value.trim(), addr: f.saddr.value.trim(), comuna: f.from.value },
        receiver: { name: f.rname.value.trim(), phone: f.rphone.value.trim(), addr: f.raddr.value.trim(), comuna: f.to.value },
        size: f.size.value, service: f.service.value, notes: f.notes.value.trim(), tip: Number(f.tip.value) || 0
      };
    },
    validate() {
      let ok = true;
      form.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim() || (i.type === 'tel' && i.value.replace(/\D/g, '').length < 8); i.classList.toggle('invalid', bad); if (bad) ok = false; });
      if (!ok) { toast('Revisa los campos marcados', 'warning'); form.querySelector('.invalid')?.focus(); }
      return ok;
    }
  };
}

export function mountRequest(el, q = {}) {
  const u = authFor.cliente.current();
  const cust = u?.customerId ? db.get('customers', u.customerId) : null;
  const business = cust?.type === 'empresa';
  const addresses = cust ? db.query('addresses', a => a.customerId === cust.id) : [];
  const P = ops.pricing();
  el.innerHTML = html`<section class="section"><div class="container stack">
    <div class="sec-head"><span class="eyebrow">Nuevo envío</span><h1>Solicitar envío</h1><p class="muted">Completa los datos y te asignamos el repartidor más cercano al instante.${cust ? raw(html` Sesión: <b>${cust.name}</b>.`) : raw(' ¿Tienes cuenta? <a href="login.html?next=index.html%23%2Fsolicitar">Ingresa</a> para usar tu libreta de direcciones.')}</p></div>
    <form class="req-grid" id="req" novalidate>
      <div class="stack">${raw(shipmentFormHtml(P, q, { addresses }))}
        ${business ? '' : raw(`<fieldset class="card stack"><legend><span class="step-tag">$</span> Pago con tarjeta (simulado)</legend>
          <div class="grid-2"><div class="field"><label for="cc">Número de tarjeta</label><input class="input mono" id="cc" value="4242 4242 4242 4242" inputmode="numeric"></div>
          <div class="grid-2"><div class="field"><label for="cce">Vence</label><input class="input" id="cce" value="12/29"></div><div class="field"><label for="ccv">CVV</label><input class="input" id="ccv" value="123"></div></div></div>
          <small class="muted">Demo: no se realiza ningún cobro.</small></fieldset>`)}
      </div>
      <aside class="card stack req-summary"><b>Resumen</b><div data-sum></div>
        ${business ? raw(html`<div class="notice ok">🏢 <span>Se cargará a la cuenta de <b>${cust.name}</b> (factura mensual).</span></div>`) : ''}
        <button class="btn btn-primary btn-lg btn-block" type="submit">Confirmar y solicitar</button><small class="muted">Al confirmar aceptas los términos del servicio (ficticios).</small></aside>
    </form></div></section>`;
  const form = el.querySelector('#req');
  const sum = () => {
    const d = fw.read();
    const qt = ops.quoteFor(d.sender.comuna, d.receiver.comuna, d.size, d.service, { business });
    el.querySelector('[data-sum]').innerHTML = !qt ? '<p class="muted">Comunas sin cobertura</p>' : html`<dl class="kv small">
      <dt>Ruta</dt><dd>${d.sender.comuna} → ${d.receiver.comuna}</dd><dt>Distancia</dt><dd>${String(qt.km).replace('.', ',')} km</dd>
      <dt>Tamaño</dt><dd>${P.sizes[d.size].name}</dd><dt>Servicio</dt><dd>${P.services[d.service].name}</dd><dt>Retiro</dt><dd>~${qt.pickupMin} min</dd>
      ${qt.breakdown.rules.map(r => raw(html`<dt>${r.name}</dt><dd>${r.pct > 0 ? '+' : ''}${r.pct}%</dd>`))}
      ${d.tip ? raw(html`<dt>Propina</dt><dd>${money(d.tip)}</dd>`) : ''}</dl><div class="total"><span>Total</span><b>${money(qt.price + d.tip)}</b></div>`;
  };
  const fw = wireShipmentForm(form, addresses, sum);
  sum();
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!fw.validate()) return;
    const d = fw.read();
    try {
      const s = ops.createShipment({ ...d, customerId: cust?.id || null, channel: cust ? 'portal' : 'web' }, { by: u?.id || null, business });
      db.log('envío creado', `${s.code} (${s.sender.comuna} → ${s.receiver.comuna}) desde el sitio`, u?.id || null);
      ops.feed(`Nuevo envío ${s.code} desde el sitio web`, 'info', s.id);
      el.innerHTML = html`<section class="section"><div class="container narrow"><div class="card stack success-card" data-anim="bounceIn">
        <span class="big-check">✓</span><h2>¡Envío solicitado!</h2><p class="muted">Tu código de seguimiento es</p>
        <div class="code-box mono">${s.code}</div><p class="muted">Ya estamos buscando al repartidor más cercano en ${s.sender.comuna}.</p>
        <div class="row" style="justify-content:center"><a class="btn btn-primary btn-lg" href="#/rastrear/${s.code}">Seguir en vivo</a><button class="btn" data-copy>Copiar código</button><a class="btn btn-ghost" href="#/solicitar">Otro envío</a></div></div></div></section>`;
      el.querySelector('[data-copy]').onclick = () => { navigator.clipboard?.writeText(s.code).catch(() => {}); toast(`Código ${s.code} copiado`, 'success'); };
    } catch (err) { toast(err.message, 'error'); }
  });
  return {};
}
