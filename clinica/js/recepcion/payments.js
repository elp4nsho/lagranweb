import { escape, money, dateTime, downloadCSV, toast } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { doctor, patient, specialty, prevision } from '../shared/domain.js';
import { payModal } from '../shared/appt-ui.js';
import { pageHead, statCard } from '../shared/shell.js';
import { donut } from '../shared/charts.js';
import { listView } from '../shared/crud.js';
import { ymd, fmtDay } from '../shared/dates.js';
import { icon } from '../shared/icons.js';

const paidDay = a => ymd(new Date(a.paidAt || a.checkinAt || a.date + 'T12:00'));
export function renderPayments(v) {
  const today = ymd();
  const paid = db.query('appointments', a => a.paid && paidDay(a) === today);
  const pending = db.query('appointments', a => a.date === today && !a.paid && ['en_espera', 'llamado', 'en_atencion', 'atendida'].includes(a.status));
  const byMethod = {}; paid.forEach(a => byMethod[a.payMethod || 'Otro'] = (byMethod[a.payMethod || 'Otro'] || 0) + a.price);
  const total = paid.reduce((s, a) => s + a.price, 0);
  const bonos = paid.filter(a => /Bono/.test(a.payMethod || '')).length;
  v.innerHTML = `${pageHead('Caja: pagos y bonos', `<span style="text-transform:capitalize">${escape(fmtDay(today))}</span>`, `<button class="btn btn-primary" data-cierre>${icon('download', 16)} Cierre de caja (CSV)</button>`)}
  <div class="grid-4">${statCard('Recaudado hoy', money(total), '', 'money')}${statCard('Pagos', paid.length, '', 'check')}${statCard('Bonos emitidos', bonos, '<span class="muted small">Fonasa e Isapre</span>', 'card')}${statCard('Pendientes de cobro', pending.length, pending.length ? `<span class="delta down">${money(pending.reduce((s, a) => s + a.price, 0))}</span>` : '', 'clock')}</div>
  <div class="grid-main">
    <div class="card"><div class="card-title"><h3>Pendientes de cobro</h3></div>
      ${pending.map(a => `<div class="queue-item" style="margin-bottom:8px"><span class="time">${a.time}</span><div class="who"><b>${escape(patient(a.patientId)?.name)}</b><span class="muted small">${escape(doctor(a.doctorId)?.name)} · ${escape(prevision(a.prevision).label)}</span></div><b>${money(a.price)}</b><button class="btn btn-sm btn-accent" data-pay="${a.id}">${icon('money', 14)} Cobrar</button></div>`).join('') || '<div class="empty">Todo cobrado.</div>'}</div>
    <div class="card"><h3>Por medio de pago</h3>${paid.length ? donut(Object.entries(byMethod).map(([label, value]) => ({ label, value })), { format: money, center: paid.length + ' pagos' }) : '<p class="muted">Aún no hay pagos hoy.</p>'}</div>
  </div>
  <div class="card"><h3>Pagos de hoy</h3><div data-list></div></div>`;
  v.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => payModal(db.get('appointments', b.dataset.pay)));
  const rows = () => paid.map(a => ({ ...a, pname: patient(a.patientId)?.name, dname: doctor(a.doctorId)?.name, at: a.paidAt || a.checkinAt || a.date }));
  listView(v.querySelector('[data-list]'), {
    rows, search: r => `${r.pname} ${r.code} ${r.folio || ''}`,
    filters: [{ key: 'payMethod', label: 'Medio', options: Object.keys(byMethod) }],
    columns: [{ key: 'at', label: 'Hora', render: r => `<small>${escape(dateTime(r.at))}</small>` }, { key: 'code', label: 'Cita', render: r => `<span class="mono">${r.code}</span>` }, { key: 'pname', label: 'Paciente' }, { key: 'dname', label: 'Profesional' }, { key: 'payMethod', label: 'Medio' }, { key: 'folio', label: 'Folio', render: r => `<small class="mono">${escape(r.folio || '—')}</small>` }, { key: 'price', label: 'Monto', render: r => `<b>${money(r.price)}</b>` }],
    csv: { name: `pagos-${today}.csv`, map: r => ({ hora: r.at, cita: r.code, paciente: r.pname, profesional: r.dname, medio: r.payMethod, folio: r.folio || '', monto: r.price }) }
  });
  v.querySelector('[data-cierre]').onclick = () => {
    const data = [...Object.entries(byMethod).map(([m, s]) => ({ medio: m, pagos: paid.filter(a => a.payMethod === m).length, total: s })), { medio: 'TOTAL', pagos: paid.length, total }];
    downloadCSV(`cierre-caja-${today}.csv`, data); db.log('caja', `Cierre de caja ${today}: ${money(total)}`); toast('Cierre de caja descargado', 'success');
  };
}
