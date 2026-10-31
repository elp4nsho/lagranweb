// Adaptador `supabase`: la misma interfaz que store/local.js, sobre un proyecto Supabase real.
//
//   colecciones   → tablas Postgres { id text pk, data jsonb, created_at, updated_at } (+ columnas
//                   generadas para los campos `index`, ver tools/supabase-schema.mjs)
//   users         → tabla `profiles` { id, auth_id uuid, email, role, active, name, data }
//   db.log        → tabla `activity_log` · db.getValue/setValue → tabla `kv` { key, value jsonb }
//   auth          → Supabase Auth: correo + contraseña, enlace mágico (OTP) y registro
//   db.subscribe  → Realtime (postgres_changes) de todas las tablas de la app
//   db.files      → Storage (bucket `archivos`, público con rutas no adivinables; ver PRODUCTION.md)
//   db.lookup     → RPC lgw_lookup (seguimiento público por código + patente, campos acotados)
//
// Modelo de consistencia: lecturas síncronas sobre una foto en memoria hidratada al abrir (y de nuevo al
// iniciar sesión, porque RLS cambia lo que se ve); escrituras optimistas en cola (una a la vez, en orden).
// Si el servidor rechaza una (RLS, red, restricción), createDB avisa y este adaptador vuelve a hidratar.
// Último en escribir gana: no hay merge por campo (ver PRODUCTION.md §4 «Qué no está probado»).
//
//   import { supabaseAdapter } from './store/supabase.js';
//   const adapter = supabaseAdapter({ url: 'https://xyz.supabase.co', anonKey: 'eyJ…', bucket: 'archivos' });
//   defineApp({ …, adapter });            // defineApp llama adapter.configure({ app, collections })
//
// Pruebas: `node tools/test-adapter.mjs` contra un doble en memoria de supabase-js (tools/lib/fake-supabase.mjs).

const snake = s => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
export const tableFor = (c, tables = {}) => tables[c] || (c === 'users' ? 'profiles' : c === '_log' ? 'activity_log' : snake(c));
const PROFILE_COLS = ['id', 'authId', 'email', 'role', 'active', 'name', 'createdAt', 'updatedAt', 'password'];
const ROW_COLS = ['id', 'createdAt', 'updatedAt'];

export function toRow(col, row) {
  if (col === 'users') {
    const data = Object.fromEntries(Object.entries(row).filter(([k]) => !PROFILE_COLS.includes(k)));
    return { id: row.id, auth_id: row.authId || null, email: String(row.email || '').toLowerCase(), role: row.role, active: row.active !== false, name: row.name || '', data, created_at: row.createdAt || new Date().toISOString(), updated_at: row.updatedAt || null };
  }
  const data = Object.fromEntries(Object.entries(row).filter(([k]) => !ROW_COLS.includes(k)));
  return { id: row.id, data, created_at: row.createdAt || new Date().toISOString(), updated_at: row.updatedAt || null };
}
export function fromRow(col, r) {
  if (col === 'users') return { ...(r.data || {}), id: r.id, authId: r.auth_id || null, email: r.email, role: r.role, active: r.active !== false, name: r.name, createdAt: r.created_at, ...(r.updated_at ? { updatedAt: r.updated_at } : {}) };
  return { ...(r.data || {}), id: r.id, createdAt: r.created_at, ...(r.updated_at ? { updatedAt: r.updated_at } : {}) };
}
const logToRow = l => ({ id: l.id, at: l.at, action: l.action, detail: l.detail || '', user_id: l.user || null });
const logFromRow = r => ({ id: r.id, at: r.at, action: r.action, detail: r.detail, user: r.user_id || null });

const ES = {
  'Invalid login credentials': 'Correo o contraseña incorrectos',
  'Email not confirmed': 'Confirma tu correo antes de entrar (revisa la bandeja de entrada)',
  'User already registered': 'Ese correo ya está registrado',
  'Email rate limit exceeded': 'Demasiados correos enviados; intenta en unos minutos'
};
function fail(error, what) {
  const e = new Error(ES[error?.message] || `${what}: ${error?.message || error}`);
  e.code = error?.code; e.cause = error;
  if (error?.code === '42501') e.message = `${what}: tu rol no tiene permiso (RLS)`;
  if (error?.code === '42P01' || error?.code === 'PGRST205') e.message = `${what}: falta la tabla en Supabase; aplica schema.sql (tools/supabase-schema.mjs)`;
  return e;
}

