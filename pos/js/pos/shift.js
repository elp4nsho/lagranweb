// Turnos de caja: apertura con fondo, movimientos (retiros/ingresos), arqueo y cierre, últimas ventas y anulación.
import { html, raw, money, time, toast, modal, formModal, confirm } from '../../../assets/core/ui.js';
import { db, auth, settings, openShiftOf, shiftSummary, voidSale, METHODS, METHOD_ICON } from '../data/db.js';
import { shiftReportHtml, printModal } from '../shared/receipt.js';
import { showReceipt } from './payment.js';

export const DENOMS = [20000, 10000, 5000, 2000, 1000, 500, 100, 50, 10];
export const denomInputs = (prefix = 'd') => `<div class="denoms">${DENOMS.map(d => `<label>${money(d)} ×<input class="input" type="number" min="0" value="" data-${prefix}="${d}" aria-label="Cantidad de ${money(d)}"></label>`).join('')}</div>`;
export const denomTotal = (root, prefix = 'd') => [...root.querySelectorAll(`[data-${prefix}]`)].reduce((s, i) => s + (+i.value || 0) * +i.dataset[prefix], 0);

// Autorización de supervisor (PIN) para acciones sensibles.
export function requireSupervisor(reason) {
  const u = auth.current();
  if (['admin', 'supervisor'].includes(u.role)) return Promise.resolve(u);
  return new Promise(resolve => {
    let done = false;
    const m = modal({
      title: 'Autorización de supervisor', body: `<form class="stack" data-pin><p style="margin:0">${reason}</p><div class="field"><label for="pin">PIN de supervisor</label><input class="input" id="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" style="font-size:22px;letter-spacing:.3em"></div><small class="muted">Demo: PIN de Jorge Ramírez (supervisor) = 2222</small></form>`,
      foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Autorizar</button>',
      onClose: () => !done && resolve(null)
    });
    const go = e => {
      e && e.preventDefault();
      const pin = m.el.querySelector('#pin').value;
      const sup = db.find('users', x => ['admin', 'supervisor'].includes(x.role) && x.active !== false && x.pin === pin);
      if (!sup) { toast('PIN incorrecto', 'error'); m.el.querySelector('#pin').select(); return; }
      done = true; m.close(); db.log('autorización', `${sup.name} autorizó: ${reason}`, sup.id); resolve(sup);
    };
    m.el.querySelector('[data-pin]').addEventListener('submit', go);
    m.el.querySelector('[data-ok]').onclick = go;
  });
}

export function renderGate(el, { user, branchId, registerId, onSelect, onOpen }) {
  const regs = db.query('registers', r => r.branchId === branchId);
  const branches = user.role === 'cajero' ? db.query('branches', b => b.id === user.branchId) : db.query('branches', b => b.active);
  const reg = db.get('registers', registerId);
  const open = openShiftOf(registerId);
  const busy = open && open.userId !== user.id;
  el.innerHTML = html`<div class="gate"><div class="card stack">
    <div><span class="eyebrow">Turno de caja</span><h1 style="margin:4px 0 0;font-size:clamp(26px,4vw,36px)">${busy ? 'Caja en uso' : 'Abrir turno'}</h1></div>
    <div class="form-grid">
      <div class="field"><label for="g-branch">Sucursal</label><select class="select" id="g-branch" ${branches.length < 2 ? 'disabled' : ''}>${branches.map(b => raw(html`<option value="${b.id}" ${b.id === branchId ? 'selected' : ''}>${b.name}</option>`))}</select></div>
      <div class="field"><label for="g-reg">Caja</label><select class="select" id="g-reg">${regs.map(r => { const o = openShiftOf(r.id); return raw(html`<option value="${r.id}" ${r.id === registerId ? 'selected' : ''}>${r.name}${o ? ` · abierta por ${db.get('users', o.userId)?.name.split(' ')[0]}` : ' · libre'}</option>`); })}</select></div>
    </div>
    ${busy ? raw(html`<p style="margin:0">La <b>${reg?.name}</b> tiene un turno abierto por <b>${db.get('users', open.userId)?.name}</b> desde las ${time(open.openedAt)}.</p>
      <div class="row">${['admin', 'supervisor'].includes(user.role) ? raw('<button class="btn btn-primary" data-take>Tomar esta caja</button><button class="btn btn-danger" data-forceclose>Cerrar su turno</button>') : raw('<span class="muted small">Elige otra caja o pide a un supervisor que cierre ese turno.</span>')}</div>`) : raw(html`
      <p class="muted" style="margin:0">Cuenta el fondo de caja inicial. Puedes ingresar el total directo o contar por denominación.</p>
      <div class="field"><label for="g-open">Fondo inicial</label><input class="input" id="g-open" type="number" min="0" step="10" value="${settings().openingCash || 50000}" style="font-size:22px;font-weight:700"></div>
      <details><summary class="small" style="cursor:pointer">Contar por denominación</summary><div style="margin-top:10px">${raw(denomInputs('g'))}</div></details>
      <button class="btn btn-primary btn-lg" data-open>Abrir turno</button>`)}
    <div class="row between small"><span class="muted">Usuario: <b>${user.name}</b> (${auth.roleName(user.role)})</span><a href="login.html" data-logout>Cambiar usuario</a></div>
  </div></div>`;
  el.querySelector('#g-branch').onchange = e => { const r = db.find('registers', x => x.branchId === e.target.value); onSelect(e.target.value, r?.id); };
  el.querySelector('#g-reg').onchange = e => onSelect(branchId, e.target.value);
  el.querySelectorAll('[data-g]').forEach(i => i.addEventListener('input', () => { el.querySelector('#g-open').value = denomTotal(el, 'g'); }));
  el.querySelector('[data-open]')?.addEventListener('click', () => {
    const amt = Math.max(0, Math.round(+el.querySelector('#g-open').value || 0));
    const s = db.insert('shifts', { registerId, branchId, userId: user.id, openedAt: new Date().toISOString(), openingCash: amt, status: 'abierto', movements: [] });
    db.log('caja', `Abrió turno en ${reg.name} · ${db.get('branches', branchId).name} con ${money(amt)}`, user.id);
    toast('Turno abierto. ¡Buenas ventas!', 'success');
    onOpen(s);
  });
  el.querySelector('[data-take]')?.addEventListener('click', () => { db.log('caja', `${user.name} tomó la ${reg.name} (turno de ${db.get('users', open.userId)?.name})`, user.id); onOpen(open); });
  el.querySelector('[data-forceclose]')?.addEventListener('click', () => closeShift(open, () => onSelect(branchId, registerId)));
}

