// Barra flotante común a todas las demos: vuelve a la landing del portafolio.
(function () {
  var css = '.lgw-bar{position:fixed;left:16px;bottom:16px;z-index:99999;display:flex;align-items:center;gap:8px;' +
    'padding:8px 14px 8px 10px;border-radius:999px;background:rgba(12,12,20,.86);color:#fff;font:600 13px/1 system-ui,sans-serif;' +
    'text-decoration:none;box-shadow:0 6px 24px rgba(0,0,0,.25);backdrop-filter:blur(8px);transition:transform .2s}' +
    '.lgw-bar:hover{transform:translateY(-2px)}.lgw-bar span{display:inline-grid;place-items:center;width:22px;height:22px;' +
    'border-radius:50%;background:linear-gradient(135deg,#7c5cff,#00d4ff);font-size:12px}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  var a = document.createElement('a');
  a.className = 'lgw-bar';
  a.href = '../index.html';
  a.innerHTML = '<span>←</span>La Gran Web';
  a.title = 'Volver al portafolio';
  document.body.appendChild(a);
})();
