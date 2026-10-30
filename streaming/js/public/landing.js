// Landing pública: hero editable, mosaico del catálogo, planes (desde el CMS), FAQ y alta con pago simulado.
import { db, auth, settings, HOME_BY_ROLE } from '../data/db.js';
import { html, raw, $, money, toast, modal, sleep, escape } from '../../../assets/core/ui.js';
import { artCard } from '../shared/art.js';
import { isAvailable } from '../shared/catalog.js';

const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return n.length >= 13 && s % 10 === 0; };

function render() {
  const s = settings(), u = auth.current();
  const plans = db.query('plans', p => p.active).sort((a, b) => a.price - b.price);
  const cat = db.query('titles', isAvailable);
  const top = cat.slice().sort((a, b) => b.trending - a.trending).slice(0, 10);
  $('#header').innerHTML = `<div class="container"><div class="bar"><a class="logo-word" href="index.html">Andes<b>+</b></a>
    <div class="st-actions">${u ? `<a class="btn btn-primary btn-sm" href="${HOME_BY_ROLE[u.role]}">${u.role === 'suscriptor' ? 'Ir a Andes+' : 'Ir al CMS'}</a>` : '<a class="btn btn-ghost btn-sm" href="#planes">Planes</a><a class="btn btn-primary btn-sm" href="login.html">Ingresar</a>'}</div></div></div>`;
  $('#main').innerHTML = html`
  <section class="land-hero">
    <div class="mosaic" aria-hidden="true">${raw(cat.concat(cat).slice(0, 30).map(t => artCard(t)).join(''))}</div>
    <div class="scrim"></div>
    <div class="content" data-anim>
      <span class="eyebrow">Prueba gratis ${s.trialDays} días</span>
      <h1 id="heroTitle">${s.heroTitle}</h1>
      <p class="lead">${s.heroSubtitle}</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primary btn-lg" href="#planes">Ver planes desde ${money(plans[0]?.price)}</a>${u ? '' : raw('<a class="btn btn-lg" href="login.html">Ya tengo cuenta</a>')}</div>
    </div>
  </section>
  <section class="section"><div class="container stack">
    <h2 data-anim>Top 10 de esta semana</h2>
    <div class="row-scroll">${top.map((t, i) => raw(html`<div class="tile"><div style="position:relative">${raw(artCard(t))}</div><span class="sub"><b>#${i + 1}</b> · ${t.genres[0]} · ${t.type === 'serie' ? 'Serie' : 'Película'}</span></div>`))}</div>
  </div></section>
  <section class="section" style="padding-top:0"><div class="container grid-3">
    <div class="card" data-anim><h3>📺 En todas tus pantallas</h3><p class="muted">Smart TV, celular, tablet, computador y consolas. Retoma donde quedaste en cualquier dispositivo.</p></div>
    <div class="card" data-anim data-anim-delay="100"><h3>👨‍👩‍👧 Perfiles para todos</h3><p class="muted">Hasta 5 perfiles por cuenta, perfil infantil y control parental con PIN.</p></div>
    <div class="card" data-anim data-anim-delay="200"><h3>🏔️ Originales del sur</h3><p class="muted">${cat.filter(t => t.original).length} producciones originales filmadas en Chile y la Patagonia.</p></div>
  </div></section>
  <section class="section" id="planes" style="padding-top:0"><div class="container stack">
    <div style="text-align:center"><span class="eyebrow">Planes</span><h2>Elige tu plan</h2><p class="muted">Sin contratos. Cambia o cancela cuando quieras.</p></div>
    <div class="plans">${plans.map(p => raw(html`<div class="card plan ${p.highlight ? 'hl' : ''}" data-anim>${p.highlight ? raw('<span class="badge badge-primary ribbon">Más elegido</span>') : ''}
      <h3 style="margin:0">${p.name}</h3><div class="price">${money(p.price)}<small class="muted" style="font-size:14px"> /mes</small></div><span class="muted">${p.quality}</span>
      <ul>${p.features.map(f => raw(`<li>${escape(f)}</li>`))}</ul>
      <button class="btn ${p.highlight ? 'btn-primary' : ''} btn-lg btn-block" data-plan="${p.id}">Elegir ${p.name}</button></div>`))}</div>
  </div></section>
  <section class="section faq" style="padding-top:0"><div class="container" style="max-width:820px">
    <h2>Preguntas frecuentes</h2>
    <details><summary>¿Qué es Andes+?</summary><p>Una plataforma de streaming (ficticia) con series, películas y documentales, con foco en historias del sur del mundo.</p></details>
    <details><summary>¿Cuánto cuesta?</summary><p>Desde ${money(plans[0]?.price)} al mes. Los primeros ${s.trialDays} días son gratis y puedes cancelar antes sin costo.</p></details>
    <details><summary>¿Puedo cancelar cuando quiera?</summary><p>Sí, desde Cuenta → Plan. Seguirás viendo hasta el fin del período pagado.</p></details>
    <details><summary>¿Hay contenido para niños?</summary><p>Sí. El perfil infantil solo muestra títulos aptos (TE y 7+), y puedes proteger perfiles con PIN.</p></details>
  </div></section>`;
  $('#footer').innerHTML = `<div class="container row between"><span class="logo-word">Andes<b>+</b></span><span>${escape(s.footerNote)}</span><span><a href="login.html">Ingresar</a> · <a href="admin.html">CMS</a></span></div>`;
  $('#main').querySelectorAll('[data-plan]').forEach(b => b.onclick = () => signup(b.dataset.plan));
}

function signup(planId) {
  const plans = db.query('plans', p => p.active).sort((a, b) => a.price - b.price);
  const st = { step: 1, plan: planId, name: '', email: '', password: '' };
  const m = modal({ title: 'Suscríbete a Andes+', body: '<div id="su"></div>' });
  const box = m.el.querySelector('#su');
  const draw = () => {
    const plan = db.get('plans', st.plan);
    box.innerHTML = `<div class="stack"><div class="steps"><span class="${st.step === 1 ? 'on' : ''}">1. Plan</span><span class="${st.step === 2 ? 'on' : ''}">2. Cuenta</span><span class="${st.step === 3 ? 'on' : ''}">3. Pago</span></div>
      ${st.step === 1 ? `<div class="plan-pick">${plans.map(p => `<label><span><input type="radio" name="pl" value="${p.id}" ${p.id === st.plan ? 'checked' : ''}> <b>${escape(p.name)}</b> · ${escape(p.quality)} · ${p.screens} pantalla(s)</span><b>${money(p.price)}</b></label>`).join('')}</div><button class="btn btn-primary btn-lg" id="n1">Continuar</button>` : ''}
      ${st.step === 2 ? `<form class="stack" id="f2" novalidate><div class="field"><label for="su-n">Nombre</label><input class="input" id="su-n" value="${escape(st.name)}" required></div><div class="field"><label for="su-e">Correo</label><input class="input" id="su-e" type="email" value="${escape(st.email)}" required></div><div class="field"><label for="su-p">Contraseña (mín. 6)</label><input class="input" id="su-p" type="password" required></div><div class="row between"><button type="button" class="btn btn-ghost" id="b2">← Atrás</button><button class="btn btn-primary">Continuar</button></div></form>` : ''}
      ${st.step === 3 ? `<form class="stack" id="f3" novalidate><div class="card" style="padding:12px"><b>${escape(plan.name)}</b> · ${money(plan.price)}/mes<br><small class="muted">Hoy pagas $0 · primer cobro en ${settings().trialDays} días</small></div>
        <div class="field"><label for="su-c">Número de tarjeta</label><input class="input mono" id="su-c" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19"></div>
        <div class="grid-2" style="gap:10px"><div class="field"><label for="su-x">Vence (MM/AA)</label><input class="input mono" id="su-x" placeholder="12/29" maxlength="5"></div><div class="field"><label for="su-v">CVV</label><input class="input mono" id="su-v" placeholder="123" maxlength="4"></div></div>
        <small class="muted">Demo: usa 4242 4242 4242 4242.</small><div class="row between"><button type="button" class="btn btn-ghost" id="b3">← Atrás</button><button class="btn btn-primary" id="pay">Comenzar prueba gratis</button></div></form>` : ''}</div>`;
    box.querySelector('#n1')?.addEventListener('click', () => { st.plan = box.querySelector('input[name=pl]:checked').value; st.step = 2; draw(); });
    box.querySelector('#b2')?.addEventListener('click', () => { st.step = 1; draw(); });
    box.querySelector('#b3')?.addEventListener('click', () => { st.step = 2; draw(); });
    box.querySelector('#f2')?.addEventListener('submit', e => {
      e.preventDefault();
      st.name = box.querySelector('#su-n').value.trim(); st.email = box.querySelector('#su-e').value.trim(); st.password = box.querySelector('#su-p').value;
      if (!st.name || !/^\S+@\S+\.\S+$/.test(st.email) || st.password.length < 6) return toast('Completa nombre, correo válido y contraseña de 6+ caracteres', 'warning');
      if (db.find('users', x => x.email.toLowerCase() === st.email.toLowerCase())) return toast('Ese correo ya tiene cuenta. Inicia sesión.', 'error');
      st.step = 3; draw();
    });
    const cc = box.querySelector('#su-c');
    cc?.addEventListener('input', () => { cc.value = cc.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); });
    box.querySelector('#su-x')?.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2'); });
    box.querySelector('#f3')?.addEventListener('submit', async e => {
      e.preventDefault();
      const n = cc.value.replace(/\s/g, '');
      if (!luhn(n) || !/^\d{2}\/\d{2}$/.test(box.querySelector('#su-x').value) || !/^\d{3,4}$/.test(box.querySelector('#su-v').value)) return toast('Revisa los datos de la tarjeta', 'warning');
      const btn = box.querySelector('#pay'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando…';
      await sleep(900);
      const user = db.insert('users', { name: st.name, email: st.email, password: st.password, role: 'suscriptor', color: '#2563eb', active: true, plan: st.plan, subStatus: 'prueba', joinedAt: new Date().toISOString(), cancelledAt: null, card: { brand: n.startsWith('5') ? 'Mastercard' : 'Visa', last4: n.slice(-4) }, devices: [{ id: 'd' + Date.now(), name: 'Navegador web', type: 'Computador', lastSeen: new Date().toISOString() }] });
      db.insert('profiles', { userId: user.id, name: st.name.split(' ')[0], color: '#2563eb', avatar: '🦊', kids: false, pin: '', myList: [] });
      db.insert('profiles', { userId: user.id, name: 'Niños', color: '#16a34a', avatar: '🐧', kids: true, pin: '', myList: [] });
      db.log('alta', `Nuevo suscriptor: ${st.name} (${db.get('plans', st.plan).name})`, user.id);
      auth.loginAs(user.id);
      toast('¡Bienvenido/a a Andes+!', 'success');
      m.close(); setTimeout(() => (location.href = 'perfiles.html'), 400);
    });
  };
  draw();
}

db.subscribe(render);
render();
