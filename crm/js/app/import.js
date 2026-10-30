// Importar contactos pegando o subiendo un CSV: detección de columnas, validación y duplicados.
import { db } from '../data/db.js';
import { escape, toast, norm } from '../../../assets/core/ui.js';
import { parseCSV, isEmail } from '../shared/util.js';
import { pageHead } from './components.js';
import { icon } from '../shared/icons.js';

const SAMPLE = `nombre;correo;telefono;cargo;empresa
Florencia Ibáñez;fibanez@lacteoslagos.cl;+56 9 6123 4455;Gerenta Comercial;Lácteos Los Lagos
Martín Quiroga;mquiroga@lacteoslagos.cl;+56 9 7788 1122;Jefe de Ventas;Lácteos Los Lagos
Renata Pino;rpino@constructoracordillera.cl;+56 9 5544 3322;Jefa de Compras;Constructora Cordillera
Cristián Barra;cbarra@correo;+56 9 4433 2211;Analista;Servicios Norte Grande
Josefa Lagos;jlagos@vinalosaromos.cl;;Subgerenta de TI;Viña Los Aromos`;
const MAP = { name: ['nombre', 'name', 'contacto', 'nombre completo'], email: ['correo', 'email', 'e-mail', 'mail'], phone: ['telefono', 'teléfono', 'fono', 'celular', 'phone'], title: ['cargo', 'puesto', 'title'], company: ['empresa', 'compania', 'compañía', 'company', 'razon social'] };
const state = { text: '', rows: null, result: null };

