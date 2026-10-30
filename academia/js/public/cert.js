// Verificación pública de certificados por código.
import { escape, date } from '../../../assets/core/ui.js';
import { db } from '../data/db.js';
import { getCourse, getUser } from '../data/model.js';
import { certificateHTML } from '../shared/certificate.js';

export function renderCertificate(view, code) {
  view.innerHTML = `<section class="page"><div class="container stack" style="max-width:980px">
    <div class="section-head"><div><span class="eyebrow">Verificación pública</span><h1 style="margin:0">Verificar certificado</h1><p>Ingresa el código impreso en el certificado.</p></div></div>
    <form class="row" data-f style="max-width:520px;flex-wrap:nowrap"><input class="input" name="code" value="${escape(code)}" placeholder="FARO-XXXXXX" aria-label="Código"><button class="btn btn-primary">Verificar</button></form>
    <div data-out aria-live="polite"></div></div></section>`;
  const out = view.querySelector('[data-out]');
  const check = c => {
    c = (c || '').trim().toUpperCase();
    if (!c) { out.innerHTML = ''; return; }
    const cert = db.find('certificates', x => x.code === c);
    if (!cert) { out.innerHTML = `<div class="card"><h2 style="margin:0;color:var(--danger)">✕ Código no encontrado</h2><p class="muted" style="margin:0">No existe un certificado con el código ${escape(c)}.</p></div>`; return; }
    out.innerHTML = `<div class="card" style="margin-bottom:16px"><h2 style="margin:0;color:var(--success)">✓ Certificado válido</h2><p style="margin:0">${escape(getUser(cert.userId)?.name)} completó «${escape(getCourse(cert.courseId)?.title)}» el ${date(cert.issuedAt)}.</p></div>${certificateHTML(cert)}`;
  };
  view.querySelector('[data-f]').addEventListener('submit', e => { e.preventDefault(); const c = e.target.code.value.trim().toUpperCase(); history.replaceState(null, '', `#/certificado/${encodeURIComponent(c)}`); check(c); });
  check(code);
}
