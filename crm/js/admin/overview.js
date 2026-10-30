// Resumen de administración: adopción del sistema, leads del sitio web y uso por usuario.
import { db, auth } from '../data/db.js';
import { escape, ago, lineChart, barChart, donutChart } from '../../../assets/core/ui.js';
import { can } from '../shared/perms.js';
import { kpi, pageHead } from '../app/components.js';
import { userName, avatar, startOfWeek, addDays, DAY } from '../shared/util.js';
import { icon } from '../shared/icons.js';

export function render(view, { user }) {
  const users = db.all('users');
  const active = users.filter(u => u.active !== false);
  const since30 = Date.now() - 30 * DAY;
  const webLeads = db.query('leads', l => ['Demo web', 'Formulario web'].includes(l.source));
  const web30 = webLeads.filter(l => new Date(l.createdAt) > since30);
  const autos = db.all('automations');
  const log = db.getValue('_log', []);
  const ws = startOfWeek(new Date());
  const weeks = [...Array(8)].map((_, i) => addDays(ws, -7 * (7 - i)));
  const perWeek = weeks.map(w => ({ label: `${w.getDate()}/${w.getMonth() + 1}`, value: webLeads.filter(l => { const t = new Date(l.createdAt); return t >= w && t < addDays(w, 7); }).length }));
  const actsByUser = active.filter(u => u.role !== 'admin').map(u => ({ label: u.name.split(' ')[0], value: db.count('activities', a => a.ownerId === u.id && a.done && a.type !== 'sistema' && new Date(a.dueAt) > since30) }));
  const roles = Object.entries(auth.roles).map(([id, label]) => ({ label, value: active.filter(u => u.role === id).length }));

  view.innerHTML = `
    ${pageHead('Resumen de administración', `${escape(db.getValue('settings', {}).companyName || 'Pulso CRM')} · estado del sistema`, `<a class="btn" href="index.html" target="_blank" rel="noopener">${icon('globe', 16)} Ver sitio</a>`)}
    <div class="grid-4">
      ${kpi('Usuarios activos', active.length, `${users.length - active.length} desactivados`)}
      ${kpi('Leads del sitio (30 días)', web30.length, `${web30.filter(l => !l.ownerId).length} sin asignar`, web30.length ? 'up' : '')}
      ${kpi('Automatizaciones', `${autos.filter(a => a.active).length}/${autos.length}`, `${autos.reduce((s, a) => s + (a.runs || 0), 0)} ejecuciones totales`)}
      ${kpi('Eventos registrados', log.length, log[0] ? `último ${ago(log[0].at)}` : 'sin eventos')}
    </div>
    <div class="dash-grid">
      <section class="card stack span-2"><h3 style="margin:0">Leads desde el sitio web por semana</h3>${lineChart(perWeek)}</section>
      <section class="card stack"><h3 style="margin:0">Usuarios por rol</h3>${donutChart(roles, { label: String(active.length), size: 140 })}</section>
      <section class="card stack span-2"><h3 style="margin:0">Actividades registradas por usuario (30 días)</h3>${barChart(actsByUser)}</section>
      <section class="card stack">
        <div class="row between"><h3 style="margin:0">Actividad reciente</h3>${can('log.view') ? '<a class="btn btn-ghost btn-sm" href="#/bitacora">Ver todo →</a>' : ''}</div>
        <div class="log-list">${log.slice(0, 8).map(l => `<div class="log-row">${avatar(db.get('users', l.user), 26)}<div style="min-width:0"><b class="small">${escape(l.action)}</b> <span class="small">${escape(l.detail)}</span><br><small class="muted">${ago(l.at)}</small></div></div>`).join('') || '<div class="empty small">Aún no hay eventos. Inicia sesión o edita algo para verlos aquí.</div>'}</div>
      </section>
      <section class="card stack span-3">
        <h3 style="margin:0">Últimos leads del sitio</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Lead</th><th>Fuente</th><th>Interés</th><th>Asignado a</th><th>Recibido</th></tr></thead><tbody>
          ${webLeads.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(l => `<tr><td><a href="app.html#/leads/${l.id}"><b>${escape(l.name)}</b></a><br><small class="muted">${escape(l.company)}</small></td><td>${escape(l.source)}</td><td>${escape(l.interest || '—')}</td><td>${escape(userName(l.ownerId))}</td><td>${ago(l.createdAt)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </div>`;
}
