// Datos y respaldo: volumen por colección, exportación CSV/JSON y restablecer la demo.
import { db } from '../data/db.js';
import { escape, toast, confirm, money, date } from '../../../assets/core/ui.js';
import { pageHead } from '../app/components.js';
import { exportCSV, companyName, userName } from '../shared/util.js';
import { stage } from '../shared/constants.js';
import { icon } from '../shared/icons.js';

const COLS = [
  ['deals', 'Negocios', d => ({ negocio: d.title, empresa: companyName(d.companyId), etapa: stage(d.stage).name, monto: d.amount, ejecutivo: userName(d.ownerId), creado: date(d.createdAt), cierre: date(d.closeDate) })],
  ['leads', 'Leads', l => ({ nombre: l.name, empresa: l.company, correo: l.email, fuente: l.source, estado: l.status, responsable: userName(l.ownerId) })],
  ['companies', 'Empresas', c => ({ empresa: c.name, rut: c.rut, industria: c.industry, ciudad: c.city })],
  ['contacts', 'Contactos', c => ({ nombre: c.name, correo: c.email, telefono: c.phone, cargo: c.title, empresa: companyName(c.companyId) })],
  ['activities', 'Actividades', a => ({ tipo: a.type, asunto: a.subject, fecha: date(a.dueAt), hecha: a.done ? 'sí' : 'no', responsable: userName(a.ownerId) })],
  ['products', 'Productos', p => ({ producto: p.name, sku: p.sku, precio: p.price })],
  ['quotes', 'Cotizaciones', q => ({ numero: q.number, negocio: db.get('deals', q.dealId)?.title || '', estado: q.status, fecha: date(q.createdAt) })],
  ['users', 'Usuarios', u => ({ nombre: u.name, correo: u.email, rol: u.role, activo: u.active === false ? 'no' : 'sí' })]
];

export function render(view, { user }) {
  const size = new Blob([JSON.stringify(db.export())]).size;
  view.innerHTML = `
    ${pageHead('Datos y respaldo', `La base de datos vive en este navegador (localStorage) · ${(size / 1024).toFixed(0)} KB`)}
    <div class="grid-auto">${COLS.map(([k, label]) => `<div class="card stack"><div class="stat"><span class="label">${label}</span><span class="value">${db.count(k)}</span></div><button class="btn btn-sm" data-csv="${k}">${icon('upload', 14)} Exportar CSV</button></div>`).join('')}</div>
    <section class="card stack"><h3 style="margin:0">Respaldo completo</h3><p class="muted" style="margin:0">Descarga toda la base en JSON (útil para inspeccionar la demo).</p><div><button class="btn" data-json>Descargar JSON</button></div></section>
    <section class="card stack danger-zone"><h3 style="margin:0">Restablecer datos demo</h3><p class="muted" style="margin:0">Vuelve a la semilla original: se pierden los cambios hechos en el CRM, el sitio y la configuración. Tu sesión se mantiene.</p><div><button class="btn btn-danger" data-reset>Restablecer datos demo</button></div></section>`;
  view.querySelectorAll('[data-csv]').forEach(b => b.onclick = () => { const [k, , map] = COLS.find(c => c[0] === b.dataset.csv); exportCSV(`${k}.csv`, db.all(k).map(map)); });
  view.querySelector('[data-json]').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db.export(), null, 2)], { type: 'application/json' }));
    a.download = 'pulso-crm-respaldo.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Respaldo descargado', 'success');
  };
  view.querySelector('[data-reset]').onclick = async () => {
    if (!await confirm('¿Restablecer todos los datos de la demo? Esta acción no se puede deshacer.', { danger: true, ok: 'Restablecer', title: 'Restablecer datos demo' })) return;
    db.reset();
    db.log('datos', 'Restableció los datos demo', user.id);
    toast('Datos demo restablecidos', 'success');
  };
}
