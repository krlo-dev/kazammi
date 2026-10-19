---
name: Kazammi
description: Reconocedor de canciones con FFT propia, un instrumento de luz sobre un campo índigo.
colors:
  ink-0: "#050609"
  ink-1: "#0b0726"
  ink-2: "#1a1045"
  horizon: "#342393"
  teal: "#1fd1a5"
  violet: "#6036a4"
  magenta: "#c03cff"
  fg: "#ffffff"
  fg-2: "#b9b4dc"
  fg-3: "#9a94c2"
  danger: "#ff8a9a"
  glass: "rgb(255 255 255 / 0.06)"
  glass-strong: "rgb(255 255 255 / 0.1)"
  hairline: "rgb(255 255 255 / 0.1)"
  action: "#f3f3f3"
  action-ink: "#0b0a10"
  card: "#191919"
  field: "#242326"
  muted: "#8b8f98"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 8vw, 5rem)"
    fontWeight: 300
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontFeature: "\"ss01\", \"cv11\""
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)"
    fontWeight: 300
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-long:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  field: "10px"
  button: "12px"
  thumb: "14px"
  menu: "16px"
  row: "20px"
  panel: "24px"
  sheet: "28px"
  full: "999px"
spacing:
  gutter-sm: "16px"
  gutter-md: "24px"
  gutter-lg: "40px"
  row-gap: "10px"
  section: "56px"
  container: "72rem"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.button}"
    padding: "0 24px"
    height: "48px"
  button-pill:
    backgroundColor: "rgb(255 255 255 / 0.08)"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "44px"
  button-pill-hover:
    backgroundColor: "rgb(255 255 255 / 0.13)"
  button-icon:
    backgroundColor: "rgb(255 255 255 / 0.08)"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    size: "44px"
  button-icon-hover:
    backgroundColor: "rgb(255 255 255 / 0.14)"
  track-row:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.fg}"
    rounded: "{rounded.row}"
    padding: "8px 12px 8px 8px"
    height: "72px"
  menu-item:
    textColor: "{colors.fg-2}"
    rounded: "{rounded.button}"
    padding: "0 12px"
    height: "48px"
  menu-item-current:
    backgroundColor: "{colors.glass-strong}"
    textColor: "{colors.fg}"
  login-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg}"
    rounded: "{rounded.panel}"
    padding: "28px"
  login-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.fg}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "48px"
---

# Design System: Kazammi

## Overview

**Creative North Star: "El instrumento de luz"**

Kazammi es un único instrumento que se enciende sobre un campo nocturno: un fondo que baja de negro a índigo, iluminado desde abajo por un horizonte violeta, y un anillo de neón (teal, violeta, magenta) que es la FFT hecha visible. Todo lo demás se aparta para que el anillo y la portada de la canción sean la única fuente de luz. La interfaz no es un panel de control con un botón de micrófono; es el aparato mismo.

La densidad es baja y la escala es grande porque la demo se proyecta y se usa en el celular con el mismo peso. Los títulos son ligeros (Geist 300) y van en dos tonos: la primera palabra en blanco y el resto en lavanda. Las superficies son vidrio esmerilado con un filo de luz arriba, nunca tarjetas opacas. El login es un mundo hermano: negro puro con una cinta de luz espectral y controles en grises neutros, sin índigo.

El movimiento tiene una gramática estricta: rotación ambiental lenta en reposo, movimiento guiado por el audio solo mientras escucha, y una sola resolución decisiva (el anillo se contrae y la portada florece). Con `prefers-reduced-motion` todo queda quieto.

**Key Characteristics:**
- Campo oscuro único, solo modo oscuro, con degradado de negro a índigo y horizonte violeta.
- La luz (teal, violeta, magenta) vive en el anillo, el espectro y los gráficos, no en el texto.
- Títulos display ligeros en dos tonos, blanco y lavanda.
- Vidrio esmerilado con filo superior y bordes de 1px casi invisibles.
- Botón primario blanco, acciones secundarias en píldora oscura, botones de ícono circulares.
- Legible al proyectar: texto secundario con al menos 7:1 sobre todo el campo.

## Colors

Un campo nocturno casi monocromo de tinta e índigo, encendido por tres luces de neón que nunca se leen como texto.

### Primary
- **Teal de señal** (teal): el acento más frío del anillo, el cursor de texto, el contorno de foco (2px, separado 3px) y la selección de texto al 35%. Es la única luz que puede tocar elementos de interacción.

