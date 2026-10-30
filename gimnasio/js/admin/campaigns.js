import { escape, toast, confirm, formModal, dateTime } from '../../../assets/core/ui.js';
import { db, auth } from '../data/db.js';
import { pageHead, statCard } from '../shared/shell.js';
import { listView, actBtn } from '../shared/crud.js';
import { icon } from '../shared/icons.js';

const SEG = { activo: 'Socios activos', moroso: 'Morosos', baja: 'Ex socios', leads: 'Prospectos (leads)', congelado: 'Congelados' };
const CH = { email: 'Correo', sms: 'SMS', whatsapp: 'WhatsApp', push: 'Push app' };
const ST = { borrador: '', programada: 'info', enviada: 'success' };
const audience = seg => seg === 'leads' ? 4820 : db.count('members', m => m.status === seg);
export function renderCampaigns(v) {
  const sent = db.query('campaigns', c => c.status === 'enviada');
  const reach = sent.reduce((s, c) => s + c.reach, 0), conv = sent.reduce((s, c) => s + c.conversions, 0);
  v.innerHTML = `${pageHead('Campañas', 'Comunicaciones de marketing y retención (envío simulado).', `<button class="btn btn-primary" data-new>${icon('plus', 16)} Nueva campaña</button>`)}
  <div class="grid-3">${statCard('Campañas enviadas', sent.length, '', 'megaphone')}${statCard('Alcance total', reach.toLocaleString('es-CL'), '', 'users')}${statCard('Conversiones', conv, `<span class="muted small">${reach ? (conv / reach * 100).toFixed(1).replace('.', ',') : 0}% de conversión</span>`, 'check')}</div>
  <div class="card" data-list></div>`;
  const edit = async c => {
    const val = await formModal({ title: c ? 'Editar campaña' : 'Nueva campaña', fields: [
      { name: 'name', label: 'Nombre', required: true, value: c?.name }, { name: 'channel', label: 'Canal', type: 'select', options: Object.entries(CH), value: c?.channel },
      { name: 'segment', label: 'Segmento', type: 'select', options: Object.entries(SEG).map(([k, l]) => [k, `${l} (${audience(k)})`]), value: c?.segment },
      { name: 'message', label: 'Mensaje', type: 'textarea', required: true, value: c?.message }] });
    if (!val) return;
    c ? db.update('campaigns', c.id, val) : db.insert('campaigns', { ...val, status: 'borrador', sentAt: '', reach: 0, opens: 0, conversions: 0 });
    db.log('campaña', `${c ? 'Editada' : 'Creada'}: ${val.name}`, auth.current()?.id); toast('Campaña guardada', 'success');
  };
  listView(v.querySelector('[data-list]'), {
    rows: () => db.all('campaigns'), search: c => `${c.name} ${c.message}`,
    filters: [{ key: 'status', label: 'Estado', options: Object.keys(ST) }, { key: 'channel', label: 'Canal', options: Object.entries(CH) }],
    columns: [{ key: 'name', label: 'Campaña', render: c => `<b>${escape(c.name)}</b><br><small class="muted">${escape(c.message)}</small>` }, { key: 'channel', label: 'Canal', render: c => CH[c.channel] }, { key: 'segment', label: 'Segmento', render: c => SEG[c.segment] },
      { key: 'reach', label: 'Alcance' }, { key: 'conversions', label: 'Conv.' }, { key: 'status', label: 'Estado', render: c => `<span class="badge ${ST[c.status] ? 'badge-' + ST[c.status] : ''}">${c.status}</span>${c.sentAt ? `<br><small class="muted">${escape(dateTime(c.sentAt))}</small>` : ''}` },
      { key: 'id', label: '', sort: false, render: c => `<div class="acts-cell">${c.status !== 'enviada' ? `<button class="btn btn-sm btn-primary" data-act="send" data-id="${c.id}">Enviar</button>` : ''}${actBtn('edit', c.id, 'edit', 'Editar')}${actBtn('del', c.id, 'trash', 'Eliminar')}</div>` }],
    onAction: async (act, id) => {
      const c = db.get('campaigns', id);
      if (act === 'edit') return edit(c);
      if (act === 'send') {
        const n = audience(c.segment);
        if (!await confirm(`Enviar "${c.name}" por ${CH[c.channel]} a ${n} destinatarios?`, { title: 'Enviar campaña', ok: 'Enviar ahora' })) return;
        db.update('campaigns', id, { status: 'enviada', sentAt: new Date().toISOString(), reach: n, opens: c.channel === 'sms' ? 0 : Math.round(n * (.3 + Math.random() * .3)), conversions: Math.round(n * (.01 + Math.random() * .04)) });
        db.log('campaña', `Enviada: ${c.name} a ${n}`, auth.current()?.id); return toast(`Campaña enviada a ${n} destinatarios`, 'success');
      }
      if (await confirm(`¿Eliminar "${c.name}"?`, { title: 'Eliminar campaña', danger: true, ok: 'Eliminar' })) { db.remove('campaigns', id); toast('Campaña eliminada', 'success'); }
    },
    csv: { name: 'campanas.csv', map: c => ({ campana: c.name, canal: CH[c.channel], segmento: SEG[c.segment], estado: c.status, alcance: c.reach, aperturas: c.opens, conversiones: c.conversions }) }
  });
  v.querySelector('[data-new]').onclick = () => edit(null);
}
