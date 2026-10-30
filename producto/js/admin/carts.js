// Carritos abandonados: checkouts con correo que no terminaron el pago. Recordatorios simulados.
import { db, sendEmail } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, money, ago, toast, confirm, num } from '../../../assets/core/ui.js';

export default {
  id: 'carritos', label: 'Carritos abandonados', ico: '🛒', group: 'Ventas', roles: ['admin', 'soporte', 'marketing'],
  count: () => db.count('carts', c => !c.recovered && !c.reminders),
  render(view, ctx) {
    const rows = db.all('carts');
    const open = rows.filter(c => !c.recovered), rec = rows.filter(c => c.recovered);
    const autos = db.query('automations', a => a.trigger === 'carrito' && a.active);
    view.innerHTML = `${pageHead('Carritos abandonados', 'Personas que dejaron su correo en el checkout pero no pagaron.', `<a class="btn" href="#/automatizaciones">⚙️ Automatizaciones</a>`)}
      <div class="kpis">
        ${kpi('En riesgo', num(open.length), { ico: '⏳', sub: money(open.reduce((s, c) => s + c.total, 0)) + ' potenciales' })}
        ${kpi('Recuperados', num(rec.length), { ico: '✅', sub: money(rec.reduce((s, c) => s + c.total, 0)) })}
        ${kpi('Tasa de recuperación', (rows.length ? rec.length / rows.length * 100 : 0).toFixed(1).replace('.', ',') + '%', { ico: '📈' })}
        ${kpi('Flujos activos', num(autos.length), { ico: '✉️', sub: autos.map(a => escape(a.delayHours + ' h')).join(' · ') })}
      </div>
      <div class="card" id="tbl"></div>`;
    table(view.querySelector('#tbl'), {
      id: 'carts', rows, sort: { key: 'createdAt', dir: -1 },
      search: c => `${c.name} ${c.email} ${c.bundleName}`,
      filters: [{ key: 'state', label: 'Estado', options: [['open', 'En riesgo'], ['rec', 'Recuperado'], ['none', 'Sin recordatorio']], test: (c, v) => v === 'open' ? !c.recovered : v === 'rec' ? c.recovered : !c.reminders && !c.recovered }],
      columns: [
        { key: 'name', label: 'Cliente', render: c => `${escape(c.name)}<br><small class="muted">${escape(c.email)}</small>` },
        { key: 'bundleName', label: 'Pack' },
        { key: 'total', label: 'Valor', render: c => money(c.total) },
        { key: 'step', label: 'Abandonó en' },
        { key: 'createdAt', label: 'Cuándo', render: c => escape(ago(c.createdAt)) },
        { key: 'reminders', label: 'Recordatorios', render: c => `${c.reminders || 0}` },
        { key: 'recovered', label: 'Estado', value: c => +c.recovered, render: c => c.recovered ? badge('Recuperado', 'success') : badge('En riesgo', 'warning') },
        { key: 'act', label: '', sort: false, render: c => `<div class="t-actions">${!c.recovered ? `<button class="btn btn-sm" data-remind="${c.id}">✉️ Recordar</button>` : ''}<button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Eliminar">✕</button></div>` }
      ],
      csv: { name: 'carritos-abandonados.csv', map: c => ({ nombre: c.name, correo: c.email, pack: c.bundleName, valor: c.total, paso: c.step, fecha: c.createdAt.slice(0, 10), recordatorios: c.reminders, recuperado: c.recovered ? 'sí' : 'no' }) }
    });
    view.onclick = async e => {
      const r = e.target.closest('[data-remind]'), d = e.target.closest('[data-del]');
      if (r) {
        const c = db.get('carts', r.dataset.remind);
        const auto = (c.reminders || 0) === 0 ? db.get('automations', 'au1') : db.get('automations', 'au2');
        sendEmail(c.email, auto.subject.replace('{nombre}', c.name.split(' ')[0]), auto.id);
        db.update('automations', auto.id, { sent: auto.sent + 1 });
        db.update('carts', c.id, { reminders: (c.reminders || 0) + 1 });
        db.log('Recordatorio enviado', `${c.email} · ${auto.name}`, ctx.user.id);
        toast(`Recordatorio enviado a ${c.email} (simulado)`, 'success');
      }
      if (d && await confirm('¿Eliminar este carrito?', { danger: true, ok: 'Eliminar' })) { db.remove('carts', d.dataset.del); toast('Carrito eliminado', 'success'); }
    };
  }
};
