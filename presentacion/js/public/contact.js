// Contacto y cotizador por pasos con estimación de presupuesto.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, settings, estimate } from '../data/db.js';
import { sectionHead } from './layout.js';
import { validate, readForm } from '../shared/admin-kit.js';

export function renderContact(el) {
  const s = settings();
  const services = db.query('services', x => x.active).sort((a, b) => a.order - b.order);
  el.innerHTML = `<section class="section page-top"><div class="container contact-layout">
    <div class="stack" data-anim>
      <span class="eyebrow">Contacto</span><h1>${escape(db.getValue('home').cta?.title || 'Hablemos')}</h1>
      <p class="lead">${escape(db.getValue('home').cta?.text || '')}</p>
      <ul class="contact-list">
        <li><span aria-hidden="true">✉</span> ${escape(s.email)}</li><li><span aria-hidden="true">☎</span> ${escape(s.phone)}</li>
        <li><span aria-hidden="true">⌂</span> ${escape(s.address)}</li><li><span aria-hidden="true">◷</span> ${escape(s.hours)}</li>
      </ul>
      <div class="card quote-promo"><h3>¿Quieres un número rápido?</h3><p class="muted small">Usa nuestro cotizador y obtén un rango de presupuesto en dos minutos.</p><a class="btn btn-primary" href="#/cotizar">Abrir cotizador →</a></div>
    </div>
    <div class="card contact-card">
      <form class="stack" data-contact novalidate>
        <div class="grid-2"><div class="field"><label for="ct-name">Nombre *</label><input class="input" id="ct-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="ct-email">Correo *</label><input class="input" id="ct-email" name="email" type="email" required autocomplete="email"></div></div>
        <div class="grid-2"><div class="field"><label for="ct-company">Empresa</label><input class="input" id="ct-company" name="company"></div>
        <div class="field"><label for="ct-phone">Teléfono</label><input class="input" id="ct-phone" name="phone" type="tel"></div></div>
        <div class="field"><label for="ct-svc">Tipo de proyecto *</label><select class="select" id="ct-svc" name="service" required><option value="">Selecciona una opción</option>${services.map(x => `<option>${escape(x.title)}</option>`).join('')}<option>Otro / no estoy seguro</option></select></div>
        <fieldset class="field budget"><legend class="label">Presupuesto aproximado</legend><div class="row" style="gap:8px">${['< $5M', '$5M – $15M', '> $15M'].map((b, i) => `<label class="chip"><input type="radio" name="budget" value="${b}" ${i ? '' : 'checked'}> ${b}</label>`).join('')}</div></fieldset>
        <div class="field"><label for="ct-msg">Mensaje *</label><textarea class="textarea" id="ct-msg" name="message" required rows="5" placeholder="Cuéntanos sobre tu proyecto, plazos y objetivos"></textarea></div>
        <label class="check"><input type="checkbox" name="ok" required> Acepto que me contacten sobre este proyecto.</label>
        <button class="btn btn-primary btn-lg">Enviar mensaje →</button>
      </form>
    </div>
  </div></section>`;
  const form = el.querySelector('[data-contact]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(form)) return;
    const v = readForm(form);
    db.insert('leads', { type: 'contacto', name: v.name, email: v.email, phone: v.phone, company: v.company, services: [v.service], budget: v.budget, message: v.message, status: 'nuevo', owner: null, source: 'Sitio web', estimate: 0, value: 0, notes: [] });
    db.log('lead', `Nuevo contacto de ${v.name}${v.company ? ' (' + v.company + ')' : ''}`);
    form.closest('.contact-card').innerHTML = `<div class="empty success-box"><span class="icon">✓</span><h2>¡Mensaje enviado!</h2><p>Gracias, ${escape(v.name.split(' ')[0])}. Te escribiremos a <b>${escape(v.email)}</b> en menos de 48 horas hábiles.</p><a class="btn" href="#/trabajos">Mientras, mira nuestros trabajos</a></div>`;
    toast('Mensaje enviado. ¡Gracias!', 'success');
  });
}

const STEPS = ['Servicios', 'Alcance', 'Plazos', 'Tus datos', 'Resumen'];

