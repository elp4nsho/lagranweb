// Flujo de donación: única o mensual, montos sugeridos, pago simulado y certificado.
import { db, auth, site, publicCampaigns, campaignStats, campaignName, upsertDonor, nextReceipt, nextChargeDate, STAFF } from '../data/db.js';
import { openReceipt, receiptFile } from '../shared/receipt.js';
import { escape, money, toast } from '../../../assets/core/ui.js';
import { api } from '../../../assets/core/db.js';

let S = null;
const IMPACT = [[3000, '1 árbol nativo plantado'], [5000, '2 kits escolares'], [10000, '1 mes de agua segura para una familia'], [25000, '10 árboles nativos'], [50000, '1 estanque familiar de 1.000 L'], [100000, 'materiales para un huerto completo']];
const impactOf = n => (IMPACT.filter(([v]) => n >= v).pop() || IMPACT[0])[1];

function fresh(q) {
  const u = auth.current();
  const donor = u && u.donorId ? db.get('donors', u.donorId) : null;
  const type = q.type === 'mensual' ? 'mensual' : 'unica';
  return { step: 1, type, amount: type === 'mensual' ? 5000 : 10000, campaignId: q.c || '', message: '', anonymous: false,
    name: donor?.name || u?.name || '', email: donor?.email || u?.email || '', phone: donor?.phone || '', region: donor?.region || '', createAccount: false, password: '', donationId: null, key: JSON.stringify(q) };
}

