// Mis documentos: contratos, anexos y certificados (firma y descarga simuladas).
import { escape, toast, date } from '../../../assets/core/ui.js';
import { COMPANY } from '../shared/util.js';
import { today } from '../shared/dates.js';

const ICO = { Contrato: '📝', Anexo: '📎', Reglamento: '📘', Certificado: '🏅', Liquidación: '💵' };

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  a.download = name.replace(/[^\wáéíóúñ .-]+/gi, '').replace(/\s+/g, '_') + '.txt';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function render(el, ctx) {
  const { db } = ctx, me = ctx.me;
  const docs = db.query('documents', d => d.employeeId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const pending = docs.filter(d => !d.signed);
  el.innerHTML = `<div class="page-head"><div><h1>Mis documentos</h1><p class="muted" style="margin:4px 0 0">Contratos, anexos y certificados. La firma electrónica es simulada.</p></div>
      <div class="row gap-sm"><button class="btn" data-cert="antiguedad">🏅 Certificado de antigüedad</button><button class="btn" data-cert="renta">🏅 Certificado de renta</button></div></div>
    ${pending.length ? `<div class="card" style="border-left:4px solid var(--warning)"><b>Tienes ${pending.length} documento${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''} de firma.</b></div>` : ''}
    <div class="card">${docs.map(d => `<div class="doc-row"><span class="ico" aria-hidden="true">${ICO[d.type] || '📄'}</span><div class="info"><b>${escape(d.name)}</b><small>${escape(d.type)} · ${escape(date(d.date + 'T12:00'))} · ${escape(d.size)}</small></div>${d.signed ? '<span class="badge badge-success">Firmado</span>' : `<button class="btn btn-sm btn-primary" data-sign="${d.id}">Firmar</button>`}<button class="btn btn-sm btn-ghost" data-dl="${d.id}">⭳ Descargar</button></div>`).join('') || '<div class="empty">Sin documentos.</div>'}</div>`;
  el.onclick = e => {
    const s = e.target.closest('[data-sign]'), d = e.target.closest('[data-dl]'), c = e.target.closest('[data-cert]');
    if (s) { const doc = db.get('documents', s.dataset.sign); db.update('documents', doc.id, { signed: true, signedAt: new Date().toISOString() }); db.log('documento', `${me.name} firmó «${doc.name}»`, ctx.user.id); toast('Documento firmado electrónicamente (simulado)', 'success'); }
    if (d) { const doc = db.get('documents', d.dataset.dl); download(doc.name, `${COMPANY.name} · RUT ${COMPANY.rut}\n\n${doc.name}\nColaborador/a: ${me.first} ${me.last} · RUT ${me.rut}\nFecha: ${doc.date}\n\nDocumento de demostración (simulado).`); }
    if (c) {
      const kind = c.dataset.cert, name = kind === 'renta' ? `Certificado de renta ${today().slice(0, 4)}` : 'Certificado de antigüedad laboral';
      db.insert('documents', { employeeId: me.id, name, type: 'Certificado', date: today(), size: '58 KB', signed: true });
      db.log('documento', `${me.name} generó «${name}»`, ctx.user.id);
      toast('Certificado generado y disponible para descarga', 'success');
    }
  };
}