export function supabaseAdapter({ url, anonKey, client = null, bucket = 'archivos', tables = {}, schema = 'public', pageSize = 1000, collections: cols = null } = {}) {
  let sb = client, app = 'app', collections = cols || {}, session = null, apply = null, channel = null, storageKey = null;
  let queue = Promise.resolve();
  const names = () => ['users', ...Object.keys(collections).filter(c => c !== 'users')];
  const byTable = () => Object.fromEntries(names().map(c => [tableFor(c, tables), c]));

  async function getClient() {
    if (sb) return sb;
    const factory = globalThis.__LGW_SUPABASE_FACTORY__ || (await import('../vendor/supabase.js')).createClient;
    sb = factory(url, anonKey, { auth: { storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return sb;
  }
  const setSession = u => { session = u ? { id: u.id, email: u.email } : null; };

  async function selectAll(table, order = 'created_at') {
    const out = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await sb.from(table).select('*').order(order, { ascending: false }).range(from, from + pageSize - 1);
      if (error) throw fail(error, `Leer ${table}`);
      out.push(...(data || []));
      if (!data || data.length < pageSize) return out;
    }
  }
  async function hydrate() {
    const out = { _v: 'remote', _log: [] };
    for (const c of names()) out[c] = (await selectAll(tableFor(c, tables))).map(r => fromRow(c, r));
    const { data: log, error: le } = await sb.from('activity_log').select('*').order('at', { ascending: false }).range(0, 299);
    if (le) throw fail(le, 'Leer activity_log');
    out._log = (log || []).map(logFromRow);
    const { data: kv, error: ke } = await sb.from('kv').select('*');
    if (ke) throw fail(ke, 'Leer kv');
    (kv || []).forEach(r => { out[r.key] = r.value; });
    return out;
  }
  function subscribe() {
    if (channel || !sb.channel) return;
    const map = byTable();
    channel = sb.channel(`lgw:${app}`);
    const on = (table, fn) => channel.on('postgres_changes', { event: '*', schema, table }, fn);
    for (const [table, c] of Object.entries(map)) on(table, p => {
      if (!apply) return;
      if (p.eventType === 'DELETE') apply({ type: 'remove', col: c, id: p.old?.id });
      else apply({ type: p.eventType === 'INSERT' ? 'insert' : 'update', col: c, row: fromRow(c, p.new) });
    });
    on('kv', p => { if (apply && p.eventType !== 'DELETE') apply({ type: 'value', key: p.new.key, value: p.new.value }); });
    on('activity_log', p => { if (apply && p.eventType === 'INSERT') apply({ type: 'log', row: logFromRow(p.new) }); });
    channel.subscribe();
  }

  async function doWrite(change) {
    const { type, col } = change;
    const t = col && tableFor(col, tables);
    const check = (res, what, mustTouch) => {
      if (res.error) throw fail(res.error, what);
      // UPDATE/DELETE que RLS filtra no dan error: devuelven 0 filas. Lo tratamos como rechazo.
      if (mustTouch && !(res.data || []).length) { const e = new Error(`${what}: tu rol no tiene permiso o el registro ya no existe (RLS)`); e.code = '42501'; throw e; }
    };
    if (type === 'insert') return check(await sb.from(t).insert(toRow(col, change.row)), `Crear en ${t}`);
    if (type === 'update') { const { id, ...rest } = toRow(col, change.row); if (col === 'users') delete rest.auth_id; return check(await sb.from(t).update(rest).eq('id', id).select('id'), `Guardar en ${t}`, true); }
    if (type === 'remove') return check(await sb.from(t).delete().eq('id', change.row.id).select('id'), `Eliminar en ${t}`, true);
    if (type === 'value') return check(await sb.from('kv').upsert({ key: change.key, value: change.value ?? null }, { onConflict: 'key' }), `Guardar ${change.key}`);
    if (type === 'log') return check(await sb.from('activity_log').insert(logToRow(change.row)), 'Bitácora');
    if (type === 'reset') throw new Error('«Restablecer datos demo» no existe con Supabase (los datos son reales)');
  }

  const adapter = {
    kind: 'supabase',
    canReset: false,
    get client() { return sb; },
    configure(opts = {}) { app = opts.app || app; collections = opts.collections || collections; storageKey = `lgw-auth-${app}`; },
    open() {
      storageKey ||= `lgw-auth-${app}`;
      const ready = (async () => {
        await getClient();
        const { data, error } = await sb.auth.getSession();
        if (error) console.warn('[supabase] sesión', error.message);
        setSession(data?.session?.user);
        sb.auth.onAuthStateChange?.((ev, s) => setSession(s?.user));
        const d = await hydrate();
        subscribe();
        return d;
      })();
      return { data: null, ready };
    },
    // Escrituras en cola: en orden y una a la vez. Devuelve la promesa de ESTA escritura (createDB maneja el rechazo).
    write(change) { const p = queue.then(() => doWrite(change)); queue = p.catch(() => {}); return p; },
    async recover() { return hydrate(); },
    async refresh() { await getClient(); return hydrate(); },
    watch(fn) { apply = fn; },
    async lookup(col, match, fields = null) {
      const { data, error } = await sb.rpc('lgw_lookup', { p_collection: col, p_match: match });
      if (error) throw fail(error, 'Buscar');
      if (!data) return null;
      return fields ? Object.fromEntries(fields.map(f => [f, data[f]])) : data;
    },
    files: {
      async upload(file, { folder = 'files' } = {}) {
        const rnd = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
        const path = `${app}/${folder}/${rnd}-${String(file.name || 'archivo').replace(/[^\w.-]+/g, '_')}`;
        const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (error) throw fail(error, 'Subir archivo');
        return { path, name: file.name, size: file.size, type: file.type };
      },
      url: path => (sb ? sb.storage.from(bucket).getPublicUrl(path).data.publicUrl : ''),
      async remove(path) { const { error } = await sb.storage.from(bucket).remove([path]); if (error) throw fail(error, 'Eliminar archivo'); return true; }
    },
    auth: {
      capabilities: { password: true, magicLink: true, register: true },
      session: () => session,
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw fail(error, 'Ingresar');
        setSession(data.user);
      },
      async magicLink(email, { redirectTo } = {}) {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
        if (error) throw fail(error, 'Enviar enlace');
      },
      async signUp(email, password, meta = {}) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: meta } });
        if (error) throw fail(error, 'Crear cuenta');
        setSession(data.session ? data.user : null);
      },
      // Cierra la sesión local de inmediato (la página suele navegar justo después) y avisa al servidor.
      signOut() {
        setSession(null);
        try { localStorage.removeItem(storageKey); } catch (e) {}
        return Promise.resolve(sb?.auth.signOut({ scope: 'local' })).catch(() => {});
      }
    }
  };
  return adapter;
}
