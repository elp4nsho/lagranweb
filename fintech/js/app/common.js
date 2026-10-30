// Utilidades de la app del cliente: filas de movimientos, cabeceras y el flujo 2FA simulado.
import { modal, toast, money, date, time, escape } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { CAT_ICON, badge, newOtp } from '../shared/bank.js';

export function pageHead(title, sub = '', actions = '') {
  return h`<div class="page-head"><div><h1>${title}</h1>${sub ? raw(`<p class="muted" style="margin:4px 0 0">${escape(sub)}</p>`) : ''}</div><div class="row">${raw(actions)}</div></div>`;
}

export function txItem(t, { showStatus = true } = {}) {
  return h`<li data-tx="${t.id}" class="clickable">
    <span class="tx-ic" aria-hidden="true">${CAT_ICON[t.category] || '•'}</span>
    <span class="tx-main"><b>${t.desc}</b><small>${t.category} · ${date(t.date, { day: '2-digit', month: 'short' })} ${time(t.date)}</small></span>
    ${showStatus && t.status !== 'ok' ? raw(badge(t.status)) : ''}
    <span class="amt ${t.amount > 0 ? 'pos' : ''}">${t.amount > 0 ? '+' : '−'}${money(Math.abs(t.amount))}</span>
  </li>`;
}

export function txDetail(t, account) {
  modal({
    title: 'Detalle del movimiento',
    body: h`<div class="stack">
      <div class="row between"><span class="tx-ic" style="width:52px;height:52px;font-size:26px">${CAT_ICON[t.category] || '•'}</span><span class="amt ${t.amount > 0 ? 'pos' : ''}" style="font-size:26px">${t.amount > 0 ? '+' : '−'}${money(Math.abs(t.amount))}</span></div>
      <dl class="kv">
        <dt>Descripción</dt><dd>${t.desc}</dd>
        <dt>Fecha</dt><dd>${date(t.date)} · ${time(t.date)}</dd>
        <dt>Categoría</dt><dd>${t.category}</dd>
        <dt>Tipo</dt><dd>${t.type}</dd>
        <dt>Cuenta</dt><dd>${account ? `${account.type === 'credito' ? 'Tarjeta de crédito' : account.type === 'ahorro' ? 'Cuenta de ahorro' : 'Cuenta vista'} ${account.number}` : '—'}</dd>
        ${t.counterpart ? raw(h`<dt>Contraparte</dt><dd>${t.counterpart}</dd>`) : ''}
        <dt>Estado</dt><dd>${raw(badge(t.status))}</dd>
        <dt>N° operación</dt><dd class="mono">${t.id.toUpperCase()}</dd>
      </dl>
      ${t.status === 'retenida' ? raw('<div class="notice warn">Esta operación está retenida por nuestro motor antifraude y será revisada por un analista.</div>') : ''}
    </div>`,
    foot: '<button class="btn btn-primary" data-close>Cerrar</button>',
  });
}

// Pide un código de 6 dígitos "enviado por SMS". Resuelve true si se valida.
export function otpFlow(user, summaryHtml = '') {
  return new Promise(resolve => {
    let code = newOtp(), tries = 0, ok = false;
    const phone = (user.phone || '').replace(/\D/g, '').slice(-4);
    const m = modal({
      title: 'Confirma con tu código',
      body: `<div class="stack">${summaryHtml}
        <p style="margin:0">Enviamos un código de 6 dígitos por SMS al celular terminado en <b>${escape(phone.slice(0, 2))} ${escape(phone.slice(2))}</b>.</p>
        <div class="otp" role="group" aria-label="Código de verificación">${Array.from({ length: 6 }, (_, i) => `<input class="input" inputmode="numeric" maxlength="1" aria-label="Dígito ${i + 1}">`).join('')}</div>
        <p class="small" data-msg style="margin:0;text-align:center;color:var(--danger)"></p>
        <div class="row" style="justify-content:center"><button class="btn btn-sm btn-ghost" data-resend>Reenviar código</button><button class="btn btn-sm btn-ghost" data-hint>Ver SMS demo</button></div>
      </div>`,
      foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Confirmar</button>',
      onClose: () => !ok && resolve(false),
    });
    const sms = () => toast(`SMS simulado · Tu código Cóndor Pay es ${code}`, 'info', 9000);
    sms();
    const inputs = [...m.el.querySelectorAll('.otp input')];
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 1); if (inp.value && inputs[i + 1]) inputs[i + 1].focus(); if (inputs.every(x => x.value)) check(); });
      inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus(); if (e.key === 'Enter') check(); });
      inp.addEventListener('paste', e => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, ''); if (t.length >= 6) { e.preventDefault(); inputs.forEach((x, k) => x.value = t[k]); check(); } });
    });
    setTimeout(() => inputs[0].focus(), 60);
    m.el.querySelector('[data-resend]').onclick = () => { code = newOtp(); sms(); };
    m.el.querySelector('[data-hint]').onclick = () => sms();
    m.el.querySelector('[data-ok]').onclick = check;
    function check() {
      const v = inputs.map(x => x.value).join('');
      const msg = m.el.querySelector('[data-msg]');
      if (v.length < 6) { msg.textContent = 'Ingresa los 6 dígitos.'; return; }
      if (v !== code) {
        tries++;
        inputs.forEach(x => x.value = ''); inputs[0].focus();
        if (tries >= 3) { msg.textContent = ''; toast('Demasiados intentos. Operación cancelada.', 'error'); m.close(); return; }
        msg.textContent = `Código incorrecto. Te quedan ${3 - tries} intento(s).`;
        return;
      }
      ok = true; m.close(); resolve(true);
    }
  });
}
