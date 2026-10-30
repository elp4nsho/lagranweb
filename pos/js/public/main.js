// Página pública del producto POS: presenta el sistema con datos en vivo de la DB demo.
import { html, raw, money, num, $ } from '../../../assets/core/ui.js';
import { db, settings, salesByDay, valid } from '../data/db.js';

function render() {
  const s = settings();
  const branches = db.query('branches', b => b.active);
  const week = salesByDay(7);
  const weekTotal = week.reduce((a, d) => a + d.total, 0), weekTx = week.reduce((a, d) => a + d.count, 0);
  const fav = db.query('products', p => p.favorite && p.active).slice(0, 6);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const today = db.query('sales', x => valid(x) && new Date(x.createdAt) >= t0);
  const openShifts = db.count('shifts', x => x.status === 'abierto');

  $('#lp').innerHTML = html`
  <section class="section"><div class="container lp-hero">
    <div data-anim>
      <span class="eyebrow">Punto de venta + inventario multi-sucursal</span>
      <h1>Vende rápido. Cuadra la caja. Nunca te quedes sin stock.</h1>
      <p class="lead">${s.businessName} usa este sistema en sus ${branches.length} sucursales de cafetería y minimarket: caja táctil con lector de código de barras, pagos mixtos, puntos de fidelización, arqueo de caja y back-office con compras a proveedores.</p>
      <div class="row"><a class="btn btn-primary btn-lg" href="pos.html">▶ Probar caja</a><a class="btn btn-lg" href="admin.html">Entrar al back-office</a></div>
      <p class="small muted" style="margin-top:14px">Cuentas demo listas en el login: cajero, supervisor, bodeguero y administrador.</p>
    </div>
    <div class="mock" data-anim="zoomIn" aria-hidden="true">
      <div class="mock-top"><i></i><i></i><i></i><span style="margin-left:8px">Caja 1 · Pampa Centro</span><span class="badge badge-success" style="margin-left:auto">En línea</span></div>
      <div class="mock-body">
        <div class="mock-grid">${fav.map(p => raw(html`<div class="mock-tile"><b>${p.emoji}</b><span>${p.name}</span><strong>${money(p.price)}</strong></div>`))}</div>
        <div class="mock-cart"><b>Venta en curso</b>${fav.slice(0, 3).map((p, i) => raw(html`<div class="ln"><span>${i + 1} × ${p.name}</span><span>${money(p.price * (i + 1))}</span></div>`))}
          <div class="tot"><span>Total</span><span>${money(fav.slice(0, 3).reduce((a, p, i) => a + p.price * (i + 1), 0))}</span></div><span class="btn btn-primary btn-sm">Cobrar</span></div>
      </div>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="container kpis">
    <div class="card stat" data-anim><span class="label">Ventas últimos 7 días</span><span class="value">${money(weekTotal)}</span></div>
    <div class="card stat" data-anim data-anim-delay="100"><span class="label">Transacciones</span><span class="value">${num(weekTx)}</span></div>
    <div class="card stat" data-anim data-anim-delay="200"><span class="label">Ventas de hoy</span><span class="value">${num(today.length)}</span></div>
    <div class="card stat" data-anim data-anim-delay="300"><span class="label">Cajas abiertas ahora</span><span class="value">${openShifts}</span></div>
  </div></section>

  <section class="section" id="funciones" style="padding-top:0"><div class="container stack">
    <div data-anim><span class="eyebrow">Funciones</span><h2>Todo lo que pasa entre el mesón y la bodega</h2></div>
    <div class="grid-3">
      ${[['⚡', 'Caja ultrarrápida', 'Grilla táctil por categoría, búsqueda y lector de código de barras. Atajos de teclado F2 / F9.'],
        ['💳', 'Pagos mixtos', 'Efectivo con cálculo de vuelto, tarjeta, transferencia y canje de puntos en una misma venta.'],
        ['🧾', 'Boleta y arqueo', 'Boleta imprimible, apertura y cierre de turno con conteo por denominación y diferencias.'],
        ['📶', 'Modo sin conexión', 'Si se cae internet, la caja sigue vendiendo y sincroniza la cola al volver.'],
        ['📦', 'Inventario por sucursal', 'Stock, costo, precio y margen por local. Entradas, mermas y transferencias.'],
        ['🚚', 'Compras a proveedores', 'Órdenes de compra con recepción parcial que actualiza el stock al instante.']]
        .map(([i, t, d], k) => raw(html`<div class="card feature" data-anim data-anim-delay="${k * 80}"><div class="ico">${i}</div><h3>${t}</h3><p class="muted" style="margin:0">${d}</p></div>`))}
    </div>
  </div></section>

  <section class="section" id="sucursales" style="padding-top:0"><div class="container stack">
    <div data-anim><span class="eyebrow">En vivo</span><h2>Sucursales de ${s.businessName}</h2><p class="muted">Estos datos salen de la misma base que usan la caja y el back-office.</p></div>
    <div class="grid-4">${branches.map(b => {
      const ts = today.filter(x => x.branchId === b.id);
      const regs = db.query('registers', r => r.branchId === b.id);
      const open = db.count('shifts', x => x.branchId === b.id && x.status === 'abierto');
      return raw(html`<div class="card stack" style="gap:6px"><b>${b.name}</b><small class="muted">${b.address}, ${b.comuna}</small><small>${b.opens} – ${b.closes} · ${regs.length} caja(s)</small><div class="row between" style="margin-top:6px"><span class="badge ${open ? 'badge-success' : ''}">${open ? open + ' abierta(s)' : 'Cajas cerradas'}</span><b>${money(ts.reduce((a, x) => a + x.total, 0))}</b></div></div>`);
    })}</div>
  </div></section>

  <section class="section" id="planes" style="padding-top:0"><div class="container stack">
    <div data-anim><span class="eyebrow">Planes</span><h2>Precios simples, por caja</h2></div>
    <div class="grid-3">
      ${[['Esencial', 19990, ['1 sucursal, 1 caja', 'Boleta y arqueo', 'Inventario básico']], ['Pro', 34990, ['Hasta 5 sucursales', 'Compras y proveedores', 'Fidelización con puntos', 'Modo sin conexión']], ['Cadena', 0, ['Sucursales ilimitadas', 'Integraciones contables', 'Soporte prioritario']]]
        .map(([n, p, f], i) => raw(html`<div class="card plan" data-anim data-anim-delay="${i * 100}">${i === 1 ? raw('<span class="badge badge-primary plain" style="align-self:flex-start">Más elegido</span>') : ''}<h3 style="margin:0">${n}</h3><span class="price">${p ? money(p) : 'A medida'}</span><small class="muted">${p ? 'por caja al mes + IVA' : 'conversemos'}</small><ul>${f.map(x => raw(html`<li>${x}</li>`))}</ul><a class="btn ${i === 1 ? 'btn-primary' : ''}" href="pos.html">Probar ahora</a></div>`))}
    </div>
  </div></section>`;
}
render();
db.subscribe(render);
