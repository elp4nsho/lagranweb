// Cuenta del cliente: mis autos, configuraciones, cotizaciones, test drives, créditos, servicio y documentos.
import { escape, money, toast, confirm, formModal } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, HOME_BY_ROLE } from '../data/db.js';
import { model, brand, version, color, decodeConfig, priceConfig, nextService, recallsFor, warrantyFor, showroom, userName, quoteBadge, finBadge, tdBadge, apptBadge, APPT_TYPES, OT_FLOW, APPT_STATUS, FIN_LABEL, addTimeline, moveLead, otTotal } from '../shared/domain.js';
import { carSVG, carOf } from '../shared/car.js';
import { openDoc, quoteHTML, invoiceHTML, padronHTML, otHTML, specSheetHTML } from '../shared/docs.js';
import { fdate, patenteFormat, nf, uiGet, uiSet, parseYmd, rutValid, rutFormat } from '../shared/util.js';
import { meter } from '../shared/charts.js';
import { icon } from '../shared/icons.js';

const TABS = [['autos', 'Mis autos', 'car'], ['configuraciones', 'Configuraciones', 'palette'], ['cotizaciones', 'Cotizaciones', 'file'], ['test-drives', 'Test drives', 'steer'], ['financiamiento', 'Financiamiento', 'card'], ['servicio', 'Servicio', 'wrench'], ['documentos', 'Documentos', 'clipboard']];

export function renderAccount(el, { tab = 'autos' } = {}) {
  const u = auth.current();
  if (!u) return guest(el);
  if (u.role !== 'cliente') { el.innerHTML = `<section class="section"><div class="container empty card"><h2>Hola, ${escape(u.name)}</h2><p>Tu cuenta es de equipo (${escape(auth.roleName(u.role))}).</p><a class="btn btn-primary" href="${HOME_BY_ROLE[u.role]}">Ir a mi panel</a></div></section>`; return; }
  const mine = r => r.customerId === u.id || (r.email && r.email.toLowerCase() === u.email.toLowerCase());
  const leadsMine = db.query('leads', mine), leadIds = new Set(leadsMine.map(l => l.id));
  const D = {
    cars: db.query('vehicles', v => v.ownerId === u.id),
    configs: db.query('configs', c => c.userId === u.id),
    quotes: db.query('quotes', q => mine(q) || leadIds.has(q.leadId)),
    tds: db.query('testdrives', t => t.customerId === u.id || leadIds.has(t.leadId)),
    fins: db.query('finApps', mine),
    appts: db.query('appointments', a => a.customerId === u.id || db.get('vehicles', a.vehicleId)?.ownerId === u.id).sort((a, b) => b.date.localeCompare(a.date)),
    sales: db.query('sales', s => s.customerId === u.id)
  };
  const counts = { autos: D.cars.length, configuraciones: D.configs.length, cotizaciones: D.quotes.length, 'test-drives': D.tds.filter(t => t.status === 'agendado').length, financiamiento: D.fins.length, servicio: D.appts.filter(a => !['entregada', 'cancelada'].includes(a.status)).length };
  el.innerHTML = `<section class="section tight account-head"><div class="container portal-head"><span class="avatar" style="--av:${u.color || 'var(--primary)'}">${escape(initials(u.name))}</span><div><span class="eyebrow">Mi cuenta Autoplaza</span><h1>Hola, ${escape(u.name.split(' ')[0])}</h1><p class="muted">${escape(u.email)}${u.rut ? ' · RUT ' + escape(u.rut) : ''}</p></div><button class="btn btn-ghost btn-sm" data-logout>${icon('logout', 16)} Cerrar sesión</button></div></section>
  <section class="section tight"><div class="container account-layout">
    <nav class="account-nav card" aria-label="Mi cuenta">${TABS.map(([k, l, i]) => `<a href="#/cuenta/${k}" class="${k === tab ? 'active' : ''}">${icon(i, 17)}<span>${l}</span>${counts[k] ? `<b class="count">${counts[k]}</b>` : ''}</a>`).join('')}</nav>
    <div class="account-body" data-body></div></div></section>`;
  el.querySelector('[data-logout]').onclick = () => { auth.logout(); location.hash = '#/'; location.reload(); };
  const body = el.querySelector('[data-body]');
  const fns = { autos: cars, configuraciones: configs, cotizaciones: quotes, 'test-drives': tds, financiamiento: fins, servicio: service, documentos: docs };
  (fns[tab] || cars)(body, D, u);
  body.addEventListener('click', e => onAction(e, D, u));
}

