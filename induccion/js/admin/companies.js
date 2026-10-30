// Empresas (propia y contratistas): CRUD con dotación y cumplimiento.
import { crud, badge, pctBar, html, escape } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { assignmentStatus, certStatus, rate } from '../data/model.js';
import { parseRut } from '../shared/rut.js';

function summary(c) {
  const ws = db.query('users', u => u.role === 'trabajador' && u.companyId === c.id);
  const ids = new Set(ws.map(u => u.id));
  const as = db.query('assignments', a => ids.has(a.userId) && !a.cancelled);
  const done = as.filter(a => assignmentStatus(a) === 'completada').length;
  const overdue = as.filter(a => assignmentStatus(a) === 'vencida').length;
  const certified = new Set(db.query('certificates', x => ids.has(x.userId) && ['vigente', 'por_vencer'].includes(certStatus(x))).map(x => x.userId)).size;
  return { workers: ws.length, active: ws.filter(u => u.active !== false).length, pct: rate(done, as.length), overdue, certified };
}

export function renderCompanies(el, _p, ctx) {
  crud(el, ctx, {
    key: 'companies', title: 'Empresas', subtitle: 'Empresa mandante y contratistas. El cumplimiento se calcula con las inducciones de su dotación.', singular: 'empresa', collection: 'companies',
    rows: () => db.all('companies').map(c => ({ ...c, _s: summary(c) })),
    search: c => `${c.name} ${c.rut} ${c.contact} ${c.service || ''}`,
    filters: [
      { key: 'kind', label: 'Tipo', options: [['propia', 'Mandante'], ['contratista', 'Contratista']] },
      { key: 'active', label: 'Estado', options: [['1', 'Habilitadas'], ['0', 'Suspendidas']], test: (c, v) => (c.active !== false) === (v === '1') }
    ],
    columns: [
      { key: 'name', label: 'Empresa', render: c => html`<b>${c.name}</b><br><small class="muted">${c.rut} · ${c.service || 'Mandante'}</small>` },
      { key: 'contact', label: 'Contacto', render: c => html`${c.contact}<br><small class="muted">${c.email} · ${c.phone}</small>` },
      { key: 'workers', label: 'Dotación', value: c => c._s.workers, align: 'center', render: c => `${c._s.active}<small class="muted"> / ${c._s.workers}</small>` },
      { key: 'pct', label: 'Cumplimiento', value: c => c._s.pct, render: c => pctBar(c._s.pct) + (c._s.overdue ? ' ' + badge(`${c._s.overdue} vencidas`, 'danger') : '') },
      { key: 'certified', label: 'Certificados', value: c => c._s.certified, align: 'center', render: c => String(c._s.certified) },
      { key: 'active', label: 'Estado', render: c => c.active === false ? badge('Suspendida', 'danger') : badge(c.kind === 'propia' ? 'Mandante' : 'Habilitada', c.kind === 'propia' ? 'primary' : 'success') }
    ],
    fields: () => [
      { name: 'name', label: 'Razón social', required: true },
      { name: 'rut', label: 'RUT empresa', required: true, half: true },
      { name: 'kind', label: 'Tipo', type: 'select', options: [['contratista', 'Contratista'], ['propia', 'Mandante']], half: true },
      { name: 'service', label: 'Servicio que presta', half: true },
      { name: 'contact', label: 'Persona de contacto', required: true, half: true },
      { name: 'email', label: 'Correo', type: 'email', required: true, half: true },
      { name: 'phone', label: 'Teléfono', half: true },
      { name: 'active', label: 'Habilitada para ingresar a faena', type: 'checkbox', value: true }
    ],
    validate: (v, c) => { const e = {}; const r = parseRut(v.rut); if (!r.ok) e.rut = r.error; else { v.rut = r.value; if (db.find('companies', x => x.rut === r.value && x.id !== c?.id)) e.rut = 'RUT ya registrado'; } return e; },
    toRecord: v => { const r = { ...v }; delete r._s; return r; },
    canDelete: c => c.kind !== 'propia',
    beforeDelete: c => summary(c).workers ? `Tiene ${summary(c).workers} trabajadores asociados. Suspéndela o reasígnalos primero.` : null,
    afterSave: (c, v) => {
      // Al suspender una contratista se desactivan sus trabajadores.
      if (v.active === false) { db.query('users', u => u.companyId === c.id && u.active !== false).forEach(u => db.update('users', u.id, { active: false })); }
    },
    rowActions: [{ act: 'workers', label: 'Ver trabajadores', short: '👷', run: c => { location.hash = '#/trabajadores'; setTimeout(() => { const s = document.querySelector('[data-f="companyId"]'); if (s) { s.value = c.id; s.dispatchEvent(new Event('change')); } }, 50); } }],
    csv: c => ({ empresa: c.name, rut: c.rut, tipo: c.kind, servicio: c.service || '', contacto: c.contact, correo: c.email, telefono: c.phone, dotacion: c._s.workers, cumplimiento: c._s.pct + '%', vencidas: c._s.overdue, certificados: c._s.certified, estado: c.active === false ? 'Suspendida' : 'Habilitada' })
  });
}
