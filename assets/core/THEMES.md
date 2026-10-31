# Estilos (themes) de La Gran Web

60 estilos visuales intercambiables en todas las webs, en 7 categorías. Cada estilo cambia color,
tipografía, formas, bordes, sombras, fondo, decoración y movimiento **sin tocar el HTML ni el JS de las
apps**: las apps usan solo los tokens y las clases del kit (`assets/core/README.md`).

| Categoría (`group`) | Estilos |
|---|---|
| Modernos (`modernos`) | Aurora, Noir Neón, Brutal, Cristal, Relieve, Editorial, Terminal, Synthwave, Lujo, Caramelo, Bauhaus, Nórdico, Bosque, Pixel, Memphis, Plano, Boceto, Grafito, Cromo Y2K, Contraste |
| Era HTML5 (`html5`) | Web 2.0, iOS 6, Metro, Bootstrap 2, Flat UI, Parallax, Aqua, HTML nativo, Vintage, Material 14 |
| Formales (`formales`) | Bufete, Banca privada, Institucional, Académico |
| Terror (`terror`) | Halloween, Drácula, Slasher VHS, Cósmico, Casa embrujada |
| Fiestas y fechas (`fiestas`) | Navidad, Año Nuevo, Fiestas Patrias, San Valentín, Pascua, Día de Muertos, Carnaval, Año Nuevo Chino |
| Locos (`locos`) | Vaporwave, Glitch, Cómic, Psicodélico 70s, GeoCities 98, Risografía |
| Temáticos (`tematicos`) | Espacial, Submarino, Lejano Oeste, Steampunk, Medieval, Zen japonés, Estadio |

## Cómo está armado

```
assets/core/theme-boot.js      REGISTRO ÚNICO (THEMES + THEME_GROUPS) y cargador
assets/core/themes.css         base: tokens por defecto (= Aurora) + kit de componentes
assets/core/themes/<id>.css    una hoja por estilo (59; Aurora no tiene: css: false)
tools/check-themes.mjs         validador (registro, hojas, tokens, contraste AA estático y en vivo)
tools/check-themes.baseline.json   contrastes bajo AA conocidos de los 30 estilos originales
tools/new-theme.mjs            generador: un estilo nuevo desde 3 colores semilla
tools/lib/theme-color.mjs      utilidades de color (parse, mezcla, contraste WCAG, ajuste)
```

- **Registro** (`THEMES` en `theme-boot.js`): `{ id, name, group, dark, desc, sw: [fondo, primario, acento], fonts, anim?, css? }`.
  Es la única fuente de la lista: la leen el panel 🎨, `Alt + ← / →`, la landing, `kit.html`, la validación
  del valor guardado y el validador. `THEME_GROUPS` define las categorías (id, nombre, ícono) y su orden.
- **Carga a pedido**: `theme-boot.js` (síncrono en `<head>`) inserta `themes.css` y la hoja del estilo activo
  justo después (antes de `layouts.css` y del CSS de la app, así se conserva la cascada). Al cambiar de estilo
  en caliente espera a que la hoja nueva cargue antes de cambiar `html[data-theme]`, para no mostrar un instante
  el estilo a medias. Las hojas ya cargadas se quedan (solo aplican con su `data-theme`).
- **Fuentes**: `fonts` es el parámetro `family=` de Google Fonts css2; se cargan al activar el estilo.
- **API** (`window.LGWTheme`): `list`, `groups`, `find(id)`, `current`, `set(id)` (guarda por web),
  `next(±1)`, `ready(fn)` (cuando la hoja del estilo activo está lista). Evento `lgw:theme` (detalle: el estilo).
  `?theme=<id>` en la URL fija un estilo sin guardarlo (capturas, enlaces, pruebas).

## Agregar un estilo en 6 pasos

1. **Genera la base** con 3 colores semilla (deriva superficies, texto, apagado, líneas, estados y textos
   "sobre" color, ajustados para pasar AA) y regístralo:
   ```
   node tools/new-theme.mjs --id=oceano --name="Océano" --group=tematicos --desc="Azul profundo y espuma" \
        --bg=#06283d --primary=#47b5ff --accent=#ffd56b --head="Fraunces:wght@600;800" --body="Inter:wght@400;600" --register
   ```
   (O a mano: copia una hoja parecida de `assets/core/themes/` y agrega la entrada a `THEMES`.)
