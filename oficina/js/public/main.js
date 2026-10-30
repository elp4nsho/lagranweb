// Sitio público: directorio, mapa y organigrama de la empresa elegida.
import { db, auth } from '../data/db.js';
import { createRouter } from '../../../assets/core/router.js';
import { escape } from '../../../assets/core/ui.js';
import { buildIndex, getCompanyId } from '../shared/util.js';
import { mountTopbar } from '../shared/topnav.js';
import * as directory from './directory.js';
import * as map from './map.js';
import * as org from './org.js';
import { openProfile } from './profile.js';

const view = document.getElementById('view');
let idx = buildIndex(db, getCompanyId(db));
let current = null;

const ctx = {
  db, auth,
  get idx() { return idx; },
  get site() { return db.getValue('site', {}); },
  openProfile: id => openProfile(ctx, id),
  locate: id => router.go(`/mapa?p=${encodeURIComponent(id)}`)
};

const top = mountTopbar(document.getElementById('topbar'), {
  db, auth,
  links: [{ href: '#/', label: 'Directorio', ico: '👥' }, { href: '#/mapa', label: 'Mapa', ico: '🗺️' }, { href: '#/organigrama', label: 'Organigrama', ico: '🌳' }],
  onCompany: () => { idx = buildIndex(db, getCompanyId(db)); directory.resetFilters(); map.reset(); paintChrome(); router.refresh(); }
});

function paintChrome() {
  const s = ctx.site, c = idx.company;
  document.getElementById('heroTitle').textContent = s.heroTitle || '¿Quién es quién?';
  document.getElementById('heroSub').textContent = s.heroSubtitle || '';
  document.getElementById('coLine').textContent = c ? `${c.name} · ${c.tagline} · ${c.city}` : '';
  const ann = db.query('announcements', a => a.published && a.audience === 'todos' && (!a.companyId || a.companyId === c?.id))
    .sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date)).slice(0, 2);
  document.getElementById('announcements').innerHTML = ann.map(a => `<div class="card announce" data-anim><span class="ico" aria-hidden="true">${a.pinned ? '📌' : '📣'}</span><div><h3>${escape(a.title)}</h3><p>${escape(a.body)}</p></div></div>`).join('');
}

function mount(mod, ...args) {
  document.body.classList.toggle('compact-hero', mod !== directory);
  if (current !== mod) { current = mod; view.innerHTML = ''; }
  mod.render(view, ctx, ...args);
  top.redraw();
  router.highlight(document.getElementById('topbar'));
}

const router = createRouter({
  '/': () => mount(directory),
  '/mapa': (_, q) => mount(map, q),
  '/organigrama': () => ctx.site.showOrg === false ? router.go('/') : mount(org),
  '/persona/:id': ({ id }) => { mount(directory); openProfile(ctx, id); }
}, { notFound: () => router.go('/') });

db.subscribe(() => {
  if (!idx.company || !db.get('companies', idx.company.id)) { idx = buildIndex(db, getCompanyId(db)); }
  else idx = buildIndex(db, idx.company.id);
  paintChrome();
  current && current.update ? current.update(view, ctx) : router.refresh();
});

paintChrome();
router.start();
