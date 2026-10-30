// Página 1920×1080 con un celular (iframe 390×844 de la misma procedencia) y un texto al lado.
// Director.phone() la sirve en /__rec/phone.html mediante page.route.
const { esc } = require('./cards');

/** { src: '/automotora/index.html#/', title, lead, bullets: [], label } */
function phoneMockupHTML({ src = '/', title = '', lead = '', bullets = [], label = 'Vista celular · 390 × 844' }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Celular</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">
<style>
  *{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden}
  body{font-family:Inter,system-ui,sans-serif;color:#fff;background:radial-gradient(1000px 700px at 12% 15%,rgba(124,92,255,.5),transparent 60%),radial-gradient(900px 600px at 95% 95%,rgba(0,212,255,.32),transparent 60%),#070a1a;
    display:grid;grid-template-columns:1fr 470px 1fr;align-items:center;gap:40px;padding:0 70px}
  .side{max-width:560px}
  .kick{font-size:17px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ffcf66}
  h1{font-size:56px;line-height:1.05;margin:14px 0 18px;font-weight:800;letter-spacing:-.02em}
  p{font-size:24px;line-height:1.45;color:#d8dbf2;margin:0}
  ul{margin:26px 0 0;padding:0;list-style:none;font-size:22px;line-height:1.5;color:#e3e5fb}
  ul li{margin:8px 0}ul li::before{content:'›';color:#ffcf66;font-weight:800;margin-right:12px}
  .phone{justify-self:center;position:relative;width:422px;height:918px;border-radius:62px;padding:16px;background:linear-gradient(145deg,#2b2f45,#0d0f1a);
    box-shadow:0 0 0 2px #444a66,0 40px 90px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,255,255,.08)}
  .screen{width:390px;height:886px;border-radius:46px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
  .status{flex:none;height:42px;display:flex;align-items:center;justify-content:space-between;padding:6px 30px 0;font:600 15px Inter,system-ui,sans-serif;color:#111;background:#fff;position:relative}
  .status::after{content:'';position:absolute;top:9px;left:50%;transform:translateX(-50%);width:112px;height:28px;border-radius:16px;background:#05060c}
  .status i{display:inline-block;width:24px;height:11px;border:1.5px solid #111;border-radius:3px;position:relative}.status i::after{content:'';position:absolute;inset:1.5px;right:5px;background:#111;border-radius:1px}
  iframe{display:block;width:390px;height:844px;border:0;background:#fff}
  .tag{position:absolute;bottom:-44px;left:0;right:0;text-align:center;font-size:16px;color:#9ea3c7;font-weight:600}
</style></head><body>
  <div class="side"><div class="kick">${esc(label)}</div><h1>${esc(title)}</h1><p>${esc(lead)}</p></div>
  <div class="phone"><div class="screen"><div class="status"><span>9:41</span><i></i></div><iframe id="phone" src="${esc(src)}" title="Sitio en celular"></iframe></div><div class="tag">Mismo sitio, disposición "App"</div></div>
  <div class="side"><ul>${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>
</body></html>`;
}

module.exports = { phoneMockupHTML };
