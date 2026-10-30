// CMS de noticias y eventos del sitio público.
import { escape, formModal, toast, confirm as ask, downloadCSV, date } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge } from '../shared/kit.js';
import { NOW, ymd } from '../shared/school.js';

const CATS = ['Institucional', 'Académico', 'Deportes', 'Cultura', 'Comunidad'];
const EVT = [['academico', 'Académico'], ['extra', 'Extraprogramático'], ['reunion', 'Reunión'], ['feriado', 'Feriado']];

async function editNews(db, me, n = null) {
  const v = await formModal({
    title: n ? 'Editar noticia' : 'Nueva noticia', size: 'lg', fields: [
      { name: 'title', label: 'Título', required: true, value: n?.title },
      { name: 'category', label: 'Categoría', type: 'select', options: CATS, value: n?.category },
      { name: 'date', label: 'Fecha', type: 'date', value: n?.date || ymd(NOW), required: true },
      { name: 'excerpt', label: 'Bajada (resumen)', type: 'textarea', required: true, value: n?.excerpt },
      { name: 'body', label: 'Cuerpo (separa párrafos con una línea en blanco)', type: 'textarea', required: true, value: n?.body },
      { name: 'published', label: 'Publicada en el sitio', type: 'checkbox', value: n ? n.published : true },
      { name: 'featured', label: 'Destacada', type: 'checkbox', value: n?.featured }
    ]
  });
  if (!v) return;
  if (n) db.update('news', n.id, v); else db.insert('news', { ...v, author: me.name, views: 0 });
  db.log('noticia', `Noticia ${n ? 'editada' : 'creada'}: ${v.title}${v.published ? ' (publicada)' : ''}`, me.id);
  toast(v.published ? 'Noticia guardada y visible en el sitio' : 'Noticia guardada como borrador', 'success');
}
async function editEvent(db, me, e = null) {
  const v = await formModal({
    title: e ? 'Editar evento' : 'Nuevo evento', fields: [
      { name: 'title', label: 'Título', required: true, value: e?.title },
      { name: 'date', label: 'Fecha', type: 'date', required: true, value: e?.date || ymd(NOW) },
      { name: 'type', label: 'Tipo', type: 'select', options: EVT, value: e?.type },
      { name: 'place', label: 'Lugar', value: e?.place },
      { name: 'description', label: 'Descripción', type: 'textarea', value: e?.description },
      { name: 'public', label: 'Visible en el calendario público', type: 'checkbox', value: e ? e.public : true }
    ]
  });
  if (!v) return;
  if (e) db.update('events', e.id, v); else db.insert('events', v);
  db.log('evento', `Evento ${e ? 'editado' : 'creado'}: ${v.title}`, me.id);
  toast('Evento guardado', 'success');
}

