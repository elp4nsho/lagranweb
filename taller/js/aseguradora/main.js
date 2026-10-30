// Portal de aseguradoras: el liquidador revisa siniestros, ve fotos/daños y presupuesto, aprueba montos,
// fija el deducible, rechaza o pide antecedentes. La aprobación libera la OT en el taller.
import { escape, money, toast, formModal, dateTime } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth } from '../data/db.js';
import { totals, decideBudget, settings, customerById, ST_OF, insurerName } from '../shared/domain.js';
import { plate, stBadge, claimBadge, carDiagram, budgetTable } from '../shared/bits.js';

let user;
try { user = auth.require(['admin', 'aseguradora']); } catch (e) { /* redirigiendo */ }
const app = document.getElementById('app');
let insId = user?.insurerId || 'ins1', filter = 'evaluar', open = null;

function render() {
  if (!user) return;
  const ins = db.get('insurers', insId);
  const all = db.query('claims', c => c.insurerId === insId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const list = all.filter(c => filter === 'todos' || (filter === 'evaluar' ? ['denunciado', 'en-evaluacion', 'mas-info'].includes(c.status) : filter === 'aprobados' ? ['aprobado', 'pagado'].includes(c.status) : c.status === 'rechazado'));
  if (!open && list.length && innerWidth > 900) open = list[0].id;
  const sel = open && db.get('claims', open);
  app.innerHTML = `<header class="ops-top"><span class="brand-mark" aria-hidden="true">🛡️</span><div class="grow"><b>${escape(ins?.name || '')} · Portal liquidadores</b><small class="muted d-block">${escape(user.name)} · taller ${escape(settings().name)}</small></div>
      ${user.role === 'admin' ? `<select class="select sm" data-ins aria-label="Aseguradora">${db.all('insurers').map(i => `<option value="${i.id}" ${i.id === insId ? 'selected' : ''}>${escape(i.name)}</option>`).join('')}</select><a class="btn btn-sm btn-ghost" href="admin.html#/seguros">Panel</a>` : ''}
      <span class="avatar" style="--av:${escape(user.color)}">${escape(initials(user.name))}</span><button class="btn btn-sm btn-ghost" data-out>Salir</button></header>
    <div class="container ops-main stack">
      <div class="kpi-grid">${[['Por evaluar', all.filter(c => ['denunciado', 'en-evaluacion', 'mas-info'].includes(c.status)).length], ['Aprobado (monto)', money(all.filter(c => c.status === 'aprobado').reduce((s, c) => s + c.approved, 0))], ['Pagado', money(all.filter(c => c.status === 'pagado').reduce((s, c) => s + c.approved, 0))], ['Siniestros totales', all.length]].map(([l, v]) => `<div class="card stat kpi"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')}</div>
      <div class="tabs">${[['evaluar', 'Por evaluar'], ['aprobados', 'Aprobados'], ['rechazados', 'Rechazados'], ['todos', 'Todos']].map(([k, l]) => `<button class="tab ${filter === k ? 'active' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="ins-grid">
        <div class="stack">${list.map(c => { const o = db.get('ots', c.otId); return `<button class="card claim-card st-${c.status} ${open === c.id ? 'sel' : ''}" data-open="${c.id}" style="text-align:left;font:inherit;color:inherit;cursor:pointer"><div class="row between nowrap"><b>${escape(c.number)}</b>${claimBadge(c.status)}</div><span>${plate(c.plate)} ${escape(o?.car || '')}</span><small class="muted">${escape(c.event)} · ${escape(c.eventAt)}</small><div class="row between small"><span>Presupuesto ${money(o ? totals(o).total : c.amount)}</span><span>${o ? escape(ST_OF(o.status).label) : ''}</span></div></button>`; }).join('') || '<div class="card empty">Sin siniestros en esta bandeja.</div>'}</div>
        <div>${sel ? detail(sel) : '<div class="card empty"><span class="icon">👈</span>Selecciona un siniestro para revisarlo.</div>'}</div>
      </div>
    </div>`;
}
function detail(c) {
  const o = db.get('ots', c.otId), cu = customerById(c.customerId), t = o ? totals(o) : null;
  const can = ['denunciado', 'en-evaluacion', 'mas-info'].includes(c.status);
  return `<div class="card stack">
    <div class="row between"><h2 style="margin:0;font-size:22px">${escape(c.number)}</h2>${claimBadge(c.status)}</div>
    <div class="grid-3 small detail-grid"><div><span class="label">Asegurado</span><b>${escape(cu?.name || '')}</b>${escape(cu?.rut || '')}</div><div><span class="label">Póliza</span><b>${escape(c.policy)}</b>deducible ${c.deductibleUF} UF</div><div><span class="label">OT taller</span><b>${escape(c.otCode)}</b>${o ? stBadge(o.status) : ''}</div></div>
    <p class="callout small">📝 ${escape(c.event)} · ocurrido el ${escape(c.eventAt)}</p>
    ${o ? `<div class="grid-2" style="align-items:start"><div class="stack"><b class="small">Daños registrados al ingreso</b>${carDiagram(o.intake.damages)}</div><div class="stack"><b class="small">Fotos del peritaje (${o.photos})</b><div class="photo-row">${Array.from({ length: Math.min(4, o.photos) }, (_, i) => `<span class="photo on">📷<small>Foto ${i + 1}</small></span>`).join('')}</div><p class="small" style="margin:0"><b>Diagnóstico:</b> ${escape(o.diagnosis || 'En curso')}</p></div></div>
      ${budgetTable(o)}` : ''}
    ${c.notes.map(n => `<p class="callout small">${escape(n.text)} <small class="muted">· ${escape(n.by)} · ${dateTime(n.at)}</small></p>`).join('')}
    ${can && o?.budget.length ? `<div class="row"><button class="btn btn-primary" data-approve="${c.id}">✓ Aprobar presupuesto</button><button class="btn" data-info="${c.id}">Pedir antecedentes</button><button class="btn btn-danger" data-reject="${c.id}">Rechazar</button></div>` : can ? '<p class="small muted">El taller aún no carga el presupuesto.</p>' : `<p class="callout ok small">Monto aprobado: <b>${money(c.approved)}</b> · deducible a cargo del asegurado: <b>${money(c.deductible)}</b>${t ? ` · el taller cobra a la compañía ${money(Math.max(0, c.approved - c.deductible))}` : ''}</p>`}
  </div>`;
}

app.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (b.hasAttribute('data-out')) { auth.logout(); location.href = 'login.html'; return; }
  if (d.f) { filter = d.f; open = null; render(); return; }
  if (d.open) { open = d.open; render(); return; }
  const note = (c, text) => db.update('claims', c.id, { notes: [...c.notes, { at: new Date().toISOString(), by: user.name, text }] });
  if (d.approve) {
    const c = db.get('claims', d.approve), o = db.get('ots', c.otId), t = totals(o);
    const v = await formModal({ title: `Aprobar ${c.number}`, fields: [{ name: 'approved', label: 'Monto aprobado (CLP, IVA incl.)', type: 'number', required: true, value: t.total }, { name: 'deductibleUF', label: 'Deducible (UF)', type: 'number', value: c.deductibleUF }, { name: 'text', label: 'Observación para el taller', type: 'textarea', value: 'Aprobado según peritaje fotográfico.' }] });
    if (!v) return;
    db.update('claims', c.id, { status: 'aprobado', approved: v.approved, deductibleUF: v.deductibleUF, deductible: Math.round(v.deductibleUF * settings().uf), liquidator: user.name });
    note(db.get('claims', c.id), `Aprobado por ${money(v.approved)}. ${v.text}`);
    decideBudget(o.id, Object.fromEntries(o.budget.filter(i => i.st === 'pendiente').map(i => [i.id, true])), { by: `aseguradora (${insurerName(c.insurerId)})`, user: user.id });
    db.log('seguro', `${c.number} aprobado por ${user.name}: ${money(v.approved)}`, user.id);
    toast('Siniestro aprobado: el taller ya puede reparar', 'success');
  }
  if (d.info || d.reject) {
    const c = db.get('claims', d.info || d.reject);
    const v = await formModal({ title: d.info ? 'Pedir antecedentes' : 'Rechazar siniestro', fields: [{ name: 'text', label: d.info ? '¿Qué necesitas?' : 'Motivo del rechazo', type: 'textarea', required: true, value: d.info ? 'Enviar fotos del chasis y del radiador.' : '' }] });
    if (!v) return;
    db.update('claims', c.id, { status: d.info ? 'mas-info' : 'rechazado' }); note(db.get('claims', c.id), v.text);
    db.log('seguro', `${c.number} ${d.info ? 'requiere antecedentes' : 'rechazado'}: ${v.text}`, user.id);
    toast(d.info ? 'Solicitud enviada al taller' : 'Siniestro rechazado', 'info');
  }
});
app.addEventListener('change', e => { if (e.target.matches('[data-ins]')) { insId = e.target.value; open = null; render(); } });
render();
db.subscribe(() => { if (!document.querySelector('.modal-backdrop')) render(); });
