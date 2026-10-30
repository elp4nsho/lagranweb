// "Mi día" del corredor: KPIs propios, próximas visitas, leads nuevos y alertas.
import { escape, time, date, ago, pct, lineChart } from '../../../assets/core/ui.js';
import { LSTATUS, VSTATUS, badge } from '../shared/format.js';
import { pageHead, kpi } from '../shared/kit.js';
import { weekBuckets } from '../admin/dashboard.js';

export function renderSummary(el, { db, user }, { agent }) {
  const leads = db.query('leads', l => l.agentId === agent.id), visits = db.query('visits', v => v.agentId === agent.id);
  const props = db.query('properties', p => p.agentId === agent.id);
  const upcoming = visits.filter(v => new Date(v.date) > new Date() && v.status !== 'cancelada').sort((a, b) => a.date.localeCompare(b.date));
  const closed = leads.filter(l => ['ganado', 'perdido'].includes(l.status)), won = leads.filter(l => l.status === 'ganado').length;
  const notifs = db.query('notifications', n => n.userId === (agent.userId || user.id)).slice(0, 6);
  const weeks = weekBuckets(10).map(w => ({ label: w.label, value: leads.filter(l => { const t = new Date(l.createdAt); return t >= w.s && t < w.e; }).length }));
  el.innerHTML = `${pageHead(`Hola, ${agent.name.split(' ')[0]}`, `${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}${user.role === 'admin' ? ' · vista de administrador' : ''}`, '<a class="btn btn-primary" href="#/propiedades?new=1">+ Captar propiedad</a>')}
    <div class="kpis">${kpi('Cartera activa', props.filter(p => ['publicada', 'reservada'].includes(p.status)).length, `${props.filter(p => p.status === 'revision').length} en revisión`)}${kpi('Leads nuevos', leads.filter(l => l.status === 'nuevo').length, 'por contactar', false)}${kpi('Visitas esta semana', upcoming.filter(v => new Date(v.date) - Date.now() < 7 * 864e5).length)}${kpi('Conversión', pct(closed.length ? won / closed.length * 100 : 0, 1), `${won} cierres`)}</div>
    <div class="split">
      <div class="card"><div class="row between"><h3 style="margin:0">Próximas visitas</h3><a class="btn btn-sm" href="#/visitas">Agenda</a></div>
        ${upcoming.slice(0, 6).map(v => { const p = db.get('properties', v.propertyId); return `<div class="list-row"><div><b>${date(v.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${time(v.date)}</b><div class="muted small">${escape(v.clientName)} · ${escape(p?.code || '')} ${escape(p?.address || '')}</div></div>${badge(VSTATUS, v.status)}</div>`; }).join('') || '<p class="muted">Sin visitas próximas.</p>'}</div>
      <div class="card"><h3>Leads por semana</h3>${lineChart(weeks, { height: 150 })}</div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="row between"><h3 style="margin:0">Leads por contactar</h3><a class="btn btn-sm" href="#/leads">Bandeja</a></div>
        ${leads.filter(l => l.status === 'nuevo').slice(0, 6).map(l => `<a class="list-row" href="#/leads/${l.id}" style="color:var(--text);text-decoration:none"><span><b>${escape(l.name)}</b><span class="muted small"> · ${ago(l.createdAt)}</span><br><span class="small muted">${escape(l.message.slice(0, 70))}</span></span>${badge(LSTATUS, l.status)}</a>`).join('') || '<p class="muted">¡Bandeja al día!</p>'}</div>
      <div class="card"><h3>Notificaciones</h3>${notifs.map(n => `<div class="list-row small"><span>${escape(n.text)}</span><span class="muted nowrap">${ago(n.createdAt)}</span></div>`).join('') || '<p class="muted">Sin notificaciones.</p>'}</div>
    </div>`;
}
