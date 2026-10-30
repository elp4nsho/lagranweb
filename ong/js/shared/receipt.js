// Comprobante / certificado de donación: vista en modal, impresión y descarga como archivo HTML.
import { db, site, campaignName } from '../data/db.js';
import { escape, money, date, modal, toast } from '../../../assets/core/ui.js';

function body(d) {
  const s = site();
  return `<div class="receipt" id="receiptDoc">
    <div class="rc-head"><span class="rc-logo" aria-hidden="true">🌱</span><div><b>${escape(s.name)}</b><br><small>${escape(s.address)} · ${escape(s.contactEmail)}</small></div></div>
    <h3>Certificado de donación</h3>
    <p class="rc-no">N° <b>${escape(d.receiptNo)}</b> · ${escape(date(d.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
    <dl class="kv"><dt>Donante</dt><dd>${escape(d.donorName)}</dd><dt>Correo</dt><dd>${escape(d.email)}</dd>
      <dt>Destino</dt><dd>${escape(campaignName(d.campaignId))}</dd><dt>Tipo</dt><dd>${d.type === 'mensual' ? 'Donación mensual' : 'Donación única'}</dd>
      <dt>Medio de pago</dt><dd>${escape(d.method)}</dd><dt>Monto</dt><dd class="rc-amount">${money(d.amount)}</dd></dl>
    <p class="small">Certificamos haber recibido la donación indicada, que será destinada íntegramente a los fines declarados. ¡Gracias por sembrar futuro!</p>
    <p class="small muted">${escape(s.certificateNote)}</p>
  </div>`;
}

export function receiptFile(d) {
  const css = 'body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;color:#1f2a1e}dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px}dt{color:#5f6b58}dd{margin:0;font-weight:600}.rc-head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #2f5d3a;padding-bottom:12px}.rc-logo{font-size:32px}.rc-amount{font-size:22px}.muted{color:#5f6b58}';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Certificado ${d.receiptNo}</title><style>${css}</style></head><body>${body(d)}</body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = `certificado-${d.receiptNo}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Certificado descargado', 'success');
}

export function openReceipt(idOrDonation) {
  const d = typeof idOrDonation === 'string' ? db.get('donations', idOrDonation) : idOrDonation;
  if (!d || !d.receiptNo) return toast('Esta donación no tiene comprobante', 'warning');
  const m = modal({ title: 'Comprobante de donación', body: body(d), foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn" data-print>🖨 Imprimir</button><button class="btn btn-primary" data-dl>⇩ Descargar</button>' });
  m.el.querySelector('[data-dl]').onclick = () => receiptFile(d);
  m.el.querySelector('[data-print]').onclick = () => {
    const w = window.open('', '_blank');
    if (!w) return toast('Permite ventanas emergentes para imprimir', 'warning');
    w.document.write(`<html><head><title>${d.receiptNo}</title></head><body style="font-family:system-ui;max-width:640px;margin:40px auto">${body(d)}</body></html>`);
    w.document.close(); w.print();
  };
}

// Certificado anual consolidado.
export function annualFile(donor, year, list) {
  const total = list.reduce((s, d) => s + d.amount, 0);
  const rows = list.map(d => `<tr><td>${escape(d.receiptNo)}</td><td>${escape(d.createdAt.slice(0, 10))}</td><td>${escape(campaignName(d.campaignId))}</td><td style="text-align:right">${money(d.amount)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Certificado anual ${year}</title><style>body{font-family:system-ui;max-width:720px;margin:40px auto;padding:0 20px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ccc;padding:6px;text-align:left}</style></head><body>
    <h2>${escape(site().name)} · Certificado anual ${year}</h2><p>Donante: <b>${escape(donor.name)}</b> (${escape(donor.email)})</p>
    <table><thead><tr><th>N°</th><th>Fecha</th><th>Destino</th><th>Monto</th></tr></thead><tbody>${rows}</tbody></table>
    <p><b>Total ${year}: ${money(total)}</b></p><p style="color:#777">${escape(site().certificateNote)}</p></body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = `certificado-anual-${year}.html`; a.click();
  toast(`Certificado anual ${year} descargado`, 'success');
}
