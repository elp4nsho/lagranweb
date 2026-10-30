// Pantalla tipo TV de la sala de espera: llama al siguiente paciente (se actualiza entre pestañas).
import { escape } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { doctor, box, patient, settings, screenName, shortName } from '../shared/domain.js';
import { ymd, fmtDay } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

const tv = document.getElementById('tv');
let lastCallKey = null, audioOk = false;
document.addEventListener('click', () => { audioOk = true; }, { once: true });

function chime() {
  if (!audioOk) return;
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = .1; o.connect(g); g.connect(c.destination); o.start(c.currentTime + i * .35); o.stop(c.currentTime + i * .35 + .3); });
  } catch (e) { /* sin audio */ }
}

function render() {
  const s = settings(), today = ymd();
  const calls = db.query('appointments', a => a.date === today && a.calledAt && ['llamado', 'en_atencion', 'atendida'].includes(a.status) && a.mode !== 'tele').sort((a, b) => b.calledAt.localeCompare(a.calledAt));
  const cur = calls[0];
  const waiting = db.query('appointments', a => a.date === today && a.status === 'en_espera');
  const byDoc = {}; waiting.forEach(a => byDoc[a.doctorId] = (byDoc[a.doctorId] || 0) + 1);
  const key = cur ? cur.id + cur.calledAt : null;
  const isNew = key && key !== lastCallKey && lastCallKey !== null;
  tv.innerHTML = `
    <header class="tv-head">
      <div class="brand"><span class="logo">${icon('heart', 22)}</span><span>${escape(s.name)}<small>Sala de espera · ${escape(fmtDay(today))}</small></span></div>
      <div class="tv-clock" data-clock></div>
    </header>
    <section class="tv-main">
      <div class="card tv-call ${isNew ? 'flash' : ''}" aria-live="assertive">
        ${cur ? `<span class="eyebrow">${cur.status === 'llamado' ? 'Llamando ahora' : 'Último llamado'}</span>
          <div class="who">${escape(screenName(patient(cur.patientId)?.name || ''))}</div>
          <div class="where">${icon('arrow', 40)} ${escape(box(cur.boxId)?.name || 'Box')}</div>
          <div class="muted" style="font-size:clamp(16px,2vw,24px)">${escape(doctor(cur.doctorId)?.name || '')}</div>`
        : `<span class="eyebrow">Bienvenido</span><div class="who" style="font-size:clamp(32px,5vw,64px)">Por favor espere su llamado</div><p class="muted">Su nombre aparecerá en esta pantalla.</p>`}
      </div>
      <div class="stack">
        <div class="card"><h3>Últimos llamados</h3><div class="tv-list">${calls.slice(1, 6).map(a => `<div class="tv-row"><b>${escape(screenName(patient(a.patientId)?.name || ''))}</b><span>${escape(box(a.boxId)?.name || '')}</span></div>`).join('') || '<p class="muted">—</p>'}</div></div>
        <div class="card"><h3>Pacientes en espera</h3><div class="tv-list">${Object.entries(byDoc).slice(0, 6).map(([id, n]) => `<div class="tv-row"><span>${escape(shortName(doctor(id)?.name))}</span><b>${n}</b></div>`).join('') || '<p class="muted">Sin espera</p>'}</div></div>
      </div>
    </section>
    <div class="tv-ticker"><span>${escape(s.announcement || '')} · ${escape(s.hours)} · Reserva tu próxima hora en línea o al ${escape(s.phone)} · Recuerda hacer check-in en recepción al llegar.</span></div>`;
  tick();
  if (isNew) chime();
  lastCallKey = key || '';
}
function tick() { const c = tv.querySelector('[data-clock]'); if (c) c.textContent = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }
render();
setInterval(tick, 5000);
db.subscribe(ch => { if (ch.type !== 'log') render(); });
