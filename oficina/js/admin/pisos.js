// Pisos de la empresa: vista general, alta desde plantilla, duplicar y eliminar.
import { escape, toast } from '../../../assets/core/ui.js';
import { pageHead, onActs, confirmDelete } from './common.js';
import { formDialog } from '../shared/form.js';
import { floorSVG } from '../shared/floorplan.js';
import { floorFromTemplate } from '../data/seed.js';
import { uid } from '../../../assets/core/db.js';

export function render(el, ctx) {
  const { db, idx } = ctx;
  el.innerHTML = pageHead('Pisos y planos', `${escape(idx.company.name)} · edita la distribución de escritorios y salas, y asigna puestos.`, '<button class="btn btn-primary" data-act="new">＋ Nuevo piso</button>') +
    (idx.floors.length ? `<div class="grid-auto" style="grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))">${idx.floors.map(f => {
      const assigned = f.desks.filter(d => idx.owner[d.id]).length, flex = f.desks.filter(d => d.type === 'flexible').length;
      const rooms = f.rooms.filter(r => r.cap).length;
      return `<div class="card stack" style="gap:10px">
        <div class="card-h" style="margin:0"><h3>${escape(f.name)}</h3><span class="badge badge-primary">${f.desks.length} puestos</span></div>
        <a href="#/pisos/${f.id}" aria-label="Editar plano del ${escape(f.name)}"><svg class="fp mini-map" viewBox="0 0 1200 760" style="aspect-ratio:1200/760">${floorSVG(f, idx, { interactive: false })}</svg></a>
        <div class="row small muted" style="gap:12px"><span>🪑 ${assigned} asignados</span><span>🟢 ${flex} flexibles</span><span>🚪 ${rooms} salas</span><span>🧭 ${f.zones.length} zonas</span></div>
        <div class="row gap-sm"><a class="btn btn-primary btn-sm" href="#/pisos/${f.id}">✎ Editar plano</a><button class="btn btn-sm" data-act="rename" data-id="${f.id}">Renombrar</button><button class="btn btn-sm btn-ghost" data-act="dup" data-id="${f.id}">Duplicar</button><button class="btn btn-sm btn-ghost" data-act="del" data-id="${f.id}" aria-label="Eliminar ${escape(f.name)}">🗑</button></div>
      </div>`;
    }).join('')}</div>` : '<div class="card empty"><span class="icon">🗺️</span>Esta empresa aún no tiene pisos. Crea el primero.</div>');
  onActs(el, {
    new: async () => {
      const num = Math.max(0, ...idx.floors.map(f => f.num)) + 1;
      const v = await formDialog({ title: 'Nuevo piso', fields: [
        { name: 'name', label: 'Nombre', required: true }, { name: 'num', label: 'Número', type: 'number', min: -5, max: 99 },
        { name: 'tpl', label: 'Plantilla', type: 'select', span: 2, options: [['T1', 'Planta con recepción y 4 zonas'], ['T2', 'Planta abierta con 6 zonas'], ['T3', 'Planta con directorio y 4 zonas'], ['empty', 'Vacía (diseñar desde cero)']] }
      ], values: { name: `Piso ${num}`, num, tpl: 'T2' } });
      if (!v) return;
      const base = v.tpl === 'empty' ? { rooms: [], zones: [{ id: 'zA', letter: 'A', name: 'Zona A', areaId: null }], desks: [] } : floorFromTemplate(v.tpl, v.num);
      base.desks.forEach(d => { d.id = `${idx.company.id}-${d.code}-${uid()}`; d.type = 'flexible'; });
      const f = db.insert('floors', { companyId: idx.company.id, num: v.num, name: v.name, template: v.tpl, w: 1200, h: 760, ...base });
      db.log('piso', `Creó ${v.name} en ${idx.company.name}`, ctx.user.id);
      toast('Piso creado: todos los puestos parten como flexibles', 'success');
      ctx.go(`/pisos/${f.id}`);
    },
    rename: async id => { const f = db.get('floors', id); const v = await formDialog({ title: 'Renombrar piso', fields: [{ name: 'name', label: 'Nombre', required: true }, { name: 'num', label: 'Número', type: 'number' }], values: f }); if (!v) return; db.update('floors', id, v); db.log('piso', `Renombró ${f.name} → ${v.name}`, ctx.user.id); toast('Piso actualizado', 'success'); },
    dup: id => {
      const f = db.get('floors', id), num = Math.max(...idx.floors.map(x => x.num)) + 1;
      const desks = f.desks.map(d => ({ ...d, id: `${idx.company.id}-${num}${d.code.slice(String(f.num).length)}-${uid()}`, code: `${num}${d.code.slice(String(f.num).length)}`, type: d.type === 'bloqueado' ? 'bloqueado' : 'flexible' }));
      db.insert('floors', { companyId: idx.company.id, num, name: `Piso ${num}`, template: f.template, w: 1200, h: 760, rooms: f.rooms.map(r => ({ ...r, id: 'r' + uid() })), zones: f.zones.map(z => ({ ...z })), desks });
      db.log('piso', `Duplicó ${f.name} como Piso ${num}`, ctx.user.id);
      toast(`Piso ${num} creado (puestos flexibles)`, 'success');
    },
    del: id => {
      const f = db.get('floors', id);
      confirmDelete(`el ${f.name} (las personas con puesto aquí quedarán sin puesto fijo)`, () => {
        const ids = new Set(f.desks.map(d => d.id));
        db.query('people', p => ids.has(p.deskId)).forEach(p => db.update('people', p.id, { deskId: null }));
        db.query('reservations', r => r.floorId === id).forEach(r => db.remove('reservations', r.id));
        db.remove('floors', id);
      }, { db, user: ctx.user, log: `Eliminó ${f.name} de ${idx.company.name}` });
    }
  });
}
