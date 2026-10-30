// Recintos: CRUD y generador de layout de asientos (filas × asientos por sección) con vista previa.
import { db } from '../data/db.js';
import { html, raw, $, $$, num, toast, confirm, dataTable, escape } from '../../../assets/core/ui.js';
import { pageHead, csvButton, wireCSV } from '../shared/admin-kit.js';
import { seatMapSVG, seatCount, zonesOf } from '../shared/venue.js';
import { CITIES } from '../data/seed.js';

export function render(el, { isAdmin }) {
  el.innerHTML = `${pageHead('Recintos', 'Lugares donde se realizan los eventos y sus mapas de asientos', `${csvButton()}<a class="btn btn-primary" href="#/recintos/nuevo">+ Nuevo recinto</a>`)}<div id="tbl"></div>`;
  const rows = () => db.all('venues').map(v => ({ ...v, seatsN: seatCount(v), eventsN: db.count('events', e => e.venueId === v.id), secN: v.sections.length }));
  const t = dataTable($('#tbl', el), {
    rows: rows(), search: r => `${r.name} ${r.city} ${r.address}`, onRow: r => (location.hash = `#/recintos/${r.id}`),
    columns: [
      { key: 'name', label: 'Recinto', render: r => html`<b>${r.name}</b><br><small class="muted">${r.address}</small>` },
      { key: 'city', label: 'Ciudad' },
      { key: 'secN', label: 'Secciones' },
      { key: 'seatsN', label: 'Asientos', render: r => num(r.seatsN) },
      { key: 'gaCapacity', label: 'De pie', render: r => num(r.gaCapacity) },
      { key: 'capacity', label: 'Capacidad', render: r => `<b>${num(r.capacity)}</b>` },
      { key: 'eventsN', label: 'Eventos' },
      { key: 'active', label: 'Estado', render: r => (r.active !== false ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>') },
      { key: 'id', label: '', sort: false, render: r => (isAdmin ? `<button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>` : '') }
    ]
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const v = db.get('venues', b.dataset.del);
    if (db.count('events', x => x.venueId === v.id)) return toast('No se puede eliminar: tiene eventos asociados. Desactívalo en su lugar.', 'warning');
    if (await confirm(`¿Eliminar ${v.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('venues', v.id); db.log('recinto eliminado', v.name); toast('Recinto eliminado'); }
  });
  wireCSV(el, 'recintos.csv', () => rows().map(r => ({ id: r.id, nombre: r.name, ciudad: r.city, direccion: r.address, secciones: r.secN, asientos: r.seatsN, de_pie: r.gaCapacity, capacidad: r.capacity })));
  return { update: () => t.update(rows()) };
}

const sid = () => Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 4) || 'sx';

export function editor(el, { user, params }) {
  const isNew = params.id === 'nuevo';
  const orig = isNew ? null : db.get('venues', params.id);
  if (!isNew && !orig) { el.innerHTML = '<div class="empty">Recinto no encontrado</div>'; return; }
  const v = orig ? JSON.parse(JSON.stringify(orig)) : { name: '', city: 'Santiago', address: '', gaCapacity: 0, gaName: 'Cancha', mapX: 50, mapY: 45, active: true, sections: [{ id: sid(), name: 'Platea', rows: 6, seats: 14, zone: 'platea' }] };
  const used = !isNew && db.count('tickets', t => db.get('events', t.eventId)?.venueId === v.id && t.seat) > 0;
  el.innerHTML = html`<a href="#/recintos" class="small">← Recintos</a>${raw(pageHead(isNew ? 'Nuevo recinto' : v.name, 'Datos del recinto y generador de mapa de asientos'))}
    ${used ? raw('<div class="card small">⚠️ Este recinto tiene entradas numeradas vendidas. Cambiar secciones existentes puede dejar asientos vendidos fuera del mapa.</div>') : ''}
    <div class="grid-2" style="align-items:start">
      <div class="card stack">
        <div class="field"><label for="v-name">Nombre *</label><input class="input" id="v-name" value="${v.name}"></div>
        <div class="grid-2"><div class="field"><label for="v-city">Ciudad</label><select class="select" id="v-city">${CITIES.map(c => raw(`<option ${c === v.city ? 'selected' : ''}>${c}</option>`))}</select></div><div class="field"><label for="v-addr">Dirección</label><input class="input" id="v-addr" value="${v.address}"></div></div>
        <div class="grid-2"><div class="field"><label for="v-ga">Capacidad de pie (0 = sin cancha)</label><input class="input" type="number" min="0" id="v-ga" value="${v.gaCapacity}"></div><div class="field"><label for="v-gan">Nombre del área de pie</label><input class="input" id="v-gan" value="${v.gaName || ''}"></div></div>
        <label class="check"><input type="checkbox" id="v-act" ${v.active !== false ? 'checked' : ''}> Recinto activo (disponible para nuevos eventos)</label>
        <hr>
        <div class="row between"><h3 style="margin:0">Secciones numeradas</h3><span class="muted small" id="v-total"></span></div>
        <div id="v-secs"></div>
        <button class="btn btn-sm" id="v-add" style="align-self:flex-start">+ Sección</button>
        <details class="card" style="padding:12px"><summary style="cursor:pointer;font-weight:600">⚡ Generador rápido</summary>
          <div class="grid-4" style="gap:8px;margin-top:10px">
            <div class="field"><label for="g-n">Secciones</label><input class="input" type="number" id="g-n" value="3" min="1" max="12"></div>
            <div class="field"><label for="g-r">Filas</label><input class="input" type="number" id="g-r" value="8" min="1" max="30"></div>
            <div class="field"><label for="g-s">Asientos/fila</label><input class="input" type="number" id="g-s" value="14" min="1" max="40"></div>
            <div class="field"><label for="g-z">Zonas</label><select class="select" id="g-z"><option value="1">1 zona</option><option value="2" selected>2 zonas (delantera/trasera)</option><option value="3">3 zonas</option></select></div>
          </div><button class="btn btn-sm btn-primary wrap" id="g-go" style="margin-top:10px">Generar layout (reemplaza secciones)</button></details>
        <div class="row" style="justify-content:flex-end"><a class="btn btn-ghost" href="#/recintos">Cancelar</a><button class="btn btn-primary" id="v-save">Guardar recinto</button></div>
      </div>
      <div class="card stack" style="position:sticky;top:80px"><h3 style="margin:0">Vista previa</h3><div class="preview-box" id="v-prev"></div><p class="muted small" style="margin:0" id="v-zones"></p></div>
    </div>`;
  const ZN = ['vip', 'platea', 'tribuna', 'galeria', 'palco', 'general'];
  function drawSecs() {
    $('#v-secs').innerHTML = v.sections.map((s, i) => html`<div class="sec-edit">
      <div class="field"><label>Nombre</label><input class="input" data-s="name" data-i="${i}" value="${s.name}"></div>
      <div class="field"><label>Filas</label><input class="input" type="number" min="1" max="30" data-s="rows" data-i="${i}" value="${s.rows}"></div>
      <div class="field"><label>Asientos</label><input class="input" type="number" min="1" max="40" data-s="seats" data-i="${i}" value="${s.seats}"></div>
      <div class="field"><label>Zona de precio</label><input class="input" list="zlist" data-s="zone" data-i="${i}" value="${s.zone}"></div>
      <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-ghost btn-icon btn-sm" data-up="${i}" aria-label="Subir" ${i ? '' : 'disabled'}>↑</button><button class="btn btn-ghost btn-icon btn-sm" data-rm="${i}" aria-label="Quitar">✕</button></div></div>`).join('') + `<datalist id="zlist">${ZN.map(z => `<option value="${z}">`).join('')}</datalist>`;
    preview();
  }
  function preview() {
    v.gaCapacity = +$('#v-ga').value || 0; v.gaName = $('#v-gan').value;
    $('#v-prev').innerHTML = seatMapSVG(v);
    $('#v-total').textContent = `${num(seatCount(v))} asientos + ${num(v.gaCapacity)} de pie = ${num(seatCount(v) + v.gaCapacity)}`;
    $('#v-zones').textContent = 'Zonas de precio: ' + zonesOf(v).map(z => (z === 'ga' ? (v.gaName || 'General') : z)).join(', ');
  }
  el.addEventListener('input', e => {
    const i = e.target.dataset.i, k = e.target.dataset.s;
    if (k) { v.sections[+i][k] = k === 'rows' || k === 'seats' ? Math.max(1, Math.min(40, +e.target.value || 1)) : k === 'zone' ? e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') || 'general' : e.target.value; preview(); }
    if (e.target.id === 'v-ga' || e.target.id === 'v-gan') preview();
  });
  el.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]'), up = e.target.closest('[data-up]');
    if (rm) { v.sections.splice(+rm.dataset.rm, 1); drawSecs(); }
    if (up) { const i = +up.dataset.up; [v.sections[i - 1], v.sections[i]] = [v.sections[i], v.sections[i - 1]]; drawSecs(); }
    if (e.target.id === 'v-add') { v.sections.push({ id: sid(), name: `Sección ${v.sections.length + 1}`, rows: 5, seats: 12, zone: 'general' }); drawSecs(); }
    if (e.target.id === 'g-go') {
      const n = +$('#g-n').value || 1, r = +$('#g-r').value || 1, s = +$('#g-s').value || 1, z = +$('#g-z').value;
      const names = n === 3 ? ['Izquierda', 'Central', 'Derecha'] : null;
      const zones = [['general'], ['preferente', 'general'], ['vip', 'platea', 'tribuna']][z - 1];
      v.sections = [];
      zones.forEach((zone, zi) => { for (let k = 0; k < n; k++) v.sections.push({ id: sid() + zi + k, name: `${zone[0].toUpperCase() + zone.slice(1)} ${names ? names[k] : k + 1}`, rows: Math.max(1, Math.round(r / zones.length)), seats: s, zone }); });
      drawSecs(); toast(`Layout generado: ${v.sections.length} secciones`, 'success');
    }
    if (e.target.id === 'v-save') {
      v.name = $('#v-name').value.trim(); v.city = $('#v-city').value; v.address = $('#v-addr').value.trim(); v.active = $('#v-act').checked;
      if (!v.name) { $('#v-name').classList.add('invalid'); return toast('El nombre es obligatorio', 'warning'); }
      if (!v.sections.length && !v.gaCapacity) return toast('El recinto necesita secciones o capacidad de pie', 'warning');
      v.capacity = seatCount(v) + v.gaCapacity;
      if (isNew) { const row = db.insert('venues', v); db.log('recinto creado', `${v.name} (${v.capacity})`, user.id); toast('Recinto creado', 'success'); location.hash = `#/recintos/${row.id}`; }
      else { db.update('venues', orig.id, v); db.log('recinto editado', v.name, user.id); toast('Recinto guardado', 'success'); }
    }
  });
  drawSecs();
  void $$; void escape;
  return { static: true };
}
