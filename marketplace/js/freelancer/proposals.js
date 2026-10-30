// Proyectos abiertos y propuestas del freelancer.
import { escape, money, ago, toast, modal } from '../../../assets/core/ui.js';
import { pageHead, badge, empty, formData } from '../shared/kit.js';
import { category, user } from '../shared/market.js';

const P_STATUS = { enviada: ['Enviada', 'info'], aceptada: ['Aceptada', 'success'], rechazada: ['No seleccionada', ''] };

function proposalModal(db, me, b) {
  const m = modal({ title: `Propuesta · ${b.title}`, body: `<form class="form-grid" novalidate>
    <p class="full small muted mb-0">Presupuesto del cliente: ${money(b.budgetMin)} – ${money(b.budgetMax)} · ${b.days} días</p>
    <div class="field"><label for="pp-p">Tu precio (CLP) *</label><input class="input" id="pp-p" name="price" type="number" min="5000" step="5000" required value="${Math.round((b.budgetMin + b.budgetMax) / 2 / 5000) * 5000}"></div>
    <div class="field"><label for="pp-d">Plazo (días) *</label><input class="input" id="pp-d" name="days" type="number" min="1" required value="${b.days}"></div>
    <div class="field full"><label for="pp-t">Mensaje al cliente *</label><textarea class="textarea" id="pp-t" name="text" required placeholder="Cómo abordarías el proyecto, experiencia relevante, entregables…"></textarea></div>
    <p class="full small muted mb-0">Recibirás ${money(0)} hasta que el cliente acepte. Comisión Gremio ${db.getValue('settings').commissionPct}%.</p></form>`,
    foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Enviar propuesta</button>' });
  const f = m.el.querySelector('form');
  const hint = () => { const p = +f.price.value || 0; f.querySelector('.full:last-child').textContent = `Si te contratan recibirás ${money(p * (1 - db.getValue('settings').commissionPct / 100))} (comisión Gremio ${db.getValue('settings').commissionPct}%).`; };
  f.price.oninput = hint; hint();
  m.el.querySelector('[data-ok]').onclick = () => {
    const v = formData(f);
    if (!v.text || !(+v.price > 0) || !(+v.days > 0)) { f.text.classList.toggle('invalid', !v.text); return toast('Completa precio, plazo y mensaje', 'warning'); }
    db.insert('proposals', { briefId: b.id, freelancerId: me.id, price: +v.price, days: +v.days, text: v.text, status: 'enviada' });
    db.log('propuesta', `${me.name} envió propuesta a "${b.title}" (${money(+v.price)})`, me.id);
    toast('Propuesta enviada al cliente', 'success'); m.close();
  };
}

export function renderProposals(el, { db, me }, _p, q = {}) {
  const open = db.query('briefs', b => b.status === 'abierto').sort((a, b) => (b.categoryId === me.mainCategory) - (a.categoryId === me.mainCategory) || b.createdAt.localeCompare(a.createdAt));
  const mine = db.query('proposals', p => p.freelancerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  el.innerHTML = `${pageHead('Proyectos y propuestas', 'Postula a proyectos publicados por clientes')}
    <div class="split">
      <div class="stack"><h3 class="mb-0">Proyectos abiertos (${open.length})</h3>${open.map(b => { const sent = mine.find(p => p.briefId === b.id); return `<div class="card brief-card" ${q.brief === b.id ? 'style="border-color:var(--primary)"' : ''}>
        <div class="row between"><span class="badge ${b.categoryId === me.mainCategory ? 'badge-primary' : ''}">${escape(category(b.categoryId).name)}</span><span class="small muted">${ago(b.createdAt)} · ${escape(user(b.clientId)?.company || user(b.clientId)?.name || '')}</span></div>
        <h3 class="mb-0">${escape(b.title)}</h3><p class="small mb-0">${escape(b.description)}</p>
        <div class="row between"><div class="mini-stats"><span>💰 ${money(b.budgetMin)} – ${money(b.budgetMax)}</span><span>⏱ ${b.days} días</span><span>✉ ${db.count('proposals', p => p.briefId === b.id)} propuestas</span></div>${sent ? badge('Propuesta enviada', 'success') : `<button class="btn btn-sm btn-primary" data-prop="${b.id}">Enviar propuesta</button>`}</div></div>`; }).join('') || `<div class="card">${empty('No hay proyectos abiertos')}</div>`}</div>
      <div class="card"><h3>Mis propuestas</h3><ul class="list">${mine.map(p => { const b = db.get('briefs', p.briefId); return `<li><span style="flex:1;min-width:0" class="small"><b>${escape(b?.title || '—')}</b><br><span class="muted">${money(p.price)} · ${p.days} días · ${ago(p.createdAt)}</span></span>${badge(...P_STATUS[p.status])}</li>`; }).join('') || '<li class="muted small">Aún no envías propuestas</li>'}</ul></div>
    </div>`;
  el.querySelectorAll('[data-prop]').forEach(b => b.onclick = () => proposalModal(db, me, db.get('briefs', b.dataset.prop)));
  if (q.brief && !mine.some(p => p.briefId === q.brief) && db.get('briefs', q.brief)?.status === 'abierto' && el.__opened !== q.brief) { el.__opened = q.brief; setTimeout(() => proposalModal(db, me, db.get('briefs', q.brief)), 100); }
}
