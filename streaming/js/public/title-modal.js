// Modal de detalle: temporadas y episodios, elenco, clasificación, tráiler simulado, mi lista y similares.
import { db } from '../data/db.js';
import { html, raw, modal, toast, escape } from '../../../assets/core/ui.js';
import { artCard, artSVG } from '../shared/art.js';
import { metaLine, match, resumePoint, progressOf, inList, toggleList, episodesOf, visibleTitles, fmtDur } from '../shared/catalog.js';

export function openTitle(t, ctx, { onClose } = {}) {
  const { profile } = ctx;
  let season = 1;
  const rp = resumePoint(profile, t);
  const pr = progressOf(profile.id, t.id);
  if (t.type === 'serie' && rp.epId) season = episodesOf(t).find(e => e.id === rp.epId)?.season || 1;
  const similar = visibleTitles(profile).filter(x => x.id !== t.id && x.genres.some(g => t.genres.includes(g))).sort((a, b) => b.trending - a.trending).slice(0, 6);
  const playHref = `ver.html?t=${t.id}${rp.epId ? '&e=' + rp.epId : ''}`;
  const resumeLabel = pr && (rp.pos > 0 || t.type === 'serie') ? (t.type === 'serie' ? `▶ Continuar T${episodesOf(t).find(e => e.id === rp.epId)?.season}:E${episodesOf(t).find(e => e.id === rp.epId)?.n}` : '▶ Continuar') : '▶ Reproducir';
  let switching = false;
  const m = modal({ title: t.title, size: 'lg', onClose: () => !switching && onClose?.(), body: '<div class="tmodal-inner"></div>' });
  m.el.classList.add('tmodal');
  const box = m.el.querySelector('.tmodal-inner');
  const draw = () => {
    const mine = inList(profile.preview ? profile : db.get('profiles', profile.id) || profile, t.id);
    const rating = (profile.ratings || {})[t.id];
    box.innerHTML = html`<div class="tm-hero">${raw(artCard(t, { title: false }))}<div class="scrim"></div>
      <div class="over"><h2>${t.title}</h2><div class="row" style="gap:8px">
        <a class="btn btn-primary" href="${playHref}" id="tmPlay">${resumeLabel}</a>
        <button class="btn" id="tmList" aria-pressed="${mine}">${mine ? '✓ En mi lista' : '＋ Mi lista'}</button>
        <button class="btn btn-icon" data-rate="1" aria-label="Me gusta" aria-pressed="${rating === 1}">${rating === 1 ? '👍' : '👍🏻'}</button>
        <button class="btn btn-icon" data-rate="-1" aria-label="No me gusta" aria-pressed="${rating === -1}">👎</button>
      </div></div></div>
      <div class="tm-body">
        <div class="stack" style="gap:10px">
          <div class="row" style="gap:10px"><span class="match">${match(t)}% para ti</span><span class="rating">${t.maturity}</span><span class="muted">${metaLine(t)}</span>${t.original ? raw('<span class="badge badge-primary">Original</span>') : ''}</div>
          ${pr && t.type !== 'serie' ? raw(`<div class="progress"><i style="--v:${Math.round(pr.position / pr.duration * 100)}%"></i></div>`) : ''}
          <p style="margin:0">${t.synopsis}</p>
          <div class="trailer" id="trailer">${raw(artSVG(t))}<button class="play" id="trBtn" aria-label="Ver tráiler">▶</button></div>
        </div>
        <div class="stack small" style="gap:8px"><div><span class="muted">Elenco:</span> ${t.cast.join(', ')}</div><div><span class="muted">Dirección:</span> ${t.director}</div><div><span class="muted">Géneros:</span> ${t.genres.join(', ')}</div><div><span class="muted">Valoración:</span> ★ ${t.score.toFixed(1)} / 5</div>${t.availableTo ? raw(`<div class="badge badge-warning plain">Disponible hasta el ${new Date(t.availableTo).toLocaleDateString('es-CL')}</div>`) : ''}</div>
      </div>
      ${t.type === 'serie' ? raw(html`<div style="padding:0 var(--pad) var(--pad)"><div class="row between"><h3 style="margin:0">Episodios</h3>${t.seasons.length > 1 ? raw(`<select class="select" id="season" style="width:auto" aria-label="Temporada">${t.seasons.map(s => `<option value="${s.n}" ${s.n === season ? 'selected' : ''}>Temporada ${s.n}</option>`).join('')}</select>`) : raw('<span class="muted">Temporada 1</span>')}</div>
        <ul class="ep-list" style="margin-top:10px">${t.seasons.find(s => s.n === season).episodes.map(e => { const p = db.find('progress', x => x.profileId === profile.id && x.episodeId === e.id); return raw(html`<li><a class="ep" href="ver.html?t=${t.id}&e=${e.id}"><span class="num">${e.n}</span><div>${raw(artCard({ ...t, art: { ...t.art, hue: (t.art.hue || 0) + e.n * 6 } }, { title: false }))}${p ? raw(`<div class="progress" style="height:4px;margin-top:4px"><i style="--v:${Math.round(p.position / p.duration * 100)}%"></i></div>`) : ''}</div><div><b>${e.title}</b> <small>${fmtDur(e.duration)}</small><small>${e.synopsis}</small></div></a></li>`); })}</ul></div>`) : ''}
      ${similar.length ? raw(html`<div style="padding:0 var(--pad) var(--pad)"><h3>Más títulos similares</h3><div class="title-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${raw(similar.map(s => `<a class="tile" href="#/titulo/${s.id}" data-sim="${s.id}">${artCard(s)}<span class="sub">${s.year} · ${s.maturity}</span></a>`).join(''))}</div></div>`) : ''}`;
    box.querySelector('#season')?.addEventListener('change', e => { season = +e.target.value; draw(); });
    box.querySelector('#tmList').onclick = () => { const on = toggleList(profile, t.id); toast(on ? 'Agregado a Mi lista' : 'Quitado de Mi lista', 'success'); setTimeout(draw, 120); };
    box.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => {
      const v = +b.dataset.rate; const ratings = { ...(profile.ratings || {}) }; ratings[t.id] = ratings[t.id] === v ? 0 : v; profile.ratings = ratings;
      if (!profile.preview) db.update('profiles', profile.id, { ratings });
      toast(ratings[t.id] ? '¡Gracias! Mejoraremos tus recomendaciones' : 'Valoración quitada'); draw();
    });
    box.querySelector('#trBtn').onclick = () => {
      const tr = box.querySelector('#trailer');
      tr.innerHTML = artSVG(t, { anim: true }) + `<div class="player" style="position:absolute;inset:0;background:none"><div class="subs">Tráiler · ${escape(t.title)} · próximamente en Andes+</div></div>`;
      setTimeout(() => { if (tr.isConnected) { tr.innerHTML = artSVG(t) + '<button class="play" aria-label="Ver tráiler">↻</button>'; tr.querySelector('.play').onclick = () => box.querySelector('#trBtn') || draw(); } }, 6000);
    };
    box.querySelectorAll('[data-sim]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); switching = true; m.close(); location.replace(`#/titulo/${a.dataset.sim}`); }));
  };
  draw();
  return m;
}
