// Sitio público (SPA por hash): inicio, campañas, donar, voluntariado, transparencia y noticias.
import { db, auth, site, STAFF } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { escape, $ } from '../../../assets/core/ui.js';
import home from './home.js';
import { list as campaignList, detail as campaignDetail } from './campaigns.js';
import donate from './donate.js';
import volunteer from './volunteer.js';
import transparency from './transparency.js';
import { list as newsList, detail as newsDetail } from './news.js';

const app = $('#app');
let current = null;

function show(fn, params = {}, query = {}) {
  current = { fn, params, query };
  app.onclick = null; app.onchange = null; app.oninput = null; app.onsubmit = null;
  fn(app, params, query, { rerender });
}
function rerender() { if (current) current.fn(app, current.params, current.query, { rerender }); }

const router = createRouter({
  '/': () => show(home),
  '/campanas': (_, q) => show(campaignList, {}, q),
  '/campanas/:id': p => show(campaignDetail, p),
  '/donar': (_, q) => show(donate, {}, q),
  '/voluntariado': () => show(volunteer),
  '/transparencia': () => show(transparency),
  '/noticias': () => show(newsList),
  '/noticias/:id': p => show(newsDetail, p)
}, {
  notFound: () => { current = null; app.innerHTML = '<section class="section"><div class="container card empty"><span class="icon">🌾</span><h2>Página no encontrada</h2><a class="btn btn-primary" href="#/">Volver al inicio</a></div></section>'; },
  after: r => {
    router.highlight($('#headNav'));
    $('#headNav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    if (!(r.pattern === '/donar' && r.query.step)) window.scrollTo(0, 0);
  }
});

function chrome() {
  const s = site(), u = auth.current();
  const acc = $('#accountLink');
  acc.innerHTML = `<span class="nav-ico" aria-hidden="true">👤</span>${escape(u ? (STAFF.includes(u.role) ? 'Panel' : `Hola, ${u.name.split(' ')[0]}`) : 'Mi cuenta')}`;
  acc.href = u && STAFF.includes(u.role) ? 'admin.html' : 'cuenta.html';
  $('#foot').innerHTML = `
    <div class="stack"><a href="#/" class="logo"><span class="logo-mark" aria-hidden="true">🌱</span>Raíces del Sur</a>
      <p class="muted small" style="margin:0">${escape(s.mission)}</p>
      <p class="muted small" style="margin:0">Fundación ficticia creada para una demo de La Gran Web. No se realizan cobros reales.</p></div>
    <nav class="stack small" aria-label="Participa"><b>Participa</b><a href="#/donar">Donar</a><a href="#/donar?type=mensual">Ser socio mensual</a><a href="#/voluntariado">Voluntariado</a><a href="cuenta.html">Mi cuenta</a></nav>
    <nav class="stack small" aria-label="Fundación"><b>Fundación</b><a href="#/transparencia">Transparencia</a><a href="#/noticias">Noticias</a><a href="login.html">Acceso equipo</a></nav>
    <div class="stack small"><b>Contacto</b><span class="muted">${escape(s.contactEmail)}</span><span class="muted">${escape(s.phone)}</span><span class="muted">${escape(s.address)}</span></div>`;
}

$('#menuBtn').addEventListener('click', () => {
  const open = $('#headNav').classList.toggle('open');
  $('#menuBtn').setAttribute('aria-expanded', String(open));
});
addEventListener('scroll', () => $('#siteHead').classList.toggle('scrolled', scrollY > 8), { passive: true });

// Cambios desde el panel (otra pestaña) o propios se reflejan sin recargar.
db.subscribe(ch => {
  if (ch.type === 'log') return;
  chrome();
  const a = document.activeElement;
  if (a && app.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  if (document.querySelector('.modal-backdrop')) return;
  if (current && current.fn.live !== false) rerender();
});

chrome();
router.start();
