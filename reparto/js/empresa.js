// Portal del cliente empresa (remitente): resumen, envíos con su seguimiento y prueba de entrega,
// nuevo envío con cotización en vivo, carga masiva CSV con validación por fila, etiquetas,
// retiros en bodega, galería de pruebas de entrega y facturas.
import './boot.js';
import { app, db, S, SHIP, stBadge, companyName, userName, hhmm, km, kg, money, escape, todayStr, tomorrowStr, priceFor, locate, WINDOWS, SERVICES, COMUNA, shipments, pickups, invoices, notify } from './app.js';
import * as ops from './ops.js';
import { proofCard, shipTimeline, labelHtml, labelModal, flagsHtml, svcLabel, photoSvg, sigSvg } from './views.js';
import { cityMap, DEPOT, COMUNA_NAMES } from './geo.js';
import { accountSection } from '../../assets/core/pages.js';
import { pageHead, kpis, card, chartCard, emptyState, kv } from '../../assets/core/blocks.js';
import { html, raw, toast, modal, dateTime, ago, date as fmtDate, barChart, donutChart, downloadCSV, debounce, norm } from '../../assets/core/ui.js';
import { renderFields, readFields } from '../../assets/core/resource.js';
import { byDay, countBy, nextCode } from '../../assets/core/domain.js';

const mine = ctx => db.query('shipments', s => s.companyId === ctx.user.companyId);
const company = ctx => db.get('companies', ctx.user.companyId);

