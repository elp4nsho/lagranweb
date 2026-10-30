// Aprobación online del presupuesto: diagnóstico, ítems con fotos/notas, aprobar o rechazar cada uno y pagar abono.
import { escape, money, toast, modal } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { otByCode, normPlate, totals, decideBudget, settings, userName, fmtKm, dayLabel, timeHM } from '../shared/domain.js';
import { plate, stBadge, budgetTable, carDiagram, claimBadge, PRIO } from '../shared/bits.js';
import { insurerName } from '../shared/domain.js';

const unlocked = new Set();

export function renderBudget(el, params = {}) {
  const u = auth.current();
  let o = params.code ? otByCode(params.code) : null;
  if (o && u?.role === 'cliente' && o.customerId === u.customerId) unlocked.add(o.id);
  if (o && u && u.role !== 'cliente') unlocked.add(o.id);
  let dec = {};
  const paint = () => {
    o = o && db.get('ots', o.id);
    if (!o || !unlocked.has(o.id)) {
      el.innerHTML = `<section class="section page-top"><div class="container narrow stack">
        <div data-anim><span class="eyebrow">Presupuesto en línea</span><h1>Revisa y aprueba tu presupuesto</h1><p class="lead">Ingresa el código de OT que te enviamos por WhatsApp y la patente del vehículo.</p></div>
        <form class="card stack" novalidate data-f><div class="grid-2"><div class="field"><label for="b-c">Código de OT</label><input class="input" id="b-c" name="codigo" placeholder="OT-24810" value="${escape(params.code || '')}"></div><div class="field"><label for="b-p">Patente</label><input class="input plate-input" id="b-p" name="patente" placeholder="KJTR-45" maxlength="8"></div></div>
        <button class="btn btn-primary btn-lg">Ver presupuesto</button><p class="small muted" style="margin:0">Demo: OT de Ignacio Pérez → patente <b>PRWT-63</b> (ingresa como cliente para verla directo).</p></form>
      </div></section>`;
      el.querySelector('[data-f]').onsubmit = e => {
        e.preventDefault();
        const f = e.target, x = otByCode(f.elements.codigo.value) || db.query('ots', y => normPlate(y.plate) === normPlate(f.elements.patente.value) && y.budget.length).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (!x || normPlate(x.plate) !== normPlate(f.elements.patente.value)) { toast('El código y la patente no coinciden', 'warning'); f.elements.patente.classList.add('invalid'); return; }
        unlocked.add(x.id); o = x; history.replaceState(null, '', '#/presupuesto/' + x.code); paint();
      };
      return;
    }
    const pend = o.budget.filter(i => i.st === 'pendiente');
    const canDecide = !!o.budgetSentAt && pend.length > 0 && !['entregado', 'cancelada'].includes(o.status);
    const claim = o.claimId ? db.get('claims', o.claimId) : null;
    // Vista previa con decisiones locales
    const preview = { ...o, budget: o.budget.map(i => i.id in dec ? { ...i, st: dec[i.id] ? 'aprobado' : 'rechazado' } : (i.st === 'pendiente' && canDecide ? { ...i, st: 'aprobado' } : i)) };
    const t = totals(preview), dep = Math.round(pend.filter(i => dec[i.id] !== false).reduce((s, i) => s + i.qty * i.price, 0) * (settings().depositPct / 100) / 10) * 10;
    el.innerHTML = `<section class="section page-top"><div class="container stack">
      <div class="row between" data-anim><div><span class="eyebrow">Presupuesto ${escape(o.code)}</span><h1 style="margin:0">${escape(o.car)}</h1></div><div class="row">${plate(o.plate)} ${stBadge(o.status)}</div></div>
      <div class="grid-3 small detail-grid card"><div><span class="label">Asesor</span><b>${escape(userName(o.advisorId))}</b></div><div><span class="label">Kilometraje / ingreso</span><b>${fmtKm(o.km)}</b>${escape(dayLabel(o.createdAt))} ${timeHM(o.createdAt)}</div><div><span class="label">Enviado</span><b>${o.budgetSentAt ? escape(dayLabel(o.budgetSentAt)) + ' ' + timeHM(o.budgetSentAt) : 'En preparación'}</b></div></div>
      ${claim ? `<p class="callout ${claim.status === 'aprobado' ? 'ok' : 'warn'}">🛡️ Siniestro ${escape(claim.number)} con <b>${escape(insurerName(claim.insurerId))}</b>: ${claimBadge(claim.status)} · Tu deducible: <b>${money(claim.deductible)}</b> (${claim.deductibleUF} UF). El resto lo paga la aseguradora una vez aprobado por el liquidador.</p>` : ''}
      <div class="grid-2" style="align-items:start">
        <div class="card stack"><h2 style="margin:0;font-size:22px">🩺 Diagnóstico</h2><p style="margin:0"><b>Motivo de ingreso:</b> ${escape(o.symptom)}</p><p style="margin:0">${escape(o.diagnosis || 'El técnico está terminando el diagnóstico.')}</p>
          <div class="photo-row">${Array.from({ length: Math.min(4, o.photos || 0) }, (_, i) => `<span class="photo on">📷<small>Foto ${i + 1}</small></span>`).join('')}</div>
          ${(o.findings || []).map(fd => `<p class="callout warn small">🔎 ${escape(fd.text)} <small class="muted">· ${escape(userName(fd.by))}</small></p>`).join('')}</div>
        <div class="card stack"><h2 style="margin:0;font-size:22px">Estado del vehículo al ingreso</h2>${carDiagram(o.intake.damages)}<small class="muted">${o.intake.damages.length ? `${o.intake.damages.length} daño(s) previo(s) registrados al ingreso.` : 'Sin daños previos registrados.'}</small></div>
      </div>
      ${o.budget.length ? `<div class="card stack"><div class="row between"><h2 style="margin:0;font-size:22px">🧮 Presupuesto detallado</h2>${canDecide ? '<small class="muted">Activa o desactiva cada ítem. Los urgentes afectan la seguridad.</small>' : ''}</div>${budgetTable(preview, { mode: canDecide ? 'client' : 'view' })}</div>` : '<div class="card empty">El presupuesto aún no está listo. Te avisaremos por WhatsApp.</div>'}
      ${canDecide ? `<div class="approve-bar"><div><b>${pend.filter(i => dec[i.id] !== false).length} de ${pend.length} ítems seleccionados</b><small class="muted d-block">Total con lo seleccionado: ${money(t.total)}${claim ? '' : ` · Abono ${settings().depositPct}%: <b>${money(dep)}</b>`}</small></div><div class="row"><button class="btn btn-ghost" data-none>Rechazar todo</button><button class="btn btn-primary btn-lg" data-approve>${claim ? 'Confirmar mi aprobación' : `Aprobar y pagar abono ${money(dep)}`}</button></div></div>`
        : o.budget.length ? `<p class="callout ok">Presupuesto ${o.budget.some(i => i.st === 'aprobado') ? 'aprobado' : 'respondido'}. <a href="#/ot/${o.code}">Sigue tu OT en línea →</a>${o.deposit ? ` · Abono pagado: <b>${money(o.deposit.amount)}</b>` : ''}</p>` : ''}
    </div></section>`;
  };
  el.addEventListener('change', e => { const d = e.target.closest('[data-dec]'); if (!d) return; const it = o.budget.find(i => i.id === d.dataset.dec); if (!d.checked && it.prio === 'urgente') toast('Ojo: este ítem es urgente para tu seguridad', 'warning'); dec[d.dataset.dec] = d.checked; paint(); });
  el.addEventListener('click', e => {
    if (e.target.closest('[data-none]')) { o.budget.filter(i => i.st === 'pendiente').forEach(i => { dec[i.id] = false; }); paint(); return; }
    if (!e.target.closest('[data-approve]')) return;
    const pend = o.budget.filter(i => i.st === 'pendiente');
    const decisions = Object.fromEntries(pend.map(i => [i.id, dec[i.id] !== false]));
    const nOk = Object.values(decisions).filter(Boolean).length;
    const claim = o.claimId ? db.get('claims', o.claimId) : null;
    if (!nOk || claim) { decideBudget(o.id, decisions, { by: 'cliente (web)' }); toast(nOk ? 'Aprobación registrada' : 'Presupuesto rechazado. Tu asesor te contactará.', nOk ? 'success' : 'info'); dec = {}; paint(); return; }
    const amount = Math.round(pend.filter(i => decisions[i.id]).reduce((s, i) => s + i.qty * i.price, 0) * settings().depositPct / 100 / 10) * 10;
    const f = document.createElement('form'); f.className = 'stack'; f.noValidate = true;
    f.innerHTML = `<p>Aprobarás <b>${nOk}</b> ítem(s). Abono del ${settings().depositPct}%: <b class="price">${money(amount)}</b>. El saldo se paga al retirar.</p>
      <div class="card-visual" aria-hidden="true"><span class="cv-chip"></span><b>•••• •••• •••• 4242</b><small>${escape(o.plate)} · ${escape(o.code)}</small></div>
      <div class="grid-3"><div class="field" style="grid-column:span 2"><label for="pay-n">Número de tarjeta *</label><input class="input" id="pay-n" name="tarjeta" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242"></div><div class="field"><label for="pay-x">Venc. *</label><input class="input" id="pay-x" name="vencimiento" placeholder="12/29" autocomplete="cc-exp"></div></div>
      <div class="field"><label for="pay-m">Medio</label><select class="select" id="pay-m" name="medio"><option value="credito">Tarjeta de crédito</option><option value="debito">Tarjeta de débito</option></select></div>`;
    const m = modal({ title: 'Pagar abono', body: f, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-pay>Pagar abono</button>' });
    m.el.querySelector('[data-pay]').onclick = () => {
      const bad = { tarjeta: f.elements.tarjeta.value.replace(/\D/g, '').length < 13, vencimiento: !/^\d{2}\/\d{2}$/.test(f.elements.vencimiento.value.trim()) };
      Object.entries(bad).forEach(([k, b]) => f.elements[k].classList.toggle('invalid', b));
      if (bad.tarjeta || bad.vencimiento) { toast('Revisa los datos de la tarjeta', 'warning'); return; }
      decideBudget(o.id, decisions, { by: 'cliente (web)', deposit: { amount: (o.deposit?.amount || 0) + amount, paidAt: new Date().toISOString(), method: f.elements.medio.value } });
      m.close(); dec = {}; toast('¡Presupuesto aprobado y abono pagado! Empezamos a trabajar.', 'success');
    };
  });
  paint();
  return { refresh: paint };
}
export { PRIO };
