// Cola de revisión KYC: aprobar o rechazar solicitudes de apertura de cuenta.
import { db, userName } from '../data/db.js';
import { money, date, ago, toast, modal, escape } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { badge, notify } from '../shared/bank.js';
import { pageHead, table, csv } from './kit.js';

const st = { tab: 'pendiente' };

export function render(el, { user, canWrite }) {
  const all = db.query('users', u => u.role === 'cliente' && u.kycData);
  const rows = all.filter(u => st.tab === 'todas' ? true : u.kyc === st.tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const counts = { pendiente: all.filter(u => u.kyc === 'pendiente').length, aprobado: all.filter(u => u.kyc === 'aprobado').length, rechazado: all.filter(u => u.kyc === 'rechazado').length };
  el.innerHTML = pageHead('Revisión KYC', 'Valida la identidad de quienes abrieron cuenta online.', '<button class="btn btn-sm" data-csv>⬇ CSV</button>', !canWrite) +
    h`<div class="tabs">${[['pendiente', `Pendientes (${counts.pendiente})`], ['aprobado', `Aprobadas (${counts.aprobado})`], ['rechazado', `Rechazadas (${counts.rechazado})`], ['todas', 'Todas']].map(([k, l]) => h`<button class="tab ${st.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`)}</div><div data-t></div>`;
  table(el.querySelector('[data-t]'), {
    rows,
    search: u => `${u.name} ${u.rut} ${u.email} ${u.comuna}`,
    columns: [
      { key: 'name', label: 'Solicitante', render: u => h`<b>${u.name}</b><br><span class="small muted">${u.rut} · ${u.email}</span>` },
      { key: 'createdAt', label: 'Enviada', render: u => ago(u.createdAt) },
      { key: 'match', label: 'Coincidencia facial', sort: false, render: u => raw(`<span class="badge badge-${u.kycData.selfieMatch >= 85 ? 'success' : u.kycData.selfieMatch >= 70 ? 'warning' : 'danger'}">${u.kycData.selfieMatch}%</span>`) },
      { key: 'flags', label: 'Alertas', sort: false, render: u => raw([u.kycData.pep ? '<span class="badge badge-warning">PEP</span>' : '', u.kycData.listas !== 'Sin coincidencias' ? '<span class="badge badge-danger">Listas</span>' : '', !u.kycData.docValid ? '<span class="badge badge-danger">Documento</span>' : ''].join(' ') || '<span class="muted small">Ninguna</span>') },
      { key: 'kyc', label: 'Estado', render: u => raw(badge(u.kyc)) },
      { key: 'act', label: '', sort: false, render: u => raw(`<button class="btn btn-sm ${u.kyc === 'pendiente' && canWrite ? 'btn-primary' : ''}" data-review="${u.id}">${u.kyc === 'pendiente' && canWrite ? 'Revisar' : 'Ver'}</button>`) },
    ],
    onRow: u => review(u.id, user, canWrite),
  });
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; render(el, { user, canWrite }); });
  el.querySelector('[data-t]').addEventListener('click', e => { const b = e.target.closest('[data-review]'); if (b) review(b.dataset.review, user, canWrite); });
  el.querySelector('[data-csv]').onclick = () => csv('kyc-condor.csv', rows.map(u => ({ nombre: u.name, rut: u.rut, correo: u.email, enviada: date(u.createdAt), coincidencia: u.kycData.selfieMatch, pep: u.kycData.pep ? 'sí' : 'no', listas: u.kycData.listas, estado: u.kyc })));
}

