// Inscripción a recordatorios de mantención (WhatsApp / SMS / correo).
import { escape, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { settings, lookupPlate, validPlate, fmtPlate, fmtKm, oilById, customerById } from '../shared/domain.js';

export function renderReminders(el) {
  const u = auth.current(), cust = u?.role === 'cliente' ? customerById(u.customerId) : null;
  const paint = (done = null) => {
    el.innerHTML = `<section class="section page-top"><div class="container grid-2 rem-grid" style="align-items:start">
      <div class="stack" data-anim><span class="eyebrow">Recordatorios</span><h1>Te avisamos cuando le toque</h1>
        <p class="lead">Calculamos tu próxima mantención según el aceite de tu motor y tu kilometraje promedio. Elige cómo quieres que te avisemos.</p>
        <ul class="mini-list"><li>💬 WhatsApp con link directo para reservar</li><li>📱 SMS si prefieres lo simple</li><li>✉️ Correo con tu historial y boletas</li><li>🔕 Te das de baja respondiendo BAJA</li></ul>
        <div class="card stack" style="gap:6px"><span class="label">Así se ve el mensaje</span><div class="msg-bubble" data-preview></div></div>
      </div>
      ${done ? `<div class="card stack confirm"><span class="big-num">🔔</span><h2>¡Listo, ${escape(done.name.split(' ')[0])}!</h2><p>Te avisaremos por <b>${escape(done.channel)}</b> cuando a ${escape(done.plate)} le toque su mantención.</p><a class="btn btn-primary" href="#/reservar">Reservar ahora</a><button class="btn btn-ghost" data-again>Inscribir otro auto</button></div>`
      : `<form class="card stack" novalidate data-f>
        <div class="field"><label for="rm-n">Nombre *</label><input class="input" id="rm-n" name="nombre" autocomplete="name" value="${escape(cust?.name || '')}"></div>
        <div class="grid-2"><div class="field"><label for="rm-t">Celular *</label><input class="input" id="rm-t" name="telefono" type="tel" placeholder="+56 9 1234 5678" value="${escape(cust?.phone || '')}"></div>
        <div class="field"><label for="rm-e">Correo</label><input class="input" id="rm-e" name="email" type="email" value="${escape(cust?.email || '')}"></div></div>
        <div class="field"><label for="rm-p">Patente *</label><input class="input plate-input" id="rm-p" name="patente" maxlength="8" placeholder="KJTR-45"></div>
        <div class="callout small" data-veh>Ingresa la patente para calcular tu próximo cambio.</div>
        <div class="field"><label for="rm-c">Canal</label><select class="select" id="rm-c" name="canal"><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Correo</option></select></div>
        <div class="field"><label for="rm-w">Avisarme por</label><select class="select" id="rm-w" name="cada"><option value="km">Kilometraje (estimado)</option><option value="fecha">Fecha (cada 6 meses)</option></select></div>
        <label class="check"><input type="checkbox" name="acepto" checked> Acepto recibir recordatorios de ${escape(settings().name)}</label>
        <button class="btn btn-primary btn-lg">Activar recordatorio</button></form>`}
    </div></section>`;
    const f = el.querySelector('[data-f]');
    const preview = () => {
      const p = f?.elements.patente.value || 'KJTR-45', r = validPlate(p) ? lookupPlate(p) : null, v = r?.vehicle;
      el.querySelector('[data-preview]').textContent = (settings().reminderMsg || '').replace('{nombre}', (f?.elements.nombre.value || 'Javiera').split(' ')[0]).replace('{auto}', v ? `${v.make} ${v.model}` : 'auto').replace('{patente}', fmtPlate(p)).replace('{km}', v?.nextDueKm || '');
      if (f && v) f.querySelector('[data-veh]').innerHTML = `${escape(v.make)} ${escape(v.model)} ${v.year || ''} · aceite ${escape(oilById(v.oil)?.short || '')} → cambio cada <b>${fmtKm(oilById(v.oil)?.interval)}</b>${v.nextDueKm ? ` · próximo a los <b>${fmtKm(v.nextDueKm)}</b>` : ''}`;
    };
    if (f) {
      f.addEventListener('input', preview); f.addEventListener('change', preview);
      f.onsubmit = e => {
        e.preventDefault();
        const g = n => f.elements[n];
        const bad = { nombre: g('nombre').value.trim().length < 3, telefono: g('telefono').value.replace(/\D/g, '').length < 8, patente: !validPlate(g('patente').value), email: g('canal').value === 'email' && !/^\S+@\S+\.\S+$/.test(g('email').value) };
        Object.entries(bad).forEach(([k, b]) => g(k).classList.toggle('invalid', b));
        if (Object.values(bad).some(Boolean)) { toast('Revisa los campos marcados', 'warning'); return; }
        if (!g('acepto').checked) { toast('Debes aceptar recibir recordatorios', 'warning'); return; }
        const s = db.insert('signups', { name: g('nombre').value.trim(), phone: g('telefono').value.trim(), email: g('email').value.trim(), plate: fmtPlate(g('patente').value), channel: g('canal').value, every: g('cada').value });
        db.insert('messages', { campaignId: '', channel: s.channel, to: s.channel === 'email' ? s.email : s.phone, name: s.name, text: `${settings().name}: recordatorios activados para ${s.plate}. Responde BAJA para dejar de recibirlos.`, status: 'entregado', at: new Date().toISOString() });
        db.log('recordatorio', `Inscripción: ${s.name} (${s.plate}) por ${s.channel}`, u?.id || null);
        toast('Recordatorio activado', 'success');
        paint({ name: s.name, channel: { whatsapp: 'WhatsApp', sms: 'SMS', email: 'correo' }[s.channel], plate: s.plate });
      };
    } else el.querySelector('[data-again]').onclick = () => paint();
    if (el.querySelector('[data-preview]')) preview();
  };
  paint();
  return { live: false };
}
