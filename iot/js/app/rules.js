// Editor de reglas de alarma: sensor, condición, umbral, duración, severidad y destinatarios.
import { db } from '../data/db.js';
import { toast, formModal, confirm } from '../../../assets/core/ui.js';
import { h, raw } from '../shared/h.js';
import { TYPES, rulesFor, value, status } from '../shared/sim.js';
import { pageHead, sevBadge } from '../shared/common.js';

const TAGS = [['', 'Todos los del tipo'], ['agua', 'Agua de mar (jaulas)'], ['camara', 'Cámaras de frío'], ['linea', 'Línea de proceso'], ['motor', 'Motores y compresores'], ['riles', 'Efluentes RILes'], ['general', 'Tablero general'], ['generador', 'Generadores'], ['proceso', 'Proceso'], ['frio', 'Sistema de frío']];

export function render(el, ctx) {
  const write = ctx.can('app.reglas');
  const rules = db.all('rules');
  const devices = db.all('devices');
  el.innerHTML = pageHead('Reglas de alarma', 'Una alarma se dispara cuando la condición se cumple sin interrupción durante la duración indicada.', write ? '<button class="btn btn-primary btn-sm" data-new>+ Nueva regla</button>' : '', !write) + h`
  <div class="table-wrap"><table class="table"><thead><tr><th>Activa</th><th>Regla</th><th>Aplica a</th><th>Condición</th><th>Duración</th><th>Severidad</th><th class="hide-sm">Notificar a</th><th>Ahora</th><th></th></tr></thead><tbody>
  ${rules.map(r => {
    const scope = r.deviceId ? devices.filter(d => d.id === r.deviceId) : devices.filter(d => d.type === r.type && (!r.tag || d.tag === r.tag));
    const firing = r.active ? scope.filter(d => rulesFor(d, [r]).length && status(d, value(d), [r]) === 'alarm').length : 0;
    return h`<tr><td><label class="switch"><input type="checkbox" data-toggle="${r.id}" ${r.active ? 'checked' : ''} ${write ? '' : 'disabled'} aria-label="Activar ${r.name}"><span></span></label></td>
      <td><b>${r.name}</b></td><td class="small">${r.deviceId ? (scope[0]?.name || 'Dispositivo eliminado') : `${TYPES[r.type]?.label} · ${TAGS.find(t => t[0] === (r.tag || ''))?.[1]}`}<br><span class="muted">${scope.length} sensor(es)</span></td>
      <td class="mono">${r.op} ${r.threshold} ${TYPES[r.type]?.unit || ''}</td><td>${r.duration} s</td><td>${raw(sevBadge(r.severity))}</td><td class="small hide-sm">${r.notify}</td>
      <td>${raw(firing ? `<span class="badge badge-danger">${firing} en alarma</span>` : '<span class="badge badge-success">OK</span>')}</td>
      <td class="right nowrap">${write ? raw(`<button class="btn btn-sm btn-ghost" data-edit="${r.id}">Editar</button><button class="btn btn-sm btn-ghost" data-dup="${r.id}" aria-label="Duplicar">⧉</button><button class="btn btn-sm btn-ghost" data-del="${r.id}" aria-label="Eliminar">🗑</button>`) : ''}</td></tr>`;
  })}</tbody></table></div>
  <p class="small muted">Consejo demo: el sensor "Oxígeno disuelto J4", "Cámara 2 · sonda A" y "Compresor amoníaco 2" tienen anomalías periódicas que disparan alarmas cada pocos minutos.</p>`;
  if (!write) return;
  const user = ctx.user;
  const fields = r => [
    { name: 'name', label: 'Nombre', required: true, value: r?.name },
    { name: 'type', label: 'Tipo de sensor', type: 'select', options: Object.entries(TYPES).map(([k, t]) => [k, t.label]), value: r?.type || 'temperatura' },
    { name: 'tag', label: 'Grupo de sensores', type: 'select', options: TAGS, value: r?.tag || '' },
    { name: 'deviceId', label: 'O un dispositivo específico (opcional)', type: 'select', options: [['', '— Ninguno —'], ...devices.map(d => [d.id, `${d.name} (${d.code})`])], value: r?.deviceId || '' },
    { name: 'op', label: 'Condición', type: 'select', options: [['>', 'Mayor que'], ['<', 'Menor que']], value: r?.op || '>' },
    { name: 'threshold', label: 'Umbral', type: 'number', step: '0.1', required: true, value: r?.threshold ?? 0 },
    { name: 'duration', label: 'Duración mínima (segundos)', type: 'number', required: true, value: r?.duration ?? 30 },
    { name: 'severity', label: 'Severidad', type: 'select', options: [['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], value: r?.severity || 'media' },
    { name: 'notify', label: 'Notificar a', value: r?.notify || 'Turno de operación', help: 'Correos, roles o grupos (simulado).' },
    { name: 'active', label: 'Regla activa', type: 'checkbox', value: r ? r.active : true },
  ];
  const save = async (r, copy) => {
    const v = await formModal({ title: r && !copy ? 'Editar regla' : 'Nueva regla', fields: fields(copy ? { ...r, name: r.name + ' (copia)' } : r) });
    if (!v) return;
    if (v.deviceId) v.type = db.get('devices', v.deviceId).type;
    if (!(v.duration >= 0)) return toast('Duración inválida', 'warning');
    if (r && !copy) db.update('rules', r.id, v); else db.insert('rules', v);
    db.log('regla', `${user.name} ${r && !copy ? 'editó' : 'creó'} la regla "${v.name}" (${v.op} ${v.threshold}, ${v.duration} s)`, user.id);
    toast('Regla guardada', 'success');
  };
  el.querySelector('[data-new]').onclick = () => save(null);
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => save(db.get('rules', b.dataset.edit)));
  el.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => save(db.get('rules', b.dataset.dup), true));
  el.querySelectorAll('[data-toggle]').forEach(i => i.onchange = () => { const r = db.update('rules', i.dataset.toggle, { active: i.checked }); db.log('regla', `${user.name} ${i.checked ? 'activó' : 'desactivó'} "${r.name}"`, user.id); toast('Regla actualizada', 'success'); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const r = db.get('rules', b.dataset.del); if (await confirm(`¿Eliminar la regla "${r.name}"? Las alarmas existentes se conservan.`, { title: 'Eliminar regla', ok: 'Eliminar', danger: true })) { db.remove('rules', r.id); db.log('regla', `${user.name} eliminó "${r.name}"`, user.id); toast('Regla eliminada', 'info'); } });
}
