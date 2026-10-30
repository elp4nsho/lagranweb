// Helpers de presentación compartidos (tarjetas, badges, fechas).
import { html, raw, money, escape } from '../../../assets/core/ui.js';
import { CATEGORIES } from '../data/seed.js';
import { poster } from './art.js';
import { venueOf, minPrice, isSoldOut, isEarly, eventStats } from './inventory.js';

export const CAT_ICON = { conciertos: '🎸', teatro: '🎭', deportes: '🏆', conferencias: '🎤' };
export const catName = c => CATEGORIES[c] || c;
const STATUS = {
  publicado: ['success', 'Publicado'], pendiente: ['warning', 'Pendiente'], borrador: ['', 'Borrador'], rechazado: ['danger', 'Rechazado'],
  cancelado: ['danger', 'Cancelado'], finalizado: ['info', 'Finalizado'], pagada: ['success', 'Pagada'], reembolsada: ['danger', 'Reembolsada'],
  reembolso_solicitado: ['warning', 'Reembolso solicitado'], valido: ['success', 'Válida'], usado: ['info', 'Usada'], anulado: ['danger', 'Anulada'],
  reventa: ['warning', 'En reventa'], activo: ['success', 'Activo'], suspendido: ['danger', 'Suspendido'], pagado: ['success', 'Pagado'],
  solicitado: ['warning', 'Solicitado'], esperando: ['warning', 'Esperando'], notificado: ['info', 'Notificado'], inactivo: ['danger', 'Inactivo']
};
export function badge(status) { const [k, l] = STATUS[status] || ['', status]; return `<span class="badge ${k ? 'badge-' + k : ''}">${escape(l)}</span>`; }

export const fmtDay = d => new Date(d).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtLong = d => new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtHour = d => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

export function eventCard(ev) {
  const v = venueOf(ev), d = new Date(ev.date);
  const sold = isSoldOut(ev), stats = eventStats(ev);
  const early = ev.tiers.some(t => isEarly(t));
  const few = !sold && stats.pct > 80;
  return html`<a class="card hover ev-card" href="index.html#/evento/${ev.id}" data-id="${ev.id}">
    <div class="media">${raw(poster(ev))}
      <div class="datebox"><small>${d.toLocaleDateString('es-CL', { month: 'short' })}</small><b>${d.getDate()}</b></div>
      <div class="flags">${sold ? raw('<span class="badge badge-danger">Agotado</span>') : ''}${few ? raw('<span class="badge badge-warning">Últimas</span>') : ''}${early ? raw('<span class="badge badge-success">Preventa</span>') : ''}</div>
    </div>
    <div class="body">
      <span class="eyebrow">${CAT_ICON[ev.category]} ${catName(ev.category)}</span>
      <h3>${ev.title}</h3>
      <div class="meta">${fmtDay(ev.date)} · ${fmtHour(ev.date)} hrs<br>${v?.name || ''} · ${ev.city}</div>
      <div class="price"><span>${sold ? 'Lista de espera' : 'Desde ' + money(minPrice(ev))}</span><span class="btn btn-sm ${sold ? '' : 'btn-primary'}">${sold ? 'Avisarme' : 'Entradas'}</span></div>
    </div></a>`;
}

export const LOGO = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 21 9 8l3 4 2-3 8 12z"/><path d="M11 6c0-2 1-3 2-4 0 1 1 2 2 2-1 1-2 1-2 3z" opacity=".7"/></svg>`;
