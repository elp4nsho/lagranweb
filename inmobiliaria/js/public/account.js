// Mi cuenta (cliente / propietario): favoritos, búsquedas guardadas, alertas, visitas, propiedades y perfil.
import { escape, toast, confirm, date, dateTime, ago } from '../../../assets/core/ui.js';
import { db, auth, uf, homeFor } from '../data/db.js';
import { PSTATUS, VSTATUS, badge, matchQuery, queryLabel, qs, mainPrice, comunaName } from '../shared/format.js';
import { propertyArt, icon } from '../shared/art.js';
import { propertyCard, V } from './cards.js';

const TABS = [['favoritos', 'Favoritos'], ['busquedas', 'Búsquedas guardadas'], ['alertas', 'Alertas'], ['visitas', 'Mis visitas'], ['propiedades', 'Mis propiedades'], ['perfil', 'Perfil']];

export function renderAccount(tab = 'favoritos') {
  const view = V(), u = auth.current();
  if (!u) {
    view.innerHTML = `<section class="section"><div class="container" style="max-width:640px"><div class="card empty"><span class="icon">👤</span><h1>Mi cuenta</h1><p>Ingresa para ver tus favoritos, búsquedas guardadas, alertas y visitas.</p><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/cuenta/' + tab)}">Ingresar o crear cuenta</a></div></div></section>`;
    return;
  }
  const U = uf();
  const counts = {
    favoritos: db.count('favorites', f => f.userId === u.id), busquedas: db.count('savedSearches', s => s.userId === u.id),
    alertas: db.count('notifications', n => n.userId === u.id && !n.read), visitas: db.count('visits', v => (v.userId === u.id || v.email === u.email) && ['pendiente', 'confirmada'].includes(v.status))
  };
  const owner = db.find('owners', o => o.userId === u.id || o.email === u.email);
  view.innerHTML = `<section class="section" style="padding-top:28px"><div class="container">
    <div class="account-head"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')};--size:56px">${escape(u.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>
      <div style="flex:1;min-width:200px"><h1 style="margin:0;font-size:clamp(24px,3vw,32px)">Hola, ${escape(u.name.split(' ')[0])}</h1><span class="muted">${escape(auth.roleName(u.role))} · ${escape(u.email)}</span></div>
      ${['admin', 'editor', 'corredor'].includes(u.role) ? `<a class="btn btn-primary" href="${homeFor(u)}">Ir a mi panel</a>` : ''}
      <button class="btn btn-ghost" data-logout>Cerrar sesión</button></div>
    <div class="tabs" role="tablist">${TABS.map(([k, l]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/cuenta/${k}" role="tab" aria-selected="${k === tab}">${l}${counts[k] ? ` <span class="badge badge-primary plain">${counts[k]}</span>` : ''}</a>`).join('')}</div>
    <div style="margin-top:20px" data-body></div></div></section>`;
  view.querySelector('[data-logout]').onclick = () => { auth.logout(); location.hash = '/'; location.reload(); };
  const body = view.querySelector('[data-body]');
  const T = {
    favoritos() {
      const list = db.query('favorites', f => f.userId === u.id).map(f => db.get('properties', f.propertyId)).filter(Boolean);
      body.innerHTML = list.length ? `<div class="prop-grid">${list.map(propertyCard).join('')}</div>` : `<div class="card empty"><span class="icon">♡</span><p>Aún no guardas favoritos. Usa el corazón en cualquier propiedad.</p><a class="btn btn-primary" href="#/buscar">Buscar propiedades</a></div>`;
      body.addEventListener('click', e => { if (e.target.closest('[data-fav]')) setTimeout(() => renderAccount('favoritos'), 50); });
    },
    busquedas() {
      const list = db.query('savedSearches', s => s.userId === u.id);
      body.innerHTML = list.length ? `<div class="card">${list.map(s => {
        const matches = db.query('properties', p => matchQuery(p, s.query, U));
        const fresh = matches.filter(p => p.publishedAt && p.publishedAt > (s.lastSeen || s.createdAt)).length;
        return `<div class="list-row"><div style="min-width:0;flex:1 1 260px"><b>${escape(s.name)}</b> ${fresh ? `<span class="badge badge-danger">${fresh} nuevas</span>` : ''}<div class="muted small">${escape(queryLabel(s.query))} · ${matches.length} resultados · creada ${date(s.createdAt)}</div></div>
          <div class="row" style="gap:10px"><label class="row small" style="gap:6px"><span class="switch"><input type="checkbox" data-alert="${s.id}" ${s.alerts ? 'checked' : ''}><span></span></span> Alertas</label>
          <button class="btn btn-sm btn-primary" data-run="${s.id}">Ver resultados</button><button class="btn btn-sm btn-ghost" data-del="${s.id}" aria-label="Eliminar">${icon('x', 15)}</button></div></div>`;
      }).join('')}</div>` : `<div class="card empty"><span class="icon">🔔</span><p>Guarda una búsqueda desde los resultados para recibir alertas cuando se publiquen propiedades que coincidan.</p><a class="btn btn-primary" href="#/buscar">Ir al buscador</a></div>`;
      body.querySelectorAll('[data-alert]').forEach(c => c.onchange = () => { db.update('savedSearches', c.dataset.alert, { alerts: c.checked }); toast(c.checked ? 'Alertas activadas' : 'Alertas desactivadas', 'info'); });
      body.querySelectorAll('[data-run]').forEach(b => b.onclick = () => { const s = db.get('savedSearches', b.dataset.run); db.update('savedSearches', s.id, { lastSeen: new Date().toISOString() }); location.hash = '/buscar?' + qs(s.query); });
      body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (await confirm('¿Eliminar esta búsqueda guardada?', { danger: true, ok: 'Eliminar' })) { db.remove('savedSearches', b.dataset.del); renderAccount('busquedas'); } });
    },
    alertas() {
      const list = db.query('notifications', n => n.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      body.innerHTML = `<div class="card"><div class="row between"><h3 style="margin:0">Alertas y avisos</h3>${list.some(n => !n.read) ? '<button class="btn btn-sm" data-readall>Marcar todo como leído</button>' : ''}</div>
        ${list.length ? list.map(n => `<div class="notif ${n.read ? '' : 'unread'}"><span style="color:var(--primary)">${icon('bell')}</span><div style="flex:1;min-width:0"><b>${escape(n.text)}</b><div class="muted small">${ago(n.createdAt)}</div></div>${n.link ? `<a class="btn btn-sm" href="${escape(n.link)}" data-open="${n.id}">Ver</a>` : ''}</div>`).join('') : '<p class="empty">No tienes alertas.</p>'}</div>`;
      body.querySelector('[data-readall]')?.addEventListener('click', () => { list.filter(n => !n.read).forEach(n => db.update('notifications', n.id, { read: true })); renderAccount('alertas'); });
      body.querySelectorAll('[data-open]').forEach(a => a.addEventListener('click', () => db.update('notifications', a.dataset.open, { read: true })));
    },
    visitas() {
      const list = db.query('visits', v => v.userId === u.id || v.email === u.email).sort((a, b) => b.date.localeCompare(a.date));
      body.innerHTML = list.length ? `<div class="card">${list.map(v => { const p = db.get('properties', v.propertyId); const ag = db.get('agents', v.agentId); return `<div class="list-row"><div class="cell-prop"><span class="th">${p ? propertyArt(p, 'fachada', { label: false }) : ''}</span><div><b>${escape(p?.title || 'Propiedad')}</b><span class="muted small">${dateTime(v.date)} · ${escape(ag?.name || '')}</span></div></div>
        <div class="row" style="gap:8px">${badge(VSTATUS, v.status)}${['pendiente', 'confirmada'].includes(v.status) && new Date(v.date) > new Date() ? `<button class="btn btn-sm btn-ghost" data-cancel="${v.id}">Cancelar</button>` : ''}${p ? `<a class="btn btn-sm" href="#/propiedad/${p.id}">Ver ficha</a>` : ''}</div></div>`; }).join('')}</div>`
        : `<div class="card empty"><span class="icon">📅</span><p>No tienes visitas agendadas.</p></div>`;
      body.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => { if (await confirm('¿Cancelar esta visita?', { ok: 'Cancelar visita', danger: true })) { db.update('visits', b.dataset.cancel, { status: 'cancelada' }); db.log('visita', `${u.name} canceló una visita`, u.id); toast('Visita cancelada', 'info'); renderAccount('visitas'); } });
    },
    propiedades() {
      const list = owner ? db.query('properties', p => p.ownerId === owner.id) : [];
      body.innerHTML = list.length ? `<div class="card">${list.map(p => `<div class="list-row"><div class="cell-prop"><span class="th">${propertyArt(p, 'fachada', { label: false })}</span><div><b>${escape(p.title)}</b><span class="muted small">${escape(p.code)} · ${mainPrice(p)} · ${p.views} visitas a la ficha · ${db.count('leads', l => l.propertyId === p.id)} interesados</span></div></div>
          <div class="row" style="gap:8px">${badge(PSTATUS, p.status)}${['publicada', 'reservada', 'vendida', 'arrendada'].includes(p.status) ? `<a class="btn btn-sm" href="#/propiedad/${p.id}">Ver publicación</a>` : ''}</div>
          <details class="full" style="width:100%"><summary class="small muted" style="cursor:pointer">Historial de estados</summary><ul class="small">${(p.history || []).slice().reverse().map(h => `<li>${date(h.at)} · <b>${escape(PSTATUS[h.to]?.[0] || h.to)}</b> · ${escape(h.note || '')}</li>`).join('')}</ul></details></div>`).join('')}</div>`
        : `<div class="card empty"><span class="icon">🏡</span><p>No tienes propiedades publicadas con nosotros.</p><a class="btn btn-primary" href="#/publicar">Publicar mi propiedad</a></div>`;
      if (list.length) body.insertAdjacentHTML('beforeend', '<p style="margin-top:12px"><a class="btn" href="#/publicar">+ Publicar otra propiedad</a></p>');
    },
    perfil() {
      body.innerHTML = `<form class="card stack" style="max-width:560px" data-prof>
        <div class="field"><label for="pf-n">Nombre</label><input class="input" id="pf-n" name="name" value="${escape(u.name)}" required></div>
        <div class="field"><label for="pf-p">Teléfono</label><input class="input" id="pf-p" name="phone" value="${escape(u.phone || '')}"></div>
        <div class="field"><label for="pf-pw">Nueva contraseña</label><input class="input" id="pf-pw" name="password" type="password" placeholder="Déjala vacía para no cambiarla" autocomplete="new-password"></div>
        <button class="btn btn-primary">Guardar cambios</button></form>`;
      body.querySelector('[data-prof]').addEventListener('submit', e => {
        e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
        if (!d.name.trim()) return toast('El nombre es obligatorio', 'warning');
        const patch = { name: d.name.trim(), phone: d.phone.trim() }; if (d.password) patch.password = d.password;
        db.update('users', u.id, patch); toast('Perfil actualizado', 'success'); renderAccount('perfil');
      });
    }
  };
  (T[tab] || T.favoritos)();
}