export function renderQuote(el) {
  const p = settings().pricing || {};
  const services = db.query('services', x => x.active).sort((a, b) => a.order - b.order);
  const st = { step: 0, services: [], size: 'm', extras: [], rush: false, timeline: '2–3 meses', data: {} };

  el.innerHTML = `<section class="section page-top"><div class="container">
    ${sectionHead('Cotizador', 'Calcula tu presupuesto en 2 minutos', 'Una estimación referencial; luego afinamos juntos con una propuesta formal.')}
    <div class="wizard">
      <div class="card wizard-main">
        <ol class="steps" aria-label="Pasos">${STEPS.map((s, i) => `<li data-si="${i}"><span>${i + 1}</span><b>${s}</b></li>`).join('')}</ol>
        <div class="progress" style="margin:8px 0 20px"><i data-prog></i></div>
        <div data-body></div>
        <div class="row between wizard-foot"><button class="btn" data-back>← Atrás</button><button class="btn btn-primary" data-next>Siguiente →</button></div>
      </div>
      <aside class="card estimate-box" aria-live="polite"><span class="eyebrow">Estimación</span><div data-est></div></aside>
    </div>
  </div></section>`;
  const body = el.querySelector('[data-body]'), est = el.querySelector('[data-est]');

  function drawEstimate() {
    const e = estimate(st);
    est.innerHTML = st.services.length ? `<div class="big-num">${money(e.min)}</div><p class="muted small">a ${money(e.max)} + IVA</p>
      <ul class="est-lines">${st.services.map(id => { const s = db.get('services', id); return `<li><span>${escape(s.title)}</span><span>${money(s.basePrice * (p.sizes?.[st.size]?.mult || 1))}</span></li>`; }).join('')}
      ${st.extras.map(id => { const x = (p.extras || []).find(z => z.id === id); return x ? `<li><span>${escape(x.label)}</span><span>${money(x.price)}</span></li>` : ''; }).join('')}
      ${st.rush ? `<li><span>Urgencia (+${Math.round((p.rush || 0) * 100)}%)</span><span>${money(e.total - e.subtotal)}</span></li>` : ''}</ul>
      <p class="small muted">Alcance: ${escape(p.sizes?.[st.size]?.label || '')}</p>` : `<p class="muted">Elige al menos un servicio para ver tu estimación.</p>`;
  }

  function draw() {
    el.querySelectorAll('[data-si]').forEach(li => { const i = +li.dataset.si; li.classList.toggle('done', i < st.step); li.classList.toggle('current', i === st.step); });
    el.querySelector('[data-prog]').style.setProperty('--v', `${(st.step / (STEPS.length - 1)) * 100}%`);
    el.querySelector('[data-back]').disabled = st.step === 0;
    const next = el.querySelector('[data-next]');
    next.textContent = st.step === STEPS.length - 1 ? 'Enviar solicitud ✓' : 'Siguiente →';
    if (st.step === 0) body.innerHTML = `<h3>¿Qué necesitas?</h3><p class="muted small">Puedes elegir varios.</p>
      <div class="grid-2 pick-grid">${services.map(s => `<label class="pick card ${st.services.includes(s.id) ? 'on' : ''}"><input type="checkbox" value="${s.id}" ${st.services.includes(s.id) ? 'checked' : ''} data-svc><span class="service-ico">${escape(s.icon)}</span><span><b>${escape(s.title)}</b><small class="muted">Desde ${money(s.basePrice)}</small></span></label>`).join('')}</div>`;
    if (st.step === 1) body.innerHTML = `<h3>¿De qué tamaño es el proyecto?</h3>
      <div class="grid-3 pick-grid">${Object.entries(p.sizes || {}).map(([k, v]) => `<label class="pick card ${st.size === k ? 'on' : ''}"><input type="radio" name="size" value="${k}" ${st.size === k ? 'checked' : ''} data-size><span><b>${escape(v.label)}</b><small class="muted">${{ s: 'Una pieza o sitio simple; equipo reducido.', m: 'Sistema completo con varias aplicaciones.', l: 'Multimarca, varios mercados o producto complejo.' }[k] || ''} ×${v.mult}</small></span></label>`).join('')}</div>
      <h3 style="margin-top:24px">Extras</h3><div class="stack" style="gap:8px">${(p.extras || []).map(x => `<label class="check"><input type="checkbox" value="${x.id}" ${st.extras.includes(x.id) ? 'checked' : ''} data-extra> ${escape(x.label)} <span class="muted small">(+${money(x.price)})</span></label>`).join('')}</div>`;
    if (st.step === 2) body.innerHTML = `<h3>¿Para cuándo lo necesitas?</h3>
      <div class="grid-3 pick-grid">${['1 mes', '2–3 meses', 'Sin apuro'].map(t => `<label class="pick card ${st.timeline === t ? 'on' : ''}"><input type="radio" name="timeline" value="${t}" ${st.timeline === t ? 'checked' : ''} data-time><span><b>${t}</b></span></label>`).join('')}</div>
      <label class="row switch-row" style="gap:10px;margin-top:20px"><span class="switch"><input type="checkbox" data-rush ${st.rush ? 'checked' : ''}><span></span></span> Es urgente (equipo dedicado, +${Math.round((p.rush || 0) * 100)}%)</label>`;
    if (st.step === 3) body.innerHTML = `<h3>¿A quién le enviamos la propuesta?</h3><form class="stack" data-form novalidate>
      <div class="grid-2"><div class="field"><label for="q-name">Nombre *</label><input class="input" id="q-name" name="name" required value="${escape(st.data.name || '')}"></div>
      <div class="field"><label for="q-email">Correo *</label><input class="input" id="q-email" name="email" type="email" required value="${escape(st.data.email || '')}"></div></div>
      <div class="grid-2"><div class="field"><label for="q-company">Empresa *</label><input class="input" id="q-company" name="company" required value="${escape(st.data.company || '')}"></div>
      <div class="field"><label for="q-phone">Teléfono</label><input class="input" id="q-phone" name="phone" type="tel" value="${escape(st.data.phone || '')}"></div></div>
      <div class="field"><label for="q-msg">Algo más que debamos saber</label><textarea class="textarea" id="q-msg" name="message" rows="3">${escape(st.data.message || '')}</textarea></div></form>`;
    if (st.step === 4) {
      const e = estimate(st);
      body.innerHTML = `<h3>Revisa tu solicitud</h3><dl class="summary">
        <div><dt>Servicios</dt><dd>${st.services.map(id => escape(db.get('services', id).title)).join(', ')}</dd></div>
        <div><dt>Alcance</dt><dd>${escape(p.sizes?.[st.size]?.label)}${st.extras.length ? ' + ' + st.extras.length + ' extra(s)' : ''}</dd></div>
        <div><dt>Plazo</dt><dd>${escape(st.timeline)}${st.rush ? ' · urgente' : ''}</dd></div>
        <div><dt>Contacto</dt><dd>${escape(st.data.name)} · ${escape(st.data.email)} · ${escape(st.data.company)}</dd></div>
        <div><dt>Rango estimado</dt><dd><b>${money(e.min)} – ${money(e.max)}</b> + IVA</dd></div></dl>`;
    }
    drawEstimate();
  }

  body.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-svc]')) st.services = [...body.querySelectorAll('[data-svc]:checked')].map(x => x.value);
    if (t.matches('[data-size]')) st.size = t.value;
    if (t.matches('[data-extra]')) st.extras = [...body.querySelectorAll('[data-extra]:checked')].map(x => x.value);
    if (t.matches('[data-time]')) st.timeline = t.value;
    if (t.matches('[data-rush]')) st.rush = t.checked;
    body.querySelectorAll('.pick').forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
    drawEstimate();
  });
  el.querySelector('[data-back]').onclick = () => { if (st.step === 3) st.data = readForm(body.querySelector('[data-form]')); st.step--; draw(); };
  el.querySelector('[data-next]').onclick = () => {
    if (st.step === 0 && !st.services.length) return toast('Elige al menos un servicio', 'warning');
    if (st.step === 3) { const f = body.querySelector('[data-form]'); if (!validate(f)) return; st.data = readForm(f); }
    if (st.step === STEPS.length - 1) return submit();
    st.step++; draw();
    el.querySelector('.wizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  function submit() {
    const e = estimate(st);
    const lead = db.insert('leads', { type: 'cotizacion', ...st.data, services: st.services.map(id => db.get('services', id).title), size: st.size, extras: st.extras, rush: st.rush, timeline: st.timeline, estimate: Math.round(e.total), value: Math.round(e.total), status: 'nuevo', owner: null, source: 'Cotizador web', notes: [] });
    db.log('cotización', `Cotización de ${st.data.name} (${st.data.company}) por ${money(e.total)}`);
    el.querySelector('.wizard').innerHTML = `<div class="card empty success-box" style="grid-column:1/-1"><span class="icon">✓</span><h2>¡Solicitud enviada!</h2>
      <p>Folio <b>#${escape(lead.id.slice(-6).toUpperCase())}</b>. Tu rango estimado es <b>${money(e.min)} – ${money(e.max)}</b> + IVA.</p>
      <p class="muted">Un/a ejecutivo/a te contactará en menos de 48 horas hábiles para afinar la propuesta.</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/trabajos">Ver trabajos</a><a class="btn" href="#/">Volver al inicio</a></div></div>`;
    toast('Cotización enviada', 'success');
  }
  draw();
}
