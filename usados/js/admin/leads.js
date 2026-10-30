// Leads / CRM: bandeja de reservas, test drives, visitas, tasaciones, créditos y consultas con asignación y notas.
import { escape, date, toast } from '../../../assets/core/ui.js';
import { pageHead, smartTable, kpi } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { LEAD_TYPES, LEAD_STATES } from '../data/catalog.js';
import { carName, userById, sellers, statusBadge } from '../shared/domain.js';
import { leadDetail } from '../shared/sales.js';
import { DAY } from '../shared/util.js';

export default {
  id: 'leads', label: 'Leads (CRM)', icon: '📥', group: 'Comercial', roles: ['admin', 'gerente', 'vendedor'],
  watch: ['leads'],
  render(el, ctx) {
    const ls = db.all('leads'), l30 = ls.filter(l => Date.now() - new Date(l.createdAt) < 30 * DAY);
    el.innerHTML = `${pageHead('Leads (CRM)', 'Todos los contactos comerciales generados por el sitio, WhatsApp y sucursales')}
      <div class="kpi-grid">${kpi('Nuevos sin atender', String(ls.filter(l => l.status === 'nuevo').length), 'responder en menos de 2 h', !ls.some(l => l.status === 'nuevo'))}${kpi('Leads 30 días', String(l30.length))}${kpi('En negociación', String(ls.filter(l => l.status === 'negociacion').length))}${kpi('Ganados 30 días', String(l30.filter(l => l.status === 'ganado').length), `${l30.length ? (l30.filter(l => l.status === 'ganado').length / l30.length * 100).toFixed(0) : 0}% conversión`)}</div><div data-t></div>`;
    const t = smartTable(el.querySelector('[data-t]'), {
      rows: () => db.all('leads').map(l => ({ ...l, car: l.carId ? carName(db.get('cars', l.carId)) : '—', seller: userById(l.sellerId)?.name || '' })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(LEAD_STATES).map(([k, s]) => [k, s.label]) }, { key: 'type', label: 'Tipo', options: Object.entries(LEAD_TYPES).map(([k, s]) => [k, s.label]) },
        { key: 'sellerId', label: 'Vendedor', options: [['none', 'Sin asignar'], ...sellers().map(s => [s.id, s.name])], value: ctx.user.role === 'vendedor' ? ctx.user.id : '', test: (r, v) => v === 'none' ? !r.sellerId : r.sellerId === v }],
      search: r => `${r.name} ${r.email} ${r.phone} ${r.car}`,
      columns: [
        { key: 'createdAt', label: 'Fecha', render: r => date(r.createdAt) },
        { key: 'type', label: 'Tipo', render: r => `${LEAD_TYPES[r.type]?.icon || ''} ${escape(LEAD_TYPES[r.type]?.label || r.type)}` },
        { key: 'name', label: 'Contacto', render: r => `<b>${escape(r.name)}</b><small class="muted d-block">${escape(r.phone || r.email)}</small>` },
        { key: 'car', label: 'Auto' }, { key: 'source', label: 'Origen' },
        { key: 'seller', label: 'Vendedor', render: r => r.seller ? escape(r.seller) : '<span class="badge badge-warning">Sin asignar</span>' },
        { key: 'status', label: 'Estado', render: r => statusBadge(LEAD_STATES, r.status) }
      ],
      onRow: r => leadDetail(r.id, ctx.user),
      actions: '<button class="btn btn-sm" data-auto>Repartir sin asignar</button>',
      csv: { name: 'leads', map: r => ({ fecha: r.createdAt.slice(0, 10), tipo: LEAD_TYPES[r.type]?.label, nombre: r.name, correo: r.email, telefono: r.phone, auto: r.car, origen: r.source, vendedor: r.seller, estado: LEAD_STATES[r.status].label }) }
    });
    el.querySelector('[data-auto]').onclick = () => {
      const ss = sellers(), free = db.query('leads', l => !l.sellerId && !['ganado', 'perdido'].includes(l.status));
      if (!free.length) { toast('No hay leads sin asignar', 'info'); return; }
      free.forEach((l, i) => db.update('leads', l.id, { sellerId: ss[i % ss.length].id }));
      db.log('leads', `${free.length} leads repartidos entre ${ss.length} vendedores`, ctx.user.id); toast(`${free.length} leads asignados`, 'success');
    };
    return t;
  }
};
