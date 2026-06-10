# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Tetris implementation in vanilla JavaScript (ES6+), HTML5 Canvas, and CSS. No
dependencies, no build step, no package manager.

## Running the game

Open directly or serve statically:

```bash
open index.html              # macOS
python3 -m http.server 8000  # or any static server, then visit localhost:8000
```

There is no build, lint, or test command — the project has no `package.json`.
Validate JS syntax with `node --check game.js` after edits.

## Architecture

Three files, all logic lives in `game.js` (~1100+ lines):

- `index.html` — DOM structure: `<canvas id="board">` (300×600), side panel
  (score/lines/level/next/hold/energy), pause/game-over overlays.
- `style.css` — dark/retro arcade theme.
- `game.js` — entire game logic.

### Core loop

`init()` → `createBoard()` → `spawn()` → `requestAnimationFrame(loop)`.
`loop(ts)`:
1. If `pendingClear` is active, animate the row-flash (~120ms), then
   `finalizeClear()` → `spawnRowParticles()` → `clearLines()` → `handleLineClear()` → `spawn()`.
2. Accumulate `dt`; when `dt >= dropInterval`, move the piece down or call `lockPiece()`.
3. `draw()` — grid, board, ghost piece, current piece, flash, particles.
4. Repeat via `requestAnimationFrame`.

### Board model

A `ROWS × COLS` matrix. Each cell is `0` (empty), a positive color index
(locked block), or a **negative** index — a "wildcard" cell created by the
Tinte (dye) special effect. Wildcard cells count as occupied for `clearLines`
but are auto-destroyed whenever *any* line clears, not just their own.

### Pieces & spawn priority (`nextPiece()`)

Each new piece is chosen by this priority chain:
1. **Tetris reward** (`justGotTetris`): guaranteed golden 1×1 "Single" piece.
2. **Special piece** (`nextSpecialAt`, every 10 lines): one of 5 effect pieces
   (Bomba, Rayo, Tinte, Gravedad, Congelar), all 2×2 shaped, distinguished by
   color + `drawIcon()`.
3. **Occasional piece** (`OCCASIONAL_CHANCE` ~10%): Tuerca (3×3 ring) or one
   of the pentomino pieces (Plus, U, Y).
4. **Normal piece**: one of the 7 standard tetrominoes (I, O, T, S, Z, J, L).

Special pieces don't lock into the board normally — `lockPiece()` checks
`SPECIAL_EFFECTS` and calls `applyEffect()` instead of `merge()`:

| Piece | Effect |
| --- | --- |
| Bomba | Clears a 3×3 area anchored at the piece's bottom-right cell |
| Rayo | Clears the full rows + columns the 2×2 piece occupied |
| Tinte | Marks the most-frequent board color as wildcard (negative) cells |
| Gravedad | Compacts each column independently, closing gaps |
| Congelar | Pauses auto-drop for 5s without blocking player input |

### Scoring & bonuses (`handleLineClear()`)

Only fires for player-driven clears (Gravedad's cascade clears don't trigger
bonuses). Order of operations:
`(isTSpin ? TSPIN_LINE_SCORES : LINE_SCORES)[lines] × level` → apply B2B
multiplier (`B2B_MULTIPLIER`, consecutive Tetrises) → apply combo multiplier
(`combo`, consecutive clears) → if board is empty, add `PERFECT_CLEAR_BONUS[lines] × level` separately.

T-Spin detection (`isTSpin()`): last action was a rotation of the T piece, and
≥3 of its 4 diagonal corner cells are occupied/out-of-bounds.

Each bonus triggers a floating canvas text (`showFloatingText`) and a
synthesized Web Audio sound (`playComboSound`, `playTSpinSound`, etc.). The
shared `AudioContext` is created lazily on the first `keydown` (browser
autoplay policy).

### Energy bar & skills

Each cleared line adds `ENERGY_PER_LINE` (25) energy, capped at `MAX_ENERGY`
(100). At full energy, `E` opens a canvas-drawn skill menu (pauses drop
timer); `1`-`5` picks a skill, `Esc`/`E` closes without spending energy.
Skills (all cost full energy bar):

1. Peek next 5 pieces (10s overlay)
2. Swap current piece for a random standard piece
3. Slow drop to `SLOW_DROP_INTERVAL` for `SLOW_DURATION`
4. Undo last placement (full state snapshot restore)
5. Hold piece (also bound to a dedicated mechanic, `holdUsed` resets on `spawn()`)

### Game modes

Selected via a start screen (`gameMode` state):

| Mode | End condition | Timer |
| --- | --- | --- |
| Classic | piece can't spawn | — |
| Sprint | `lines >= SPRINT_LINES` (40) | counts up |
| Ultra | `ULTRA_DURATION` (2 min) elapses | counts down |
| Zen | never (board-full triggers a "grace" clear) | — |

### High scores

Top 5 per mode persisted in `localStorage`. Classic/Ultra rank by score desc,
Sprint by time asc, Zen has no ranking. Best record per mode shown on the
mode-select screen; a new record is highlighted with ★ on the game-over overlay.

### Visual/audio feedback

- Line clears: white flash (~120ms via `pendingClear`) → colored particle
  burst per cell, animated with gravity. Screen shake on Tetris/Perfect Clear.
- All sound is synthesized via `OscillatorNode`/`GainNode` — no audio files.

### Input

DAS/ARR for horizontal movement: `DAS` (150ms) delay before auto-repeat,
`ARR` (30ms) interval between repeats, tracked per-direction in `keyHeld`/`dasAt`/`lastArr`.

## Tunable constants (in `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `TSPIN_LINE_SCORES`,
`PERFECT_CLEAR_BONUS`, `B2B_MULTIPLIER`, `dropInterval`, `ENERGY_PER_LINE`,
`MAX_ENERGY`, `SLOW_DURATION`, `SLOW_DROP_INTERVAL`, `PEEK_DURATION`, `DAS`,
`ARR`, `SPRINT_LINES`, `ULTRA_DURATION`, `OCCASIONAL_CHANCE`.

If `COLS`, `ROWS`, or `BLOCK` change, also update `<canvas id="board">`'s
`width`/`height` in `index.html` to match (`COLS × BLOCK` × `ROWS × BLOCK`).

## Workflow conventions (from project history)

- Each phase of work is done on a feature branch (e.g. `10-sonidos-completos`),
  merged into `main` with `--no-ff`, then the branch is deleted.
- README.md is updated alongside `game.js` to document new mechanics for each phase.
