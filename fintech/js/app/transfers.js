// Transferencias: contactos o nuevo destinatario → monto → confirmación → código 2FA → comprobante.
import { db, site, fee } from '../data/db.js';
import { money, norm, toast, dateTime, formModal } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { account, postTx, evaluateFraud, validRut, normalizeRut, notify } from '../shared/bank.js';
import { BANKS as BANKS_LIST } from '../data/seed.js';
import { pageHead, otpFlow, txItem } from './common.js';

const st = { step: 'who', contactId: null, draft: null, amount: '', note: '', q: '', receipt: null };

export function render(el, { user }) {
  const contacts = db.query('contacts', c => c.userId === user.id).sort((a, b) => (b.fav - a.fav) || a.name.localeCompare(b.name));
  const vista = account(user.id, 'vista');
  const limit = site().limits.transferDaily;
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = db.query('transactions', t => t.userId === user.id && t.type === 'transferencia' && t.amount < 0 && t.date.slice(0, 10) === today && t.status !== 'rechazada').reduce((s, t) => s - t.amount, 0);
  const recent = db.query('transactions', t => t.userId === user.id && t.type === 'transferencia').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const target = st.contactId ? db.get('contacts', st.contactId) : st.draft;

  const head = pageHead('Transferir', `Disponible ${money(vista.balance)} · usado hoy ${money(usedToday)} de ${money(limit)}`);
  let body = '';
  if (st.step === 'who') {
    const list = contacts.filter(c => !st.q || norm(c.name + c.alias + c.bank + c.rut).includes(norm(st.q)));
    body = h`<div class="grid-2" style="align-items:start">
      <section class="card stack">
        <div class="row between"><h3 style="margin:0">¿A quién le transfieres?</h3><button class="btn btn-sm btn-primary" data-new>+ Nuevo destinatario</button></div>
        <input class="input" type="search" placeholder="Buscar contacto…" value="${st.q}" data-q aria-label="Buscar contacto">
        <div class="stack" style="gap:8px" data-contacts>${list.map(c => h`<button class="contact" data-c="${c.id}"><span class="avatar" style="--av:var(--accent)">${c.name.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('')}</span><span class="tx-main"><b>${c.name} ${c.fav ? '★' : ''}</b><small>${c.bank} · ${c.accountType} ${c.accountNumber}</small></span><span aria-hidden="true">›</span></button>`)}</div>
        ${!list.length ? raw('<div class="empty">Sin contactos que coincidan.</div>') : ''}
      </section>
      <section class="card"><h3>Transferencias recientes</h3><ul class="tx-list">${recent.map(t => txItem(t))}</ul>${!recent.length ? raw('<p class="muted">Aún no hay transferencias.</p>') : ''}</section>
    </div>`;
  } else if (st.step === 'amount') {
    body = h`<section class="card stack" style="max-width:560px">
      <div class="row between"><b>Paso 2 de 3 · Monto</b><button class="btn btn-sm btn-ghost" data-back>← Cambiar destinatario</button></div>
      <div class="contact" style="cursor:default"><span class="avatar" style="--av:var(--accent)">${target.name[0]}</span><span class="tx-main"><b>${target.name}</b><small>${target.bank} · ${target.accountType} ${target.accountNumber} · RUT ${target.rut}</small></span></div>
      <div class="field"><label for="amt">Monto a transferir</label><input class="input" id="amt" inputmode="numeric" placeholder="$0" value="${st.amount ? money(st.amount) : ''}" style="font-size:24px;font-weight:700"></div>
      <div class="chips">${[10000, 25000, 50000, 100000, 250000].map(v => h`<button class="chip" data-quick="${v}">${money(v)}</button>`)}</div>
      <div class="field"><label for="note">Mensaje (opcional)</label><input class="input" id="note" maxlength="60" value="${st.note}" placeholder="Ej: arriendo octubre"></div>
      <p class="small muted" style="margin:0">Desde Cuenta Vista ${vista.number} · Comisión: ${target.bank === 'Cóndor Pay' || !fee('transfer') ? 'gratis' : money(fee('transfer'))}</p>
      <p class="small" data-err style="color:var(--danger);margin:0"></p>
      <button class="btn btn-primary" data-review>Revisar transferencia →</button>
    </section>`;
  } else if (st.step === 'done') {
    const r = st.receipt;
    body = h`<section class="card stack" style="max-width:560px">
      <div class="row"><span class="feature-ic" style="margin:0">${r.held ? '⏳' : '✓'}</span><div><h3 style="margin:0">${r.held ? 'Transferencia retenida para revisión' : 'Transferencia realizada'}</h3><span class="muted small">${dateTime(r.date)}</span></div></div>
      ${r.held ? raw('<div class="notice warn">Por tu seguridad, nuestro motor antifraude retuvo esta operación. Un analista la revisará y te notificaremos.</div>') : ''}
      <dl class="kv"><dt>Monto</dt><dd>${money(r.amount)}</dd><dt>Destinatario</dt><dd>${r.name}</dd><dt>Banco</dt><dd>${r.bank}</dd><dt>Cuenta</dt><dd>${r.account}</dd><dt>Mensaje</dt><dd>${r.note || '—'}</dd><dt>N° operación</dt><dd class="mono">${r.id.toUpperCase()}</dd></dl>
      <div class="row"><button class="btn btn-primary" data-again>Nueva transferencia</button><a class="btn btn-ghost" href="#/movimientos">Ver movimientos</a><button class="btn btn-ghost" onclick="window.print()">🖨 Comprobante</button></div>
    </section>`;
  }
  el.innerHTML = head + body;

  el.querySelector('[data-q]')?.addEventListener('input', e => { st.q = e.target.value; const pos = e.target.selectionStart; render(el, { user }); const i = el.querySelector('[data-q]'); i.focus(); i.setSelectionRange(pos, pos); });
  el.querySelector('[data-contacts]')?.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; st.contactId = b.dataset.c; st.draft = null; st.step = 'amount'; render(el, { user }); });
  el.querySelector('[data-new]')?.addEventListener('click', () => newRecipient(user).then(d => { if (d) { st.draft = d; st.contactId = null; st.step = 'amount'; render(el, { user }); } }));
  el.querySelector('[data-back]')?.addEventListener('click', () => { st.step = 'who'; render(el, { user }); });
  el.querySelector('[data-again]')?.addEventListener('click', () => { Object.assign(st, { step: 'who', contactId: null, draft: null, amount: '', note: '', receipt: null }); render(el, { user }); });
  const amt = el.querySelector('#amt');
  if (amt) {
    amt.addEventListener('input', () => { const v = +amt.value.replace(/\D/g, ''); st.amount = v; amt.value = v ? money(v) : ''; });
    el.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => { st.amount = +b.dataset.quick; amt.value = money(st.amount); });
    el.querySelector('#note').oninput = e => st.note = e.target.value;
    el.querySelector('[data-review]').onclick = async () => {
      const errEl = el.querySelector('[data-err]');
      const a = st.amount, commission = target.bank === 'Cóndor Pay' ? 0 : fee('transfer');
      if (vista.status !== 'activa') { errEl.textContent = 'Tu Cuenta Vista está congelada. Contáctanos desde Ayuda.'; return; }
      if (!a || a < 1000) { errEl.textContent = 'El monto mínimo es $1.000.'; return; }
      if (a + commission > vista.balance) { errEl.textContent = 'Saldo insuficiente en tu Cuenta Vista.'; return; }
      if (a + usedToday > limit) { errEl.textContent = `Superas tu límite diario de ${money(limit)}.`; return; }
      errEl.textContent = '';
      const ok = await otpFlow(user, `<dl class="kv"><dt>Monto</dt><dd>${money(a)}</dd><dt>Para</dt><dd>${target.name.replace(/</g, '')}</dd><dt>Banco</dt><dd>${target.bank}</dd>${commission ? `<dt>Comisión</dt><dd>${money(commission)}</dd>` : ''}</dl>`);
      if (!ok) return;
      execute(user, vista, target, a, commission);
      render(el, { user });
    };
  }
}

