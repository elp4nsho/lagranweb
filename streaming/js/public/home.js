// Inicio: billboard destacado (rotativo, elegido en el CMS) y carruseles en el orden curado.
import { settings } from '../data/db.js';
import { db } from '../data/db.js';
import { html, raw, escape } from '../../../assets/core/ui.js';
import { artCard } from '../shared/art.js';
import { homeRows, isAvailable, allowedFor, metaLine, match, resumePoint, canWatch, episodesOf, visibleTitles } from '../shared/catalog.js';

export function tile(t, extra = '') {
  return `<a class="tile" href="#/titulo/${t.id}" data-t="${t.id}" aria-label="${escape(t.title)}">${artCard(t)}${extra}</a>`;
}
export function contTile({ prog, title }) {
  const ep = prog.episodeId ? episodesOf(title).find(e => e.id === prog.episodeId) : null;
  return `<a class="tile" href="ver.html?t=${title.id}${ep ? '&e=' + ep.id : ''}" aria-label="Continuar ${escape(title.title)}">${artCard(title, { badge: '<span class="tag badge plain">▶</span>' })}
    <div class="bar"><i style="--v:${Math.round(prog.position / prog.duration * 100)}%"></i></div><span class="sub">${ep ? `T${ep.season}:E${ep.n} · ${escape(ep.title)}` : `Quedan ${Math.max(1, Math.round((prog.duration - prog.position) / 60))} min`}</span></a>`;
}
export function rowHTML(title, items, id) {
  return `<section class="st-row container" data-anim><h2>${escape(title)}</h2><div class="row-wrap"><button class="row-arrow l" data-scroll="-1" aria-label="Anterior">‹</button><div class="row-scroll" id="${id}">${items}</div><button class="row-arrow r" data-scroll="1" aria-label="Siguiente">›</button></div></section>`;
}

export function renderHome(el, ctx) {
  let idx = 0, timer;
  const draw = () => {
    const { user, profile } = ctx;
    const vis = visibleTitles(profile);
    let bb = (settings().billboard || []).map(id => db.get('titles', id)).filter(t => t && isAvailable(t) && allowedFor(profile, t));
    if (!bb.length) bb = vis.slice().sort((a, b) => b.trending - a.trending).slice(0, 1);
    idx = idx % Math.max(1, bb.length);
    const t = bb[idx];
    const rows = homeRows(profile);
    const blocked = !canWatch(user);
    el.innerHTML = html`
      ${blocked ? raw(`<div class="container" style="padding-top:12px"><div class="card row between"><span>⚠️ Tu suscripción está <b>${escape(user.subStatus)}</b>. Puedes explorar, pero para reproducir debes reactivarla.</span><a class="btn btn-primary btn-sm" href="cuenta.html#plan">Reactivar</a></div></div>`) : ''}
      ${profile.kids ? raw('<div class="container" style="padding-top:12px"><span class="badge badge-success">Perfil infantil · solo contenido TE y 7+</span></div>') : ''}
      ${t ? raw(html`<section class="billboard" aria-label="Destacado">
        <div class="bg"><div class="art">${raw(artCardBg(t))}</div></div><div class="scrim"></div>
        <div class="container"><div class="content" data-anim>
          ${t.original ? raw('<span class="eyebrow">Original Andes+</span>') : ''}
          <h1 id="bbTitle">${t.title}</h1>
          <div class="meta"><span class="match">${match(t)}% para ti</span><span class="rating">${t.maturity}</span><span>${metaLine(t)}</span></div>
          <p style="margin:12px 0 18px;font-size:17px">${t.synopsis}</p>
          <div class="row"><a class="btn btn-primary btn-lg" id="bbPlay" href="ver.html?t=${t.id}${t.type === 'serie' ? '&e=' + resumePoint(profile, t).epId : ''}">▶ Reproducir</a><a class="btn btn-lg" href="#/titulo/${t.id}">ⓘ Más información</a></div>
        </div></div>
        ${bb.length > 1 ? raw(`<div class="bb-dots">${bb.map((_, i) => `<button class="${i === idx ? 'on' : ''}" data-bb="${i}" aria-label="Destacado ${i + 1}"></button>`).join('')}</div>`) : ''}
      </section>`) : ''}
      <div class="rows">${raw(rows.map((r, i) => rowHTML(r.c.name, r.cont ? r.cont.map(contTile).join('') : r.items.map(x => tile(x)).join(''), 'row' + i)).join(''))}</div>`;
    el.querySelectorAll('[data-bb]').forEach(b => b.onclick = () => { idx = +b.dataset.bb; draw(); restart(); });
  };
  const restart = () => { clearInterval(timer); timer = setInterval(() => { if (!document.querySelector('.modal-backdrop')) { idx++; draw(); } }, 9000); };
  el.addEventListener('click', e => { const s = e.target.closest('[data-scroll]'); if (!s) return; const sc = s.parentElement.querySelector('.row-scroll'); sc.scrollBy({ left: sc.clientWidth * .85 * +s.dataset.scroll, behavior: 'smooth' }); });
  draw(); restart();
  return { update: c => { Object.assign(ctx, c); draw(); }, destroy: () => clearInterval(timer) };
}
function artCardBg(t) { return artCard({ ...t, original: false }, { title: false }).replace('class="art-svg"', 'class="art-svg anim"'); }
