// Listado de campañas con filtros y página de campaña (meta, muro de donantes, actualizaciones, compartir).
import { db, publicCampaigns, campaignStats, CAMPAIGN_ST } from '../data/db.js';
import { coverArt } from '../shared/art.js';
import { CATEGORIES } from '../data/seed.js';
import { escape, money, num, date, ago, toast } from '../../../assets/core/ui.js';

export function campaignCard(c) {
  const s = campaignStats(c);
  const ended = c.status === 'finalizada' || s.daysLeft < 0;
  return `<article class="card hover camp-card">
    <a href="#/campanas/${c.id}" class="camp-cover" aria-hidden="true" tabindex="-1">${coverArt(c)}${c.urgent && !ended ? '<span class="badge badge-danger camp-flag">Urgente</span>' : ''}${ended ? '<span class="badge badge-info camp-flag">Finalizada</span>' : ''}</a>
    <div class="camp-body">
      <span class="eyebrow">${escape(c.category)} · ${escape(c.region)}</span>
      <h3><a href="#/campanas/${c.id}">${escape(c.title)}</a></h3>
      <p class="muted small">${escape(c.summary)}</p>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(s.pct)}" aria-label="Avance"><i style="--v:${Math.min(100, s.pct)}%"></i></div>
      <div class="camp-meta"><span><b>${money(s.raised)}</b><br><small class="muted">de ${money(c.goal)}</small></span><span><b>${Math.round(s.pct)}%</b><br><small class="muted">${num(s.donors)} donantes</small></span><span><b>${ended ? '—' : Math.max(0, s.daysLeft)}</b><br><small class="muted">${ended ? 'cerrada' : 'días'}</small></span></div>
      ${ended ? `<a class="btn btn-block" href="#/campanas/${c.id}">Ver resultados</a>` : `<a class="btn btn-primary btn-block" href="#/donar?c=${c.id}">Donar a esta campaña</a>`}
    </div></article>`;
}

let filter = { cat: '', q: '', state: 'activas' };
export function list(el) {
  const all = publicCampaigns();
  const items = all.filter(c => (!filter.cat || c.category === filter.cat)
    && (!filter.q || (c.title + c.summary + c.region).toLowerCase().includes(filter.q.toLowerCase()))
    && (filter.state === 'todas' || (filter.state === 'activas' ? c.status === 'publicada' : c.status === 'finalizada')));
  el.innerHTML = `<section class="page-hero"><div class="container stack" data-anim>
      <span class="eyebrow">Campañas</span><h1>Elige dónde sembrar</h1>
      <p class="muted lead">Cada campaña financia un proyecto concreto, con metas y avances públicos.</p></div></section>
    <section class="section pt0 camp-list"><div class="container stack">
      <div class="filters card">
        <input class="input" type="search" id="cq" placeholder="Buscar campaña o región…" value="${escape(filter.q)}" aria-label="Buscar campaña">
        <div class="row chips">${['', ...CATEGORIES].map(c => `<button class="chip ${filter.cat === c ? 'active' : ''}" data-cat="${escape(c)}" type="button">${c || 'Todas'}</button>`).join('')}</div>
        <select class="select" id="cstate" aria-label="Estado"><option value="activas" ${filter.state === 'activas' ? 'selected' : ''}>En curso</option><option value="finalizadas" ${filter.state === 'finalizadas' ? 'selected' : ''}>Finalizadas</option><option value="todas" ${filter.state === 'todas' ? 'selected' : ''}>Todas</option></select>
      </div>
      <div class="grid-3 camp-grid">${items.map(campaignCard).join('') || '<div class="card empty" style="grid-column:1/-1"><span class="icon">🌾</span>No hay campañas con esos filtros.</div>'}</div>
    </div></section>`;
  el.onclick = e => { const b = e.target.closest('[data-cat]'); if (b) { filter.cat = b.dataset.cat; list(el); } };
  el.querySelector('#cstate').onchange = e => { filter.state = e.target.value; list(el); };
  el.querySelector('#cq').oninput = e => { filter.q = e.target.value; const pos = e.target.selectionStart; list(el); const i = el.querySelector('#cq'); i.focus(); i.setSelectionRange(pos, pos); };
}

