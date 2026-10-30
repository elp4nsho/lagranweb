// Ganancias y retiros del freelancer + edición de perfil público y portafolio.
import { escape, money, date, toast, modal, barChart } from '../../../assets/core/ui.js';
import { pageHead, statCard, badge, formData, empty } from '../shared/kit.js';
import { balanceOf, settings, net, activeCategories } from '../shared/market.js';
import { levelCard } from './home.js';
import { portfolioArt } from '../public/profiles.js';

const W_STATUS = { solicitado: ['En proceso', 'warning'], pagado: ['Pagado', 'success'], rechazado: ['Rechazado', 'danger'] };

export function renderEarnings(el, { db, me }) {
  const bal = balanceOf(me.id), st = settings();
  const ws = db.query('withdrawals', w => w.freelancerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const done = db.query('orders', o => o.freelancerId === me.id && (o.escrow === 'liberado' || o.escrow === 'parcial')).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  const byCat = activeCategories().map(c => ({ label: c.name, value: done.filter(o => o.categoryId === c.id).reduce((a, o) => a + net(o), 0) })).filter(x => x.value);
  el.innerHTML = `${pageHead('Ganancias', `Retiro mínimo ${money(st.minWithdrawal)} · comisión Gremio ${st.commissionPct}%`, `<button class="btn btn-primary btn-sm" data-w ${bal.available < st.minWithdrawal ? 'disabled' : ''}>Retirar fondos</button>`)}
    <div class="kpi-row">${statCard('Disponible', money(bal.available))}${statCard('En garantía', money(bal.pending), 'pedidos en curso')}${statCard('Retiros en proceso', money(bal.requested))}${statCard('Retirado', money(bal.withdrawn))}</div>
    ${!me.payout ? '<div class="notice warn">Agrega una cuenta bancaria en <a href="#/perfil">Mi perfil</a> para poder retirar.</div>' : ''}
    <div class="split">
      <div class="card"><h3>Historial de retiros</h3><div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Monto</th><th>Cuenta</th><th>Estado</th></tr></thead><tbody>${ws.map(w => `<tr><td class="small">${date(w.createdAt)}</td><td><b>${money(w.amount)}</b></td><td class="small">${escape(w.account)}</td><td>${badge(...W_STATUS[w.status])}${w.note ? `<div class="small muted">${escape(w.note)}</div>` : ''}</td></tr>`).join('') || `<tr><td colspan="4">${empty('Sin retiros')}</td></tr>`}</tbody></table></div></div>
      <div class="stack">${levelCard(me.id)}${byCat.length ? `<div class="card"><h3>Ganancias por categoría</h3>${barChart(byCat, { format: money })}</div>` : ''}</div>
    </div>
    <div class="card"><h3>Pedidos liberados</h3><div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Precio</th><th>Comisión</th><th>Neto</th><th>Liberado</th></tr></thead><tbody>${done.slice(0, 15).map(o => `<tr><td><a href="#/pedidos/${o.id}">${escape(o.code)}</a><div class="small muted">${escape(o.title)}</div></td><td>${money(o.price)}</td><td>−${money(o.commission)}</td><td><b>${money(net(o) * (o.escrow === 'parcial' ? .5 : 1))}</b></td><td class="small">${o.completedAt ? date(o.completedAt) : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  el.querySelector('[data-w]')?.addEventListener('click', () => {
    if (!me.payout) return toast('Primero agrega una cuenta bancaria en tu perfil', 'warning');
    const m = modal({ title: 'Retirar fondos', body: `<form class="stack"><p>Disponible: <b>${money(bal.available)}</b></p><div class="field"><label for="w-a">Monto a retirar</label><input class="input" id="w-a" name="amount" type="number" min="${st.minWithdrawal}" max="${bal.available}" step="1000" value="${Math.floor(bal.available / 1000) * 1000}"></div><p class="small muted mb-0">Se transferirá a ${escape(me.payout.bank)} ${escape(me.payout.account)} en 1–2 días hábiles, tras revisión del equipo de Gremio.</p></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Solicitar retiro</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const amt = +m.el.querySelector('input').value;
      if (!(amt >= st.minWithdrawal) || amt > bal.available) return toast(`Monto entre ${money(st.minWithdrawal)} y ${money(bal.available)}`, 'warning');
      db.insert('withdrawals', { freelancerId: me.id, amount: amt, method: 'Transferencia', account: `${me.payout.bank} ${me.payout.account}`, status: 'solicitado' });
      db.log('retiro', `${me.name} solicitó retiro de ${money(amt)}`, me.id); toast('Retiro solicitado', 'success'); m.close();
    };
  });
}

export function renderProfileEdit(el, { db, me }) {
  let portfolio = (me.portfolio || []).map(p => ({ ...p }));
  el.innerHTML = `${pageHead('Mi perfil', 'Así te ven los clientes', `<a class="btn btn-ghost btn-sm" href="index.html#/freelancer/${me.id}">Ver perfil público</a>`)}
    <form class="stack" id="pf" novalidate>
      <div class="card"><div class="form-grid">
        <div class="field"><label for="pf-n">Nombre</label><input class="input" id="pf-n" name="name" required value="${escape(me.name)}"></div>
        <div class="field"><label for="pf-t">Especialidad</label><input class="input" id="pf-t" name="title" value="${escape(me.title || '')}"></div>
        <div class="field"><label for="pf-c">Ciudad</label><input class="input" id="pf-c" name="city" value="${escape(me.city || '')}"></div>
        <div class="field"><label for="pf-cat">Categoría principal</label><select class="select" id="pf-cat" name="mainCategory">${activeCategories().map(c => `<option value="${c.id}" ${me.mainCategory === c.id ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
        <div class="field full"><label for="pf-b">Sobre mí</label><textarea class="textarea" id="pf-b" name="bio">${escape(me.bio || '')}</textarea></div>
        <div class="field"><label for="pf-s">Habilidades (separadas por coma)</label><input class="input" id="pf-s" name="skills" value="${escape((me.skills || []).join(', '))}"></div>
        <div class="field"><label for="pf-l">Idiomas</label><input class="input" id="pf-l" name="languages" value="${escape((me.languages || []).join(', '))}"></div>
        <div class="field"><label for="pf-bank">Banco para retiros</label><select class="select" id="pf-bank" name="bank"><option value="">— Sin cuenta —</option>${['Banco Estado', 'Banco de Chile', 'Santander', 'BCI', 'Scotiabank', 'Itaú'].map(b => `<option ${me.payout?.bank === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        <div class="field"><label for="pf-acc">N° de cuenta</label><input class="input" id="pf-acc" name="account" value="${escape(me.payout?.account || '')}"></div>
      </div></div>
      <div class="card"><div class="card-head"><h3>Portafolio</h3><button type="button" class="btn btn-sm" data-addp>+ Agregar trabajo</button></div><div class="portfolio" data-port></div></div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary btn-lg">Guardar perfil</button></div>
    </form>`;
  const box = el.querySelector('[data-port]');
  const paint = () => {
    box.innerHTML = portfolio.map((p, i) => `<figure>${portfolioArt(p)}<figcaption class="row between" style="flex-wrap:nowrap"><span class="ellipsis">${escape(p.title)}</span><button type="button" class="btn btn-sm btn-ghost" data-rm="${i}" aria-label="Quitar">✕</button></figcaption></figure>`).join('') || '<p class="muted small">Agrega trabajos para destacar.</p>';
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { portfolio.splice(+b.dataset.rm, 1); paint(); });
  };
  paint();
  el.querySelector('[data-addp]').onclick = () => {
    const m = modal({ title: 'Agregar trabajo', body: '<form class="stack"><div class="field"><label for="pt-t">Título</label><input class="input" id="pt-t" name="t"></div><div class="field"><label for="pt-f">Imagen (simulada)</label><input class="input" id="pt-f" type="file" accept="image/*"></div></form>', foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Agregar</button>' });
    m.el.querySelector('[data-ok]').onclick = () => { const t = m.el.querySelector('input').value.trim(); if (!t) return toast('Escribe un título', 'warning'); portfolio.push({ id: Date.now().toString(36), title: t, hue: portfolio.length % 6 }); paint(); m.close(); toast('Trabajo agregado. Recuerda guardar el perfil.', 'info'); };
  };
  el.querySelector('#pf').addEventListener('submit', e => {
    e.preventDefault();
    const v = formData(e.currentTarget);
    if (!v.name) return toast('El nombre es obligatorio', 'warning');
    db.update('users', me.id, { name: v.name, title: v.title, city: v.city, mainCategory: v.mainCategory, bio: v.bio, skills: v.skills.split(',').map(s => s.trim()).filter(Boolean), languages: v.languages.split(',').map(s => s.trim()).filter(Boolean), portfolio, payout: v.bank && v.account ? { bank: v.bank, account: v.account } : null });
    db.log('perfil', `${v.name} actualizó su perfil`, me.id); toast('Perfil actualizado', 'success');
  });
}