### Secondary
- **Violeta de horizonte** (violet): tramo medio del degradado del anillo y del avatar, el resplandor central del overlay de escucha (al 28%) y el medio del mapa de color del espectrograma.

### Tertiary
- **Magenta eléctrico** (magenta): el extremo caliente del anillo, las nubes de luz del orbe y los picos del espectrograma.

### Neutral
- **Tinta de medianoche** (ink-0): el negro de arriba del campo, el fondo de `html` y el `theme-color`.
- **Tinta índigo** (ink-1): el medio del campo; fondo de menús flotantes (al 80%) y del centro del avatar.
- **Índigo profundo** (ink-2): el pie del campo y el fondo de los mosaicos de playlist.
- **Horizonte** (horizon): el resplandor elíptico que sube desde el borde inferior del campo y la sombra violeta de las hojas.
- **Blanco** (fg): texto principal, la primera palabra de los títulos, glifos.
- **Lavanda** (fg-2): texto secundario y la segunda parte de los títulos. Al menos 7:1 sobre todo el campo, vidrio incluido.
- **Lavanda tenue** (fg-3): texto terciario (pistas, números de paso). Al menos 4,97:1 incluso sobre vidrio.
- **Coral de error** (danger): mensajes de error, campos inválidos y acciones destructivas.
- **Vidrio** (glass, glass-strong, hairline): blanco al 6% para superficies, al 10% para hover y estado actual, al 10% para el borde de 1px.
- **Blanco de acción** (action) y **tinta de acción** (action-ink): el botón primario, un degradado de blanco a `action` con texto casi negro.
- **Grises del login** (card, field, muted): tarjeta, campo y texto apagado del login. Solo viven en esa pantalla.

### Named Rules
**The Light Is Not Text Rule.** Violeta y magenta nunca se usan como color de texto. El texto es blanco, lavanda o lavanda tenue; el teal solo aparece en foco, cursor y selección.

**The Projector Floor Rule.** El texto secundario no baja de `fg-2` y el terciario no baja de `fg-3`. La lavanda de la referencia (#a49fc4) se subió para proyectar; no se vuelve a bajar.

**The Two Worlds Rule.** El índigo es el mundo autenticado; el login es negro puro con grises neutros (`card`, `field`, `muted`). No se mezclan.

## Typography

**Display Font:** Geist (con ui-sans-serif, system-ui)
**Body Font:** Geist (con ui-sans-serif, system-ui)

**Character:** Una sola grotesca geométrica, ligera en los títulos y firme en la interfaz. Las alternativas `ss01` y `cv11` están activas en todo el cuerpo y los números que cambian (duraciones, segundos, confianza) usan cifras tabulares.

### Hierarchy
- **Display** (300, clamp(2.75rem, 8vw, 5rem), 0.98, -0.035em, `text-wrap: balance`): el título de cada pantalla. Las páginas de biblioteca y "Cómo funciona" usan clamp(2.5rem, 8vw, 4.75rem); el título de la canción encontrada usa clamp(2.25rem, 6.5vw, 4rem).
- **Headline** (300, clamp(1.75rem, 4.5vw, 2.75rem), -0.03em): el título de cada paso de "Cómo funciona", precedido por su número en `fg-3`.
- **Title** (500, 1.25rem, -0.015em): títulos de sección como "Mis canciones". Los mensajes de estado usan 300 a 1.5rem; el login usa 600 a 1.625rem.
- **Body** (400, 1rem): texto de interfaz. Los títulos de fila van en 500.
- **Body largo** (400, 1.0625rem, 1.625): explicaciones de "Cómo funciona", máximo 60 a 62ch.
- **Label** (500, 0.875rem): artista, duración, botones compactos, texto auxiliar.

### Named Rules
**The Two-Tone Title Rule.** Los títulos display van en dos tonos sólidos: la primera palabra (o primera línea) en `fg` y el resto en `fg-2`. Nunca texto con degradado.

**The Canvas Font Rule.** El texto dentro de un canvas usa `canvasFont()`, que lee la familia de la página una vez (las variables CSS no se resuelven en canvas), con 14px como mínimo para que se lea proyectado.

## Layout

Una columna centrada de hasta 72rem con márgenes laterales de 16px en el celular, 24px desde 640px y 40px desde 1024px. La cabecera repite ese contenedor: marca y nombre a la izquierda, avatar e ícono de menú a la derecha.

La pantalla de identificar es una rejilla de tres filas a cualquier ancho: título arriba a la izquierda, el orbe en el eje central ocupando el espacio libre y "Mis canciones" anclado abajo (máximo 28rem en escritorio). El orbe mide min(66vw, 20rem) en el celular y min(52vw, 49vh, 32rem) en escritorio; al escuchar crece a min(96vw, 74vh, 44rem) en un overlay de pantalla completa.

El resultado pasa a dos columnas desde 1024px (portada y datos, separación de 56px); en el celular se apila. "Cómo funciona" es una secuencia de pasos de casi una pantalla cada uno (min(100svh, 64rem)), separados por un filo, con texto y ecuación en dos columnas en escritorio y el gráfico debajo a todo el ancho.

El ritmo vertical es generoso: 32 a 40px bajo los títulos de página, 10px entre filas de lista, 56px de respiro en cada paso. Los objetivos táctiles no bajan de 44px.

## Elevation & Depth

La profundidad viene de la luz y del vidrio, no de sombras de tarjeta. El campo está iluminado desde abajo; las superficies son vidrio translúcido con desenfoque de fondo y un filo de luz interior arriba; las sombras son largas, negativas y casi invisibles, solo para despegar una superficie del campo. El único brillo real es el de la luz: el resplandor del botón primario, el halo de la portada y las chispas del resultado.

### Shadow Vocabulary
- **Filo de vidrio** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16), 0 18px 40px -24px rgb(0 0 0 / 0.8)` con `backdrop-filter: blur(20px) saturate(140%)`): toda superficie de vidrio (filas, menús, paneles).
- **Resplandor de acción** (`box-shadow: 0 10px 24px -14px rgb(255 255 255 / 0.5)`): solo el botón primario.
- **Hoja** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.1), 0 -24px 60px -20px rgb(52 35 147 / 0.6)` con `blur(24px)`): las hojas inferiores, con sombra violeta hacia arriba.
- **Portada** (`box-shadow: 0 30px 60px -24px rgb(0 0 0 / 0.85)`): la portada grande del resultado, sobre su halo.
- **Tarjeta de login** (`box-shadow: 0 40px 80px -30px rgb(0 0 0 / 0.9)`): solo en el login.

