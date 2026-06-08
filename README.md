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
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P`       | Pausar / reanudar                 |

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
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
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
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
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
