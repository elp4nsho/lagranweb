// Ficha del lead: datos, línea de tiempo, actividades, test drive, cotizaciones, crédito, reserva y cierre.
import { escape, money, toast, formModal, dateTime, ago } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead, kv } from '../shared/shell.js';
import { model, version, brand, userName, showroom, stageBadge, STAGES, STAGE_LABEL, SOURCE_LABEL, moveLead, addTimeline, quoteBadge, finBadge, tdBadge, unitBadge, modelLabel, settings, isOpenLead } from '../shared/domain.js';
import { openDoc, quoteHTML } from '../shared/docs.js';
import { carCellHTML } from '../shared/cells.js';
import { quoteModal, reserveModal, closeSale, askLost } from './actions.js';
import { simulate } from '../shared/finance.js';
import { ymd, addDays, fdate, rutValid, rutFormat } from '../shared/util.js';
import { icon } from '../shared/icons.js';

const KINDS = { nota: ['Nota', 'edit'], llamada: ['Llamada', 'phone'], whatsapp: ['WhatsApp', 'chat'], email: ['Correo', 'mail'] };
export function renderLead(v, { id }, _q, { user }) {
  const l = db.get('leads', id);
  if (!l) { v.innerHTML = '<div class="card empty">Lead no encontrado. <a href="#/">Volver</a></div>'; return; }
  if (user.role === 'vendedor' && l.sellerId !== user.id) { v.innerHTML = `<div class="card empty">${icon('lock', 36)}<h2>Este lead está asignado a otro ejecutivo</h2><a class="btn" href="#/">Volver al pipeline</a></div>`; return; }
  const m = model(l.modelId), quotes = db.query('quotes', q => q.leadId === l.id), tds = db.query('testdrives', t => t.leadId === l.id), fins = db.query('finApps', a => a.leadId === l.id), unit = db.find('units', u => u.leadId === l.id && ['reservado', 'vendido', 'entregado'].includes(u.status));
  const open = isOpenLead(l), idx = STAGES.indexOf(l.stage);
  v.innerHTML = `${pageHead(l.name, `${stageBadge(l.stage)} · ${escape(SOURCE_LABEL[l.source] || l.source)} · creado ${ago(l.createdAt)}${user.role !== 'vendedor' ? ' · ' + escape(userName(l.sellerId)) : ''}`, `<a class="btn btn-ghost" href="#/">${icon('back', 16)} Pipeline</a>${open ? `<button class="btn btn-danger" data-lost>Perdido</button><button class="btn btn-primary" data-close>${icon('handshake', 16)} Cerrar venta</button>` : ''}`)}
  <ol class="steps">${STAGES.slice(0, 7).map((s, i) => `<li class="${l.stage === 'perdido' ? '' : i < idx ? 'done' : i === idx ? 'current' : ''}"><button class="step-btn" data-stage="${s}" ${open && s !== 'vendido' ? '' : 'disabled'}>${STAGE_LABEL[s]}</button></li>`).join('')}</ol>
  <div class="grid-main"><div class="stack">
    <div class="card"><div class="card-title"><h3>${icon('clock', 18)} Actividad</h3></div>
      ${open ? `<form class="stack" data-act><div class="seg-tabs">${Object.entries(KINDS).map(([k, [lb]], i) => `<label class="seg-tab ${i === 0 ? 'active' : ''}"><input type="radio" name="kind" value="${k}" ${i === 0 ? 'checked' : ''} hidden>${lb}</label>`).join('')}</div><div class="row"><input class="input grow" name="text" placeholder="Ej: llamé, pide cotizar con 36 cuotas" aria-label="Detalle de la actividad"><button class="btn btn-primary">Registrar</button></div></form>` : ''}
      <ol class="timeline" style="margin-top:16px">${(l.timeline || []).slice().reverse().map(t => `<li class="k-${t.kind}"><b>${escape(t.text)}</b><small>${KINDS[t.kind]?.[0] || t.kind} · ${dateTime(t.at)}${t.by ? ' · ' + escape(userName(t.by)) : ''}</small></li>`).join('') || '<li class="muted">Sin actividad</li>'}</ol></div>
    <div class="card"><div class="card-title"><h3>${icon('file', 18)} Cotizaciones</h3>${open ? `<button class="btn btn-sm btn-primary" data-quote>${icon('plus', 15)} Nueva cotización</button>` : ''}</div>
      ${quotes.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>N°</th><th>Versión</th><th>Desc.</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>${quotes.map(q => `<tr><td class="mono">${q.number}</td><td>${escape(version(q.modelId, q.versionId)?.name)}</td><td>${String(q.discountPct).replace('.', ',')}%</td><td><b>${money(q.total)}</b></td><td>${quoteBadge(q.status)}${q.approvalNote ? `<br><small class="muted">${escape(q.approvalNote)}</small>` : ''}</td><td><button class="btn btn-sm btn-ghost" data-pq="${q.id}">${icon('print', 15)}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Sin cotizaciones. Emite una con el configurador de la derecha.</p>'}</div>
  </div><div class="stack">
    <div class="card"><div class="card-title"><h3>Cliente</h3><span class="badge badge-${l.temp === 'caliente' ? 'danger' : l.temp === 'frio' ? 'info' : 'warning'}">${escape(l.temp || 'tibio')}</span></div>${kv([['Teléfono', l.phone ? `<a href="tel:${escape(l.phone)}">${escape(l.phone)}</a>` : '—'], ['Correo', escape(l.email || '—')], ['RUT', escape(l.rut || '—')], ['Sucursal', escape(showroom(l.showroomId)?.city || '')], ['Pago', escape(l.payment || '—')], ['Retoma', l.wantsTrade ? 'Sí' : '—']])}
      ${open ? `<div class="row" style="margin-top:10px"><select class="select inline-edit" data-temp aria-label="Temperatura" style="max-width:none">${['caliente', 'tibio', 'frio'].map(t => `<option ${t === l.temp ? 'selected' : ''}>${t}</option>`).join('')}</select>${l.phone ? `<a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/${l.phone.replace(/\D/g, '')}">${icon('chat', 15)} WhatsApp</a>` : ''}</div>` : ''}</div>
    <div class="card"><h3>Interés</h3>${carCellHTML(l.modelId, null, escape(version(m, l.versionId)?.name || ''))}<p class="small" style="margin-top:8px">Valor estimado <b>${money(l.value)}</b>${l.configCode ? ` · <a href="index.html#/config/${encodeURIComponent(l.configCode)}" target="_blank">ver configuración del cliente</a>` : ''}</p>
      <div class="row">${open ? `<button class="btn btn-sm" data-reserve>${icon('lock', 15)} ${unit ? 'Cambiar reserva' : 'Reservar VIN'}</button>` : ''}${unit ? `<span class="small">${unitBadge(unit.status)} <span class="mono">${unit.vin.slice(-8)}</span></span>` : ''}</div></div>
    <div class="card"><div class="card-title"><h3>${icon('steer', 18)} Test drive</h3>${open ? `<button class="btn btn-sm" data-td>${icon('plus', 15)} Agendar</button>` : ''}</div>${tds.map(t => `<div class="row between small"><span>${fdate(t.date)} ${t.slot} · ${escape(showroom(t.showroomId).city)}</span>${tdBadge(t.status)}</div>`).join('') || '<p class="muted small">Sin test drive.</p>'}</div>
    <div class="card"><div class="card-title"><h3>${icon('card', 18)} Crédito</h3>${open && !fins.some(a => ['recibida', 'en_evaluacion'].includes(a.status)) ? `<button class="btn btn-sm" data-fin>${icon('plus', 15)} Ingresar solicitud</button>` : ''}</div>${fins.map(a => `<div class="row between small"><span class="mono">${a.number}</span>${finBadge(a.status)}</div>${a.conditions ? `<small class="muted">${escape(a.conditions)}</small>` : ''}`).join('') || '<p class="muted small">Sin solicitudes.</p>'}</div>
  </div></div>`;
  const lead = () => db.get('leads', id);
  v.querySelector('[data-act]')?.addEventListener('submit', e => { e.preventDefault(); const f = e.target, t = f.text.value.trim(); if (!t) return toast('Escribe el detalle', 'warning'); addTimeline(id, f.kind.value, t, user.id); if (lead().stage === 'nuevo' && f.kind.value !== 'nota') moveLead(id, 'contactado'); db.update('leads', id, {}); toast('Actividad registrada', 'success'); });
  v.querySelector('[data-act]')?.addEventListener('change', e => { if (e.target.name === 'kind') e.currentTarget.querySelectorAll('.seg-tab').forEach(x => x.classList.toggle('active', x.contains(e.target))); });
  v.querySelector('[data-temp]')?.addEventListener('change', e => { db.update('leads', id, { temp: e.target.value }); toast('Temperatura actualizada', 'success', 1200); });
  v.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.stage) { moveLead(id, b.dataset.stage); toast(`Etapa: ${STAGE_LABEL[b.dataset.stage]}`, 'success', 1400); }
    if (b.hasAttribute('data-quote')) quoteModal(lead());
    if (b.dataset.pq) openDoc('Cotización', quoteHTML(db.get('quotes', b.dataset.pq)));
    if (b.hasAttribute('data-reserve')) reserveModal(lead());
    if (b.hasAttribute('data-close')) await closeSale(lead());
    if (b.hasAttribute('data-lost')) await askLost(lead());
    if (b.hasAttribute('data-td')) {
      const r = await formModal({ title: 'Agendar test drive', fields: [{ name: 'date', label: 'Fecha', type: 'date', value: addDays(ymd(), 1), required: true }, { name: 'slot', label: 'Hora', type: 'select', options: settings().testDriveSlots }, { name: 'showroomId', label: 'Sucursal', type: 'select', options: db.all('showrooms').filter(s => s.brands.includes(m.brandId)).map(s => [s.id, s.city]), value: l.showroomId }] });
      if (!r) return; if (r.date < ymd()) return toast('La fecha no puede ser pasada', 'warning');
      db.insert('testdrives', { leadId: id, customerId: l.customerId || null, modelId: l.modelId, ...r, status: 'agendado', sellerId: l.sellerId || user.id });
      addTimeline(id, 'test_drive', `Test drive agendado ${fdate(r.date)} ${r.slot}.`, user.id); if (STAGES.indexOf(lead().stage) < 2) moveLead(id, 'test_drive'); toast('Test drive agendado', 'success');
    }
    if (b.hasAttribute('data-fin')) {
      const q = l.quoteId && db.get('quotes', l.quoteId), price = q?.total || l.value, prods = db.query('finProducts', p => p.active);
      const r = await formModal({ title: 'Solicitud de crédito', submit: 'Enviar a crédito', fields: [{ name: 'rut', label: 'RUT', value: l.rut || '', required: true }, { name: 'renta', label: 'Renta líquida', type: 'number', required: true }, { name: 'employment', label: 'Situación laboral', type: 'select', options: [['dependiente', 'Dependiente'], ['independiente', 'Independiente'], ['empresa', 'Empresa']] }, { name: 'seniority', label: 'Antigüedad (años)', type: 'number', value: 2 }, { name: 'productId', label: 'Producto', type: 'select', options: prods.map(p => [p.id, p.name]) }, { name: 'pie', label: 'Pie (CLP)', type: 'number', value: Math.round(price * .3 / 100000) * 100000 }, { name: 'plazo', label: 'Plazo (meses)', type: 'select', options: ['24', '36', '48'], value: '36' }] });
      if (!r) return; if (!rutValid(r.rut)) return toast('RUT inválido', 'warning'); if (!(r.renta > 0)) return toast('Ingresa la renta', 'warning');
      const p = db.get('finProducts', r.productId), plazo = p.rates[+r.plazo] ? +r.plazo : +Object.keys(p.rates)[0];
      const sim = simulate({ product: p, price, pie: r.pie, plazo });
      const a = db.insert('finApps', { number: `SOL-${7300 + db.count('finApps')}`, leadId: id, customerId: l.customerId || null, name: l.name, rut: rutFormat(r.rut), email: l.email, phone: l.phone, employment: r.employment, seniority: r.seniority, renta: r.renta, otherDebt: 0, modelId: l.modelId, versionId: l.versionId, price, pie: r.pie, plazo, productId: p.id, cuota: Math.round(sim.cuota), score: 0, status: 'recibida', analystId: null, conditions: '', notes: [], decidedAt: null });
      const { preEvaluate } = await import('../shared/finance.js'); db.update('finApps', a.id, { score: preEvaluate({ rut: r.rut, renta: r.renta, cuota: sim.cuota, employment: r.employment, seniority: r.seniority, piePct: r.pie / price * 100 }).score });
      db.update('leads', id, { rut: rutFormat(r.rut) }); moveLead(id, 'credito'); addTimeline(id, 'credito', `Solicitud ${a.number} enviada a crédito (${p.name}, ${plazo} cuotas).`, user.id); db.log('crédito', `${a.number} ingresada por ${user.name}`, user.id); toast(`${a.number} enviada al analista`, 'success');
    }
  });
}
export { modelLabel, brand };
