// Comunicaciones: noticias del sitio (borrador/publicada) y compositor de boletines por segmento.
import { db, segmentOf } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, num, date, dateTime, toast, confirm, formModal, modal } from '../../../assets/core/ui.js';

let tab = 'noticias';
const NCATS = ['Agua', 'Bosque nativo', 'Educación', 'Emergencia', 'Emprendimiento', 'Voluntariado', 'Transparencia'];
const SEGS = { todos: 'Todos los donantes', recurrentes: 'Socios mensuales', mayores: 'Donantes mayores', inactivos: 'Donantes inactivos', voluntarios: 'Voluntarios activos' };

function recipients(seg) {
  if (seg === 'voluntarios') return db.query('volunteers', v => v.status === 'activo');
  const ds = db.query('donors', d => !(d.tags || []).includes('Sin boletín'));
  if (seg === 'todos') return ds;
  const map = { recurrentes: 'Recurrente', mayores: 'Mayor', inactivos: 'Inactivo' };
  return ds.filter(d => segmentOf(d) === map[seg]);
}

async function editNews(n, ctx) {
  const v = await formModal({ title: n ? 'Editar noticia' : 'Nueva noticia', size: 'lg', fields: [
    { name: 'title', label: 'Título', value: n?.title || '', required: true },
    { name: 'category', label: 'Categoría', type: 'select', value: n?.category || NCATS[0], options: NCATS },
    { name: 'excerpt', label: 'Bajada', type: 'textarea', value: n?.excerpt || '', required: true },
    { name: 'body', label: 'Cuerpo (párrafos separados por línea en blanco)', type: 'textarea', value: n?.body || '' },
    { name: 'publish', label: 'Publicar ahora', type: 'checkbox', value: n ? n.status === 'publicada' : false }
  ] });
  if (!v) return;
  const { publish, ...data } = v;
  const patch = { ...data, status: publish ? 'publicada' : 'borrador', ...(publish && (!n || n.status !== 'publicada') ? { publishedAt: new Date().toISOString() } : {}) };
  if (n) db.update('news', n.id, patch); else db.insert('news', { ...patch, author: ctx.user.name, publishedAt: patch.publishedAt || new Date().toISOString() });
  db.log(n ? 'Noticia editada' : 'Noticia creada', `${v.title}${publish ? ' (publicada)' : ''}`, ctx.user.id); toast(publish ? 'Noticia publicada en el sitio' : 'Borrador guardado', 'success');
}

async function compose(nl, ctx) {
  const v = await formModal({ title: nl ? 'Editar boletín' : 'Nuevo boletín', size: 'lg', submit: 'Guardar borrador', fields: [
    { name: 'subject', label: 'Asunto', value: nl?.subject || '', required: true },
    { name: 'segment', label: 'Destinatarios', type: 'select', value: nl?.segment || 'todos', options: Object.entries(SEGS).map(([k, l]) => [k, `${l} (${recipients(k).length})`]) },
    { name: 'body', label: 'Mensaje (usa {nombre})', type: 'textarea', value: nl?.body || 'Hola {nombre},\n\n' }
  ] });
  if (!v) return;
  if (nl) db.update('newsletters', nl.id, v); else db.insert('newsletters', { ...v, status: 'borrador', sentAt: '', recipients: 0, opens: 0, clicks: 0 });
  toast('Borrador guardado', 'success');
}

