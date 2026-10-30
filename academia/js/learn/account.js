// Certificados, pedidos (con solicitud de reembolso) y notificaciones del estudiante.
import { escape, date, money, ago, toast } from '../../../assets/core/ui.js';
import { formDialog } from '../shared/admin-kit.js';
import { db, auth } from '../data/db.js';
import { getCourse, site, ORDER, requestRefund } from '../data/model.js';
import { cover } from '../shared/bits.js';
import { certificateHTML } from '../shared/certificate.js';

export function renderCerts(view) {
  const u = auth.current();
  const cs = db.query('certificates', c => c.userId === u.id).sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  view.innerHTML = `<div class="learn-head"><div><span class="eyebrow">Logros</span><h1>Mis certificados</h1></div></div>
    ${cs.length ? `<div class="grid-auto">${cs.map(c => { const k = getCourse(c.courseId); return `<article class="card course-card">${k ? cover(k) : ''}<div class="course-body"><h3>${escape(k?.title || '')}</h3><p class="small muted course-meta">Emitido el ${date(c.issuedAt)} · <code>${escape(c.code)}</code></p><div class="row"><a class="btn btn-primary btn-sm" href="#/certificado/${c.id}">Ver / imprimir</a><a class="btn btn-sm" href="index.html#/certificado/${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Verificar</a></div></div></article>`; }).join('')}</div>`
      : '<div class="card empty"><span class="icon">🎓</span><p>Termina un curso para obtener tu primer certificado.</p></div>'}`;
}
export function renderCert(view, id) {
  const u = auth.current(), c = db.get('certificates', id);
  if (!c || c.userId !== u.id) { view.innerHTML = '<div class="card empty"><h2>Certificado no encontrado</h2><a class="btn" href="#/certificados">Volver</a></div>'; return; }
  view.innerHTML = `<div class="row between" style="margin-bottom:14px"><a class="back" href="#/certificados">← Certificados</a><div class="row" style="gap:8px"><a class="btn btn-sm" href="index.html#/certificado/${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Verificar en línea</a><button class="btn btn-primary btn-sm" data-print>Imprimir / PDF</button></div></div>${certificateHTML(c)}`;
  view.querySelector('[data-print]').onclick = () => print();
}
export function renderOrders(view) {
  const u = auth.current(), days = site().refundDays;
  const os = db.query('orders', o => o.userId === u.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  view.innerHTML = `<div class="learn-head"><div><span class="eyebrow">Compras</span><h1>Mis pedidos</h1><p class="muted" style="margin:6px 0 0">Puedes pedir reembolso dentro de ${days} días desde la compra.</p></div></div>
    ${os.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Fecha</th><th>Cursos</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>${os.map(o => { const can = o.status === 'pagado' && o.total > 0 && (Date.now() - new Date(o.createdAt)) / 864e5 <= days; return `<tr><td data-label="Pedido">#${o.number}</td><td>${date(o.createdAt)}</td><td>${o.items.map(x => escape(x.title)).join('<br>')}</td><td>${money(o.total)}${o.couponCode ? `<br><small class="muted">${escape(o.couponCode)}</small>` : ''}</td><td><span class="badge badge-${ORDER[o.status][1]}">${ORDER[o.status][0]}</span></td><td style="text-align:right">${can ? `<button class="btn btn-sm" data-refund="${o.id}">Pedir reembolso</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="card empty">Aún no tienes pedidos.</div>'}`;
  view.querySelectorAll('[data-refund]').forEach(b => b.onclick = async () => {
    const v = await formDialog({ title: 'Solicitar reembolso', submit: 'Enviar solicitud', intro: 'Al aprobarse perderás el acceso a los cursos del pedido.', fields: [{ name: 'reason', label: 'Motivo', type: 'select', options: ['El curso no cumplió mis expectativas', 'Me equivoqué de curso', 'Problemas técnicos', 'Compra duplicada', 'Otro'] }, { name: 'detail', label: 'Comentario (opcional)', type: 'textarea' }] });
    if (!v) return;
    requestRefund(b.dataset.refund, v.detail ? `${v.reason}: ${v.detail}` : v.reason);
    toast('Solicitud enviada. Soporte la revisará en 48 horas.', 'success');
  });
}
export function renderNotifications(view) {
  const u = auth.current();
  const ns = db.query('notifications', n => n.userId === u.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  view.innerHTML = `<div class="learn-head"><div><span class="eyebrow">Avisos</span><h1>Notificaciones</h1></div>${ns.some(n => !n.read) ? '<button class="btn" data-all>Marcar todo como leído</button>' : ''}</div>
    <div class="card">${ns.length ? `<ul class="ak-list">${ns.map(n => `<li><span class="badge badge-${n.read ? 'info' : n.kind || 'info'}">${n.read ? 'Leído' : 'Nuevo'}</span><div class="grow"><b>${escape(n.title)}</b><small>${escape(n.text)}</small></div><span class="small muted">${ago(n.at)}</span></li>`).join('')}</ul>` : '<div class="empty">Sin notificaciones.</div>'}</div>`;
  view.querySelector('[data-all]')?.addEventListener('click', () => ns.filter(n => !n.read).forEach(n => db.update('notifications', n.id, { read: true })));
}