let tab = 'news';
export function render(el, ctx) {
  const { db, me } = ctx;
  el.innerHTML = `${pageHead('Noticias y eventos', 'Lo que publiques aquí aparece al instante en el sitio del colegio', `<a class="btn btn-ghost btn-sm" href="index.html" target="_blank">Ver sitio ↗</a><button class="btn btn-ghost btn-sm" data-csv>⭳ CSV</button><button class="btn btn-primary btn-sm" data-new>+ ${tab === 'news' ? 'Nueva noticia' : 'Nuevo evento'}</button>`)}
    <div class="tabs" role="tablist"><button class="tab ${tab === 'news' ? 'active' : ''}" data-tab="news" role="tab" aria-selected="${tab === 'news'}">Noticias (${db.count('news')})</button><button class="tab ${tab === 'events' ? 'active' : ''}" data-tab="events" role="tab" aria-selected="${tab === 'events'}">Eventos (${db.count('events')})</button></div>
    <div class="card" data-t></div>`;
  const box = el.querySelector('[data-t]');
  if (tab === 'news') {
    const rows = db.all('news');
    smartTable(box, {
      id: 'news', rows, search: r => r.title + r.excerpt,
      filters: [{ key: 'category', label: 'Categoría', options: CATS }, { key: 'published', label: 'Estado', options: [['true', 'Publicadas'], ['false', 'Borradores']], test: (r, v) => String(!!r.published) === v }],
      columns: [
        { key: 'title', label: 'Noticia', render: r => `<b>${escape(r.title)}</b>${r.featured ? ' ' + badge('Destacada', 'primary') : ''}<div class="small muted">${escape(r.category)} · ${escape(r.author || '')}</div>` },
        { key: 'date', label: 'Fecha', render: r => `<span class="nowrap">${date(r.date + 'T12:00')}</span>` },
        { key: 'views', label: 'Visitas' },
        { key: 'published', label: 'Estado', render: r => `<label class="switch" title="Publicar"><input type="checkbox" data-act="pub" ${r.published ? 'checked' : ''} aria-label="Publicada"><span></span></label>` },
        { key: 'x', label: '', sort: false, render: r => `<div class="actions">${r.published ? `<a class="btn btn-sm btn-ghost" href="index.html#/noticias/${r.id}" target="_blank">Ver</a>` : ''}<button class="btn btn-sm btn-ghost" data-act="edit">Editar</button><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>` }
      ],
      onAction: async (act, r) => {
        if (act === 'pub') { db.update('news', r.id, { published: !r.published }); db.log('noticia', `${!r.published ? 'Publicada' : 'Despublicada'}: ${r.title}`, me.id); return toast(!r.published ? 'Noticia publicada en el sitio' : 'Noticia retirada del sitio', 'success'); }
        if (act === 'edit') return editNews(db, me, db.get('news', r.id));
        if (await ask(`¿Eliminar "${r.title}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('news', r.id); db.log('noticia', `Eliminada: ${r.title}`, me.id); toast('Noticia eliminada', 'success'); }
      }
    });
  } else {
    const rows = db.all('events');
    smartTable(box, {
      id: 'events', rows, search: r => r.title + (r.place || ''),
      filters: [{ key: 'type', label: 'Tipo', options: EVT }, { key: 'when', label: 'Fecha', options: [['next', 'Próximos'], ['past', 'Pasados']], test: (r, v) => v === 'next' ? r.date >= ymd(NOW) : r.date < ymd(NOW) }],
      columns: [
        { key: 'date', label: 'Fecha', render: r => `<span class="nowrap">${date(r.date + 'T12:00')}</span>` },
        { key: 'title', label: 'Evento', render: r => `<b>${escape(r.title)}</b><div class="small muted">${escape(r.place || '')}</div>` },
        { key: 'type', label: 'Tipo', render: r => badge(EVT.find(x => x[0] === r.type)?.[1] || r.type, { feriado: 'danger', reunion: 'info', extra: 'success', academico: 'primary' }[r.type]) },
        { key: 'public', label: 'Público', render: r => r.public ? '✓' : '—' },
        { key: 'x', label: '', sort: false, render: () => `<div class="actions"><button class="btn btn-sm btn-ghost" data-act="edit">Editar</button><button class="btn btn-sm btn-ghost" data-act="del" aria-label="Eliminar">🗑</button></div>` }
      ],
      onAction: async (act, r) => {
        if (act === 'edit') return editEvent(db, me, db.get('events', r.id));
        if (await ask(`¿Eliminar "${r.title}"?`, { danger: true, ok: 'Eliminar' })) { db.remove('events', r.id); db.log('evento', `Eliminado: ${r.title}`, me.id); toast('Evento eliminado', 'success'); }
      }
    });
  }
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(el, ctx); });
  el.querySelector('[data-new]').onclick = () => tab === 'news' ? editNews(db, me) : editEvent(db, me);
  el.querySelector('[data-csv]').onclick = () => tab === 'news' ? downloadCSV('noticias.csv', db.all('news').map(n => ({ titulo: n.title, categoria: n.category, fecha: n.date, publicada: n.published ? 'sí' : 'no', visitas: n.views }))) : downloadCSV('eventos.csv', db.all('events').map(e => ({ fecha: e.date, evento: e.title, tipo: e.type, lugar: e.place })));
}
