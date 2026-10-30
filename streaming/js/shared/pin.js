// Diálogo de PIN de 4 dígitos (perfiles bloqueados y control parental).
import { modal } from '../../../assets/core/ui.js';

export function pinPrompt(title, check) {
  return new Promise(resolve => {
    let done = false;
    const m = modal({ title, body: `<form class="stack" id="pf" style="text-align:center"><p class="muted" style="margin:0">Ingresa el PIN de 4 dígitos</p><div class="pin-boxes">${[0, 1, 2, 3].map(i => `<input class="input" maxlength="1" inputmode="numeric" aria-label="Dígito ${i + 1}" data-i="${i}">`).join('')}</div><p class="small" id="perr" style="color:var(--danger);min-height:1.2em"></p></form>`, onClose: () => !done && resolve(false) });
    const ins = [...m.el.querySelectorAll('.pin-boxes input')];
    ins.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); if (inp.value && i < 3) ins[i + 1].focus(); if (ins.every(x => x.value)) submit(); });
      inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && i) ins[i - 1].focus(); });
    });
    const submit = () => {
      if (check(ins.map(x => x.value).join(''))) { done = true; m.close(); resolve(true); }
      else { m.el.querySelector('#perr').textContent = 'PIN incorrecto'; ins.forEach(x => (x.value = '')); ins[0].focus(); }
    };
    setTimeout(() => ins[0].focus(), 50);
  });
}