### Named Rules
**The Light Source Rule.** Lo único que emite luz es el anillo, la portada (su halo, con el color promedio de la propia portada) y el botón primario. Ninguna otra superficie brilla.

## Shapes

Formas suaves y redondeadas en una escala que crece con el tamaño del elemento: 10px en campos, 12px en botones rectangulares y elementos de menú, 14px en miniaturas, 16px en menús flotantes, 20px en filas, 24px en paneles, 28px en hojas y en la portada grande, píldora completa en acciones secundarias, avatar e íconos. El círculo es la forma madre: el orbe, el botón de ícono, el avatar con anillo cónico de neón y la portada que florece desde un círculo. Los bordes son de 1px en `hairline`; no hay bordes de color.

## Components

### Buttons
Una jerarquía de tres pesos, clara a distancia.
- **Shape:** rectángulo suave (12px) para el primario; píldora (999px) para secundarios; círculo de 44px para íconos.
- **Primary:** degradado de blanco a `action`, texto `action-ink` en 600, alto mínimo de 48px, 24px de padding lateral, resplandor blanco. Ancho completo en formularios y en la barra de acciones del resultado. En mensajes de estado centrados se usa en forma de píldora.
- **Hover / Focus:** el primario se comprime a 0.98 al presionar; la píldora pasa de blanco al 8% a 13% y se comprime a 0.97; el ícono pasa a 14% y se comprime a 0.94. Transiciones de 160ms con `ease-out-quart`. Foco: contorno teal de 2px separado 3px.
- **Secondary (píldora):** blanco al 8% con filo `hairline`, texto `fg` en 500, alto de 44px (36px en la versión compacta "Ver todo").
- **Destructivo:** la misma forma con texto `danger`.

### Cards / Containers
- **Corner Style:** 20px en filas, 24px en paneles de acciones, 16px en menús.
- **Background:** vidrio (`glass`) sobre el campo; los menús flotantes suman `ink-1` al 80%.
- **Shadow Strategy:** filo de vidrio (ver Elevation & Depth).
- **Border:** 1px `hairline`.
- **Internal Padding:** 8px en filas, 16px en paneles, 8px en menús.

