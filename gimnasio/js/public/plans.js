// Planes y precios + inscripción con pago simulado.
import { escape, money, toast, sleep } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { GOALS } from '../data/catalog.js';
import { settings, activePlans, activeBranches, plan, branch, qrSvg } from '../shared/domain.js';
import { ymd, addDays } from '../shared/dates.js';
import { validRut, fmtRut, cleanRut } from '../shared/rut.js';
import { icon } from '../shared/icons.js';

let billing = 'mensual';
export function planCard(p, bill = billing) {
  const price = bill === 'anual' ? Math.round(p.annual / 12) : p.monthly;
  return `<article class="card plan ${p.highlight ? 'featured' : ''}" data-anim>
    ${p.highlight ? '<span class="badge badge-primary ribbon">Más elegido</span>' : ''}
    <h3 class="mb0">${escape(p.name)}</h3>
    <p class="muted small mb0">${escape(p.desc)}</p>
    <div class="price">${money(price)}<small> /mes</small></div>
    ${bill === 'anual' ? `<span class="small"><b>${money(p.annual)}</b> al año · ahorras ${money(p.monthly * 12 - p.annual)}</span>` : '<span class="small muted">Sin permanencia mínima</span>'}
    <ul>${p.features.map(f => `<li>${icon('check', 16)}<span>${escape(f)}</span></li>`).join('')}${(p.missing || []).map(f => `<li class="no">${icon('x', 16)}<span>${escape(f)}</span></li>`).join('')}</ul>
    <a class="btn ${p.highlight ? 'btn-primary' : ''} btn-block" href="#/inscripcion/${p.id}?b=${bill}">Inscribirme</a>
  </article>`;
}

