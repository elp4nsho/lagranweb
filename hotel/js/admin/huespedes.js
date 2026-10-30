// CRM de huéspedes: ficha, historial de estadías, gasto total, VIP y etiquetas.
import { escape, toast, confirm, formModal, money, modal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { guestStays, RES_STATES, typeById } from '../shared/hotel.js';
import { fmtRange } from '../shared/dates.js';
import { resDetail } from './reservas.js';

async function editGuest(g, ctx) {
  const v = await formModal({ title: g ? `Editar · ${g.name}` : 'Nuevo huésped', fields: [
    { name: 'name', label: 'Nombre', required: true, value: g?.name }, { name: 'email', label: 'Correo', type: 'email', required: true, value: g?.email },
    { name: 'phone', label: 'Teléfono', value: g?.phone }, { name: 'country', label: 'País', value: g?.country || 'Chile' }, { name: 'doc', label: 'Documento', value: g?.doc },
    { name: 'tags', label: 'Etiquetas (coma)', value: (g?.tags || []).join(', ') }, { name: 'notes', label: 'Preferencias / notas', type: 'textarea', value: g?.notes },
    { name: 'vip', label: 'Huésped VIP', type: 'checkbox', value: g?.vip }] });
  if (!v) return;
  if (db.find('guests', x => x.email.toLowerCase() === v.email.toLowerCase() && x.id !== g?.id)) { toast('Ya existe un huésped con ese correo', 'warning'); return; }
  const data = { ...v, tags: v.tags.split(',').map(s => s.trim()).filter(Boolean) };
  g ? db.update('guests', g.id, data) : db.insert('guests', data);
  db.log('huéspedes', `${g ? 'Editado' : 'Creado'}: ${v.name}`, ctx.user.id); toast('Huésped guardado', 'success');
}
function guestCard(id, ctx) {
  const g = db.get('guests', id), stays = guestStays(id);
  const spent = stays.filter(s => s.status === 'check-out').reduce((a, s) => a + s.total, 0);
  const m = modal({ title: g.name, size: 'lg', body: `<div class="stack">
    <div class="row">${g.vip ? '<span class="badge badge-warning">★ VIP</span>' : ''}${(g.tags || []).map(t => `<span class="badge plain">${escape(t)}</span>`).join('')}</div>
    <div class="grid-3 small"><div><span class="label">Contacto</span><b class="d-block">${escape(g.email)}</b>${escape(g.phone || '')}</div><div><span class="label">País / documento</span><b class="d-block">${escape(g.country || '')}</b>${escape(g.doc || '')}</div><div><span class="label">Valor del cliente</span><b class="d-block">${money(spent)}</b>${stays.filter(s => s.status === 'check-out').length} estadías</div></div>
    ${g.notes ? `<p class="callout small">📝 ${escape(g.notes)}</p>` : ''}
    <h4 style="margin:0">Historial</h4>
    <div class="table-wrap"><table class="table"><tbody>${stays.map(s => `<tr data-r="${s.id}" style="cursor:pointer"><td><code>${escape(s.code)}</code></td><td>${fmtRange(s.checkIn, s.checkOut)}</td><td class="small">${escape(typeById(s.roomTypeId)?.name || '')}</td><td>${money(s.total)}</td><td>${badge(RES_STATES, s.status)}</td></tr>`).join('') || '<tr><td>Sin estadías</td></tr>'}</tbody></table></div></div>`,
    foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" data-ed>Editar</button>' });
  m.el.addEventListener('click', e => { const r = e.target.closest('[data-r]'); if (r) resDetail(r.dataset.r, ctx); if (e.target.closest('[data-ed]')) { m.close(); editGuest(g, ctx); } });
}

export default {
  id: 'huespedes', label: 'Huéspedes', icon: '👥', group: 'Operación', roles: ['admin', 'recepcion'], watch: ['guests', 'reservations'],
  render(el, ctx) {
    el.innerHTML = `${pageHead('Huéspedes', 'CRM: historial, preferencias y valor de cada cliente', '<button class="btn btn-primary btn-sm" data-new>+ Huésped</button>')}<div data-l></div>`;
    el.querySelector('[data-new]').onclick = () => editGuest(null, ctx);
    el.addEventListener('click', async e => { const d = e.target.closest('[data-delg]'); if (!d) return; const g = db.get('guests', d.dataset.delg); if (db.count('reservations', r => r.guestId === g.id)) { toast('Tiene reservas: no se puede eliminar', 'warning'); return; } if (await confirm(`¿Eliminar a ${g.name}?`, { danger: true, ok: 'Eliminar' })) { db.remove('guests', g.id); db.log('huéspedes', `Eliminado: ${g.name}`, ctx.user.id); } });
    const stats = {}; db.all('reservations').forEach(r => { const s = stats[r.guestId] ||= { n: 0, spent: 0, last: '' }; if (r.status === 'check-out') { s.n++; s.spent += r.total; } if (r.checkIn > s.last && r.status !== 'cancelada') s.last = r.checkIn; });
    return smartTable(el.querySelector('[data-l]'), {
      rows: () => db.all('guests').map(g => ({ ...g, stays: stats[g.id]?.n || 0, spent: stats[g.id]?.spent || 0, last: stats[g.id]?.last || '' })),
      filters: [{ key: 'country', label: 'País', options: [...new Set(db.all('guests').map(g => g.country))].sort() }, { key: 'vip', label: 'VIP', options: [['true', 'Solo VIP']], test: (r, v) => String(!!r.vip) === v }],
      search: g => `${g.name} ${g.email} ${g.phone} ${(g.tags || []).join(' ')}`,
      columns: [
        { key: 'name', label: 'Huésped', render: g => `<b>${escape(g.name)}</b> ${g.vip ? '<span class="badge badge-warning plain">VIP</span>' : ''}<small class="muted d-block">${escape(g.email)}</small>` },
        { key: 'country', label: 'País' }, { key: 'stays', label: 'Estadías' }, { key: 'spent', label: 'Gasto total', render: g => money(g.spent) },
        { key: 'last', label: 'Última / próxima', render: g => g.last || '—' },
        { key: 'id', label: '', sort: false, render: g => `<button class="btn btn-sm btn-ghost" data-delg="${g.id}" aria-label="Eliminar">🗑</button>` }
      ],
      onRow: g => guestCard(g.id, ctx),
      csv: { name: 'huespedes', map: g => ({ nombre: g.name, correo: g.email, telefono: g.phone, pais: g.country, documento: g.doc, vip: g.vip ? 'sí' : 'no', estadias: g.stays, gasto: g.spent }) }
    });
  }
};
