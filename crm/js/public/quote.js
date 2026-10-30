// Vista imprimible de una cotización (quote.html?id=…), con aspecto de documento PDF.
import { db, auth } from '../data/db.js';
import { escape, money, date, toast } from '../../../assets/core/ui.js';
import { quoteTotals, lineTotal, productName, DAY } from '../shared/util.js';
import { canSeeDeal } from '../shared/perms.js';
import { IVA } from '../shared/constants.js';

const user = auth.current();
const q = db.get('quotes', new URLSearchParams(location.search).get('id'));
const doc = document.getElementById('doc');
const deal = q && db.get('deals', q.dealId);
if (!user) {
  location.replace(`login.html?next=${encodeURIComponent('quote.html' + location.search)}`);
} else if (!q || !deal || !canSeeDeal(deal, user)) {
  doc.innerHTML = '<div class="empty"><h2>Cotización no disponible</h2><p>No existe o pertenece a otro ejecutivo.</p><a class="btn" href="app.html#/negocios">Volver al CRM</a></div>';
} else {
  const company = db.get('companies', deal.companyId) || {};
  const contact = db.get('contacts', deal.contactId);
  const seller = db.get('users', q.createdBy) || db.get('users', deal.ownerId) || {};
  const s = db.getValue('settings', {});
  const t = quoteTotals(q.items);
  document.title = `Cotización #${q.number} · ${company.name || ''}`;
  doc.innerHTML = `
    <header class="q-head">
      <div><div class="q-brand"><span class="logo">P</span> Pulso CRM</div><small>${escape(s.companyName || 'Pulso CRM SpA')} · RUT 77.654.321-0<br>Av. Providencia 1234, of. 801, Santiago · ventas@pulsocrm.cl</small></div>
      <div class="q-num"><b>COTIZACIÓN</b><span>N° ${q.number}</span><small>Emitida: ${date(q.createdAt)}<br>Válida hasta: ${date(new Date(new Date(q.createdAt).getTime() + (q.validDays || 30) * DAY))}</small><span class="badge plain">${escape(q.status)}</span></div>
    </header>
    <section class="q-parties">
      <div><small>Cliente</small><b>${escape(company.name || '—')}</b><span>${escape(company.rut || '')}</span><span>${escape(company.city || '')}</span></div>
      <div><small>Atención</small><b>${escape(contact?.name || '—')}</b><span>${escape(contact?.title || '')}</span><span>${escape(contact?.email || '')}</span></div>
      <div><small>Ejecutivo</small><b>${escape(seller.name || '—')}</b><span>${escape(seller.email || '')}</span><span>${escape(seller.phone || '')}</span></div>
    </section>
    <p class="q-ref"><b>Referencia:</b> ${escape(deal.title)}</p>
    <table class="q-table"><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Desc.</th><th>Total</th></tr></thead><tbody>
      ${q.items.map(it => { const p = db.get('products', it.productId); return `<tr><td><b>${escape(productName(it.productId))}</b>${p ? `<br><small>${escape(p.description || '')} · ${escape(p.unit)}</small>` : ''}</td><td>${it.qty}</td><td>${money(it.price)}</td><td>${it.discount ? it.discount + '%' : '—'}</td><td>${money(lineTotal(it))}</td></tr>`; }).join('')}
    </tbody></table>
    <div class="q-totals"><div><span>Neto</span><b>${money(t.net)}</b></div><div><span>IVA (${Math.round(IVA * 100)}%)</span><b>${money(t.iva)}</b></div><div class="grand"><span>Total</span><b>${money(t.total)}</b></div></div>
    <section class="q-notes"><b>Condiciones</b><p>${escape(s.quoteNotes || '')}</p><p>Forma de pago: transferencia a 30 días desde la emisión de la factura.</p></section>
    <footer class="q-sign"><div><span></span><small>Firma y timbre cliente</small></div><div><span></span><small>${escape(seller.name || '')} · Pulso CRM</small></div></footer>
    <p class="q-foot">Documento generado por Pulso CRM (demo ficticia). No constituye documento tributario.</p>`;
  document.querySelector('[data-print]').onclick = () => window.print();
  document.querySelector('[data-send]').onclick = () => {
    db.update('quotes', q.id, { status: 'enviada' });
    db.insert('activities', { type: 'email', subject: `Cotización #${q.number} - ${deal.title}`, body: `Adjunto cotización #${q.number} por ${money(t.total)} IVA incluido.`, to: contact?.email || '', contactId: contact?.id || null, dealId: deal.id, companyId: deal.companyId, ownerId: user.id, done: true, dueAt: new Date().toISOString(), doneAt: new Date().toISOString(), reminded: true, opened: false });
    db.log('cotización', `Envió la cotización #${q.number} a ${contact?.name || 'cliente'}`, user.id);
    toast('Cotización enviada por correo (simulado)', 'success');
    document.querySelector('.q-num .badge').textContent = 'enviada';
  };
}
