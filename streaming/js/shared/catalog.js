// Lógica del catálogo: disponibilidad por licencia, perfiles infantiles, progreso y filas de la portada.
import { db, auth, STAFF } from '../data/db.js';
import { RATINGS } from '../data/seed.js';

export const ratingIdx = r => RATINGS.indexOf(r);
export const KIDS_MAX = '7+';
export function isAvailable(t, now = Date.now()) {
  return t.status === 'publicado' && Date.parse(t.availableFrom) <= now && (!t.availableTo || Date.parse(t.availableTo) > now);
}
export function licenseState(t, now = Date.now()) {
  if (t.status !== 'publicado') return 'borrador';
  if (Date.parse(t.availableFrom) > now) return 'proximo';
  if (t.availableTo && Date.parse(t.availableTo) <= now) return 'vencido';
  if (t.availableTo && Date.parse(t.availableTo) - now < 15 * 864e5) return 'por_vencer';
  return 'vigente';
}
export const allowedFor = (p, t) => !p?.kids || ratingIdx(t.maturity) <= ratingIdx(KIDS_MAX);
export const visibleTitles = p => db.query('titles', t => isAvailable(t) && allowedFor(p, t));
export const episodesOf = t => (t.seasons || []).flatMap(s => s.episodes.map(e => ({ ...e, season: s.n })));
export const durationOf = (t, epId) => (epId ? episodesOf(t).find(e => e.id === epId)?.duration : t.duration) || 45;
export const fmtDur = m => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
export const metaLine = t => `${t.year} · ${t.type === 'serie' ? `${t.seasons.length} temporada${t.seasons.length > 1 ? 's' : ''}` : fmtDur(t.duration)} · ${t.genres.join(', ')}`;
export const match = t => Math.min(99, Math.round(60 + t.score * 7 + (t.trending % 9)));

// ---------- Perfil activo ----------
const pKey = u => `lgw:andes:profile:${u.id}`;
export const PREVIEW_PROFILE = { id: 'preview', name: 'Vista previa', avatar: '👁️', color: 'var(--primary)', kids: false, myList: [], preview: true };
export function currentProfile(u = auth.current()) {
  if (!u) return null;
  if (STAFF.includes(u.role)) return PREVIEW_PROFILE;
  let id; try { id = localStorage.getItem(pKey(u)); } catch (e) { /* */ }
  const p = id && db.get('profiles', id);
  return p && p.userId === u.id ? p : null;
}
export function setProfile(u, id) { try { id ? localStorage.setItem(pKey(u), id) : localStorage.removeItem(pKey(u)); } catch (e) { /* */ } }
export const profilesOf = u => db.query('profiles', p => p.userId === u.id);

// ---------- Progreso ----------
export const progressOf = (pid, tid) => db.query('progress', x => x.profileId === pid && x.titleId === tid).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
export function continueWatching(p) {
  const seen = new Set();
  return db.query('progress', x => x.profileId === p.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter(x => { if (seen.has(x.titleId)) return false; seen.add(x.titleId); return x.position / x.duration < .95; })
    .map(x => ({ prog: x, title: db.get('titles', x.titleId) })).filter(x => x.title && isAvailable(x.title) && allowedFor(p, x.title));
}
export function saveProgress(p, t, epId, position, duration, device = 'Computador') {
  if (!p || p.preview) return;
  const prev = db.find('progress', x => x.profileId === p.id && x.titleId === t.id && x.episodeId === (epId || null));
  const row = { position: Math.round(position), duration: Math.round(duration), updatedAt: new Date().toISOString(), device };
  if (prev) db.update('progress', prev.id, row); else db.insert('progress', { profileId: p.id, titleId: t.id, episodeId: epId || null, ...row });
}
export function nextEpisode(t, epId) { const eps = episodesOf(t); const i = eps.findIndex(e => e.id === epId); return i >= 0 && i < eps.length - 1 ? eps[i + 1] : null; }
// Episodio a reanudar para una serie
export function resumePoint(p, t) {
  const pr = progressOf(p.id, t.id);
  if (t.type !== 'serie') return { epId: null, pos: pr && pr.position / pr.duration < .95 ? pr.position : 0 };
  if (!pr) return { epId: episodesOf(t)[0]?.id, pos: 0 };
  if (pr.position / pr.duration >= .95) { const nx = nextEpisode(t, pr.episodeId); return { epId: nx?.id || pr.episodeId, pos: 0 }; }
  return { epId: pr.episodeId, pos: pr.position };
}

// ---------- Mi lista ----------
export const inList = (p, tid) => (p.myList || []).includes(tid);
export function toggleList(p, tid) {
  if (p.preview) { p.myList = inList(p, tid) ? p.myList.filter(x => x !== tid) : [...p.myList, tid]; return inList(p, tid); }
  const fresh = db.get('profiles', p.id), on = !inList(fresh, tid);
  db.update('profiles', p.id, { myList: on ? [...(fresh.myList || []), tid] : fresh.myList.filter(x => x !== tid) });
  return on;
}

// ---------- Filas de la portada (orden curado desde el CMS) ----------
export function homeRows(p) {
  const vis = visibleTitles(p), byId = Object.fromEntries(vis.map(t => [t.id, t]));
  return db.query('collections', c => c.active).sort((a, b) => a.order - b.order).map(c => {
    let items = [];
    if (c.type === 'manual') items = (c.titleIds || []).map(id => byId[id]).filter(Boolean);
    else if (c.type === 'genre') items = vis.filter(t => t.genres.includes(c.genre)).sort((a, b) => b.trending - a.trending);
    else if (c.source === 'tendencias') items = vis.slice().sort((a, b) => b.trending - a.trending).slice(0, 12);
    else if (c.source === 'nuevos') items = vis.slice().sort((a, b) => b.availableFrom.localeCompare(a.availableFrom)).slice(0, 12);
    else if (c.source === 'milista') items = (p.myList || []).map(id => byId[id]).filter(Boolean);
    else if (c.source === 'continuar') return { c, cont: continueWatching(p) };
    return { c, items };
  }).filter(r => (r.items || r.cont || []).length);
}

export function needsPin(u, p, t) {
  if (!u?.parentalPin || p?.kids || p?.preview) return false;
  return ratingIdx(t.maturity) >= ratingIdx(u.pinLevel || '18+');
}
export function canWatch(u) { return u && (STAFF.includes(u.role) || ['activa', 'prueba'].includes(u.subStatus)); }