const empty = (ico, t, cta = '') => `<div class="card empty">${icon(ico, 36)}<p>${t}</p>${cta}</div>`;

function cars(b, D) {
  b.innerHTML = D.cars.length ? D.cars.map(v => {
    const ns = nextService(v), rc = recallsFor(v), w = warrantyFor(v), m = model(v.modelId);
    const pctKm = Math.max(0, Math.min(100, 100 - ns.kmLeft / ((ns.nextKm - (v.lastServiceKm || 0)) || 1) * 100));
    return `<article class="card my-car"><div class="my-car-art">${carSVG({ body: m?.body || 'sedan', paint: v.hex, plate: patenteFormat(v.patente), fuel: m?.fuel })}<span class="plate mono">${patenteFormat(v.patente)}</span></div>
      <div class="stack"><div class="row between"><div><span class="eyebrow">${escape(brand(v.brandId)?.name)} · ${v.year}</span><h3>${escape(v.modelName)}</h3><small class="muted">${escape(v.colorName)} · VIN ${escape(v.vin)}</small></div><button class="btn btn-sm btn-ghost" data-km="${v.id}">${icon('gauge', 15)} ${nf(v.km)} km</button></div>
        ${rc.map(r => `<div class="alert-box danger">${icon('alert', 18)}<span><b>Recall pendiente ${r.code}:</b> ${escape(r.title)}. Sin costo.</span><a class="btn btn-sm btn-danger" href="#/posventa">Agendar</a></div>`).join('')}
        <div class="next-svc ${ns.due ? 'due' : ''}"><div class="row between"><b>${icon('wrench', 16)} Próxima mantención: ${nf(ns.nextKm)} km</b><span class="badge badge-${ns.due ? 'warning' : 'success'}">${ns.due ? 'Agenda pronto' : 'Al día'}</span></div>${meter(pctKm, ns.due ? 'warning' : '')}<small class="muted">Faltan ${nf(Math.max(0, ns.kmLeft))} km o hasta el ${fdate(ns.byDate)} · Pauta ${money(ns.plan?.price)}</small></div>
        <div class="row small">${w ? `<span class="badge badge-${w.active ? 'success' : 'danger'}">${icon('shield', 13)} Garantía ${w.active ? 'hasta ' + fdate(w.until) : 'vencida'}</span>` : ''}<span class="muted">Última mantención: ${v.lastServiceKm ? nf(v.lastServiceKm) + ' km' : '—'}${v.lastServiceDate ? ' · ' + fdate(v.lastServiceDate) : ''}</span></div>
        <div class="row"><a class="btn btn-primary btn-sm" href="#/posventa">${icon('calendar', 15)} Agendar mantención</a><button class="btn btn-sm" data-padron="${v.id}">${icon('file', 15)} Padrón</button><a class="btn btn-sm btn-ghost" href="#/tasacion">${icon('swap', 15)} Tasar para renovar</a></div></div></article>`;
  }).join('') : empty('car', 'Aún no tienes autos registrados con nosotros.', '<a class="btn btn-primary" href="#/modelos">Ver modelos</a>');
}

function configs(b, D) {
  const local = uiGet('savedConfigs', []).map(code => ({ id: 'local-' + code, code, name: 'Guardada en este navegador', local: true }));
  const all = [...D.configs, ...local].filter(c => decodeConfig(c.code));
  b.innerHTML = all.length ? `<div class="grid-2">${all.map(c => { const p = priceConfig(decodeConfig(c.code)); return `<article class="card cfg-card">${carSVG({ body: p.m.body, paint: p.col.hex, wheel: { style: p.w.style, rim: p.w.rim }, fuel: p.m.fuel })}<span class="eyebrow">${escape(c.name)}</span><h3>${escape(brand(p.m.brandId).name)} ${escape(p.m.name)}</h3><p class="small muted">${escape(p.v.name)} · ${escape(p.col.name)} · ${p.packs.length} packs · ${p.accs.length} accesorios</p><p><b>${money(p.total)}</b> <small class="muted">con bonos vigentes</small></p>
    <div class="row"><a class="btn btn-primary btn-sm" href="#/config/${encodeURIComponent(c.code)}">Abrir</a><a class="btn btn-sm" href="#/cotizar?config=${encodeURIComponent(c.code)}">Cotizar</a><button class="btn btn-sm btn-ghost btn-icon" data-delcfg="${c.id}" aria-label="Eliminar">${icon('trash', 15)}</button></div></article>`; }).join('')}</div>`
    : empty('palette', 'No tienes configuraciones guardadas.', '<a class="btn btn-primary" href="#/modelos">Configurar un auto</a>');
}

