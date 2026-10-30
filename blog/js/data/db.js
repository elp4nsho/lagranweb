// DB y auth de Brújula Noticias + reglas del flujo editorial y del muro de pago.
import { createDB } from '../../../assets/core/db.js';
import { createAuth } from '../../../assets/core/auth.js';
import { seed } from './seed.js';

export const db = createDB('brujula', { version: 2, seed });
export const auth = createAuth(db, { roles: { admin: 'Administrador', editor: 'Editor/a jefe', periodista: 'Periodista', lector: 'Lector/a' } });

export const STAFF = ['admin', 'editor', 'periodista'];
export const PERMS = {
  dashboard: ['admin', 'editor', 'periodista'],
  articles: ['admin', 'editor', 'periodista'],
  taxonomy: ['admin', 'editor'],
  authors: ['admin', 'editor'],
  comments: ['admin', 'editor'],
  newsletter: ['admin', 'editor'],
  ads: ['admin', 'editor'],
  subscriptions: ['admin'],
  users: ['admin'],
  settings: ['admin'],
  activity: ['admin']
};
export const can = (u, perm) => !!u && (PERMS[perm] || []).includes(u.role);
export const settings = () => db.getValue('settings', {});
export function patchSettings(fn) { const cur = structuredClone(settings()); return db.setValue('settings', typeof fn === 'function' ? fn(cur) : { ...cur, ...fn }); }

export const STATUS = {
  draft: ['Borrador', ''], review: ['En revisión', 'warning'], scheduled: ['Programado', 'info'], published: ['Publicado', 'success'], archived: ['Archivado', 'danger']
};

// ---------- Artículos ----------
export const isLive = a => a && (a.status === 'published' || (a.status === 'scheduled' && new Date(a.publishAt) <= new Date()));
export const liveArticles = () => db.query('articles', isLive).sort((a, b) => (b.publishedAt || b.publishAt).localeCompare(a.publishedAt || a.publishAt));
export const category = id => db.get('categories', id);
export const author = id => db.get('authors', id);
export const authorOfUser = u => (u ? db.find('authors', a => a.userId === u.id) : null);
export const words = a => (a.blocks || []).map(b => [b.text, b.cite, b.caption, ...(b.items || [])].filter(Boolean).join(' ')).join(' ').split(/\s+/).filter(Boolean).length + String(a.dek || '').split(/\s+/).length;
export const readingTime = a => Math.max(2, Math.ceil(words(a) / 180));

// Publica los programados cuya hora ya pasó (simula el "cron" del CMS).
export function promoteScheduled() {
  db.query('articles', a => a.status === 'scheduled' && new Date(a.publishAt) <= new Date()).forEach(a => {
    db.update('articles', a.id, x => ({ status: 'published', publishedAt: x.publishAt, history: [...(x.history || []), { at: x.publishAt, user: null, action: 'Publicación programada ejecutada' }] }));
    db.log('publicación', `Se publicó automáticamente “${a.title}”`);
  });
}

// Reglas editoriales por rol.
export function rules(u, a) {
  const own = !!a && a.authorId === authorOfUser(u)?.id;
  const chief = u && ['admin', 'editor'].includes(u.role);
  const isNew = !a || !a.id;
  return {
    own, chief,
    edit: chief || (u?.role === 'periodista' && (isNew || (own && a.status === 'draft'))),
    submit: !chief && u?.role === 'periodista' && (isNew || (own && a.status === 'draft')),
    withdraw: u?.role === 'periodista' && own && a?.status === 'review',
    approve: chief && !isNew,
    publish: chief,
    remove: chief || (own && a?.status === 'draft'),
    chooseAuthor: chief
  };
}

// ---------- Lectores / muro de pago ----------
export function activeSub(u) {
  if (!u) return null;
  return db.find('subscriptions', s => s.userId === u.id && ['active', 'past_due'].includes(s.status)) || null;
}
export const hasAccess = (u, a) => !a.premium || !settings().paywall?.on || (u && (STAFF.includes(u.role) || !!activeSub(u)));

// Inline: **negrita**, _cursiva_, [texto](url)
export function inline(s, escape) {
  return escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<em>$2</em>').replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
