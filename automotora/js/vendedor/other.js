// Vistas complementarias del ejecutivo: cotizaciones, agenda, stock, meta y aprobaciones (gerencia).
import { escape, money, toast } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn, acts } from '../shared/crud.js';
import { model, version, color, userName, showroom, quoteBadge, QUOTE_STATUS, tdBadge, addTimeline, moveLead, STAGES, unitBadge, daysInStock, brand } from '../shared/domain.js';
import { openDoc, quoteHTML } from '../shared/docs.js';
import { carCellHTML } from '../shared/cells.js';
import { decideQuote } from '../admin/cotizaciones.js';
import { ymd, addDays, fdate, parseYmd, lastMonths, monthLabel, nf } from '../shared/util.js';
import { meter, gauge } from '../shared/charts.js';
import { icon } from '../shared/icons.js';

export function renderMyQuotes(v, _p, _q, { user }) {
  v.innerHTML = `${pageHead('Mis cotizaciones', 'Cotizaciones formales emitidas. Las que superan tu margen esperan aprobación de gerencia.')}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), { rows: () => db.query('quotes', q => user.role !== 'vendedor' || q.sellerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), search: q => q.number + q.customer,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(QUOTE_STATUS).map(([k, [l]]) => [k, l]) }],
    columns: [{ key: 'number', label: 'N°', render: q => `<b class="mono">${q.number}</b><br><small class="muted">${fdate(q.createdAt)}</small>` }, { key: 'customer', label: 'Cliente', render: q => escape(q.customer) }, { key: 'modelId', label: 'Vehículo', render: q => ({ __raw: true, value: carCellHTML(q.modelId, q.colorId, escape(version(q.modelId, q.versionId)?.name || '')) }) }, { key: 'discountPct', label: 'Desc.', render: q => String(q.discountPct).replace('.', ',') + '%' }, { key: 'total', label: 'Total', render: q => money(q.total) }, { key: 'status', label: 'Estado', render: q => ({ __raw: true, value: quoteBadge(q.status) }) }],
    onRow: q => q.leadId ? location.hash = '#/lead/' + q.leadId : openDoc('Cotización', quoteHTML(q)),
    csv: { name: 'mis-cotizaciones.csv', map: q => ({ numero: q.number, cliente: q.customer, modelo: model(q.modelId)?.name, total: q.total, estado: QUOTE_STATUS[q.status][0] }) } });
}

export function renderAgenda(v, _p, _q, { user }) {
  const list = db.query('testdrives', t => (user.role !== 'vendedor' || t.sellerId === user.id) && t.date >= addDays(ymd(), -3)).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  const days = [...new Set(list.map(t => t.date))];
  v.innerHTML = `${pageHead('Agenda de test drives', 'Confirma asistencia y registra el resultado: alimenta la conversión test drive → venta.')}
  ${days.map(d => `<div class="card"><div class="card-title"><h3>${icon('calendar', 18)} ${parseYmd(d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>${d === ymd() ? '<span class="badge badge-warning">Hoy</span>' : ''}</div><div class="stack">${list.filter(t => t.date === d).map(t => { const l = db.get('leads', t.leadId); return `<div class="appt-row ${d === ymd() && t.status === 'agendado' ? 'now' : ''}"><span class="time">${t.slot}</span><div class="who"><b>${escape(l?.name || '—')}</b><small>${escape(model(t.modelId)?.name)} · ${escape(showroom(t.showroomId).city)}${l?.phone ? ' · ' + escape(l.phone) : ''}</small></div>${tdBadge(t.status)}${t.status === 'agendado' ? `<button class="btn btn-sm btn-primary" data-done="${t.id}">Realizado</button><button class="btn btn-sm btn-ghost" data-ns="${t.id}">No asistió</button>` : ''}${l ? `<a class="btn btn-sm btn-ghost" href="#/lead/${l.id}">Ficha</a>` : ''}</div>`; }).join('')}</div></div>`).join('') || '<div class="card empty">Sin test drives en agenda.</div>'}`;
  v.addEventListener('click', e => {
    const d = e.target.closest('[data-done],[data-ns]'); if (!d) return;
    const id = d.dataset.done || d.dataset.ns, t = db.get('testdrives', id), ok = !!d.dataset.done;
    db.update('testdrives', id, { status: ok ? 'realizado' : 'no_asistio' });
    if (t.leadId) { addTimeline(t.leadId, 'test_drive', ok ? `Test drive realizado (${model(t.modelId)?.name}).` : 'No asistió al test drive.', user.id); const l = db.get('leads', t.leadId); if (ok && STAGES.indexOf(l.stage) < 2) moveLead(l.id, 'test_drive'); }
    db.log('test drive', `${ok ? 'Realizado' : 'No asistió'} ${model(t.modelId)?.name}`, user.id); toast('Agenda actualizada', 'success');
  });
}

export function renderStockSearch(v) {
  v.innerHTML = `${pageHead('Stock disponible', 'Unidades por VIN en las 3 sucursales para ofrecer al cliente.')}<div class="card" data-list></div>`;
  listView(v.querySelector('[data-list]'), { rows: () => db.query('units', u => ['stock', 'transito', 'reservado'].includes(u.status)).map(u => ({ ...u, brandId: model(u.modelId)?.brandId, days: daysInStock(u) })), search: u => `${model(u.modelId)?.name} ${u.vin}`,
    filters: [{ key: 'status', label: 'Estado', options: [['stock', 'En stock'], ['transito', 'En tránsito'], ['reservado', 'Reservado']] }, { key: 'showroomId', label: 'Sucursal', options: db.all('showrooms').map(s => [s.id, s.city]) }, { key: 'brandId', label: 'Marca', options: db.all('brands').map(b => [b.id, b.name]) }],
    columns: [{ key: 'modelId', label: 'Unidad', render: u => ({ __raw: true, value: carCellHTML(u.modelId, u.colorId, `${escape(version(u.modelId, u.versionId)?.name || '')} · ${escape(color(u.modelId, u.colorId)?.name || '')}`) }) }, { key: 'vin', label: 'VIN', render: u => `<span class="mono small">${u.vin}</span>` }, { key: 'showroomId', label: 'Sucursal', render: u => escape(showroom(u.showroomId).city) }, { key: 'status', label: 'Estado', render: u => ({ __raw: true, value: unitBadge(u.status) + (u.eta ? `<br><small class="muted">ETA ${fdate(u.eta)}</small>` : '') }) }, { key: 'days', label: 'Días', render: u => u.days || '—' }, { key: 'price', label: 'Precio lista', sort: false, render: u => money((version(u.modelId, u.versionId)?.price || 0) + (color(u.modelId, u.colorId)?.price || 0)) }] });
}

export function renderGoal(v, _p, _q, { user }) {
  const sellers = db.query('users', u => u.role === 'vendedor');
  const me = user.role === 'vendedor' ? user : sellers[0];
  const month = ymd().slice(0, 7), mine = db.query('sales', s => s.sellerId === me.id && s.date.startsWith(month));
  const goal = me.goal || 8, pct = mine.length / goal * 100, gp = mine.reduce((a, s) => a + s.price - s.cost, 0);
  const commission = mine.length * 120000 + gp * .03 + (pct >= 100 ? 500000 : 0);
  const months = lastMonths(6).map(m => ({ m, n: db.count('sales', s => s.sellerId === me.id && s.date.startsWith(m)) }));
  const rank = sellers.map(u => ({ u, n: db.count('sales', s => s.sellerId === u.id && s.date.startsWith(month)) })).sort((a, b) => b.n - a.n);
  const day = new Date().getDate(), dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  v.innerHTML = `${pageHead('Meta y comisiones', `${escape(me.name)} · ${monthLabel(month)}${user.role !== 'vendedor' ? ' (vista de ejemplo)' : ''}`)}
  <div class="grid-4">${statCard('Unidades vendidas', `${mine.length} / ${goal}`, meter(pct, pct >= 100 ? 'success' : ''), 'target')}${statCard('Proyección a fin de mes', nf(mine.length / Math.max(1, day) * dim), `<span class="muted small">día ${day} de ${dim}</span>`, 'chart')}${statCard('Utilidad bruta generada', money(gp), '', 'percent')}${statCard('Comisión estimada', money(commission), `<span class="muted small">${pct >= 100 ? 'incluye bono por meta' : `bono de $500.000 al llegar a ${goal}`}</span>`, 'money')}</div>
  <div class="grid-2"><div class="card"><h3>Avance de la meta</h3>${gauge(Math.round(pct), { min: 0, max: 100, label: '% de la meta', tone: pct >= 100 ? 'success' : pct >= 60 ? 'warning' : 'danger' })}<table class="table"><thead><tr><th>Mes</th><th>Unidades</th></tr></thead><tbody>${months.map(x => `<tr><td>${monthLabel(x.m)}</td><td>${x.n}</td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h3>Ranking del mes</h3><ol class="feed">${rank.map((r, i) => `<li><span class="rank-n ${i < 3 ? 'top' : ''}">${i + 1}</span><span class="grow"><b>${escape(r.u.name)}</b>${r.u.id === me.id ? ' <span class="badge badge-primary">tú</span>' : ''}<br><small class="muted">${escape(showroom(r.u.showroomId).city)}</small></span><b>${r.n}</b></li>`).join('')}</ol>
    <h4>Ventas del mes</h4>${mine.map(s => `<div class="line"><span>${fdate(s.date)} · ${escape(s.customer)}</span><span>${escape(model(s.modelId)?.name)}</span></div>`).join('') || '<p class="muted small">Aún sin ventas este mes. ¡Vamos!</p>'}</div></div>`;
}

export function renderApprovals(v) {
  const pend = db.query('quotes', q => q.status === 'pendiente_aprobacion');
  v.innerHTML = `${pageHead('Aprobación de descuentos', 'Cotizaciones que superan el margen del ejecutivo.')}${pend.map(q => { const l = db.get('leads', q.leadId); return `<div class="card"><div class="card-title"><h3>${q.number} · ${escape(q.customer)}</h3><span class="badge badge-warning">${String(q.discountPct).replace('.', ',')}% · ${money(q.discount)}</span></div>
    <div class="grid-2">${carCellHTML(q.modelId, q.colorId, escape(version(q.modelId, q.versionId)?.name || ''))}<div class="small"><div class="line"><span>Precio lista</span><span>${money(q.listPrice)}</span></div><div class="line"><span>Bonos</span><span>−${money(q.bonus)}</span></div><div class="line"><span>Total</span><span>${money(q.total)}</span></div><div class="line"><span>Ejecutivo</span><span>${escape(userName(q.sellerId))}</span></div>${l ? `<div class="line"><span>Etapa / temperatura</span><span>${escape(l.stage)} · ${escape(l.temp || '')}</span></div>` : ''}</div></div>
    <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-doc="${q.id}">${icon('print', 15)} Ver</button><button class="btn btn-danger" data-no="${q.id}">Rechazar</button><button class="btn btn-primary" data-ok="${q.id}">${icon('check', 15)} Aprobar</button></div></div>`; }).join('') || `<div class="card empty">${icon('check', 36)}<p>No hay descuentos pendientes.</p></div>`}`;
  v.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.doc) openDoc('Cotización', quoteHTML(db.get('quotes', b.dataset.doc))); if (b.dataset.ok) decideQuote(b.dataset.ok, true); if (b.dataset.no) decideQuote(b.dataset.no, false); });
}
export { brand };
