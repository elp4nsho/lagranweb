// Newsletter: suscriptores y compositor de campañas con envío simulado.
import { escape, toast, confirm, date, dateTime, num, pct, modal, sleep, barChart } from '../../../assets/core/ui.js';
import { db, liveArticles, category } from '../data/db.js';
import { pageHead, table, actBtn, formDialog, f, badge } from '../shared/admin-kit.js';
import { art } from '../shared/art.js';

let tab = 'campaigns';
const LISTS = { diario: 'Diario (7:00)', semanal: 'Resumen semanal' };
const CAMP = { draft: ['Borrador', ''], sending: ['Enviando', 'info'], sent: ['Enviada', 'success'] };

function composer(el, ctx, c) {
  const isNew = !c;
  const v = c ? structuredClone(c) : { subject: '', list: 'diario', intro: 'Buenos días. Esto es lo que necesitas saber hoy.', articleIds: liveArticles().slice(0, 4).map(a => a.id), status: 'draft' };
  const recent = liveArticles().slice(0, 18);
  const audience = l => db.count('subscribers', s => s.status === 'active' && (s.lists || []).includes(l));
  el.innerHTML = `${pageHead(isNew ? 'Nueva campaña' : 'Editar campaña', '<a href="#/newsletter">← Newsletter</a>', '')}
    <div class="detail-grid">
      <form class="card stack" data-f novalidate>
        ${f.text('subject', 'Asunto', v.subject, { required: true, placeholder: 'Ej: Las 5 noticias que debes saber hoy' })}
        ${f.select('list', 'Lista', Object.entries(LISTS).map(([k, l]) => [k, `${l} · ${audience(k)} suscriptores`]), v.list)}
        ${f.area('intro', 'Introducción', v.intro, { rows: 3 })}
        <div class="field"><span class="label">Artículos incluidos (${v.articleIds.length})</span><div class="stack" style="gap:6px;max-height:340px;overflow:auto">${recent.map(a => `<label class="check small"><input type="checkbox" name="art_${a.id}" ${v.articleIds.includes(a.id) ? 'checked' : ''}> <span><b>${escape(category(a.categoryId)?.name || '')}</b> · ${escape(a.title)}</span></label>`).join('')}</div></div>
        <div class="row" style="gap:8px"><button type="button" class="btn" data-save>Guardar borrador</button><button type="button" class="btn" data-test>Enviar prueba</button><button type="button" class="btn btn-primary" data-send>Enviar ahora →</button></div>
      </form>
      <div class="card"><h3>Vista previa del correo</h3><div class="campaign-preview" data-prev></div></div>
    </div>`;
  const form = el.querySelector('[data-f]');
  const read = () => ({ subject: form.subject.value.trim(), list: form.list.value, intro: form.intro.value.trim(), articleIds: recent.filter(a => form[`art_${a.id}`].checked).map(a => a.id) });
  const prev = () => { const x = read(); el.querySelector('[data-prev]').innerHTML = `<small class="muted">De: Brújula Noticias &lt;newsletter@brujula.cl&gt;</small><h3 style="margin:6px 0">${escape(x.subject || '(sin asunto)')}</h3><p>${escape(x.intro)}</p>${x.articleIds.map(id => { const a = db.get('articles', id); return `<div class="row" style="gap:10px;flex-wrap:nowrap;margin:10px 0"><div style="width:90px;flex:none">${art(a.cover, { ratio: '4/3' })}</div><div><h4 style="margin:0">${escape(a.title)}</h4><small class="muted">${escape(a.dek)}</small></div></div>`; }).join('')}<hr><small class="muted">Recibes este correo porque te suscribiste en brujula.cl · Darse de baja</small>`; };
  form.addEventListener('input', prev); form.addEventListener('change', prev); prev();
  const save = (extra = {}) => { const x = { ...read(), ...extra }; if (c) return db.update('campaigns', c.id, x); return db.insert('campaigns', { ...x, status: 'draft', recipients: 0, opens: 0, clicks: 0, sentAt: null }); };
  el.querySelector('[data-save]').onclick = () => { if (!form.subject.value.trim()) { form.subject.classList.add('invalid'); return toast('Escribe un asunto', 'warning'); } const s = save(); toast('Borrador guardado', 'success'); if (isNew) ctx.go(`/newsletter/${s.id}`); };
  el.querySelector('[data-test]').onclick = () => toast(`Prueba enviada a ${ctx.user.email} (simulado)`, 'info');
  el.querySelector('[data-send]').onclick = async () => {
    const x = read();
    if (!x.subject) { form.subject.classList.add('invalid'); return toast('Escribe un asunto', 'warning'); }
    if (!x.articleIds.length) return toast('Incluye al menos un artículo', 'warning');
    const n = audience(x.list);
    if (!await confirm(`Se enviará “${x.subject}” a ${n} suscriptores de la lista ${LISTS[x.list]}. ¿Continuar?`, { title: 'Enviar campaña', ok: 'Enviar' })) return;
    const m = modal({ title: 'Enviando campaña…', body: `<p data-msg>Preparando envío…</p><div class="progress"><i data-bar style="--v:0%"></i></div>` });
    for (let i = 1; i <= 10; i++) { await sleep(140); m.el.querySelector('[data-bar]').style.setProperty('--v', i * 10 + '%'); m.el.querySelector('[data-msg]').textContent = `Enviados ${Math.round(n * i / 10)} de ${n}`; }
    m.close();
    const s = save({ status: 'sent', sentAt: new Date().toISOString(), recipients: n, opens: Math.round(n * (.35 + Math.random() * .15)), clicks: Math.round(n * (.07 + Math.random() * .06)) });
    db.log('newsletter', `Envió la campaña “${x.subject}” a ${n} suscriptores`, ctx.user.id);
    toast(`Campaña enviada a ${n} suscriptores`, 'success');
    ctx.go('/newsletter');
    return s;
  };
}

