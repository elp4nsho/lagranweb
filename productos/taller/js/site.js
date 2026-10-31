// Sitio público: la portada se arma con las secciones que aportan los módulos activos (site:home),
// el menú con sus enlaces (site:nav, hueco 'nav') y las rutas con site:routes.
import { app } from './app.js';
import { escape } from '../../../assets/core/ui.js';

const S = () => app.settings();
app.site({
  nav: [['Inicio', '#/'], ['Servicios', '#/servicios'], { slot: 'nav' }, ['Contacto', '#/contacto']],
  routes: {
    '/': view => {
      const secs = app.ordered('site:home');
      const s = S();
      view.innerHTML = (s.announcement ? `<div class="announce"><div class="container">${escape(s.announcement)}</div></div>` : '') + secs.map(x => x.render()).join('');
      secs.forEach(x => x.mount && x.mount(view));
    }
  },
  footer: (() => {
    const s = S();
    return `<div class="foot-grid"><div class="stack" style="gap:6px"><b>${escape(app.brand.logo || '')} ${escape(s.name)}</b><span class="small muted">${escape(s.tagline || '')}</span><span class="small">📍 ${escape(s.address || '')}</span><span class="small">📞 ${escape(s.phone || '')}</span></div>
      <div class="stack small" style="gap:6px"><a href="#/servicios">Servicios</a><a href="#/contacto">Contacto</a>${app.has('agenda') ? '<a href="#/agendar">Agendar hora</a>' : ''}${app.has('ordenes') ? '<a href="#/ot">Seguir mi OT</a>' : ''}</div>
      <div class="stack small" style="gap:6px">${app.has('portal') ? '<a href="login.html">Mi cuenta</a>' : ''}<a href="login.html">Ingreso equipo</a><a href="#/privacidad">Privacidad</a></div></div>
      <p class="small muted">© ${new Date().getFullYear()} ${escape(s.name)}${app.production ? '' : ' · demo simulada en el navegador'}</p>`;
  })()
});
