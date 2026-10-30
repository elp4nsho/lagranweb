// Carga masiva de envíos (pegar o subir CSV con ; o ,).
import { db } from '../data/db.js';
import { html, raw, money, toast, escape } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { COM } from '../data/geo.js';
import * as ops from '../shared/ops.js';

const SAMPLE = `nombre;telefono;direccion;comuna;tamano;servicio;notas
Josefa Castro;+56 9 5511 2233;Av. Grecia 1420;Ñuñoa;M;estandar;Dejar en conserjería
Martín Lagos;+56 9 7788 1100;Av. Apoquindo 3000, of 801;Las Condes;S;express;
Amanda Vidal;+56 9 6622 4411;Av. Matta 820;Santiago;L;estandar;Frágil
Hugo Paredes;+56 9 9001 2002;Av. Pajaritos 3300;Maipú;M;programado;
Inés Campos;+56 9 4411 7788;Calle Falsa 123;Valparaíso;M;estandar;`;
const SIZES = { S: 'S', M: 'M', L: 'L', XL: 'XL', SOBRE: 'S', PEQUENO: 'M', MEDIANO: 'L', GRANDE: 'XL' };
const SERV = { estandar: 'estandar', standard: 'estandar', express: 'express', programado: 'programado' };
const n = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function parseCSV(text, P, from, business) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = /nombre/i.test(lines[0]);
  return lines.slice(head ? 1 : 0).map((l, i) => {
    const [name, phone, addr, comunaRaw, sizeRaw, servRaw, notes] = l.split(sep).map(x => (x || '').trim());
    const comuna = Object.keys(COM).find(c => n(c).toLowerCase() === n(comunaRaw).toLowerCase()) || comunaRaw;
    const size = SIZES[n(sizeRaw).toUpperCase()] || 'M';
    const service = SERV[n(servRaw).toLowerCase()] || 'estandar';
    const errs = [];
    if (!name) errs.push('Falta nombre');
    if (!addr) errs.push('Falta dirección');
    if ((phone || '').replace(/\D/g, '').length < 8) errs.push('Teléfono inválido');
    if (!P.comunaZone[comuna]) errs.push(`Sin cobertura en "${comunaRaw || '—'}"`);
    const q = errs.length ? null : ops.quoteFor(from, comuna, size, service, { business });
    return { line: i + 1 + (head ? 1 : 0), name, phone, addr, comuna, size, service, notes: notes || '', errs, q };
  });
}

