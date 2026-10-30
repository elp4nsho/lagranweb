// Asistente de creación/edición de eventos (portal productor y admin).
// Pasos: detalles → recinto y fecha → entradas y precios (preventa) → códigos promo → revisión.
import { db } from '../data/db.js';
import { html, raw, $, $$, money, toast, escape } from '../../../assets/core/ui.js';
import { CATEGORIES } from '../data/seed.js';
import { seatMapSVG, zonesOf, zoneColor } from './venue.js';
import { poster } from './art.js';

const STEPS = ['Detalles', 'Recinto y fecha', 'Entradas', 'Promociones', 'Revisión'];
const ZNAME = { ga: 'General (de pie)' };
const pad = n => String(n).padStart(2, '0');
const toLocal = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`; };

export function mountWizard(el, { event = null, organizerId, onSave, onCancel, admin = false }) {
  const venues = db.query('venues', v => v.active !== false);
  const d = event ? JSON.parse(JSON.stringify(event)) : {
    title: '', category: 'conciertos', description: '', minAge: 0, lineup: [{ name: '', time: '21:00', role: 'Principal' }],
    venueId: venues[0].id, date: new Date(Date.now() + 30 * 864e5).setHours(21, 0, 0, 0), tiers: [], art: Math.floor(Math.random() * 6), organizerId, featured: false
  };
  d.date = new Date(d.date).toISOString();
  const promos = event ? db.query('promos', p => p.eventId === event.id).map(p => ({ ...p })) : [];
  let step = 0;
  const venue = () => db.get('venues', d.venueId);
  const suggestTiers = () => {
    const v = venue();
    d.tiers = zonesOf(v).map((z, i) => ({ id: 'n' + Math.random().toString(36).slice(2, 7), name: z === 'ga' ? (v.gaName || 'General') : v.sections.find(s => s.zone === z).name.split(' ')[0], zone: z, price: 20000 + (zonesOf(v).length - i) * 8000, ebPrice: 0, ebUntil: null, capacity: z === 'ga' ? v.gaCapacity : 0 }));
  };
  if (!d.tiers.length) suggestTiers();

  function draw() {
    const v = venue();
    el.innerHTML = html`<div class="stack">
      <div class="wizard-steps">${STEPS.map((s, i) => raw(`<button type="button" data-step="${i}" class="${i === step ? 'on' : i < step ? 'done' : ''}">${i + 1}<span>. ${s}</span></button>`))}</div>
      <div class="card stack" id="wbody">${raw(body(v))}</div>
      <div class="row between"><div class="row" style="gap:8px"><button class="btn btn-ghost" id="wcancel">Cancelar</button>${step > 0 ? raw('<button class="btn" id="wprev">← Anterior</button>') : ''}</div>
        <div class="row" style="gap:8px">${step < 4 ? raw('<button class="btn btn-primary" id="wnext">Siguiente →</button>') : raw(`<button class="btn" id="wdraft">Guardar borrador</button><button class="btn btn-primary" id="wsubmit">${admin ? 'Guardar y publicar' : event && event.status === 'publicado' ? 'Guardar cambios' : 'Enviar a aprobación'}</button>`)}</div></div>
    </div>`;
    wire();
  }
  function body(v) {
    if (step === 0) return html`<h3 style="margin:0">Detalles del evento</h3>
      <div class="field"><label for="w-title">Nombre del evento *</label><input class="input" id="w-title" value="${d.title}" placeholder="Ej: Marea Baja · Gira 2027"></div>
      <div class="grid-2"><div class="field"><label for="w-cat">Categoría</label><select class="select" id="w-cat">${Object.entries(CATEGORIES).map(([k, l]) => raw(`<option value="${k}" ${d.category === k ? 'selected' : ''}>${l}</option>`))}</select></div>
        <div class="field"><label for="w-age">Edad mínima</label><select class="select" id="w-age">${[0, 14, 18].map(a => raw(`<option value="${a}" ${+d.minAge === a ? 'selected' : ''}>${a ? '+' + a : 'Todo público'}</option>`))}</select></div></div>
      <div class="field"><label for="w-desc">Descripción</label><textarea class="textarea" id="w-desc">${d.description}</textarea></div>
      <div class="field"><span class="label">Afiche (estilo generado)</span><div class="row" id="w-art" style="gap:8px">${[0, 1, 2, 3, 4, 5].map(i => raw(`<button type="button" class="btn btn-icon ${d.art === i ? 'btn-primary' : ''}" data-art="${i}" style="width:72px;height:44px;padding:2px;overflow:hidden" aria-label="Estilo ${i + 1}">${poster({ ...d, art: i })}</button>`))}</div></div>
      <div class="field"><span class="label">Lineup / programa</span><div id="w-lineup" class="stack" style="gap:8px">${d.lineup.map((l, i) => raw(html`<div class="row" style="gap:8px;flex-wrap:nowrap"><input class="input" style="width:90px" data-l="time" data-i="${i}" value="${l.time}" placeholder="21:00" aria-label="Hora"><input class="input" data-l="name" data-i="${i}" value="${l.name}" placeholder="Artista / charla" aria-label="Nombre"><input class="input" data-l="role" data-i="${i}" value="${l.role}" placeholder="Rol" aria-label="Rol"><button type="button" class="btn btn-ghost btn-icon" data-lrm="${i}" aria-label="Quitar">✕</button></div>`))}</div>
        <button type="button" class="btn btn-sm" id="w-ladd" style="align-self:flex-start">+ Agregar</button></div>`;
    if (step === 1) return html`<h3 style="margin:0">Recinto y fecha</h3>
      <div class="grid-2"><div class="field"><label for="w-venue">Recinto</label><select class="select" id="w-venue">${venues.map(x => raw(`<option value="${x.id}" ${x.id === d.venueId ? 'selected' : ''}>${escape(x.name)} · ${x.city} (${x.capacity})</option>`))}</select></div>
        <div class="field"><label for="w-date">Fecha y hora</label><input class="input" type="datetime-local" id="w-date" value="${toLocal(d.date)}"></div></div>
      <p class="muted small" style="margin:0">${v.address}, ${v.city} · ${v.sections.length} secciones numeradas${v.gaCapacity ? ` + ${v.gaName} para ${v.gaCapacity} personas de pie` : ''}. Al cambiar de recinto se proponen tipos de entrada por zona.</p>
      <div class="preview-box">${raw(seatMapSVG(v))}</div>`;
    if (step === 2) return html`<h3 style="margin:0">Tipos de entrada y precios</h3><p class="muted small" style="margin:0">Cada tipo se asocia a una zona del recinto. La preventa (early bird) aplica un precio menor hasta la fecha indicada.</p>
      <div id="w-tiers">${d.tiers.map((t, i) => raw(html`<div class="tier-edit">
        <div class="field"><label>Nombre</label><input class="input" data-t="name" data-i="${i}" value="${t.name}"></div>
        <div class="field"><label>Zona</label><select class="select" data-t="zone" data-i="${i}">${zonesOf(v).map(z => raw(`<option value="${z}" ${t.zone === z ? 'selected' : ''}>${ZNAME[z] || z}</option>`))}</select></div>
        <div class="field"><label>Precio</label><input class="input" type="number" min="0" step="500" data-t="price" data-i="${i}" value="${t.price}"></div>
        <div class="field"><label>Preventa</label><input class="input" type="number" min="0" step="500" data-t="ebPrice" data-i="${i}" value="${t.ebPrice || ''}" placeholder="—"></div>
        <div class="field"><label>${t.zone === 'ga' ? 'Cupo' : 'Preventa hasta'}</label>${t.zone === 'ga' ? raw(`<input class="input" type="number" min="1" data-t="capacity" data-i="${i}" value="${t.capacity || v.gaCapacity}">`) : raw(`<input class="input" type="date" data-t="ebUntil" data-i="${i}" value="${t.ebUntil ? t.ebUntil.slice(0, 10) : ''}">`)}</div>
        <button type="button" class="btn btn-ghost btn-icon" data-trm="${i}" aria-label="Quitar tipo">✕</button></div>`))}</div>
      <div class="row"><button type="button" class="btn btn-sm" id="w-tadd">+ Tipo de entrada</button><button type="button" class="btn btn-sm btn-ghost" id="w-tsug">Proponer según zonas</button></div>`;
    if (step === 3) return html`<h3 style="margin:0">Códigos promocionales</h3><p class="muted small" style="margin:0">Opcional. Los códigos solo aplican a este evento.</p>
      <div id="w-promos" class="stack" style="gap:8px">${promos.map((p, i) => raw(html`<div class="sec-edit"><div class="field"><label>Código</label><input class="input mono" data-p="code" data-i="${i}" value="${p.code}" style="text-transform:uppercase"></div>
        <div class="field"><label>Tipo</label><select class="select" data-p="type" data-i="${i}"><option value="pct" ${p.type === 'pct' ? 'selected' : ''}>%</option><option value="fixed" ${p.type === 'fixed' ? 'selected' : ''}>$ fijo</option></select></div>
        <div class="field"><label>Valor</label><input class="input" type="number" data-p="value" data-i="${i}" value="${p.value}"></div>
        <div class="field"><label>Usos máx.</label><input class="input" type="number" data-p="maxUses" data-i="${i}" value="${p.maxUses}"></div>
        <button type="button" class="btn btn-ghost btn-icon" data-prm="${i}" aria-label="Quitar código">✕</button></div>`))}</div>
      <button type="button" class="btn btn-sm" id="w-padd" style="align-self:flex-start">+ Código</button>`;
    const cap = d.tiers.reduce((s, t) => s + (t.zone === 'ga' ? +t.capacity || 0 : v.sections.filter(x => x.zone === t.zone).reduce((a, x) => a + x.rows * x.seats, 0)), 0);
    const gross = d.tiers.reduce((s, t) => s + t.price * (t.zone === 'ga' ? +t.capacity || 0 : v.sections.filter(x => x.zone === t.zone).reduce((a, x) => a + x.rows * x.seats, 0)), 0);
    return html`<h3 style="margin:0">Revisión</h3>
      <div class="grid-2"><div style="border-radius:var(--radius-sm);overflow:hidden;aspect-ratio:16/9">${raw(poster(d))}</div>
      <div class="stack" style="gap:6px"><b style="font-size:20px">${d.title || 'Sin nombre'}</b><span>${CATEGORIES[d.category]} · ${new Date(d.date).toLocaleString('es-CL', { dateStyle: 'full', timeStyle: 'short' })}</span><span>${v.name}, ${v.city}</span>
        <span>${d.tiers.length} tipos de entrada · capacidad ${cap.toLocaleString('es-CL')}</span><span>Recaudación potencial (precio full): <b>${money(gross)}</b></span><span>${promos.length} código(s) promocional(es)</span></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th><th>Zona</th><th>Precio</th><th>Preventa</th></tr></thead><tbody>${d.tiers.map(t => raw(html`<tr><td><i class="zone-dot" style="--z:${zoneColor(v, t.zone)}"></i> ${t.name}</td><td>${ZNAME[t.zone] || t.zone}</td><td>${money(t.price)}</td><td>${t.ebPrice ? money(t.ebPrice) + (t.ebUntil ? ' hasta ' + t.ebUntil.slice(0, 10) : '') : '—'}</td></tr>`))}</tbody></table></div>
      ${!admin ? raw('<p class="muted small" style="margin:0">Al enviar, el equipo de Tiquetera Volcán revisará el evento antes de publicarlo (normalmente en menos de 24 h).</p>') : ''}`;
  }
  function collect() {
    if (step === 0) {
      d.title = $('#w-title').value.trim(); d.category = $('#w-cat').value; d.minAge = +$('#w-age').value; d.description = $('#w-desc').value.trim();
      $$('[data-l]', el).forEach(i => (d.lineup[+i.dataset.i][i.dataset.l] = i.value));
    }
    if (step === 1) { const nv = $('#w-venue').value; const dt = $('#w-date').value; if (dt) d.date = new Date(dt).toISOString(); if (nv !== d.venueId) { d.venueId = nv; suggestTiers(); } }
    if (step === 2) $$('[data-t]', el).forEach(i => { const t = d.tiers[+i.dataset.i], k = i.dataset.t; t[k] = ['price', 'ebPrice', 'capacity'].includes(k) ? +i.value || 0 : k === 'ebUntil' ? (i.value ? new Date(i.value + 'T23:59').toISOString() : null) : i.value; });
    if (step === 3) $$('[data-p]', el).forEach(i => { const p = promos[+i.dataset.i], k = i.dataset.p; p[k] = ['value', 'maxUses'].includes(k) ? +i.value || 0 : k === 'code' ? i.value.toUpperCase().trim() : i.value; });
  }
  function valid() {
    if (step === 0 && !d.title) { toast('Ponle un nombre al evento', 'warning'); $('#w-title').classList.add('invalid'); return false; }
    if (step === 1 && Date.parse(d.date) < Date.now()) { toast('La fecha debe ser futura', 'warning'); return false; }
    if (step === 2) {
      if (!d.tiers.length) { toast('Agrega al menos un tipo de entrada', 'warning'); return false; }
      if (d.tiers.some(t => !t.name || !(t.price > 0))) { toast('Cada tipo necesita nombre y precio', 'warning'); return false; }
      if (d.tiers.some(t => t.ebPrice && t.ebPrice >= t.price)) { toast('El precio de preventa debe ser menor al precio normal', 'warning'); return false; }
      const z = d.tiers.filter(t => t.zone !== 'ga').map(t => t.zone); if (new Set(z).size !== z.length) { toast('Cada zona numerada puede tener un solo tipo de entrada', 'warning'); return false; }
    }
    if (step === 3 && promos.some(p => !p.code || !(p.value > 0))) { toast('Completa código y valor de cada promoción', 'warning'); return false; }
    if (step === 3) { const dup = promos.find(p => db.find('promos', x => x.code === p.code && x.id !== p.id)); if (dup) { toast(`El código ${dup.code} ya existe`, 'warning'); return false; } }
    return true;
  }
  function wire() {
    el.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { collect(); const to = +b.dataset.step; if (to > step && !valid()) return; step = to; draw(); });
    $('#wnext', el)?.addEventListener('click', () => { collect(); if (!valid()) return; step++; draw(); });
    $('#wprev', el)?.addEventListener('click', () => { collect(); step--; draw(); });
    $('#wcancel', el).onclick = () => onCancel?.();
    $('#w-ladd', el)?.addEventListener('click', () => { collect(); d.lineup.push({ name: '', time: '', role: '' }); draw(); });
    el.querySelectorAll('[data-lrm]').forEach(b => b.onclick = () => { collect(); d.lineup.splice(+b.dataset.lrm, 1); draw(); });
    el.querySelectorAll('[data-art]').forEach(b => b.onclick = () => { collect(); d.art = +b.dataset.art; draw(); });
    $('#w-venue', el)?.addEventListener('change', () => { collect(); draw(); });
    $('#w-tadd', el)?.addEventListener('click', () => { collect(); d.tiers.push({ id: 'n' + Math.random().toString(36).slice(2, 7), name: 'Nuevo tipo', zone: zonesOf(venue())[0], price: 15000, ebPrice: 0, ebUntil: null, capacity: venue().gaCapacity || 0 }); draw(); });
    $('#w-tsug', el)?.addEventListener('click', () => { suggestTiers(); draw(); });
    el.querySelectorAll('[data-t="zone"]').forEach(s => s.addEventListener('change', () => { collect(); draw(); }));
    el.querySelectorAll('[data-trm]').forEach(b => b.onclick = () => { collect(); d.tiers.splice(+b.dataset.trm, 1); draw(); });
    $('#w-padd', el)?.addEventListener('click', () => { collect(); promos.push({ code: (d.title.split(' ')[0] || 'PROMO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + (10 + promos.length), type: 'pct', value: 10, maxUses: 100, uses: 0, active: true }); draw(); });
    el.querySelectorAll('[data-prm]').forEach(b => b.onclick = () => { collect(); promos.splice(+b.dataset.prm, 1); draw(); });
    const finish = submit => { collect(); d.lineup = d.lineup.filter(l => l.name.trim()); const v = venue(); d.city = v.city; onSave({ ...d }, promos, submit); };
    $('#wdraft', el)?.addEventListener('click', () => finish(false));
    $('#wsubmit', el)?.addEventListener('click', () => finish(true));
  }
  draw();
}

// Guarda el evento y sus códigos. Devuelve el evento.
export function saveEvent(d, promos, { status, user }) {
  const fields = { title: d.title, category: d.category, description: d.description, minAge: d.minAge, lineup: d.lineup, venueId: d.venueId, city: d.city, date: d.date, tiers: d.tiers, art: d.art, organizerId: d.organizerId, featured: !!d.featured, status };
  const ev = d.id ? db.update('events', d.id, fields) : db.insert('events', { ...fields, salesStart: new Date().toISOString(), tags: [] });
  const keep = new Set();
  promos.forEach(p => {
    const row = { code: p.code, type: p.type, value: p.value, maxUses: p.maxUses, eventId: ev.id, organizerId: ev.organizerId, validUntil: ev.date, active: p.active !== false };
    if (p.id) { db.update('promos', p.id, row); keep.add(p.id); } else keep.add(db.insert('promos', { ...row, uses: 0 }).id);
  });
  db.query('promos', p => p.eventId === ev.id && !keep.has(p.id)).forEach(p => db.remove('promos', p.id));
  db.log(d.id ? 'evento editado' : 'evento creado', `${ev.title} (${status})`, user?.id);
  return ev;
}
