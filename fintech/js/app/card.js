// Tarjetas: ver/ocultar datos, congelar, compras online/internacionales y límites.
import { db } from '../data/db.js';
import { money, toast, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { maskCard, badge, notify } from '../shared/bank.js';
import { pageHead, otpFlow } from './common.js';

const st = { sel: null, reveal: false };
let hideTimer;

export function render(el, { user }) {
  const cards = db.query('cards', c => c.userId === user.id && c.status !== 'reemplazada');
  if (!cards.length) { el.innerHTML = pageHead('Mi tarjeta') + '<div class="empty">No tienes tarjetas.</div>'; return; }
  const c = cards.find(x => x.id === st.sel) || cards[0];
  st.sel = c.id;
  const locked = c.status === 'bloqueada' || c.status === 'inactiva';
  const sw = (key, label, sub) => h`<label class="row between" style="flex-wrap:nowrap"><span><b>${label}</b><br><span class="small muted">${sub}</span></span><span class="switch"><input type="checkbox" data-sw="${key}" ${c[key] ? 'checked' : ''} ${locked ? 'disabled' : ''}><span></span></span></label>`;
  el.innerHTML = h`${raw(pageHead('Mi tarjeta', 'Controla tus tarjetas al instante.'))}
  ${cards.length > 1 ? raw(h`<div class="chips">${cards.map(x => h`<button class="chip ${x.id === c.id ? 'active' : ''}" data-card="${x.id}">${x.brand} ·${x.last4}</button>`)}</div>`) : ''}
  <div class="grid-2" style="align-items:start">
    <section class="stack">
      <div class="bank-card ${c.status === 'congelada' ? 'frozen' : ''} ${locked ? 'blocked' : ''}">
        <div class="row between"><span class="chip-ic"></span><b>${c.brand}</b></div>
        <span class="num">${st.reveal ? c.number : maskCard(c.number)}</span>
        <div class="meta"><span>Titular<b>${user.name.split(' ').slice(0, 2).join(' ').toUpperCase()}</b></span><span>Vence<b>${c.exp}</b></span><span>CVV<b>${st.reveal ? c.cvv : '•••'}</b></span></div>
      </div>
      <div class="row"><button class="btn" data-reveal ${locked ? 'disabled' : ''}>${st.reveal ? '🙈 Ocultar datos' : '👁 Ver datos'}</button>
        <button class="btn ${c.status === 'congelada' ? 'btn-primary' : ''}" data-freeze ${locked ? 'disabled' : ''}>${c.status === 'congelada' ? '🔥 Descongelar' : '❄️ Congelar'}</button>
        <button class="btn btn-ghost" data-copy ${!st.reveal ? 'disabled' : ''}>Copiar número</button></div>
      <div class="card"><dl class="kv"><dt>Estado</dt><dd>${raw(badge(c.status))}</dd><dt>Tipo</dt><dd>${c.kind === 'virtual' ? 'Virtual (débito)' : 'Física (crédito)'}</dd><dt>Cuenta asociada</dt><dd>${db.get('accounts', c.accountId)?.number || '—'}</dd></dl>
        ${c.status === 'bloqueada' ? raw('<div class="notice danger mt">Esta tarjeta está bloqueada. Puedes solicitar una de reemplazo.</div>') : ''}
        ${c.status === 'inactiva' ? raw('<div class="notice warn mt">Se activará cuando aprobemos tu cuenta.</div>') : ''}
        ${c.replaceRequested ? raw('<div class="notice mt">Reemplazo solicitado: llegará en 3 a 5 días hábiles (simulado).</div>') : ''}
      </div>
    </section>
    <section class="stack">
      <div class="card stack">${raw(sw('online', 'Compras online', 'Permite compras en internet y apps'))}${raw(sw('international', 'Uso internacional', 'Compras y giros en el extranjero'))}${raw(sw('contactless', 'Pago sin contacto', 'Paga acercando la tarjeta o el celular'))}</div>
      <div class="card stack"><h3 style="margin:0">Límites</h3>
        <div class="field"><label for="ld">Compras diarias: <b data-v="ld">${money(c.limitDaily)}</b></label><input class="range" type="range" id="ld" min="50000" max="2000000" step="50000" value="${c.limitDaily}" ${locked ? 'disabled' : ''}></div>
        <div class="field"><label for="lo">Compras online diarias: <b data-v="lo">${money(c.limitOnline)}</b></label><input class="range" type="range" id="lo" min="0" max="1500000" step="25000" value="${c.limitOnline}" ${locked ? 'disabled' : ''}></div>
        <button class="btn btn-primary" data-limits ${locked ? 'disabled' : ''}>Guardar límites</button></div>
      <div class="card stack"><h3 style="margin:0">¿Perdiste tu tarjeta?</h3><p class="small muted" style="margin:0">La bloquearemos de forma definitiva y te enviaremos una nueva con otro número.</p>
        <button class="btn btn-danger" data-replace ${c.status === 'inactiva' ? 'disabled' : ''}>Bloquear y reemplazar</button></div>
    </section>
  </div>`;

  const re = () => render(el, { user });
  el.querySelectorAll('[data-card]').forEach(b => b.onclick = () => { st.sel = b.dataset.card; st.reveal = false; re(); });
  el.querySelector('[data-reveal]').onclick = async () => {
    if (st.reveal) { st.reveal = false; re(); return; }
    if (!(await otpFlow(user, '<p class="muted" style="margin:0">Para ver los datos completos de tu tarjeta confirma tu identidad.</p>'))) return;
    st.reveal = true; re();
    clearTimeout(hideTimer); hideTimer = setTimeout(() => { st.reveal = false; if (el.isConnected && location.hash.includes('tarjeta')) re(); }, 30000);
    toast('Datos visibles por 30 segundos', 'info');
  };
  el.querySelector('[data-copy]').onclick = () => { navigator.clipboard?.writeText(c.number.replace(/\s/g, '')).catch(() => {}); toast('Número copiado', 'success'); };
  el.querySelector('[data-freeze]').onclick = () => {
    const frozen = c.status === 'congelada';
    db.update('cards', c.id, { status: frozen ? 'activa' : 'congelada' });
    db.log('tarjeta', `${user.name} ${frozen ? 'descongeló' : 'congeló'} la tarjeta ·${c.last4}`, user.id);
    toast(frozen ? 'Tarjeta activa nuevamente' : 'Tarjeta congelada', frozen ? 'success' : 'info');
  };
  el.querySelectorAll('[data-sw]').forEach(i => i.onchange = () => {
    db.update('cards', c.id, { [i.dataset.sw]: i.checked });
    db.log('tarjeta', `${user.name} cambió ${i.dataset.sw} = ${i.checked ? 'sí' : 'no'} en tarjeta ·${c.last4}`, user.id);
    toast('Preferencia actualizada', 'success');
  });
  ['ld', 'lo'].forEach(id => { const r = el.querySelector('#' + id); r.oninput = () => el.querySelector(`[data-v="${id}"]`).textContent = money(+r.value); });
  el.querySelector('[data-limits]').onclick = () => {
    db.update('cards', c.id, { limitDaily: +el.querySelector('#ld').value, limitOnline: +el.querySelector('#lo').value });
    toast('Límites actualizados', 'success');
  };
  el.querySelector('[data-replace]').onclick = async () => {
    if (!(await confirm('La tarjeta actual quedará bloqueada de forma permanente.', { title: 'Bloquear y reemplazar', ok: 'Bloquear', danger: true }))) return;
    const n = `4${Math.floor(100 + Math.random() * 899)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`;
    db.update('cards', c.id, { status: 'reemplazada' });
    const { id: _id, updatedAt: _u, createdAt: _c, ...rest } = c;
    const nc = db.insert('cards', { ...rest, number: n, last4: n.slice(-4), cvv: String(Math.floor(100 + Math.random() * 899)), status: 'activa', replaceRequested: c.kind !== 'virtual', replacedFrom: c.id });
    st.sel = nc.id; st.reveal = false;
    notify(user.id, 'Tarjeta reemplazada', `Bloqueamos tu tarjeta ·${c.last4}. Tu nueva tarjeta termina en ${n.slice(-4)}.`, 'seguridad');
    db.log('tarjeta', `${user.name} bloqueó y reemplazó tarjeta ·${c.last4} → ·${n.slice(-4)}`, user.id);
    toast('Nueva tarjeta emitida', 'success');
  };
}
