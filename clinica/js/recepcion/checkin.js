import { escape, money, toast, norm, time as fmtTime } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { STATUS } from '../data/catalog.js';
import { doctor, patient, specialty, statusBadge, setStatus, prevision, box } from '../shared/domain.js';
import { openAppt, payModal, newApptModal } from '../shared/appt-ui.js';
import { pageHead, statCard } from '../shared/shell.js';
import { ymd, fmtDay, toMin, nowHM } from '../shared/dates.js';
import { cleanRut } from '../shared/rut.js';
import { icon } from '../shared/icons.js';

const st = { q: '', doc: '', status: 'pendientes' };
export function renderCheckin(v) {
  const today = ymd();
  const all = db.query('appointments', a => a.date === today && a.status !== 'cancelada').sort((a, b) => a.time.localeCompare(b.time));
  const pend = all.filter(a => ['reservada', 'confirmada'].includes(a.status));
  const late = pend.filter(a => toMin(a.time) < toMin(nowHM()) - 15 && a.mode !== 'tele');
  v.innerHTML = `${pageHead('Check-in de hoy', `<span style="text-transform:capitalize">${escape(fmtDay(today))}</span> · busca por RUT, nombre o código`, `<button class="btn" data-walk>${icon('plus', 16)} Sobrecupo / agendar</button><a class="btn btn-primary" href="pantalla.html" target="_blank">${icon('tv', 16)} Pantalla</a>`)}
  <div class="grid-4">${statCard('Por llegar', pend.filter(a => a.mode !== 'tele').length, late.length ? `<span class="delta down">${late.length} atrasados +15 min</span>` : '', 'clock')}${statCard('En sala', all.filter(a => a.status === 'en_espera').length, '', 'users')}${statCard('En atención', all.filter(a => ['llamado', 'en_atencion'].includes(a.status)).length, '', 'steth')}${statCard('Atendidos', all.filter(a => a.status === 'atendida').length, '', 'check')}</div>
  <div class="card">
    <div class="list-toolbar">
      <label class="search-box">${icon('search', 16)}<input class="input" type="search" data-q placeholder="RUT, nombre o código…" value="${escape(st.q)}" aria-label="Buscar paciente" autofocus></label>
      <select class="select" data-doc aria-label="Profesional"><option value="">Todos los profesionales</option>${db.all('doctors').filter(d => all.some(a => a.doctorId === d.id)).map(d => `<option value="${d.id}" ${st.doc === d.id ? 'selected' : ''}>${escape(d.name)}</option>`).join('')}</select>
      <select class="select" data-st aria-label="Estado"><option value="pendientes" ${st.status === 'pendientes' ? 'selected' : ''}>Por llegar</option><option value="" ${!st.status ? 'selected' : ''}>Todos</option>${Object.entries(STATUS).filter(([k]) => k !== 'cancelada').map(([k, s]) => `<option value="${k}" ${st.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
    </div>
    <div class="stack" style="gap:8px" data-list></div>
  </div>`;
  const list = v.querySelector('[data-list]');
  const draw = () => {
    const q = norm(st.q), qr = cleanRut(st.q);
    const rows = all.filter(a => {
      const p = patient(a.patientId);
      if (st.doc && a.doctorId !== st.doc) return false;
      if (st.status === 'pendientes' ? !['reservada', 'confirmada'].includes(a.status) : st.status && a.status !== st.status) return false;
      return !q || norm(p?.name).includes(q) || norm(a.code).includes(q) || (qr.length > 3 && cleanRut(p?.rut).includes(qr));
    });
    list.innerHTML = rows.map(a => { const p = patient(a.patientId), d = doctor(a.doctorId); const isLate = late.includes(a); return `<div class="queue-item">
      <span class="time">${a.time}</span>
      <div class="who"><b>${escape(p?.name)}</b><span class="muted small">${escape(p?.rut)} · ${escape(prevision(a.prevision).label)} · <span class="mono">${a.code}</span></span>
        <span class="small">${escape(d?.name)} · ${escape(specialty(a.specialtyId)?.name)} · ${a.mode === 'tele' ? 'Telemedicina' : escape(box(d?.boxId)?.name || '')}</span></div>
      <div class="tag-list">${statusBadge(a.status)}${isLate ? '<span class="badge badge-danger">Atrasado</span>' : ''}${a.paid ? '<span class="badge badge-success">Pagado</span>' : `<span class="badge badge-warning">${money(a.price)}</span>`}${a.checkinAt ? `<span class="badge plain">Llegó ${fmtTime(a.checkinAt)}</span>` : ''}</div>
      <div class="acts-cell">
        ${['reservada', 'confirmada'].includes(a.status) && a.mode !== 'tele' ? `<button class="btn btn-sm btn-primary" data-in="${a.id}">${icon('pin', 14)} Check-in</button>` : ''}
        ${!a.paid ? `<button class="btn btn-sm btn-accent" data-pay="${a.id}">${icon('money', 14)} Cobrar</button>` : ''}
        ${a.status === 'en_espera' ? `<button class="btn btn-sm" data-call="${a.id}">${icon('megaphone', 14)} Llamar</button>` : ''}
        <button class="btn btn-sm btn-ghost btn-icon" data-open="${a.id}" aria-label="Detalle">${icon('eye', 16)}</button>
      </div></div>`; }).join('') || `<div class="empty">${st.q ? 'No hay citas hoy que coincidan. ¿Agendar sobrecupo?' : 'Sin pacientes en esta vista.'}</div>`;
    list.querySelectorAll('[data-in]').forEach(b => b.onclick = () => { const a = db.get('appointments', b.dataset.in); setStatus(a, 'en_espera'); toast(`Check-in: ${patient(a.patientId).name}`, 'success'); if (!a.paid) payModal(db.get('appointments', a.id)); });
    list.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => payModal(db.get('appointments', b.dataset.pay)));
    list.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { const a = db.get('appointments', b.dataset.call); setStatus(a, 'llamado'); toast(`Llamando a ${patient(a.patientId).name}`, 'success'); });
    list.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openAppt(b.dataset.open));
  };
  draw();
  v.querySelector('[data-q]').addEventListener('input', e => { st.q = e.target.value; if (st.q && st.status === 'pendientes') { st.status = ''; v.querySelector('[data-st]').value = ''; } draw(); });
  v.querySelector('[data-doc]').onchange = e => { st.doc = e.target.value; draw(); };
  v.querySelector('[data-st]').onchange = e => { st.status = e.target.value; draw(); };
  v.querySelector('[data-walk]').onclick = () => newApptModal({ walkIn: true });
}