export default {
  id: 'newsletter', path: '/newsletter', label: 'Newsletter', icon: '✉', group: 'Audiencia', perm: 'newsletter', live: true,
  render(el, ctx, params) {
    this.live = !params.id;
    if (params.id) return composer(el, ctx, params.id === 'nueva' ? null : db.get('campaigns', params.id));
    const subs = db.all('subscribers'), camps = db.all('campaigns');
    const active = subs.filter(s => s.status === 'active');
    const sent = camps.filter(c => c.status === 'sent');
    const openRate = sent.reduce((s, c) => s + c.opens, 0) / Math.max(1, sent.reduce((s, c) => s + c.recipients, 0)) * 100;
    const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i, 1); return d; });
    el.innerHTML = `${pageHead('Newsletter', `${num(active.length)} suscriptores activos · apertura promedio ${pct(openRate, 1)}`, '<a class="btn btn-primary" href="#/newsletter/nueva">＋ Nueva campaña</a>')}
      <div class="grid-2"><div class="card"><h3>Altas por mes</h3>${barChart(months.map(d => ({ label: d.toLocaleDateString('es-CL', { month: 'short' }), value: subs.filter(s => { const c = new Date(s.createdAt); return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear(); }).length })))}</div>
        <div class="card"><h3>Listas</h3><ul class="mini-list">${Object.entries(LISTS).map(([k, l]) => `<li><span>${l}</span><b>${active.filter(s => (s.lists || []).includes(k)).length}</b></li>`).join('')}<li><span>Dados de baja</span><b>${subs.length - active.length}</b></li></ul></div></div>
      <div class="tabs"><button class="tab ${tab === 'campaigns' ? 'active' : ''}" data-tab="campaigns">Campañas</button><button class="tab ${tab === 'subs' ? 'active' : ''}" data-tab="subs">Suscriptores</button></div><div data-t></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; this.render(el, ctx, params); });
    const t = el.querySelector('[data-t]');
    if (tab === 'campaigns') table(t, {
      id: 'camps', rows: camps.map(c => ({ ...c, _when: c.sentAt || c.createdAt })), sort: '_when', dir: -1, search: c => c.subject,
      filters: [{ key: 'status', label: 'Estado', options: Object.entries(CAMP).map(([k, [l]]) => [k, l]) }],
      columns: [
        { key: 'subject', label: 'Asunto', render: c => `<b>${escape(c.subject)}</b><br><small class="muted">${LISTS[c.list]} · ${(c.articleIds || []).length} artículos</small>` },
        { key: '_when', label: 'Fecha', render: c => `<span class="small">${c.sentAt ? dateTime(c.sentAt) : '—'}</span>` },
        { key: 'recipients', label: 'Destinatarios', render: c => num(c.recipients) },
        { key: 'opens', label: 'Apertura', render: c => (c.recipients ? pct(c.opens / c.recipients * 100, 1) : '—') },
        { key: 'clicks', label: 'Clics', render: c => (c.recipients ? pct(c.clicks / c.recipients * 100, 1) : '—') },
        { key: 'status', label: 'Estado', render: c => badge(c.status, CAMP) }
      ],
      actions: c => (c.status === 'draft' ? actBtn('edit', 'Editar', '✎') : actBtn('dup', 'Duplicar', '⧉')) + actBtn('del', 'Eliminar', '🗑'),
      onRow: c => c.status === 'draft' && ctx.go(`/newsletter/${c.id}`),
      onAction: async (a, c) => {
        if (a === 'edit') ctx.go(`/newsletter/${c.id}`);
        if (a === 'dup') { const n = db.insert('campaigns', { subject: c.subject + ' (copia)', list: c.list, intro: c.intro, articleIds: c.articleIds, status: 'draft', recipients: 0, opens: 0, clicks: 0, sentAt: null }); ctx.go(`/newsletter/${n.id}`); }
        if (a === 'del' && await confirm('¿Eliminar la campaña?', { danger: true, ok: 'Eliminar' })) { db.remove('campaigns', c.id); toast('Campaña eliminada', 'success'); }
      },
      csv: { name: 'campanas', map: c => ({ asunto: c.subject, lista: c.list, fecha: c.sentAt ? date(c.sentAt) : '', destinatarios: c.recipients, aperturas: c.opens, clics: c.clicks }) }
    });
    else {
      table(t, {
        id: 'subs', rows: subs, sort: 'createdAt', dir: -1, pageSize: 12, search: s => `${s.email} ${s.name}`,
        toolbar: '<button class="btn btn-sm btn-primary" data-add>＋ Agregar</button>',
        filters: [{ key: 'status', label: 'Estado', options: [['active', 'Activo'], ['unsubscribed', 'De baja']] }, { key: 'list', label: 'Lista', options: Object.entries(LISTS), test: (s, v) => (s.lists || []).includes(v) }, { key: 'source', label: 'Origen', options: [...new Set(subs.map(s => s.source))] }],
        columns: [
          { key: 'email', label: 'Correo', render: s => `<b>${escape(s.email)}</b>${s.name ? `<br><small class="muted">${escape(s.name)}</small>` : ''}` },
          { key: 'lists', label: 'Listas', sort: false, render: s => (s.lists || []).map(l => `<span class="badge plain">${l}</span>`).join(' ') },
          { key: 'source', label: 'Origen' },
          { key: 'createdAt', label: 'Alta', render: s => `<span class="small">${date(s.createdAt)}</span>` },
          { key: 'status', label: 'Estado', render: s => badge(s.status, { active: ['Activo', 'success'], unsubscribed: ['De baja', ''] }) }
        ],
        actions: s => actBtn('toggle', s.status === 'active' ? 'Dar de baja' : 'Reactivar', s.status === 'active' ? '⏸' : '▶') + actBtn('del', 'Eliminar', '🗑'),
        onAction: async (a, s) => {
          if (a === 'toggle') { db.update('subscribers', s.id, { status: s.status === 'active' ? 'unsubscribed' : 'active' }); toast('Suscriptor actualizado', 'success'); }
          if (a === 'del' && await confirm(`¿Eliminar ${s.email}?`, { danger: true, ok: 'Eliminar' })) { db.remove('subscribers', s.id); toast('Eliminado', 'success'); }
        },
        csv: { name: 'suscriptores', map: s => ({ correo: s.email, nombre: s.name, listas: (s.lists || []).join(', '), origen: s.source, estado: s.status, alta: date(s.createdAt) }) }
      });
      t.querySelector('[data-add]').onclick = () => formDialog({ title: 'Agregar suscriptor', body: `${f.text('email', 'Correo', '', { required: true, type: 'email' })}${f.text('name', 'Nombre', '')}${f.check('diario', 'Diario', true)}${f.check('semanal', 'Semanal', false)}`, onSubmit: v => { if (db.find('subscribers', s => s.email.toLowerCase() === v.email.toLowerCase())) { toast('Ese correo ya está registrado', 'error'); return false; } db.insert('subscribers', { email: v.email, name: v.name, lists: ['diario', 'semanal'].filter(k => v[k]), status: 'active', source: 'Manual' }); toast('Suscriptor agregado', 'success'); } });
    }
  }
};
