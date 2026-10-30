// Ajustes: datos de la demo (exportar / restablecer).
import { db } from '../data/db.js';
import { pageHead, kpi } from '../shared/admin-kit.js';
import { toast, confirm, num } from '../../../assets/core/ui.js';

export default {
  id: 'ajustes', label: 'Ajustes', ico: '⚙️', group: 'Administración', roles: ['admin'],
  render(view, ctx) {
    const data = db.export();
    const size = (JSON.stringify(data).length / 1024).toFixed(0);
    const cols = ['campaigns', 'donations', 'donors', 'subscriptions', 'volunteers', 'activities', 'projects', 'expenses', 'news', 'users'];
    const names = { campaigns: 'Campañas', donations: 'Donaciones', donors: 'Donantes', subscriptions: 'Suscripciones', volunteers: 'Voluntarios', activities: 'Actividades', projects: 'Proyectos', expenses: 'Gastos', news: 'Noticias', users: 'Usuarios' };
    view.innerHTML = `${pageHead('Ajustes', 'Herramientas de la demo.')}
      <div class="kpis">${cols.slice(0, 8).map(c => kpi(names[c], num((data[c] || []).length))).join('')}</div>
      <div class="card stack"><h3 style="margin:0">Datos de la demo</h3>
        <p class="small muted" style="margin:0">Toda la información vive en tu navegador (localStorage, ~${size} KB) y la comparten el sitio público, Mi cuenta y este panel, también entre pestañas.</p>
        <div class="row" style="gap:8px"><button class="btn" data-export>⇩ Exportar JSON</button><button class="btn btn-danger" data-reset>↺ Restablecer datos demo</button></div></div>`;
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-export]')) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db.export(), null, 2)], { type: 'application/json' })); a.download = 'raices-del-sur-datos.json'; a.click(); toast('Exportación lista', 'success'); }
      if (t.matches('[data-reset]') && await confirm('Se borrarán todos los cambios y se cargarán los datos originales.', { title: 'Restablecer datos demo', danger: true, ok: 'Restablecer' })) {
        const me = ctx.user.id;
        db.reset();
        ctx.auth.loginAs(db.get('users', me) ? me : 'u-admin');
        db.log('Datos restablecidos', 'Se cargó la semilla original', 'u-admin');
        toast('Datos demo restablecidos', 'success');
        setTimeout(() => location.reload(), 500);
      }
    };
  }
};
