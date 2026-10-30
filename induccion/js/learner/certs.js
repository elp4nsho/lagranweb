// Certificados del trabajador y vista imprimible.
import { escape, date } from '../../../assets/core/ui.js';
import { db, auth, homeFor } from '../data/db.js';
import { getPlan, certStatus, CERT, daysLeft } from '../data/model.js';
import { certificateHTML } from '../shared/certificate.js';

export function renderCerts(view) {
  const u = auth.current();
  const list = db.query('certificates', c => c.userId === u.id).sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  view.innerHTML = `<div class="lx-head"><div><span class="eyebrow">Mis certificados</span><h1>Certificaciones</h1><p class="muted" style="margin:6px 0 0">Cada certificado tiene un código que cualquiera puede verificar en línea.</p></div></div>
    ${list.length ? `<div class="grid-auto">${list.map(c => { const st = certStatus(c), p = getPlan(c.planId), d = daysLeft(c.expiresAt); return `<article class="card plan-tile">
      <div class="row between"><span class="badge badge-${CERT[st][1] || 'info'}">${CERT[st][0]}</span><code class="small">${escape(c.code)}</code></div>
      <h3>${escape(p?.name || '—')}</h3>
      <div class="meta"><span>Emitido ${date(c.issuedAt)}</span><span>Vence ${date(c.expiresAt)}${st === 'por_vencer' ? ` (en ${d} días)` : ''}</span><span>Puntaje ${c.score}%</span></div>
      <div class="row"><a class="btn btn-primary btn-sm" href="#/certificado/${c.id}">Ver / imprimir</a><a class="btn btn-sm" href="verificar.html?c=${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Verificar</a></div>
    </article>`; }).join('')}</div>` : '<div class="card empty"><span class="icon">📜</span><p>Aún no tienes certificados. Completa una inducción para obtener el primero.</p></div>'}`;
}

export function renderCert(view, id) {
  const u = auth.current();
  const c = db.get('certificates', id);
  const staff = u.role !== 'trabajador';
  if (!c || (!staff && c.userId !== u.id)) { view.innerHTML = '<div class="card empty"><h2>Certificado no encontrado</h2><a class="btn btn-primary" href="#/certificados">Volver</a></div>'; return; }
  view.innerHTML = `<div class="row between" style="margin-bottom:14px"><a class="back" style="margin:0" href="${staff ? homeFor(u.role) : '#/certificados'}">← Certificados</a>
    <div class="row" style="gap:8px"><a class="btn btn-sm" href="verificar.html?c=${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Verificar en línea</a><button class="btn btn-primary btn-sm" id="print">Imprimir / Guardar PDF</button></div></div>
    ${certificateHTML(c)}`;
  view.querySelector('#print').onclick = () => window.print();
}
