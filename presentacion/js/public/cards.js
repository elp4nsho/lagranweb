// Tarjetas reutilizables del sitio público.
import { escape, date } from '../../../assets/core/ui.js';
import { initials } from '../../../assets/core/auth.js';
import { db } from '../data/db.js';
import { art } from '../shared/art.js';

export const catName = id => db.get('categories', id)?.name || id;

export const projectCard = p => `
  <a class="card hover project-card" href="#/trabajos/${escape(p.slug)}" data-cat="${escape(p.category)}">
    ${art(p.art, { ratio: '4/3', label: `Imagen del proyecto ${p.title}`, icon: p.icon })}
    <div class="project-meta"><h3>${escape(p.title)}</h3><p class="muted small">${escape(catName(p.category))} · ${escape(p.year)}</p></div>
  </a>`;

export const postCard = b => {
  const a = db.get('team', b.authorId);
  return `<a class="card hover post-card" href="#/blog/${escape(b.slug)}">
    ${art(b.art, { ratio: '16/9' })}
    <div class="stack" style="gap:8px;padding-top:14px">
      <span class="eyebrow">${escape(b.category)}</span>
      <h3>${escape(b.title)}</h3>
      <p class="muted small">${escape(b.excerpt)}</p>
      <span class="small muted">${a ? escape(a.name) + ' · ' : ''}${date(b.publishedAt)} · ${b.readMin} min</span>
    </div></a>`;
};

export const teamCard = t => `
  <article class="card team-card">
    <span class="avatar team-av" style="--av:var(--${escape(t.color)})">${escape(initials(t.name))}</span>
    <h3>${escape(t.name)}</h3><p class="muted small">${escape(t.role)}</p>
    <p class="small">${escape(t.bio)}</p>
    <div class="row" style="gap:6px">${(t.skills || []).map(s => `<span class="badge plain">${escape(s)}</span>`).join('')}</div>
  </article>`;

export const stars = n => `<span class="stars" aria-label="${n} de 5 estrellas">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;

export const publishedProjects = () => db.query('projects', p => p.published).sort((a, b) => a.order - b.order);
export const publishedPosts = () => db.query('posts', b => b.status === 'published' && new Date(b.publishedAt) <= new Date()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
