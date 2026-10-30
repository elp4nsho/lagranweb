// Dashboard comercial y de posventa.
import { escape, money, lineChart, ago } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, statCard, deltaTag } from '../shared/shell.js';
import { donut, hbars, stackedBars, funnel } from '../shared/charts.js';
import { brand, model, userName, daysInStock, FIN_LABEL, quoteBadge, STAGES, showroom } from '../shared/domain.js';
import { ymd, addDays, lastMonths, monthLabel, nf, nf1, fdateLong } from '../shared/util.js';
import { icon } from '../shared/icons.js';
import { meter } from '../shared/charts.js';

export function renderDashboard(v) {
  const today = ymd(), month = today.slice(0, 7), months = lastMonths(12);
  const prevMonth = months[10], dayN = today.slice(8);
  const sales = db.all('sales');
  const inMonth = (s, m) => s.date.startsWith(m);
  const cur = sales.filter(s => inMonth(s, month)), prevTD = sales.filter(s => inMonth(s, prevMonth) && s.date.slice(8) <= dayN);
  const rev = l => l.reduce((a, s) => a + s.price, 0);
  const gp = l => l.reduce((a, s) => a + (s.price - s.cost), 0);
  const last90 = sales.filter(s => s.date >= addDays(today, -90));
  const gpu = gp(last90) / Math.max(1, last90.length), gpuPrev = (() => { const l = sales.filter(s => s.date < addDays(today, -90) && s.date >= addDays(today, -180)); return gp(l) / Math.max(1, l.length); })();
  const finPen = l => l.filter(s => s.financing !== 'contado').length / Math.max(1, l.length) * 100;
  // Leads y embudo (90 días)
  const leads = db.query('leads', l => l.createdAt >= addDays(today, -90));
  const reach = i => leads.filter(l => (l.maxStage || 0) >= i || l.stage === 'vendido').length;
  const fsteps = [['Leads', 0], ['Contactados', 1], ['Test drive', 2], ['Cotización', 3], ['Negociación', 4], ['Vendidos', 6]].map(([label, i]) => ({ label, value: i === 6 ? leads.filter(l => l.stage === 'vendido').length : reach(i) }));
  const tds = db.query('testdrives', t => t.status === 'realizado' && t.date >= addDays(today, -90));
  const tdSold = tds.filter(t => db.get('leads', t.leadId)?.stage === 'vendido').length;
  // Stock
  const stock = db.query('units', u => u.status === 'stock');
  const avgDays = stock.reduce((a, u) => a + daysInStock(u), 0) / Math.max(1, stock.length);
  const soldDays = last90.reduce((a, s) => a + s.daysInStock, 0) / Math.max(1, last90.length);
  // Unidades por mes y marca
  const brands = db.all('brands');
  const rows = months.map(m => ({ label: monthLabel(m).split(' ')[0], values: Object.fromEntries(brands.map(b => [b.id, sales.filter(s => inMonth(s, m) && s.brandId === b.id).length])) }));
  const revM = months.map(m => ({ label: monthLabel(m).split(' ')[0], value: Math.round(rev(sales.filter(s => inMonth(s, m))) / 1e6) }));
  // Posventa
  const wh = db.getValue('workshopHistory', []);
  const otsToday = db.all('workorders');
  const pvM = months.map(m => ({ label: monthLabel(m).split(' ')[0], value: Math.round((wh.filter(x => x.month === m).reduce((a, x) => a + x.revenue, 0) + (m === month ? otsToday.filter(o => o.date.startsWith(m)).reduce((a, o) => a + o.total, 0) : 0)) / 1e6) }));
  const lastWh = wh.filter(x => x.month === prevMonth);
  const occ = db.all('showrooms').map(s => { const x = lastWh.find(w => w.showroomId === s.id); return { label: s.city, value: x ? Math.round(x.ots / x.capacity * 100) : 0 }; });
  const pvRev = lastWh.reduce((a, x) => a + x.revenue, 0), pvPrev = wh.filter(x => x.month === months[9]).reduce((a, x) => a + x.revenue, 0);
  const todayAppts = db.count('appointments', a => a.date === today && a.status !== 'cancelada');
  // Ranking ejecutivos (mes)
  const sellers = db.query('users', u => u.role === 'vendedor');
  const rank = sellers.map(u => { const l = cur.filter(s => s.sellerId === u.id), ld = leads.filter(x => x.sellerId === u.id); return { u, n: l.length, rev: rev(l), gp: gp(l), conv: ld.filter(x => x.stage === 'vendido').length / Math.max(1, ld.length) * 100, open: db.count('leads', x => x.sellerId === u.id && !['vendido', 'perdido'].includes(x.stage)) }; }).sort((a, b) => b.n - a.n || b.rev - a.rev);
  const fin = Object.keys(FIN_LABEL).map(k => ({ label: FIN_LABEL[k], value: last90.filter(s => s.financing === k).length }));
  const pending = db.query('quotes', q => q.status === 'pendiente_aprobacion').slice(0, 5);
  const logs = db.all('_log').slice(0, 7);

  v.innerHTML = `${pageHead('Dashboard', `Resumen al ${fdateLong(today)} · 3 sucursales · ${brands.length} marcas`, `<a class="btn" href="#/inventario">${icon('grid', 16)} Inventario</a><a class="btn btn-primary" href="#/leads">${icon('target', 16)} Leads</a>`)}
  <div class="grid-4">
    ${statCard('Unidades vendidas (mes)', cur.length, deltaTag(cur.length, prevTD.length, 'vs mismo período mes ant.'), 'car')}
    ${statCard('Facturación (mes)', money(rev(cur)), deltaTag(rev(cur), rev(prevTD), 'vs mes ant.'), 'money')}
    ${statCard('Utilidad bruta por unidad', money(gpu), deltaTag(gpu, gpuPrev, 'vs trimestre ant.'), 'percent')}
    ${statCard('Conversión de leads (90 d)', nf1(fsteps.at(-1).value / Math.max(1, fsteps[0].value) * 100) + '%', `<span class="muted small">${fsteps.at(-1).value} ventas de ${fsteps[0].value} leads</span>`, 'target')}
    ${statCard('Test drive → venta', nf1(tdSold / Math.max(1, tds.length) * 100) + '%', `<span class="muted small">${tdSold} de ${tds.length} test drives</span>`, 'steer')}
    ${statCard('Días promedio en stock', nf1(avgDays, 0), `<span class="muted small">${stock.length} unidades · vendidas en ${nf1(soldDays, 0)} d</span>`, 'clock')}
    ${statCard('Penetración financiamiento', nf1(finPen(cur.length ? cur : last90)) + '%', deltaTag(finPen(cur.length ? cur : last90), finPen(prevTD), 'vs mes ant.'), 'card')}
    ${statCard('Ingresos posventa (mes ant.)', money(pvRev), deltaTag(pvRev, pvPrev, 'mensual') + `<span class="muted small"> · ${todayAppts} citas hoy</span>`, 'wrench')}
  </div>
  <div class="grid-main">
    <div class="card"><div class="card-title"><h3>Unidades vendidas por mes y marca</h3><span class="badge">${nf(sales.filter(s => s.date >= months[0]).length)} en 12 meses</span></div>${stackedBars(rows, brands.map(b => ({ key: b.id, label: b.name })), { height: 220 })}</div>
    <div class="card"><div class="card-title"><h3>Embudo de leads</h3><span class="muted small">90 días</span></div>${funnel(fsteps)}</div>
  </div>
  <div class="grid-2">
    <div class="card"><div class="card-title"><h3>Facturación ventas (MM$)</h3><span class="muted small">12 meses</span></div>${lineChart(revM, { height: 170, format: x => '$' + x + ' MM' })}</div>
    <div class="card"><div class="card-title"><h3>Mix de financiamiento</h3><span class="muted small">90 días</span></div>${donut(fin, { format: x => x + ' u.', center: nf1(finPen(last90), 0) + '%' })}</div>
  </div>
  <div class="grid-2">
    <div class="card"><div class="card-title"><h3>Ingresos posventa (MM$)</h3><span class="muted small">12 meses</span></div>${lineChart(pvM, { height: 150, format: x => '$' + x + ' MM' })}</div>
    <div class="card"><div class="card-title"><h3>Ocupación de taller</h3><span class="muted small">mes anterior</span></div>${hbars(occ, { format: x => x + '%', max: 100 })}
      <p class="small muted" style="margin-top:12px">Hoy: ${db.all('showrooms').map(s => `${escape(s.city)} ${db.count('appointments', a => a.showroomId === s.id && a.date === today && a.status !== 'cancelada')} citas`).join(' · ')}</p></div>
  </div>
  <div class="grid-main">
    <div class="card"><div class="card-title"><h3>Ranking de ejecutivos · ${monthLabel(month)}</h3><a class="small" href="vendedor.html">App ventas</a></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Ejecutivo</th><th>Unidades</th><th>Meta</th><th>Facturación</th><th>Utilidad</th><th>Conv. 90d</th><th>Leads abiertos</th></tr></thead><tbody>
      ${rank.map((r, i) => `<tr><td><span class="rank-n ${i < 3 ? 'top' : ''}">${i + 1}</span></td><td><div class="cell-user"><span class="avatar" style="--size:30px;--av:${r.u.color}">${escape(r.u.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span><span><b>${escape(r.u.name)}</b><small>${escape(showroom(r.u.showroomId).city)}</small></span></div></td><td><b>${r.n}</b></td><td style="min-width:110px">${meter(r.n / Math.max(1, r.u.goal || 8) * 100, r.n >= (r.u.goal || 8) ? 'success' : '')}<small class="muted">${r.n}/${r.u.goal || 8}</small></td><td>${money(r.rev)}</td><td>${money(r.gp)}</td><td>${nf1(r.conv)}%</td><td>${r.open}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="stack">
      <div class="card"><div class="card-title"><h3>${icon('alert', 16)} Descuentos por aprobar</h3><a class="small" href="#/cotizaciones">Ver todas</a></div>${pending.length ? `<ul class="feed">${pending.map(q => `<li><span class="dot"></span><span><b>${q.number}</b> · ${escape(model(q.modelId)?.name)} · ${String(q.discountPct).replace('.', ',')}% (${money(q.discount)})<br><small class="muted">${escape(userName(q.sellerId))} · ${ago(q.createdAt)}</small></span></li>`).join('')}</ul>` : '<p class="muted small">Sin solicitudes pendientes.</p>'}</div>
      <div class="card"><div class="card-title"><h3>Actividad reciente</h3><a class="small" href="#/bitacora">Bitácora</a></div><ul class="feed">${logs.map(l => `<li><span class="dot"></span><span><b>${escape(l.action)}</b> · ${escape(l.detail)}<br><small class="muted">${ago(l.at)}</small></span></li>`).join('') || '<li class="muted">Sin actividad</li>'}</ul></div>
    </div>
  </div>`;
}
