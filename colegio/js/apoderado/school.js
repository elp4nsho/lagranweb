// Comunicados con acuse de recibo, entrevistas, pagos de mensualidad y mensajes (apoderado).
import { escape, date, dateTime, money, toast, modal, sleep } from '../../../assets/core/ui.js';
import { pageHead, badge, empty, statCard, formData } from '../shared/kit.js';
import { course, user, commsFor, audienceLabel, courseSubjects, subject, monthLabel, shortName } from '../shared/academic.js';
import { renderChat, newThreadModal } from '../shared/chat.js';
import { PAY_STATUS, MEET_STATUS, NOW, ymd } from '../shared/school.js';

export const unreadComms = ({ me, db }) => commsFor((me.children || []).map(id => db.get('students', id)?.courseId).filter(Boolean)).filter(c => !c.reads?.[me.id]);

export function renderComms(el, ctx) {
  const { db, me, kids } = ctx;
  const list = commsFor(kids.map(k => k.courseId));
  el.innerHTML = `${pageHead('Comunicados', `${list.filter(c => !c.reads?.[me.id]).length} sin leer`)}
    <div class="stack">${list.map(c => { const read = c.reads?.[me.id]; return `<article class="card comm-card ${read ? '' : 'unread'}">
      <div class="row between"><div><span class="small muted">${escape(audienceLabel(c))} · ${dateTime(c.at)} · ${escape(user(c.authorId)?.name || 'Dirección')}</span><h3 style="margin:6px 0">${escape(c.title)}</h3></div>${read ? badge('Leído', 'success') : badge('Nuevo', 'primary')}</div>
      <p>${escape(c.body)}</p>
      <div class="row between">${read ? `<span class="small muted">✓ Lectura confirmada el ${dateTime(read)}</span>` : c.requireAck ? `<span class="small text-warning">Este comunicado requiere confirmación de lectura</span>` : '<span></span>'}
      ${read ? '' : `<button class="btn btn-sm ${c.requireAck ? 'btn-primary' : ''}" data-read="${c.id}">${c.requireAck ? '✓ Confirmar lectura' : 'Marcar como leído'}</button>`}</div></article>`; }).join('') || `<div class="card">${empty('Sin comunicados')}</div>`}</div>`;
  el.querySelectorAll('[data-read]').forEach(b => b.onclick = () => {
    const c = db.get('communications', b.dataset.read);
    db.update('communications', c.id, { reads: { ...(c.reads || {}), [me.id]: new Date().toISOString() } });
    db.log('comunicado', `${me.name} confirmó lectura: ${c.title}`, me.id);
    toast('Lectura confirmada. El colegio recibió tu acuse.', 'success');
  });
}

