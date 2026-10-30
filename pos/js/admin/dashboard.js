// Dashboard: ventas por hora/día/sucursal, top productos, márgenes por categoría, medios de pago y cajas abiertas.
import { html, raw, money, num, time, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { db, auth, settings, salesByDay, saleCost, valid, METHODS, branchName, userName, isLow, stockAt, category } from '../data/db.js';
import { pageHead, kpi } from '../shared/common.js';

const DAY = 864e5;
const st = { period: 7, branch: '' };

export function render(el) {
  const u = auth.current();
  const P = st.period, B = st.branch || null;
  const series = salesByDay(Math.max(P, 2) * 2, B);
  const cur = series.slice(-P), prev = series.slice(-2 * P, -P);
  const sum = (arr, k) => arr.reduce((s, d) => s + d[k], 0);
  const delta = (a, b) => b ? ((a - b) / b) * 100 : 0;
  const total = sum(cur, 'total'), ptotal = sum(prev, 'total'), cnt = sum(cur, 'count'), pcnt = sum(prev, 'count');
  const mg = total ? (total / 1.19 - sum(cur, 'cost')) / (total / 1.19) * 100 : 0;
  const pmg = ptotal ? (ptotal / 1.19 - sum(prev, 'cost')) / (ptotal / 1.19) * 100 : 0;
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const detailDays = Math.min(P, settings().detailDays || 10);
  const from = t0.getTime() - (detailDays - 1) * DAY;
  const detail = db.query('sales', s => valid(s) && (!B || s.branchId === B) && new Date(s.createdAt).getTime() >= from);

  const chartDays = P === 1 ? 14 : Math.max(P, 7);
  const line = salesByDay(chartDays, B).map(d => ({ label: chartDays > 14 ? d.date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : d.date.toLocaleDateString('es-CL', { weekday: 'short' }).slice(0, 2) + ' ' + d.date.getDate(), value: d.total }));
  const hours = Array.from({ length: 15 }, (_, i) => i + 7).map(h => ({ label: h + 'h', value: Math.round(detail.filter(s => new Date(s.createdAt).getHours() === h).reduce((a, s) => a + s.total, 0) / detailDays) }));
  const branches = db.query('branches', b => b.active);
  const byBranch = branches.map(b => ({ label: b.name.replace('Pampa ', ''), value: sum(salesByDay(P, b.id), 'total') }));
  const prodMap = {};
  detail.forEach(s => s.items.forEach(i => { (prodMap[i.productId] ||= { q: 0, rev: 0 }); prodMap[i.productId].q += i.qty; prodMap[i.productId].rev += Math.round(i.price * i.qty * (1 - (i.discount || 0) / 100)); }));
  const top = Object.entries(prodMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 7);
  const maxRev = top[0]?.[1].rev || 1;
  const catMap = {};
  detail.forEach(s => s.items.forEach(i => { const p = db.get('products', i.productId); const c = p?.categoryId || 'otros'; (catMap[c] ||= { rev: 0, cost: 0 }); catMap[c].rev += Math.round(i.price * i.qty * (1 - (i.discount || 0) / 100)); catMap[c].cost += (i.cost ?? p?.cost ?? 0) * i.qty; }));
  const cats = Object.entries(catMap).sort((a, b) => b[1].rev - a[1].rev);
  const pay = {};
  detail.forEach(s => s.payments.forEach(p => { pay[p.method] = (pay[p.method] || 0) + p.amount; }));
  const payData = Object.entries(pay).map(([k, v]) => ({ label: METHODS[k], value: Math.round(v / 1000) }));
  const open = db.query('shifts', s => s.status === 'abierto' && (!B || s.branchId === B));
  const low = [];
  db.query('products', p => p.active && p.trackStock).forEach(p => branches.filter(b => !B || b.id === B).forEach(b => { if (isLow(p, b.id)) low.push({ p, b, n: stockAt(p, b.id) }); }));
  low.sort((a, b) => a.n - b.n);
  const label = P === 1 ? 'hoy' : `${P} días`;

  el.innerHTML = html`${raw(pageHead('Dashboard', `${B ? branchName(B) : 'Todas las sucursales'} · ${label}`,
    `<select class="select" data-branch aria-label="Sucursal" style="width:auto"><option value="">Todas las sucursales</option>${branches.map(b => `<option value="${b.id}" ${st.branch === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}</select>
     <div class="tabs">${[[1, 'Hoy'], [7, '7 días'], [30, '30 días'], [90, '90 días']].map(([v, l]) => `<button class="tab ${P === v ? 'active' : ''}" data-period="${v}">${l}</button>`).join('')}</div>`))}
    <div class="kpis">
      ${raw(kpi(`Ventas ${label}`, money(total), delta(total, ptotal)))}
      ${raw(kpi('Transacciones', num(cnt), delta(cnt, pcnt)))}
      ${raw(kpi('Ticket promedio', money(cnt ? total / cnt : 0), delta(cnt ? total / cnt : 0, pcnt ? ptotal / pcnt : 0)))}
      ${raw(kpi('Margen bruto', mg.toFixed(1).replace('.', ',') + '%', delta(mg, pmg)))}
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>Ventas por día</h3><span class="small muted">${chartDays} días</span></div>${raw(lineChart(line, { format: money }))}</div>
      <div class="card"><div class="card-head"><h3>Ventas por sucursal</h3><span class="small muted">${label}</span></div>${raw(barChart(byBranch, { format: money }))}</div>
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>Venta promedio por hora</h3><span class="small muted">Promedio diario · últimos ${detailDays} día(s)</span></div>${raw(barChart(hours, { format: money, height: 180 }))}<p class="small muted" style="margin:8px 0 0">Peaks de desayuno (8–9 h), almuerzo (13 h) y salida de oficinas (18 h).</p></div>
      <div class="card"><div class="card-head"><h3>Medios de pago</h3><span class="small muted">miles de $</span></div>${raw(donutChart(payData, { label: '$' + (Object.values(pay).reduce((a, b) => a + b, 0) / 1e6).toFixed(1).replace('.', ',') + 'M', size: 150 }))}</div>
    </div>
    <div class="cols-2">
      <div class="card"><div class="card-head"><h3>Productos más vendidos</h3><span class="small muted">últimos ${detailDays} día(s)</span></div>
        <div class="hbars">${top.map(([id, v]) => { const p = db.get('products', id); return raw(html`<div class="hb"><a href="#/productos/${id}">${p?.emoji} ${p?.name || id}</a><b>${money(v.rev)} <span class="muted small">· ${v.q} u.</span></b><div class="progress"><i style="--v:${v.rev / maxRev * 100}%"></i></div></div>`); })}</div></div>
      <div class="card"><div class="card-head"><h3>Margen por categoría</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Categoría</th><th class="right">Venta</th><th class="right">Costo</th><th class="right">Margen</th></tr></thead><tbody>
        ${cats.map(([c, v]) => { const m = v.rev ? (v.rev / 1.19 - v.cost) / (v.rev / 1.19) * 100 : 0; return raw(html`<tr><td>${category(c)?.icon} ${category(c)?.name || c}</td><td class="right">${money(v.rev)}</td><td class="right">${money(v.cost)}</td><td class="right"><span class="badge badge-${m > 55 ? 'success' : m > 35 ? 'info' : 'warning'}">${m.toFixed(0)}%</span></td></tr>`); })}
        </tbody></table></div></div>
    </div>
    <div class="cols-2">
      <div class="card"><div class="card-head"><h3>Cajas abiertas ahora</h3><a class="small" href="#/caja">Reportes de caja</a></div>
        ${open.length ? raw(html`<ul class="list-plain">${open.map(s => { const n = db.query('sales', x => x.shiftId === s.id && valid(x)); return raw(html`<li><span><b>${branchName(s.branchId)} · ${db.get('registers', s.registerId)?.name}</b><br><small class="muted">${userName(s.userId)} · desde ${time(s.openedAt)}</small></span><span class="right"><b>${money(n.reduce((a, x) => a + x.total, 0))}</b><br><small class="muted">${n.length} ventas</small></span></li>`); })}</ul>`) : raw('<p class="muted">No hay cajas abiertas en este momento.</p>')}</div>
      <div class="card"><div class="card-head"><h3>Bajo stock mínimo</h3><a class="small" href="#/inventario?bajo=1">Ver inventario</a></div>
        ${low.length ? raw(html`<ul class="list-plain">${low.slice(0, 7).map(x => raw(html`<li><span>${x.p.emoji} <b>${x.p.name}</b><br><small class="muted">${x.b.name} · mínimo ${x.p.minStock}</small></span><span class="badge badge-${x.n ? 'warning' : 'danger'}">${x.n ? x.n + ' u.' : 'Agotado'}</span></li>`))}</ul>`) : raw('<p class="muted">Todo el stock sobre el mínimo ✨</p>')}</div>
    </div>`;
  const rerender = () => { const n = document.createElement('div'); n.className = el.className; n.style.cssText = el.style.cssText; el.replaceWith(n); render(n); };
  el.querySelectorAll('[data-period]').forEach(b => b.onclick = () => { st.period = +b.dataset.period; rerender(); });
  el.querySelector('[data-branch]').onchange = e => { st.branch = e.target.value; st.touched = true; rerender(); };
}
