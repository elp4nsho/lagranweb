// Mi cuenta (cliente): OT en curso, vehículos, historial, documentos (facturas, presupuestos, garantías).
import { escape, money, toast, date } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { customerById, vehicleHistory, fmtKm, totals, OPEN, dayLabel } from '../shared/domain.js';
import { plate, stBadge, invoiceModal, warrantyHTML } from '../shared/bits.js';

let tab = 'vehiculos';
export function renderAccount(el) {
  const u = auth.current();
  if (!u || u.role !== 'cliente') {
    el.innerHTML = `<section class="section page-top"><div class="container narrow"><div class="card empty stack" style="align-items:center"><span class="icon">🔐</span><h2>Mi cuenta Los Andes</h2><p>Ingresa para ver tus vehículos, OT en curso, historial y documentos.</p><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/cuenta')}">Ingresar</a><small class="muted">Demo: cliente@losandes.cl · demo123</small></div></div></section>`;
    return {};
  }
  const paint = () => {
    const c = customerById(u.customerId); if (!c) return;
    const vs = db.query('vehicles', v => v.customerId === c.id);
    const ots = db.query('ots', o => o.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const open = ots.filter(o => OPEN.includes(o.status));
    const invs = db.query('invoices', i => i.customerId === c.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    const ws = db.query('warranties', w => w.customerId === c.id);
    const T = [['vehiculos', `Vehículos (${vs.length})`], ['historial', 'Historial'], ['documentos', `Documentos (${invs.length + ws.length})`], ['datos', 'Mis datos']];
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div class="row between" data-anim><div><span class="eyebrow">Mi cuenta</span><h1 style="margin:0">Hola, ${escape(c.name.split(' ')[0])}</h1></div><div class="row"><a class="btn btn-primary" href="#/cotizar">Cotizar o agendar</a><button class="btn btn-ghost" data-out>Salir</button></div></div>
      ${open.map(o => { const pend = o.budget.filter(i => i.st === 'pendiente' && o.budgetSentAt).length; return `<div class="card row between"><div class="row" style="gap:10px">${plate(o.plate)}<span><b>${escape(o.code)} · ${escape(o.car)}</b><small class="muted d-block">${escape(o.symptom)}</small></span></div><div class="row">${stBadge(o.status)}${pend ? `<a class="btn btn-sm btn-primary" href="#/presupuesto/${o.code}">🔔 Aprobar ${pend} ítems</a>` : ''}<a class="btn btn-sm" href="#/ot/${o.code}">Seguimiento</a></div></div>`; }).join('')}
      <div class="tabs">${T.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${escape(l)}</button>`).join('')}</div>
      ${tab === 'vehiculos' ? `<div class="grid-2">${vs.map(v => `<div class="card stack" style="gap:8px"><div class="row between">${plate(v.plate)}<small class="muted">${escape(v.color)}</small></div><b style="font-size:1.15em">${escape(v.make)} ${escape(v.model)} ${v.year}</b><dl class="dl small"><dt>Kilometraje</dt><dd>${fmtKm(v.km)}</dd><dt>VIN</dt><dd><code>${escape(v.vin || '—')}</code></dd><dt>Visitas</dt><dd>${vehicleHistory(v).length}</dd></dl><a class="btn btn-sm" href="#/cotizar">Agendar para este auto</a></div>`).join('')}</div>` : ''}
      ${tab === 'historial' ? `<div class="card"><ol class="timeline">${vs.flatMap(v => vehicleHistory(v).map(h => ({ ...h, v }))).sort((a, b) => b.d.localeCompare(a.d)).map(h => `<li><div class="row between"><b>${escape(dayLabel(h.d, { day: 'numeric', month: 'short', year: 'numeric' }))} · ${fmtKm(h.km)}</b><span class="price">${money(h.t)}</span></div><small class="d-block">${plate(h.v.plate)} ${escape(h.s)}</small><small class="muted">${escape(h.ot)}</small></li>`).join('') || '<li>Sin historial</li>'}</ol></div>` : ''}
      ${tab === 'documentos' ? `<div class="grid-2" style="align-items:start"><div class="stack"><h3 style="margin:0">Facturas y boletas</h3>${invs.map(i => `<div class="card row between"><span><b>${i.kind === 'factura' ? 'Factura' : 'Boleta'} N° ${i.number}</b><small class="muted d-block">${escape(i.otCode)} · ${date(i.issuedAt)}</small></span><span class="row nowrap"><b>${money(i.total)}</b><button class="btn btn-sm" data-inv="${i.id}">Ver</button></span></div>`).join('') || '<p class="muted">Sin documentos aún.</p>'}
        <h3 style="margin:8px 0 0">Presupuestos</h3>${ots.filter(o => o.budget.length).map(o => `<div class="card row between"><span><b>${escape(o.code)}</b><small class="muted d-block">${escape(o.car)} · ${money(totals(o).total)}</small></span><a class="btn btn-sm" href="#/presupuesto/${o.code}">Abrir</a></div>`).join('')}</div>
        <div class="stack"><h3 style="margin:0">Garantías</h3>${ws.map(warrantyHTML).join('') || '<p class="muted">Aún no tienes garantías activas.</p>'}</div></div>` : ''}
      ${tab === 'datos' ? `<form class="card stack narrow" data-me novalidate><div class="grid-2"><div class="field"><label for="me-n">Nombre</label><input class="input" id="me-n" name="name" value="${escape(c.name)}"></div><div class="field"><label for="me-r">RUT</label><input class="input" id="me-r" name="rut" value="${escape(c.rut)}"></div><div class="field"><label for="me-t">Celular</label><input class="input" id="me-t" name="phone" value="${escape(c.phone)}"></div><div class="field"><label for="me-a">Dirección</label><input class="input" id="me-a" name="address" value="${escape(c.address || '')}"></div></div><button class="btn btn-primary">Guardar</button></form>` : ''}
    </div></section>`;
    el.querySelector('[data-me]')?.addEventListener('submit', e => { e.preventDefault(); const f = e.target.elements; db.update('customers', c.id, { name: f.name.value.trim() || c.name, rut: f.rut.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim() }); toast('Datos guardados', 'success'); });
  };
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
    if (e.target.closest('[data-out]')) { auth.logout(); location.hash = '#/'; return; }
    const i = e.target.closest('[data-inv]'); if (i) invoiceModal(db.get('invoices', i.dataset.inv));
  });
  paint();
  return { refresh: paint };
}
