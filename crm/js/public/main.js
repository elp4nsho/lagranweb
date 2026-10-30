// Sitio público de Pulso CRM: se arma desde el CMS y se actualiza en vivo cuando el admin edita.
import { db, auth } from '../data/db.js';
import { $ } from '../../../assets/core/ui.js';
import * as S from './sections.js';
import { wireForms } from './forms.js';

const root = document.getElementById('site');
const state = { annual: false, plan: '' };
const blocks = {
  announce: () => S.announcement(db.getValue('site', {})),
  header: () => S.header(auth.current()),
  hero: () => S.hero(db.getValue('site', {})),
  proof: () => S.proof(db.getValue('site', {})),
  features: () => S.features(db.getValue('site', {})),
  how: () => S.how(),
  pricing: () => S.pricing(db.getValue('site', {}), state.annual),
  testimonials: () => S.testimonials(db.getValue('site', {})),
  guide: () => S.guide(),
  demo: () => S.demo(db.getValue('site', {}), state.plan),
  faq: () => S.faq(db.getValue('site', {})),
  footer: () => S.footer(db.getValue('site', {}))
};
root.innerHTML = Object.keys(blocks).map(k => `<div data-block="${k}"></div>`).join('');
const paint = (k) => { $(`[data-block="${k}"]`, root).innerHTML = blocks[k](); };
Object.keys(blocks).forEach(paint);
wireForms(root);

// Refresco en vivo: no se repintan formularios con datos a medio escribir.
const formBusy = k => { const f = $(`[data-block="${k}"] form`, root); return !f || [...f.elements].some(el => (el.type !== 'checkbox' && el.type !== 'submit' && el.tagName !== 'SELECT' && el.value) || el === document.activeElement); };
db.subscribe(ch => {
  if (ch.type === 'log') return;
  if (ch.type === 'value' && ch.key !== 'site') return;
  if (ch.col && ch.col !== 'users') return;
  ['announce', 'header', 'hero', 'proof', 'features', 'pricing', 'testimonials', 'faq', 'footer'].forEach(paint);
  if ($('[data-block="demo"] form', root) && !formBusy('demo')) paint('demo');
});

root.addEventListener('click', e => {
  const b = e.target.closest('[data-billing]');
  if (b) { state.annual = b.dataset.billing === 'a'; paint('pricing'); }
  const p = e.target.closest('[data-plan]');
  if (p) { state.plan = p.dataset.plan; const sel = $('#d-plan'); if (sel) sel.value = `Plan ${state.plan}`; }
  const t = e.target.closest('[data-navtoggle]');
  if (t) { const nav = $('[data-sitenav]', root); const open = nav.classList.toggle('open'); t.setAttribute('aria-expanded', open); }
  else if (e.target.closest('[data-sitenav] a')) $('[data-sitenav]', root)?.classList.remove('open');
});
