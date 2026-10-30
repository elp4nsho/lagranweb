// Escritorio: tráfico, artículos top, flujo editorial e ingresos.
import { escape, money, num, ago, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { db, STATUS, authorOfUser, category, isLive } from '../data/db.js';
import { pageHead, kpi, badge } from '../shared/admin-kit.js';

const delta = (a, b) => (b ? ((a - b) / b) * 100 : 0);
const short = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} M` : num(n));

export default {
  id: 'dashboard', path: '/escritorio', label: 'Escritorio', icon: '▦', group: 'Redacción', perm: 'dashboard',
  render(el, ctx) {
    const u = ctx.user, chief = ['admin', 'editor'].includes(u.role);
    const me = authorOfUser(u);
    const traffic = db.all('traffic').sort((a, b) => a.date.localeCompare(b.date));
    const v30 = traffic.slice(-30).reduce((s, t) => s + t.views, 0), vPrev = traffic.slice(-60, -30).reduce((s, t) => s + t.views, 0);
    const u30 = traffic.slice(-30).reduce((s, t) => s + t.visitors, 0), uPrev = traffic.slice(-60, -30).reduce((s, t) => s + t.visitors, 0);
    const arts = db.all('articles');
    const scope = chief ? arts : arts.filter(a => a.authorId === me?.id);
    const subs = db.query('subscriptions', s => s.status !== 'cancelled');
    const mrr = subs.reduce((s, x) => { const p = db.get('plans', x.planId); return s + (p?.period === 'año' ? x.amount / 12 : x.amount); }, 0);
    const cats = db.all('categories').sort((a, b) => a.order - b.order);
    const byCat = cats.map(c => ({ label: c.name, value: arts.filter(a => a.categoryId === c.id && isLive(a)).reduce((s, a) => s + a.views, 0), color: `var(--${c.color})` }));
    const daily = traffic.slice(-30).map(t => ({ label: new Date(t.date + 'T12:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }), value: t.views }));
    const top = scope.filter(isLive).sort((a, b) => b.views - a.views).slice(0, 8);
    const byStatus = Object.entries(STATUS).map(([k, [l]]) => ({ label: l, value: scope.filter(a => a.status === k).length }));
    const review = arts.filter(a => a.status === 'review');
    const scheduled = arts.filter(a => a.status === 'scheduled').sort((a, b) => a.publishAt.localeCompare(b.publishAt));
    const myDrafts = scope.filter(a => a.status === 'draft');
    const pend = db.count('comments', c => c.status === 'pending');
    const pub30 = scope.filter(a => isLive(a) && Date.now() - new Date(a.publishedAt || a.publishAt) < 30 * 864e5).length;

    el.innerHTML = `${pageHead(`Hola, ${u.name.split(' ')[0]}`, chief ? 'Así va Brújula en los últimos 30 días.' : 'Tus artículos y su desempeño.', '<a class="btn btn-primary" href="#/articulos/nuevo">＋ Nuevo artículo</a>')}
      <div class="kpis">
        ${chief ? kpi('Páginas vistas (30 d)', short(v30), delta(v30, vPrev)) : kpi('Mis lecturas totales', short(scope.reduce((s, a) => s + a.views, 0)))}
        ${chief ? kpi('Visitantes únicos', short(u30), delta(u30, uPrev)) : kpi('Mis publicados (30 d)', num(pub30))}
        ${u.role === 'admin' ? kpi('Ingresos mensuales (MRR)', money(mrr), null, `${subs.length} suscripciones activas`) : chief ? kpi('Para revisar', num(review.length), null, `${scheduled.length} programados`) : kpi('Mis borradores', num(myDrafts.length), null, `${scope.filter(a => a.status === 'review').length} en revisión`)}
        ${chief ? kpi('Comentarios por moderar', num(pend), null, `${db.count('subscribers', s => s.status === 'active')} en newsletter`) : kpi('Comentarios en mis notas', num(db.count('comments', c => c.status === 'approved' && scope.some(a => a.id === c.articleId))))}
      </div>
      ${chief ? `<div class="dash-grid">
        <div class="card"><div class="card-head"><h3>Páginas vistas diarias</h3><span class="badge plain">30 días</span></div>${lineChart(daily, { format: num })}</div>
        <div class="card"><h3>Lecturas por sección</h3>${donutChart(byCat.map(b => ({ ...b, value: Math.round(b.value / 1000) })), { label: short(byCat.reduce((s, b) => s + b.value, 0)) })}<p class="small muted">Valores en miles de lecturas.</p></div>
      </div>` : ''}
      <div class="dash-grid">
        <div class="card"><div class="card-head"><h3>${chief ? 'Artículos más leídos' : 'Mis artículos más leídos'}</h3><a class="small" href="#/articulos">Ver todos →</a></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Artículo</th><th>Sección</th><th>Lecturas</th></tr></thead><tbody>
          ${top.map(a => `<tr><td><a href="#/articulos/${a.id}">${escape(a.title)}</a>${a.premium ? ' <span class="badge badge-warning plain">★</span>' : ''}</td><td><span class="small">${escape(category(a.categoryId)?.name || '')}</span></td><td><b>${num(a.views)}</b></td></tr>`).join('') || '<tr><td colspan="3"><div class="empty">Aún no hay artículos publicados.</div></td></tr>'}</tbody></table></div></div>
        <div class="card"><h3>${chief ? 'Flujo editorial' : 'Mis artículos por estado'}</h3>${donutChart(byStatus, { label: String(scope.length) })}</div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-head"><h3>${chief ? 'Esperando revisión' : 'Mis borradores'}</h3></div><ul class="mini-list">
          ${(chief ? review : myDrafts).slice(0, 6).map(a => `<li><a href="#/articulos/${a.id}">${escape(a.title)}</a>${badge(a.status, STATUS)}</li>`).join('') || '<li class="muted">Nada pendiente ✓</li>'}</ul></div>
        <div class="card"><div class="card-head"><h3>Programados</h3></div><ul class="mini-list">
          ${scheduled.slice(0, 6).map(a => `<li><a href="#/articulos/${a.id}">${escape(a.title)}</a><small class="muted">${new Date(a.publishAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></li>`).join('') || '<li class="muted">No hay publicaciones programadas.</li>'}</ul></div>
      </div>
      ${chief ? `<div class="card"><h3>Lecturas por sección (total)</h3>${barChart(byCat.map(b => ({ label: b.label, value: b.value })), { format: num })}</div>` : ''}
      ${ctx.can('activity') ? `<div class="card"><div class="card-head"><h3>Actividad reciente</h3><a class="small" href="#/actividad">Bitácora →</a></div><ul class="mini-list">${db.all('_log').slice(0, 6).map(l => `<li><span>${escape(l.detail || l.action)}</span><small class="muted">${ago(l.at)}</small></li>`).join('') || '<li class="muted">Sin actividad todavía.</li>'}</ul></div>` : ''}`;
  }
};