export function cashMovement(shift) {
  formModal({ title: 'Movimiento de caja', submit: 'Registrar', fields: [
    { name: 'type', label: 'Tipo', type: 'select', value: 'retiro', options: [['retiro', 'Retiro (depósito a caja fuerte / pago a proveedor)'], ['ingreso', 'Ingreso (sencillo / reposición de fondo)']] },
    { name: 'amount', label: 'Monto', type: 'number', required: true, value: 20000 },
    { name: 'note', label: 'Motivo', value: 'Depósito a caja fuerte', required: true }
  ] }).then(v => {
    if (!v) return;
    if (!(v.amount > 0)) return toast('Monto inválido', 'warning');
    const sum = shiftSummary(shift);
    if (v.type === 'retiro' && v.amount > sum.expected) return toast(`No hay suficiente efectivo en caja (${money(sum.expected)})`, 'error');
    const mv = { type: v.type, amount: Math.round(v.amount), note: v.note, at: new Date().toISOString(), userId: auth.current().id };
    db.update('shifts', shift.id, s => ({ movements: [...(s.movements || []), mv] }));
    db.log('caja', `${v.type === 'retiro' ? 'Retiro' : 'Ingreso'} de ${money(v.amount)}: ${v.note}`, auth.current().id);
    toast('Movimiento registrado', 'success');
  });
}

