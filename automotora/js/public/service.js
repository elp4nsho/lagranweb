// Posventa: agendar mantención por pauta, consulta de recall, garantía, repuestos y carrocería.
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { brand, model, showrooms, showroom, plansFor, nextPlan, recallsFor, warrantyFor, settings, APPT_TYPES, userName, workshopLoad } from '../shared/domain.js';
import { carSVG, panelsSVG, PANELS } from '../shared/car.js';
import { pageHero } from './cards.js';
import { ymd, addDays, parseYmd, DOW, patenteClean, patenteValid, patenteFormat, uiGet, uiSet, nf, rutValid } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const TABS = [['', 'Agendar servicio', 'calendar'], ['recall', 'Recall', 'alert'], ['garantia', 'Garantía', 'shield'], ['repuestos', 'Repuestos y accesorios', 'box'], ['carroceria', 'Desabolladura y pintura', 'spray']];
const findVehicle = q => { const c = patenteClean(q); return c ? db.find('vehicles', v => patenteClean(v.patente) === c || String(v.vin).toUpperCase() === c) : null; };

export function renderService(el, { tab = '' } = {}) {
  el.innerHTML = `${pageHero('Posventa', 'Servicio técnico autorizado', 'Mantenciones con precio fijo por pauta de marca, campañas de seguridad, garantía, repuestos originales y desabolladura.', 'wrench')}
  <section class="section tight"><div class="container stack">
    <nav class="tabs service-tabs" aria-label="Servicios">${TABS.map(([k, l, i]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/posventa${k ? '/' + k : ''}">${icon(i, 16)} ${l}</a>`).join('')}</nav>
    <div data-tab></div></div></section>`;
  const box = el.querySelector('[data-tab]');
  ({ '': schedule, recall, garantia: warranty, repuestos: parts, carroceria: body }[tab] || schedule)(box);
}

// ---------- Agendar ----------
function schedule(box) {
  const u = auth.current();
  const mine = u?.role === 'cliente' ? db.query('vehicles', v => v.ownerId === u.id) : [];
  const brands = db.query('brands', b => b.active !== false);
  const s = { vehicleId: mine[0]?.id || null, brandId: mine[0]?.brandId || 'toyota', modelId: mine[0]?.modelId || '', year: mine[0]?.year || 2023, km: mine[0]?.km || 20000, patente: mine[0]?.patente || '', type: 'mantencion', showroomId: null, date: null, slot: null };
  box.innerHTML = `<div class="booking-layout">
    <form class="stack" novalidate data-form>
      ${mine.length ? `<div class="card stack"><h3>${icon('car', 18)} Tus autos</h3><div class="pick-grid">${mine.map(v => `<button type="button" class="pick ${v.id === s.vehicleId ? 'sel' : ''}" data-veh="${v.id}"><span class="pick-car">${carSVG({ body: model(v.modelId)?.body, paint: v.hex })}</span><span><b>${escape(v.modelName)} ${v.year}</b><small class="mono">${patenteFormat(v.patente)} · ${nf(v.km)} km</small></span></button>`).join('')}<button type="button" class="pick" data-veh="">${icon('plus', 20)}<span><b>Otro vehículo</b></span></button></div></div>` : ''}
      <div class="card stack" data-vehform><h3>${icon('car', 18)} Vehículo</h3>
        <div class="grid-2">
          <div class="field"><label for="s-pat">Patente</label><input class="input mono" id="s-pat" name="patente" value="${escape(s.patente)}" placeholder="Ej: KJTR45" maxlength="8"><small class="muted" data-found></small></div>
          <div class="field"><label for="s-brand">Marca</label><select class="select" id="s-brand" name="brandId">${brands.map(b => `<option value="${b.id}">${escape(b.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="s-model">Modelo</label><select class="select" id="s-model" name="modelId"></select></div>
          <div class="field"><label for="s-year">Año</label><input class="input" id="s-year" name="year" type="number" min="2005" max="2027" value="${s.year}"></div>
          <div class="field"><label for="s-km">Kilometraje actual</label><input class="input" id="s-km" name="km" type="number" min="0" step="500" value="${s.km}"></div>
          <div class="field"><label for="s-type">Tipo de servicio</label><select class="select" id="s-type" name="type">${Object.entries(APPT_TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
        </div></div>
      <div class="card stack" data-plan></div>
      <div class="card stack"><h3>${icon('store', 18)} Taller y horario</h3><div class="pick-grid" data-shows></div><div class="days-strip" data-days></div><div class="slots" data-slots></div></div>
      <div class="card stack"><h3>${icon('user', 18)} Contacto</h3><div class="grid-2">
        <div class="field"><label for="s-name">Nombre</label><input class="input" id="s-name" name="name" value="${escape(u?.role === 'cliente' ? u.name : '')}" required></div>
        <div class="field"><label for="s-phone">Teléfono</label><input class="input" id="s-phone" name="phone" type="tel" value="${escape(u?.role === 'cliente' ? u.phone || '' : '')}" required></div>
        <div class="field"><label for="s-email">Correo</label><input class="input" id="s-email" name="email" type="email" value="${escape(u?.role === 'cliente' ? u.email : '')}" required></div>
        <div class="field"><label for="s-notes">¿Algo que debamos revisar?</label><input class="input" id="s-notes" name="notes" placeholder="Ej: ruido al frenar"></div></div>
        <button class="btn btn-primary btn-lg">${icon('check', 18)} Confirmar hora de taller</button></div>
    </form>
    <aside class="card summary" data-sum></aside></div>`;
  const f = box.querySelector('[data-form]');
  const fillModels = () => { const ms = db.query('models', m => m.brandId === s.brandId && m.status !== 'lanzamiento'); f.modelId.innerHTML = ms.map(m => `<option value="${m.id}" ${m.id === s.modelId ? 'selected' : ''}>${escape(m.name)}</option>`).join('') + '<option value="otro">Otro modelo</option>'; if (!ms.find(m => m.id === s.modelId)) s.modelId = ms[0]?.id || 'otro'; };
  const syncForm = () => { f.brandId.value = s.brandId; fillModels(); f.modelId.value = s.modelId; f.year.value = s.year; f.km.value = s.km; f.patente.value = s.patente; f.type.value = s.type; };
  function draw() {
    const plan = s.type === 'mantencion' ? nextPlan(s.brandId, Math.max(0, s.km - 1500)) : null, all = plansFor(s.brandId), b = brand(s.brandId);
    box.querySelector('[data-plan]').innerHTML = s.type === 'mantencion' && plan ? `<div class="card-title"><h3>${icon('clipboard', 18)} Pauta recomendada: ${nf(plan.km)} km</h3><span class="badge badge-primary">${money(plan.price)}</span></div>
      <p class="small muted">Según tu kilometraje (${nf(s.km)} km). Pauta ${escape(b.name)} cada ${b.plan[0]}.000 km o ${b.plan[1]} meses. Duración aprox. ${String(plan.hours).replace('.', ',')} h.</p>
      <ul class="feat-list">${plan.items.map(i => `<li>${icon('check', 14)} ${escape(i)}</li>`).join('')}</ul>
      <details><summary>Lista de precios ${escape(b.name)}</summary><div class="table-wrap"><table class="table"><thead><tr><th>Pauta</th><th>Meses</th><th>Precio</th></tr></thead><tbody>${all.map(p => `<tr class="${p.id === plan.id ? 'sel-row' : ''}"><td>${nf(p.km)} km</td><td>${p.months}</td><td>${money(p.price)}</td></tr>`).join('')}</tbody></table></div></details>`
      : `<h3>${icon('wrench', 18)} ${escape(APPT_TYPES[s.type])}</h3><p class="muted small">${s.type === 'diagnostico' ? 'Diagnóstico con escáner y prueba de ruta: $39.990 (se descuenta si realizas la reparación).' : s.type === 'recall' ? 'Las campañas de seguridad no tienen costo. Revisa si tu auto aplica en la pestaña Recall.' : s.type === 'carroceria' ? 'Para un presupuesto previo usa la pestaña Desabolladura y pintura.' : 'El asesor te entregará un presupuesto antes de iniciar cualquier trabajo.'}</p>`;
    const srs = showrooms().filter(x => x.brands.includes(s.brandId));
    if (!srs.find(x => x.id === s.showroomId)) s.showroomId = srs[0]?.id;
    box.querySelector('[data-shows]').innerHTML = srs.map(x => { const l = workshopLoad(x.id, s.date || addDays(ymd(), 1)); return `<button type="button" class="pick ${x.id === s.showroomId ? 'sel' : ''}" data-show="${x.id}">${icon('wrench', 20)}<span><b>${escape(x.city)}</b><small>${x.bays} bahías · ${l.pct}% ocupado</small></span></button>`; }).join('');
    const days = Array.from({ length: 14 }, (_, i) => addDays(ymd(), i + 1)).filter(d => parseYmd(d).getDay() !== 0).slice(0, 10);
    if (!days.includes(s.date)) s.date = days[0];
    box.querySelector('[data-days]').innerHTML = days.map(d => { const x = parseYmd(d), l = workshopLoad(s.showroomId, d); return `<button type="button" class="day-btn ${d === s.date ? 'sel' : ''}" data-day="${d}" ${l.pct >= 100 ? 'disabled' : ''}><small>${DOW[x.getDay()]}</small><b>${x.getDate()}</b><span class="n">${l.pct >= 100 ? 'lleno' : 100 - l.pct + '% libre'}</span></button>`; }).join('');
    const sr = showroom(s.showroomId), cap = Math.max(1, Math.round((sr.bays || 8) / 4));
    const sat = parseYmd(s.date).getDay() === 6;
    box.querySelector('[data-slots]').innerHTML = (settings().workshopSlots || []).filter(t => !sat || t < '12:30').map(t => { const n = db.count('appointments', a => a.showroomId === s.showroomId && a.date === s.date && a.slot === t && a.status !== 'cancelada'); return `<button type="button" class="slot ${t === s.slot ? 'sel' : ''}" data-slot="${t}" ${n >= cap ? 'disabled title="Sin cupo"' : ''}>${t}</button>`; }).join('');
    const m = model(s.modelId);
    box.querySelector('[data-sum]').innerHTML = `${m ? carSVG({ body: m.body, paint: db.get('vehicles', s.vehicleId)?.hex || m.colors[0].hex }) : ''}<h3>Resumen</h3>
      <div class="line"><span>Vehículo</span><span>${escape(brand(s.brandId)?.name)} ${escape(m?.name || 'otro')} ${s.year}</span></div>${s.patente ? `<div class="line"><span>Patente</span><span class="mono">${patenteFormat(s.patente)}</span></div>` : ''}
      <div class="line"><span>Servicio</span><span>${escape(APPT_TYPES[s.type])}</span></div>${plan ? `<div class="line"><span>Pauta</span><span>${nf(plan.km)} km</span></div>` : ''}
      <div class="line"><span>Taller</span><span>${escape(sr?.city || '')}</span></div><div class="line"><span>Fecha</span><span>${parseYmd(s.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })} ${s.slot || ''}</span></div>
      ${plan ? `<div class="sum-total"><span>Precio pauta</span><b>${money(plan.price)}</b></div>` : ''}<p class="small muted">${icon('car', 14)} Auto de reemplazo y retiro a domicilio disponibles (consulta).</p>`;
  }
  box.addEventListener('click', e => {
    const v = e.target.closest('[data-veh]');
    if (v) { const veh = db.get('vehicles', v.dataset.veh); s.vehicleId = veh?.id || null; Object.assign(s, veh ? { brandId: veh.brandId, modelId: veh.modelId, year: veh.year, km: veh.km, patente: veh.patente } : { patente: '' }); box.querySelectorAll('[data-veh]').forEach(x => x.classList.toggle('sel', x === v)); syncForm(); draw(); }
    const a = e.target.closest('[data-show]'); if (a) { s.showroomId = a.dataset.show; s.slot = null; draw(); }
    const d = e.target.closest('[data-day]'); if (d && !d.disabled) { s.date = d.dataset.day; s.slot = null; draw(); }
    const t = e.target.closest('[data-slot]'); if (t && !t.disabled) { s.slot = t.dataset.slot; draw(); }
  });
  f.addEventListener('change', e => {
    const n = e.target.name;
    if (n === 'brandId') { s.brandId = e.target.value; fillModels(); }
    if (n === 'modelId') s.modelId = e.target.value;
    if (n === 'year') s.year = +e.target.value; if (n === 'km') s.km = +e.target.value || 0; if (n === 'type') s.type = e.target.value;
    if (n === 'patente') { s.patente = e.target.value; const veh = findVehicle(s.patente); box.querySelector('[data-found]').textContent = veh ? `Encontramos tu ${veh.modelName} ${veh.year} en nuestros registros.` : ''; if (veh) { Object.assign(s, { vehicleId: veh.id, brandId: veh.brandId, modelId: veh.modelId, year: veh.year, km: veh.km }); syncForm(); } }
    if (n !== 'name' && n !== 'phone' && n !== 'email' && n !== 'notes') draw();
  });
  f.onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    let bad = false;
    const mark = (n, ok) => { f.elements[n].classList.toggle('invalid', !ok); if (!ok) bad = true; };
    mark('patente', patenteValid(v.patente)); mark('name', v.name.trim().length > 2); mark('phone', v.phone.replace(/\D/g, '').length >= 8); mark('email', /\S+@\S+\.\S+/.test(v.email));
    if (bad) return toast('Revisa los campos marcados (patente BBBB12 o BB1234).', 'warning');
    if (!s.slot) return toast('Elige un horario', 'warning');
    let veh = findVehicle(v.patente);
    const m = model(s.modelId);
    if (!veh) veh = db.insert('vehicles', { ownerId: u?.role === 'cliente' ? u.id : null, owner: v.name.trim(), phone: v.phone, email: v.email, patente: patenteClean(v.patente), vin: '—', brandId: s.brandId, modelId: m?.id || null, modelName: m?.name || 'Otro', year: s.year, colorName: '—', hex: '#9aa0a6', km: s.km, purchaseDate: `${s.year}-01-01`, showroomId: s.showroomId, lastServiceKm: 0 });
    else db.update('vehicles', veh.id, { km: Math.max(veh.km, s.km) });
    const plan = s.type === 'mantencion' ? nextPlan(s.brandId, Math.max(0, s.km - 1500)) : null;
    const advisor = db.find('users', x => x.role === 'asesor' && x.showroomId === s.showroomId && x.active !== false);
    const a = db.insert('appointments', { number: `CT-${9500 + db.count('appointments')}`, vehicleId: veh.id, customerId: u?.role === 'cliente' ? u.id : veh.ownerId || null, patente: patenteClean(v.patente), owner: v.name.trim(), phone: v.phone, email: v.email, brandId: s.brandId, modelId: m?.id || null, modelName: m?.name || 'Otro', year: s.year, showroomId: s.showroomId, date: s.date, slot: s.slot, type: s.type, km: s.km, planId: plan?.id || null, notes: v.notes, status: 'agendada', advisorId: advisor?.id || null });
    db.log('taller', `Cita ${a.number}: ${a.modelName} ${patenteFormat(a.patente)} · ${a.date} ${a.slot}`);
    box.innerHTML = `<div class="card ticket stack"><div class="check-big">${icon('check', 36)}</div><h2>¡Hora de taller confirmada!</h2><div class="code">${a.number}</div>
      <p><b>${parseYmd(a.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${a.slot}</b><br>${escape(showroom(a.showroomId).name)} · ${escape(showroom(a.showroomId).address)}</p>
      <p class="muted">${advisor ? `Tu asesor será <b>${escape(advisor.name)}</b>. ` : ''}${plan ? `Pauta ${nf(plan.km)} km por ${money(plan.price)}.` : ''} Podrás seguir el avance de tu auto en línea.</p>
      <div class="row" style="justify-content:center">${u?.role === 'cliente' ? '<a class="btn btn-primary" href="#/cuenta/servicio">Seguir en mi cuenta</a>' : '<a class="btn btn-primary" href="login.html">Crear cuenta para seguir el avance</a>'}<a class="btn" href="#/posventa/recall">Revisar recalls</a></div></div>`;
    window.scrollTo(0, 0);
  };
  syncForm(); draw();
}