export function renderPlans(el) {
  const plans = activePlans(), s = settings();
  el.innerHTML = `<section class="section"><div class="container stack">
    <div class="section-head" data-anim><div><span class="eyebrow">Planes y precios</span><h1 class="mb0">Entrena a tu manera</h1><p class="muted mb0">${escape(s.promo || '')}</p></div>
      <div class="billing-toggle" role="group" aria-label="Periodo de pago"><button class="chip ${billing === 'mensual' ? 'active' : ''}" data-b="mensual">Mensual</button><button class="chip ${billing === 'anual' ? 'active' : ''}" data-b="anual">Anual (2 meses gratis)</button></div></div>
    <div class="plans">${plans.map(p => planCard(p)).join('')}</div>
    <div class="card"><h3>Comparación</h3><div class="table-wrap"><table class="table"><thead><tr><th>Incluye</th>${plans.map(p => `<th>${escape(p.name)}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Precio mensual</td>${plans.map(p => `<td><b>${money(p.monthly)}</b></td>`).join('')}</tr>
      <tr><td>Precio anual</td>${plans.map(p => `<td>${money(p.annual)}</td>`).join('')}</tr>
      <tr><td>Clases grupales por semana</td>${plans.map(p => `<td>${p.classesPerWeek >= 99 ? 'Ilimitadas' : p.classesPerWeek}</td>`).join('')}</tr>
      <tr><td>Acceso a sedes</td>${plans.map(p => `<td>${p.allBranches ? 'Todas' : '1 sede'}</td>`).join('')}</tr>
    </tbody></table></div><p class="muted small" style="margin-top:12px">Congelamiento hasta ${s.freezeMaxDays} días al año (${money(s.freezeFee)}). Precios en pesos chilenos, IVA incluido.</p></div>
  </div></section>`;
  el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { billing = b.dataset.b; renderPlans(el); });
}

let st = null;
export function renderSignup(el, { id }, query) {
  const p = plan(id);
  if (!p || p.active === false) { el.innerHTML = `<section class="section"><div class="container empty"><h1>Plan no disponible</h1><a class="btn" href="#/planes">Ver planes</a></div></section>`; return; }
  if (!st || st.planId !== id) st = { planId: id, step: 1, billing: query.b === 'anual' ? 'anual' : 'mensual', branchId: activeBranches()[0]?.id, data: {}, member: null };
  draw(el);
}
function draw(el) {
  const p = plan(st.planId), s = settings();
  const total = (st.billing === 'anual' ? p.annual : p.monthly) + (s.enrollFee || 0);
  el.innerHTML = `<section class="section"><div class="container">
    <div class="section-head"><div><span class="eyebrow">Inscripción en línea</span><h1 class="mb0">Plan ${escape(p.name)}</h1></div>${st.step > 1 && st.step < 4 ? `<button class="btn btn-ghost" data-back>${icon('back', 16)} Volver</button>` : ''}</div>
    <ol class="steps">${['Plan y sede', 'Tus datos', 'Pago', 'Listo'].map((t, i) => `<li class="${i + 1 < st.step ? 'done' : i + 1 === st.step ? 'current' : ''}">${t}</li>`).join('')}</ol>
    <div class="booking-layout"><div data-body></div>
      ${st.step < 4 ? `<aside class="card summary"><h3>Resumen</h3>
        <div class="line"><span>Plan</span><span>${escape(p.name)}</span></div>
        <div class="line"><span>Modalidad</span><span>${st.billing === 'anual' ? 'Anual' : 'Mensual'}</span></div>
        <div class="line"><span>Sede</span><span>${escape(p.allBranches ? 'Todas las sedes' : branch(st.branchId)?.name || '')}</span></div>
        <div class="line"><span>Matrícula</span><span>${s.enrollFee ? money(s.enrollFee) : '$0 (promo)'}</span></div>
        <div class="line"><span>Total hoy</span><span style="font-size:20px">${money(total)}</span></div>
        <p class="muted small mb0">${icon('shield', 14)} Pago seguro simulado. No se realizan cargos reales.</p></aside>` : '<aside></aside>'}
    </div></div></section>`;
  el.querySelector('[data-back]')?.addEventListener('click', () => { st.step--; draw(el); });
  const body = el.querySelector('[data-body]');
  if (st.step === 1) {
    body.innerHTML = `<div class="card stack">
      <h3 class="mb0">Modalidad de pago</h3>
      <div class="pick-grid">${['mensual', 'anual'].map(b => `<button class="pick ${st.billing === b ? 'sel' : ''}" data-bill="${b}"><span class="icon-bubble">${icon(b === 'anual' ? 'star' : 'calendar', 20)}</span><span><b>${b === 'anual' ? 'Anual' : 'Mensual'}</b><small>${b === 'anual' ? `${money(p.annual)} · ahorras ${money(p.monthly * 12 - p.annual)}` : `${money(p.monthly)} cada mes`}</small></span></button>`).join('')}</div>
      <h3 class="mb0">${p.allBranches ? 'Sede principal (tu plan incluye todas)' : 'Elige tu sede'}</h3>
      <div class="pick-grid">${activeBranches().map(b => `<button class="pick ${st.branchId === b.id ? 'sel' : ''}" data-br="${b.id}"><span class="icon-bubble">${icon('pin', 20)}</span><span><b>${escape(b.name)}</b><small>${escape(b.address)}</small></span></button>`).join('')}</div>
      <button class="btn btn-primary btn-lg" data-next>Continuar ${icon('arrow', 18)}</button></div>`;
    body.querySelectorAll('[data-bill]').forEach(b => b.onclick = () => { st.billing = b.dataset.bill; draw(el); });
    body.querySelectorAll('[data-br]').forEach(b => b.onclick = () => { st.branchId = b.dataset.br; draw(el); });
    body.querySelector('[data-next]').onclick = () => { st.step = 2; draw(el); };
  } else if (st.step === 2) {
    const d = st.data;
    body.innerHTML = `<form class="card stack" novalidate><h3 class="mb0">Tus datos</h3><div class="grid-2">
      <div class="field"><label for="s-name">Nombre completo *</label><input class="input" id="s-name" name="name" value="${escape(d.name || '')}" autocomplete="name"></div>
      <div class="field"><label for="s-rut">RUT *</label><input class="input" id="s-rut" name="rut" value="${escape(d.rut || '')}" placeholder="12.345.678-5"></div>
      <div class="field"><label for="s-email">Correo *</label><input class="input" id="s-email" name="email" type="email" value="${escape(d.email || '')}" autocomplete="email"></div>
      <div class="field"><label for="s-phone">Celular *</label><input class="input" id="s-phone" name="phone" value="${escape(d.phone || '')}" autocomplete="tel"></div>
      <div class="field"><label for="s-birth">Fecha de nacimiento</label><input class="input" id="s-birth" name="birth" type="date" value="${escape(d.birth || '')}"></div>
      <div class="field"><label for="s-goal">Objetivo</label><select class="select" id="s-goal" name="goal">${GOALS.map(g => `<option ${d.goal === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label for="s-pass">Contraseña para tu app (mín. 6) *</label><input class="input" id="s-pass" name="password" type="password" autocomplete="new-password"></div></div>
      <label class="check"><input type="checkbox" name="terms"> Acepto el reglamento interno y declaro estar apto/a para realizar actividad física.</label>
      <button class="btn btn-primary btn-lg">Continuar al pago ${icon('arrow', 18)}</button></form>`;
    const f = body.querySelector('form');
    f.rut.addEventListener('blur', () => { if (f.rut.value) f.rut.value = fmtRut(f.rut.value); });
    f.onsubmit = e => {
      e.preventDefault();
      const v = Object.fromEntries(['name', 'rut', 'email', 'phone', 'birth', 'goal', 'password'].map(k => [k, f[k].value.trim()]));
      const bad = [];
      if (v.name.length < 5) bad.push('name'); if (!validRut(v.rut)) bad.push('rut'); if (!/^\S+@\S+\.\S+$/.test(v.email)) bad.push('email'); if (v.phone.replace(/\D/g, '').length < 8) bad.push('phone'); if (v.password.length < 6) bad.push('password');
      ['name', 'rut', 'email', 'phone', 'password'].forEach(k => f[k].classList.toggle('invalid', bad.includes(k)));
      if (bad.length) return toast('Revisa los campos marcados', 'warning');
      if (!f.terms.checked) return toast('Debes aceptar el reglamento', 'warning');
      if (db.find('users', u => u.email.toLowerCase() === v.email.toLowerCase())) return toast('Ese correo ya tiene cuenta. Ingresa desde "Ingresar".', 'error');
      if (db.find('members', m => cleanRut(m.rut) === cleanRut(v.rut) && m.status !== 'baja')) return toast('Ese RUT ya es socio activo', 'error');
      st.data = { ...v, rut: fmtRut(v.rut) }; st.step = 3; draw(el);
    };
  } else if (st.step === 3) {
    body.innerHTML = `<form class="card stack" novalidate><h3 class="mb0">Pago con tarjeta</h3>
      <div class="field"><label for="c-num">Número de tarjeta</label><input class="input mono" id="c-num" name="num" inputmode="numeric" placeholder="4111 1111 1111 1111" autocomplete="off"><small class="muted">Prueba con 4111 1111 1111 1111 (aprobada) o 4000 0000 0000 0002 (rechazada).</small></div>
      <div class="grid-2"><div class="field"><label for="c-exp">Vencimiento</label><input class="input mono" id="c-exp" name="exp" placeholder="MM/AA" autocomplete="off"></div>
      <div class="field"><label for="c-cvv">CVV</label><input class="input mono" id="c-cvv" name="cvv" inputmode="numeric" placeholder="123" autocomplete="off"></div></div>
      <label class="check"><input type="checkbox" name="pat" checked> Activar pago automático mensual (PAT)</label>
      <button class="btn btn-primary btn-lg" data-pay>${icon('lock', 18)} Pagar ${money((st.billing === 'anual' ? plan(st.planId).annual : plan(st.planId).monthly) + (settings().enrollFee || 0))}</button></form>`;
    const f = body.querySelector('form');
    f.num.addEventListener('input', () => { f.num.value = f.num.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
    f.exp.addEventListener('input', () => { f.exp.value = f.exp.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/, '$1/'); });
    f.onsubmit = async e => {
      e.preventDefault();
      const num = f.num.value.replace(/\D/g, '');
      const luhn = n => n.split('').reverse().reduce((s, c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } return s + d; }, 0) % 10 === 0;
      if (num.length < 15 || !luhn(num)) return toast('Número de tarjeta inválido', 'warning');
      const [mm, yy] = f.exp.value.split('/').map(Number);
      if (!mm || mm > 12 || !yy || new Date(2000 + yy, mm) < new Date()) return toast('Fecha de vencimiento inválida', 'warning');
      if (!/^\d{3,4}$/.test(f.cvv.value)) return toast('CVV inválido', 'warning');
      const btn = f.querySelector('[data-pay]'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando pago…';
      await sleep(1200);
      if (num.endsWith('0002')) { btn.disabled = false; btn.textContent = 'Reintentar pago'; return toast('Pago rechazado por el banco emisor (simulado)', 'error'); }
      complete(f.pat.checked, num.slice(-4));
      draw(el);
    };
  } else {
    const m = st.member;
    body.innerHTML = `<div class="card ticket stack" data-anim="bounceIn" style="max-width:620px;margin-inline:auto">
      <div class="check-big">${icon('check', 36)}</div><h2 class="mb0">¡Bienvenido/a a ${escape(settings().name)}!</h2>
      <p class="muted mb0">Tu membresía ya está activa. Este es tu carnet digital: muéstralo en el kiosco de la sede.</p>
      <div class="member-card" style="text-align:left"><div class="mc-top"><span>${escape(settings().name)}</span><span class="badge">${escape(plan(m.planId).name)}</span></div>
        <div class="qr">${qrSvg(m.code)}</div><div class="code">${m.code}</div>
        <div class="mc-foot"><span>Socio<b>${escape(m.name)}</b></span><span>Próximo pago<b>${m.nextDue}</b></span></div></div>
      <div class="row" style="justify-content:center"><a class="btn btn-primary btn-lg" href="socio.html">${icon('user', 18)} Ir a mi app de socio</a><a class="btn" href="#/horario">Reservar una clase</a></div></div>`;
    st = null;
  }
}

function complete(pat, last4) {
  const p = plan(st.planId), d = st.data, s = settings();
  const n = db.all('members').reduce((mx, m) => Math.max(mx, +m.code.slice(3) || 0), 10000) + 1;
  const m = db.insert('members', { code: 'TF-' + n, name: d.name, rut: d.rut, email: d.email, phone: d.phone, birth: d.birth, goal: d.goal, gender: '', planId: p.id, billing: st.billing, branchId: st.branchId, status: 'activo', since: ymd(), nextDue: addDays(ymd(), st.billing === 'anual' ? 365 : 30), trainerId: '', pat, color: '#7a5cff' });
  db.insert('payments', { memberId: m.id, amount: (st.billing === 'anual' ? p.annual : p.monthly) + (s.enrollFee || 0), concept: `Inscripción · ${st.billing === 'anual' ? 'Anualidad' : 'Mensualidad'} ${p.name}`, method: `Tarjeta crédito ···${last4}`, at: new Date().toISOString(), status: 'pagado' });
  const u = db.insert('users', { name: d.name, email: d.email, password: d.password, role: 'socio', memberId: m.id, color: '#7a5cff', active: true });
  auth.loginAs(u.id);
  db.log('inscripción', `Nuevo socio ${m.name} · plan ${p.name} ${st.billing}`, u.id);
  st.member = m; st.step = 4;
  toast('¡Pago aprobado! Membresía activa', 'success');
}
