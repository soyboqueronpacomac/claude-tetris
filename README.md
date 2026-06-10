# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Tuerca**: pieza de reto 3×3, un anillo con un hueco cuadrado en el centro — aparece
  ocasionalmente (no en el sorteo normal).
- **Piezas pentominó ocasionales**: con una probabilidad fija por pieza generada (~10%)
  puede aparecer una pieza de 5 bloques (Plus, U, Y) o la Tuerca, en lugar de una normal.
- **Recompensa por Tetris**: al limpiar 4 líneas de una sola vez, la siguiente pieza es
  garantizadamente un bloque 1×1 dorado — fácil de colocar donde más convenga.
- **Piezas especiales con efectos**: cada 10 líneas eliminadas aparece una de 5 piezas
  especiales (Bomba, Rayo, Tinte, Gravedad, Congelar) que altera el tablero al asentarse.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Combos encadenados, T-Spin, Back-to-Back Tetris y Perfect Clear**: bonus de
  puntuación por jugadas hábiles, con texto flotante y sonido sintetizado al activarse.
- **Modos de juego**: pantalla de selección al inicio con 4 modos (Classic, Sprint,
  Ultra, Zen), cada uno con condiciones y HUD propios.
- **Tabla de récords locales**: top 5 por modo guardado en `localStorage`, con
  nombre de jugador, líneas y mejor combo de cada partida. Classic y Ultra
  rankean por score; Sprint por tiempo. El mejor récord de cada modo se muestra
  bajo su botón en la pantalla de selección, y la tabla completa de los 3 modos
  puede verse desde "Ver récords". Al entrar al top 5 se pide el nombre del
  jugador y la fila se resalta con ★ en el overlay de fin de partida. Botón
  "Reiniciar récords" para borrar todas las marcas.
- **Diseño sonoro completo**: sonido al asentar pieza (lock), al limpiar líneas
  (1–4 tonos ascendentes según la cantidad), al hacer hard drop y al subir de nivel.
  Se suma a los sonidos de bonus ya existentes (combo, T-Spin, B2B, Perfect Clear).
  Todo sintetizado con Web Audio API sin archivos externos.
- **Estadísticas post-partida**: el overlay de fin de juego muestra métricas de
  la partida — piezas colocadas, distribución de limpiezas (singles / dobles /
  triples / Tetris), T-Spins logrados y APM (acciones por minuto). Se guardan
  junto al score en `localStorage` para histórico.
- **Efectos visuales por limpieza de líneas**: al completar filas, éstas se
  iluminan en blanco ~120 ms antes de desaparecer (flash de fila), y al
  desaparecer explotan en **partículas de colores** que saltan desde cada celda
  y se desvanecen con gravedad animada. Un **screen shake** suave sacude el
  tablero en Tetris (4 líneas) y Perfect Clear para reforzar el impacto visual.
  Todo renderizado en el canvas, sin dependencias externas.
- **Barra de energía y sistema de habilidades**: limpiar líneas carga la barra
  (25 por línea, máximo 100). Al llenarse, `E` abre un menú canvas con 5 habilidades
  activas que el jugador elige con `1`–`5`.
