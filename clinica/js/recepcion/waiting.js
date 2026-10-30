import { escape, toast, time as fmtTime, ago } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { doctor, patient, setStatus, box, screenName } from '../shared/domain.js';
import { pageHead } from '../shared/shell.js';
import { ymd } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

export function renderWaiting(v) {
  const today = ymd();
  const waiting = db.query('appointments', a => a.date === today && a.status === 'en_espera').sort((a, b) => (a.checkinAt || '').localeCompare(b.checkinAt || ''));
  const calls = db.query('appointments', a => a.date === today && a.calledAt).sort((a, b) => b.calledAt.localeCompare(a.calledAt)).slice(0, 6);
  const byDoc = {}; waiting.forEach(a => (byDoc[a.doctorId] ||= []).push(a));
  const mins = a => Math.max(0, Math.round((Date.now() - new Date(a.checkinAt)) / 60000));
  v.innerHTML = `${pageHead('Sala de espera', `${waiting.length} pacientes esperando · espera promedio ${waiting.length ? Math.round(waiting.reduce((s, a) => s + mins(a), 0) / waiting.length) : 0} min`, `<a class="btn btn-primary" href="pantalla.html" target="_blank">${icon('tv', 16)} Abrir pantalla TV</a>`)}
  <div class="grid-main">
    <div class="grid-2" style="align-content:start">${Object.entries(byDoc).map(([id, l]) => { const d = doctor(id); return `<div class="card"><div class="card-title"><h3>${escape(d.name)}</h3><span class="badge">${escape(box(d.boxId)?.name || '')}</span></div>
      ${l.map((a, i) => `<div class="row between" style="margin-bottom:8px;flex-wrap:nowrap"><span><b>${i + 1}. ${escape(patient(a.patientId)?.name)}</b><br><small class="muted">Cita ${a.time} · llegó ${fmtTime(a.checkinAt)} · <b class="${mins(a) > 20 ? '' : ''}">${mins(a)} min</b></small></span><button class="btn btn-sm" data-call="${a.id}">${icon('megaphone', 14)} Llamar</button></div>`).join('')}</div>`; }).join('') || '<div class="card empty" style="grid-column:1/-1">Sala vacía, no hay pacientes esperando.</div>'}</div>
    <div class="card"><h3>Últimos llamados</h3>${calls.map(a => `<div class="row between" style="margin-bottom:10px;flex-wrap:nowrap"><span><b>${escape(screenName(patient(a.patientId)?.name || ''))}</b> → ${escape(box(a.boxId)?.name || '')}<br><small class="muted">${escape(doctor(a.doctorId)?.name)} · ${ago(a.calledAt)}</small></span>${a.status === 'llamado' ? `<button class="btn btn-sm btn-ghost" data-recall="${a.id}">Repetir</button>` : ''}</div>`).join('') || '<p class="muted">Sin llamados aún.</p>'}</div>
  </div>`;
  v.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { const a = db.get('appointments', b.dataset.call); setStatus(a, 'llamado'); toast(`Llamando a ${patient(a.patientId).name}`, 'success'); });
  v.querySelectorAll('[data-recall]').forEach(b => b.onclick = () => { db.update('appointments', b.dataset.recall, { calledAt: new Date().toISOString() }); toast('Llamado repetido en pantalla', 'info'); });
}
