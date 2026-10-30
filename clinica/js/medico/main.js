// App del médico: agenda del día y semana, cola de pacientes, ficha clínica, recetas y bloqueos.
import { createRouter } from '../../../assets/core/router.js';
import { escape } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { renderToday } from './today.js';
import { renderWeek } from './week.js';
import { renderRecord } from './record.js';
import { renderMyPatients } from './patients.js';
import { renderBlocks } from './blocks.js';

let user;
try { user = auth.require(['medico', 'admin']); } catch (e) { /* redirige */ }

if (user) {
  // El admin puede ver la agenda de cualquier profesional
  const KEY = 'clinica:medico-view';
  let docId = user.role === 'medico' ? user.doctorId : (sessionStorage.getItem(KEY) || 'd1');
  const ctx = { get doc() { return db.get('doctors', docId); }, user };
  const docs = db.all('doctors');
  const shell = mountShell({
    brand: 'Alerce', sub: 'App médico', logo: 'steth', user, auth, db,
    nav: [
      { section: 'Mi consulta' },
      { href: '#/', label: 'Hoy', ico: 'clock', count: () => db.count('appointments', a => a.doctorId === docId && a.date === ymd() && a.status === 'en_espera') },
      { href: '#/semana', label: 'Agenda semanal', ico: 'calendar' },
      { href: '#/pacientes', label: 'Mis pacientes', ico: 'users' },
      { href: '#/bloqueos', label: 'Bloquear horario', ico: 'lock' }
    ],
    topExtra: user.role === 'admin' ? `<select class="select" data-doc style="width:auto;min-height:34px;padding-top:4px;padding-bottom:4px" aria-label="Ver agenda de">${docs.map(d => `<option value="${d.id}" ${d.id === docId ? 'selected' : ''}>${escape(d.name)}</option>`).join('')}</select><a class="btn btn-sm hide-sm" href="admin.html">Admin</a>` : `<a class="btn btn-sm hide-sm" href="pantalla.html" target="_blank">Pantalla</a>`
  });
  document.querySelector('[data-doc]')?.addEventListener('change', e => { docId = e.target.value; sessionStorage.setItem(KEY, docId); shell.refreshCounts(); router.refresh(); });
  const v = shell.view;
  const page = (title, fn) => (params, query) => { shell.crumb(title); return fn(v, params, query, ctx); };
  const router = createRouter({
    '/': page('Hoy', renderToday),
    '/semana': page('Agenda semanal', renderWeek),
    '/atencion/:id': page('Atención', renderRecord),
    '/pacientes': page('Mis pacientes', renderMyPatients),
    '/bloqueos': page('Bloquear horario', renderBlocks)
  }, { after: () => router.highlight(document.querySelector('.admin-sidebar')), notFound: () => { v.innerHTML = '<div class="card empty">Sección no encontrada</div>'; } });
  if (!ctx.doc) { shell.view.innerHTML = '<div class="card empty"><h2>Tu usuario no está vinculado a un profesional</h2><p>Pide al administrador que lo vincule en Usuarios.</p></div>'; }
  else router.start();
  let t;
  db.subscribe(ch => {
    if (ch.type === 'log') return;
    if (location.hash.startsWith('#/atencion')) return; // la ficha se actualiza sola (chat)
    clearTimeout(t);
    t = setTimeout(() => { const ae = document.activeElement; if (document.querySelector('.modal-backdrop') || (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) return; router.refresh(); }, 150);
  });
}
