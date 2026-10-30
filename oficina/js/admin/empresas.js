// Empresas del edificio (multiempresa): CRUD, activación y borrado en cascada.
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead, actBtn, onActs, confirmDelete } from './common.js';
import { smartTable } from '../shared/table.js';
import { formDialog } from '../shared/form.js';
import { floorFromTemplate } from '../data/seed.js';

const FIELDS = [
  { name: 'name', label: 'Nombre', required: true },
  { name: 'short', label: 'Sigla (2-3 letras)', required: true, maxlength: 3 },
  { name: 'tagline', label: 'Rubro / bajada', span: 2 },
  { name: 'domain', label: 'Dominio de correo', required: true, placeholder: 'empresa.demo' },
  { name: 'city', label: 'Ciudad', required: true },
  { name: 'address', label: 'Dirección', span: 2 },
  { name: 'ext', label: 'Prefijo de anexos', type: 'number', min: 1, max: 9 },
  { name: 'brand', label: 'Color de marca', type: 'color' },
  { name: 'active', label: 'Empresa activa (visible en el directorio)', type: 'checkbox' }
];

export function render(el, ctx) {
  const { db } = ctx;
  const rows = db.all('companies').map(c => ({
    ...c,
    people: db.count('people', p => p.companyId === c.id),
    floors: db.count('floors', f => f.companyId === c.id),
    desks: db.query('floors', f => f.companyId === c.id).reduce((n, f) => n + f.desks.length, 0)
  }));
  el.innerHTML = pageHead('Empresas', 'Organizaciones que comparten el edificio. Cada una tiene sus pisos, áreas y personas.', '<button class="btn btn-primary" data-act="new">＋ Nueva empresa</button>') + '<div data-t></div>';
  smartTable(el.querySelector('[data-t]'), {
    key: 'empresas', rows, search: r => `${r.name} ${r.city} ${r.domain}`, sort: 'name',
    columns: [
      { key: 'name', label: 'Empresa', render: r => `<span class="cell-person"><span class="avatar" style="--av:${escape(r.brand)};border-radius:var(--radius-sm)">${escape(r.short)}</span><span><b>${escape(r.name)}</b><small>${escape(r.tagline || '')}</small></span></span>` },
      { key: 'city', label: 'Ciudad' }, { key: 'domain', label: 'Dominio', render: r => `<span class="mono small">${escape(r.domain)}</span>` },
      { key: 'people', label: 'Personas' }, { key: 'floors', label: 'Pisos' }, { key: 'desks', label: 'Puestos' },
      { key: 'active', label: 'Estado', render: r => r.active === false ? '<span class="badge">Inactiva</span>' : '<span class="badge badge-success">Activa</span>' },
      { key: 'a', label: '', sort: false, cls: 'right', render: r => `<div class="acts">${actBtn('use', r.id, 'Gestionar', 'btn-ghost')}${actBtn('edit', r.id, '✎', 'btn-ghost', 'Editar')}${actBtn('del', r.id, '🗑', 'btn-ghost', 'Eliminar')}</div>` }
    ],
    csv: { filename: 'empresas.csv', map: r => ({ nombre: r.name, ciudad: r.city, dominio: r.domain, personas: r.people, pisos: r.floors, puestos: r.desks, activa: r.active !== false ? 'sí' : 'no' }) }
  });
  onActs(el, {
    new: async () => {
      const v = await formDialog({ title: 'Nueva empresa', fields: FIELDS, values: { active: true, brand: '#4f46e5', ext: 5, city: 'Santiago' } });
      if (!v) return;
      const id = v.short.toLowerCase().replace(/[^a-z]/g, '') + Date.now().toString(36).slice(-4);
      db.insert('companies', { ...v, id, short: v.short.toUpperCase() });
      db.insert('floors', { id: `${id}-f1`, companyId: id, num: 1, name: 'Piso 1', template: 'T1', w: 1200, h: 760, ...floorFromTemplate('T1', 1, [0, 1]) });
      const rules = db.getValue('rules', {}); rules[id] = { maxDaysAhead: 14, maxPerWeek: 3, checkinDeadline: '10:30', restrictNeighborhoods: false, allowWeekends: false, autoRelease: true }; db.setValue('rules', rules);
      db.log('empresa', `Creó la empresa ${v.name} (con un piso base)`, ctx.user.id);
      toast('Empresa creada con un piso base', 'success');
    },
    edit: async id => {
      const c = db.get('companies', id);
      const v = await formDialog({ title: `Editar ${c.name}`, fields: FIELDS, values: c });
      if (!v) return;
      db.update('companies', id, { ...v, short: v.short.toUpperCase() });
      db.log('empresa', `Editó la empresa ${v.name}`, ctx.user.id);
      toast('Cambios guardados', 'success');
    },
    use: id => { ctx.setCompany(id); toast(`Gestionando ${db.get('companies', id).name}`, 'info'); ctx.go('/pisos'); },
    del: id => {
      const c = db.get('companies', id);
      if (db.count('companies') <= 1) return toast('Debe quedar al menos una empresa', 'warning');
      confirmDelete(`la empresa «${c.name}» con todos sus pisos, personas, reservas y visitas`, () => {
        ['floors', 'people', 'areas', 'reservations', 'roomBookings', 'visitors', 'leaves'].forEach(col => db.query(col, r => r.companyId === id).forEach(r => db.remove(col, r.id)));
        db.remove('companies', id);
      }, { db, user: ctx.user, log: `Eliminó la empresa ${c.name}` });
    }
  });
}
