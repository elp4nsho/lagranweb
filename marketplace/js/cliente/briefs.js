// Mis proyectos (cliente): propuestas recibidas, aceptar (crea pedido con garantía) o rechazar.
import { escape, money, date, ago, toast, confirm as ask } from '../../../assets/core/ui.js';
import { pageHead, badge, empty, avatar } from '../shared/kit.js';
import { user, category, quote, levelOf, levelBadge, stars, freelancerStats } from '../shared/market.js';
import { B_STATUS } from '../public/briefs.js';

export function renderMyBriefs(el, { db, me }) {
  const briefs = db.query('briefs', b => b.clientId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  el.innerHTML = `${pageHead('Mis proyectos', 'Compara propuestas y contrata con pago protegido', '<a class="btn btn-primary btn-sm" href="index.html#/proyectos/nuevo">+ Publicar proyecto</a>')}
    <div class="stack">${briefs.map(b => {
      const props = db.query('proposals', p => p.briefId === b.id).sort((x, y) => x.price - y.price);
      return `<div class="card"><div class="row between"><div><span class="small muted">${escape(category(b.categoryId).name)} · publicado ${ago(b.createdAt)}</span><h3 style="margin:4px 0">${escape(b.title)}</h3><span class="small muted">Presupuesto ${money(b.budgetMin)} – ${money(b.budgetMax)} · ${b.days} días</span></div><div class="row" style="gap:6px"><span class="badge badge-${B_STATUS[b.status][1]}">${B_STATUS[b.status][0]}</span>${b.status === 'abierto' ? `<button class="btn btn-sm btn-ghost" data-close-brief="${b.id}">Cerrar</button>` : ''}</div></div>
        <h4 style="margin:16px 0 8px">${props.length} propuesta${props.length === 1 ? '' : 's'}</h4>
        <ul class="list">${props.map(p => { const f = user(p.freelancerId), st = freelancerStats(f.id); return `<li>${avatar(f, 40)}<div style="flex:1;min-width:0"><div class="row" style="gap:8px"><a href="index.html#/freelancer/${f.id}"><b>${escape(f.name)}</b></a>${levelBadge(levelOf(f.id).level)}<span class="small">${stars(st.rating, st.reviews)}</span></div><p class="small" style="margin:4px 0">${escape(p.text)}</p><span class="small muted">${ago(p.createdAt)}</span></div>
          <div class="stack" style="gap:6px;align-items:flex-end"><b class="price">${money(p.price)}</b><span class="small muted">${p.days} días</span>${p.status === 'enviada' && b.status === 'abierto' ? `<div class="row" style="gap:6px"><button class="btn btn-sm btn-primary" data-accept="${p.id}">Contratar</button><button class="btn btn-sm btn-ghost" data-reject="${p.id}">Rechazar</button></div>` : badge(p.status === 'aceptada' ? 'Aceptada' : p.status === 'rechazada' ? 'Rechazada' : 'Enviada', p.status === 'aceptada' ? 'success' : '')}</div></li>`; }).join('') || '<li class="muted small">Aún no hay propuestas. Los freelancers de la categoría ya pueden ver tu proyecto.</li>'}</ul></div>`;
    }).join('') || `<div class="card">${empty('No has publicado proyectos')}</div>`}</div>`;
  el.querySelectorAll('[data-accept]').forEach(btn => btn.onclick = async () => {
    const p = db.get('proposals', btn.dataset.accept), b = db.get('briefs', p.briefId), f = user(p.freelancerId), q = quote(p.price);
    if (!await ask(`Contratar a ${f.name} por ${money(p.price)} + ${money(q.serviceFee)} de cargo por servicio. Se retendrán ${money(q.total)} en garantía.`, { ok: `Pagar ${money(q.total)}` })) return;
    const now = new Date().toISOString();
    const o = db.insert('orders', { code: `GR-${10230 + db.count('orders') + 1}`, gigId: null, briefId: b.id, title: b.title, clientId: me.id, freelancerId: f.id, categoryId: b.categoryId, pkg: 'personalizado', price: q.price, serviceFee: q.serviceFee, commission: q.commission, feePct: q.feePct, comPct: q.comPct, total: q.total, status: 'en_progreso', escrow: 'retenido', due: new Date(Date.now() + p.days * 864e5).toISOString(), revisionsMax: 2, revisionsUsed: 0, requirements: b.description, deliveries: [], timeline: [{ at: now, text: `Propuesta aceptada. Pago de ${money(q.total)} retenido en garantía` }], readBy: {} });
    db.update('proposals', p.id, { status: 'aceptada' });
    db.query('proposals', x => x.briefId === b.id && x.id !== p.id && x.status === 'enviada').forEach(x => db.update('proposals', x.id, { status: 'rechazada' }));
    db.update('briefs', b.id, { status: 'adjudicado', orderId: o.id });
    db.log('proyecto', `Proyecto adjudicado a ${f.name}: ${b.title}`, me.id);
    toast('¡Contratado! Se creó el pedido con pago protegido.', 'success');
    location.hash = '#/pedidos/' + o.id;
  });
  el.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => { db.update('proposals', b.dataset.reject, { status: 'rechazada' }); toast('Propuesta rechazada', 'info'); });
  el.querySelectorAll('[data-close-brief]').forEach(b => b.onclick = async () => { if (await ask('¿Cerrar el proyecto? Ya no recibirá propuestas.', { ok: 'Cerrar' })) { db.update('briefs', b.dataset.closeBrief, { status: 'cerrado' }); toast('Proyecto cerrado', 'success'); } });
  void date;
}
