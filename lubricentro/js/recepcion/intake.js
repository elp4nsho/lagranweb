// Ingreso de vehículo en recepción: patente, km, fotos de ingreso (placeholders), servicios y cliente.
import { escape, money, modal, toast } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { services, priceFor, lookupPlate, validPlate, createJob, upsertCustomer, customerById, plansForVehicle, dueInfo, fmtKm, serviceById, checkInJob } from '../shared/domain.js';
import { plate } from '../shared/bits.js';
import { assignBay } from '../shared/job-ui.js';

const SHOTS = ['Frontal', 'Trasera', 'Lateral izq.', 'Lateral der.', 'Tablero (km)', 'Daños previos'];

export function intakeModal(user, branchId, job = null) {
  let veh = job ? db.get('vehicles', job.vehicleId) : null, found = !!job, photos = new Set();
  const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
  f.innerHTML = `<div class="grid-2">
      <div class="field"><label for="in-p">Patente *</label><input class="input plate-input" id="in-p" name="patente" maxlength="8" placeholder="KJTR-45" value="${escape(job?.plate || '')}" ${job ? 'readonly' : ''}></div>
      <div class="field"><label for="in-k">Kilometraje del tablero *</label><input class="input" id="in-k" name="km" type="number" min="0" step="1" value="${job?.km || ''}"></div></div>
    <div class="callout small" data-veh>Ingresa la patente para buscar el vehículo.</div>
    <div class="grid-3"><div class="field"><label for="in-n">Cliente *</label><input class="input" id="in-n" name="nombre" autocomplete="off"></div><div class="field"><label for="in-t">Celular *</label><input class="input" id="in-t" name="telefono" type="tel"></div><div class="field"><label for="in-e">Correo</label><input class="input" id="in-e" name="email" type="email"></div></div>
    <fieldset class="fs"><legend>Fotos de ingreso (toca para capturar)</legend><div class="photo-row" style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr))">${SHOTS.map((s, i) => `<button type="button" class="photo" data-shot="${i}">＋<small>${s}</small></button>`).join('')}</div></fieldset>
    <fieldset class="fs" ${job ? 'hidden' : ''}><legend>Servicios</legend><div class="grid-2">${services().map(s => `<label class="check"><input type="checkbox" name="svc" value="${s.id}" ${s.id === 'aceite' ? 'checked' : ''}> ${s.icon} ${escape(s.name)} <small class="muted" data-pr="${s.id}"></small></label>`).join('')}</div></fieldset>
    <div class="field"><label for="in-o">Observaciones del cliente</label><textarea class="textarea" id="in-o" name="notas" placeholder="Ruidos, testigos, objetos de valor…"></textarea></div>`;
  const m = modal({ title: job ? `Recibir reserva ${job.code}` : 'Ingreso de vehículo', size: 'lg', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" data-go="fila">Ingresar a la fila</button><button class="btn btn-primary" data-go="bahia">Ingresar y asignar bahía</button>' });
  const g = n => f.elements[n];
  const upd = () => {
    if (!job) { const r = validPlate(g('patente').value) ? lookupPlate(g('patente').value) : null; veh = r?.vehicle || null; found = !!r?.found; }
    const box = f.querySelector('[data-veh]');
    if (!veh) { box.textContent = 'Ingresa la patente para buscar el vehículo.'; } else {
      const c = found ? customerById(veh.customerId) : null, d = found ? dueInfo(veh) : null, pps = found ? plansForVehicle(veh.id) : [];
      box.innerHTML = `${plate(veh.plate)} <b>${escape(veh.make)} ${escape(veh.model)} ${veh.year}</b> · ${found ? `cliente <b>${escape(c?.name || '—')}</b> · último km ${fmtKm(veh.km)} · <span class="badge badge-${d.tone}">${d.label}</span>${pps.length ? ' · 🎟️ con plan' : ''}` : 'vehículo nuevo (datos del registro)'}`;
      if (c && !g('nombre').value) { g('nombre').value = c.name; g('telefono').value = c.phone; g('email').value = c.email; }
    }
    f.querySelectorAll('[data-pr]').forEach(s => { s.textContent = veh ? money(priceFor(s.dataset.pr, veh)) : ''; });
  };
  if (job) { const c = customerById(job.customerId); if (c) { g('nombre').value = c.name; g('telefono').value = c.phone; g('email').value = c.email; } }
  f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
  f.addEventListener('click', e => { const s = e.target.closest('[data-shot]'); if (!s) return; const i = +s.dataset.shot; photos.has(i) ? photos.delete(i) : photos.add(i); s.classList.toggle('on', photos.has(i)); s.innerHTML = `${photos.has(i) ? '📷' : '＋'}<small>${SHOTS[i]}</small>`; });
  m.el.querySelectorAll('[data-go]').forEach(btn => btn.onclick = () => {
    const svc = [...f.querySelectorAll('[name=svc]:checked')].map(i => i.value);
    const bad = { patente: !veh, km: !(+g('km').value > 0), nombre: g('nombre').value.trim().length < 3, telefono: g('telefono').value.replace(/\D/g, '').length < 8 };
    Object.entries(bad).forEach(([k, b]) => g(k).classList.toggle('invalid', b));
    if (Object.values(bad).some(Boolean)) { toast('Completa patente, km y datos del cliente', 'warning'); return; }
    if (!job && !svc.length) { toast('Elige al menos un servicio', 'warning'); return; }
    if (veh.km && +g('km').value < veh.km) toast(`Ojo: el km es menor al último registrado (${fmtKm(veh.km)})`, 'warning');
    let id;
    if (job) {
      checkInJob(job.id, user.id, +g('km').value);
      db.update('jobs', job.id, { photos: photos.size, notes: [job.notes, g('notas').value.trim()].filter(Boolean).join(' · ') });
      id = job.id;
    } else {
      const c = (found && customerById(veh.customerId)) || upsertCustomer({ name: g('nombre').value.trim(), phone: g('telefono').value.trim(), email: g('email').value.trim() });
      id = createJob({ veh, customerId: c.id, branchId, serviceIds: svc, status: 'en-fila', source: 'walkin', km: +g('km').value, notes: g('notas').value.trim(), photos: photos.size, user: user.id }).id;
    }
    m.close();
    toast(`${db.get('jobs', id).plate} ingresado (${photos.size} fotos)`, 'success');
    if (btn.dataset.go === 'bahia') assignBay(id, user);
  });
}
export { serviceById };
