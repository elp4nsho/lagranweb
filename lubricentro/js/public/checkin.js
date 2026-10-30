// "Llegué": check-in móvil por patente. Marca la llegada de una reserva o te pone en la fila sin cita.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { branches, branchById, branchLive, waitLabel, waitTone, services, priceFor, lookupPlate, validPlate, normPlate, checkInJob, createJob, upsertCustomer, today, iso, timeHM, JOB_STATES, ACTIVE, customerById } from '../shared/domain.js';
import { plate, carArt } from '../shared/bits.js';
import { visitor } from './state.js';

let st = { branchId: '', jobId: '', walk: null };

export function renderCheckin(el, _p, query = {}) {
  if (query.b) st.branchId = query.b;
  if (!st.branchId) st.branchId = branches()[0]?.id;
  const u = auth.current(), cust = u?.role === 'cliente' ? customerById(u.customerId) : null;

  const posCard = () => {
    const j = db.get('jobs', st.jobId);
    if (!j) { st.jobId = ''; return ''; }
    const l = branchLive(j.branchId), p = l.positions[j.id];
    return `<div class="card stack center-text" style="text-align:center;align-items:center">
      ${carArt(j.segment, { cls: 'mini' })}
      <div>${plate(j.plate)} <span class="muted small">${escape(j.car)}</span></div>
      ${j.status === 'en-fila' ? `<span class="label">Tu posición en la fila</span><span class="pos-big">${p ? p.pos : '—'}</span><span class="badge badge-${waitTone(p?.wait ?? 0)}">Entras a bahía en ${p ? waitLabel(p.wait) : 'breve'}</span>`
        : `<span class="badge badge-${JOB_STATES[j.status].badge || 'primary'}" style="font-size:15px">${JOB_STATES[j.status].icon} ${JOB_STATES[j.status].label}</span>`}
      <p class="small muted" style="margin:0">Sucursal ${escape(branchById(j.branchId)?.name)} · atención ${escape(j.code)}</p>
      <a class="btn btn-primary btn-block" href="#/estado/${escape(j.code)}">Seguir mi auto en vivo</a>
      <button class="btn btn-ghost btn-sm" data-reset>Hacer check-in de otro auto</button>
    </div>`;
  };
  const walkForm = () => {
    const w = st.walk;
    return `<form class="card stack" data-walk novalidate>
      <div class="row between"><b>No tienes reserva hoy: te ponemos en la fila</b></div>
      <div class="small">${plate(w.veh.plate)} ${escape(w.veh.make)} ${escape(w.veh.model)} ${escape(w.veh.year || '')}${w.found ? '' : ' <span class="muted">(registro)</span>'}</div>
      <div class="opt-list">${services().filter(s => ['aceite', 'filtros', 'rotacion', 'alineacion', 'lavado', 'pretecnica', 'scanner', 'bateria'].includes(s.id)).map(s => `<label class="opt ${w.services.includes(s.id) ? 'on' : ''}"><input type="checkbox" name="svc" value="${s.id}" ${w.services.includes(s.id) ? 'checked' : ''}><span class="opt-ico">${s.icon}</span><span class="grow"><b>${escape(s.name)}</b><small>⏱ ${s.mins} min</small></span><b class="nowrap">${money(priceFor(s, w.veh))}</b></label>`).join('')}</div>
      ${w.found ? '' : `<div class="grid-2"><div class="field"><label for="ck-n">Nombre *</label><input class="input" id="ck-n" name="nombre" autocomplete="name" value="${escape(cust?.name || '')}"></div><div class="field"><label for="ck-t">Celular *</label><input class="input" id="ck-t" name="telefono" type="tel" value="${escape(cust?.phone || '')}"></div></div>`}
      <div class="field"><label for="ck-k">Kilometraje (tablero)</label><input class="input" id="ck-k" name="km" type="number" min="0" step="100" value="${w.veh.km || ''}"></div>
      <button class="btn btn-primary btn-lg">Ponerme en la fila de ${escape(branchById(st.branchId)?.name)}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-reset>Cancelar</button></form>`;
  };
  const paint = () => {
    const l = branchLive(st.branchId);
    el.innerHTML = `<section class="section page-top"><div class="container phone-frame stack">
      <div data-anim class="stack" style="gap:4px"><span class="eyebrow">Check-in móvil</span><h1>📍 Llegué</h1><p class="muted" style="margin:0">Ingresa tu patente al llegar a la sucursal. Sin filas en el mesón.</p></div>
      ${st.jobId ? posCard() : st.walk ? walkForm() : `<form class="card stack" data-ck novalidate>
        <div class="field"><label for="ck-b">Sucursal donde estás</label><select class="select" id="ck-b" name="sucursal">${branches().map(b => `<option value="${b.id}" ${b.id === st.branchId ? 'selected' : ''}>${escape(b.name)}</option>`).join('')}</select></div>
        <div class="row small"><span class="badge badge-${waitTone(l.wait)}">Espera ${escape(waitLabel(l.wait))}</span><span class="muted">${l.queue} en fila · ${l.inBay}/${l.bays} bahías ocupadas</span></div>
        <div class="field"><label for="ck-p">Patente</label><input class="input plate-input" id="ck-p" name="patente" placeholder="KJTR-45" maxlength="8" autocomplete="off" value="${escape(cust ? (db.find('vehicles', v => v.customerId === cust.id)?.plate || '') : '')}"></div>
        <button class="btn btn-primary btn-lg btn-block">Llegué</button>
      </form>`}
    </div></section>`;
    const ck = el.querySelector('[data-ck]');
    if (ck) {
      ck.elements.sucursal.onchange = e => { st.branchId = e.target.value; paint(); };
      ck.onsubmit = e => {
        e.preventDefault();
        const p = ck.elements.patente;
        if (!validPlate(p.value)) { p.classList.add('invalid'); toast('Escribe una patente válida', 'warning'); return; }
        const n = normPlate(p.value), T = today();
        const active = db.find('jobs', j => normPlate(j.plate) === n && ACTIVE.includes(j.status));
        if (active) { st.jobId = active.id; toast('Tu auto ya está en atención', 'info'); paint(); return; }
        const res = db.query('jobs', j => normPlate(j.plate) === n && j.status === 'reservado' && iso(j.bookedFor) === T).sort((a, b) => a.bookedFor.localeCompare(b.bookedFor))[0];
        if (res) {
          if (res.branchId !== st.branchId) db.update('jobs', res.id, { branchId: st.branchId });
          checkInJob(res.id);
          st.jobId = res.id; visitor.set({ lastCode: res.code });
          toast(`Reserva ${res.code} de las ${timeHM(res.bookedFor)}: ¡te esperábamos!`, 'success'); paint(); return;
        }
        const r = lookupPlate(p.value);
        st.walk = { veh: r.vehicle, found: r.found, services: ['aceite'] }; paint();
      };
    }
    const wf = el.querySelector('[data-walk]');
    if (wf) {
      wf.addEventListener('change', e => { if (e.target.name === 'svc') { st.walk.services = [...wf.querySelectorAll('[name=svc]:checked')].map(i => i.value); e.target.closest('.opt').classList.toggle('on', e.target.checked); } });
      wf.onsubmit = e => {
        e.preventDefault();
        const w = st.walk, f = wf.elements;
        if (!w.services.length) { toast('Elige al menos un servicio', 'warning'); return; }
        let customerId = w.veh.customerId;
        if (!w.found) {
          const bad = { nombre: (f.nombre.value || '').trim().length < 3, telefono: f.telefono.value.replace(/\D/g, '').length < 8 };
          Object.entries(bad).forEach(([k, b]) => f[k].classList.toggle('invalid', b));
          if (bad.nombre || bad.telefono) { toast('Completa nombre y celular', 'warning'); return; }
          customerId = (cust || upsertCustomer({ name: f.nombre.value.trim(), phone: f.telefono.value.trim(), email: '' })).id;
        }
        const j = createJob({ veh: w.veh, customerId, branchId: st.branchId, serviceIds: w.services, status: 'en-fila', source: 'llegue', km: +f.km.value || 0 });
        st.walk = null; st.jobId = j.id; visitor.set({ lastCode: j.code });
        toast(`Estás en la fila · atención ${j.code}`, 'success'); paint();
      };
    }
  };
  el.addEventListener('click', e => { if (e.target.closest('[data-reset]')) { st = { branchId: st.branchId, jobId: '', walk: null }; paint(); } });
  paint();
  return { refresh: () => { if (!st.walk) paint(); } };
}
