// Bloques de página reutilizables para paneles y apps de rol: encabezado, fila de KPIs, tarjetas
// con gráfico, estados vacíos, línea de tiempo, bitácora, pares clave/valor, insignias.
// Todos devuelven HTML (string) hecho con html`` → se pueden anidar sin doble escape.
//
//   import { pageHead, kpis, chartCard, emptyState, timeline, kv, badge } from '../../assets/core/blocks.js';
//   view.innerHTML = html`${pageHead('Resumen', 'Hoy')}${kpis([{ label: 'Ventas', value: money(1200), delta: '+12%' }])}`;

import { html, raw, escape, ago, dateTime } from './ui.js';
import { initials } from './auth.js';

// ---------- Hoja de estilos del kernel (se inyecta una vez) ----------
// Va ANTES de themes.css (y de las hojas de disposición y de la app): a igual especificidad ganan
// los estilos, las disposiciones y el CSS de cada app. Por eso aquí solo hay clases k-*.
export function ensureKernelStyles() {
  if (typeof document === 'undefined' || document.querySelector('link[data-lgw-kernel], link[href$="core/kernel.css"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('./kernel.css', import.meta.url).href;
  l.setAttribute('data-lgw-kernel', '');
  const first = document.querySelector('link[data-lgw-themes]') || document.querySelector('link[rel="stylesheet"]');
  if (first) first.before(l);
  else document.head.appendChild(l);
}
ensureKernelStyles();

const TONES = ['primary', 'success', 'warning', 'danger', 'info'];
const toneClass = t => (TONES.includes(t) ? ` badge-${t}` : '');

// Insignia: badge('Pagado', 'success')
export const badge = (text, tone = '') => html`<span class="badge${raw(toneClass(tone))}">${text}</span>`;

// Encabezado de página con acciones a la derecha (HTML ya armado, p. ej. botones).
export function pageHead(title, sub = '', actions = '') {
  return html`<div class="page-head"><div><h1>${title}</h1>${sub ? html`<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div>${actions ? html`<div class="k-page-actions">${raw(actions)}</div>` : ''}</div>`;
}

// Fila de indicadores: [{ label, value, delta?, up?, icon?, hint?, href? }]
// value se escapa; pásalo con raw() si trae HTML.
export function kpis(items) {
  return html`<div class="k-kpis">${items.filter(Boolean).map(k => {
    const inner = html`<div class="stat"><span class="label">${k.label}</span><span class="value">${k.value}</span>${k.delta ? html`<span class="delta ${k.up === false ? 'down' : 'up'}">${k.delta}</span>` : ''}${k.hint ? html`<span class="hint">${k.hint}</span>` : ''}</div>${k.icon ? html`<span class="k-kpi-ico" aria-hidden="true">${k.icon}</span>` : ''}`;
    return k.href ? html`<a class="card hover k-kpi" href="${k.href}" style="color:inherit;text-decoration:none">${inner}</a>` : html`<div class="card k-kpi">${inner}</div>`;
  })}</div>`;
}

// Tarjeta con título, subtítulo opcional, acciones y cuerpo (un SVG de ui.barChart, una tabla…).
export function card(title, body, { sub = '', actions = '', cls = '' } = {}) {
  return html`<section class="card ${cls}">${title || actions ? html`<div class="k-card-head"><div>${title ? html`<h3>${title}</h3>` : ''}${sub ? html`<p>${sub}</p>` : ''}</div>${actions ? raw(actions) : ''}</div>` : ''}${raw(body)}</section>`;
}
export const chartCard = (title, svg, opts) => card(title, svg, opts);

// Estado vacío con llamado a la acción opcional: { icon, title, text, action: '<a class="btn">…' }
export function emptyState({ icon = '🗂️', title = 'Nada por aquí', text = '', action = '' } = {}) {
  return html`<div class="empty k-empty"><span class="k-empty-ico" aria-hidden="true">${icon}</span><h3>${title}</h3>${text ? html`<p>${text}</p>` : ''}${action ? raw(action) : ''}</div>`;
}

// Pares clave/valor: kv([['Correo', u.email], ['Plan', raw(badge('Oro'))]]). Las filas falsy se omiten.
export function kv(pairs) {
  return html`<dl class="k-kv">${pairs.filter(Boolean).map(([k, v]) => html`<dt>${k}</dt><dd>${v == null || v === '' ? '—' : v}</dd>`)}</dl>`;
}

// Línea de tiempo: items [{ at, title, text?, who?, tone? }] (más reciente primero si así vienen).
export function timeline(items, { empty = 'Sin movimientos' } = {}) {
  if (!items.length) return html`<p class="muted small">${empty}</p>`;
  return html`<ol class="k-timeline">${items.map(it => html`<li class="${it.tone ? 'tone-' + it.tone : ''}"><b>${it.title}</b>${it.text ? html` <span>${it.text}</span>` : ''}<small>${it.at ? dateTime(it.at) : ''}${it.who ? ` · ${it.who}` : ''}</small></li>`)}</ol>`;
}

// Historial de una máquina de estados (domain.stateMachine) como línea de tiempo.
export function historyTimeline(history = [], machine, { users } = {}) {
  const who = id => (users ? users(id) : id) || '';
  return timeline([...history].reverse().map(h => ({
    at: h.at, tone: machine?.tone(h.to),
    title: machine ? (h.from ? `${machine.label(h.from)} → ${machine.label(h.to)}` : machine.label(h.to)) : `${h.from || '—'} → ${h.to}`,
    text: h.note || '', who: who(h.by)
  })));
}

// Últimas entradas de la bitácora (db.log) como lista compacta.
export function activityFeed(db, { limit = 8, filter = () => true, users = 'users' } = {}) {
  const names = Object.fromEntries(db.all(users).map(u => [u.id, u.name]));
  const rows = db.all('_log').filter(filter).slice(0, limit);
  if (!rows.length) return html`<p class="muted small">Aún no hay actividad.</p>`;
  return html`<ul class="stack" style="list-style:none;margin:0;padding:0;gap:10px">${rows.map(l => html`<li class="row" style="gap:10px;flex-wrap:nowrap;align-items:flex-start"><span class="badge">${l.action}</span><span style="min-width:0"><span>${l.detail}</span><small class="muted" style="display:block">${names[l.user] || (l.user ? '—' : 'Sitio web')} · ${ago(l.at)}</small></span></li>`)}</ul>`;
}

// Avatar + nombre + rol.
export function userChip(user, roleName = r => r) {
  return html`<span class="k-user"><span class="avatar" style="--av:${user.color || 'var(--primary)'}">${initials(user.name)}</span><span><b>${user.name}</b><small>${roleName(user.role)}</small></span></span>`;
}

// Botón de acción compacto para celdas de tabla (resource lo usa con data-act).
export const actButton = (act, id, icon, label, cls = 'btn-ghost') =>
  html`<button type="button" class="btn btn-sm btn-icon ${cls}" data-act="${act}" data-id="${id}" title="${label}" aria-label="${label}">${icon}</button>`;

// Pestañas simples: tabs(el, [{ id, label, render(box) }], { active }) → cambia de panel sin router.
export function tabs(el, items, { active = items[0]?.id, onChange } = {}) {
  el.innerHTML = html`<div class="tabs" role="tablist">${items.map(t => html`<button type="button" class="tab" role="tab" data-tab="${t.id}">${t.label}</button>`)}</div><div class="k-tab-body" style="margin-top:14px"></div>`;
  const body = el.querySelector('.k-tab-body');
  const show = id => {
    el.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    body.replaceChildren();
    items.find(t => t.id === id)?.render(body);
    onChange && onChange(id);
  };
  el.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  show(active);
  return { show };
}

export { escape };
