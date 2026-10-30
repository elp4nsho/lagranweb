// Router por hash con parámetros: '#/productos/:id'.
//
//   const router = createRouter({
//     '/': () => renderHome(),
//     '/productos/:id': ({ id }) => renderProduct(id),
//   }, { notFound: () => render404(), before: (path) => true });
//   router.start();  router.go('/productos/abc');

export function createRouter(routes, { notFound, before, after } = {}) {
  const table = Object.entries(routes).map(([pattern, handler]) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }).replace(/\/$/, '') + '/?$');
    return { pattern, re, keys, handler };
  });

  function parse() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs = ''] = raw.split('?');
    return { path: path.startsWith('/') ? path : '/' + path, query: Object.fromEntries(new URLSearchParams(qs)) };
  }

  async function resolve() {
    const { path, query } = parse();
    if (before && before(path, query) === false) return;
    for (const r of table) {
      const m = path.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      router.current = { path, params, query, pattern: r.pattern };
      await r.handler({ ...params }, query);
      after && after(router.current);
      return;
    }
    router.current = { path, params: {}, query, pattern: null };
    notFound ? notFound(path) : null;
    after && after(router.current);
  }

  const router = {
    current: null,
    start() { window.addEventListener('hashchange', resolve); resolve(); return router; },
    go(path) { if (location.hash === '#' + path) resolve(); else location.hash = path; },
    refresh: resolve,
    // Marca como .active los <a href="#/..."> que coinciden con la ruta actual.
    highlight(scope = document, cls = 'active') {
      const { path } = parse();
      scope.querySelectorAll('a[href^="#/"]').forEach(a => {
        const href = a.getAttribute('href').slice(1);
        const on = href === '/' ? path === '/' : (path === href || path.startsWith(href + '/'));
        a.classList.toggle(cls, on);
        on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
      });
    }
  };
  return router;
}
