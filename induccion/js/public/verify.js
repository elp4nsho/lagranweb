// Verificación pública de certificados por código.
import { escape, date } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { getUser, getPlan, getCompany, certStatus, CERT } from '../data/model.js';
import { mountHeader } from '../shared/brand.js';
import { certificateHTML } from '../shared/certificate.js';

mountHeader(document.getElementById('site-header'), { links: [{ href: 'index.html', label: 'Inicio' }, { href: 'index.html#programas', label: 'Planes' }] });
const input = document.getElementById('code'), out = document.getElementById('result');
const mask = rut => rut ? rut.replace(/^(\d{1,2})\.(\d{3})/, '$1.***') : '—';

function check(code) {
  code = (code || '').trim().toUpperCase();
  if (!code) { out.innerHTML = ''; return; }
  input.value = code;
  const c = db.find('certificates', x => x.code.toUpperCase() === code);
  if (!c) {
    out.innerHTML = `<div class="card"><div class="verify-head" style="--k:var(--danger)"><span class="big">✕</span><div><h2 style="margin:0">Código no encontrado</h2><p class="muted" style="margin:0">No existe un certificado con el código <b>${escape(code)}</b>. Revisa que esté bien escrito.</p></div></div></div>`;
    return;
  }
  const st = certStatus(c), u = getUser(c.userId), p = getPlan(c.planId), co = u && getCompany(u.companyId);
  const ok = st === 'vigente' || st === 'por_vencer';
  const k = ok ? (st === 'por_vencer' ? 'var(--warning)' : 'var(--success)') : 'var(--danger)';
  out.innerHTML = `<div class="card stack">
    <div class="verify-head" style="--k:${k}"><span class="big">${ok ? '✓' : '!'}</span><div><h2 style="margin:0">${ok ? 'Certificado válido' : st === 'vencido' ? 'Certificado vencido' : 'Certificado revocado'}</h2><p class="muted" style="margin:0">Estado: <span class="badge badge-${CERT[st][1] || 'info'}">${CERT[st][0]}</span></p></div></div>
    <dl class="ak-dl" style="display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0">
      <dt class="muted">Titular</dt><dd style="margin:0">${escape(u?.name || '—')} · RUT ${escape(mask(u?.rut))}</dd>
      <dt class="muted">Empresa</dt><dd style="margin:0">${escape(co?.name || '—')}</dd>
      <dt class="muted">Inducción</dt><dd style="margin:0">${escape(p?.name || '—')}</dd>
      <dt class="muted">Emisión</dt><dd style="margin:0">${date(c.issuedAt)}</dd>
      <dt class="muted">Vencimiento</dt><dd style="margin:0">${date(c.expiresAt)}</dd>
      ${c.status === 'revocado' ? `<dt class="muted">Motivo</dt><dd style="margin:0">${escape(c.revokedReason || '—')}</dd>` : ''}
    </dl>
    <div class="row"><button class="btn" data-show>Ver certificado</button></div>
    <div data-cert></div>
  </div>`;
  out.querySelector('[data-show]').onclick = e => { out.querySelector('[data-cert]').innerHTML = certificateHTML(c); e.target.remove(); };
}
document.getElementById('vf').addEventListener('submit', e => { e.preventDefault(); history.replaceState(null, '', `?c=${encodeURIComponent(input.value.trim().toUpperCase())}`); check(input.value); });
check(new URLSearchParams(location.search).get('c'));
db.subscribe(() => check(input.value));
