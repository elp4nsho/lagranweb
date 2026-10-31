// Doble en memoria de la parte de @supabase/supabase-js que usa assets/core/store/supabase.js.
// JavaScript puro (sin imports de Node): corre en Node (tools/test-adapter.mjs) y en el navegador
// (tools/check-produccion.mjs lo inyecta con page.addInitScript para probar un build en modo supabase).
//
//   const server = createFakeServer({ policy, rpc, onSignup });
//   const sb = server.client();                 // como createClient(url, key, opts)
//   sb.from('ots').select('*').eq('id', 'x')    // → { data, error }  (thenable, como postgrest-js)
//   sb.channel('c').on('postgres_changes', { event: '*', schema: 'public', table: 'ots' }, cb).subscribe()
//   sb.auth.signInWithPassword / signInWithOtp / signUp / signOut / getSession / onAuthStateChange
//   sb.storage.from('archivos').upload / getPublicUrl / remove · sb.rpc('lgw_lookup', args)
//
// Superficie cubierta (y SOLO esa): select('*'), insert, update, upsert(onConflict), delete, eq, order,
// range, select() tras insert/update/delete (returning). Errores con los mismos códigos que PostgREST:
// 42501 (RLS en INSERT), 23505 (clave duplicada), PGRST205 (tabla inexistente). RLS se emula con
// `policy({ table, op, row, user, server })` → boolean; como en Postgres, UPDATE/DELETE/SELECT filtran en
// silencio y INSERT falla. Realtime entrega cambios de forma asíncrona y respeta `policy` de lectura.
// NO emula: SQL real, triggers (salvo onSignup), columnas generadas, filtros que no sean eq, JWT reales.

const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const tick = () => new Promise(r => setTimeout(r, 0));
let seq = 0;
const uuid = () => (globalThis.crypto?.randomUUID?.() || `00000000-0000-4000-8000-${(++seq).toString(16).padStart(12, '0')}`);

export function createFakeServer({ tables = {}, policy = null, rpc = {}, onSignup = null, autoConfirm = true, persist = null, pk = { kv: 'key' } } = {}) {
  const server = {
    tables: {}, users: [], outbox: [], storage: {}, channels: new Set(), log: [], policy, rpc, onSignup, autoConfirm, pk,
    keyOf: t => pk[t] || 'id',
    save() { if (persist) try { persist.setItem('fake-supabase', JSON.stringify({ tables: server.tables, users: server.users, storage: server.storage, outbox: server.outbox })); } catch (e) {} },
    addUser({ email, password = null, confirmed = true, id = uuid(), meta = {} }) { const u = { id, email: email.toLowerCase(), password, confirmed, meta }; server.users.push(u); server.save(); return u; },
    allowed(table, op, row, user) { return !server.policy || server.policy({ table, op, row, user, server }) !== false; },
    broadcast(table, eventType, row, old) {
      for (const ch of server.channels) {
        if (!ch.subscribed) continue;
        for (const h of ch.handlers) {
          if (h.filter.table && h.filter.table !== table) continue;
          if (h.filter.event && h.filter.event !== '*' && h.filter.event !== eventType) continue;
          const visible = eventType === 'DELETE' || server.allowed(table, 'select', row, ch.client._user());
          if (!visible) continue;
          const payload = { schema: 'public', table, eventType, new: eventType === 'DELETE' ? {} : clone(row), old: eventType === 'DELETE' ? { [server.keyOf(table)]: old[server.keyOf(table)] } : clone(old || {}) };
          setTimeout(() => h.cb(payload), 0);
        }
      }
    },
    client(opts = {}) { return makeClient(server, opts); },
    // Simula hacer clic en el enlace mágico más reciente enviado a ese correo, en ese cliente.
    async followMagicLink(client, email) {
      const m = [...server.outbox].reverse().find(x => x.email === email.toLowerCase());
      if (!m) throw new Error('No hay enlace para ' + email);
      const u = server.users.find(x => x.email === m.email);
      u.confirmed = true;
      client.auth._setSession(u, 'SIGNED_IN');
      return m;
    }
  };
  if (persist) { try { const s = JSON.parse(persist.getItem('fake-supabase') || 'null'); if (s) Object.assign(server, { tables: s.tables, users: s.users, storage: s.storage, outbox: s.outbox || [] }); } catch (e) {} }
  for (const [t, rows] of Object.entries(tables)) if (!server.tables[t]) server.tables[t] = clone(rows);
  return server;
}