function review(id, staff, canWrite) {
  const u = db.get('users', id), k = u.kycData;
  const chk = (ok, label) => `<li><span class="st">${ok ? '<span class="badge badge-success plain">✓</span>' : '<span class="badge badge-danger plain">!</span>'}</span><span>${escape(label)}</span></li>`;
  const m = modal({
    title: `Solicitud de ${u.name}`, size: 'lg',
    body: h`<div class="grid-2" style="align-items:start">
      <div class="stack">
        <dl class="kv"><dt>RUT</dt><dd>${u.rut}</dd><dt>Correo</dt><dd>${u.email}</dd><dt>Celular</dt><dd>${u.phone}</dd><dt>Nacimiento</dt><dd>${u.birth}</dd><dt>Dirección</dt><dd>${k.address}, ${u.comuna}</dd><dt>Ocupación</dt><dd>${u.job}</dd><dt>Renta declarada</dt><dd>${money(u.income)}</dd><dt>Enviada</dt><dd>${date(k.submittedAt)}</dd><dt>Estado</dt><dd>${raw(badge(u.kyc))}</dd></dl>
        ${u.kycReason ? raw(`<div class="notice danger small">Motivo de rechazo: ${escape(u.kycReason)}</div>`) : ''}
        ${u.kycReviewer ? raw(`<p class="small muted">Revisado por ${escape(userName(u.kycReviewer))} ${u.kycAt ? '· ' + ago(u.kycAt) : ''}</p>`) : ''}
      </div>
      <div class="stack">
        <div class="grid-2"><div class="camera captured" style="aspect-ratio:3/4"><div class="face" style="width:70%">🙂</div></div><div class="camera captured" style="aspect-ratio:3/4"><div style="font-size:52px">🪪</div></div></div>
        <ul class="checklist">${raw(chk(k.selfieMatch >= 75, `Coincidencia selfie/carnet: ${k.selfieMatch}%`) + chk(k.docValid, k.docValid ? 'Documento vigente y legible' : 'Documento con observaciones') + chk(!k.pep, k.pep ? 'Declara ser PEP: requiere debida diligencia reforzada' : 'No es PEP') + chk(k.listas === 'Sin coincidencias', `Listas restrictivas: ${k.listas}`))}</ul>
      </div></div>
      ${canWrite && u.kyc === 'pendiente' ? raw('<div class="field mt"><label for="kr">Comentario / motivo (obligatorio para rechazar)</label><textarea class="textarea" id="kr" style="min-height:70px"></textarea></div>') : ''}`,
    foot: canWrite && u.kyc === 'pendiente' ? '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-danger" data-reject>Rechazar</button><button class="btn btn-primary" data-approve>Aprobar y activar cuenta</button>' : '<button class="btn" data-close>Cerrar</button>',
  });
  m.el.querySelector('[data-approve]')?.addEventListener('click', () => {
    m.close();
    db.update('users', id, { kyc: 'aprobado', kycReviewer: staff.id, kycAt: new Date().toISOString(), kycReason: '' });
    db.query('accounts', a => a.userId === id).forEach(a => db.update('accounts', a.id, { status: 'activa' }));
    db.query('cards', c => c.userId === id && c.status === 'inactiva').forEach(c => db.update('cards', c.id, { status: 'activa' }));
    notify(id, '¡Tu cuenta está activa!', 'Validamos tu identidad. Ya puedes transferir, pagar y usar tu tarjeta virtual.', 'info');
    db.log('kyc', `${staff.name} aprobó la apertura de ${u.name} (${u.rut})`, staff.id);
    toast('Cuenta aprobada y activada', 'success');
  });
  m.el.querySelector('[data-reject]')?.addEventListener('click', () => {
    const reason = m.el.querySelector('#kr').value.trim();
    if (!reason) return toast('Indica el motivo del rechazo', 'warning');
    m.close();
    db.update('users', id, { kyc: 'rechazado', kycReviewer: staff.id, kycAt: new Date().toISOString(), kycReason: reason });
    db.query('accounts', a => a.userId === id).forEach(a => db.update('accounts', a.id, { status: 'cerrada' }));
    notify(id, 'Solicitud rechazada', `No pudimos validar tu identidad: ${reason}`, 'info');
    db.log('kyc', `${staff.name} rechazó la apertura de ${u.name}: ${reason}`, staff.id);
    toast('Solicitud rechazada', 'info');
  });
}
