// App de corredores: mi cartera, bandeja de leads, agenda de visitas y notas CRM.
import { toast, escape } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { mountShell } from '../shared/kit.js';
import { renderVisitsView } from '../shared/visitcal.js';
import { renderSummary } from './summary.js';
import { renderListings } from './listings.js';
import { renderInbox } from './inbox.js';
import { renderNotes } from './notes.js';

let user;
try { user = auth.require(['corredor', 'admin'], 'login.html'); } catch (e) { /* redirigiendo */ }

if (user) {
  // El corredor se vincula por userId; un admin puede "ver como" cualquier corredor.
  let agent = db.find('agents', a => a.userId === user.id);
  if (!agent && user.role === 'admin') {
    const pick = sessionStorage.getItem('hap:viewAs');
    agent = db.get('agents', pick) || db.all('agents')[0];
  }
  if (!agent) {
    document.getElementById('app').innerHTML = `<div class="login-wrap"><div class="card empty"><h2>Tu usuario no está vinculado a un corredor</h2><p>Pide a un administrador que te asigne en «Corredores y oficinas».</p><a class="btn" href="login.html">Volver</a></div></div>`;
  } else {
    const A = { agent };
    const viewAs = user.role === 'admin' ? `<label class="field"><span class="label">Ver como corredor</span><select class="select select-sm" data-viewas>${db.all('agents').map(a => `<option value="${a.id}" ${a.id === agent.id ? 'selected' : ''}>${escape(a.name)}</option>`).join('')}</select></label><a class="btn btn-sm btn-block" href="admin.html">Ir al panel admin</a>` : '';
    const mine = l => l.agentId === agent.id;
    mountShell({
      auth, db, user, brand: 'Hogar Austral', logo: 'H', subtitle: 'App corredores',
      links: viewAs + '<a class="btn btn-sm btn-block btn-ghost" href="index.html" target="_blank" rel="noopener">Ver sitio público ↗</a>',
      sections: [
        { id: 'resumen', label: 'Mi día', ico: '☀️', render: (el, p, q, ctx) => renderSummary(el, ctx, A) },
        { id: 'propiedades', label: 'Mis propiedades', ico: '🏠', render: (el, p, q, ctx) => renderListings(el, p, ctx, A), count: () => db.count('properties', x => x.agentId === agent.id && x.status === 'borrador') },
        { id: 'leads', label: 'Bandeja de leads', ico: '📥', render: (el, p, q, ctx) => renderInbox(el, p, q, ctx, A), count: () => db.count('leads', l => mine(l) && l.status === 'nuevo') },
        { id: 'visitas', label: 'Agenda de visitas', ico: '📅', render: (el, p, q, ctx) => renderVisitsView(el, ctx, { agentId: agent.id, title: 'Agenda de visitas' }), count: () => db.count('visits', v => v.agentId === agent.id && v.status === 'pendiente') },
        { id: 'notas', label: 'Notas CRM', ico: '📝', render: (el, p, q, ctx) => renderNotes(el, ctx, A) }
      ]
    });
    document.querySelector('[data-viewas]')?.addEventListener('change', e => { sessionStorage.setItem('hap:viewAs', e.target.value); toast('Cambiando de corredor…', 'info'); location.reload(); });
  }
}