export function renderMeetings(el, ctx) {
  const { db, me, child: s, kids } = ctx;
  const list = db.query('meetings', m => m.guardianId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  el.innerHTML = `${pageHead('Entrevistas', 'Solicita una entrevista con profesores de tus pupilos', '<button class="btn btn-primary btn-sm" data-new>+ Solicitar entrevista</button>')}
    <div class="stack">${list.map(m => `<div class="card"><div class="row between"><div><b>${escape(user(m.teacherId)?.name || '')}</b> <span class="small muted">· por ${escape(shortName(db.get('students', m.studentId)))}</span><p class="mb-0" style="margin-top:4px">${escape(m.reason)}</p><span class="small muted">${date(m.preferred + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' })} · ${escape(m.slot)} hrs.</span>${m.reply ? `<div class="notice small" style="margin-top:8px">💬 ${escape(m.reply)}</div>` : ''}</div>${badge(...MEET_STATUS[m.status])}</div></div>`).join('') || `<div class="card">${empty('Aún no has solicitado entrevistas', '☕')}</div>`}</div>`;
  el.querySelector('[data-new]').onclick = () => {
    const opts = kids.flatMap(k => { const c = course(k.courseId); const head = c.headTeacherId; const t = courseSubjects(k.courseId); const seen = new Set(); return [{ tid: head, label: 'Profesor/a jefe' }, ...t.map(x => ({ tid: x.teacherId, label: x.subject.short }))].filter(o => o.tid && !seen.has(o.tid) && seen.add(o.tid)).map(o => ({ value: `${o.tid}|${k.id}`, label: `${k.firstName} · ${user(o.tid)?.name} (${o.label})` })); });
    const m = modal({ title: 'Solicitar entrevista', body: `<form class="form-grid" novalidate>
      <div class="field full"><label for="mt-t">Profesor/a</label><select class="select" id="mt-t" name="to">${opts.map(o => `<option value="${o.value}" ${o.value.endsWith(s.id) ? '' : ''}>${escape(o.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="mt-d">Fecha propuesta</label><input class="input" id="mt-d" type="date" name="preferred" min="${ymd(NOW)}" value="${ymd(new Date(NOW.getTime() + 3 * 864e5))}" required></div>
      <div class="field"><label for="mt-h">Horario</label><select class="select" id="mt-h" name="slot">${['15:00', '15:30', '16:00', '16:30', '17:00'].map(h => `<option>${h}</option>`).join('')}</select></div>
      <div class="field full"><label for="mt-r">Motivo *</label><textarea class="textarea" id="mt-r" name="reason" required style="min-height:80px"></textarea></div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Enviar solicitud</button>' });
    m.el.querySelector('[data-ok]').onclick = () => {
      const v = formData(m.el.querySelector('form'));
      if (!v.reason) { m.el.querySelector('textarea').classList.add('invalid'); return toast('Indica el motivo', 'warning'); }
      const [teacherId, studentId] = v.to.split('|');
      db.insert('meetings', { guardianId: me.id, teacherId, studentId, reason: v.reason, preferred: v.preferred, slot: v.slot, status: 'solicitada', reply: '' });
      db.log('entrevista', `${me.name} solicitó entrevista con ${user(teacherId)?.name}`, me.id);
      toast('Solicitud enviada. El profesor/a te responderá por Aula360.', 'success');
      m.close();
    };
  };
}

export function renderPayments(el, { db, me, kids }) {
  const pays = db.query('payments', p => p.guardianId === me.id).sort((a, b) => a.month.localeCompare(b.month) || a.studentId.localeCompare(b.studentId));
  const due = pays.filter(p => p.status === 'vencido' || p.status === 'pendiente');
  const total = due.reduce((a, p) => a + p.amount, 0);
  el.innerHTML = `${pageHead('Pagos', 'Mensualidades del año escolar', due.length ? `<button class="btn btn-primary btn-sm" data-payall>Pagar todo (${money(total)})</button>` : '')}
    <div class="kpi-row">${statCard('Por pagar', money(total), `${due.length} cuota(s)`)}${statCard('Vencido', `<span class="${due.some(p => p.status === 'vencido') ? 'text-danger' : ''}">${money(due.filter(p => p.status === 'vencido').reduce((a, p) => a + p.amount, 0))}</span>`)}${statCard('Pagado en el año', money(pays.filter(p => p.status === 'pagado').reduce((a, p) => a + p.amount, 0)))}</div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Mes</th><th>Estudiante</th><th>Monto</th><th>Vence</th><th>Estado</th><th></th></tr></thead><tbody>
    ${pays.map(p => `<tr><td style="text-transform:capitalize">${monthLabel(p.month)}</td><td>${escape(kids.find(k => k.id === p.studentId)?.firstName || db.get('students', p.studentId)?.firstName || '')}</td><td>${money(p.amount)}${p.beca ? ' ' + badge('Beca', 'info') : ''}</td><td class="small nowrap">${date(p.due + 'T12:00')}</td><td>${badge(...PAY_STATUS[p.status])}</td><td>${p.status === 'vencido' || p.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" data-pay="${p.id}">Pagar</button>` : p.status === 'pagado' ? `<button class="btn btn-sm btn-ghost" data-receipt="${p.id}">Comprobante</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  const checkout = ids => {
    const items = ids.map(id => db.get('payments', id)), amt = items.reduce((a, p) => a + p.amount, 0);
    const m = modal({ title: 'Pago en línea', body: `<form class="stack" novalidate><p>Pagarás <b>${items.length}</b> cuota(s) por un total de <b class="big-num" style="font-size:24px">${money(amt)}</b></p>
      <div class="field"><label for="py-m">Medio de pago</label><select class="select" id="py-m" name="method"><option>Webpay (débito/crédito)</option><option>Transferencia</option></select></div>
      <div class="notice small">Pasarela simulada: no se realizará ningún cargo real.</div></form>`, foot: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Pagar ahora</button>' });
    m.el.querySelector('[data-ok]').onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Procesando…';
      const method = formData(m.el.querySelector('form')).method.split(' ')[0];
      await sleep(900);
      items.forEach(p => db.update('payments', p.id, { status: 'pagado', paidAt: new Date().toISOString(), method }));
      db.log('pago', `${me.name} pagó ${items.length} cuota(s) por ${money(amt)} (${method})`, me.id);
      m.close(); toast(`Pago aprobado por ${money(amt)}. ¡Gracias!`, 'success');
    };
  };
  el.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => checkout([b.dataset.pay]));
  el.querySelector('[data-payall]')?.addEventListener('click', () => checkout(due.map(p => p.id)));
  el.querySelectorAll('[data-receipt]').forEach(b => b.onclick = () => {
    const p = db.get('payments', b.dataset.receipt);
    modal({ title: 'Comprobante de pago', body: `<dl class="dl"><dt>Concepto</dt><dd>Mensualidad ${monthLabel(p.month)} ${p.month.slice(0, 4)}</dd><dt>Estudiante</dt><dd>${escape(db.get('students', p.studentId)?.firstName || '')}</dd><dt>Monto</dt><dd>${money(p.amount)}</dd><dt>Fecha</dt><dd>${p.paidAt ? dateTime(p.paidAt) : '—'}</dd><dt>Medio</dt><dd>${escape(p.method || '—')}</dd><dt>N° operación</dt><dd class="mono">${p.id.toUpperCase()}</dd></dl>`, foot: '<button class="btn btn-primary" data-close>Cerrar</button>' });
  });
}

export function renderMessages(el, { db, me, kids }) {
  el.innerHTML = `${pageHead('Mensajes', 'Conversa con los profesores de tus pupilos')}<div data-chat></div>`;
  const options = kids.flatMap(k => courseSubjects(k.courseId).map(t => ({ value: `${t.teacherId}|${k.id}`, label: `${k.firstName} · ${user(t.teacherId)?.name} (${t.subject.short})` })));
  renderChat(el.querySelector('[data-chat]'), {
    me, threads: db.query('threads', t => t.guardianId === me.id), other: t => user(t.teacherId),
    newThread: onCreate => newThreadModal({ me, role: 'apoderado', title: 'Mensaje a profesor/a', options, onCreate })
  });
  void subject;
}
