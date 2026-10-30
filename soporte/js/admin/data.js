// Datos y respaldo: volumen por colección, exportar CSV/JSON y restablecer la demo.
import { db } from '../data/db.js';
import { toast, confirm, dateTime } from '../../../assets/core/ui.js';
import { pageHead } from '../shared/shell.js';
import { exportCSV, userName, catName, requester } from '../shared/util.js';
import { status } from '../shared/constants.js';
import { icon } from '../shared/icons.js';

const COLS = [
  ['tickets', 'Tickets', t => ({ numero: t.number, asunto: t.subject, cliente: requester(t)?.name || '', categoria: catName(t.categoryId), estado: status(t.status).name, prioridad: t.priority, asignado: userName(t.assigneeId), creado: dateTime(t.createdAt), csat: t.csat?.rating || '' })],
  ['articles', 'Artículos', a => ({ titulo: a.title, categoria: catName(a.categoryId), estado: a.status, lecturas: a.views })],
  ['users', 'Usuarios', u => ({ nombre: u.name, correo: u.email, rol: u.role, activo: u.active === false ? 'no' : 'sí' })],
  ['chats', 'Chats', c => ({ visitante: c.name, estado: c.status, mensajes: c.messages.length, inicio: dateTime(c.createdAt) })],
  ['incidents', 'Incidentes', i => ({ titulo: i.title, impacto: i.impact, estado: i.status, inicio: dateTime(i.createdAt) })],
  ['subscribers', 'Suscriptores', s => ({ correo: s.email, servicios: s.serviceIds.length })],
  ['macros', 'Macros', m => ({ nombre: m.name })]
];
export function render(view, { user }) {
  view.innerHTML = `${pageHead('Datos y respaldo', `Base local en este navegador · ${(new Blob([JSON.stringify(db.export())]).size / 1024).toFixed(0)} KB`)}
    <div class="grid-auto">${COLS.map(([k, l]) => `<div class="card stack"><div class="stat"><span class="label">${l}</span><span class="value">${db.count(k)}</span></div><button class="btn btn-sm" data-csv="${k}">${icon('upload', 14)} Exportar CSV</button></div>`).join('')}</div>
    <section class="card stack"><h3 style="margin:0">Respaldo completo</h3><div><button class="btn" data-json>Descargar JSON</button></div></section>
    <section class="card stack danger-zone"><h3 style="margin:0">Restablecer datos demo</h3><p class="muted" style="margin:0">Vuelve a la semilla original (tickets, artículos, chats, incidentes y ajustes). Tu sesión se mantiene.</p><div><button class="btn btn-danger" data-reset>Restablecer datos demo</button></div></section>`;
  view.querySelectorAll('[data-csv]').forEach(b => b.onclick = () => { const [k, , map] = COLS.find(c => c[0] === b.dataset.csv); exportCSV(`${k}.csv`, db.all(k).map(map)); });
  view.querySelector('[data-json]').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db.export(), null, 2)], { type: 'application/json' })); a.download = 'atiende-respaldo.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Respaldo descargado', 'success'); };
  view.querySelector('[data-reset]').onclick = async () => {
    if (!await confirm('¿Restablecer todos los datos de la demo?', { danger: true, ok: 'Restablecer', title: 'Restablecer datos demo' })) return;
    db.reset(); db.log('datos', 'Restableció los datos demo', user.id); toast('Datos demo restablecidos', 'success');
  };
}
