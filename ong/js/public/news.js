// Noticias publicadas desde el panel.
import { db } from '../data/db.js';
import { escape, date, toast } from '../../../assets/core/ui.js';

const published = () => db.query('news', n => n.status === 'publicada').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
let cat = '';

export function list(el) {
  const all = published();
  const cats = [...new Set(all.map(n => n.category))];
  const items = all.filter(n => !cat || n.category === cat);
  el.innerHTML = `<section class="page-hero"><div class="container stack" data-anim><span class="eyebrow">Noticias</span><h1>Desde el territorio</h1></div></section>
    <section class="section pt0"><div class="container stack">
      <div class="row chips">${['', ...cats].map(c => `<button type="button" class="chip ${c === cat ? 'active' : ''}" data-cat="${escape(c)}">${c || 'Todas'}</button>`).join('')}</div>
      <div class="grid-3">${items.map(n => `<a class="card hover news-card" href="#/noticias/${n.id}"><span class="badge badge-primary plain">${escape(n.category)}</span><h3>${escape(n.title)}</h3><p class="muted small">${escape(n.excerpt)}</p><span class="small muted">${escape(date(n.publishedAt))} · ${escape(n.author)}</span></a>`).join('') || '<p class="muted">Sin noticias.</p>'}</div>
      <form class="card row between" id="nlForm" novalidate><div><b>Recibe nuestro boletín</b><br><span class="small muted">Una vez al mes, con avances reales.</span></div>
        <div class="row" style="gap:8px;flex:1;max-width:420px;flex-wrap:nowrap"><input class="input" name="email" type="email" placeholder="tu@correo.cl" aria-label="Correo"><button class="btn btn-primary" type="submit">Suscribirme</button></div></form>
    </div></section>`;
  el.onclick = e => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; list(el); } };
  el.querySelector('#nlForm').onsubmit = e => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Ingresa un correo válido', 'warning');
    if (!db.find('donors', d => d.email.toLowerCase() === email.toLowerCase())) db.insert('donors', { name: email.split('@')[0], email, phone: '', region: '', type: 'persona', tags: ['Boletín'], notes: [] });
    toast('¡Suscripción confirmada!', 'success'); e.target.reset();
  };
}

export function detail(el, { id }) {
  const n = db.get('news', id);
  if (!n || n.status !== 'publicada') { el.innerHTML = '<section class="section"><div class="container card empty"><span class="icon">📰</span><h2>Noticia no disponible</h2><a class="btn" href="#/noticias">Ver noticias</a></div></section>'; return; }
  const more = published().filter(x => x.id !== id).slice(0, 3);
  el.innerHTML = `<article class="section"><div class="container narrow stack">
    <a href="#/noticias" class="small">← Noticias</a>
    <span class="badge badge-primary plain" style="align-self:flex-start">${escape(n.category)}</span>
    <h1 style="margin:0">${escape(n.title)}</h1>
    <p class="muted small" style="margin:0">${escape(date(n.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' }))} · ${escape(n.author)}</p>
    <p class="lead">${escape(n.excerpt)}</p>
    ${n.body.split('\n').filter(Boolean).map(p => `<p>${escape(p)}</p>`).join('')}
    <div class="card row between"><b>¿Te inspiró esta historia?</b><a class="btn btn-primary" href="#/donar">Donar ♥</a></div>
    <h3>Más noticias</h3><div class="grid-3">${more.map(m => `<a class="card hover news-card" href="#/noticias/${m.id}"><h3>${escape(m.title)}</h3><span class="small muted">${escape(date(m.publishedAt))}</span></a>`).join('')}</div>
  </div></article>`;
}