- **Reserva de pieza (hold)**: guarda la pieza actual para usarla más tarde; se
  recarga en cada asentamiento.
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza (sostener: DAS/ARR — movimiento continuo) |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P` / `Esc` | Pausar / reanudar                |
| `E`       | Abrir/cerrar menú de habilidades (requiere barra llena) |
| `1`–`5`   | Elegir habilidad (con el menú abierto)  |
| `Esc`     | Cerrar menú de habilidades sin gastar energía (si está abierto) |

---

### Menú de pausa

Pulsando `P` o `Esc` se abre un menú de pausa que bloquea los inputs del juego
hasta cerrarlo:

- **Reanudar** — vuelve al juego (también con `P`/`Esc`).
- **Reiniciar** — empieza una nueva partida sin recargar la página, conservando
  el modo de juego actual.
- **Nivel inicial** — selector (1-15) que define con qué nivel (y velocidad de
  caída) empieza la próxima partida. Se persiste en `localStorage`.
- **Ver controles** — despliega la lista de teclas dentro del propio menú.

---

### Modos de juego

Al abrir el juego aparece una pantalla de selección. También podés volver a ella
desde el overlay final con "Cambiar modo".

| Modo        | Objetivo                          | Condición de fin                        | Timer          |
| ----------- | --------------------------------- | --------------------------------------- | -------------- |
| **Classic** | Puntuación máxima, sin límites    | Pieza no puede spawnear                 | —              |
| **Sprint**  | Llegar a 40 líneas lo más rápido  | `lines ≥ 40`                            | Sube desde 0   |
| **Ultra**   | Máxima puntuación en 2 minutos    | Tiempo agotado                          | Baja desde 2:00|
| **Zen**     | Jugar sin presión, sin Game Over  | Nunca (tablero lleno → limpieza de gracia)| —           |

En **Sprint** el marcador de líneas muestra `X / 40`. En **Ultra** el panel
muestra un contador regresivo que se pausa automáticamente cuando el juego está
pausado.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza (`NEXT`), ranura de reserva (`HOLD`), barra de energía (`ENERGY`) y la lista de controles.
- Un overlay para los estados **PAUSA** y **GAME OVER**.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía), un índice de color positivo (pieza fijada) o un índice **negativo** (celda "comodín" creada por el efecto Tinte, ver más abajo).
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.

### Flujo del juego

```
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ si pendingClear activo → anima el flash y espera 120 ms
     │     └─ al expirar: finalizeClear() → spawnRowParticles() → clearLines()
     │                                    → handleLineClear() → spawn()
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza + flash + partículas)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**.

### Piezas especiales

Cada vez que el contador de líneas (`lines`) alcanza un nuevo múltiplo de 10
(`nextSpecialAt`), la siguiente pieza generada por `nextPiece()` no es una de las 8
normales sino una de 5 piezas especiales, elegida al azar de forma uniforme. Todas
comparten una forma simple de 2×2 (igual de manejable que la O) para que apuntar sea
preciso, y se distinguen por color + un ícono dibujado encima (`drawIcon`).

El jugador la mueve, rota y suelta como cualquier otra pieza — pero al asentarse no dejan
bloques: `lockPiece` detecta que `current.type` está en `SPECIAL_EFFECTS` y, en lugar de
`merge()`, llama a `applyEffect()`, que dispara el efecto correspondiente sobre `board`:

| Pieza        | Ícono | Efecto                                                                                          |
| ------------ | :---: | ----------------------------------------------------------------------------------------------- |
| **Bomba**    |  💣   | Vacía un área 3×3 del tablero, anclada en la celda inferior-derecha donde se asentó el 2×2.     |
| **Rayo**     |  ⚡   | Vacía en cruz: las 2 filas y las 2 columnas completas que ocupó la pieza.                        |
| **Tinte**    |  🎨   | Detecta el color más frecuente del tablero y marca esas celdas como **comodín** (valor negativo). |
| **Gravedad** |  ⬇   | Compacta cada columna por separado, haciendo caer los bloques sueltos para cerrar huecos.        |
| **Congelar** |  ❄   | Pausa la caída automática 5 segundos (`freezeUntil`) sin bloquear el control del jugador.         |

Las celdas **comodín** (creadas por Tinte) se guardan como el negativo del índice de
color original — siguen contando como "ocupadas" para `clearLines`, pero `clearLines`
las destruye automáticamente apenas se completa **cualquier** línea del tablero, no
necesariamente la suya. Esto crea sinergias entre efectos: por ejemplo, Rayo deja huecos
"flotantes" a propósito, que Gravedad puede luego compactar y disparar limpiezas en cadena.

### Piezas pentominó y sistema de spawn ocasional

Además de las 7 piezas estándar, `nextPiece()` puede generar piezas fuera del sorteo
normal según una cadena de prioridades — cada pieza nueva se decide así:

