// Portada pública (sin mesa): hero editable desde el panel, destacados, horario y opiniones.
import { money, escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { settings, openNow } from '../shared/logic.js';
import { t, tr, getLang } from './i18n.js';
import { dishArt } from './dish-modal.js';

export function renderLanding(el) {
  const cfg = settings();
  const st = openNow();
  const en = getLang() === 'en';
  const featured = db.query('dishes', d => d.popular && !d.hidden).slice(0, 6);
  const reviews = db.query('ratings', r => r.published && r.comment).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const all = db.all('ratings');
  const avg = all.length ? (all.reduce((s, r) => s + r.stars, 0) / all.length) : 0;
  const tables = db.all('tables').sort((a, b) => a.number - b.number);
  el.innerHTML = `
    <section class="hero section site-hero">
      <div class="container hero-grid">
        <div class="stack hero-text" data-anim>
          <span class="eyebrow">${escape(tr(cfg.tagline))}</span>
          <h1>${escape(tr(cfg.heroTitle))}</h1>
          <p class="lead">${escape(tr(cfg.heroText))}</p>
          <div class="row">
            <span class="badge ${st.open ? 'badge-success' : 'badge-danger'}">${st.open ? `${escape(t('openUntil'))} ${escape(st.until)}` : escape(t('closedNow'))}</span>
            <span class="badge plain">★ ${avg.toFixed(1)} · ${all.length} ${en ? 'reviews' : 'opiniones'}</span>
          </div>
          <div class="row">
            <a class="btn btn-primary btn-lg" href="#/carta">${en ? 'See the menu' : 'Ver la carta'}</a>
            <a class="btn btn-lg" href="reservas.html">${en ? 'Book a table' : 'Reservar mesa'}</a>
          </div>
        </div>
        <div class="hero-art hero-media" data-anim="zoomIn" aria-hidden="true">
          <svg viewBox="0 0 320 300" class="fire-svg">
            <ellipse cx="160" cy="262" rx="130" ry="18" class="f-shadow"/>
            <path class="f-wood" d="M60 250 L260 220 L266 236 L66 266 Z"/><path class="f-wood" d="M58 222 L262 258 L256 272 L52 236 Z"/>
            <path class="f-flame1" d="M160 40 C210 110 240 150 210 210 C195 240 125 240 110 210 C85 160 130 130 160 40 Z"/>
            <path class="f-flame2" d="M160 110 C190 150 200 175 185 205 C175 225 145 225 135 205 C122 178 145 160 160 110 Z"/>
            <circle cx="96" cy="90" r="4" class="f-spark"/><circle cx="232" cy="70" r="3" class="f-spark"/><circle cx="214" cy="120" r="2.5" class="f-spark"/>
          </svg>
        </div>
      </div>
    </section>

    <section class="section alt-band land-feat">
      <div class="container stack">
        <div class="row between"><div><span class="eyebrow">${en ? 'House favourites' : 'Favoritos de la casa'}</span><h2>${en ? 'What everyone orders' : 'Lo que todos piden'}</h2></div><a class="btn" href="#/carta">${en ? 'Full menu' : 'Carta completa'} →</a></div>
        <div class="grid-3 feat-grid">${featured.map(d => `<article class="card hover feat">${dishArt(d)}<h3>${escape(tr(d.name))}</h3><p class="muted small clamp2">${escape(tr(d.desc))}</p><div class="row between"><b>${money(d.price)}</b>${d.available === false ? `<span class="badge badge-danger">${escape(t('soldOut'))}</span>` : ''}</div></article>`).join('')}</div>
      </div>
    </section>

    <section class="section land-visit">
      <div class="container grid-2">
        <div class="card stack" data-anim>
          <span class="eyebrow">${en ? 'Already at the restaurant?' : '¿Ya estás en el local?'}</span>
          <h2>${en ? 'Order from your table' : 'Pide desde tu mesa'}</h2>
          <p class="muted">${en ? 'Scan the QR on your table — or pick it here for the demo — to order, follow your dishes live, call the waiter and split the bill.' : 'Escanea el QR de tu mesa —o elígela aquí para la demo— y podrás pedir, seguir tus platos en vivo, llamar al garzón y dividir la cuenta.'}</p>
          <div class="row"><select class="select" id="pickTable" aria-label="Mesa" style="max-width:220px">${tables.map(tb => `<option value="${tb.number}">${escape(t('table'))} ${tb.number} · ${escape(tb.zone)}</option>`).join('')}</select><button class="btn btn-primary" id="goTable">${en ? 'Sit here' : 'Sentarme aquí'}</button></div>
        </div>
        <div class="card stack" data-anim data-anim-delay="120">
          <span class="eyebrow">${en ? 'Hours & location' : 'Horario y ubicación'}</span>
          <table class="hours">${(cfg.hours || []).slice(1).concat((cfg.hours || []).slice(0, 1)).map(h => `<tr class="${h.day === new Date().getDay() ? 'today' : ''}"><td>${escape(h.label)}</td><td>${h.closed ? (en ? 'Closed' : 'Cerrado') : `${escape(h.open)} – ${escape(h.close)}`}</td></tr>`).join('')}</table>
          <p class="small" style="margin:0">📍 ${escape(cfg.address)}<br>📞 ${escape(cfg.phone)} · ✉️ ${escape(cfg.email)}</p>
        </div>
      </div>
    </section>

    ${reviews.length ? `<section class="section alt-band land-reviews"><div class="container stack">
      <span class="eyebrow">${en ? 'Guests say' : 'Dicen nuestros comensales'}</span>
      <div class="grid-3 rev-grid">${reviews.map(r => `<blockquote class="card quote"><div class="stars-static">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div><p>“${escape(r.comment)}”</p><small class="muted">${escape(t('table'))} ${r.tableNumber}</small></blockquote>`).join('')}</div>
    </div></section>` : ''}

    <footer class="site-foot site-footer"><div class="container row between small muted"><span>© ${new Date().getFullYear()} ${escape(cfg.name)} · ${en ? 'Fictional restaurant (demo)' : 'Restaurante ficticio (demo)'}</span><span class="row" style="gap:12px"><a href="reservas.html">${en ? 'Bookings' : 'Reservas'}</a><a href="login.html">${en ? 'Staff' : 'Equipo'}</a></span></div></footer>`;
  el.querySelector('#goTable').onclick = () => { location.href = `index.html?mesa=${el.querySelector('#pickTable').value}`; };
}
