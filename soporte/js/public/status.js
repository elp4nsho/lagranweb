// Página de estado del servicio (estado.html): estado general, barras de disponibilidad de 90 días
// por servicio, incidentes activos con su bitácora, historial y suscripción a avisos.
import { db } from '../data/db.js';
import { escape, date, dateTime, toast, ago } from '../../../assets/core/ui.js';
import { icon } from '../shared/icons.js';
import { IMPACTS, INC_STATUS } from '../shared/constants.js';
import { isEmail, DAY } from '../shared/util.js';
import { header, footer, wireLayout } from './layout.js';
import { mountChat } from '../shared/chat-widget.js';
import { serviceHealth, LEVEL } from '../shared/health.js';

const root = document.getElementById('site');
if (root) {
  root.innerHTML = `<div data-head></div><main id="main"></main><div data-foot></div>`;
  wireLayout(root);
  mountChat();
  render();
  db.subscribe(ch => { if (ch.type === 'log' || ['tickets', 'notifications', 'chats', 'votes'].includes(ch.col)) return; if (!root.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') render(); });
}

function render() {
  root.querySelector('[data-head]').innerHTML = header('estado');
  root.querySelector('[data-foot]').innerHTML = footer();
  const services = db.all('services');
  const health = services.map(s => ({ s, h: serviceHealth(s.id) }));
  const worst = Math.max(0, ...health.map(x => x.h.level));
  const active = db.query('incidents', i => i.status !== 'resuelto').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const past = db.query('incidents', i => i.status === 'resuelto' && new Date(i.resolvedAt) > Date.now() - 30 * DAY).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = [...new Set(services.map(s => s.group))];
  const main = root.querySelector('#main');
  main.innerHTML = `<section class="section"><div class="container narrow stack status-page">
    <div class="row between"><div><span class="eyebrow">Estado del servicio</span><h1 style="margin:0">Fibra Austral</h1></div><small class="muted">Actualizado ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</small></div>
    <div class="card overall lvl-${LEVEL[worst].cls}" data-anim>${icon(worst ? 'activity' : 'check', 26)}<div><b>${worst ? (worst >= 3 ? 'Hay servicios caídos' : 'Algunos servicios presentan problemas') : 'Todos los sistemas operan con normalidad'}</b><small>${active.length ? `${active.length} incidente${active.length > 1 ? 's' : ''} en curso` : 'Sin incidentes en curso'}</small></div></div>
    ${active.map(i => incidentCard(i, true)).join('')}
    <div class="card stack svc-card">
      ${groups.map(g => `<h3 class="svc-group">${escape(g)}</h3>${health.filter(x => x.s.group === g).map(({ s, h }) => `
        <div class="svc">
          <div class="row between svc-top"><b>${escape(s.name)}</b><span class="svc-state lvl-${LEVEL[h.level].cls}">${icon(h.level ? 'activity' : 'check', 14)} ${LEVEL[h.level].name}</span></div>
          <div class="uptime" role="img" aria-label="Disponibilidad últimos 90 días de ${escape(s.name)}: ${h.uptime.toFixed(2)}%">${h.bars.map(b => `<i class="lvl-${LEVEL[b.level].cls}" title="${date(b.day)}: ${b.list.length ? escape(b.list.join(' · ')) : 'Sin incidentes'}"></i>`).join('')}</div>
          <div class="row between small muted"><span>Hace 90 días</span><span>${h.uptime.toFixed(2)}% disponibilidad</span><span>Hoy</span></div>
        </div>`).join('')}`).join('')}
      <div class="legend small"><span><i class="lvl-ok"></i> Operativo</span><span><i class="lvl-minor"></i> Degradado</span><span><i class="lvl-major"></i> Parcial</span><span><i class="lvl-crit"></i> Caída</span></div>
    </div>
    <div class="card stack">
      <h3 style="margin:0">${icon('bell', 18)} Suscríbete a los avisos</h3>
      <p class="muted small" style="margin:0">Te enviaremos un correo cuando abramos o cerremos un incidente (simulado).</p>
      <form class="row subscribe" data-sub novalidate><input class="input" name="email" type="email" placeholder="tu@correo.cl" aria-label="Correo" required><select class="select" name="svc" aria-label="Servicio"><option value="">Todos los servicios</option>${services.map(s => `<option value="${s.id}">${escape(s.name)}</option>`).join('')}</select><button class="btn btn-primary">Suscribirme</button></form>
    </div>
    <h2 style="margin-bottom:0">Incidentes recientes</h2>
    ${past.map(i => incidentCard(i, false)).join('') || '<p class="muted">Sin incidentes en los últimos 30 días.</p>'}
  </div></section>`;
  main.querySelector('[data-sub]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (!isEmail(f.email.value)) { f.email.classList.add('invalid'); return toast('Ingresa un correo válido', 'warning'); }
    if (db.find('subscribers', s => s.email === f.email.value.trim().toLowerCase())) return toast('Ese correo ya está suscrito', 'info');
    db.insert('subscribers', { email: f.email.value.trim().toLowerCase(), serviceIds: f.svc.value ? [f.svc.value] : db.all('services').map(s => s.id) });
    db.log('estado', `Nueva suscripción a avisos: ${f.email.value.trim()}`);
    toast('¡Listo! Te avisaremos por correo', 'success');
    f.reset();
  });
}

function incidentCard(i, live) {
  const svcs = i.serviceIds.map(id => db.get('services', id)?.name).filter(Boolean).join(', ');
  return `<article class="card incident ${live ? 'live' : ''} imp-${i.impact}" ${live ? 'data-anim' : ''}>
    <div class="row between"><h3 style="margin:0">${escape(i.title)}</h3><span class="badge badge-${live ? IMPACTS[i.impact].badge : 'success'}">${live ? IMPACTS[i.impact].name : 'Resuelto'}</span></div>
    <small class="muted">${escape(svcs)}${i.region ? ` · ${escape(i.region)}` : ''} · ${live ? `desde ${ago(i.createdAt)}` : `${dateTime(i.createdAt)} — duró ${Math.round((new Date(i.resolvedAt) - new Date(i.createdAt)) / 60000)} min`}</small>
    <ol class="inc-updates">${[...i.updates].reverse().slice(0, live ? 10 : 1).map(u => `<li><b>${INC_STATUS[u.status]}</b> <span>${escape(u.body)}</span><small class="muted">${dateTime(u.at)}</small></li>`).join('')}</ol>
  </article>`;
}