1. **Recompensa de Tetris** (`justGotTetris`): si la jugada anterior limpió 4 líneas
   de una sola vez, la siguiente pieza es **garantizadamente** el bloque dorado 1×1.
2. **Pieza especial** (`nextSpecialAt`): si se alcanzó un nuevo múltiplo de 10 líneas,
   toca una de las 5 piezas con efecto (ver tabla de arriba).
3. **Pieza ocasional** (`OCCASIONAL_CHANCE`, ~10% de probabilidad): se sortea al azar
   entre la Tuerca y los 3 pentominós nuevos.
4. **Pieza normal**: si no se cumple ninguna condición anterior, se sortea entre las
   7 piezas estándar (I, O, T, S, Z, J, L).

| Pieza      | Forma                                | Color         | Cuándo aparece |
| ---------- | ------------------------------------ | ------------- | -------------- |
| **Plus**   | pentominó en cruz (+)                | `#f06292`     | Ocasional (~10%, junto con Tuerca/U/Y) |
| **U**      | pentominó en U                       | `#aed581`     | Ocasional |
| **Y**      | pentominó en Y                       | `#5c6bc0`     | Ocasional |
| **Tuerca** | anillo 3×3 con hueco cuadrado        | `#9e9e9e`     | Ocasional — pieza de reto |
| **Single** | bloque suelto 1×1                    | `#ffd700`     | Garantizada tras un Tetris (4 líneas) |

Las piezas pentominó y la Tuerca se rotan y colocan exactamente igual que cualquier
pieza normal — `collide` ya soporta huecos dentro de la matriz (`if (!shape[r][c]) continue`),
así que ni la cruz del Plus ni el anillo de la Tuerca necesitan lógica especial para
chocar o asentarse correctamente.

### Sistema de combos y bonus por jugada hábil

Además de la puntuación clásica (`LINE_SCORES` × nivel), asentar piezas de forma
hábil otorga bonus adicionales. Toda esta lógica vive en `handleLineClear()`,
que se invoca desde `lockPiece` solo cuando la limpieza proviene del jugador
(la cascada de Gravedad sigue sumando puntuación base sin disparar ninguno de
estos bonus, para no premiar un efecto secundario como si fuera una jugada).

| Sistema | Cómo se activa | Bonus |
| ------- | -------------- | ----- |
| **Combo encadenado** | Limpiar líneas en asentados consecutivos (sin fallar uno en el medio) incrementa `combo`. Asentar sin limpiar lo resetea a `0`. | Multiplica la puntuación por el valor de `combo` (2ª limpieza consecutiva = ×2, 3ª = ×3...). |
| **T-Spin** | La pieza **T** rota como última acción antes de asentarse y, además, al menos 3 de las 4 celdas diagonales alrededor de su centro están ocupadas o fuera del tablero ("regla de las 3 esquinas", `isTSpin()`). | Usa la tabla `TSPIN_LINE_SCORES = [0, 800, 1200, 1600]` en lugar de `LINE_SCORES` — un T-Spin Single vale tanto como un Tetris normal. |
| **Back-to-Back Tetris** | Encadenar dos **Tetris** (limpiar 4 líneas) consecutivos — un asentado sin limpiar no rompe la cadena, pero limpiar 1-3 líneas sí. | Multiplica la puntuación del Tetris por `B2B_MULTIPLIER = 1.5`. |
| **Perfect Clear** | El tablero queda completamente vacío justo después de eliminar las líneas completas. | Suma `PERFECT_CLEAR_BONUS = [0, 800, 1200, 1800, 2000]` × nivel **encima** de la puntuación normal de la limpieza. |

El orden de aplicación es predecible: `(¿T-Spin? TSPIN_LINE_SCORES : LINE_SCORES)[líneas] × nivel`,
después el multiplicador B2B (si corresponde), después el multiplicador de combo,
y por último — si el tablero quedó vacío — el bonus de Perfect Clear se suma aparte.
Un T-Spin Tetris es físicamente imposible (la T solo ocupa 4 celdas), así que
T-Spin y B2B nunca compiten por la misma limpieza.

