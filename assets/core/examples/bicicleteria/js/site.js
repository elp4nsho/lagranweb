// Sitio público: portada con datos de la configuración y seguimiento de una orden por código.
import { app, ORDER } from './app.js';
import { historyTimeline, emptyState, card } from '../../../blocks.js';
import { html, raw } from '../../../ui.js';

const { db } = app;
app.site({
  nav: [['Inicio', '#/'], ['Seguimiento', '#/seguimiento']],
  routes: {
    '/': view => {
      const s = app.settings();
      view.innerHTML = html`<section class="section site-hero"><div class="container"><div class="hero-text stack">
        <span class="eyebrow">Bicicletería · taller</span><h1>${s.tagline}</h1>
        <p class="muted">Mantenciones, frenos y cambios con seguimiento en línea. Llámanos al ${s.phone}.</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#/seguimiento">Seguir mi orden</a></div></div></div></section>`;
    },
    '/seguimiento': (view, { query }) => {
      const o = query.code && db.find('orders', x => x.code.toLowerCase() === query.code.trim().toLowerCase());
      view.innerHTML = html`<section class="section"><div class="container stack" style="max-width:640px">
        <h1>Seguimiento</h1>
        <form class="row" data-f><input class="input" name="code" placeholder="Ej: OT-1001" value="${query.code || ''}" style="flex:1" aria-label="Código"><button class="btn btn-primary">Buscar</button></form>
        ${o ? raw(card(`${o.code} · ${o.bike}`, historyTimeline(o.history, ORDER), { actions: ORDER.badge(o.status) }))
          : query.code ? raw(emptyState({ icon: '🔎', title: 'No encontramos esa orden', text: 'Revisa el código de tu comprobante.' })) : ''}
      </div></section>`;
      view.querySelector('[data-f]').onsubmit = e => { e.preventDefault(); location.hash = '#/seguimiento?code=' + encodeURIComponent(e.target.code.value); };
    }
  }
});
