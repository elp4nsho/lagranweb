// Proyectos nuevos: listado con filtros y ficha con tipologías y cotización.
import { escape, toast, money } from '../../../assets/core/ui.js';
import { db, auth, uf } from '../data/db.js';
import { COMUNAS, comunaName } from '../shared/geo.js';
import { fmtUF, dividend } from '../shared/format.js';
import { propertyArt, comunaMap, icon } from '../shared/art.js';
import { projectCard } from './home.js';
import { V } from './cards.js';

let filter = { stage: '', comuna: '' };
export function renderProjects() {
  const view = V();
  const all = db.query('projects', p => p.published);
  const list = all.filter(p => (!filter.stage || p.stage === filter.stage) && (!filter.comuna || p.comuna === filter.comuna));
  view.innerHTML = `<section class="section" style="padding-top:32px"><div class="container stack">
    <div data-anim><span class="eyebrow">Proyectos nuevos</span><h1 style="margin:0">Proyectos inmobiliarios en Santiago</h1><p class="muted">Departamentos y casas nuevas directo de inmobiliaria, con asesoría gratuita de nuestros corredores.</p></div>
    <div class="row" style="gap:8px">${[['', 'Todos'], ['en verde', 'En verde'], ['en blanco', 'En blanco'], ['entrega inmediata', 'Entrega inmediata']].map(([v, l]) => `<button class="chip ${filter.stage === v ? 'active' : ''}" data-stage="${v}" aria-pressed="${filter.stage === v}">${l}</button>`).join('')}
      <select class="select select-sm" data-com aria-label="Comuna"><option value="">Todas las comunas</option>${[...new Set(all.map(p => p.comuna))].map(c => `<option value="${c}" ${filter.comuna === c ? 'selected' : ''}>${escape(comunaName(c))}</option>`).join('')}</select></div>
    ${list.length ? `<div class="grid-3">${list.map(projectCard).join('')}</div>` : '<div class="card empty">No hay proyectos con ese filtro.</div>'}
  </div></section>`;
  view.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { filter.stage = b.dataset.stage; renderProjects(); });
  view.querySelector('[data-com]').onchange = e => { filter.comuna = e.target.value; renderProjects(); };
}

export function renderProject(id) {
  const view = V(), U = uf(), p = db.get('projects', id);
  if (!p || !p.published) { view.innerHTML = `<section class="section"><div class="container empty"><h1>Proyecto no disponible</h1><a class="btn btn-primary" href="#/proyectos">Ver proyectos</a></div></section>`; return; }
  const u = auth.current();
  const fake = { art: p.art, type: p.comuna === 'lo-barnechea' || p.comuna === 'la-florida' ? 'casa' : 'departamento' };
  view.innerHTML = `<section class="section" style="padding-top:24px"><div class="container">
    <div class="crumbs"><a href="#/">Inicio</a> / <a href="#/proyectos">Proyectos</a> / <span>${escape(p.name)}</span></div>
    <div class="detail-layout">
      <div class="stack" style="gap:22px">
        <div class="gallery-main">${propertyArt(fake, 'fachada')}</div>
        <div><div class="row" style="gap:6px"><span class="badge badge-primary stage">${escape(p.stage)}</span><span class="badge">${escape(p.developer)}</span></div>
          <h1 style="margin:10px 0 4px">${escape(p.name)}</h1><span class="loc">${icon('pin', 15)} ${escape(p.address)}, ${escape(comunaName(p.comuna))} · Entrega ${escape(p.delivery)} · ${p.units} unidades</span></div>
        <div class="card"><h3>El proyecto</h3><p>${escape(p.description)}</p><div class="feature-list">${p.amenities.map(a => `<span class="chip">${icon('check', 14)} ${escape(a)}</span>`).join('')}</div></div>
        <div class="card"><h3>Tipologías disponibles</h3><div class="table-wrap"><table class="table"><thead><tr><th>Tipología</th><th>Dorm.</th><th>Baños</th><th>m²</th><th>Desde</th><th>Dividendo aprox.</th><th>Stock</th></tr></thead><tbody>
          ${p.typologies.map(t => { const d = dividend(t.fromUF, 20, 4.39, 25); return `<tr><td><b>${escape(t.name)}</b></td><td>${t.dorms}</td><td>${t.baths}</td><td>${t.m2}</td><td class="nowrap">${fmtUF(t.fromUF)}<br><span class="muted small">${money(t.fromUF * U)}</span></td><td class="nowrap">${fmtUF(d, true)}/mes</td><td>${t.stock ? `<span class="badge badge-success">${t.stock} disp.</span>` : '<span class="badge badge-danger">Agotado</span>'}</td></tr>`; }).join('')}
        </tbody></table></div><p class="muted small" style="margin:8px 0 0">Dividendo con 20% de pie, tasa 4,39% a 25 años. Referencial.</p></div>
        <div class="card"><h3>Ubicación</h3><div class="map-box">${comunaMap({ highlight: p.comuna, pins: [{ id: p.id, x: p.x, y: p.y, label: p.name.split(' ').slice(0, 2).join(' '), active: true }], compact: true })}</div></div>
      </div>
      <aside class="detail-aside"><div class="card">
        <span class="muted small">Desde</span><div class="price">${fmtUF(p.fromUF)}</div><div class="price-alt">≈ ${money(p.fromUF * U)}</div>
        <form class="stack" data-quote style="margin-top:14px;gap:12px">
          <h3 style="margin:0">Cotiza este proyecto</h3>
          <div class="field"><label for="q-t">Tipología</label><select class="select" id="q-t" name="tipo">${p.typologies.map(t => `<option>${escape(t.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="q-n">Nombre</label><input class="input" id="q-n" name="name" value="${escape(u?.name || '')}" required></div>
          <div class="field"><label for="q-e">Correo</label><input class="input" id="q-e" name="email" type="email" value="${escape(u?.email || '')}" required></div>
          <div class="field"><label for="q-p">Teléfono</label><input class="input" id="q-p" name="phone" type="tel" value="${escape(u?.phone || '')}"></div>
          <label class="check"><input type="checkbox" name="subsidio"> Postulo con subsidio habitacional</label>
          <button class="btn btn-primary btn-block">Solicitar cotización</button>
        </form></div></aside>
    </div></div></section>`;
  const f = view.querySelector('[data-quote]');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email)) return toast('Completa nombre y correo válido', 'warning');
    const agents = db.query('agents', a => a.active);
    const agent = agents[db.count('leads') % agents.length];
    db.insert('leads', { propertyId: null, projectId: p.id, name: d.name.trim(), email: d.email.trim(), phone: d.phone, message: `Cotización ${p.name} · ${d.tipo}${d.subsidio ? ' · con subsidio' : ''}`, source: 'web', status: 'nuevo', agentId: agent?.id || null, notes: [], userId: u?.id || null });
    db.log('lead', `Cotización de ${d.name} por ${p.name}`, u?.id);
    toast('¡Listo! Te enviaremos la cotización por correo.', 'success');
    f.reset();
  });
}
