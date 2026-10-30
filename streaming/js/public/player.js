// Reproductor simulado: escena SVG animada, controles completos, subtítulos, calidad según plan,
// anuncios en plan Básico, PIN parental, progreso guardado ("continuar viendo") y siguiente episodio.
import { db, settings } from '../data/db.js';
import { html, raw, $, toast, escape } from '../../../assets/core/ui.js';
import { artCard } from '../shared/art.js';
import { requireViewer } from '../shared/header.js';
import { pinPrompt } from '../shared/pin.js';
import { isAvailable, allowedFor, episodesOf, durationOf, progressOf, saveProgress, nextEpisode, needsPin, canWatch, metaLine, fmtDur } from '../shared/catalog.js';

const { user, profile } = await requireViewer();
const qs = new URLSearchParams(location.search);
const t = db.get('titles', qs.get('t'));
const main = $('#main');
const fail = (msg, link = '<a class="btn btn-primary" href="app.html#/">Volver al inicio</a>') => { main.innerHTML = `<section class="section"><div class="container empty"><span class="icon">🎬</span><h2>${msg}</h2>${link}</div></section>`; };

async function start() {
  if (!t || !isAvailable(t)) return fail('Este título no está disponible');
  if (!allowedFor(profile, t)) return fail('Este título no está disponible para perfiles infantiles');
  if (!canWatch(user)) return fail(`Tu suscripción está ${user.subStatus}`, '<a class="btn btn-primary" href="cuenta.html#plan">Reactivar suscripción</a>');
  if (needsPin(user, profile, t) && !sessionStorage.getItem('andes:pin-ok:' + t.id)) {
    const ok = await pinPrompt(`Control parental · ${t.maturity}`, v => v === user.parentalPin);
    if (!ok) return fail('Se requiere el PIN parental para ver este título', '<a class="btn" href="app.html#/">Volver</a>');
    sessionStorage.setItem('andes:pin-ok:' + t.id, '1');
  }
  play();
}

const SUBS = {
  es: ['—¿Escuchaste eso?', '—Es el viento… o eso quiero creer.', '—No deberíamos estar aquí de noche.', '—Mañana cruzamos el paso, pase lo que pase.', '—Mi abuela decía que esta tierra recuerda todo.', '—Entonces que recuerde que volvimos.', '[música de tensión]', '—Prométeme que no vas a mirar atrás.'],
  en: ['—Did you hear that?', '—It’s the wind… or so I want to believe.', '—We shouldn’t be here at night.', '—Tomorrow we cross the pass, no matter what.', '—My grandmother said this land remembers everything.', '—Then let it remember we came back.', '[tense music]', '—Promise me you won’t look back.']
};
const QUALS = ['Auto', '480p', '720p', '1080p', '4K'];
const fmt = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const device = () => (innerWidth < 700 ? 'Celular' : innerWidth < 1100 ? 'Tablet' : 'Computador');