// ================= Resumen =================
function summary(view, ctx) {
  const all = mine(ctx).filter(s => s.kind === 'entrega');
  const c = company(ctx);
  const month = all.filter(s => s.createdAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
  const delivered = all.filter(ops.isDone);
  const transit = all.filter(s => ['en_bodega', 'asignado', 'en_ruta', 'creado'].includes(s.status));
  const attention = all.filter(s => s.status === 'fallido' || s.status === 'en_punto' || s.status === 'devuelto' || (s.status === 'en_bodega' && (s.attempts || []).some(a => !a.ok)));
  const codDone = delivered.filter(s => s.proof?.payment).reduce((a, s) => a + s.proof.payment.amount, 0);
  const first = delivered.filter(s => s.attempts.length === 1).length;
  const ratings = all.filter(s => s.rating);
  view.innerHTML = html`${pageHead(c?.name || 'Mi empresa', `Plan ${db.get('rates', c?.rateId)?.name || ''} · retiro en ${c?.address}, ${c?.comuna}`, '<a class="btn" href="#/masiva">⇪ Carga masiva</a><a class="btn btn-primary" href="#/nuevo">＋ Nuevo envío</a>')}
    ${kpis([
      { label: 'Envíos del mes', value: month.length, icon: '📦', href: '#/envios' },
      { label: 'En tránsito', value: transit.length, hint: `${all.filter(s => s.status === 'en_ruta').length} en reparto ahora`, icon: '🚚' },
      { label: 'Entregados al 1er intento', value: delivered.length ? `${Math.round((first / delivered.length) * 100)}%` : '—', icon: '🎯' },
      { label: 'Recaudado contra entrega', value: money(codDone), hint: 'se abona en la próxima liquidación', icon: '💵' },
      { label: 'Satisfacción', value: ratings.length ? `${(ratings.reduce((a, s) => a + s.rating.stars, 0) / ratings.length).toFixed(1)} ★` : '—', hint: `${ratings.length} evaluaciones`, icon: '⭐' }
    ])}
    <div class="k-grid-main">
      ${raw(chartCard('Envíos creados (últimos 14 días)', barChart(byDay(all, 'createdAt', () => 1, 14))))}
      ${raw(chartCard('Estado actual', donutChart(countBy(all, 'status', SHIP.label).sort((a, b) => b.value - a.value), { label: all.length })))}
    </div>
    ${raw(card('Requieren tu atención', attention.length ? `<ul class="rp-mini">${attention.map(s => `<li><span><a href="#/envios/${s.id}"><b>${escape(s.code)}</b></a> · ${escape(s.rName)} · ${stBadge(s)}</span><small>${escape((s.attempts || []).filter(a => !a.ok).at(-1)?.reason || (s.status === 'en_punto' ? `Esperando retiro en ${db.get('points', s.redirectPointId)?.name || 'punto'}` : ''))}</small></li>`).join('')}</ul>` : '<p class="muted small">Todo en orden: ningún envío con problemas.</p>'))}
    ${raw(card('Últimos envíos', `<div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Destinatario</th><th>Comuna</th><th>Estado</th></tr></thead><tbody>${all.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(s => `<tr><td><a href="#/envios/${s.id}">${escape(s.code)}</a></td><td>${escape(s.rName)}</td><td>${escape(s.comuna)}</td><td>${stBadge(s)}</td></tr>`).join('')}</tbody></table></div>`))}`;
}

// ================= Detalle de envío para el remitente =================
shipments.cfg.detail = {
  render: s => html`<section class="card rp-mapcard">${raw(cityMap({ points: [{ x: s.x, y: s.y, kind: 'home' }], fit: [s, DEPOT], minW: 6, ratio: 2, label: 'Destino' }))}</section>
    ${s.proof ? raw(card('Prueba de entrega', proofCard(s), { actions: `<button class="btn btn-sm" data-proofcsv="${s.id}">⇩ Comprobante</button>` })) : ''}
    ${raw(card('Intentos de entrega', (s.attempts || []).length ? `<ul class="rp-mini">${s.attempts.map(a => `<li><span class="badge ${a.ok ? 'badge-success' : 'badge-danger'}">${a.ok ? 'Entregado' : 'No entregado'}</span> ${escape(dateTime(a.at))}${a.reason ? ` · ${escape(a.reason)}` : ''}</li>`).join('')}</ul>` : '<p class="muted small">Aún no sale a reparto.</p>'))}`,
  aside: s => html`${raw(card('Envío', kv([['Referencia', s.ref], ['Servicio', svcLabel(s)], ['Fecha de reparto', s.date === todayStr() ? 'Hoy' : s.date === tomorrowStr() ? 'Mañana' : s.date], ['Precio', money(s.price || 0)], s.cod ? ['Cobro contra entrega', money(s.cod)] : null, s.rating ? ['Evaluación del destinatario', `${'★'.repeat(s.rating.stars)} ${s.rating.comment || ''}`] : null])))}${raw(card('Seguimiento', shipTimeline(s, { publicView: true })))}`,
  mount: (view, s) => view.querySelector('[data-proofcsv]')?.addEventListener('click', () => proofDoc(s))
};
shipments.cfg.rowActions = [{ id: 'label', label: 'Etiqueta', icon: '🏷️', run: s => labelModal([s]) }];
shipments.cfg.intro = 'Tus envíos con su estado en vivo. Abre uno para ver el seguimiento y la prueba de entrega.';
pickups.cfg.intro = 'Pide que un conductor pase a buscar tus paquetes a tu bodega. Se suma a la ruta de la zona.';
function proofDoc(s) {
  const p = s.proof;
  modal({ title: `Comprobante de entrega ${s.code}`, size: 'lg', body: html`<article class="rp-doc"><header><b>📦 Pudú Envíos</b><span>Comprobante de entrega</span></header>${kv([['Envío', s.code], ['Remitente', companyName(s.companyId)], ['Referencia', s.ref], ['Destinatario', s.rName], ['Dirección', `${s.address}, ${s.comuna}`], ['Entregado', dateTime(p.at)], ['Recibió', `${p.name} (${p.relation})${p.rut ? ' · ' + p.rut : ''}`], p.payment ? ['Cobro', `${money(p.payment.amount)} · ${p.payment.method}`] : null])}<div class="rp-proof-media">${raw(p.photo ? photoSvg(s.id) : '')}${raw(p.sig ? `<div class="rp-sigbox">${sigSvg(p.sig)}<small class="muted">Firma</small></div>` : '')}</div></article>`, foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" onclick="window.print()">🖨 Imprimir</button>' });
}

// ================= Nuevo envío =================
const NEW_FIELDS = () => shipments.fields.filter(f => !['code', 'date', 'status'].includes(f.name));
function newShipment(view, ctx) {
  const c = company(ctx);
  const fields = NEW_FIELDS().map(f => (f.name === 'companyId' ? { ...f, type: 'select', options: [[c.id, c.name]] } : f));
  const def = { companyId: c.id, service: 'estandar', pieces: 1, weight: 1.5, vol: 12, cod: 0, win: '' };
  view.innerHTML = html`${pageHead('Nuevo envío', 'Completa los datos del destinatario y del paquete. La etiqueta queda lista para imprimir.')}
    <div class="k-grid-main">
      <form class="card" novalidate data-f><div class="k-form">${raw(renderFields(fields, def, shipments))}</div><div class="row" style="margin-top:16px"><button class="btn btn-primary btn-lg" type="submit">Crear envío y etiqueta</button></div></form>
      <aside class="stack"><section class="card rp-quote"><span class="eyebrow">Cotización</span><b data-price>—</b><small class="muted" data-detail></small><div data-map></div></section>
      ${raw(card('Antes de crear', '<ul class="rp-mini"><li>Envíos creados antes de las ' + escape(S().cutoff) + ' salen hoy; después, mañana.</li><li>Con cobro contra entrega el conductor recibe efectivo, tarjeta o transferencia.</li><li>Con PIN, el destinatario recibe un código por SMS que debe mostrar al recibir.</li></ul>'))}</aside>
    </div>`;
  const f = view.querySelector('[data-f]');
  const quote = () => {
    if (!view.querySelector('[data-price]') || !f.isConnected) return;
    const { values } = readFields(f, fields);
    const p = priceFor(values, c);
    view.querySelector('[data-price]').textContent = money(p);
    view.querySelector('[data-detail]').textContent = `${svcLabel(values)} · ${kg(values.weight)} · ${values.pieces || 1} bulto(s)${values.cod ? ' · cobro ' + money(values.cod) : ''} · zona ${db.get('zones', COMUNA[values.comuna] ? 'z-' + COMUNA[values.comuna].zone : '')?.name || '—'}`;
    if (values.comuna && values.address) { const loc = locate(values.address, values.comuna); view.querySelector('[data-map]').innerHTML = cityMap({ points: [{ ...loc, kind: 'home' }], fit: [loc, DEPOT], minW: 6, ratio: 1.6, label: 'Destino' }); }
  };
  f.addEventListener('input', debounce(quote, 200));
  f.addEventListener('change', quote);
  quote();
  let busy = false;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const { values, errors } = readFields(f, fields);
    if (errors.length) { toast(errors[0].msg, 'warning'); f.elements[errors[0].name]?.focus?.(); return; }
    busy = true;
    const row = await shipments.save(values, null, ctx);
    busy = false;
    if (!row) return;
    location.hash = '#/envios/' + row.id;
    setTimeout(() => labelModal([row]), 300);
  });
}

// ================= Carga masiva =================
const CSV_HEAD = 'destinatario;telefono;correo;direccion;comuna;peso_kg;volumen_l;bultos;servicio;ventana;cobro;referencia;contenido';
const CSV_EXAMPLE = [CSV_HEAD,
  'Daniela Fuentes Soto;+56 9 6123 4411;daniela.fs@correo.cl;Los Leones 1290, depto. 504;Providencia;1.2;8;1;estandar;10:00-13:00;0;LA-50211;Lanas merino',
  'Pablo Ruiz Araya;+56 9 7788 1020;;Irarrázaval 4410;Ñuñoa;2.5;20;1;express;;24990;LA-50212;Kit de tejido',
  'Rocío Pinto Vera;+56 9 5544 3322;rocio.p@correo.cl;Gran Avenida 6100;San Miguel;0.8;5;2;estandar;14:00-17:00;0;LA-50213;Madejas',
  'Sin Comuna Válida;+56 9 1111 2222;;Calle Falsa 123;Springfield;1;5;1;estandar;;0;LA-50214;Prueba',
  'Matías Lagos Díaz;123;;Apoquindo 5200;Las Condes;95;10;1;estandar;;0;LA-50215;Telar grande'].join('\n');
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], error: 'Pega el contenido del archivo CSV' };
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].split(sep).map(h => norm(h).trim());
  const need = ['destinatario', 'telefono', 'direccion', 'comuna', 'peso_kg'];
  const miss = need.filter(n => !head.includes(n));
  if (miss.length) return { rows: [], error: `Faltan columnas: ${miss.join(', ')}` };
  const rows = lines.slice(1).map((l, i) => {
    const cells = l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    const o = Object.fromEntries(head.map((h, j) => [h, cells[j] ?? '']));
    const comuna = COMUNA_NAMES.find(c => norm(c) === norm(o.comuna)) || '';
    const v = { rName: o.destinatario, rPhone: o.telefono, rEmail: o.correo || '', address: o.direccion, comuna, weight: +String(o.peso_kg).replace(',', '.'), vol: +(o.volumen_l || 0) || Math.round((+String(o.peso_kg).replace(',', '.') || 1) * 8), pieces: +(o.bultos || 1) || 1,
      service: ['estandar', 'express', 'mismo_dia'].includes(norm(o.servicio)) ? norm(o.servicio) : 'estandar', win: o.ventana || '', cod: +(o.cobro || 0) || 0, ref: o.referencia || '', desc: o.contenido || '', requirePin: false };
    const errs = [];
    if (!v.rName || v.rName.length < 3) errs.push('destinatario');
    if (v.rPhone.replace(/\D/g, '').length < 8) errs.push('teléfono');
    if (v.rEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.rEmail)) errs.push('correo');
    if (!v.address || v.address.length < 5) errs.push('dirección');
    if (!comuna) errs.push(`comuna "${o.comuna}" sin cobertura`);
    if (!(v.weight > 0 && v.weight <= 70)) errs.push('peso (0,1 a 70 kg)');
    if (v.win && !WINDOWS.includes(v.win)) errs.push('ventana');
    if (v.pieces < 1 || v.pieces > 20) errs.push('bultos');
    return { line: i + 2, v, errs };
  });
  return { rows };
}
function bulk(view, ctx) {
  const c = company(ctx);
  let parsed = null, busy = false;
  view.innerHTML = html`${pageHead('Carga masiva', 'Pega el contenido de tu planilla (CSV separado por ; o ,). Validamos fila a fila antes de crear los envíos.', '<button class="btn" data-example>Cargar ejemplo</button><button class="btn" data-template>⇩ Plantilla</button>')}
    <section class="card"><div class="field"><label for="bk-t">Contenido CSV</label><textarea class="textarea rp-csv" id="bk-t" placeholder="${CSV_HEAD}" spellcheck="false"></textarea><small class="muted">Columnas: ${CSV_HEAD.replaceAll(';', ', ')}. Servicio: estandar, express o mismo_dia. Ventana: ${WINDOWS.join(', ')}.</small></div>
      <div class="row"><button class="btn btn-primary" data-validate>Validar</button><span class="small muted" data-info></span></div></section>
    <div data-preview></div>`;
  const ta = view.querySelector('#bk-t'), prev = view.querySelector('[data-preview]');
  view.querySelector('[data-example]').onclick = () => { ta.value = CSV_EXAMPLE; validate(); };
  view.querySelector('[data-template]').onclick = () => downloadCSV('plantilla-envios.csv', [Object.fromEntries(CSV_HEAD.split(';').map(h => [h, '']))]);
  const validate = () => {
    parsed = parseCSV(ta.value);
    if (parsed.error) { prev.innerHTML = ''; return toast(parsed.error, 'warning'); }
    const ok = parsed.rows.filter(r => !r.errs.length);
    view.querySelector('[data-info]').textContent = `${parsed.rows.length} filas · ${ok.length} válidas · ${parsed.rows.length - ok.length} con errores`;
    prev.innerHTML = html`<section class="card"><div class="k-card-head"><div><h3>Vista previa</h3><p>Las filas con error no se importan; corrígelas y vuelve a validar.</p></div><button class="btn btn-primary" data-import ${ok.length ? '' : 'disabled'}>Importar ${ok.length} envío(s)</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Fila</th><th>Destinatario</th><th>Dirección</th><th>Servicio</th><th class="k-num">Precio</th><th>Validación</th></tr></thead><tbody>${parsed.rows.map(r => html`<tr class="${r.errs.length ? 'rp-late' : ''}"><td>${r.line}</td><td>${r.v.rName}</td><td>${r.v.address}${r.v.comuna ? ', ' + r.v.comuna : ''}</td><td>${svcLabel(r.v)}</td><td class="k-num">${r.errs.length ? '—' : money(priceFor(r.v, c))}</td><td>${r.errs.length ? raw(`<span class="badge badge-danger">${escape(r.errs.join(', '))}</span>`) : raw('<span class="badge badge-success">OK</span>')}</td></tr>`)}</tbody></table></div></section>`;
    prev.querySelector('[data-import]')?.addEventListener('click', doImport);
  };
  view.querySelector('[data-validate]').onclick = validate;
  const doImport = () => {
    if (busy || !parsed) return;
    busy = true;
    const created = [];
    parsed.rows.filter(r => !r.errs.length).forEach(r => {
      const v = shipments.cfg.beforeSave({ ...r.v, companyId: c.id }, null, ctx);
      if (!v) return;
      const at = new Date().toISOString();
      created.push(db.insert('shipments', { ...v, statusAt: at, history: [{ at, from: null, to: v.status, by: ctx.user.id, note: 'Carga masiva' }] }));
    });
    db.log('envío', `Carga masiva: ${created.length} envíos de ${c.name}`, ctx.user.id);
    created.forEach(s => notify(s, 'Email', `Hola ${s.rName.split(' ')[0]}: ${c.name} te envió un paquete con Pudú Envíos. Código ${s.code}.`));
    toast(`${created.length} envíos creados`, 'success');
    ta.value = ''; parsed = null; busy = false;
    prev.innerHTML = html`<section class="card"><div class="rp-callout ok"><b>${created.length} envíos creados</b><span>Imprime las etiquetas y pégalas en cada paquete antes del retiro.</span><button class="btn btn-sm btn-primary" data-labels>🏷️ Imprimir etiquetas</button><a class="btn btn-sm" href="#/retiros">Pedir retiro</a></div></section>`;
    prev.querySelector('[data-labels]').onclick = () => labelModal(created.map(s => ops.get(s.id)));
  };
}

