// Automatizaciones de correo (simuladas): carrito abandonado, post-compra, reseñas, recompra.
import { db } from '../data/db.js';
import { pageHead, table, badge, kpi } from '../shared/admin-kit.js';
import { escape, money, num, toast, confirm, formModal, modal, ago } from '../../../assets/core/ui.js';

const TRIG = { carrito: 'Carrito abandonado', compra: 'Después de la compra', entrega: 'Después de la entrega' };
const rate = (a, b) => (b ? a / b * 100 : 0).toFixed(1).replace('.', ',') + '%';

async function edit(a, ctx) {
  const v = await formModal({ title: a ? 'Editar automatización' : 'Nueva automatización', size: 'lg', fields: [
    { name: 'name', label: 'Nombre', value: a?.name || '', required: true },
    { name: 'trigger', label: 'Disparador', type: 'select', value: a?.trigger || 'carrito', options: Object.entries(TRIG) },
    { name: 'delayHours', label: 'Esperar (horas)', type: 'number', value: a?.delayHours ?? 1 },
    { name: 'subject', label: 'Asunto', value: a?.subject || '', required: true },
    { name: 'body', label: 'Mensaje (usa {nombre}, {pack}, {pedido})', type: 'textarea', value: a?.body || '' },
    { name: 'coupon', label: 'Cupón incluido (opcional)', type: 'select', value: a?.coupon || '', options: [['', 'Ninguno'], ...db.all('coupons').map(c => [c.code, c.code])] },
    { name: 'active', label: 'Activa', type: 'checkbox', value: a ? a.active : true }
  ] });
  if (!v) return;
  if (a) db.update('automations', a.id, v); else db.insert('automations', { ...v, sent: 0, opened: 0, clicked: 0, revenue: 0 });
  db.log(a ? 'Automatización editada' : 'Automatización creada', v.name, ctx.user.id);
  toast('Automatización guardada', 'success');
}

function preview(a) {
  const body = a.body.replace(/\{nombre\}/g, 'Valentina').replace(/\{pack\}/g, '2 Aquilo').replace(/\{pedido\}/g, 'AQ-10420');
  modal({ title: 'Vista previa del correo', body: `<div class="stack"><div class="small muted">De: Aquilo &lt;hola@aquilo.cl&gt; · Para: valentina@correo.cl</div>
    <b>${escape(a.subject.replace(/\{nombre\}/g, 'Valentina').replace(/\{pedido\}/g, 'AQ-10420'))}</b><div class="email-prev">${escape(body)}${a.coupon ? `\n\nTu código: ${escape(a.coupon)}` : ''}\n\n— El equipo de Aquilo 💧</div></div>`,
    foot: '<button class="btn btn-primary" data-close>Cerrar</button>' });
}

export default {
  id: 'automatizaciones', label: 'Automatizaciones', ico: '✉️', group: 'Marketing', roles: ['admin', 'marketing'],
  render(view, ctx) {
    const rows = db.all('automations');
    const emails = db.all('emails').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    view.innerHTML = `${pageHead('Automatizaciones de correo', 'Flujos simulados. Los envíos reales del sitio (confirmaciones, recordatorios) se registran abajo.', '<button class="btn btn-primary" data-new>＋ Nueva</button>')}
      <div class="kpis">
        ${kpi('Correos enviados', num(rows.reduce((s, a) => s + a.sent, 0)), { ico: '📤' })}
        ${kpi('Tasa de apertura', rate(rows.reduce((s, a) => s + a.opened, 0), rows.reduce((s, a) => s + a.sent, 0)), { ico: '👀' })}
        ${kpi('Tasa de clics', rate(rows.reduce((s, a) => s + a.clicked, 0), rows.reduce((s, a) => s + a.sent, 0)), { ico: '🖱️' })}
        ${kpi('Ventas atribuidas', money(rows.reduce((s, a) => s + a.revenue, 0)), { ico: '💰' })}
      </div>
      <div class="grid-auto">${rows.map(a => `<div class="card stack">
        <div class="row between" style="flex-wrap:nowrap"><b>${escape(a.name)}</b><label class="switch"><input type="checkbox" data-toggle="${a.id}" ${a.active ? 'checked' : ''} aria-label="Activa"><span></span></label></div>
        <div class="row small" style="gap:6px">${badge(TRIG[a.trigger], 'info')}${badge(a.delayHours >= 24 ? Math.round(a.delayHours / 24) + ' días' : a.delayHours + ' h', '')}${a.coupon ? badge(a.coupon, 'primary') : ''}</div>
        <p class="small muted" style="margin:0">«${escape(a.subject)}»</p>
        <div class="grid-3 small"><div><span class="muted">Enviados</span><br><b>${num(a.sent)}</b></div><div><span class="muted">Apertura</span><br><b>${rate(a.opened, a.sent)}</b></div><div><span class="muted">Clics</span><br><b>${rate(a.clicked, a.sent)}</b></div></div>
        <div class="row" style="gap:6px"><button class="btn btn-sm" data-prev="${a.id}">Vista previa</button><button class="btn btn-sm" data-test="${a.id}">Enviar prueba</button><button class="btn btn-sm btn-ghost" data-edit="${a.id}">Editar</button><button class="btn btn-sm btn-ghost" data-del="${a.id}" aria-label="Eliminar">✕</button></div>
      </div>`).join('')}</div>
      <div class="card"><div class="card-title"><h3>Registro de envíos</h3></div><div id="log"></div></div>`;
    table(view.querySelector('#log'), {
      id: 'emails', rows: emails, pageSize: 8, search: e => `${e.to} ${e.subject}`,
      columns: [
        { key: 'createdAt', label: 'Cuándo', render: e => escape(ago(e.createdAt)) },
        { key: 'to', label: 'Para' }, { key: 'subject', label: 'Asunto' },
        { key: 'automation', label: 'Flujo', render: e => escape(db.get('automations', e.automation)?.name || 'Manual') },
        { key: 'status', label: 'Estado', render: e => badge(e.status, e.status === 'clic' ? 'success' : e.status === 'abierto' ? 'info' : '') }
      ],
      csv: { name: 'envios-correo.csv', map: e => ({ fecha: e.createdAt, para: e.to, asunto: e.subject, estado: e.status }) }
    });
    view.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-new]')) edit(null, ctx);
      if (t.dataset.edit) edit(db.get('automations', t.dataset.edit), ctx);
      if (t.dataset.prev) preview(db.get('automations', t.dataset.prev));
      if (t.dataset.test) { const a = db.get('automations', t.dataset.test); db.insert('emails', { to: ctx.user.email, subject: '[PRUEBA] ' + a.subject, automation: a.id, status: 'enviado' }); toast(`Prueba enviada a ${ctx.user.email}`, 'success'); }
      if (t.dataset.del) { const a = db.get('automations', t.dataset.del); if (await confirm(`¿Eliminar «${a.name}»?`, { danger: true, ok: 'Eliminar' })) { db.remove('automations', a.id); db.log('Automatización eliminada', a.name, ctx.user.id); toast('Eliminada', 'success'); } }
    };
    view.onchange = e => { const id = e.target.dataset.toggle; if (!id) return; const a = db.update('automations', id, { active: e.target.checked }); db.log('Automatización', `${a.name}: ${a.active ? 'activada' : 'pausada'}`, ctx.user.id); toast(a.active ? 'Automatización activada' : 'Automatización pausada', 'success'); };
  }
};
