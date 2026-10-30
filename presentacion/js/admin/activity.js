// Bitácora de actividad (db.log).
import { escape, dateTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { pageHead, table } from '../shared/admin-kit.js';

const ICONS = { login: '⎆', logout: '⎋', lead: '✉', 'cotización': '＄', proyecto: '◧', blog: '✍', usuario: '⚇', ajustes: '⚙', cms: '✎', reset: '↺', medios: '▤', oferta: '⚑', 'postulación': '☷', equipo: '☺', testimonio: '❝', servicio: '◆', register: '＋' };

export default {
  id: 'activity', path: '/actividad', label: 'Bitácora', icon: '☰', group: 'Sistema', perm: 'activity',
  render(el) {
    const rows = db.all('_log').map(l => ({ ...l, who: db.get('users', l.user)?.name || 'Visitante del sitio' }));
    el.innerHTML = `${pageHead('Bitácora de actividad', `Últimos ${rows.length} eventos del sitio y del panel.`)}<div data-t></div>`;
    table(el.querySelector('[data-t]'), {
      id: 'activity', rows, sort: 'at', dir: -1, pageSize: 15, search: l => `${l.action} ${l.detail} ${l.who}`,
      filters: [{ key: 'action', label: 'Tipo', options: [...new Set(rows.map(r => r.action))] }, { key: 'who', label: 'Usuario', options: [...new Set(rows.map(r => r.who))] }],
      empty: 'Sin actividad registrada todavía.',
      columns: [
        { key: 'at', label: 'Fecha', render: l => `<span class="small">${dateTime(l.at)}</span>` },
        { key: 'action', label: 'Tipo', render: l => `<span class="badge plain">${ICONS[l.action] || '•'} ${escape(l.action)}</span>` },
        { key: 'detail', label: 'Detalle' },
        { key: 'who', label: 'Usuario' }
      ],
      csv: { name: 'bitacora', map: l => ({ fecha: dateTime(l.at), tipo: l.action, detalle: l.detail, usuario: l.who }) }
    });
  }
};
