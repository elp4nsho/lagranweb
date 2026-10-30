// Centro de resolución de disputas: evidencia de ambas partes y decisión (liberar, reembolsar o parcial).
import { escape, money, date, dateTime, ago, toast, modal } from '../../../assets/core/ui.js';
import { pageHead, smartTable, badge, avatar, formData } from '../shared/kit.js';
import { user, net, ORDER_STATUS, statusBadge } from '../shared/market.js';
import { chatHTML } from '../shared/orderview.js';

const D_STATUS = { abierta: ['Abierta', 'danger'], en_revision: ['En revisión', 'warning'], resuelta: ['Resuelta', 'success'] };
const DECISION = { liberar: 'Liberar fondos al freelancer', reembolso: 'Reembolso total al cliente', parcial: 'Reembolso parcial' };

export function render(el, { db, go }) {
  const rows = db.all('disputes').map(d => { const o = db.get('orders', d.orderId) || {}; return { ...d, code: o.code, title: o.title, amount: o.total || 0, cname: user(o.clientId)?.name || '', fname: user(o.freelancerId)?.name || '', opener: user(d.openedBy)?.name || '' }; });
  el.innerHTML = `${pageHead('Disputas', `${rows.filter(r => r.status !== 'resuelta').length} por resolver · tiempo objetivo de respuesta 24 h`)}<div class="card" data-t></div>`;
  smartTable(el.querySelector('[data-t]'), {
    id: 'disputes', rows, search: r => r.code + r.reason + r.cname + r.fname,
    filters: [{ key: 'status', label: 'Estado', options: Object.entries(D_STATUS).map(([k, v]) => [k, v[0]]) }],
    columns: [
      { key: 'createdAt', label: 'Abierta', render: r => `<span class="small">${ago(r.createdAt)}</span>` },
      { key: 'code', label: 'Pedido', render: r => `<b>${escape(r.code || '')}</b><div class="small muted">${escape(r.title || '')}</div>` },
      { key: 'reason', label: 'Motivo', render: r => `<span class="small">${escape(r.reason)}</span><div class="small muted">Abierta por ${escape(r.opener)}</div>` },
      { key: 'amount', label: 'En juego', render: r => money(r.amount) },
      { key: 'status', label: 'Estado', render: r => badge(...D_STATUS[r.status]) + (r.decision ? `<div class="small muted">${DECISION[r.decision]}</div>` : '') }
    ],
    onRow: r => go('/disputas/' + r.id)
  });
}

