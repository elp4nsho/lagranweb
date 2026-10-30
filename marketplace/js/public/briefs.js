// Proyectos (briefs): listado público, detalle y publicación por clientes.
import { db, auth } from '../data/db.js';
import { escape, money, date, ago, toast } from '../../../assets/core/ui.js';
import { formData } from '../shared/kit.js';
import { activeCategories, category, user } from '../shared/market.js';

const B_STATUS = { abierto: ['Recibiendo propuestas', 'success'], adjudicado: ['Adjudicado', 'info'], cerrado: ['Cerrado', ''] };
export { B_STATUS };

export function renderBriefs(el) {
  const list = db.all('briefs').sort((a, b) => (a.status === 'abierto' ? -1 : 1) - (b.status === 'abierto' ? -1 : 1) || b.createdAt.localeCompare(a.createdAt));
  el.innerHTML = `
  <section class="page-hero"><div class="container row between" data-anim><div><span class="eyebrow">Proyectos</span><h1>Proyectos publicados por clientes</h1><p class="lead">Freelancers: envía tu propuesta desde tu panel. Clientes: publica gratis y compara ofertas.</p></div><a class="btn btn-primary btn-lg" href="#/proyectos/nuevo">Publicar proyecto</a></div></section>
  <section class="section" style="padding-top:8px"><div class="container grid-2">
    ${list.map(b => `<a class="card hover brief-card" href="#/proyectos/${b.id}">
      <div class="row between"><span class="badge badge-primary">${escape(category(b.categoryId).icon)} ${escape(category(b.categoryId).name)}</span><span class="badge badge-${B_STATUS[b.status][1]}">${B_STATUS[b.status][0]}</span></div>
      <h3 class="mb-0">${escape(b.title)}</h3><p class="small muted mb-0">${escape(b.description.slice(0, 140))}…</p>
      <div class="mini-stats"><span>💰 ${money(b.budgetMin)} – ${money(b.budgetMax)}</span><span>⏱ ${b.days} días</span><span>✉ ${db.count('proposals', p => p.briefId === b.id)} propuestas</span><span>${ago(b.createdAt)}</span></div></a>`).join('')}
  </div></section>`;
}

export function renderBrief(el, id) {
  const b = db.get('briefs', id), me = auth.current();
  if (!b) { el.innerHTML = '<section class="section"><div class="container empty">Proyecto no encontrado</div></section>'; return; }
  const c = user(b.clientId), n = db.count('proposals', p => p.briefId === id);
  const mine = me?.role === 'freelancer' && db.find('proposals', p => p.briefId === id && p.freelancerId === me.id);
  el.innerHTML = `
  <section class="section" style="padding-top:32px"><div class="container" style="max-width:860px">
    <a class="small" href="#/proyectos">← Proyectos</a>
    <div class="card stack" style="margin-top:12px" data-anim>
      <div class="row between"><span class="badge badge-primary">${escape(category(b.categoryId).name)}</span><span class="badge badge-${B_STATUS[b.status][1]}">${B_STATUS[b.status][0]}</span></div>
      <h1 style="font-size:clamp(26px,3.4vw,38px);margin:0">${escape(b.title)}</h1>
      <p class="muted mb-0">Publicado por ${escape(c?.company || c?.name || 'Cliente')} · ${ago(b.createdAt)}</p>
      <p>${escape(b.description)}</p>
      <dl class="dl"><dt>Presupuesto</dt><dd>${money(b.budgetMin)} – ${money(b.budgetMax)}</dd><dt>Plazo</dt><dd>${b.days} días</dd><dt>Propuestas</dt><dd>${n}</dd></dl>
      ${b.status !== 'abierto' ? '<div class="notice">Este proyecto ya no recibe propuestas.</div>'
        : me?.role === 'freelancer' ? (mine ? `<div class="notice ok">Ya enviaste tu propuesta por ${money(mine.price)}. <a href="freelancer.html#/proyectos">Ver en mi panel</a></div>` : `<a class="btn btn-primary btn-lg" href="freelancer.html#/proyectos?brief=${b.id}">Enviar propuesta</a>`)
        : me?.id === b.clientId ? `<a class="btn btn-primary" href="cliente.html#/proyectos">Ver ${n} propuestas recibidas</a>`
        : `<a class="btn btn-primary" href="login.html?modo=freelancer&next=${encodeURIComponent('freelancer.html#/proyectos?brief=' + b.id)}">Ingresa como freelancer para postular</a>`}
    </div>
  </div></section>`;
}

export function renderNewBrief(el) {
  const me = auth.current();
  if (!me || me.role !== 'cliente') {
    el.innerHTML = `<section class="section"><div class="container" style="max-width:560px"><div class="card stack" style="text-align:center;align-items:center"><span class="tile-icon">📝</span><h2>Publica tu proyecto gratis</h2><p class="muted">Ingresa con una cuenta de cliente para publicar y recibir propuestas de freelancers.</p><a class="btn btn-primary" href="login.html?next=${encodeURIComponent('index.html#/proyectos/nuevo')}">Ingresar o crear cuenta</a></div></div></section>`;
    return;
  }
  el.innerHTML = `
  <section class="page-hero"><div class="container"><span class="eyebrow">Nuevo proyecto</span><h1>Cuéntanos qué necesitas</h1><p class="lead">Los freelancers de la categoría verán tu proyecto y te enviarán propuestas con precio y plazo.</p></div></section>
  <section class="section" style="padding-top:8px"><div class="container" style="max-width:760px">
    <form class="card stack" id="nb" novalidate><div class="form-grid">
      <div class="field full"><label for="nb-t">Título del proyecto *</label><input class="input" id="nb-t" name="title" required placeholder="Ej: Logo y empaque para mermeladas artesanales"></div>
      <div class="field"><label for="nb-c">Categoría</label><select class="select" id="nb-c" name="categoryId">${activeCategories().map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="nb-d">Plazo (días)</label><input class="input" id="nb-d" name="days" type="number" min="1" value="14" required></div>
      <div class="field"><label for="nb-min">Presupuesto mínimo (CLP)</label><input class="input" id="nb-min" name="budgetMin" type="number" min="0" step="5000" value="50000" required></div>
      <div class="field"><label for="nb-max">Presupuesto máximo (CLP)</label><input class="input" id="nb-max" name="budgetMax" type="number" min="0" step="5000" value="150000" required></div>
      <div class="field full"><label for="nb-desc">Descripción *</label><textarea class="textarea" id="nb-desc" name="description" required placeholder="Objetivos, entregables, referencias, público…"></textarea></div>
    </div><button class="btn btn-primary btn-lg" type="submit">Publicar proyecto</button></form>
  </div></section>`;
  el.querySelector('#nb').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget, v = formData(f);
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim(); i.classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return toast('Completa los campos obligatorios', 'warning');
    if (+v.budgetMax < +v.budgetMin) { f.budgetMax.classList.add('invalid'); return toast('El máximo debe ser mayor que el mínimo', 'warning'); }
    const b = db.insert('briefs', { title: v.title, categoryId: v.categoryId, days: +v.days, budgetMin: +v.budgetMin, budgetMax: +v.budgetMax, description: v.description, clientId: me.id, status: 'abierto' });
    db.log('proyecto', `Proyecto publicado: ${v.title}`, me.id);
    toast('¡Proyecto publicado! Te avisaremos cuando lleguen propuestas.', 'success');
    location.hash = '#/proyectos/' + b.id;
  });
  void date;
}