export function mountMasivo(el, ctx) {
  const c = ctx.customer();
  const addresses = db.query('addresses', a => a.customerId === c.id);
  let rows = [];
  el.innerHTML = html`${raw(pageHead('Carga masiva', 'Crea decenas de envíos de una vez desde una planilla. Ideal para tiendas online.'))}
    ${ctx.biz ? '' : raw('<div class="notice warn">💡 <span>La carga masiva está pensada para cuentas empresa, pero puedes probarla igual.</span></div>')}
    <div class="grid-2">
      <div class="card stack">
        <div class="field"><label for="b-from">Retirar en</label><select class="select" id="b-from">${addresses.map(a => raw(html`<option value="${a.id}">${a.label} · ${a.addr}, ${a.comuna}</option>`))}</select></div>
        <div class="field"><label for="b-csv">Datos (nombre; teléfono; dirección; comuna; tamaño; servicio; notas)</label><textarea class="textarea csv-area" id="b-csv" placeholder="Pega aquí las filas de tu planilla"></textarea></div>
        <div class="row"><button class="btn" data-sample>Cargar ejemplo</button><label class="btn btn-ghost">Subir .csv<input type="file" accept=".csv,text/csv,text/plain" hidden data-file></label><button class="btn btn-primary" data-validate>Validar</button></div>
      </div>
      <div class="card stack"><b>Formato</b><p class="muted small">Una fila por envío, separada por punto y coma (;) o coma. La primera fila puede ser el encabezado. Tamaños: S, M, L, XL. Servicios: estandar, express, programado.</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Columna</th><th>Ejemplo</th></tr></thead><tbody>
        <tr><td>nombre</td><td>Josefa Castro</td></tr><tr><td>telefono</td><td>+56 9 5511 2233</td></tr><tr><td>direccion</td><td>Av. Grecia 1420</td></tr><tr><td>comuna</td><td>Ñuñoa</td></tr><tr><td>tamano</td><td>M</td></tr><tr><td>servicio</td><td>express</td></tr></tbody></table></div></div>
    </div>
    <div data-preview></div>`;
  const ta = el.querySelector('#b-csv');
  el.querySelector('[data-sample]').onclick = () => { ta.value = SAMPLE; validate(); };
  el.querySelector('[data-file]').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { ta.value = r.result; validate(); }; r.readAsText(f); };
  el.querySelector('[data-validate]').onclick = () => validate();
  function validate() {
    const a = addresses.find(x => x.id === el.querySelector('#b-from').value) || addresses[0];
    if (!a) { toast('Agrega primero una dirección de retiro', 'warning'); return; }
    rows = parseCSV(ta.value, ops.pricing(), a.comuna, ctx.biz);
    const ok = rows.filter(r => !r.errs.length);
    const total = ok.reduce((s, r) => s + r.q.price, 0);
    el.querySelector('[data-preview]').innerHTML = !rows.length ? '<div class="card empty-inline">No hay filas para validar.</div>' : html`<div class="card stack">
      <div class="card-title"><h3>Vista previa · ${ok.length} de ${rows.length} filas válidas</h3><div class="row"><b>${money(total)}</b><button class="btn btn-primary" data-create ${ok.length ? '' : 'disabled'}>Crear ${ok.length} envíos</button></div></div>
      <div class="table-wrap"><table class="table bulk-table"><thead><tr><th>#</th><th>Destinatario</th><th>Dirección</th><th>Comuna</th><th>Tam.</th><th>Servicio</th><th class="num">Precio</th><th>Estado</th></tr></thead><tbody>
      ${rows.map(r => raw(html`<tr><td>${r.line}</td><td>${r.name}<br><small class="muted">${r.phone}</small></td><td>${r.addr}</td><td>${r.comuna}</td><td>${r.size}</td><td>${r.service}</td><td class="num">${r.q ? money(r.q.price) : '—'}</td><td class="${r.errs.length ? 'err' : ''}">${r.errs.length ? r.errs.join(', ') : raw('<span class="badge badge-success">OK</span>')}</td></tr>`))}
      </tbody></table></div></div>`;
    el.querySelector('[data-create]')?.addEventListener('click', () => create(a, ok));
  }
  function create(a, ok) {
    const batch = 'L-' + Date.now().toString(36).slice(-5).toUpperCase();
    const codes = ok.map(r => ops.createShipment({ customerId: c.id, channel: 'masivo', batch, notes: r.notes, size: r.size, service: r.service,
      sender: { name: a.name, phone: a.phone, addr: a.addr, comuna: a.comuna }, receiver: { name: r.name, phone: r.phone, addr: r.addr, comuna: r.comuna } }, { by: ctx.user.id, business: ctx.biz }).code);
    db.log('carga masiva', `${c.name}: ${codes.length} envíos (lote ${batch})`, ctx.user.id);
    ops.feed(`Carga masiva ${batch}: ${codes.length} envíos de ${c.name}`, 'info');
    toast(`${codes.length} envíos creados (lote ${batch})`, 'success');
    el.querySelector('[data-preview]').innerHTML = html`<div class="card stack"><div class="notice ok">✓ <span>Lote <b>${batch}</b> creado con ${codes.length} envíos. Ya se están asignando repartidores.</span></div><div class="chips">${codes.map(x => raw(html`<span class="chip mono">${x}</span>`))}</div><a class="btn btn-primary" href="#/envios?q=${batch}">Ver en historial</a></div>`;
    ta.value = '';
  }
}