function play() {
  const eps = episodesOf(t);
  let ep = t.type === 'serie' ? eps.find(e => e.id === qs.get('e')) || eps[0] : null;
  const plan = db.get('plans', user.plan) || { maxQuality: '4K', ads: false };
  const maxQ = QUALS.indexOf(plan.maxQuality || '4K');
  const st = { playing: false, pos: 0, dur: 0, vol: .8, muted: false, subs: 'off', q: 'Auto', speed: 1, watched: 0, ad: plan.ads ? 5 : 0 };
  let raf = null, last = 0, lastSave = 0, idleT;

  const load = () => {
    st.dur = durationOf(t, ep?.id) * 60;
    const pr = db.find('progress', x => x.profileId === profile.id && x.titleId === t.id && x.episodeId === (ep?.id || null)) || (!ep && progressOf(profile.id, t.id));
    st.pos = pr && pr.position / pr.duration < .95 ? pr.position : 0;
    document.title = `${t.title}${ep ? ` · T${ep.season}:E${ep.n}` : ''} · Andes+`;
    history.replaceState(null, '', `ver.html?t=${t.id}${ep ? '&e=' + ep.id : ''}`);
  };
  load();

  main.innerHTML = html`<div class="player" id="pl" tabindex="0" aria-label="Reproductor de video">
      <div class="scene">${raw(artCard({ ...t, original: false }, { title: false }))}<div class="sun"></div><div class="grain"></div></div>
      <div class="subs" id="subs" aria-live="polite"></div>
      ${st.ad ? raw('<span class="badge badge-warning ad-badge" id="ad">Anuncio · tu película comienza en 5 s</span>') : ''}
      <button class="center-btn" id="big" aria-label="Reproducir">▶</button>
      <div class="top"><a class="ctl" href="app.html#/" aria-label="Volver">←</a><div style="flex:1;min-width:0"><b>${t.title}</b><br><small class="muted" id="eptitle"></small></div><span class="badge plain" id="qbadge">Auto</span></div>
      <div class="next-up card" id="nextUp" hidden></div>
      <div class="ctl-menu" id="menu" hidden></div>
      <div class="controls">
        <input class="seek" id="seek" type="range" min="0" max="1000" value="0" aria-label="Línea de tiempo">
        <div class="ctl-row">
          <button class="ctl" id="pp" aria-label="Reproducir/Pausar">▶</button>
          <button class="ctl" id="back" aria-label="Retroceder 10 segundos">↺10</button>
          <button class="ctl" id="fwd" aria-label="Adelantar 10 segundos">10↻</button>
          <button class="ctl" id="mute" aria-label="Silenciar">🔊</button><input class="vol" id="vol" type="range" min="0" max="100" value="80" aria-label="Volumen">
          <span class="time" id="time">0:00 / 0:00</span><span class="spacer"></span>
          ${t.type === 'serie' ? raw('<button class="ctl" id="nextBtn" aria-label="Siguiente episodio">⏭</button>') : ''}
          <button class="ctl" id="subsBtn" aria-label="Subtítulos">CC</button>
          <button class="ctl hide-xs" id="qBtn" aria-label="Calidad y velocidad">⚙</button>
          <button class="ctl" id="fs" aria-label="Pantalla completa">⛶</button>
        </div>
      </div></div>
    <section class="section" style="padding-top:24px"><div class="container stack">
      <div class="row between"><div><h1 style="margin:0;font-size:clamp(22px,3vw,32px)">${t.title}</h1><span class="muted">${metaLine(t)} · <span class="rating">${t.maturity}</span></span></div><a class="btn" href="app.html#/titulo/${t.id}">Ver ficha</a></div>
      <p style="margin:0;max-width:760px" id="epsyn">${t.synopsis}</p>
      <p class="muted small" style="margin:0">Atajos: espacio (pausa), ← → (10 s), ↑ ↓ (volumen), M (silencio), C (subtítulos), F (pantalla completa).</p>
      ${t.type === 'serie' ? raw('<div><h3>Episodios</h3><ul class="ep-list" id="eplist"></ul></div>') : ''}
    </div></section>`;
  const pl = $('#pl');

  const drawEpList = () => {
    const ul = $('#eplist'); if (!ul) return;
    ul.innerHTML = eps.filter(e => e.season === ep.season).map(e => `<li><a class="ep" href="ver.html?t=${t.id}&e=${e.id}" data-ep="${e.id}" ${e.id === ep.id ? 'aria-current="true" style="background:var(--surface-2)"' : ''}><span class="num">${e.n}</span><div>${artCard({ ...t, art: { ...t.art, hue: (t.art.hue || 0) + e.n * 6 } }, { title: false })}</div><div><b>${escape(e.title)}</b> <small>T${e.season} · ${fmtDur(e.duration)}</small><small>${escape(e.synopsis)}</small></div></a></li>`).join('');
  };
  const ui = () => {
    $('#pp').textContent = st.playing ? '⏸' : '▶';
    $('#big').textContent = st.playing ? '⏸' : '▶';
    pl.classList.toggle('playing', st.playing);
    $('#seek').value = st.dur ? Math.round(st.pos / st.dur * 1000) : 0;
    $('#time').textContent = `${fmt(st.pos)} / ${fmt(st.dur)}`;
    $('#mute').textContent = st.muted || st.vol === 0 ? '🔇' : st.vol < .5 ? '🔉' : '🔊';
    $('#eptitle').textContent = ep ? `T${ep.season}:E${ep.n} · ${ep.title}` : fmtDur(t.duration);
    $('#qbadge').textContent = st.q === 'Auto' ? `Auto · ${QUALS[Math.min(maxQ, 3)]}` : st.q;
    $('#subsBtn').style.color = st.subs !== 'off' ? 'var(--primary)' : '';
    $('#subs').textContent = st.subs !== 'off' && st.playing && !st.ad ? SUBS[st.subs][Math.floor(st.pos / 4) % SUBS[st.subs].length] : '';
    if (ep) $('#epsyn').textContent = ep.synopsis;
    const nx = ep && nextEpisode(t, ep.id), left = st.dur - st.pos;
    const nu = $('#nextUp');
    if (nx && left < 25 && left > 0) { nu.hidden = false; nu.innerHTML = `<small class="muted">Siguiente episodio en ${Math.ceil(left)} s</small><br><b>T${nx.season}:E${nx.n} · ${escape(nx.title)}</b><div class="row" style="margin-top:8px;gap:6px"><button class="btn btn-sm btn-primary" id="goNext">Ver ahora</button></div>`; $('#goNext').onclick = goNext; }
    else nu.hidden = true;
  };
  const save = () => { if (st.pos > 3) saveProgress(profile, t, ep?.id, st.pos, st.dur, device()); };
  const logView = () => { if (st.watched > 30 && !profile.preview) { db.insert('views', { userId: user.id, titleId: t.id, minutes: Math.round(st.watched / 60) || 1, device: device() }); st.watched = 0; } };
  const loop = ts => {
    const dt = last ? (ts - last) / 1000 : 0; last = ts;
    if (st.playing) {
      if (st.ad > 0) { st.ad -= dt; const a = $('#ad'); if (a) a.textContent = st.ad > 0 ? `Anuncio · tu contenido comienza en ${Math.ceil(st.ad)} s` : ''; if (st.ad <= 0) a?.remove(); }
      else { st.pos = Math.min(st.dur, st.pos + dt * st.speed); st.watched += dt; }
      if (ts - lastSave > 5000) { lastSave = ts; save(); }
      if (st.pos >= st.dur) { st.playing = false; save(); logView(); if (ep && nextEpisode(t, ep.id)) goNext(); else toast('Fin. ¡Gracias por ver!', 'info'); }
      ui();
    }
    raf = requestAnimationFrame(loop);
  };
  const toggle = () => { st.playing = !st.playing; if (!st.playing) { save(); } ui(); poke(); };
  const seekBy = s => { st.pos = Math.max(0, Math.min(st.dur - 1, st.pos + s)); ui(); poke(); };
  const goNext = () => { const nx = nextEpisode(t, ep.id); if (!nx) return; save(); logView(); ep = nx; load(); st.pos = 0; st.playing = true; drawEpList(); ui(); toast(`Reproduciendo T${ep.season}:E${ep.n}`); };
  const poke = () => { pl.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => pl.classList.add('idle'), 2600); };
  const menu = (kind) => {
    const mEl = $('#menu');
    if (!mEl.hidden && mEl.dataset.kind === kind) { mEl.hidden = true; return; }
    mEl.dataset.kind = kind; mEl.hidden = false;
    if (kind === 'subs') mEl.innerHTML = `<b>Subtítulos</b>${[['off', 'Desactivados'], ['es', 'Español'], ['en', 'English']].map(([k, l]) => `<button data-subs="${k}" class="${st.subs === k ? 'on' : ''}">${l}</button>`).join('')}<b>Audio</b><button class="on">Español (original)</button><button data-dub>Inglés (doblaje)</button>`;
    else mEl.innerHTML = `<b>Calidad · plan ${escape(plan.name || '')}</b>${QUALS.map((q, i) => `<button data-q="${q}" class="${st.q === q ? 'on' : ''}" ${i > maxQ ? 'disabled style="opacity:.5"' : ''}>${q}${i > maxQ ? ' · mejora tu plan' : ''}</button>`).join('')}<b>Velocidad</b>${[.75, 1, 1.25, 1.5, 2].map(s => `<button data-speed="${s}" class="${st.speed === s ? 'on' : ''}">${s}×</button>`).join('')}`;
  };
  $('#menu').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.subs) st.subs = b.dataset.subs;
    if (b.dataset.q) { st.q = b.dataset.q; toast(`Calidad: ${st.q}`); }
    if (b.dataset.speed) st.speed = +b.dataset.speed;
    if ('dub' in b.dataset) toast('Doblaje no disponible en esta demo', 'info');
    $('#menu').hidden = true; ui();
  });
  $('#pp').onclick = toggle; $('#big').onclick = toggle;
  pl.querySelector('.scene').addEventListener('click', toggle);
  $('#back').onclick = () => seekBy(-10); $('#fwd').onclick = () => seekBy(10);
  $('#seek').addEventListener('input', e => { st.pos = e.target.value / 1000 * st.dur; ui(); });
  $('#seek').addEventListener('change', save);
  $('#vol').addEventListener('input', e => { st.vol = e.target.value / 100; st.muted = false; ui(); });
  $('#mute').onclick = () => { st.muted = !st.muted; ui(); };
  $('#subsBtn').onclick = () => menu('subs');
  $('#qBtn').onclick = () => menu('q');
  $('#nextBtn')?.addEventListener('click', goNext);
  $('#fs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else pl.requestFullscreen?.().catch(() => toast('Pantalla completa no disponible', 'warning')); };
  pl.addEventListener('mousemove', poke); pl.addEventListener('touchstart', poke, { passive: true });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea, .modal')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'arrowleft') seekBy(-10); else if (k === 'arrowright') seekBy(10);
    else if (k === 'arrowup') { e.preventDefault(); st.vol = Math.min(1, st.vol + .1); $('#vol').value = st.vol * 100; ui(); }
    else if (k === 'arrowdown') { e.preventDefault(); st.vol = Math.max(0, st.vol - .1); $('#vol').value = st.vol * 100; ui(); }
    else if (k === 'm') { st.muted = !st.muted; ui(); }
    else if (k === 'c') { st.subs = st.subs === 'off' ? 'es' : 'off'; ui(); }
    else if (k === 'f') $('#fs').click();
  });
  $('#eplist')?.addEventListener('click', e => { const a = e.target.closest('[data-ep]'); if (!a) return; e.preventDefault(); save(); logView(); ep = eps.find(x => x.id === a.dataset.ep); load(); st.playing = true; drawEpList(); ui(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  addEventListener('pagehide', () => { save(); logView(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); } });
  drawEpList(); ui(); poke();
  raf = requestAnimationFrame(loop);
  if (qs.get('autoplay') !== '0') { st.playing = true; ui(); }
  pl.focus({ preventScroll: true });
  void raf; void settings;
}

start();