Cada bonus dispara feedback sensorial inmediato: un **texto flotante** dibujado
sobre el tablero (`showFloatingText` / `drawFloatingTexts`, con fade-out y
desplazamiento hacia arriba — el mismo enfoque "todo en el canvas" que usa
`drawIcon`) y un **sonido sintetizado** vía Web Audio API (`playComboSound`,
`playTSpinSound`, `playB2BSound`, `playPerfectClearSound`), generado con
`OscillatorNode` + `GainNode` sin depender de archivos de audio externos. El
`AudioContext` se crea de forma perezosa en el primer `keydown`, respetando la
política de gesto del usuario de los navegadores.

### Barra de energía y sistema de habilidades

Cada línea eliminada carga **25 puntos de energía** (máximo 100). Cuando la barra
llega al tope, se ilumina en dorado y el jugador puede presionar `E` para abrir
un **menú canvas** que congela el temporizador de caída. Desde ahí elige una de
5 habilidades con `1`–`5`; `E` o `Esc` cierran el menú sin gastar energía.

Todas las habilidades cuestan los 100 puntos acumulados:

| # | Habilidad | Efecto |
| - | --------- | ------ |
| **1** | **Ver próximas 5 piezas** | Muestra un overlay canvas 10 s con las próximas 5 piezas (la real `next` + 4 aleatorias del pool normal). Se invalida en el siguiente asentamiento. |
| **2** | **Intercambiar pieza** | Reemplaza la pieza actual por una aleatoria del pool normal (tipos 1–7) en la posición de spawn. |
| **3** | **Ralentizar 10 s** | Fija `dropInterval ≥ 3000 ms` durante 10 segundos. Si se activa mientras ya está activa, extiende el temporizador. Al expirar, restaura la velocidad del nivel. |
| **4** | **Deshacer colocación** | Restaura el estado completo del tablero, pieza actual, siguiente pieza, score, líneas, nivel, combo y energía al momento anterior al último asentamiento. Solo disponible si existe un snapshot previo. |
| **5** | **Reservar pieza (hold)** | Guarda la pieza actual en la ranura HOLD y saca la anterior (o genera una nueva si la ranura estaba vacía). Solo disponible una vez por asentamiento (`holdUsed` se resetea en cada `spawn()`). |

El panel lateral muestra la ranura **HOLD** (canvas) y la **barra de energía**
(barra CSS con transición suave y efecto glow dorado al llenarse). El menú de
habilidades dibuja en el mismo canvas del tablero con `ctx.roundRect`, marcando
en gris las habilidades no disponibles en ese momento.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 17 colores            |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `TSPIN_LINE_SCORES` | Puntos por T-Spin de 1, 2 o 3 líneas | `[0,800,1200,1600]`   |
| `PERFECT_CLEAR_BONUS` | Bonus extra por dejar el tablero vacío | `[0,800,1200,1800,2000]` |
| `B2B_MULTIPLIER` | Multiplicador por Tetris consecutivos (Back-to-Back) | `1.5` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |
| `ENERGY_PER_LINE` | Energía ganada por cada línea eliminada  | `25`                  |
| `MAX_ENERGY` | Energía máxima para activar habilidades     | `100`                 |
| `SLOW_DURATION` | Duración de la Habilidad 3 en ms          | `10000`               |
| `SLOW_DROP_INTERVAL` | `dropInterval` mínimo durante el ralentizado | `3000`        |
| `PEEK_DURATION` | Duración del overlay de vista previa en ms | `10000`              |
| `DAS`          | Delay antes de que empiece el auto-repeat horizontal (ms) | `150` |
| `ARR`          | Intervalo entre shifts automáticos durante el repeat (ms) | `30`  |
| `SPRINT_LINES` | Número de líneas objetivo en modo Sprint   | `40`                  |
| `ULTRA_DURATION` | Duración del modo Ultra en ms            | `120000` (2 min)      |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
