// Cursos (todos los instructores) y categorías.
import { crud, badge, html, escape, toast } from '../shared/admin-kit.js';
import { money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { LEVELS, TONES } from '../data/seed.js';
import { getCategory, getUser, rating, studentsCount, lessonsOf, COURSE, isPublic, notify } from '../data/model.js';

export function renderCourses(el, _p, ctx) {
  crud(el, ctx, {
    key: 'courses', title: 'Cursos', subtitle: 'Todos los cursos de la plataforma. Edita datos comerciales, estado y destacados.', singular: 'curso', collection: 'courses', canCreate: false,
    rows: () => db.all('courses').map(c => ({ ...c, _n: studentsCount(c.id), _r: rating(c.id) })),
    search: c => `${c.title} ${getUser(c.instructorId)?.name}`,
    filters: [
      { key: 'categoryId', label: 'Categoría', options: db.all('categories').map(c => [c.id, c.name]) },
      { key: 'status', label: 'Estado', options: Object.entries(COURSE).map(([k, v]) => [k, v[0]]) },
      { key: 'level', label: 'Nivel', options: LEVELS },
      { key: 'featured', label: 'Destacado', options: [['1', 'Sí'], ['0', 'No']], test: (c, v) => !!c.featured === (v === '1') }
    ],
    columns: [
      { key: 'title', label: 'Curso', render: c => html`<b>${c.emoji} ${c.title}</b><br><small class="muted">${getUser(c.instructorId)?.name} · ${getCategory(c.categoryId)?.name} · ${c.level}</small>` },
      { key: 'price', label: 'Precio', render: c => c.price ? (c.salePrice ? `${money(c.salePrice)}<br><small class="muted"><s>${money(c.price)}</s></small>` : money(c.price)) : 'Gratis' },
      { key: '_n', label: 'Estudiantes', align: 'center' },
      { key: 'rating', label: '★', value: c => c._r.avg, render: c => c._r.count ? `${c._r.avg} <small class="muted">(${c._r.count})</small>` : '—' },
      { key: 'status', label: 'Estado', render: c => badge(COURSE[c.status][0], COURSE[c.status][1]) + (c.featured ? ' ' + badge('Destacado', 'primary') : '') }
    ],
    fields: () => [
      { name: 'title', label: 'Título', required: true },
      { name: 'subtitle', label: 'Subtítulo' },
      { name: 'categoryId', label: 'Categoría', type: 'select', options: db.all('categories').map(c => [c.id, c.name]), half: true },
      { name: 'level', label: 'Nivel', type: 'select', options: LEVELS, half: true },
      { name: 'price', label: 'Precio (CLP)', type: 'number', min: 0, half: true },
      { name: 'salePrice', label: 'Precio oferta (0 = sin oferta)', type: 'number', min: 0, half: true },
      { name: 'status', label: 'Estado', type: 'select', options: Object.entries(COURSE).map(([k, v]) => [k, v[0]]), half: true },
      { name: 'featured', label: 'Destacado en portada', type: 'checkbox' }
    ],
    toForm: c => ({ ...c, salePrice: c.salePrice || 0 }),
    validate: v => v.salePrice && v.salePrice >= v.price ? { salePrice: 'Debe ser menor al precio' } : {},
    toRecord: (v, c) => {
      const r = { title: v.title, subtitle: v.subtitle, categoryId: v.categoryId, level: v.level, price: v.price, salePrice: v.salePrice || null, status: v.status, featured: v.featured };
      if (v.status === 'publicado' && c.status !== 'publicado') { r.publishedAt = new Date().toISOString(); notify(c.instructorId, 'Curso publicado', `«${c.title}» fue publicado por el equipo.`, 'success'); }
      const site = db.getValue('site');
      if (site) { const ids = new Set(site.featuredIds || []); v.featured ? ids.add(c.id) : ids.delete(c.id); db.setValue('site', { ...site, featuredIds: [...ids] }); }
      return r;
    },
    beforeDelete: c => c._n ? 'El curso tiene estudiantes inscritos: archívalo en lugar de eliminarlo.' : null,
    rowActions: [{ act: 'view', label: 'Ver página', short: '👁', run: c => window.open(`index.html#/curso/${c.slug}`, '_blank') }],
    csv: c => ({ curso: c.title, instructor: getUser(c.instructorId)?.name, categoria: getCategory(c.categoryId)?.name, nivel: c.level, precio: c.price, oferta: c.salePrice || '', estado: c.status, estudiantes: c._n, rating: c._r.avg, lecciones: lessonsOf(c).length })
  });
}

export function renderCategories(el, _p, ctx) {
  crud(el, ctx, {
    key: 'categories', title: 'Categorías', subtitle: 'Organizan el catálogo y los filtros del sitio.', singular: 'categoría', collection: 'categories',
    rows: () => db.all('categories').map(c => ({ ...c, _n: db.count('courses', k => k.categoryId === c.id), _p: db.count('courses', k => k.categoryId === c.id && isPublic(k)) })),
    search: c => c.name,
    columns: [
      { key: 'name', label: 'Categoría', render: c => html`<b>${c.icon} ${c.name}</b><br><small class="muted">/${c.slug}</small>` },
      { key: 'description', label: 'Descripción' },
      { key: '_p', label: 'Publicados', align: 'center', render: c => `${c._p} <small class="muted">/ ${c._n}</small>` },
      { key: 'active', label: 'Estado', render: c => c.active === false ? badge('Oculta', 'danger') : badge('Visible', 'success') }
    ],
    fields: () => [
      { name: 'name', label: 'Nombre', required: true, half: true },
      { name: 'icon', label: 'Ícono (emoji)', required: true, half: true, value: '📘' },
      { name: 'tone', label: 'Color', type: 'select', options: TONES, half: true },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'active', label: 'Visible en el sitio', type: 'checkbox', value: true }
    ],
    toRecord: v => ({ ...v, slug: v.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') }),
    validate: (v, c) => db.find('categories', x => x.name.toLowerCase() === v.name.toLowerCase() && x.id !== c?.id) ? { name: 'Ya existe' } : {},
    beforeDelete: c => c._n ? `Tiene ${c._n} cursos asociados.` : null,
    csv: c => ({ categoria: c.name, slug: c.slug, cursos: c._n, publicados: c._p })
  });
}