function execute(user, vista, target, amount, commission) {
  const isNew = !st.contactId;
  const tx = postTx(vista, { amount: -amount, desc: `Transferencia a ${target.name}${st.note ? ' · ' + st.note : ''}`, category: 'Transferencias', type: 'transferencia', counterpart: `${target.bank} · ${target.accountNumber}` });
  if (commission) postTx(vista, { amount: -commission, desc: 'Comisión transferencia', category: 'Servicios', type: 'compra' });
  if (isNew && st.draft.save) {
    const c = db.insert('contacts', { userId: user.id, name: target.name, alias: '', bank: target.bank, rut: target.rut, accountType: target.accountType, accountNumber: target.accountNumber, email: target.email || '', fav: false });
    st.contactId = c.id;
  }
  const { held } = evaluateFraud(tx, { newRecipient: isNew });
  // Si el destinatario es cliente Cóndor Pay (por RUT), se le abona en su cuenta.
  if (!held && target.bank === 'Cóndor Pay') {
    const dest = db.find('users', u => u.rut === target.rut && u.role === 'cliente');
    const dv = dest && account(dest.id, 'vista');
    if (dv) { postTx(dv, { amount, desc: `Transferencia de ${user.name}`, category: 'Transferencias', type: 'transferencia', counterpart: 'Cóndor Pay' }); notify(dest.id, 'Recibiste una transferencia', `${user.name} te transfirió ${money(amount)}.`, 'abono'); }
  }
  db.log('transferencia', `${user.name} transfirió ${money(amount)} a ${target.name} (${target.bank})${held ? ' · RETENIDA' : ''}`, user.id);
  st.receipt = { id: tx.id, date: tx.date, amount, name: target.name, bank: target.bank, account: `${target.accountType} ${target.accountNumber}`, note: st.note, held };
  st.step = 'done'; st.amount = ''; st.note = '';
  toast(held ? 'Transferencia retenida para revisión' : 'Transferencia realizada', held ? 'warning' : 'success');
}

async function newRecipient() {
  const v = await formModal({
    title: 'Nuevo destinatario',
    fields: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'rut', label: 'RUT', required: true, placeholder: '12.345.678-5' },
      { name: 'bank', label: 'Banco', type: 'select', options: BANKS_LIST, value: BANKS_LIST[1] },
      { name: 'accountType', label: 'Tipo de cuenta', type: 'select', options: ['Cuenta vista', 'Cuenta corriente', 'Cuenta de ahorro'] },
      { name: 'accountNumber', label: 'N° de cuenta', required: true },
      { name: 'email', label: 'Correo (opcional)', type: 'email' },
      { name: 'save', label: 'Guardar en mis contactos', type: 'checkbox', value: true },
    ],
    submit: 'Continuar',
  });
  if (!v) return null;
  if (!validRut(v.rut)) { toast('El RUT del destinatario no es válido', 'error'); return null; }
  if (!/^\d{5,14}$/.test(v.accountNumber.replace(/\D/g, ''))) { toast('Número de cuenta inválido', 'error'); return null; }
  return { ...v, rut: normalizeRut(v.rut), accountNumber: v.accountNumber.replace(/\D/g, '') };
}
