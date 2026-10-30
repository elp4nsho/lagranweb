// Página de artículo: contenido, muro de pago, compartir, guardar, comentarios y relacionados.
import { escape, dateTime, ago, toast, num, money } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, auth, settings, liveArticles, category, author, readingTime, hasAccess, isLive, STAFF } from '../data/db.js';
import { renderBlocks } from '../shared/render.js';
import { art } from '../shared/art.js';
import { story, catLink, premiumBadge, breakingBadge, adSlot, mostRead, newsletterBox, when } from './cards.js';

function countView(a) {
  const k = 'lgw:brujula:viewed';
  let seen = [];
  try { seen = JSON.parse(sessionStorage.getItem(k) || '[]'); } catch (e) { /* sin storage */ }
  if (seen.includes(a.id)) return;
  seen.push(a.id);
  try { sessionStorage.setItem(k, JSON.stringify(seen)); } catch (e) { /* sin storage */ }
  db.update('articles', a.id, x => ({ views: (x.views || 0) + 1 }));
}

export function renderArticle(el, slugId, refresh) {
  const u = auth.current();
  const a = db.find('articles', x => x.slug === slugId);
  const preview = a && !isLive(a) && u && STAFF.includes(u.role);
  if (!a || (!isLive(a) && !preview)) { el.innerHTML = `<div class="container page-top empty"><span class="icon">?</span><h1>Artículo no disponible</h1><p>Puede que haya sido retirado o aún no se publique.</p><a class="btn btn-primary" href="#/">Ir a portada</a></div>`; return null; }
  if (!preview) countView(a);
  const s = settings(), c = category(a.categoryId), au = author(a.authorId);
  const access = hasAccess(u, a);
  const saved = !!u && (u.saved || []).includes(a.id);
  const comments = db.query('comments', x => x.articleId === a.id && (x.status === 'approved' || (u && x.userId === u.id && x.status === 'pending'))).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const related = liveArticles().filter(x => x.id !== a.id && (x.categoryId === a.categoryId || (x.tags || []).some(t => (a.tags || []).includes(t)))).slice(0, 3);
  const url = location.href;

  el.innerHTML = `<div class="container page-top">
    ${preview ? `<div class="card preview-bar row between"><span>👁 Vista previa de redacción · estado <b>${escape(a.status)}</b>. Los lectores aún no ven este artículo.</span><a class="btn btn-sm" href="admin.html#/articulos/${a.id}">Volver al editor</a></div>` : ''}
    <nav class="crumbs small" aria-label="Ruta"><a href="#/">Portada</a> › ${c ? `<a href="#/seccion/${escape(c.id)}">${escape(c.name)}</a>` : ''}</nav>
    <div class="with-sidebar article-layout">
      <article class="article main-col" aria-labelledby="art-title">
        <header class="article-head">
          <div class="row" style="gap:6px">${breakingBadge(a)}${catLink(c)}${premiumBadge(a)}</div>
          <h1 id="art-title">${escape(a.title)}</h1>
          <p class="article-dek">${escape(a.dek)}</p>
          <div class="article-meta row between">
            <div class="row" style="gap:10px">${au ? `<span class="avatar" style="--av:var(--${escape(au.color)})">${escape(initials(au.name))}</span><span class="small"><a href="#/autor/${escape(au.slug)}"><b>${escape(au.name)}</b></a><br><span class="muted">${escape(au.beat)}</span></span>` : ''}</div>
            <div class="small muted">${dateTime(when(a))} · ${readingTime(a)} min de lectura · ${num(a.views)} lecturas</div>
          </div>
          <div class="share row" style="gap:6px" aria-label="Compartir">
            <a class="btn btn-sm btn-ghost" href="https://wa.me/?text=${encodeURIComponent(a.title + ' ' + url)}" target="_blank" rel="noopener" aria-label="Compartir en WhatsApp">WhatsApp</a>
            <a class="btn btn-sm btn-ghost" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener" aria-label="Compartir en X">X</a>
            <a class="btn btn-sm btn-ghost" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener" aria-label="Compartir en Facebook">Facebook</a>
            <button class="btn btn-sm btn-ghost" data-copy>🔗 Copiar enlace</button>
            <button class="btn btn-sm ${saved ? 'btn-primary' : ''}" data-save aria-pressed="${saved}">${saved ? '★ Guardado' : '☆ Guardar'}</button>
          </div>
        </header>
        <figure class="article-figure cover">${art(a.cover, { ratio: '16/9', label: a.title })}</figure>
        <div class="article-body prose">
          ${access ? renderBlocks(a.blocks.slice(0, 4)) + adSlot('article-inline') + renderBlocks(a.blocks.slice(4))
            : `${renderBlocks(a.blocks, s.paywall?.previewBlocks || 2)}<div class="paywall card" role="region" aria-label="Contenido para suscriptores">
              <span class="eyebrow">★ Contenido premium</span><h2>Sigue leyendo con una suscripción</h2>
              <p class="muted">Este artículo es exclusivo para suscriptores. Apoya el periodismo independiente desde ${money(Math.min(...db.all('plans').filter(p => p.active && p.period === 'mes').map(p => p.price)))} al mes.</p>
              <div class="row" style="justify-content:center"><a class="btn btn-primary btn-lg" href="#/planes?next=${encodeURIComponent(a.slug)}">Ver planes</a>${u ? '' : `<a class="btn btn-lg" href="login.html?next=${encodeURIComponent('index.html#/articulo/' + a.slug)}">Ya soy suscriptor</a>`}</div></div>`}
        </div>
        <footer class="article-foot">
          <div class="row" style="gap:6px">${(a.tags || []).map(t => `<a class="chip" href="#/tag/${escape(t)}">#${escape(db.get('tags', t)?.name || t)}</a>`).join('')}</div>
          ${au ? `<div class="card author-box row" style="gap:16px;flex-wrap:nowrap"><span class="avatar" style="--av:var(--${escape(au.color)});--size:64px">${escape(initials(au.name))}</span><div><span class="eyebrow">${escape(au.beat)}</span><h3><a href="#/autor/${escape(au.slug)}">${escape(au.name)}</a></h3><p class="small muted">${escape(au.bio)}</p><a class="small" href="#/autor/${escape(au.slug)}">Más artículos de ${escape(au.name.split(' ')[0])} →</a></div></div>` : ''}
        </footer>
        ${s.comments?.on ? `<section class="comments" aria-labelledby="cm-h"><h2 id="cm-h">Comentarios (${comments.filter(x => x.status === 'approved').length})</h2>
          ${u ? `<form class="card stack" data-comment novalidate style="gap:10px"><div class="row" style="gap:10px"><span class="avatar" style="--av:${escape(u.color || 'var(--primary)')};--size:32px">${escape(initials(u.name))}</span><b class="small">${escape(u.name)}</b></div>
              <textarea class="textarea" name="text" rows="3" maxlength="800" placeholder="Escribe un comentario respetuoso…" aria-label="Tu comentario" required></textarea>
              <div class="row between"><small class="muted">${s.comments.moderation === 'pre' ? 'Los comentarios se publican tras moderación.' : 'Tu comentario se publicará de inmediato.'}</small><button class="btn btn-primary">Publicar comentario</button></div></form>`
            : `<div class="card row between"><span>Inicia sesión para comentar y guardar artículos.</span><span class="row" style="gap:8px"><a class="btn btn-primary btn-sm" href="login.html?next=${encodeURIComponent('index.html#/articulo/' + a.slug)}">Iniciar sesión</a><a class="btn btn-sm" href="login.html#registro">Crear cuenta</a></span></div>`}
          <ul class="comment-list">${comments.map(cm => `<li class="comment ${cm.status === 'pending' ? 'pending' : ''}"><span class="avatar" style="--size:34px">${escape(initials(cm.name))}</span><div><div class="small"><b>${escape(cm.name)}</b> <span class="muted">· ${ago(cm.createdAt)}</span>${cm.status === 'pending' ? ' <span class="badge badge-warning plain">En moderación</span>' : ''}</div><p>${escape(cm.text)}</p>${cm.status === 'approved' ? `<button class="btn btn-ghost btn-sm" data-like="${cm.id}" aria-label="Me gusta">♥ ${cm.likes || 0}</button>` : ''}</div></li>`).join('') || '<li class="muted">Sé el primero en comentar.</li>'}</ul></section>` : ''}
      </article>
      <aside class="sidebar">${mostRead()}${adSlot('sidebar')}${newsletterBox(true)}</aside>
    </div>
    ${related.length ? `<section class="related"><h2 class="widget-title">Te puede interesar</h2><div class="grid-3">${related.map(r => story(r, 'card')).join('')}</div></section>` : ''}
  </div>`;

  el.querySelector('[data-copy]').onclick = () => { navigator.clipboard?.writeText(url).catch(() => {}); toast('Enlace copiado', 'success'); };
  el.querySelector('[data-save]').onclick = () => {
    if (!u) { toast('Inicia sesión para guardar artículos', 'info'); setTimeout(() => (location.href = `login.html?next=${encodeURIComponent('index.html#/articulo/' + a.slug)}`), 700); return; }
    const list = new Set(u.saved || []);
    list.has(a.id) ? list.delete(a.id) : list.add(a.id);
    db.update('users', u.id, { saved: [...list] });
    toast(list.has(a.id) ? 'Guardado en tu cuenta' : 'Quitado de guardados', 'success');
    refresh();
  };
  el.querySelector('[data-comment]')?.addEventListener('submit', e => {
    e.preventDefault();
    const t = e.target.text;
    if (t.value.trim().length < 3) { t.classList.add('invalid'); toast('Escribe un comentario', 'warning'); return; }
    const pre = s.comments.moderation === 'pre';
    db.insert('comments', { articleId: a.id, userId: u.id, name: u.name, text: t.value.trim(), status: pre ? 'pending' : 'approved', likes: 0 });
    db.log('comentario', `${u.name} comentó en “${a.title}”`, u.id);
    toast(pre ? 'Comentario enviado a moderación' : 'Comentario publicado', 'success');
    refresh();
  });
  el.querySelectorAll('[data-like]').forEach(b => b.onclick = () => {
    const key = 'lgw:brujula:likes'; let liked = [];
    try { liked = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { /* */ }
    if (liked.includes(b.dataset.like)) return toast('Ya marcaste este comentario', 'info');
    liked.push(b.dataset.like); try { localStorage.setItem(key, JSON.stringify(liked)); } catch (e) { /* */ }
    db.update('comments', b.dataset.like, x => ({ likes: (x.likes || 0) + 1 }));
    b.textContent = `♥ ${db.get('comments', b.dataset.like).likes}`;
  });
  return a.title;
}