function makeClient(server, { storage = globalThis.localStorage || null, storageKey = 'sb-fake-auth-token' } = {}) {
  let session = null;
  const listeners = new Set();
  try { const s = storage && JSON.parse(storage.getItem(storageKey) || 'null'); if (s?.user) session = s; } catch (e) {}
  const client = {
    _user: () => (session ? server.users.find(u => u.id === session.user.id) || null : null),
    from: table => new Query(server, client, table),
    async rpc(name, args) {
      await tick();
      const fn = server.rpc[name];
      if (!fn) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${name}` } };
      try { return { data: clone(fn(args, client._user(), server)), error: null }; } catch (e) { return { data: null, error: { message: e.message, code: e.code || 'P0001' } }; }
    },
    channel(name) {
      const ch = { name, client, handlers: [], subscribed: false,
        on(type, filter, cb) { if (type === 'postgres_changes') ch.handlers.push({ filter, cb }); return ch; },
        subscribe(cb) { ch.subscribed = true; server.channels.add(ch); setTimeout(() => cb && cb('SUBSCRIBED'), 0); return ch; },
        unsubscribe() { ch.subscribed = false; server.channels.delete(ch); return Promise.resolve('ok'); } };
      return ch;
    },
    removeChannel(ch) { return ch.unsubscribe(); },
    auth: {
      _setSession(u, event) {
        session = u ? { access_token: 'fake.' + u.id, user: { id: u.id, email: u.email, user_metadata: u.meta } } : null;
        try { storage && (session ? storage.setItem(storageKey, JSON.stringify(session)) : storage.removeItem(storageKey)); } catch (e) {}
        listeners.forEach(cb => setTimeout(() => cb(event, session), 0));
      },
      async getSession() { await tick(); return { data: { session: clone(session) }, error: null }; },
      async getUser() { await tick(); return { data: { user: clone(session?.user || null) }, error: null }; },
      onAuthStateChange(cb) { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }; },
      async signInWithPassword({ email, password }) {
        await tick();
        const u = server.users.find(x => x.email === String(email).toLowerCase());
        if (!u || !u.password || u.password !== password) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400 } };
        if (!u.confirmed) return { data: { user: null, session: null }, error: { message: 'Email not confirmed', status: 400 } };
        client.auth._setSession(u, 'SIGNED_IN');
        return { data: { user: clone(session.user), session: clone(session) }, error: null };
      },
      async signInWithOtp({ email, options = {} }) {
        await tick();
        email = String(email).toLowerCase();
        let u = server.users.find(x => x.email === email);
        if (!u) {
          if (options.shouldCreateUser === false) return { data: {}, error: { message: 'Signups not allowed for otp', status: 422 } };
          u = server.addUser({ email, confirmed: false });
          server.onSignup && server.onSignup(u, server);
        }
        server.outbox.push({ email, redirectTo: options.emailRedirectTo || null, at: Date.now() });
        server.save();
        return { data: { user: null, session: null }, error: null };
      },
      async signUp({ email, password, options = {} }) {
        await tick();
        email = String(email).toLowerCase();
        if (server.users.some(x => x.email === email)) return { data: { user: null, session: null }, error: { message: 'User already registered', status: 422 } };
        const u = server.addUser({ email, password, confirmed: server.autoConfirm, meta: options.data || {} });
        server.onSignup && server.onSignup(u, server);
        if (server.autoConfirm) client.auth._setSession(u, 'SIGNED_IN');
        return { data: { user: { id: u.id, email }, session: clone(session) }, error: null };
      },
      async signOut() { await tick(); client.auth._setSession(null, 'SIGNED_OUT'); return { error: null }; }
    },
    storage: {
      from(bucket) {
        const b = (server.storage[bucket] ||= {});
        return {
          async upload(path, file, opts = {}) {
            await tick();
            if (!server.allowed('storage.objects', 'insert', { bucket, path }, client._user())) return { data: null, error: { message: 'new row violates row-level security policy', statusCode: '403' } };
            if (b[path] && !opts.upsert) return { data: null, error: { message: 'The resource already exists', statusCode: '409' } };
            b[path] = { size: file?.size ?? 0, type: opts.contentType || file?.type || '', owner: client._user()?.id || null };
            server.save();
            return { data: { path, fullPath: `${bucket}/${path}` }, error: null };
          },
          getPublicUrl: path => ({ data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
          async remove(paths) { await tick(); const out = paths.filter(p => b[p]).map(p => { delete b[p]; return { name: p }; }); server.save(); return { data: out, error: null }; }
        };
      }
    }
  };
  return client;
}

class Query {
  constructor(server, client, table) { Object.assign(this, { server, client, table, op: 'select', filters: [], orderBy: null, rng: null, payload: null, returning: false, onConflict: null, one: null }); }
  select() { if (this.op === 'select') this.op = 'select'; else this.returning = true; return this; }
  insert(rows) { this.op = 'insert'; this.payload = [rows].flat(); return this; }
  upsert(rows, { onConflict } = {}) { this.op = 'upsert'; this.payload = [rows].flat(); this.onConflict = onConflict || this.server.keyOf(this.table); return this; }
  update(patch) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col, v) { this.filters.push(r => r[col] === v); return this; }
  order(col, { ascending = true } = {}) { this.orderBy = { col, ascending }; return this; }
  range(a, b) { this.rng = [a, b]; return this; }
  limit(n) { this.rng = [0, n - 1]; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  then(res, rej) { return tick().then(() => this.exec()).then(res, rej); }
  exec() {
    const { server, table } = this, user = this.client._user();
    const rows = server.tables[table];
    if (!rows) return { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` } };
    const match = r => this.filters.every(f => f(r));
    const key = server.keyOf(table);
    const now = new Date().toISOString();
    if (this.op === 'select') {
      let out = rows.filter(r => match(r) && server.allowed(table, 'select', r, user));
      if (this.orderBy) { const { col, ascending } = this.orderBy; out = out.slice().sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (ascending ? 1 : -1)); }
      if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
      if (this.one) { if (out.length > 1 || (this.one === 'single' && !out.length)) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }; return { data: clone(out[0] || null), error: null }; }
      return { data: clone(out), error: null };
    }
    if (this.op === 'insert' || this.op === 'upsert') {
      const done = [];
      for (const p of this.payload) {
        const row = { created_at: now, ...clone(p) };
        const i = rows.findIndex(r => r[this.onConflict || key] === row[this.onConflict || key]);
        if (i >= 0 && this.op === 'insert') return { data: null, error: { code: '23505', message: `duplicate key value violates unique constraint "${table}_pkey"` } };
        if (i >= 0) {
          if (!server.allowed(table, 'update', rows[i], user)) return { data: null, error: { code: '42501', message: `new row violates row-level security policy for table "${table}"` } };
          const old = rows[i]; rows[i] = { ...old, ...row }; done.push(rows[i]); server.broadcast(table, 'UPDATE', rows[i], old);
        } else {
          if (!server.allowed(table, 'insert', row, user)) return { data: null, error: { code: '42501', message: `new row violates row-level security policy for table "${table}"` } };
          rows.push(row); done.push(row); server.broadcast(table, 'INSERT', row, null);
        }
      }
      server.log.push({ op: this.op, table, n: done.length }); server.save();
      return { data: this.returning ? clone(done) : null, error: null };
    }
    if (this.op === 'update') {
      const hit = rows.filter(r => match(r) && server.allowed(table, 'update', r, user));
      for (const r of hit) { const old = clone(r); Object.assign(r, clone(this.payload)); server.broadcast(table, 'UPDATE', r, old); }
      server.log.push({ op: 'update', table, n: hit.length }); server.save();
      return { data: this.returning ? clone(hit) : null, error: null };
    }
    if (this.op === 'delete') {
      const hit = rows.filter(r => match(r) && server.allowed(table, 'delete', r, user));
      server.tables[table] = rows.filter(r => !hit.includes(r));
      hit.forEach(r => server.broadcast(table, 'DELETE', null, r));
      server.log.push({ op: 'delete', table, n: hit.length }); server.save();
      return { data: this.returning ? clone(hit) : null, error: null };
    }
    return { data: null, error: { message: 'op no soportada: ' + this.op } };
  }
}