export default function donate(el, _p, q) {
  if (!S || S.step === 4 && S.key !== JSON.stringify(q) || (S.key !== JSON.stringify(q) && S.step === 1)) S = fresh(q);
  const s = site();
  const steps = ['Monto', 'Tus datos', 'Pago', 'Listo'];
  const camps = publicCampaigns().filter(c => c.status === 'publicada');
  const c = S.campaignId ? db.get('campaigns', S.campaignId) : null;
  const cs = c ? campaignStats(c) : null;
  const presets = S.type === 'mensual' ? s.presetsMonthly : s.presetsOnce;
  const u = auth.current();

  const side = `<aside class="card stack don-side">
    <b>Resumen</b>
    <div class="sum-line"><span>Destino</span><b>${escape(campaignName(S.campaignId))}</b></div>
    <div class="sum-line"><span>Tipo</span><b>${S.type === 'mensual' ? 'Mensual' : 'Única'}</b></div>
    <div class="sum-line total"><span>Total${S.type === 'mensual' ? ' / mes' : ''}</span><b>${money(S.amount)}</b></div>
    <p class="small muted" style="margin:0">🌱 Tu aporte equivale a: <b>${escape(impactOf(S.amount))}</b>${S.type === 'mensual' ? ' cada mes' : ''}.</p>
    ${cs ? `<div class="progress"><i style="--v:${Math.min(100, cs.pct)}%"></i></div><p class="small muted" style="margin:0">${escape(c.title)}: ${Math.round(cs.pct)}% de ${money(c.goal)}</p>` : ''}
  </aside>`;

  let body = '';
  if (S.step === 1) body = `<div class="card stack">
      <h2 style="margin:0">¿Cómo quieres ayudar?</h2>
      <div class="seg" role="radiogroup" aria-label="Tipo de donación">
        <button type="button" class="seg-btn ${S.type === 'unica' ? 'on' : ''}" data-type="unica" aria-pressed="${S.type === 'unica'}">Donación única</button>
        <button type="button" class="seg-btn ${S.type === 'mensual' ? 'on' : ''}" data-type="mensual" aria-pressed="${S.type === 'mensual'}">Mensual ♥</button></div>
      ${S.type === 'mensual' ? `<p class="small muted" style="margin:0">${escape(s.monthlyPitch)}</p>` : ''}
      <div class="presets">${presets.map(v => `<button type="button" class="preset ${S.amount === v ? 'on' : ''}" data-amt="${v}">${money(v)}</button>`).join('')}</div>
      <div class="field"><label for="d-amt">Otro monto (CLP)</label><input class="input" id="d-amt" type="number" min="1000" step="500" value="${presets.includes(S.amount) ? '' : S.amount}" placeholder="Mínimo $1.000"></div>
      <div class="field"><label for="d-camp">Destino</label><select class="select" id="d-camp"><option value="">Fondo general (donde más se necesite)</option>${camps.map(x => `<option value="${x.id}" ${x.id === S.campaignId ? 'selected' : ''}>${escape(x.title)}</option>`).join('')}</select></div>
      <div class="field"><label for="d-msg">Mensaje para el muro (opcional)</label><input class="input" id="d-msg" maxlength="80" value="${escape(S.message)}" placeholder="Ej: ¡Fuerza a las familias!"></div>
      <label class="check"><input type="checkbox" id="d-anon" ${S.anonymous ? 'checked' : ''}> Donar de forma anónima en el muro</label>
      <button class="btn btn-primary btn-lg" data-next type="button">Continuar →</button></div>`;
  if (S.step === 2) body = `<form class="card stack" id="dForm" novalidate>
      <h2 style="margin:0">Tus datos</h2>
      ${u ? `<p class="small muted" style="margin:0">Donando como <b>${escape(u.name)}</b>. La donación quedará en tu cuenta.</p>` : '<p class="small muted" style="margin:0">¿Ya tienes cuenta? <a href="cuenta.html">Inicia sesión</a> para ver tu historial.</p>'}
      <div class="grid-2">
        <div class="field"><label for="d-name">Nombre completo</label><input class="input" id="d-name" name="name" value="${escape(S.name)}" required autocomplete="name"></div>
        <div class="field"><label for="d-email">Correo</label><input class="input" id="d-email" name="email" type="email" value="${escape(S.email)}" required autocomplete="email"></div>
        <div class="field"><label for="d-phone">Teléfono</label><input class="input" id="d-phone" name="phone" value="${escape(S.phone)}" autocomplete="tel"></div>
        <div class="field"><label for="d-region">Región</label><input class="input" id="d-region" name="region" value="${escape(S.region)}"></div>
      </div>
      ${!u ? `<label class="check"><input type="checkbox" name="createAccount" ${S.createAccount ? 'checked' : ''}> Crear una cuenta para descargar certificados y ${S.type === 'mensual' ? 'administrar mi donación mensual' : 'ver mi historial'}</label>
      <div class="field" data-pass ${S.createAccount ? '' : 'hidden'}><label for="d-pass">Contraseña</label><input class="input" id="d-pass" name="password" type="password" minlength="6" autocomplete="new-password"></div>` : ''}
      <div class="row between"><button class="btn btn-ghost" type="button" data-back>← Volver</button><button class="btn btn-primary btn-lg" type="submit">Continuar al pago →</button></div></form>`;
  if (S.step === 3) body = `<form class="card stack" id="pForm" novalidate>
      <h2 style="margin:0">Pago</h2>
      <p class="demo-note">🔒 Pago simulado. Usa <b class="mono">4242 4242 4242 4242</b> (aprobado) o <b class="mono">4000 0000 0000 0002</b> (rechazado).</p>
      <div class="grid-2">
        <div class="field" style="grid-column:1/-1"><label for="p-num">Número de tarjeta</label><input class="input mono" id="p-num" name="num" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" required></div>
        <div class="field"><label for="p-exp">Vencimiento</label><input class="input mono" id="p-exp" name="exp" inputmode="numeric" maxlength="5" placeholder="MM/AA" required></div>
        <div class="field"><label for="p-cvc">CVC</label><input class="input mono" id="p-cvc" name="cvc" inputmode="numeric" maxlength="4" placeholder="123" required></div>
      </div>
      ${S.type === 'mensual' ? `<p class="small muted" style="margin:0">Cargaremos ${money(S.amount)} hoy y luego el día ${Math.min(28, new Date().getDate())} de cada mes. Puedes pausar o cancelar desde tu cuenta.</p>` : ''}
      <div class="row between"><button class="btn btn-ghost" type="button" data-back>← Volver</button><button class="btn btn-primary btn-lg" type="submit" data-pay>Donar ${money(S.amount)}${S.type === 'mensual' ? ' / mes' : ''}</button></div></form>`;
  if (S.step === 4) {
    const d = db.get('donations', S.donationId);
    body = `<div class="card stack" style="text-align:center;align-items:center">
      <div class="done-ico" aria-hidden="true">♥</div>
      <h2 style="margin:0">¡Gracias, ${escape(d.donorName.split(' ')[0])}!</h2>
      <p style="margin:0">Tu donación ${d.type === 'mensual' ? 'mensual ' : ''}de <b>${money(d.amount)}</b> para <b>${escape(campaignName(d.campaignId))}</b> fue recibida.</p>
      <p class="muted small" style="margin:0">Comprobante N° <b class="mono">${escape(d.receiptNo)}</b> enviado a ${escape(d.email)}.</p>
      <div class="row" style="justify-content:center"><button class="btn btn-primary" data-receipt>Ver certificado</button><button class="btn" data-dl>⇩ Descargar</button>${auth.current() ? '<a class="btn" href="cuenta.html">Ir a mi cuenta</a>' : ''}</div>
      <div class="row share" style="justify-content:center"><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Acabo de donar a ' + campaignName(d.campaignId) + ' 🌱 ' + location.href.split('#')[0] + (d.campaignId ? '#/campanas/' + d.campaignId : ''))}">Compartir por WhatsApp</a>${d.campaignId ? `<a class="btn btn-sm btn-ghost" href="#/campanas/${d.campaignId}">Ver la campaña</a>` : ''}<button class="btn btn-sm btn-ghost" data-again>Hacer otra donación</button></div>
    </div>`;
  }

  el.innerHTML = `<section class="section"><div class="container">
    <div class="stack" style="gap:8px;margin-bottom:20px"><span class="eyebrow">Donar</span><h1 style="margin:0">Siembra futuro hoy</h1></div>
    <ol class="steps">${steps.map((t, i) => `<li class="${i + 1 < S.step ? 'done' : ''} ${i + 1 === S.step ? 'on' : ''}">${t}</li>`).join('')}</ol>
    <div class="don-layout">${body}${S.step < 4 ? side : ''}</div></div></section>`;

  const go = n => { S.step = n; donate(el, _p, q); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  el.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.type) { S.type = t.dataset.type; S.amount = S.type === 'mensual' ? s.presetsMonthly[1] : s.presetsOnce[1]; donate(el, _p, q); }
    if (t.dataset.amt) { S.amount = +t.dataset.amt; donate(el, _p, q); }
    if (t.matches('[data-next]')) { if (!(S.amount >= 1000)) return toast('El monto mínimo es $1.000', 'warning'); go(2); }
    if (t.matches('[data-back]')) go(S.step - 1);
    if (t.matches('[data-receipt]')) openReceipt(S.donationId);
    if (t.matches('[data-dl]')) receiptFile(db.get('donations', S.donationId));
    if (t.matches('[data-again]')) { S = fresh({}); donate(el, _p, q); }
  };
  if (S.step === 1) {
    el.querySelector('#d-amt').oninput = e => { const v = Math.round(+e.target.value); if (v) { S.amount = v; el.querySelectorAll('.preset').forEach(p => p.classList.remove('on')); el.querySelector('.don-side .total b').textContent = money(v); } };
    el.querySelector('#d-amt').onchange = () => donate(el, _p, q);
    el.querySelector('#d-camp').onchange = e => { S.campaignId = e.target.value; donate(el, _p, q); };
    el.querySelector('#d-msg').oninput = e => { S.message = e.target.value; };
    el.querySelector('#d-anon').onchange = e => { S.anonymous = e.target.checked; };
  }
  if (S.step === 2) {
    const f = el.querySelector('#dForm');
    f.onchange = e => { if (e.target.name === 'createAccount') { S.createAccount = e.target.checked; f.querySelector('[data-pass]').hidden = !S.createAccount; } };
    f.onsubmit = e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      const bad = { name: !v.name.trim(), email: !/^\S+@\S+\.\S+$/.test(v.email), password: S.createAccount && String(v.password || '').length < 6 };
      Object.entries(bad).forEach(([k, b]) => f.elements[k] && f.elements[k].classList.toggle('invalid', b));
      if (Object.values(bad).includes(true)) return toast(bad.password ? 'La contraseña debe tener al menos 6 caracteres' : 'Revisa nombre y correo', 'warning');
      if (S.createAccount && db.find('users', x => x.email.toLowerCase() === v.email.trim().toLowerCase())) return toast('Ese correo ya tiene cuenta: inicia sesión en Mi cuenta', 'error');
      Object.assign(S, { name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), region: v.region.trim(), password: v.password || '' });
      go(3);
    };
  }
  if (S.step === 3) {
    const f = el.querySelector('#pForm');
    f.oninput = e => {
      const i = e.target;
      if (i.name === 'num') i.value = i.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
      if (i.name === 'exp') { let v = i.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); i.value = v; }
      if (i.name === 'cvc') i.value = i.value.replace(/\D/g, '').slice(0, 4);
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f)), digits = v.num.replace(/\D/g, '');
      const checks = { num: digits.length === 16, exp: /^(0[1-9]|1[0-2])\/\d\d$/.test(v.exp), cvc: /^\d{3,4}$/.test(v.cvc) };
      Object.entries(checks).forEach(([k, okk]) => f.elements[k].classList.toggle('invalid', !okk));
      if (Object.values(checks).includes(false)) return toast('Revisa los datos de la tarjeta', 'warning');
      const btn = f.querySelector('[data-pay]'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando…';
      try {
        await api(() => { if (digits === '4000000000000002') throw new Error('Pago rechazado por el banco (simulado). Prueba otra tarjeta.'); }, { latency: [900, 1300] });
        await complete(digits.slice(-4));
        go(4);
      } catch (err) { toast(err.message, 'error', 4500); btn.disabled = false; btn.textContent = `Donar ${money(S.amount)}`; }
    };
  }
}
donate.live = false;