2. **Tokens** en el bloque `[data-theme="oceano"] { … }`. Obligatorios: `--font-body --font-head --bg --surface
   --text --muted --line --primary --on-primary --accent`. Recomendados: `--surface-2/3 --on-accent --on-danger
   --success --warning --danger --info --radius(-sm) --shadow(-lg) --focus color-scheme`. Superficies opacas
   (las apps ponen menús y paneles sobre `--surface`).
3. **Carácter** con reglas acotadas, siempre con `[data-theme="oceano"]` delante: títulos (`h1, h2`), `.eyebrow`
   (un prefijo en `::before` le da identidad), `.card`, `.btn` (usa `--b`/`--c` antes que pisar `background`),
   `.badge`, `.table th`, campos, `.tab`, `.nav-link.active`, `.admin-sidebar`, `.progress > i`.
   - Para lo que una app podría personalizar (fondo, bordes, `position` de `.card`) usa
     `:where([data-theme="oceano"]) .card { … }`: misma especificidad que la base, así las reglas de cada web siguen ganando.
   - Adornos de tarjeta como **capas de fondo** (`background: url(svg) top right / 60px no-repeat, var(--surface)`),
     no como pseudo-elementos que ocupen lugar.
   - Una zona con colores propios (p. ej. barra lateral oscura en un estilo claro): redefine los tokens dentro
     del componente (`[data-theme="oceano"] .admin-sidebar { --surface: …; --text: …; background: var(--surface) }`);
     el validador la revisa como contexto aparte.
4. **Decoración y movimiento** (partículas, niebla, faroles…): solo en `body::before` / `body::after`, con
   `position: fixed; z-index: -1; pointer-events: none` (detrás del contenido, sin desbordar ni capturar clics).
   `@keyframes lgw-oceano-*`. La base las detiene con `prefers-reduced-motion` y no las imprime. Nada de texto
   en las decoraciones y que no bajen el contraste de lo que queda encima.
5. **Valida**:
   ```
   node tools/check-themes.mjs --themes=oceano          # estático: registro, hoja, tokens, contraste AA
   node tools/check-themes.mjs --themes=oceano --live   # en vivo: mide el contraste real en kit.html (Playwright)
   ```
   Ambos deben terminar en `RESULTADO: OK`. Un estilo nuevo no puede tener excepciones en la línea base.
6. **Mira** `assets/core/kit.html?theme=oceano` y 2–3 webs (portada, login y panel) a 1440 y 375 px, también con
   otra disposición (Alt + ↑ / ↓): sin desborde horizontal ni errores de consola.

## Qué revisa el validador

- Registro: campos, ids únicos, grupo válido, una hoja por estilo y ninguna hoja huérfana.
- Hoja: todos los selectores acotados a su `[data-theme]` (nada se filtra a otro estilo), `@keyframes` con prefijo,
  decoraciones fijas, detrás y sin capturar clics, sin `@import`/`@font-face`.
- Tokens obligatorios presentes y `dark` coherente con la luminancia de `--bg`.
- Contraste (4,5:1, 3:1 en texto grande): texto y apagado sobre fondo y superficies, primario como enlace y sobre
  su tinte (enlace activo del panel, insignia), texto sobre primario/acento/peligro (botones, chip activo),
  insignias de estado sobre su tinte (en superficie y en el fondo de página), texto de error.
- `--live`: abre `kit.html?theme=<id>` (más un panel admin sintético), captura la página con el texto transparente
  y mide cada texto contra el fondo real que tiene detrás (degradados, adornos, decoraciones incluidos).

Los 30 estilos originales se migraron sin cambios visuales y conservan sus contrastes bajos; están anotados en
`tools/check-themes.baseline.json` (`--update-baseline` la regenera; solo pueden figurar ids de `legacy`).
