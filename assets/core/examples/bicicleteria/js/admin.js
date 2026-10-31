// Panel completo: dashboard + 3 recursos + usuarios, configuración y bitácora estándar.
import { app, customers, orders, parts, ORDER } from './app.js';
import { usersSection, settingsSection, logSection } from '../../../pages.js';
import { pageHead, kpis, chartCard, activityFeed, card } from '../../../blocks.js';
import { byMonth, countBy, sumBy } from '../../../domain.js';
import { html, raw, money, barChart, donutChart } from '../../../ui.js';

const { db } = app;
const ADMIN = ['admin'];

function dashboard(view) {
  const all = db.all('orders'), open = all.filter(o => !ORDER.isFinal(o.status));
  view.innerHTML = html`${pageHead('Resumen', 'Lo que pasa hoy en el taller')}
    ${kpis([
      { label: 'Órdenes abiertas', value: open.length, icon: '🔧', href: '#/ordenes' },
      { label: 'Listas para retiro', value: all.filter(o => o.status === 'lista').length, icon: '✅' },
      { label: 'Facturado (entregadas)', value: money(sumBy(all.filter(o => o.status === 'entregada'), 'price')), icon: '💰' },
      { label: 'Repuestos con stock bajo', value: db.count('parts', p => p.stock <= 3), icon: '📦', href: '#/repuestos' }
    ])}
    <div class="k-grid-main">
      ${raw(chartCard('Órdenes por mes', barChart(byMonth(all, 'createdAt'))))}
      ${raw(chartCard('Por estado', donutChart(countBy(open, 'status', ORDER.label), { label: open.length })))}
    </div>
    ${raw(card('Actividad reciente', activityFeed(db)))}`;
}

app.panel({
  page: 'admin.html', sub: 'Taller',
  nav: [
    { section: 'Taller' },
    { id: '', label: 'Resumen', icon: '📊', roles: ADMIN, render: dashboard },
    orders.section(),
    customers.section(),
    parts.section({ roles: ADMIN }),
    { section: 'Sistema' },
    usersSection(app, { roles: ADMIN }),
    settingsSection(app, { roles: ADMIN, groups: [{ title: 'Sitio público', fields: [{ name: 'tagline', label: 'Eslogan', required: true }, { name: 'phone', label: 'Teléfono', type: 'tel' }] }] }),
    logSection(app, { roles: ADMIN })
  ]
});
