// Piezas de presentación reutilizables del sitio público.
import { escape, date, ago, num } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db, category, author, readingTime, liveArticles } from '../data/db.js';
import { art } from '../shared/art.js';

export const when = a => a.publishedAt || a.publishAt;
export const catLink = c => c ? `<a class="kicker" href="#/seccion/${escape(c.id)}" style="--kc:var(--${escape(c.color)})">${escape(c.name)}</a>` : '';
export const premiumBadge = a => (a.premium ? '<span class="badge badge-warning plain premium-tag" title="Contenido para suscriptores">★ Premium</span>' : '');
export const breakingBadge = a => (a.breaking ? '<span class="badge badge-danger plain">Último minuto</span>' : '');

export function byline(a, { avatar = false } = {}) {
  const au = author(a.authorId);
  return `<span class="byline">${avatar && au ? `<span class="avatar" style="--av:var(--${escape(au.color)});--size:28px">${escape(initials(au.name))}</span>` : ''}${au ? `<a href="#/autor/${escape(au.slug)}">${escape(au.name)}</a> · ` : ''}<time datetime="${escape(when(a))}" title="${escape(date(when(a)))}">${ago(when(a))}</time> · ${readingTime(a)} min</span>`;
}

// Variantes: 'lead' (grande), 'card' (con imagen), 'row' (horizontal), 'text' (sin imagen)
export function story(a, variant = 'card') {
  const c = category(a.categoryId);
  const href = `#/articulo/${escape(a.slug)}`;
  if (variant === 'text') return `<article class="story story-text"><div class="row" style="gap:6px">${catLink(c)}${premiumBadge(a)}</div><h3><a href="${href}">${escape(a.title)}</a></h3>${byline(a)}</article>`;
  if (variant === 'row') return `<article class="story story-row"><a href="${href}" class="story-img" tabindex="-1" aria-hidden="true">${art(a.cover, { ratio: '4/3' })}</a><div><div class="row" style="gap:6px">${catLink(c)}${premiumBadge(a)}</div><h3><a href="${href}">${escape(a.title)}</a></h3>${byline(a)}</div></article>`;
  if (variant === 'lead') return `<article class="story story-lead"><a href="${href}" class="story-img" tabindex="-1" aria-hidden="true">${art(a.cover, { ratio: '16/9' })}</a><div class="row" style="gap:6px">${breakingBadge(a)}${catLink(c)}${premiumBadge(a)}</div><h2><a href="${href}">${escape(a.title)}</a></h2><p class="dek">${escape(a.dek)}</p>${byline(a, { avatar: true })}</article>`;
  return `<article class="story story-card"><a href="${href}" class="story-img" tabindex="-1" aria-hidden="true">${art(a.cover, { ratio: '16/10' })}</a><div class="row" style="gap:6px">${catLink(c)}${premiumBadge(a)}</div><h3><a href="${href}">${escape(a.title)}</a></h3><p class="dek small">${escape(a.dek)}</p>${byline(a)}</article>`;
}

export function mostRead(n = 5) {
  const list = liveArticles().sort((a, b) => b.views - a.views).slice(0, n);
  return `<section class="widget most-read" aria-labelledby="mr-h"><h2 class="widget-title" id="mr-h">Lo más leído</h2><ol>${list.map(a => `<li><a href="#/articulo/${escape(a.slug)}">${escape(a.title)}</a><small class="muted">${num(a.views)} lecturas</small></li>`).join('')}</ol></section>`;
}

export function adSlot(slot) {
  const ads = db.query('ads', x => x.slot === slot && x.active && new Date(x.start) <= new Date() && new Date(x.end) >= new Date());
  if (!ads.length) return '';
  const ad = ads[Math.floor(Date.now() / 60000) % ads.length];
  return `<aside class="ad ad-${escape(slot)}" data-ad="${ad.id}" aria-label="Publicidad"><span class="ad-label">Publicidad</span>
    <a class="ad-body" href="#" data-ad-click="${ad.id}">${art(ad.art, { ratio: slot === 'sidebar' ? '4/3' : '6/1', cls: 'ad-art' })}<span class="ad-copy"><b>${escape(ad.title)}</b><small>${escape(ad.advertiser)} · ${escape(ad.text)}</small></span><span class="btn btn-sm btn-accent">${escape(ad.cta)}</span></a></aside>`;
}

export function newsletterBox(compact = false) {
  const s = db.getValue('settings');
  return `<section class="widget newsletter-box ${compact ? 'compact' : ''}" aria-labelledby="nl-h"><h2 class="widget-title" id="nl-h">Newsletter Brújula</h2><p class="small muted">${escape(s.newsletterText)}</p>
    <form class="stack" data-newsletter novalidate style="gap:8px"><input class="input" type="email" name="email" placeholder="tu@correo.cl" aria-label="Correo electrónico" required>
    <div class="row" style="gap:10px"><label class="check small"><input type="checkbox" name="diario" checked> Diario</label><label class="check small"><input type="checkbox" name="semanal"> Semanal</label></div>
    <button class="btn btn-primary btn-block">Suscribirme gratis</button></form></section>`;
}