async function complete(last4) {
  let u = auth.current();
  if (!u && S.createAccount) u = await auth.register({ name: S.name, email: S.email, password: S.password, role: 'donante', color: '#a8432f' });
  const donor = upsertDonor({ name: S.name, email: S.email, phone: S.phone, region: S.region });
  if (u && !STAFF.includes(u.role) && !u.donorId) db.update('users', u.id, { donorId: donor.id });
  let subId = '';
  if (S.type === 'mensual') {
    const day = Math.min(28, new Date().getDate());
    subId = db.insert('subscriptions', { donorId: donor.id, amount: S.amount, campaignId: S.campaignId, chargeDay: day, status: 'activa', card: last4, startedAt: new Date().toISOString(), endedAt: '', failed: 0, nextCharge: nextChargeDate(day) }).id;
  }
  const d = db.insert('donations', { donorId: donor.id, donorName: S.name, email: S.email, amount: S.amount, campaignId: S.campaignId, type: S.type, subscriptionId: subId, method: 'tarjeta', status: 'aprobada', anonymous: S.anonymous, message: S.message, receiptNo: nextReceipt() });
  db.log('Donación recibida', `${S.anonymous ? 'Anónimo' : S.name} · ${money(S.amount)}${S.type === 'mensual' ? ' mensual' : ''} → ${campaignName(S.campaignId)}`, u ? u.id : null);
  S.donationId = d.id;
}