// ================= Etiquetas =================
function labels(view, ctx) {
  const list = mine(ctx).filter(s => s.kind === 'entrega' && ['creado', 'en_bodega'].includes(s.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sel = new Set(list.filter(s => s.status === 'creado').map(s => s.id));
  view.innerHTML = html`${pageHead('Etiquetas', 'Imprime en hoja A4 o en rollo térmico 10×15 cm.', '<button class="btn btn-primary" data-print>🖨 Imprimir seleccionadas</button>')}
    ${list.length ? html`<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th><input type="checkbox" data-all aria-label="Todas" checked></th><th>Código</th><th>Destinatario</th><th>Comuna</th><th>Estado</th></tr></thead><tbody>${list.map(s => html`<tr><td><input type="checkbox" data-sel="${s.id}" ${sel.has(s.id) ? 'checked' : ''} aria-label="${s.code}"></td><td><b>${s.code}</b></td><td>${s.rName}</td><td>${s.comuna}</td><td>${raw(stBadge(s))}</td></tr>`)}</tbody></table></div></section>
      <h2 class="rp-h2">Vista previa</h2><div class="rp-labels">${list.slice(0, 2).map(s => raw(labelHtml(s)))}</div>` : raw(emptyState({ icon: '🏷️', title: 'No hay etiquetas pendientes', text: 'Crea un envío para generar su etiqueta.', action: '<a class="btn btn-primary" href="#/nuevo">Nuevo envío</a>' }))}`;
  view.querySelectorAll('[data-sel]').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); }));
  view.querySelector('[data-all]')?.addEventListener('change', e => { view.querySelectorAll('[data-sel]').forEach(c => { c.checked = e.target.checked; e.target.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); }); });
  view.querySelector('[data-print]').onclick = () => { if (!sel.size) return toast('Selecciona al menos una etiqueta', 'warning'); labelModal([...sel].map(ops.get)); };
}

