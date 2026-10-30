import { escape, money } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { plan, branch, discipline, klass, statusBadge, access, settings } from '../shared/domain.js';
import { pageHead, statCard } from '../shared/shell.js';
import { ymd, addDays, fmtShort, weekStart } from '../shared/dates.js';
import { icon } from '../shared/icons.js';
import { classModal, payModal, challengeScore, daysLeft } from './shared.js';

export function renderHome(v, _, __, { m }) {
  const p = plan(m.planId), a = access(m), today = ymd();
  const visits = db.query('checkins', k => k.memberId === m.id);
  const days = new Set(visits.map(k => k.at.slice(0, 10)));
  let streak = 0; for (let i = 0; i < 60; i++) { const d = addDays(today, -i); if (days.has(d)) streak++; else if (i > 0 && !days.has(d) && !days.has(addDays(d, -1))) break; }
  const week = visits.filter(k => k.at.slice(0, 10) >= weekStart(today)).length;
  const month = visits.filter(k => k.at.slice(0, 7) === today.slice(0, 7)).length;
  const next = db.query('bookings', b => b.memberId === m.id && b.date >= today && ['reservada', 'espera'].includes(b.status)).sort((x, y) => (x.date + klass(x.classId)?.time).localeCompare(y.date + klass(y.classId)?.time)).slice(0, 4);
  const ch = db.query('challenges', c => c.active && c.start <= today && c.end >= today);
  const routine = db.find('routines', r => r.memberId === m.id && r.active);
  v.innerHTML = `${pageHead(`¡Hola, ${m.name.split(' ')[0]}!`, `${escape(p.name)} ${m.billing} · ${escape(p.allBranches ? 'Todas las sedes' : branch(m.branchId)?.name)}`, `<a class="btn btn-primary" href="#/clases">${icon('calendar', 16)} Reservar clase</a><a class="btn" href="#/carnet">${icon('qr', 16)} Carnet</a>`)}
  ${!a.ok ? `<div class="card row between" style="border-color:var(--danger)"><span><b>${escape(a.title)}</b><br><span class="muted small">${escape(a.msg)}</span></span>${m.status !== 'congelado' ? `<button class="btn btn-primary" data-pay>${icon('card', 16)} Pagar ${money(p.monthly)}</button>` : '<a class="btn" href="#/pagos">Gestionar</a>'}</div>` : ''}
  <div class="grid-4">
    <div class="card"><div class="stat"><span class="label">Racha actual</span><span class="streak">${streak} ${icon('fire', 26)}</span><span class="muted small">días con visita</span></div></div>
    ${statCard('Visitas esta semana', week, `<span class="muted small">${month} en el mes</span>`, 'pin')}
    ${statCard('Membresía', statusBadge(m.status), `<span class="muted small">Próximo pago ${escape(m.nextDue)}</span>`, 'card')}
    ${statCard('Clases reservadas', next.length, `<span class="muted small">Plan: ${p.classesPerWeek >= 99 ? 'ilimitadas' : p.classesPerWeek + ' por semana'}</span>`, 'calendar')}
  </div>
  <div class="grid-main">
    <div class="card"><div class="card-title"><h3>Mis próximas clases</h3><a class="small" href="#/clases">Ver horario</a></div>
      ${next.map(b => { const c = klass(b.classId), d = discipline(c.disciplineId); return `<div class="queue-item" style="margin-bottom:8px"><span class="time">${c.time}</span><div class="who"><b>${escape(d.name)}</b><span class="muted small" style="text-transform:capitalize">${escape(fmtShort(b.date))} · ${escape(branch(c.branchId)?.name)}</span></div>${b.status === 'espera' ? '<span class="badge badge-warning">En espera</span>' : '<span class="badge badge-success">Reservada</span>'}<button class="btn btn-sm" data-cls="${c.id}" data-date="${b.date}">Ver</button></div>`; }).join('') || `<div class="empty">No tienes clases reservadas. <a href="#/clases">¡Reserva una!</a></div>`}</div>
    <div class="stack">
      ${routine ? `<div class="card"><h3>${icon('dumbbell', 18)} ${escape(routine.name)}</h3><p class="muted small">${routine.days.length} días · asignada por tu entrenador</p><a class="btn btn-primary btn-sm" href="#/rutina">Entrenar hoy</a></div>` : ''}
      ${ch.map(c => { const s = challengeScore(c, m.id); return `<div class="card"><div class="card-title"><h3>${icon('trophy', 18)} ${escape(c.name)}</h3><span class="badge">${daysLeft(c.end)} días</span></div><div class="row between small"><span>${s} / ${c.goal}</span><span>${Math.min(100, Math.round(s / c.goal * 100))}%</span></div><div class="progress" style="margin-top:6px"><i style="--v:${Math.min(100, s / c.goal * 100)}%"></i></div></div>`; }).join('')}
    </div>
  </div>`;
  v.querySelector('[data-pay]')?.addEventListener('click', () => payModal(m));
  v.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => classModal(m, b.dataset.cls, b.dataset.date));
}