export function detail(el, { db, me }, id) {
  const d = db.get('disputes', id);
  const o = d && db.get('orders', d.orderId);
  if (!d || !o) { el.innerHTML = '<div class="empty">Disputa no encontrada</div>'; return; }
  const c = user(o.clientId), f = user(o.freelancerId);
  const side = uid => uid === o.clientId ? 'Cliente' : uid === o.freelancerId ? 'Freelancer' : 'Soporte';
  el.innerHTML = `
    ${pageHead(`Disputa · ${o.code}`, `${escape(d.reason)} · ${badge(...D_STATUS[d.status])}`, `<a class="btn btn-ghost btn-sm" href="#/disputas">← Disputas</a><a class="btn btn-ghost btn-sm" href="#/pedidos/${o.id}">Ver pedido</a>`)}
    ${d.status === 'resuelta' ? `<div class="notice ok"><b>Resuelta:</b> ${DECISION[d.decision]}${d.decision === 'parcial' ? ` (${d.refundPct}% al cliente)` : ''}. ${escape(d.note || '')} · ${escape(user(d.resolvedBy)?.name || '')} · ${d.resolvedAt ? dateTime(d.resolvedAt) : ''}</div>` : ''}
    <div class="split">
      <div class="stack">
        <div class="card"><h3>Evidencia</h3><ul class="list">${d.evidence.map(e => `<li>${avatar(user(e.by), 32)}<span style="flex:1"><b class="small">${escape(user(e.by)?.name || '')} · ${side(e.by)}</b> <span class="small muted">${dateTime(e.at)}</span><br>${escape(e.text)}${(e.files || []).length ? `<div class="attach-list">${e.files.map(x => `<span class="file-chip">📎 ${escape(x.name || x)}</span>`).join('')}</div>` : ''}</span></li>`).join('')}</ul>
          ${d.status !== 'resuelta' ? `<form class="stack" data-note style="margin-top:10px"><div class="field"><label for="dn">Nota de soporte / solicitar información</label><textarea class="textarea" id="dn" name="text" style="min-height:70px"></textarea></div><button class="btn btn-sm">Agregar nota</button></form>` : ''}</div>
        <div class="card chat-pane"><h3>Conversación del pedido</h3>${chatHTML(o, me)}</div>
      </div>
      <div class="stack">
        <div class="card"><h3>Pedido</h3><dl class="dl small"><dt>Servicio</dt><dd>${escape(o.title)}</dd><dt>Cliente</dt><dd>${escape(c?.name || '')}</dd><dt>Freelancer</dt><dd>${escape(f?.name || '')}</dd><dt>Total pagado</dt><dd>${money(o.total)}</dd><dt>Neto freelancer</dt><dd>${money(net(o))}</dd><dt>Entregas</dt><dd>${o.deliveries.length}</dd><dt>Plazo</dt><dd>${date(o.due)}</dd><dt>Estado</dt><dd>${statusBadge(ORDER_STATUS, o.status)}</dd></dl></div>
        ${d.status !== 'resuelta' ? `<div class="card stack"><h3 class="mb-0">Resolución</h3>
          ${d.status === 'abierta' ? '<button class="btn btn-sm" data-review>Tomar caso (en revisión)</button>' : ''}
          <button class="btn btn-primary" data-dec="liberar">Liberar ${money(net(o))} al freelancer</button>
          <button class="btn" data-dec="parcial">Reembolso parcial…</button>
          <button class="btn btn-danger" data-dec="reembolso">Reembolsar ${money(o.total)} al cliente</button></div>` : ''}
      </div>
    </div>`;
  el.querySelector('[data-review]')?.addEventListener('click', () => { db.update('disputes', id, { status: 'en_revision', assignee: me.id }); db.log('disputa', `${me.name} tomó la disputa de ${o.code}`, me.id); toast('Disputa en revisión', 'success'); });
  el.querySelector('[data-note]')?.addEventListener('submit', e => { e.preventDefault(); const t = e.currentTarget.text.value.trim(); if (!t) return; db.update('disputes', id, x => ({ evidence: [...x.evidence, { by: me.id, text: t, files: [], at: new Date().toISOString() }] })); toast('Nota agregada', 'success'); });
  el.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => {
    const dec = b.dataset.dec;
    const m = modal({ title: DECISION[dec], body: `<form class="stack">${dec === 'parcial' ? '<div class="field"><label for="rp">Porcentaje a reembolsar al cliente</label><input class="input" id="rp" name="pct" type="number" min="10" max="90" step="5" value="50"></div>' : ''}<div class="field"><label for="rn">Fundamento de la decisión *</label><textarea class="textarea" id="rn" name="note" required></textarea></div><p class="small muted mb-0">Ambas partes serán notificadas. Esta acción mueve los fondos retenidos.</p></form>`, foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn ${dec === 'reembolso' ? 'btn-danger' : 'btn-primary'}" data-ok>Confirmar decisión</button>` });
    m.el.querySelector('[data-ok]').onclick = () => {
      const v = formData(m.el.querySelector('form'));
      if (!v.note) return toast('Escribe el fundamento', 'warning');
      const pct = dec === 'parcial' ? Math.min(90, Math.max(10, +v.pct || 50)) : dec === 'reembolso' ? 100 : 0;
      const now = new Date().toISOString();
      db.update('disputes', id, { status: 'resuelta', decision: dec, refundPct: pct, note: v.note, resolvedBy: me.id, resolvedAt: now });
      db.update('orders', o.id, x => ({ status: dec === 'reembolso' ? 'cancelado' : 'completado', escrow: dec === 'liberar' ? 'liberado' : dec === 'reembolso' ? 'reembolsado' : 'parcial', refundPct: pct, completedAt: now, timeline: [...x.timeline, { at: now, text: `Disputa resuelta por soporte: ${DECISION[dec]}${dec === 'parcial' ? ` (${pct}% al cliente)` : ''}`, by: me.id }] }));
      db.log('disputa', `Disputa ${o.code} resuelta: ${DECISION[dec]}`, me.id);
      toast('Disputa resuelta y fondos movidos', 'success'); m.close();
    };
  });
}