export function detail(el, { id }) {
  const c = db.get('campaigns', id);
  if (!c || c.status === 'borrador') { el.innerHTML = '<section class="section"><div class="container card empty"><span class="icon">🌾</span><h2>Campaña no disponible</h2><a class="btn" href="#/campanas">Ver campañas</a></div></section>'; return; }
  const s = campaignStats(c);
  const ended = c.status === 'finalizada' || s.daysLeft < 0;
  const wall = [...s.list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 14);
  const top = [...s.list].sort((a, b) => b.amount - a.amount)[0];
  const url = `${location.origin}${location.pathname}#/campanas/${c.id}`;
  const project = c.projectId ? db.get('projects', c.projectId) : null;
  el.innerHTML = `<section class="section camp-detail"><div class="container">
    <a href="#/campanas" class="small">← Todas las campañas</a>
    <div class="camp-layout">
      <div class="stack">
        <div class="camp-hero-art card">${coverArt(c, { cls: 'big' })}</div>
        <span class="eyebrow">${escape(c.category)} · ${escape(c.region)}</span>
        <h1 class="camp-title">${escape(c.title)}</h1>
        <p class="lead">${escape(c.summary)}</p>
        <div class="tabs" role="tablist"><button class="tab active" data-tab="historia" role="tab">Historia</button><button class="tab" data-tab="avances" role="tab">Actualizaciones (${c.updates.length})</button><button class="tab" data-tab="muro" role="tab">Donantes (${s.count})</button></div>
        <div data-pane="historia" class="stack">${c.story.split('\n').filter(Boolean).map(p => `<p>${escape(p)}</p>`).join('')}
          ${project ? `<div class="card proj-mini"><b>Proyecto: ${escape(project.name)}</b><span class="muted small">${escape(project.community)} · ${num(project.beneficiaries)} personas beneficiadas · ${escape(project.status)}</span></div>` : ''}</div>
        <div data-pane="avances" hidden><ol class="timeline">${[...c.updates].sort((a, b) => b.date.localeCompare(a.date)).map(u => `<li class="done"><span class="tl-dot">✓</span><b>${escape(u.title)}</b><br><span class="small muted">${escape(date(u.date))}</span><p class="small">${escape(u.text)}</p></li>`).join('') || '<p class="muted">Pronto publicaremos novedades.</p>'}</ol></div>
        <div data-pane="muro" hidden><ul class="wall">${wall.map(d => `<li><span class="avatar" style="--av:var(--${['primary', 'accent', 'success', 'info'][d.amount % 4]})">${d.anonymous ? '♥' : escape(d.donorName[0])}</span><div><b>${d.anonymous ? 'Anónimo' : escape(d.donorName)}</b> donó <b>${money(d.amount)}</b>${d.type === 'mensual' ? ' <span class="badge badge-primary plain">mensual</span>' : ''}<br>${d.message ? `<span class="small">“${escape(d.message)}”</span><br>` : ''}<span class="small muted">${escape(ago(d.createdAt))}</span></div></li>`).join('') || '<li class="muted">Sé la primera persona en donar.</li>'}</ul></div>
      </div>
      <aside class="camp-side">
        <div class="card stack">
          <div><span class="big-money">${money(s.raised)}</span><br><span class="muted">recaudados de ${money(c.goal)}</span></div>
          <div class="progress lg"><i style="--v:${Math.min(100, s.pct)}%"></i></div>
          <div class="camp-meta"><span><b>${Math.round(s.pct)}%</b><br><small class="muted">de la meta</small></span><span><b>${num(s.donors)}</b><br><small class="muted">donantes</small></span><span><b>${ended ? 'Cerrada' : Math.max(0, s.daysLeft)}</b><br><small class="muted">${ended ? escape(date(c.endDate)) : 'días restantes'}</small></span></div>
          ${ended ? '<p class="badge badge-info">Campaña finalizada. ¡Gracias!</p>' : `<a class="btn btn-primary btn-lg btn-block" href="#/donar?c=${c.id}">Donar ahora ♥</a><a class="btn btn-block" href="#/donar?c=${c.id}&type=mensual">Donar mensualmente</a>`}
          ${top ? `<p class="small muted" style="margin:0">🏅 Mayor aporte: ${top.anonymous ? 'Anónimo' : escape(top.donorName)} (${money(top.amount)})</p>` : ''}
        </div>
        <div class="card stack"><b>Comparte la campaña</b>
          <div class="row share">
            <a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(c.title + ' ' + url)}">WhatsApp</a>
            <a class="btn btn-sm" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(c.title)}&url=${encodeURIComponent(url)}">X</a>
            <a class="btn btn-sm" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
            <button class="btn btn-sm" type="button" data-copy>Copiar enlace</button></div></div>
      </aside>
    </div></div></section>`;
  el.onclick = async e => {
    const t = e.target.closest('[data-tab]');
    if (t) { el.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === t)); el.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; }); }
    if (e.target.closest('[data-copy]')) { try { await navigator.clipboard.writeText(url); } catch (err) { /* */ } toast('Enlace copiado', 'success'); }
  };
  void CAMPAIGN_ST;
}