function quotes(b, D, u) {
  const pend = db.query('leads', l => (l.customerId === u.id || l.email === u.email) && l.type === 'cotizacion' && !l.quoteId && l.stage !== 'perdido');
  b.innerHTML = (D.quotes.length || pend.length) ? `<div class="stack">${D.quotes.map(q => { const m = model(q.modelId); return `<article class="card list-item">${carOf(m, color(m, q.colorId)?.hex, { cls: 'li-car' })}<div class="grow"><b>${escape(brand(m.brandId).name)} ${escape(m.name)} ${escape(version(m, q.versionId)?.name || '')}</b><small class="muted">${q.number} · ${fdate(q.createdAt)} · vence ${fdate(q.validUntil)} · Ejecutivo ${escape(userName(q.sellerId))}</small></div><div class="li-end"><b>${money(q.total)}</b>${quoteBadge(q.status)}</div>
      <div class="row li-acts"><button class="btn btn-sm" data-quote="${q.id}">${icon('eye', 15)} Ver cotización</button>${['enviada', 'aprobada'].includes(q.status) ? `<button class="btn btn-sm btn-primary" data-accept="${q.id}">${icon('check', 15)} Aceptar y reservar</button>` : ''}</div></article>`; }).join('')}
    ${pend.map(l => `<article class="card list-item"><span class="icon-bubble">${icon('clock', 20)}</span><div class="grow"><b>Solicitud: ${escape(model(l.modelId)?.name)}</b><small class="muted">${fdate(l.createdAt)} · ${l.sellerId ? 'Asignada a ' + escape(userName(l.sellerId)) : 'Asignando ejecutivo'}</small></div><span class="badge badge-info">En preparación</span></article>`).join('')}</div>`
    : empty('file', 'No tienes cotizaciones.', '<a class="btn btn-primary" href="#/cotizar">Solicitar cotización</a>');
}

function tds(b, D) {
  b.innerHTML = D.tds.length ? `<div class="stack">${D.tds.sort((a, c) => c.date.localeCompare(a.date)).map(t => { const m = model(t.modelId); return `<article class="card list-item">${carOf(m, m.colors[1]?.hex, { cls: 'li-car' })}<div class="grow"><b>${escape(m.name)}</b><small class="muted">${parseYmd(t.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })} · ${t.slot} · ${escape(showroom(t.showroomId).name)}</small></div>${tdBadge(t.status)}${t.status === 'agendado' ? `<button class="btn btn-sm btn-ghost" data-cancel-td="${t.id}">Cancelar</button>` : ''}</article>`; }).join('')}</div>`
    : empty('steer', 'No tienes test drives.', '<a class="btn btn-primary" href="#/test-drive">Agendar test drive</a>');
}

function fins(b, D) {
  const steps = ['recibida', 'en_evaluacion', 'decision'];
  b.innerHTML = D.fins.length ? `<div class="stack">${D.fins.map(f => { const m = model(f.modelId), p = db.get('finProducts', f.productId); const idx = f.status === 'recibida' ? 0 : f.status === 'en_evaluacion' ? 1 : 2; return `<article class="card stack"><div class="row between"><div><b>${f.number} · ${escape(m?.name)}</b><br><small class="muted">${escape(p?.name || 'Contado')} · ${f.plazo} cuotas de ${money(f.cuota)} · pie ${money(f.pie)}</small></div>${finBadge(f.status)}</div>
    <ol class="steps mini">${['Recibida', 'En evaluación', 'Resolución'].map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'current' : ''}">${s}</li>`).join('')}</ol>
    ${f.conditions && f.status !== 'rechazada' ? `<div class="alert-box warning">${icon('alert', 16)} <span>Condición: <b>${escape(f.conditions)}</b></span></div>` : ''}${f.status === 'rechazada' ? `<p class="small">Tu ejecutivo te propondrá alternativas (más pie o codeudor).</p>` : ''}${f.status === 'aprobada' ? `<p class="small">${icon('check', 14)} ¡Crédito aprobado! Tu ejecutivo coordinará la firma y la entrega.</p>` : ''}
    <small class="muted">Ingresada ${fdate(f.createdAt)}${f.analystId ? ' · Analista ' + escape(userName(f.analystId)) : ''}</small></article>`; }).join('')}</div>`
    : empty('card', 'No tienes solicitudes de crédito.', '<a class="btn btn-primary" href="#/financiamiento">Simular crédito</a>');
}

