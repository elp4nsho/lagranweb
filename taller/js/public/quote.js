// Solicitud de cotización u hora: servicio, vehículo, síntomas, fotos (placeholders) y horario preferido.
import { escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { SERVICES } from '../data/catalog.js';
import { vehicleByPlate, validPlate, fmtPlate, today, addDays, customerById, dayLabel } from '../shared/domain.js';

const SHOTS = ['Daño / zona afectada', 'Vista general', 'Tablero (testigos)', 'Otra'];

export function renderQuote(el, _p, query = {}) {
  const u = auth.current(), cust = u?.role === 'cliente' ? customerById(u.customerId) : null;
  let photos = new Set(), done = null;
  const paint = () => {
    if (done) {
      el.innerHTML = `<section class="section page-top"><div class="container stack confirm"><span class="big-num">📨</span><h1>¡Solicitud recibida!</h1><div class="code-box"><span class="label">N° de solicitud</span><b>${escape(done.code)}</b></div>
        <p class="lead">Un asesor te contactará por WhatsApp ${done.kind === 'hora' ? `para confirmar tu hora del <b>${escape(dayLabel(done.date, { weekday: 'long', day: 'numeric', month: 'long' }))} a las ${escape(done.time)}</b>` : 'con una cotización preliminar'} en menos de 2 horas hábiles.</p>
        <div class="callout small" style="text-align:left">Al ingresar tu vehículo te entregaremos un <b>código de OT</b>. Con él podrás aprobar el presupuesto ítem por ítem y seguir la reparación en línea.</div>
        <div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/">Volver al inicio</a><button class="btn" data-again>Otra solicitud</button></div></div></section>`;
      el.querySelector('[data-again]').onclick = () => { done = null; photos = new Set(); paint(); };
      return;
    }
    const days = Array.from({ length: 10 }, (_, i) => addDays(today(), i + 1)).filter(d => new Date(d + 'T12:00').getDay() !== 0);
    el.innerHTML = `<section class="section page-top"><div class="container book-grid">
      <form class="card stack" novalidate data-f>
        <div><span class="eyebrow">Cotizar o agendar</span><h1 style="margin:0">Cuéntanos qué le pasa a tu auto</h1></div>
        <div class="tabs"><button type="button" class="tab active" data-kind="cotizacion">Quiero una cotización</button><button type="button" class="tab" data-kind="hora">Quiero agendar hora</button></div>
        <input type="hidden" name="kind" value="cotizacion">
        <div class="grid-2">
          <div class="field"><label for="q-s">Servicio</label><select class="select" id="q-s" name="servicio">${SERVICES.map(s => `<option value="${s.id}" ${query.s === s.id ? 'selected' : ''}>${s.icon} ${escape(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="q-p">Patente *</label><input class="input plate-input" id="q-p" name="patente" placeholder="KJTR-45" maxlength="8"></div>
          <div class="field" style="grid-column:1/-1"><label for="q-c">Marca, modelo y año *</label><input class="input" id="q-c" name="vehiculo" placeholder="Ej.: Toyota Hilux 2019"></div>
        </div>
        <div class="field"><label for="q-sy">Síntomas o descripción del daño *</label><textarea class="textarea" id="q-sy" name="sintoma" placeholder="Ej.: ruido al frenar, testigo de motor encendido, choque en parachoques trasero…"></textarea></div>
        <fieldset class="fs"><legend>Fotos (opcional, toca para adjuntar)</legend><div class="photo-row">${SHOTS.map((s, i) => `<button type="button" class="photo ${photos.has(i) ? 'on' : ''}" data-shot="${i}">${photos.has(i) ? '📷' : '＋'}<small>${s}</small></button>`).join('')}</div></fieldset>
        <div class="grid-2" data-sin hidden><div class="field"><label for="q-i">Aseguradora</label><select class="select" id="q-i" name="aseguradora">${db.all('insurers').map(i => `<option value="${i.id}">${escape(i.name)}</option>`).join('')}<option value="">Otra / no sé</option></select></div><div class="field"><label for="q-n">N° de siniestro (si lo tienes)</label><input class="input" id="q-n" name="siniestro" placeholder="SIN-2026-…"></div></div>
        <div class="grid-2" data-when hidden><div class="field"><label for="q-d">Día preferido</label><select class="select" id="q-d" name="dia">${days.map(d => `<option value="${d}">${escape(dayLabel(d, { weekday: 'long', day: 'numeric', month: 'short' }))}</option>`).join('')}</select></div><div class="field"><label for="q-h">Hora de ingreso</label><select class="select" id="q-h" name="hora">${['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '12:00', '14:30', '15:00', '16:00'].map(h => `<option>${h}</option>`).join('')}</select></div></div>
        <div class="grid-3"><div class="field"><label for="q-nm">Nombre *</label><input class="input" id="q-nm" name="nombre" autocomplete="name" value="${escape(cust?.name || '')}"></div><div class="field"><label for="q-t">Celular *</label><input class="input" id="q-t" name="telefono" type="tel" autocomplete="tel" value="${escape(cust?.phone || '')}"></div><div class="field"><label for="q-e">Correo</label><input class="input" id="q-e" name="email" type="email" autocomplete="email" value="${escape(cust?.email || '')}"></div></div>
        <button class="btn btn-primary btn-lg">Enviar solicitud</button>
      </form>
      <aside class="card stack sum-box"><b>¿Qué pasa después?</b><ol class="small" style="margin:0;padding-left:18px;display:grid;gap:6px"><li>Un asesor revisa tu caso y te contacta.</li><li>Ingresas el auto: inventario, fotos y diagnóstico.</li><li>Recibes el presupuesto con fotos y apruebas en línea.</li><li>Sigues la OT etapa por etapa hasta la entrega.</li></ol><p class="callout small">El diagnóstico computarizado se descuenta si reparas con nosotros.</p></aside>
    </div></section>`;
    const f = el.querySelector('[data-f]'), g = n => f.elements[n];
    const sync = () => { el.querySelector('[data-sin]').hidden = g('servicio').value !== 'siniestros'; el.querySelector('[data-when]').hidden = g('kind').value !== 'hora'; };
    sync();
    f.addEventListener('change', sync);
    f.addEventListener('input', e => { if (e.target.name === 'patente') { const v = validPlate(e.target.value) && vehicleByPlate(e.target.value); if (v && !g('vehiculo').value) g('vehiculo').value = `${v.make} ${v.model} ${v.year}`; } });
    f.addEventListener('click', e => {
      const k = e.target.closest('[data-kind]'); if (k) { g('kind').value = k.dataset.kind; f.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('active', b === k)); sync(); }
      const s = e.target.closest('[data-shot]'); if (s) { const i = +s.dataset.shot; photos.has(i) ? photos.delete(i) : photos.add(i); s.classList.toggle('on', photos.has(i)); s.innerHTML = `${photos.has(i) ? '📷' : '＋'}<small>${SHOTS[i]}</small>`; }
    });
    f.onsubmit = e => {
      e.preventDefault();
      const v = n => (g(n)?.value || '').trim();
      const bad = { patente: !validPlate(v('patente')), vehiculo: v('vehiculo').length < 4, sintoma: v('sintoma').length < 8, nombre: v('nombre').length < 3, telefono: v('telefono').replace(/\D/g, '').length < 8 };
      Object.entries(bad).forEach(([k, b]) => g(k).classList.toggle('invalid', b));
      if (Object.values(bad).some(Boolean)) { toast('Revisa los campos marcados', 'warning'); return; }
      const n = 880 + db.count('requests') + 1;
      done = db.insert('requests', { code: 'SOL-' + n, kind: v('kind'), service: v('servicio'), name: v('nombre'), phone: v('telefono'), email: v('email'), plate: fmtPlate(v('patente')), car: v('vehiculo'), symptom: v('sintoma'), photos: photos.size, date: v('kind') === 'hora' ? v('dia') : '', time: v('kind') === 'hora' ? v('hora') : '', insurerId: v('servicio') === 'siniestros' ? v('aseguradora') : '', claimNo: v('siniestro'), status: 'nueva' });
      db.log('solicitud', `${done.code} · ${done.name} (${done.plate}) · ${done.kind === 'hora' ? 'pide hora' : 'pide cotización'}`, u?.id || null);
      toast('Solicitud enviada', 'success'); paint(); window.scrollTo(0, 0);
    };
  };
  paint();
  return { live: false };
}
