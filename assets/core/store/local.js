// Adaptador `local`: el motor histórico de La Gran Web. Guarda toda la base de una app como un JSON
// en localStorage (`lgw:db:<nombre>`), sincroniza pestañas con el evento `storage` y, si la cuota del
// dominio (~5 MB, compartida por todas las webs) se llena, libera las bases visitadas hace más tiempo.
//
// Interfaz de almacenamiento (la misma que implementa store/supabase.js; ver PRODUCTION.md §4):
//   adapter.kind                      'local' | 'supabase' | …
//   adapter.open({ name, version, fresh }) → { data, ready? }
//        data  = foto inicial síncrona (o null si hay que esperar a ready)
//        ready = Promise<data|void> opcional: hidratación remota
//   adapter.write(change, data)       después de cada mutación (puede devolver una Promise; si falla,
//                                     createDB emite { type: 'error' } y llama a adapter.recover)
//   adapter.watch(apply)              cambios desde afuera: apply({ type: 'sync', data }) o por fila
//   adapter.refresh?()                vuelve a hidratar (p. ej. tras iniciar sesión) → Promise<data>
//   adapter.lookup?(col, match, fields) búsqueda pública acotada → Promise<fila|null>
//   adapter.files?                    { upload(file, { folder }) → { path, url, name, size, type }, url(path), remove(path) }
//   adapter.auth?                     proveedor de autenticación remoto (ver auth.js)

const memory = {};
const META = 'lgw:dbmeta';
function touch(k) {
  try { const m = JSON.parse(localStorage.getItem(META) || '{}'); m[k] = Date.now(); localStorage.setItem(META, JSON.stringify(m)); } catch (e) {}
}
function evictOldest(except) {
  try {
    const m = JSON.parse(localStorage.getItem(META) || '{}');
    const keys = Object.keys(localStorage).filter(k => k.startsWith('lgw:db:') && k !== except)
      .sort((a, b) => (m[a] || 0) - (m[b] || 0));
    if (!keys.length) return false;
    localStorage.removeItem(keys[0]);
    delete m[keys[0]];
    localStorage.setItem(META, JSON.stringify(m));
    return true;
  } catch (e) { return false; }
}
export const storage = {
  get(k) { try { return localStorage.getItem(k) ?? memory[k] ?? null; } catch (e) { return memory[k] ?? null; } },
  set(k, v) {
    for (let i = 0; i < 30; i++) {
      try { localStorage.setItem(k, v); delete memory[k]; touch(k); return; }
      catch (e) { if (!evictOldest(k)) break; }
    }
    memory[k] = v;
  },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} delete memory[k]; }
};

export function localAdapter({ prefix = 'lgw:db:' } = {}) {
  let key = null, fresh = null;
  const adapter = {
    kind: 'local',
    open({ name, version, fresh: f }) {
      key = prefix + name; fresh = f;
      try {
        const raw = JSON.parse(storage.get(key));
        if (raw && raw._v === version) { touch(key); return { data: raw }; }
      } catch (e) { /* datos corruptos → reseed */ }
      const d = fresh();
      storage.set(key, JSON.stringify(d));
      return { data: d };
    },
    write(change, data) { storage.set(key, JSON.stringify(data)); },
    watch(apply) {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      window.addEventListener('storage', e => {
        if (e.key !== key) return;
        let data;
        try { data = JSON.parse(e.newValue) || fresh(); } catch (err) { return; }
        apply({ type: 'sync', data });
      });
    },
    // Búsqueda pública: en local es un find sobre la foto (mismo contrato que el adaptador remoto).
    lookup: null,
    // Archivos: en local se guardan como data: URL dentro de localStorage (máx. ~400 KB por archivo).
    files: {
      async upload(file, { folder = 'files' } = {}) {
        if (file.size > 400 * 1024) throw new Error('En modo local los archivos pueden pesar hasta 400 KB');
        const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
        const path = `${folder}/${Date.now().toString(36)}-${String(file.name || 'archivo').replace(/[^\w.-]+/g, '_')}`;
        storage.set('lgw:file:' + key + ':' + path, url);
        return { path, url, name: file.name, size: file.size, type: file.type };
      },
      url: path => storage.get('lgw:file:' + key + ':' + path),
      async remove(path) { storage.del('lgw:file:' + key + ':' + path); return true; }
    }
  };
  return adapter;
}