function service(b, D) {
  b.innerHTML = D.appts.length ? `<div class="stack">${D.appts.map(a => {
    const ot = a.otId ? db.get('workorders', a.otId) : null;
    const flow = ['agendada', ...OT_FLOW.filter(x => x !== 'esperando_repuestos' || a.status === 'esperando_repuestos')], idx = flow.indexOf(a.status);
    const done = ot ? ot.checklist.filter(c => c.ok).length : 0;
    return `<article class="card stack svc-card"><div class="row between"><div><b>${escape(APPT_TYPES[a.type])} · <span class="mono">${patenteFormat(a.patente)}</span></b><br><small class="muted">${a.number} · ${fdate(a.date)} ${a.slot} · ${escape(showroom(a.showroomId).name)} · Asesor ${escape(userName(a.advisorId))}</small></div>${apptBadge(a.status)}</div>
      ${a.status !== 'cancelada' ? `<ol class="steps mini">${flow.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'current' : ''}">${APPT_STATUS[s][0]}</li>`).join('')}</ol>` : ''}
      ${ot ? `<div class="small"><b>OT ${ot.number}</b> · checklist ${done}/${ot.checklist.length} ${meter(done / Math.max(1, ot.checklist.length) * 100)}</div>
        ${(ot.upsellItems || []).filter(x => x.status === 'propuesto').map(x => `<div class="alert-box warning">${icon('wrench', 16)}<span>Tu asesor recomienda: <b>${escape(x.desc)}</b> · ${money(x.price)}</span><button class="btn btn-sm btn-primary" data-upsell="${ot.id}|${x.id}|aceptado">Aprobar</button><button class="btn btn-sm btn-ghost" data-upsell="${ot.id}|${x.id}|rechazado">No, gracias</button></div>`).join('')}
        <div class="row between"><span class="small">Total actual: <b>${money(otTotal(ot))}</b></span><button class="btn btn-sm" data-ot="${ot.id}">${icon('file', 15)} Ver OT</button></div>` : ''}
      ${a.status === 'agendada' ? `<div class="row"><button class="btn btn-sm btn-ghost" data-cancel-ap="${a.id}">Cancelar hora</button></div>` : ''}</article>`; }).join('')}</div>`
    : empty('wrench', 'No tienes horas de taller.', '<a class="btn btn-primary" href="#/posventa">Agendar mantención</a>');
}

function docs(b, D) {
  const ots = db.query('workorders', o => D.cars.some(v => v.id === o.vehicleId) && o.status === 'entregada');
  const rows = [...D.sales.map(s => [`Factura ${s.number}`, `${model(s.modelId)?.name} · ${fdate(s.date)}`, `data-inv="${s.id}"`]), ...D.cars.map(v => [`Padrón ${patenteFormat(v.patente)}`, `${v.modelName} ${v.year}`, `data-padron="${v.id}"`]), ...ots.map(o => [`Orden de trabajo ${o.number}`, `${o.modelName} · ${fdate(o.date)}`, `data-ot="${o.id}"`])];
  b.innerHTML = rows.length ? `<div class="card"><ul class="doc-rows">${rows.map(([t, s, a]) => `<li>${icon('file', 20)}<span class="grow"><b>${t}</b><small class="muted">${escape(s)}</small></span><button class="btn btn-sm" ${a}>${icon('download', 15)} Ver / PDF</button></li>`).join('')}</ul></div>` : empty('clipboard', 'Aún no tienes documentos.');
}

async function onAction(e, D, u) {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.padron) { const v = db.get('vehicles', d.padron); openDoc('Padrón', padronHTML(v), { name: 'padron-' + v.patente }); }
  if (d.inv) openDoc('Factura', invoiceHTML(db.get('sales', d.inv)), { name: 'factura' });
  if (d.ot) openDoc('Orden de trabajo', otHTML(db.get('workorders', d.ot)), { name: 'ot' });
  if (d.quote) openDoc('Cotización', quoteHTML(db.get('quotes', d.quote)), { name: 'cotizacion' });
  if (d.accept) { const q = db.get('quotes', d.accept); if (!await confirm(`¿Aceptas la cotización ${q.number} por ${money(q.total)}? Tu ejecutivo reservará una unidad y te contactará para el pago de la reserva.`, { ok: 'Aceptar cotización' })) return; db.update('quotes', q.id, { status: 'aceptada' }); if (q.leadId) { addTimeline(q.leadId, 'cotizacion', `El cliente aceptó la cotización ${q.number} desde su cuenta.`, u.id); moveLead(q.leadId, 'negociacion'); } db.log('cotización', `${u.name} aceptó ${q.number}`, u.id); toast('¡Cotización aceptada! Tu ejecutivo te contactará hoy.', 'success'); }
  if (d.delcfg) { if (d.delcfg.startsWith('local-')) uiSet('savedConfigs', uiGet('savedConfigs', []).filter(c => 'local-' + c !== d.delcfg)); else db.remove('configs', d.delcfg); toast('Configuración eliminada', 'success'); location.hash.includes('configuraciones') && dispatchEvent(new HashChangeEvent('hashchange')); }
  if (d.cancelTd) { if (!await confirm('¿Cancelar este test drive?', { danger: true, ok: 'Cancelar test drive' })) return; const td = db.update('testdrives', d.cancelTd, { status: 'cancelado' }); td.leadId && addTimeline(td.leadId, 'sistema', 'El cliente canceló el test drive desde su cuenta.', u.id); toast('Test drive cancelado', 'success'); }
  if (d.cancelAp) { if (!await confirm('¿Cancelar esta hora de taller?', { danger: true, ok: 'Cancelar hora' })) return; db.update('appointments', d.cancelAp, { status: 'cancelada' }); toast('Hora cancelada', 'success'); }
  if (d.upsell) { const [oid, xid, st] = d.upsell.split('|'); const ot = db.get('workorders', oid); db.update('workorders', oid, { upsellItems: ot.upsellItems.map(x => x.id === xid ? { ...x, status: st } : x), log: [...(ot.log || []), { at: new Date().toISOString(), text: `Cliente ${st === 'aceptado' ? 'aprobó' : 'rechazó'} adicional en línea` }] }); toast(st === 'aceptado' ? 'Trabajo adicional aprobado' : 'Recomendación rechazada', 'success'); }
  if (d.km) { const v = db.get('vehicles', d.km); const r = await formModal({ title: `Actualizar kilometraje · ${patenteFormat(v.patente)}`, fields: [{ name: 'km', label: 'Kilometraje actual', type: 'number', value: v.km, required: true }] }); if (r && r.km >= v.km) { db.update('vehicles', v.id, { km: r.km }); toast('Kilometraje actualizado', 'success'); } else if (r) toast('El kilometraje no puede ser menor al registrado', 'warning'); }
}

function guest(el) {
  el.innerHTML = `<section class="section"><div class="container auth-card">
    <div class="card stack"><span class="eyebrow">Mi cuenta</span><h2>Ingresa a tu cuenta</h2><p class="muted">Revisa tus autos, mantenciones, cotizaciones, créditos y documentos.</p><a class="btn btn-primary btn-lg" href="login.html?next=index.html%23%2Fcuenta">${icon('user', 18)} Ingresar</a><p class="small muted">Demo: cliente@autoplaza.cl / cliente123</p></div>
    <form class="card stack" data-reg novalidate><span class="eyebrow">¿Primera vez?</span><h2>Crea tu cuenta</h2>
      <div class="field"><label for="g-name">Nombre completo</label><input class="input" id="g-name" name="name" required></div>
      <div class="field"><label for="g-rut">RUT</label><input class="input" id="g-rut" name="rut" required></div>
      <div class="field"><label for="g-email">Correo</label><input class="input" id="g-email" name="email" type="email" required></div>
      <div class="field"><label for="g-pass">Contraseña</label><input class="input" id="g-pass" name="password" type="password" minlength="6" required></div>
      <button class="btn btn-primary">Crear cuenta</button></form></div></section>`;
  const f = el.querySelector('[data-reg]');
  f.onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    if (v.name.trim().length < 3 || !rutValid(v.rut) || !/\S+@\S+\.\S+/.test(v.email) || v.password.length < 6) return toast('Completa nombre, RUT válido, correo y contraseña (mín. 6)', 'warning');
    try { await auth.register({ name: v.name.trim(), email: v.email.trim(), password: v.password, role: 'cliente', rut: rutFormat(v.rut), color: '#0ea5e9' }); toast('¡Cuenta creada!', 'success'); location.hash = '#/cuenta'; dispatchEvent(new HashChangeEvent('hashchange')); }
    catch (err) { toast(err.message, 'error'); }
  };
}