// ================= Pruebas de entrega =================
function proofs(view, ctx) {
  let q = '';
  const paint = () => {
    const list = mine(ctx).filter(s => s.proof && s.kind === 'entrega' && (!q || norm(`${s.code} ${s.rName} ${s.ref} ${s.comuna} ${s.proof.name}`).includes(norm(q)))).sort((a, b) => b.proof.at.localeCompare(a.proof.at));
    const grid = view.querySelector('[data-grid]');
    grid.innerHTML = list.length ? list.map(s => html`<article class="card rp-proofcard"><div class="rp-proofthumb">${raw(s.proof.photo ? photoSvg(s.id) : sigSvg(s.proof.sig))}</div><b><a href="#/envios/${s.id}">${s.code}</a> · ${s.rName}</b><small>${s.address}, ${s.comuna}</small><small>Recibió <b>${s.proof.name}</b> (${s.proof.relation}) · ${dateTime(s.proof.at)}</small>${s.proof.sig ? raw(`<div class="rp-sigmini">${sigSvg(s.proof.sig)}</div>`) : ''}${s.rating ? html`<small>${'★'.repeat(s.rating.stars)}${'☆'.repeat(5 - s.rating.stars)} ${s.rating.comment}</small>` : ''}</article>`).join('') : emptyState({ icon: '🖊️', title: 'Sin pruebas de entrega', text: q ? 'No hay resultados para esa búsqueda.' : 'Aparecerán aquí cuando se entreguen tus envíos.' });
    view.querySelector('[data-n]').textContent = `${list.length} entregas`;
    return list;
  };
  view.innerHTML = html`${pageHead('Pruebas de entrega', 'Foto, firma y datos de quién recibió cada paquete.', '<button class="btn" data-csv>⇩ CSV</button>')}
    <div class="k-toolbar"><input class="input k-search" type="search" placeholder="Buscar por código, destinatario, referencia…" aria-label="Buscar" data-q><span class="small muted" data-n></span></div><div class="rp-proofgrid" data-grid></div>`;
  view.querySelector('[data-q]').addEventListener('input', debounce(e => { q = e.target.value; paint(); }, 150));
  view.querySelector('[data-csv]').onclick = () => { const l = paint(); if (!l.length) return toast('No hay filas', 'warning'); downloadCSV('pruebas-de-entrega.csv', l.map(s => ({ codigo: s.code, referencia: s.ref, destinatario: s.rName, direccion: s.address, comuna: s.comuna, recibio: s.proof.name, relacion: s.proof.relation, rut: s.proof.rut || '', fecha: s.proof.at, foto: s.proof.photo ? 'sí' : 'no', firma: s.proof.sig ? 'sí' : 'no', cobro: s.proof.payment?.amount || 0 }))); };
  paint();
  return { refresh: paint };
}

