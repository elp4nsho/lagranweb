import { escape, toast, dateTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView } from '../shared/crud.js';
import { patient, notify, settings, fill, isActive } from '../shared/domain.js';
import { ymd, addDays } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

const ST = { enviado: 'success', programado: 'info', fallido: 'danger' };
export function renderReminders(v) {
  const all = db.all('reminders');
  const s = settings();
  const sample = db.find('appointments', a => a.date > ymd() && isActive(a));
  v.innerHTML = `${pageHead('Recordatorios', 'Registro simulado de SMS y correos enviados a pacientes.', `<button class="btn" data-retry>${icon('refresh', 16)} Reintentar fallidos</button><button class="btn btn-primary" data-send>${icon('bell', 16)} Enviar recordatorios de mañana</button>`)}
  <div class="grid-4">${statCard('Enviados', all.filter(r => r.status === 'enviado').length, '', 'check')}${statCard('Programados', all.filter(r => r.status === 'programado').length, '', 'clock')}${statCard('Fallidos', all.filter(r => r.status === 'fallido').length, '', 'x')}${statCard('SMS / correo', `${all.filter(r => r.channel === 'sms').length} / ${all.filter(r => r.channel === 'email').length}`, '', 'mail')}</div>
  <div class="grid-main">
    <div class="card" data-list></div>
    <form class="card stack" data-tpl><h3 class="mb0">Plantilla de recordatorio</h3>
      <textarea class="textarea" name="tpl">${escape(s.reminderTemplate)}</textarea>
      <small class="muted">Variables: {paciente} {medico} {fecha} {hora} {codigo}</small>
      <div class="card" style="box-shadow:none"><small class="muted">Vista previa</small><p class="mb0 small" data-prev>${escape(sample ? fill(s.reminderTemplate, sample) : '')}</p></div>
      <button class="btn btn-primary">Guardar plantilla</button></form>
  </div>`;
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('reminders').map(r => ({ ...r, pname: patient(r.patientId)?.name || '—' })).sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    search: r => `${r.pname} ${r.to} ${r.message}`, pageSize: 10,
    filters: [{ key: 'channel', label: 'Canal', options: [['sms', 'SMS'], ['email', 'Correo']] }, { key: 'status', label: 'Estado', options: Object.keys(ST) }, { key: 'kind', label: 'Tipo', options: [['recordatorio', 'Recordatorio'], ['confirmacion', 'Confirmación'], ['cancelacion', 'Cancelación']] }],
    columns: [
      { key: 'sentAt', label: 'Fecha', render: r => `<small class="nowrap">${escape(dateTime(r.sentAt))}</small>` },
      { key: 'channel', label: 'Canal', render: r => `${icon(r.channel === 'sms' ? 'phone' : 'mail', 16)} ${r.channel === 'sms' ? 'SMS' : 'Correo'}` },
      { key: 'pname', label: 'Paciente', render: r => `<b>${escape(r.pname)}</b><br><small class="muted">${escape(r.to || '')}</small>` },
      { key: 'message', label: 'Mensaje', sort: false, render: r => `<small>${escape(r.message)}</small>` },
      { key: 'status', label: 'Estado', render: r => `<span class="badge badge-${ST[r.status]}">${escape(r.status)}</span>` }
    ],
    csv: { name: 'recordatorios.csv', map: r => ({ fecha: r.sentAt, canal: r.channel, tipo: r.kind, paciente: r.pname, destino: r.to, mensaje: r.message, estado: r.status }) }
  });
  v.querySelector('[data-send]').onclick = () => {
    const tm = addDays(ymd(), 1);
    const list = db.query('appointments', a => a.date === tm && isActive(a));
    let fail = 0;
    list.forEach(a => { const bad = Math.random() < .05; if (bad) fail++; notify(a, 'sms', 'recordatorio', bad ? 'fallido' : 'enviado'); });
    db.log('recordatorios', `Enviados ${list.length} SMS para mañana (${fail} fallidos)`, auth.current()?.id);
    toast(`${list.length} recordatorios enviados${fail ? ` · ${fail} fallidos` : ''}`, fail ? 'warning' : 'success');
  };
  v.querySelector('[data-retry]').onclick = () => {
    const f = db.query('reminders', r => r.status === 'fallido');
    f.forEach(r => db.update('reminders', r.id, { status: 'enviado', sentAt: new Date().toISOString() }));
    toast(f.length ? `${f.length} reenviados correctamente` : 'No hay fallidos', f.length ? 'success' : 'info');
  };
  const tf = v.querySelector('[data-tpl]');
  tf.tpl.addEventListener('input', () => { v.querySelector('[data-prev]').textContent = sample ? fill(tf.tpl.value, sample) : ''; });
  tf.onsubmit = e => { e.preventDefault(); db.setValue('settings', { ...settings(), reminderTemplate: tf.tpl.value }); db.log('config', 'Plantilla de recordatorio actualizada', auth.current()?.id); toast('Plantilla guardada', 'success'); };
}