// ---------- Recall ----------
function recall(box) {
  const u = auth.current();
  const list = db.query('recalls', r => r.active);
  box.innerHTML = `<div class="grid-main"><div class="stack">
    <form class="card stack" data-form novalidate><h3>${icon('search', 18)} ¿Tu auto tiene una campaña pendiente?</h3><p class="muted small">Ingresa la patente o el número VIN (chasis, 17 caracteres, en el padrón o bajo el parabrisas).</p>
      <div class="row"><input class="input mono grow" name="q" aria-label="Patente o VIN" placeholder="Patente o VIN" value="${escape(u?.role === 'cliente' ? db.find('vehicles', v => v.ownerId === u.id)?.patente || '' : '')}"><button class="btn btn-primary">Consultar</button></div></form>
    <div data-res></div></div>
    <div class="card"><h3>Campañas activas</h3><ul class="recall-list">${list.map(r => `<li><span class="badge badge-${r.risk === 'Alto' ? 'danger' : r.risk === 'Medio' ? 'warning' : 'info'}">Riesgo ${r.risk.toLowerCase()}</span><b>${escape(brand(r.brand)?.name)} ${r.models.map(m => escape(model(m)?.name || m)).join(', ')} ${r.yearFrom}–${r.yearTo}</b><span>${escape(r.title)}</span><small class="muted mono">${r.code}</small></li>`).join('')}</ul></div></div>`;
  box.querySelector('[data-form]').onsubmit = e => {
    e.preventDefault();
    const q = e.target.q.value.trim(), res = box.querySelector('[data-res]');
    if (q.length < 6) return toast('Ingresa una patente o VIN válido', 'warning');
    const v = findVehicle(q);
    if (!v) {
      res.innerHTML = `<div class="card stack"><p>${icon('alert', 16)} No encontramos <b class="mono">${escape(q.toUpperCase())}</b> en nuestros registros (quizás no lo compraste con nosotros). Indícanos marca, modelo y año:</p>
        <div class="grid-3"><select class="select" data-b aria-label="Marca">${db.all('brands').map(b => `<option value="${b.id}">${escape(b.name)}</option>`).join('')}</select><select class="select" data-m aria-label="Modelo"></select><input class="input" type="number" data-y value="2024" min="2010" max="2027" aria-label="Año"></div><div data-res2></div></div>`;
      const sb = res.querySelector('[data-b]'), sm = res.querySelector('[data-m]'), sy = res.querySelector('[data-y]');
      const fill = () => { sm.innerHTML = db.query('models', m => m.brandId === sb.value).map(m => `<option value="${m.id}">${escape(m.name)}</option>`).join(''); };
      const run = () => { const rs = recallsFor({ brandId: sb.value, modelId: sm.value, year: +sy.value }); res.querySelector('[data-res2]').innerHTML = result(rs); };
      sb.onchange = () => { fill(); run(); }; sm.onchange = run; sy.oninput = run; fill(); run();
      return;
    }
    const rs = recallsFor(v);
    res.innerHTML = `<div class="card stack"><div class="row">${carSVG({ body: model(v.modelId)?.body, paint: v.hex, cls: 'mini-car' })}<div><b>${escape(v.modelName)} ${v.year}</b><br><span class="mono">${patenteFormat(v.patente)} · VIN ${escape(v.vin)}</span></div></div>${result(rs)}</div>`;
  };
  const result = rs => rs.length ? rs.map(r => `<div class="recall-hit"><span class="badge badge-danger">Campaña pendiente ${r.code}</span><h4>${escape(r.title)}</h4><p>${escape(r.remedy)}</p><a class="btn btn-primary btn-sm" href="#/posventa">${icon('calendar', 15)} Agendar sin costo</a></div>`).join('') : `<div class="recall-ok">${icon('check', 20)} <b>Sin campañas pendientes.</b> Tu auto no tiene llamados a revisión activos.</div>`;
  if (box.querySelector('[name=q]').value) box.querySelector('[data-form]').requestSubmit?.();
}