app.panel({
  page: 'empresa.html', sub: 'Portal de empresas', topbar: '<a class="btn btn-sm btn-primary k-hide-sm" href="#/nuevo">＋ Nuevo envío</a>',
  nav: [
    { section: 'Envíos' },
    { id: '', label: 'Resumen', icon: '📊', render: summary, watch: ['shipments'] },
    shipments.section({ label: 'Mis envíos', count: () => db.count('shipments', s => s.companyId === app.auth.current()?.companyId && s.status === 'fallido') }),
    { id: 'nuevo', label: 'Nuevo envío', icon: '➕', render: newShipment, watch: [] },
    { id: 'masiva', label: 'Carga masiva', icon: '⇪', render: bulk, watch: [] },
    { id: 'etiquetas', label: 'Etiquetas', icon: '🏷️', render: labels, watch: [] },
    pickups.section({ count: () => db.count('shipments', s => s.kind === 'retiro' && s.companyId === app.auth.current()?.companyId && s.status === 'solicitado') }),
    { id: 'pruebas', label: 'Pruebas de entrega', icon: '🖊️', render: proofs, watch: ['shipments'] },
    { section: 'Cuenta' },
    invoices.section({ label: 'Facturas', count: () => db.count('invoices', f => f.companyId === app.auth.current()?.companyId && f.status === 'vencida') }),
    accountSection(app, { fields: [{ name: 'phone', label: 'Teléfono', type: 'tel' }] })
  ]
});