### Inputs / Fields
- **Style:** solo en el login: fondo `field`, radio de 10px, alto de 48px, ícono lineal en `muted` a la izquierda, placeholder `muted`, texto blanco a 0.9375rem.
- **Focus:** el borde transparente pasa a blanco al 30%; el cursor es teal.
- **Error / Disabled:** borde `danger` al 60% y mensaje en `danger` a 0.75rem debajo; el error del formulario va en una caja `danger` al 10% con borde al 30%.

### Navigation
- **Style:** cabecera sin barra: marca Mono DJ (32px) y "Kazammi" en 600 a la izquierda; a la derecha el avatar con iniciales dentro de un anillo cónico teal, violeta y magenta, y un botón de ícono que abre el menú.
- **Menú:** panel de vidrio de 16px de radio; cada entrada mide 48px, ícono lineal (1.75 de trazo) y texto `fg-2`; hover y página actual en `glass-strong` con texto `fg`.
- **Mobile:** la misma cabecera; no hay barra inferior.

### Track Row
Fila de vidrio de al menos 72px: portada de 56px con radio de 14px, título en 500, artista y duración (cifras tabulares) en `fg-2`, acciones opcionales a la derecha. En la pantalla de identificar, dos láminas apiladas debajo insinúan que hay más canciones.

### Sheet
`<dialog>` nativo: hoja inferior con agarradera en el celular y panel centrado (28px en las cuatro esquinas) desde 640px. Panel de vidrio sobre índigo al 92%, fondo oscurecido y desenfocado a 6px; entra subiendo 24px en 420ms con `ease-out-expo`.

### Orb (signature)
Canvas 2D que no provoca renders de React por cuadro. Un borde teal fino dentro de nubes de luz magenta y azul que derivan despacio. El radio del anillo es una fracción de su caja (prop `ring`: 0.45 en reposo) y el canvas es 1.7 veces la caja para que la luz se desvanezca fuera de ella. Al escuchar, el borde sigue las 128 bandas del espectro en espejo (graves abajo), el radio respira con el nivel, y una pista exterior se llena en 12 s con marcas a los 4, 8 y 12 s que brillan mientras se procesa cada intento. Los bordes suaves son degradados, no filtros de canvas, para que Safari lo dibuje igual. El glifo de micrófono va al centro con un brillo blanco.

### Match Resolve
El anillo se contrae a 0.42 y se desenfoca en 460ms; la portada florece desde un círculo desenfocado en 900ms, con un halo del color promedio de la portada y seis chispas lentas que nunca pasan delante de la imagen.

### Explain Charts
Gráficos en canvas sobre un panel de vidrio: ejes en lavanda al 85%, rejilla en blanco al 7%, trazos teal y magenta, espectrograma con un mapa de color que va del campo (`ink-0`, `ink-2`) a violeta, magenta y un pico rosado pálido. Ecuaciones en KaTeX renderizado en el servidor, en blanco.

## Do's and Don'ts

### Do:
- **Do** poner cada pantalla autenticada sobre el campo índigo fijo: degradado `ink-0`, `ink-1`, `ink-2` con el horizonte desde abajo.
- **Do** escribir los títulos display en Geist 300 y dos tonos, `fg` y luego `fg-2`.
- **Do** usar vidrio (`glass` con filo de 1px y desenfoque de 20px) para cada superficie sobre el campo.
- **Do** mantener un solo botón primario blanco por vista; el resto son píldoras o íconos circulares.
- **Do** usar `canvasFont()` a 14px o más para cualquier texto en canvas.
- **Do** dejar todo quieto con `prefers-reduced-motion`: sin rotación, sin chispas, sin animaciones de entrada; solo avanza la pista del orbe.
- **Do** usar cifras tabulares en duraciones, segundos y porcentajes.
- **Do** poner los estilos que antes eran CSS modules en `globals.css` con prefijo `kz-`, porque la regla `"*.css"` de Turbopack en `next.config.ts` también captura los `*.module.css`.

### Don't:
- **Don't** usar violeta ni magenta como color de texto.
- **Don't** bajar el texto secundario de `fg-2` ni el terciario de `fg-3`.
- **Don't** usar texto con degradado; los dos tonos son colores sólidos.
- **Don't** llevar el índigo al login ni los grises del login (`card`, `field`, `muted`) a las pantallas autenticadas.
- **Don't** usar filtros de canvas (`ctx.filter`) para suavizar luz; usa degradados, porque Safari no los respeta.
- **Don't** agregar un modo claro: el sistema es solo oscuro.