export default {
  id: 'comunicaciones', label: 'Comunicaciones', ico: '📰', group: 'Comunicación', roles: ['admin', 'coordinador'],
  render(view, ctx) {
    const news = db.all('news'), nls = db.all('newsletters');
    const sent = nls.filter(n => n.status === 'enviado');
    view.innerHTML = `${pageHead('Comunicaciones', 'Noticias del sitio y boletines a donantes y voluntarios.', tab === 'noticias' ? '<button class="btn btn-primary" data-newn>＋ Nueva noticia</button>' : '<button class="btn btn-primary" data-newl>＋ Nuevo boletín</button>')}
      <div class="kpis">
        ${kpi('Noticias publicadas', num(news.filter(n => n.status === 'publicada').length), { ico: '📰' })}
        ${kpi('Boletines enviados', num(sent.length), { ico: '✉️' })}
        ${kpi('Apertura promedio', (sent.length ? sent.reduce((s, n) => s + n.opens / Math.max(1, n.recipients), 0) / sent.length * 100 : 0).toFixed(0) + '%', { ico: '👀' })}
        ${kpi('Suscriptores', num(recipients('todos').length), { ico: '👥' })}
      </div>
      <div class="tabs" role="tablist"><button class="tab ${tab === 'noticias' ? 'active' : ''}" data-tab="noticias">Noticias</button><button class="tab ${tab === 'boletines' ? 'active' : ''}" data-tab="boletines">Boletines</button></div>
      <div class="card" id="tbl"></div>`;
    if (tab === 'noticias') table(view.querySelector('#tbl'), {
      id: 'news', rows: news, sort: { key: 'publishedAt', dir: -1 }, search: n => `${n.title} ${n.excerpt}`,
      filters: [{ key: 'status', label: 'Estado', options: [['publicada', 'Publicada'], ['borrador', 'Borrador']] }, { key: 'category', label: 'Categoría', options: NCATS.map(c => [c, c]) }],
      columns: [
        { key: 'title', label: 'Noticia', render: n => `<b>${escape(n.title)}</b><br><small class="muted">${escape(n.excerpt.slice(0, 90))}</small>` },
        { key: 'category', label: 'Categoría' }, { key: 'author', label: 'Autor' },
        { key: 'publishedAt', label: 'Fecha', render: n => escape(date(n.publishedAt)) },
        { key: 'status', label: 'Estado', render: n => n.status === 'publicada' ? badge('Publicada', 'success') : badge('Borrador', '') },
        { key: 'act', label: '', sort: false, render: n => `<div class="t-actions"><button class="btn btn-sm" data-toggle="${n.id}">${n.status === 'publicada' ? 'Despublicar' : 'Publicar'}</button><button class="btn btn-sm btn-ghost" data-editn="${n.id}">Editar</button><button class="btn btn-sm btn-ghost" data-deln="${n.id}" aria-label="Eliminar">✕</button></div>` }
      ],
      csv: { name: 'noticias.csv', map: n => ({ titulo: n.title, categoria: n.category, autor: n.author, fecha: n.publishedAt.slice(0, 10), estado: n.status }) }
    });
    else table(view.querySelector('#tbl'), {
      id: 'nls', rows: nls, search: n => n.subject,
      filters: [{ key: 'status', label: 'Estado', options: [['enviado', 'Enviado'], ['programado', 'Programado'], ['borrador', 'Borrador']] }],
      columns: [
        { key: 'subject', label: 'Asunto', render: n => `<b>${escape(n.subject)}</b>` },
        { key: 'segment', label: 'Segmento', render: n => escape(SEGS[n.segment]) },
        { key: 'sentAt', label: 'Envío', render: n => n.sentAt ? escape(dateTime(n.sentAt)) : '—' },
        { key: 'recipients', label: 'Enviados', render: n => num(n.recipients) },
        { key: 'opens', label: 'Apertura', render: n => n.recipients ? Math.round(n.opens / n.recipients * 100) + '%' : '—' },
        { key: 'status', label: 'Estado', render: n => badge(n.status, n.status === 'enviado' ? 'success' : n.status === 'programado' ? 'info' : '') },
        { key: 'act', label: '', sort: false, render: n => `<div class="t-actions"><button class="btn btn-sm btn-ghost" data-prev="${n.id}">Vista previa</button>${n.status !== 'enviado' ? `<button class="btn btn-sm btn-primary" data-send="${n.id}">Enviar</button><button class="btn btn-sm btn-ghost" data-editl="${n.id}">Editar</button>` : ''}<button class="btn btn-sm btn-ghost" data-dell="${n.id}" aria-label="Eliminar">✕</button></div>` }
      ]
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.tab) { tab = t.dataset.tab; this.render(view, ctx); }
      if (t.matches('[data-newn]')) editNews(null, ctx);
      if (t.matches('[data-newl]')) compose(null, ctx);
      if (t.dataset.editn) editNews(db.get('news', t.dataset.editn), ctx);
      if (t.dataset.editl) compose(db.get('newsletters', t.dataset.editl), ctx);
      if (t.dataset.toggle) { const n = db.get('news', t.dataset.toggle); const pub = n.status !== 'publicada'; db.update('news', n.id, { status: pub ? 'publicada' : 'borrador', ...(pub ? { publishedAt: new Date().toISOString() } : {}) }); db.log(pub ? 'Noticia publicada' : 'Noticia despublicada', n.title, ctx.user.id); toast(pub ? 'Publicada en el sitio' : 'Retirada del sitio', 'success'); }
      if (t.dataset.deln) { const n = db.get('news', t.dataset.deln); if (await confirm(`¿Eliminar «${n.title}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('news', n.id); db.log('Noticia eliminada', n.title, ctx.user.id); toast('Eliminada', 'success'); } }
      if (t.dataset.dell) { const n = db.get('newsletters', t.dataset.dell); if (await confirm(`¿Eliminar «${n.subject}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('newsletters', n.id); toast('Eliminado', 'success'); } }
      if (t.dataset.prev) { const n = db.get('newsletters', t.dataset.prev); modal({ title: 'Vista previa', body: `<div class="stack"><span class="small muted">Para: ${escape(SEGS[n.segment])} (${recipients(n.segment).length})</span><b>${escape(n.subject)}</b><div class="email-prev">${escape(n.body.replace(/\{nombre\}/g, 'Ana María'))}\n\n— Equipo Raíces del Sur 🌱</div></div>`, foot: '<button class="btn btn-primary" data-close>Cerrar</button>' }); }
      if (t.dataset.send) {
        const n = db.get('newsletters', t.dataset.send), list = recipients(n.segment);
        if (!(await confirm(`¿Enviar «${n.subject}» a ${list.length} destinatarios? (simulado)`, { ok: 'Enviar ahora' }))) return;
        db.update('newsletters', n.id, { status: 'enviado', sentAt: new Date().toISOString(), recipients: list.length, opens: Math.round(list.length * (.4 + Math.random() * .25)), clicks: Math.round(list.length * (.08 + Math.random() * .1)) });
        db.log('Boletín enviado', `${n.subject} → ${list.length}`, ctx.user.id); toast(`Boletín enviado a ${list.length} personas`, 'success');
      }
    };
  }
};
