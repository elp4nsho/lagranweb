# Videos de las demos

Motor para grabar recorridos en video (1920×1080, WebM VP9, 30 fps) de cada sistema del
portafolio, con cursor visible, subtítulos, tarjetas de capítulo y línea de tiempo para YouTube.
El recorrido funciona además como prueba de punta a punta: si un paso falla, la grabación se
corta con una captura del error.

```bash
node tools/video/run.js automotora            # video final → tools/video/out/automotora.webm
node tools/video/run.js automotora --fast     # sin video, pausas cortas (prueba rápida del recorrido)
node tools/video/run.js automotora --preview  # video rápido de codificar, para revisar el guion
```

Otras opciones: `--no-video`, `--keep-frames` (no borra los JPEG), `--crf=30` (calidad VP9; más
alto = archivo más chico), `--port=8840`, `--encode-on-fail`. Si nada responde en el puerto, se
levanta `python3 -m http.server` en la raíz del repo. Requiere Playwright (Chromium) y ffmpeg.

## Salidas (`out/`, ignorada por git)

| Archivo | Contenido |
|---|---|
| `<app>.webm` | Video final. |
| `<app>.chapters.md` | Capítulos `mm:ss Título` para YouTube + título y descripción sugeridos. |
| `<app>.timeline.md` / `.json` | Cada paso con su minuto y las incidencias de QA (errores de página, consola, avisos esperados que no aparecieron, clics tapados). |
| `<app>.captions.vtt` | Los subtítulos en pantalla como WebVTT (para subir a YouTube como subtítulos). |
| `errors/*.png` | Captura del paso que falló. |

## Piezas

- `lib/recorder.js` — CDP `Page.startScreencast` (JPEG calidad 92, 1920×1080, DPR 1). Guarda cada
  cuadro con su hora; cuando la página está quieta no llegan cuadros y el último se mantiene el
  tiempo real (demuxer concat con duraciones) y `-fps_mode cfr` lo lleva a 30 fps. `pause()` /
  `resume()` cortan tramos. Codifica `libvpx-vp9 -crf 30 -b:v 0 -row-mt 1`, yuv420p, sin audio.
- `lib/overlay.js` — se inyecta en cada documento con `addInitScript` (antes que la app): cursor
  falso que sigue al mouse real con onda al hacer clic, subtítulo inferior, tarjetas a pantalla
  completa y anillo de foco. Vive en un shadow DOM con `pointer-events: none`; su estado está en
  `sessionStorage`, así sobrevive a las navegaciones (una tarjeta puede quedar encima mientras se
  inicia sesión detrás). En iframes reenvía el mouse al frame superior.
- `lib/director.js` — API del guion: `chapter()`, `step()`, `caption()`, `click()` (scroll suave,
  deslizamiento con curva y aceleración, verificación de que el punto le pega al elemento),
  `type()` (con retardo por tecla), `select()`, `slide()` (rangos), `drag()` (HTML5 DnD),
  `tour()` (recorrer una página), `ring()`, `expectToast()`, `phone()` y las salidas.
- `lib/cards.js`, `lib/mockup.js` — HTML de tarjetas (intro, capítulo, cierre) y de la maqueta de
  celular (iframe 390×844 de la misma procedencia, servida en `/__rec/phone.html` vía `page.route`).
- `tours/<app>.js` — el guion de cada sistema: `module.exports = { meta, run(d) }`.

## Escribir un recorrido nuevo

```js
const meta = { dir: 'tienda', youtube: { title: '…', description: '…' } };
async function run(d) {
  d.recorder?.pause();
  await d.goto('index.html#/', { waitFor: '.site-hero' });
  await d.intro({ title: 'Raíz', lead: '…', chips: ['Cliente', 'Administrador'] }, 0);
  d.recorder?.resume(); await d.hold(5);
  await d.chapter('Catálogo', 'Filtros y carrito', async () => { /* corre detrás de la tarjeta */ });
  await d.step('Filtrar', async () => {
    await d.caption('Filtros en vivo', 'Categoría y precio');
    await d.click('[data-cat="plantas"]');
    await d.expectToast(/Agregado/);
  });
  await d.outro({ title: 'Raíz', url: 'https://elp4nsho.github.io/tienda/' }, 6);
}
module.exports = { meta, run };
```

Limitaciones conocidas: los `<select>` nativos, la imagen de arrastre (DnD), las descargas y el
diálogo de impresión no se ven en una captura headless (se muestran el gesto y el resultado); la
grabación es en tiempo real y la codificación VP9 tarda ~2× la duración del video con 4 núcleos.

Consejos: usa selectores estables (`data-*`), espera resultados con `expectToast` /
`page.locator(...).waitFor()` en vez de pausas fijas, y deja las pausas (`after`, `read`) para el
ritmo de lectura. Prueba primero con `--fast`.
