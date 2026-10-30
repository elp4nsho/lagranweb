// Tickets de soporte: bandeja con filtros, conversación, respuesta, prioridad y estado.
import { db, notify } from '../data/db.js';
import { html, raw, $, toast, dataTable, modal, dateTime, escape } from '../../../assets/core/ui.js';
import { pageHead, kpi, csvButton, wireCSV, userChip } from '../shared/admin-kit.js';

const STB = { abierto: 'warning', en_curso: 'info', resuelto: 'success' };
const PRB = { alta: 'danger', media: 'warning', baja: '' };

export function render(el, { user }) {
  const st = { status: '' };
  el.innerHTML = html`${raw(pageHead('Tickets de soporte', 'Consultas enviadas desde Cuenta → Ayuda', csvButton()))}
    <div class="kpis" id="tkpi"></div>
    <div class="row" style="gap:6px" id="tchips"><button class="chip active" data-s="">Todos</button><button class="chip" data-s="abierto">Abiertos</button><button class="chip" data-s="en_curso">En curso</button><button class="chip" data-s="resuelto">Resueltos</button></div>
    <div id="tbl"></div>`;
  const rows = () => db.query('tickets', x => !st.status || x.status === st.status).map(x => ({ ...x, who: db.get('users', x.userId), last: x.messages.at(-1)?.at || x.createdAt })).sort((a, b) => b.last.localeCompare(a.last));
  const drawKpi = () => { const all = db.all('tickets'); $('#tkpi', el).innerHTML = kpi('Abiertos', String(all.filter(x => x.status === 'abierto').length)) + kpi('En curso', String(all.filter(x => x.status === 'en_curso').length)) + kpi('Resueltos', String(all.filter(x => x.status === 'resuelto').length)) + kpi('Prioridad alta', String(all.filter(x => x.priority === 'alta' && x.status !== 'resuelto').length)); };
  const t = dataTable($('#tbl', el), {
    rows: rows(), search: r => `${r.subject} ${r.who?.name} ${r.category}`, onRow: r => open(r.id),
    columns: [
      { key: 'subject', label: 'Asunto', render: r => `<b>${escape(r.subject)}</b><br><small class="muted">${escape(r.category)} · ${r.messages.length} mensaje(s)</small>` },
      { key: 'userId', label: 'Cliente', render: r => userChip(r.who) },
      { key: 'priority', label: 'Prioridad', render: r => `<span class="badge ${PRB[r.priority] ? 'badge-' + PRB[r.priority] : ''}">${r.priority}</span>` },
      { key: 'status', label: 'Estado', render: r => `<span class="badge badge-${STB[r.status]}">${r.status.replace('_', ' ')}</span>` },
      { key: 'last', label: 'Última actividad', render: r => dateTime(r.last) }
    ]
  });
  const refresh = () => { t.update(rows()); drawKpi(); };
  el.querySelector('#tchips').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; st.status = b.dataset.s; el.querySelectorAll('#tchips .chip').forEach(c => c.classList.toggle('active', c === b)); refresh(); };
  function open(id) {
    const tk = db.get('tickets', id), u = db.get('users', tk.userId);
    const m = modal({ title: tk.subject, size: 'lg', body: `<div class="stack"><div class="row between">${userChip(u)}<span class="muted small">Plan ${escape(u?.plan || '')} · ${escape(u?.subStatus || '')}</span></div>
      <div class="msgs">${tk.messages.map(x => `<div class="msg ${x.from === 'agent' ? 'agent' : ''}">${escape(x.text)}<small>${x.from === 'agent' ? 'Soporte · ' + escape(db.get('users', x.agentId)?.name || '') : escape(u?.name || 'Cliente')} · ${dateTime(x.at)}</small></div>`).join('')}</div>
      <div class="grid-2"><div class="field"><label for="tk-st">Estado</label><select class="select" id="tk-st">${Object.keys(STB).map(s => `<option value="${s}" ${tk.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select></div>
      <div class="field"><label for="tk-pr">Prioridad</label><select class="select" id="tk-pr">${Object.keys(PRB).map(s => `<option ${tk.priority === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
      <div class="field"><label for="tk-msg">Respuesta al cliente</label><textarea class="textarea" id="tk-msg" placeholder="Hola, gracias por escribirnos…"></textarea></div></div>`,
      foot: '<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" id="tk-send">Guardar y responder</button>' });
    m.el.querySelector('#tk-send').onclick = () => {
      const text = m.el.querySelector('#tk-msg').value.trim(), status = m.el.querySelector('#tk-st').value, priority = m.el.querySelector('#tk-pr').value;
      const msgs = text ? [...tk.messages, { from: 'agent', agentId: user.id, text, at: new Date().toISOString() }] : tk.messages;
      db.update('tickets', tk.id, { messages: msgs, status: text && status === 'abierto' ? 'en_curso' : status, priority });
      if (text) notify(tk.userId, `Soporte respondió tu consulta "${tk.subject}".`);
      db.log('soporte', `Ticket "${tk.subject}" → ${status}${text ? ' (respondido)' : ''}`, user.id);
      toast('Ticket actualizado', 'success'); m.close();
    };
  }
  wireCSV(el, 'tickets.csv', () => rows().map(r => ({ asunto: r.subject, cliente: r.who?.name, categoria: r.category, prioridad: r.priority, estado: r.status, mensajes: r.messages.length, ultima: r.last })));
  drawKpi();
  return { update: refresh };
}
