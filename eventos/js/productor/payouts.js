// Liquidaciones: saldo por evento, comisión de la plataforma y solicitud de pago.
import { db } from '../data/db.js';
import { html, raw, $, money, toast, confirm, date } from '../../../assets/core/ui.js';
import { pageHead, kpi, csvButton, wireCSV } from '../shared/admin-kit.js';
import { badge } from '../shared/format.js';
import { eventStats, isPast } from '../shared/inventory.js';

export function render(el, { org, user }) {
  const draw = () => {
    const pays = db.query('payouts', p => p.organizerId === org.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const evs = db.query('events', e => e.organizerId === org.id && ['publicado', 'finalizado'].includes(e.status));
    const rows = evs.map(e => {
      const gross = eventStats(e).revenue, commission = Math.round(gross * org.commissionPct / 100);
      const paid = pays.filter(p => p.eventId === e.id).reduce((s, p) => s + p.amount, 0);
      return { e, gross, commission, net: gross - commission, paid, pending: Math.max(0, gross - commission - paid), done: isPast(e) || e.status === 'finalizado' };
    });
    const avail = rows.filter(r => r.done).reduce((s, r) => s + r.pending, 0);
    el.innerHTML = html`${raw(pageHead('Liquidaciones', `Comisión de la plataforma: ${org.commissionPct}% · Cuenta: ${org.bank || 'sin cuenta registrada'}`, csvButton()))}
      <div class="kpis">${raw(kpi('Disponible para liquidar', money(avail)))}${raw(kpi('Por liberar (eventos futuros)', money(rows.filter(r => !r.done).reduce((s, r) => s + r.pending, 0))))}${raw(kpi('Pagado históricamente', money(pays.filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0))))}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Evento</th><th>Bruto</th><th>Comisión</th><th>Neto</th><th>Liquidado</th><th>Pendiente</th><th></th></tr></thead><tbody>
      ${rows.map(r => raw(html`<tr><td>${r.e.title}<br><small class="muted">${date(r.e.date)}</small></td><td>${money(r.gross)}</td><td>−${money(r.commission)}</td><td>${money(r.net)}</td><td>${money(r.paid)}</td><td><b>${money(r.pending)}</b></td>
        <td>${r.pending > 0 ? raw(r.done ? `<button class="btn btn-sm btn-primary" data-req="${r.e.id}">Solicitar pago</button>` : `<button class="btn btn-sm btn-ghost" data-adv="${r.e.id}" title="Hasta 30% del neto">Anticipo</button>`) : ''}</td></tr>`))}</tbody></table></div>
      <div class="card"><h3>Historial</h3>${pays.length ? raw(`<ul class="mini-list">${pays.map(p => `<li><span>${db.get('events', p.eventId)?.title || '—'}${p.advance ? ' (anticipo)' : ''}<br><small class="muted">${date(p.createdAt)}${p.paidAt ? ' · pagado ' + date(p.paidAt) : ''}</small></span>${badge(p.status)}<b>${money(p.amount)}</b></li>`).join('')}</ul>`) : raw('<div class="empty">Sin liquidaciones</div>')}</div>`;
    wireCSV(el, 'liquidaciones.csv', () => rows.map(r => ({ evento: r.e.title, bruto: r.gross, comision: r.commission, neto: r.net, liquidado: r.paid, pendiente: r.pending })));
    el.querySelectorAll('[data-req],[data-adv]').forEach(b => b.onclick = async () => {
      const r = rows.find(x => x.e.id === (b.dataset.req || b.dataset.adv)), adv = !!b.dataset.adv;
      const amount = adv ? Math.max(0, Math.round(r.net * .3 - r.paid)) : r.pending;
      if (amount <= 0) return toast('Ya solicitaste el anticipo máximo', 'warning');
      if (!await confirm(`¿Solicitar ${adv ? 'anticipo' : 'liquidación'} de ${money(amount)} para "${r.e.title}"?`, { ok: 'Solicitar' })) return;
      db.insert('payouts', { organizerId: org.id, eventId: r.e.id, gross: r.gross, commission: r.commission, amount, status: 'solicitado', advance: adv, paidAt: null });
      db.log('liquidación solicitada', `${org.name}: ${money(amount)} (${r.e.title})`, user.id);
      db.query('users', u => u.role === 'admin').forEach(a => db.insert('notifications', { userId: a.id, text: `${org.name} solicitó una liquidación de ${money(amount)}.`, read: false }));
      toast('Solicitud enviada', 'success');
    });
  };
  draw();
  return { update: draw };
}
void $;
