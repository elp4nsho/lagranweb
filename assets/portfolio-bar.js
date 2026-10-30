// Barra flotante común: vuelve al portafolio y abre el selector de los 30 estilos.
(function () {
  // Relleno de formularios con datos ficticios (misma carpeta que este script).
  var self = document.currentScript && document.currentScript.src;
  if (self) {
    var f = document.createElement('script');
    f.src = self.replace(/portfolio-bar\.js.*$/, 'demo-fill.js');
    document.body.appendChild(f);
  }
  var css = '' +
    '.lgw-dock{position:fixed;left:16px;bottom:16px;z-index:99999;display:flex;gap:6px;font:600 13px/1 system-ui,sans-serif}' +
    '.lgw-dock a,.lgw-dock button{display:flex;align-items:center;gap:8px;height:38px;padding:0 14px 0 8px;border:0;border-radius:999px;' +
    'background:rgba(12,12,20,.88);color:#fff;font:inherit;text-decoration:none;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.3);backdrop-filter:blur(8px)}' +
    '.lgw-dock a:hover,.lgw-dock button:hover{background:#000}' +
    '.lgw-dock i{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#7c5cff,#00d4ff);font-style:normal;font-size:12px}' +
    '.lgw-pal{position:fixed;left:16px;bottom:64px;z-index:99999;width:min(440px,calc(100vw - 32px));max-height:min(70vh,640px);overflow:auto;padding:14px;border-radius:18px;' +
    'background:rgba(14,14,22,.96);color:#fff;font:13px/1.3 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(12px)}' +
    '.lgw-pal[hidden]{display:none}.lgw-pal h4{margin:10px 4px 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9a9ab0;font-weight:700}' +
    '.lgw-pal .g{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}' +
    '.lgw-pal button{display:flex;gap:10px;align-items:center;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.04);color:#fff;font:inherit;text-align:left;cursor:pointer}' +
    '.lgw-pal button:hover{border-color:rgba(255,255,255,.3)}.lgw-pal button[aria-pressed=true]{border-color:#00d4ff;background:rgba(0,212,255,.12)}' +
    '.lgw-pal .sw{flex:none;width:34px;height:34px;border-radius:9px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}' +
    '.lgw-pal .sw span:first-child{grid-row:span 2}.lgw-pal b{display:block;font-size:13px}.lgw-pal small{color:#9a9ab0;font-size:11px}' +
    '.lgw-pal .top{display:flex;justify-content:space-between;align-items:center;gap:8px}.lgw-pal .top span{color:#9a9ab0;font-size:11px}' +
    '.lgw-pal .lay{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.lgw-pal .lay button{flex-direction:column;align-items:stretch;text-align:center;gap:6px}' +
    '.lgw-pal .lay svg{width:100%;height:46px;display:block;border-radius:6px;background:rgba(255,255,255,.06)}' +
    '@media print{.lgw-dock,.lgw-pal{display:none!important}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var dock = document.createElement('div');
  dock.className = 'lgw-dock';
  // En la landing no hace falta el botón de volver.
  if (document.documentElement.getAttribute('data-app') !== 'portal')
    dock.innerHTML = '<a href="../index.html" title="Volver al portafolio"><i>←</i>La Gran Web</a>';
  document.body.appendChild(dock);

  var T = window.LGWTheme;
  if (!T) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<i>🎨</i><span>Estilo</span>';
  btn.title = 'Estilo y disposición';
  dock.appendChild(btn);

  var pal = document.createElement('div');
  pal.className = 'lgw-pal';
  pal.hidden = true;
  pal.setAttribute('role', 'dialog');
  pal.setAttribute('aria-label', 'Elegir estilo');
  document.body.appendChild(pal);

  function item(t, i) {
    return '<button type="button" data-t="' + t.id + '" aria-pressed="' + (t.id === T.current) + '">' +
      '<span class="sw"><span style="background:' + t.sw[0] + '"></span><span style="background:' + t.sw[1] + '"></span><span style="background:' + t.sw[2] + '"></span></span>' +
      '<span><b>' + (i + 1) + '. ' + t.name + '</b><small>' + t.desc + '</small></span></button>';
  }
  // Miniaturas de cada disposición.
  var WIRE = {
    clasica: '<rect x="4" y="4" width="72" height="6" rx="2"/><rect x="14" y="14" width="52" height="12" rx="2" opacity=".6"/><rect x="4" y="30" width="22" height="12" rx="2" opacity=".4"/><rect x="29" y="30" width="22" height="12" rx="2" opacity=".4"/><rect x="54" y="30" width="22" height="12" rx="2" opacity=".4"/>',
    revista: '<rect x="26" y="3" width="28" height="5" rx="1"/><rect x="4" y="11" width="72" height="1.5"/><rect x="4" y="16" width="38" height="14" rx="2" opacity=".6"/><rect x="45" y="16" width="31" height="14" rx="2" opacity=".35"/><rect x="4" y="33" width="46" height="10" rx="2" opacity=".4"/><rect x="53" y="33" width="23" height="10" rx="2" opacity=".4"/>',
    app: '<rect x="4" y="4" width="16" height="38" rx="2"/><rect x="24" y="4" width="52" height="11" rx="2" opacity=".6"/><rect x="24" y="18" width="33" height="11" rx="2" opacity=".4"/><rect x="60" y="18" width="16" height="11" rx="2" opacity=".4"/><rect x="24" y="32" width="16" height="10" rx="2" opacity=".4"/><rect x="43" y="32" width="33" height="10" rx="2" opacity=".4"/>'
  };
  function render() {
    var L = window.LGWLayout, lay = '';
    if (L) L.list.forEach(function (l) {
      lay += '<button type="button" data-l="' + l.id + '" aria-pressed="' + (l.id === L.current) + '" title="' + l.desc + '">' +
        '<svg viewBox="0 0 80 46" fill="currentColor">' + (WIRE[l.id] || '') + '</svg><b>' + l.name + '</b></button>';
    });
    var modern = '', html5 = '';
    T.list.forEach(function (t, i) { if (t.group === 'html5') html5 += item(t, i); else modern += item(t, i); });
    pal.innerHTML = (lay ? '<h4 style="margin-top:2px">Disposición · Alt + ↑ / ↓</h4><div class="lay">' + lay + '</div>' : '') +
      '<div class="top" style="margin-top:12px"><b>30 estilos</b><span>Atajo: Alt + ← / →</span></div>' +
      '<h4>Modernos</h4><div class="g">' + modern + '</div>' +
      '<h4>Era HTML5 · animate.css</h4><div class="g">' + html5 + '</div>';
    var cur = T.list.find(function (t) { return t.id === T.current; });
    btn.querySelector('span').textContent = cur ? cur.name : 'Estilo';
  }
  render();
  btn.addEventListener('click', function () {
    pal.hidden = !pal.hidden;
    btn.setAttribute('aria-expanded', String(!pal.hidden));
    if (!pal.hidden) { render(); var a = pal.querySelector('[aria-pressed=true]'); a && a.focus(); }
  });
  pal.addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (b) T.set(b.getAttribute('data-t'));
    var l = e.target.closest('[data-l]');
    if (l && window.LGWLayout) { LGWLayout.set(l.getAttribute('data-l')); render(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pal.hidden) { pal.hidden = true; btn.focus(); }
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); T.next(e.key === 'ArrowRight' ? 1 : -1); }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && window.LGWLayout) {
      e.preventDefault();
      var ids = LGWLayout.list.map(function (x) { return x.id; }), i = ids.indexOf(LGWLayout.current);
      LGWLayout.set(ids[(i + (e.key === 'ArrowDown' ? 1 : -1) + ids.length) % ids.length]); render();
    }
  });
  document.addEventListener('click', function (e) {
    if (!pal.hidden && !pal.contains(e.target) && !dock.contains(e.target)) pal.hidden = true;
  });
  window.addEventListener('lgw:theme', render);
})();
