// Registro de certificados: vigencia, vencimientos, revocación y verificación pública.
import { pageHead, table, person, badge, html, escape, date, downloadCSV, toast, formDialog, confirm, kpis } from '../shared/admin-kit.js';
import { db } from '../data/db.js';
import { getPlan, getCompany, certStatus, CERT, daysLeft, notify, getUser } from '../data/model.js';
import { certCounts } from './stats.js';

export function renderCertificates(el, _p, ctx, { pool, key = 'certs' } = {}) {
  const users = Object.fromEntries(db.all('users').map(u => [u.id, u]));
  const rows = db.all('certificates').filter(c => !pool || pool.has(c.userId)).map(c => ({ ...c, _u: users[c.userId], _st: certStatus(c) })).filter(c => c._u);
  const cc = certCounts();
  el.innerHTML = pageHead('Certificados', 'Registro de certificados emitidos. Cualquier persona puede validarlos con su código en el verificador público.', `<a class="btn" href="verificar.html" target="_blank" rel="noopener">✔ Verificador</a><button class="btn" data-csv>⬇ CSV</button>`) +
    (pool ? '' : kpis([{ label: 'Vigentes', value: String(cc.vigente) }, { label: 'Por vencer', value: String(cc.por_vencer), hint: 'Dentro del período de aviso' }, { label: 'Vencidos', value: String(cc.vencido) }, { label: 'Revocados', value: String(cc.revocado) }])) + '<div data-t></div>';
  const t = table(el.querySelector('[data-t]'), {
    key, rows, pageSize: 12,
    search: c => `${c.code} ${c._u.name} ${c._u.rut} ${getPlan(c.planId)?.name}`,
    filters: [
      { key: '_st', label: 'Estado', options: Object.entries(CERT).map(([k, v]) => [k, v[0]]) },
      { key: 'planId', label: 'Plan', options: db.all('plans').map(p => [p.id, p.name]) },
      { key: 'co', label: 'Empresa', options: db.all('companies').map(c => [c.id, c.name]), test: (c, v) => c._u.companyId === v }
    ],
    columns: [
      { key: 'code', label: 'Código', render: c => `<code>${escape(c.code)}</code>` },
      { key: 'u', label: 'Titular', value: c => c._u.name, render: c => person(c._u, getCompany(c._u.companyId)?.name) },
      { key: 'planId', label: 'Plan', render: c => escape(getPlan(c.planId)?.name || '—') },
      { key: 'issuedAt', label: 'Emisión', render: c => date(c.issuedAt) },
      { key: 'expiresAt', label: 'Vencimiento', render: c => c._st === 'por_vencer' ? html`<b>${date(c.expiresAt)}</b><br><small class="muted">en ${daysLeft(c.expiresAt)} días</small>` : date(c.expiresAt) },
      { key: '_st', label: 'Estado', render: c => badge(CERT[c._st][0], CERT[c._st][1]) },
      { key: 'x', label: '', sort: false, align: 'right', render: c => `<span class="ak-actions"><a class="btn btn-sm btn-ghost" href="app.html#/certificado/${c.id}" target="_blank" rel="noopener" title="Ver certificado">👁</a><a class="btn btn-sm btn-ghost" href="verificar.html?c=${encodeURIComponent(c.code)}" target="_blank" rel="noopener" title="Verificar">✔</a>${c._st === 'por_vencer' || c._st === 'vencido' ? '<button class="btn btn-sm btn-ghost" data-act="remind" title="Avisar vencimiento">🔔</button>' : ''}${!pool ? (c.status === 'revocado' ? '<button class="btn btn-sm btn-ghost" data-act="restore">Restaurar</button>' : '<button class="btn btn-sm btn-ghost ak-danger" data-act="revoke">Revocar</button>') : ''}</span>` }
    ]
  });
  el.querySelector('[data-t]').addEventListener('row-action', async e => {
    const { action, row: c } = e.detail;
    if (action === 'revoke') {
      const v = await formDialog({ title: `Revocar ${c.code}`, fields: [{ name: 'reason', label: 'Motivo', type: 'select', options: ['Reemplazado por nueva inducción', 'Error en la emisión', 'Desvinculación', 'Incumplimiento grave de seguridad'] }], submit: 'Revocar' });
      if (!v) return;
      db.update('certificates', c.id, { status: 'revocado', revokedReason: v.reason, revokedAt: new Date().toISOString() }); db.log('certificado revocado', `${c.code} · ${v.reason}`, ctx.user.id); toast('Certificado revocado', 'success');
    }
    if (action === 'restore') { if (!(await confirm(`¿Restaurar el certificado ${c.code}?`))) return; db.update('certificates', c.id, { status: 'vigente', revokedReason: null }); db.log('certificado restaurado', c.code, ctx.user.id); toast('Certificado restaurado', 'success'); }
    if (action === 'remind') { const p = getPlan(c.planId); notify(c.userId, 'Tu certificación vence', `Tu certificado de «${p?.name}» ${c._st === 'vencido' ? 'está vencido' : `vence el ${date(c.expiresAt)}`}. Coordina tu reinducción.`, 'warning'); notify(c._u.supervisorId, 'Certificación por vencer en tu equipo', `${c._u.name}: «${p?.name}» (${date(c.expiresAt)}).`, 'warning'); db.log('aviso de vencimiento', `${c._u.name} · ${c.code}`, ctx.user.id); toast('Aviso enviado al trabajador y su supervisor', 'success'); }
  });
  el.querySelector('[data-csv]').onclick = () => { const l = t.filtered(); downloadCSV('certificados.csv', l.map(c => ({ codigo: c.code, titular: c._u.name, rut: c._u.rut, empresa: getCompany(c._u.companyId)?.name, plan: getPlan(c.planId)?.name, emision: date(c.issuedAt), vencimiento: date(c.expiresAt), puntaje: c.score, estado: CERT[c._st][0], supervisor: getUser(c._u.supervisorId)?.name || '' }))); toast(`${l.length} certificados exportados`, 'success'); };
}
