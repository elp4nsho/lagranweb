// Tarjetas y acciones compartidas del sitio público (favoritos y comparador).
import { escape, toast } from '../../../assets/core/ui.js';
import { db, auth, uf } from '../data/db.js';
import { OPS, TYPES, mainPrice, altPrice, comunaName, fmtUF } from '../shared/format.js';
import { propertyArt, icon } from '../shared/art.js';

// ---------- Comparador (preferencia por visitante: localStorage) ----------
const CKEY = 'hap:compare';
export const compareList = () => { try { return JSON.parse(localStorage.getItem(CKEY)) || []; } catch (e) { return []; } };
const saveCompare = l => { try { localStorage.setItem(CKEY, JSON.stringify(l)); } catch (e) { /* sin almacenamiento */ } window.dispatchEvent(new Event('hap:compare')); };
export function toggleCompare(id) {
  const l = compareList();
  if (l.includes(id)) { saveCompare(l.filter(x => x !== id)); toast('Quitada del comparador', 'info'); return false; }
  if (l.length >= 3) { toast('Puedes comparar hasta 3 propiedades', 'warning'); return false; }
  saveCompare([...l, id]); toast('Agregada al comparador', 'success'); return true;
}
export const clearCompare = () => saveCompare([]);

// ---------- Favoritos (cuenta de usuario en la DB) ----------
export const isFav = id => { const u = auth.current(); return !!u && !!db.find('favorites', f => f.userId === u.id && f.propertyId === id); };
export function toggleFav(id) {
  const u = auth.current();
  if (!u) { toast('Ingresa a tu cuenta para guardar favoritos', 'info'); setTimeout(() => location.href = 'login.html?next=' + encodeURIComponent('index.html' + location.hash), 900); return null; }
  const f = db.find('favorites', x => x.userId === u.id && x.propertyId === id);
  if (f) { db.remove('favorites', f.id); toast('Quitada de favoritos', 'info'); return false; }
  db.insert('favorites', { userId: u.id, propertyId: id }); toast('Guardada en favoritos', 'success'); return true;
}

export function propertyCard(p) {
  const fav = isFav(p.id), cmp = compareList().includes(p.id);
  const status = p.status === 'reservada' ? '<span class="badge badge-info">Reservada</span>' : '';
  return `<article class="card hover prop-card" data-id="${p.id}">
    <a class="media" href="#/propiedad/${p.id}" aria-label="${escape(p.title)}">${propertyArt(p, 'fachada', { label: false })}
      <span class="tags"><span class="badge plain">${OPS[p.op]}</span><span class="badge plain">${TYPES[p.type]}</span>${status}</span></a>
    <span class="tools">
      <button class="round-btn ${fav ? 'on' : ''}" data-fav="${p.id}" aria-pressed="${fav}" title="Favorito" aria-label="Guardar en favoritos">${icon('heart', 17)}</button>
      <button class="round-btn ${cmp ? 'on' : ''}" data-cmp="${p.id}" aria-pressed="${cmp}" title="Comparar" aria-label="Comparar">${icon('compare', 17)}</button>
    </span>
    <div class="body">
      <div><span class="price">${mainPrice(p)}</span> <span class="price-alt">${altPrice(p, uf())}</span></div>
      <h3><a href="#/propiedad/${p.id}">${escape(p.title)}</a></h3>
      <span class="loc">${icon('pin', 14)} ${escape(comunaName(p.comuna))} · ${escape(p.address.split(',')[0])}</span>
      <div class="prop-meta">${p.dorms ? `<span>${icon('bed', 15)} ${p.dorms}</span>` : ''}${p.baths ? `<span>${icon('bath', 15)} ${p.baths}</span>` : ''}<span>${icon('area', 15)} ${p.m2} m²</span>${p.parking ? `<span>${icon('car', 15)} ${p.parking}</span>` : ''}</div>
    </div></article>`;
}

// Delegación global para botones de favoritos/comparar en cualquier vista.
export function wireCardActions(root) {
  root.addEventListener('click', e => {
    const f = e.target.closest('[data-fav]');
    if (f) { e.preventDefault(); const on = toggleFav(f.dataset.fav); if (on !== null) { root.querySelectorAll(`[data-fav="${f.dataset.fav}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); } return; }
    const c = e.target.closest('[data-cmp]');
    if (c) { e.preventDefault(); toggleCompare(c.dataset.cmp); const on = compareList().includes(c.dataset.cmp); root.querySelectorAll(`[data-cmp="${c.dataset.cmp}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }
  });
}
export const priceUFLabel = n => fmtUF(n);

export const V = () => document.getElementById('view');
export const rerender = () => { window.__hapKeep = true; window.dispatchEvent(new HashChangeEvent('hashchange')); };
