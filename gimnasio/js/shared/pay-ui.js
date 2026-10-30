// Modal de cobro de membresía (recepción y admin).
import { escape, money, modal, toast } from '../../../assets/core/ui.js';
import { PAY_METHODS } from '../data/catalog.js';
import { plan, planPrice, registerPayment } from './domain.js';
import { icon } from './icons.js';

export function collectModal(m) {
  const p = plan(m.planId), amount = planPrice(m);
  const md = modal({ title: `Cobrar a ${m.name}`, body: `<div class="stack">
    <div class="row between"><span>${escape(m.billing === 'anual' ? 'Anualidad' : 'Mensualidad')} ${escape(p.name)}<br><small class="muted">${m.code} · vencía ${escape(m.nextDue)}</small></span><b style="font-size:26px">${money(amount)}</b></div>
    <div class="field"><label for="cm-m">Medio de pago</label><select class="select" id="cm-m">${PAY_METHODS.map(x => `<option>${x}</option>`).join('')}</select></div></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${icon('check', 16)} Registrar pago</button>` });
  return new Promise(res => {
    md.el.querySelector('[data-ok]').onclick = () => {
      const next = registerPayment(m, { amount, concept: `${m.billing === 'anual' ? 'Anualidad' : 'Mensualidad'} ${p.name}`, method: md.el.querySelector('#cm-m').value });
      toast(`Pago registrado · al día hasta ${next}`, 'success'); md.close(); res(true);
    };
  });
}