// ---------- Garantía ----------
function warranty(box) {
  const u = auth.current();
  const mine = u?.role === 'cliente' ? db.query('vehicles', v => v.ownerId === u.id) : [];
  box.innerHTML = `<div class="grid-main"><div class="card"><h3>Garantía de fábrica por marca</h3><div class="table-wrap"><table class="table"><thead><tr><th>Marca</th><th>Años</th><th>Kilometraje</th><th>Pauta</th></tr></thead><tbody>${db.all('brands').map(b => `<tr><td><b>${escape(b.name)}</b></td><td>${b.warrantyYears} años</td><td>${nf(b.warrantyKm)} km</td><td>cada ${b.plan[0]}.000 km / ${b.plan[1]} meses</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted">La garantía se mantiene si realizas las mantenciones según pauta en un servicio autorizado. Lo que ocurra primero (años o km). Baterías de alto voltaje de eléctricos: 8 años o 160.000 km.</p></div>
    <div class="stack"><form class="card stack" data-form><h3>Consulta tu garantía</h3><div class="row"><input class="input mono grow" name="q" placeholder="Patente" aria-label="Patente" value="${escape(mine[0]?.patente || '')}"><button class="btn btn-primary">Ver</button></div></form><div data-res></div>
    <div class="card"><h4>Qué cubre</h4><ul class="feat-list">${['Defectos de fabricación de motor, caja y tren motriz', 'Sistemas eléctricos y electrónicos', 'Pintura y corrosión perforante', 'Asistencia en ruta 24/7 durante la garantía'].map(x => `<li>${icon('check', 14)} ${x}</li>`).join('')}</ul><h4>No cubre</h4><ul class="feat-list">${['Desgaste normal: frenos, neumáticos, plumillas', 'Daños por choque o mal uso', 'Mantenciones fuera de red autorizada'].map(x => `<li>${icon('x', 14)} ${x}</li>`).join('')}</ul></div></div></div>`;
  const f = box.querySelector('[data-form]');
  f.onsubmit = e => {
    e.preventDefault();
    const v = findVehicle(f.q.value), res = box.querySelector('[data-res]');
    if (!v) { res.innerHTML = `<div class="card">${icon('alert', 16)} No encontramos esa patente en nuestros registros.</div>`; return; }
    const w = warrantyFor(v);
    res.innerHTML = `<div class="card stack"><b>${escape(v.modelName)} ${v.year} · <span class="mono">${patenteFormat(v.patente)}</span></b>${w.active ? `<span class="badge badge-success">Garantía vigente</span><p>Hasta el <b>${parseYmd(w.until).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</b> o ${nf(w.km)} km (te quedan ${nf(w.kmLeft)} km).</p>` : `<span class="badge badge-danger">Garantía de fábrica vencida</span><p class="small">Pregunta por nuestra extensión de garantía Autoplaza +2 años.</p>`}</div>`;
  };
  if (f.q.value) f.requestSubmit?.();
}

// ---------- Repuestos ----------
function parts(box) {
  const all = db.query('parts', p => p.active !== false), cats = [...new Set(all.map(p => p.cat))];
  const st = { cat: '', q: '' };
  box.innerHTML = `<div class="booking-layout"><div class="stack"><div class="card filters row"><input class="input grow" type="search" placeholder="Buscar repuesto o accesorio" data-q aria-label="Buscar repuesto"><div class="chips">${['', ...cats].map(c => `<button class="chip ${c ? '' : 'active'}" data-cat="${c}">${c || 'Todos'}</button>`).join('')}</div></div><div class="parts-grid" data-list></div></div>
    <aside class="card summary" data-cart></aside></div>`;
  const cart = () => uiGet('partsCart', {});
  const drawList = () => {
    const l = all.filter(p => (!st.cat || p.cat === st.cat) && (!st.q || (p.name + p.sku).toLowerCase().includes(st.q.toLowerCase())));
    box.querySelector('[data-list]').innerHTML = l.map(p => `<div class="card part-card"><span class="icon-bubble">${icon({ Filtros: 'filter', Frenos: 'target', Lubricantes: 'fuel', Eléctrico: 'bolt', Carrocería: 'car', Neumáticos: 'gauge', Motor: 'wrench', Accesorios: 'box' }[p.cat] || 'box', 20)}</span><div><b>${escape(p.name)}</b><small class="muted mono">${p.sku} · ${escape(p.cat)}</small></div><div class="part-foot"><b>${money(p.price)}</b>${p.stock ? `<span class="badge badge-success plain">${p.stock} disp.</span>` : '<span class="badge badge-warning plain">A pedido</span>'}<button class="btn btn-sm btn-primary" data-add="${p.id}" aria-label="Agregar ${escape(p.name)}">${icon('plus', 15)}</button></div></div>`).join('') || '<div class="card empty">Sin resultados</div>';
  };
  const drawCart = () => {
    const c = cart(), items = Object.entries(c).map(([id, q]) => ({ p: db.get('parts', id), q })).filter(x => x.p);
    const total = items.reduce((s, x) => s + x.p.price * x.q, 0);
    box.querySelector('[data-cart]').innerHTML = `<h3>${icon('box', 18)} Mi solicitud</h3>${items.length ? items.map(x => `<div class="line"><span>${escape(x.p.name)}</span><span class="qty"><button class="btn btn-sm btn-ghost btn-icon" data-dec="${x.p.id}" aria-label="Quitar">−</button>${x.q}<button class="btn btn-sm btn-ghost btn-icon" data-add="${x.p.id}" aria-label="Agregar">+</button></span></div>`).join('') + `<div class="sum-total"><span>Total referencial</span><b>${money(total)}</b></div>
      <form class="stack" data-form novalidate><div class="field"><label for="r-name">Nombre</label><input class="input" id="r-name" name="name" required></div><div class="field"><label for="r-email">Correo</label><input class="input" id="r-email" name="email" type="email" required></div><div class="field"><label for="r-pat">Patente del vehículo (opcional)</label><input class="input mono" id="r-pat" name="patente"></div><button class="btn btn-primary btn-block">Solicitar cotización</button></form>` : '<p class="muted small">Agrega repuestos o accesorios para cotizarlos. Te confirmamos precio, stock y plazo de instalación.</p>'}`;
    const f = box.querySelector('[data-cart] [data-form]');
    if (f) { const u = auth.current(); if (u?.role === 'cliente') { f.name.value = u.name; f.email.value = u.email; }
      f.onsubmit = e => { e.preventDefault(); if (f.name.value.trim().length < 3 || !/\S+@\S+\.\S+/.test(f.email.value)) return toast('Completa nombre y correo', 'warning');
        const r = db.insert('requests', { type: 'repuestos', name: f.name.value.trim(), email: f.email.value.trim(), patente: patenteClean(f.patente.value), customerId: auth.current()?.role === 'cliente' ? auth.current().id : null, items: items.map(x => ({ id: x.p.id, name: x.p.name, qty: x.q, price: x.p.price })), detail: items.map(x => `${x.q}× ${x.p.name}`).join(', '), total, status: 'nueva' });
        db.log('repuestos', `Cotización de repuestos de ${r.name} (${money(total)})`); uiSet('partsCart', {}); toast('Solicitud enviada. Te responderemos hoy mismo.', 'success'); drawCart(); };
    }
  };
  box.addEventListener('click', e => {
    const a = e.target.closest('[data-add]'), d = e.target.closest('[data-dec]'), c = e.target.closest('[data-cat]');
    if (a) { const x = cart(); x[a.dataset.add] = (x[a.dataset.add] || 0) + 1; uiSet('partsCart', x); drawCart(); if (a.closest('.part-card')) toast('Agregado a tu solicitud', 'success', 1400); }
    if (d) { const x = cart(); x[d.dataset.dec]--; if (x[d.dataset.dec] <= 0) delete x[d.dataset.dec]; uiSet('partsCart', x); drawCart(); }
    if (c) { st.cat = c.dataset.cat; box.querySelectorAll('[data-cat]').forEach(y => y.classList.toggle('active', y === c)); drawList(); }
  });
  box.querySelector('[data-q]').oninput = e => { st.q = e.target.value; drawList(); };
  drawList(); drawCart();
}

// ---------- Carrocería ----------
const SEV = { leve: ['Leve (rayón)', 95000], medio: ['Medio (abolladura)', 185000], grave: ['Grave (reemplazo)', 340000] };
function body(box) {
  const sel = {};
  box.innerHTML = `<div class="booking-layout"><div class="stack"><div class="card stack"><h3>${icon('spray', 18)} Marca las piezas dañadas</h3><p class="small muted">Toca las zonas del auto. Luego indica la gravedad de cada una.</p><div class="panels-wrap" data-svg></div><div class="chips" data-chips></div></div>
    <div class="card stack" data-sel></div></div><aside class="card summary" data-sum></aside></div>`;
  const draw = () => {
    box.querySelector('[data-svg]').innerHTML = panelsSVG(Object.keys(sel));
    box.querySelector('[data-chips]').innerHTML = PANELS.map(([k, l]) => `<button class="chip ${sel[k] ? 'active' : ''}" data-part="${k}">${l}</button>`).join('');
    box.querySelector('[data-sel]').innerHTML = Object.keys(sel).length ? `<h3>Gravedad</h3>${Object.entries(sel).map(([k, s]) => `<div class="row between sev-row"><b>${PANELS.find(p => p[0] === k)[1]}</b><div class="seg-tabs">${Object.entries(SEV).map(([sk, [sl]]) => `<button class="seg-tab ${s === sk ? 'active' : ''}" data-sev="${k}" data-v="${sk}">${sl.split(' ')[0]}</button>`).join('')}</div></div>`).join('')}` : '<p class="muted">Aún no marcas piezas.</p>';
    const items = Object.entries(sel).map(([k, s]) => SEV[s][1] + 120000), total = items.reduce((a, b) => a + b, 0);
    box.querySelector('[data-sum]').innerHTML = `<h3>Presupuesto estimado</h3>${Object.entries(sel).map(([k, s]) => `<div class="line"><span>${PANELS.find(p => p[0] === k)[1]} · ${SEV[s][0].split(' ')[0].toLowerCase()}</span><span>${money(SEV[s][1] + 120000)}</span></div>`).join('') || '<p class="muted small">Marca piezas para estimar.</p>'}
      ${total ? `<div class="sum-total"><span>Rango</span><b>${money(total * .9)} – ${money(total * 1.15)}</b></div>` : ''}
      <form class="stack" data-form novalidate><div class="field"><label for="b-name">Nombre</label><input class="input" id="b-name" name="name" required></div><div class="field"><label for="b-phone">Teléfono</label><input class="input" id="b-phone" name="phone" type="tel" required></div><div class="field"><label for="b-pat">Patente</label><input class="input mono" id="b-pat" name="patente" required></div><div class="field"><label for="b-files">Fotos del daño (opcional)</label><input class="input" id="b-files" type="file" name="files" accept="image/*" multiple></div><button class="btn btn-primary btn-block" ${total ? '' : 'disabled'}>Solicitar presupuesto formal</button><small class="muted">¿Es por seguro? Trabajamos con todas las compañías; indícalo en la inspección.</small></form>`;
    const f = box.querySelector('[data-form]');
    f.onsubmit = e => { e.preventDefault(); if (f.name.value.trim().length < 3 || f.phone.value.replace(/\D/g, '').length < 8 || !patenteValid(f.patente.value)) return toast('Completa nombre, teléfono y patente válida', 'warning');
      const r = db.insert('requests', { type: 'carroceria', name: f.name.value.trim(), phone: f.phone.value, patente: patenteClean(f.patente.value), customerId: auth.current()?.role === 'cliente' ? auth.current().id : null, detail: Object.entries(sel).map(([k, s]) => `${PANELS.find(p => p[0] === k)[1]} (${s})`).join(', '), photos: [...f.files.files].map(x => x.name), total, status: 'nueva' });
      db.log('carrocería', `Presupuesto de ${r.name}: ${r.detail}`); toast('Recibimos tu solicitud. Te llamaremos para agendar la inspección.', 'success'); Object.keys(sel).forEach(k => delete sel[k]); draw(); };
  };
  box.addEventListener('click', e => {
    const p = e.target.closest('[data-part]'); if (p) { const k = p.dataset.part; sel[k] ? delete sel[k] : (sel[k] = 'medio'); draw(); }
    const s = e.target.closest('[data-sev]'); if (s) { sel[s.dataset.sev] = s.dataset.v; draw(); }
  });
  box.addEventListener('keydown', e => { const p = e.target.closest('.panel-zone'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); p.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  draw();
}
export { rutValid, userName };
