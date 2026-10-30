// Cabecera de la app (inicio, series, películas, mi lista, búsqueda) y guardas de acceso.
import { db, auth, STAFF } from '../data/db.js';
import { $, escape, ago } from '../../../assets/core/ui.js';
import { currentProfile, setProfile, profilesOf } from './catalog.js';

// Exige sesión y perfil elegido. Devuelve { user, profile } o detiene el módulo (redirigiendo).
export async function requireViewer({ needProfile = true } = {}) {
  const u = auth.current();
  if (!u) { location.replace(`login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search + location.hash)}`); await new Promise(() => {}); }
  const p = currentProfile(u);
  if (needProfile && !p) { location.replace('perfiles.html'); await new Promise(() => {}); }
  return { user: u, profile: p };
}

export function renderHeader(el, { user, profile, active = '' }) {
  const staff = STAFF.includes(user.role);
  const notes = db.query('notifications', n => n.userId === user.id && !n.read);
  const others = staff ? [] : profilesOf(user).filter(p => p.id !== profile?.id);
  const links = [['app.html#/', 'Inicio', 'inicio'], ['app.html#/series', 'Series', 'series'], ['app.html#/peliculas', 'Películas', 'peliculas'], ['app.html#/mi-lista', 'Mi lista', 'lista']];
  el.innerHTML = `<div class="container"><div class="bar">
      <a class="logo-word" href="app.html#/">Andes<b>+</b></a>
      <nav class="st-nav" aria-label="Principal">${links.map(([h, l, k]) => `<a href="${h}" class="${active === k ? 'active' : ''}">${l}</a>`).join('')}</nav>
      <div class="st-actions">
        <a class="btn btn-ghost btn-icon" href="app.html#/buscar" aria-label="Buscar">🔍</a>
        ${notes.length ? `<a class="btn btn-ghost btn-sm hide-sm" href="cuenta.html#soporte" title="${escape(notes[0].text)}">🔔 ${notes.length}</a>` : ''}
        <div class="rel"><button class="prof-btn" id="profBtn" aria-expanded="false" aria-label="Menú de perfil"><span class="p-ava" style="--av:${profile?.color || 'var(--primary)'}">${profile?.avatar || '👤'}</span><span class="hide-sm">${escape(profile?.name || user.name)}</span> ▾</button>
          <div class="menu-pop" id="profPop" hidden>
            ${others.map(p => `<button class="item" data-switch="${p.id}"><span class="p-ava" style="--av:${p.color};width:28px;height:28px;font-size:15px">${p.avatar}</span>${escape(p.name)}${p.pin ? ' 🔒' : ''}</button>`).join('')}
            ${staff ? '<a class="item" href="admin.html">🛠️ Volver al CMS</a>' : '<a class="item" href="perfiles.html?manage=1">✏️ Administrar perfiles</a><a class="item" href="cuenta.html">⚙️ Cuenta</a>'}
            ${notes.length ? `<div class="item" style="cursor:default"><small>${escape(notes[0].text)} · ${ago(notes[0].createdAt)}</small></div>` : ''}
            <button class="item" id="logout">↩︎ Cerrar sesión</button>
          </div></div>
      </div></div>
      <nav class="mob-nav" aria-label="Secciones">${links.map(([h, l, k]) => `<a class="chip ${active === k ? 'active' : ''}" href="${h}">${l}</a>`).join('')}<a class="chip" href="app.html#/buscar">Buscar</a></nav></div>`;
  $('#profBtn', el).onclick = e => { e.stopPropagation(); const p = $('#profPop', el); p.hidden = !p.hidden; e.currentTarget.setAttribute('aria-expanded', String(!p.hidden)); };
  el.querySelectorAll('[data-switch]').forEach(b => b.onclick = () => { const p = db.get('profiles', b.dataset.switch); if (p.pin) { location.href = `perfiles.html?pick=${p.id}`; return; } setProfile(user, p.id); location.href = 'app.html#/'; });
  $('#logout', el).onclick = () => { setProfile(user, null); auth.logout(); location.href = 'index.html'; };
}
document.addEventListener('click', e => { if (!e.target.closest('.menu-pop')) document.querySelectorAll('.menu-pop').forEach(x => (x.hidden = true)); });
