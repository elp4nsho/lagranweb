// Centro de ayuda público (index.html): base de conocimiento, búsqueda y contacto + chat en vivo.
import { db } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { header, footer, wireLayout } from './layout.js';
import * as kb from './kb.js';
import { contact } from './contact.js';
import { mountChat } from '../shared/chat-widget.js';

const root = document.getElementById('site');
root.innerHTML = `<div data-head></div><main id="main" tabindex="-1"></main><div data-foot></div>`;
const main = root.querySelector('#main');
let active = 'ayuda', current = () => {};
const paintChrome = () => { root.querySelector('[data-head]').innerHTML = header(active); root.querySelector('[data-foot]').innerHTML = footer(); };
const show = (fn, act = 'ayuda') => { active = act; current = fn; paintChrome(); fn(); window.scrollTo(0, 0); };
createRouter({
  '/': () => show(() => kb.home(main)),
  '/categoria/:id': ({ id }) => show(() => kb.category(main, id)),
  '/articulo/:id': ({ id }) => show(() => kb.article(main, id)),
  '/buscar': (p, q) => show(() => kb.search(main, q.q || '')),
  '/contacto': () => show(() => contact(main), 'contacto')
}, { notFound: () => show(() => kb.notFound(main)) }).start();
wireLayout(root);
kb.wireSearch(main);
const chat = mountChat();
root.addEventListener('click', e => { if (e.target.closest('[data-openchat]')) chat?.open(); });

// Cambios desde el panel (artículos, ajustes, incidentes) se ven al instante; no se repinta un formulario a medio llenar.
db.subscribe(ch => {
  if (ch.type === 'log' || ['tickets', 'notifications', 'chats', 'votes'].includes(ch.col)) { if (ch.col === 'votes') current(); return; }
  paintChrome();
  const busy = [...main.querySelectorAll('input, textarea')].some(el => el === document.activeElement || (el.type !== 'file' && el.closest('[data-contact]') && el.value));
  if (!busy) current();
});
