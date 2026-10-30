// Certificado imprimible (usa tokens: se ve en cualquier estilo) y pseudo-QR decorativo a partir del código.
import { escape, date } from '../../../assets/core/ui.js';
import { getUser, getPlan, planModules, site, certStatus, CERT } from '../data/model.js';
import { LOGO } from './brand.js';

function qr(code) {
  let h = 2166136261; const cells = [];
  for (let i = 0; i < 121; i++) { h ^= code.charCodeAt(i % code.length) + i; h = Math.imul(h, 16777619); cells.push((h >>> 7) & 1); }
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="3" height="3" fill="none" stroke="currentColor" stroke-width=".6"/><rect x="${x + 1}" y="${y + 1}" width="1" height="1" fill="currentColor"/>`;
  const inF = (x, y) => (x < 4 && y < 4) || (x > 6 && y < 4) || (x < 4 && y > 6);
  let r = '';
  cells.forEach((c, i) => { const x = i % 11, y = Math.floor(i / 11); if (c && !inF(x, y)) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; });
  return `<svg class="cert-qr" viewBox="-.5 -.5 12 12" aria-hidden="true"><g fill="currentColor">${r}</g>${finder(0, 0)}${finder(8, 0)}${finder(0, 8)}</svg>`;
}

export function certificateHTML(c) {
  const u = getUser(c.userId) || { name: 'Persona eliminada', rut: '—' };
  const p = getPlan(c.planId) || { name: 'Plan eliminado', moduleIds: [] };
  const s = site();
  const st = certStatus(c);
  const mods = planModules(p).map(m => m.title).join(', ');
  return `<article class="certificate" aria-label="Certificado de inducción">
    ${st === 'vencido' || st === 'revocado' ? `<div class="cert-status">${CERT[st][0]}</div>` : ''}
    <div class="cert-top"><div class="cert-brand">${LOGO}Minera Altiplano</div>
      <div class="row" style="gap:10px;flex-wrap:nowrap">${qr(c.code)}<div class="cert-code">Código de verificación<br><strong>${escape(c.code)}</strong><br><span>verificar en /induccion/verificar.html</span></div></div></div>
    <div class="cert-mid"><p class="k">Certificado de aprobación</p><h2>${escape(p.name)}</h2>
      <p>Se certifica que</p><p class="name">${escape(u.name)}</p><p>RUT ${escape(u.rut || '—')}</p>
      <p>completó satisfactoriamente la inducción en 3D/VR (${escape(mods)}), obteniendo un puntaje de <strong>${escape(c.score)}%</strong>.</p>
      <p class="muted small">Emitido el ${date(c.issuedAt, { day: 'numeric', month: 'long', year: 'numeric' })} · válido hasta el ${date(c.expiresAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
    <div class="cert-bottom"><div class="sig"><strong>${escape(s.signer)}</strong>${escape(s.signerRole)}</div>
      <div class="seal">INDUCCIÓN<br>APROBADA<br>${new Date(c.issuedAt).getFullYear()}</div>
      <div class="sig"><strong>${escape(s.faena)}</strong>Faena</div></div>
  </article>`;
}