export function render(view, { user }) {
  view.innerHTML = `
    ${pageHead('Importar contactos', 'Pega filas desde Excel/Sheets o sube un archivo CSV')}
    <div class="detail-grid">
      <section class="card stack">
        <div class="row between"><h3 style="margin:0">1. Datos</h3><div class="row" style="gap:6px"><button class="btn btn-sm" data-sample>Cargar ejemplo</button><label class="btn btn-sm">${icon('upload', 14)} Subir CSV<input type="file" accept=".csv,text/csv,text/plain" data-file hidden></label></div></div>
        <textarea class="textarea mono" data-text style="min-height:200px" placeholder="nombre;correo;telefono;cargo;empresa">${escape(state.text)}</textarea>
        <div class="row between"><small class="muted">Separador ; o , · la primera fila debe tener los encabezados</small><button class="btn btn-primary" data-preview>Previsualizar</button></div>
      </section>
      <aside class="card stack">
        <h3 style="margin:0">Columnas reconocidas</h3>
        <ul class="kv small">${Object.entries({ name: 'Nombre *', email: 'Correo *', phone: 'Teléfono', title: 'Cargo', company: 'Empresa *' }).map(([k, l]) => `<li><span>${l}</span><code>${MAP[k].slice(0, 2).join(' / ')}</code></li>`).join('')}</ul>
        <label class="check"><input type="checkbox" data-create checked> Crear empresas que no existan</label>
        <label class="check"><input type="checkbox" data-skip checked> Omitir correos duplicados</label>
      </aside>
    </div>
    <div data-out></div>`;
  const ta = view.querySelector('[data-text]');
  ta.oninput = () => { state.text = ta.value; };
  view.querySelector('[data-sample]').onclick = () => { state.result = null; state.text = SAMPLE; ta.value = SAMPLE; preview(); };
  view.querySelector('[data-file]').onchange = async e => { const f = e.target.files[0]; if (!f) return; state.text = await f.text(); ta.value = state.text; preview(); };
  view.querySelector('[data-preview]').onclick = () => { state.text = ta.value; preview(); };
  const out = view.querySelector('[data-out]');

  function preview() {
    state.result = null;
    const grid = parseCSV(state.text);
    if (grid.length < 2) { out.innerHTML = '<div class="card empty">Pega al menos una fila de encabezados y una de datos.</div>'; return; }
    const head = grid[0].map(h => norm(h));
    const idx = Object.fromEntries(Object.entries(MAP).map(([k, keys]) => [k, head.findIndex(h => keys.map(norm).includes(h))]));
    if (idx.name < 0 || idx.email < 0) { out.innerHTML = '<div class="card empty">No encontré las columnas <b>nombre</b> y <b>correo</b> en la primera fila.</div>'; return; }
    const seen = new Set();
    state.rows = grid.slice(1).map(r => {
      const row = Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, i >= 0 ? (r[i] || '').trim() : '']));
      const issues = [];
      if (!row.name) issues.push('Sin nombre');
      if (!isEmail(row.email)) issues.push('Correo inválido');
      const dup = isEmail(row.email) && (db.find('contacts', c => c.email.toLowerCase() === row.email.toLowerCase()) || seen.has(row.email.toLowerCase()));
      seen.add(row.email.toLowerCase());
      const comp = row.company && db.find('companies', c => norm(c.name) === norm(row.company));
      if (!row.company) issues.push('Sin empresa');
      return { ...row, issues, dup: !!dup, newCompany: !!row.company && !comp };
    });
    const ok = state.rows.filter(r => !r.issues.length && !r.dup).length;
    out.innerHTML = `<section class="card stack">
      <div class="row between"><h3 style="margin:0">2. Revisión</h3><div class="row" style="gap:6px"><span class="badge badge-success">${ok} listos</span><span class="badge badge-warning">${state.rows.filter(r => r.dup).length} duplicados</span><span class="badge badge-danger">${state.rows.filter(r => r.issues.length).length} con errores</span></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Estado</th><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Cargo</th><th>Empresa</th></tr></thead><tbody>
        ${state.rows.map(r => `<tr><td>${r.issues.length ? `<span class="badge badge-danger">${escape(r.issues.join(', '))}</span>` : r.dup ? '<span class="badge badge-warning">Duplicado</span>' : '<span class="badge badge-success">OK</span>'}</td><td>${escape(r.name)}</td><td>${escape(r.email)}</td><td>${escape(r.phone)}</td><td>${escape(r.title)}</td><td>${escape(r.company)}${r.newCompany ? ' <span class="badge badge-info plain">nueva</span>' : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-run ${ok || !view.querySelector('[data-skip]').checked ? '' : 'disabled'}>${icon('upload', 16)} Importar contactos</button></div>
    </section>`;
    out.querySelector('[data-run]').onclick = run;
  }
  if (state.result) out.innerHTML = state.result;
  else if (state.rows && state.text) preview();
  function run() {
    const create = view.querySelector('[data-create]').checked, skip = view.querySelector('[data-skip]').checked;
    let added = 0, companies = 0, skipped = 0;
    state.rows.forEach(r => {
      if (r.issues.length || (r.dup && skip)) { skipped++; return; }
      let comp = db.find('companies', c => norm(c.name) === norm(r.company));
      if (!comp) {
        if (!create) { skipped++; return; }
        comp = db.insert('companies', { name: r.company, industry: 'Servicios profesionales', city: 'Santiago', size: '11-50', rut: '', website: '', phone: '', ownerId: user.id });
        companies++;
      }
      const existing = db.find('contacts', c => c.email.toLowerCase() === r.email.toLowerCase());
      if (existing) db.update('contacts', existing.id, { name: r.name, phone: r.phone || existing.phone, title: r.title || existing.title });
      else db.insert('contacts', { name: r.name, email: r.email, phone: r.phone, title: r.title, companyId: comp.id, ownerId: user.id, tags: ['importado'] });
      added++;
    });
    db.log('importación', `Importó ${added} contactos (${companies} empresas nuevas, ${skipped} omitidos)`, user.id);
    toast(`${added} contactos importados`, 'success');
    state.result = `<section class="card stack"><h3 style="margin:0">${icon('check', 20)} Importación completa</h3><p>${added} contactos importados, ${companies} empresas creadas y ${skipped} filas omitidas.</p><div class="row"><a class="btn btn-primary" href="#/contactos">Ver contactos</a></div></section>`;
    out.innerHTML = state.result;
    state.rows = null; state.text = '';
  }
}