export function closeShift(shift, onClosed) {
  const sum = shiftSummary(shift);
  const body = document.createElement('div');
  body.className = 'stack';
  body.innerHTML = html`<div class="cols-2" style="gap:14px">
      <div class="stack" style="gap:6px">
        <div class="sum-row"><span>Ventas del turno</span><b>${sum.count}</b></div>
        <div class="sum-row"><span>Total vendido</span><b>${money(sum.total)}</b></div>
        ${Object.entries(sum.by).map(([k, v]) => raw(html`<div class="sum-row"><span>${METHOD_ICON[k]} ${METHODS[k]}</span><span>${money(v)}</span></div>`))}
        <hr style="margin:4px 0">
        <div class="sum-row"><span>Fondo inicial</span><span>${money(shift.openingCash)}</span></div>
        ${sum.withdrawals ? raw(html`<div class="sum-row"><span>Retiros</span><span>−${money(sum.withdrawals)}</span></div>`) : ''}
        ${sum.deposits ? raw(html`<div class="sum-row"><span>Ingresos</span><span>+${money(sum.deposits)}</span></div>`) : ''}
        <div class="sum-row total"><span>Esperado</span><span>${money(sum.expected)}</span></div>
      </div>
      <div class="stack" style="gap:8px"><b>Conteo de efectivo</b>${raw(denomInputs('c'))}
        <div class="due-box"><small class="muted">Contado</small><span class="big-num" data-counted>${money(0)}</span><small data-diff></small></div></div>
    </div>
    <div class="field"><label for="cs-notes">Observaciones</label><textarea class="textarea" id="cs-notes" style="min-height:70px" placeholder="Ej: faltante por vuelto mal entregado"></textarea></div>`;
  const m = modal({ title: 'Arqueo y cierre de turno', size: 'lg', body, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-sm" data-fill>Contar = esperado</button><button class="btn btn-primary" data-do-close>Cerrar turno</button>' });
  const upd = () => {
    const c = denomTotal(body, 'c'), d = c - sum.expected;
    body.querySelector('[data-counted]').textContent = money(c);
    const el = body.querySelector('[data-diff]');
    el.textContent = d === 0 ? 'Cuadra perfecto ✓' : `${d > 0 ? 'Sobrante' : 'Faltante'}: ${money(Math.abs(d))}`;
    el.className = d === 0 ? 'pos-up' : 'pos-down';
  };
  body.addEventListener('input', upd);
  upd();
  m.el.querySelector('[data-fill]').onclick = () => {
    let rest = sum.expected;
    body.querySelectorAll('[data-c]').forEach(i => { const d = +i.dataset.c; const n = Math.floor(rest / d); i.value = n || ''; rest -= n * d; });
    upd();
  };
  m.el.querySelector('[data-do-close]').onclick = async () => {
    const counted = denomTotal(body, 'c');
    if (!counted && !await confirm('El conteo está en $0. ¿Cerrar igualmente?', { danger: true, ok: 'Cerrar' })) return;
    const diff = counted - sum.expected;
    const notes = body.querySelector('#cs-notes').value.trim();
    if (diff !== 0 && Math.abs(diff) > 5000 && !notes) return toast('Diferencia sobre $5.000: agrega una observación', 'warning');
    db.update('shifts', shift.id, { status: 'cerrado', closedAt: new Date().toISOString(), expectedCash: sum.expected, countedCash: counted, difference: diff, notes, salesCount: sum.count, salesTotal: sum.total, byMethod: sum.by, closedBy: auth.current().id });
    db.log('caja', `Cerró turno (${sum.count} ventas, ${money(sum.total)}) · diferencia ${money(diff)}`, auth.current().id);
    m.close();
    const s2 = db.get('shifts', shift.id);
    const r = modal({ title: 'Turno cerrado', body: shiftReportHtml(s2, sum), foot: '<button class="btn" data-print>🖨 Imprimir reporte</button><button class="btn btn-primary" data-close>Listo</button>', onClose: () => onClosed && onClosed() });
    r.el.querySelector('[data-print]').onclick = printModal;
  };
}

export function lastSales(shift) {
  const draw = () => {
    const ss = db.query('sales', s => s.shiftId === shift.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25);
    return ss.length ? `<ul class="list-plain">${ss.map(s => html`<li><span><b>N° ${s.number}</b> · ${time(s.createdAt)}<br><small class="muted">${s.items.length} ítem(s) · ${s.payments.map(p => METHODS[p.method]).join(' + ')}</small></span><span class="row" style="gap:6px">${s.status === 'anulada' ? raw('<span class="badge badge-danger">Anulada</span>') : ''}<b>${money(s.total)}</b><button class="btn btn-sm" data-view="${s.id}">Ver</button>${s.status !== 'anulada' ? raw(html`<button class="btn btn-sm btn-ghost" data-void="${s.id}">Anular</button>`) : ''}</span></li>`).join('')}</ul>` : '<div class="empty">Aún no hay ventas en este turno.</div>';
  };
  const m = modal({ title: 'Ventas del turno', size: 'lg', body: draw() });
  m.el.addEventListener('click', async e => {
    const v = e.target.closest('[data-view]');
    if (v) showReceipt(db.get('sales', v.dataset.view));
    const vd = e.target.closest('[data-void]');
    if (vd) {
      const s = db.get('sales', vd.dataset.void);
      const sup = await requireSupervisor(`Anular boleta N° ${s.number} por ${money(s.total)}`);
      if (!sup) return;
      const r = await formModal({ title: `Anular boleta N° ${s.number}`, submit: 'Anular', fields: [{ name: 'reason', label: 'Motivo', value: 'Error de digitación', required: true }] });
      if (!r) return;
      voidSale(s, { reason: r.reason, by: sup });
      toast(`Boleta N° ${s.number} anulada · stock repuesto`, 'info');
      m.el.querySelector('.modal-body').innerHTML = draw();
    }
  });
}
