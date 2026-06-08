'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#9bbdff', // J - light blue
  '#ffb74d', // L - orange
  '#9e9e9e', // N - gris metálico (tuerca)
  '#ff5252', // Bomba - rojo intenso
  '#ffeb3b', // Rayo - amarillo eléctrico
  '#ce93d8', // Tinte - violeta
  '#a1887f', // Gravedad - marrón tierra
  '#80deea', // Congelar - celeste hielo
  '#f06292', // Plus - rosa
  '#aed581', // U - lima
  '#5c6bc0', // Y - índigo
  '#ffd700', // Single - dorado (recompensa)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (anillo con hueco central)
  [[9,9],[9,9]],                              // Bomba
  [[10,10],[10,10]],                          // Rayo
  [[11,11],[11,11]],                          // Tinte
  [[12,12],[12,12]],                          // Gravedad
  [[13,13],[13,13]],                          // Congelar
  [[0,14,0],[14,14,14],[0,14,0]],             // Plus - pentominó +
  [[15,0,15],[15,15,15]],                     // U - pentominó U
  [[0,16],[16,16],[0,16],[0,16]],             // Y - pentominó Y
  [[17]],                                     // Single 1x1 - recompensa tras Tetris
];

const SPECIAL_EFFECTS = {
  9:  { effect: 'bomb',      icon: '💣' },
  10: { effect: 'lightning', icon: '⚡' },
  11: { effect: 'tint',      icon: '🎨' },
  12: { effect: 'gravity',   icon: '⬇' },
  13: { effect: 'freeze',    icon: '❄' },
};

// Piezas que aparecen ocasionalmente (probabilidad fija por pieza generada): tuerca + pentominós
const OCCASIONAL_TYPES = [8, 14, 15, 16];
const OCCASIONAL_CHANCE = 0.1;
// Recompensa garantizada: la pieza 1x1 que sigue a un Tetris (4 líneas de una)
const REWARD_TYPE = 17;

const LINE_SCORES = [0, 100, 300, 500, 800];
// Tablas de bonus por jugada hábil (multiplicadas por el nivel actual, igual que LINE_SCORES)
const TSPIN_LINE_SCORES = [0, 800, 1200, 1600];
const PERFECT_CLEAR_BONUS = [0, 800, 1200, 1800, 2000];
const B2B_MULTIPLIER = 1.5;
const FX_COLORS = { combo: '#7aa2f7', tspin: '#ba68c8', b2b: '#ffd54f', perfect: '#ffd700' };

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');

const THEME_KEY = 'tetris-theme';
let themeColors = { gridLine: '#22222e', blockHighlight: 'rgba(255,255,255,0.12)' };
let floatingTexts = [];
let audioCtx = null;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, nextSpecialAt, freezeUntil, justGotTetris, combo, b2bActive, lastActionWasRotation;

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  themeColors = {
    gridLine: styles.getPropertyValue('--grid-line').trim(),
    blockHighlight: styles.getPropertyValue('--block-highlight').trim(),
  };
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.checked = theme === 'light';
  localStorage.setItem(THEME_KEY, theme);
  readThemeColors();
  if (current) {
    draw();
    drawNext();
  }
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  applyTheme(stored === 'light' ? 'light' : 'dark');
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
});

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function buildPiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomNormalPiece() {
  return buildPiece(Math.floor(Math.random() * 7) + 1);
}

function randomSpecialPiece() {
  return buildPiece(9 + Math.floor(Math.random() * 5));
}

function randomOccasionalPiece() {
  return buildPiece(OCCASIONAL_TYPES[Math.floor(Math.random() * OCCASIONAL_TYPES.length)]);
}

function nextPiece() {
  if (justGotTetris) {
    justGotTetris = false;
    return buildPiece(REWARD_TYPE);
  }
  if (lines >= nextSpecialAt) {
    nextSpecialAt += 10;
    return randomSpecialPiece();
  }
  if (Math.random() < OCCASIONAL_CHANCE) {
    return randomOccasionalPiece();
  }
  return randomNormalPiece();
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastActionWasRotation = true;
      return;
    }
  }
}

// Detección de T-Spin (regla de las 3 esquinas): la pieza T debe haber rotado como
// última acción y al menos 3 de las 4 celdas diagonales alrededor de su centro
// (que siempre es current.x+1, current.y+1, ya que la T vive en una caja 3x3 en
// sus 4 rotaciones) deben estar ocupadas o fuera del tablero.
function isTSpin() {
  if (current.type !== 3 || !lastActionWasRotation) return false;
  const cx = current.x + 1, cy = current.y + 1;
  let filled = 0;
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const r = cy + dr, c = cx + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c]) filled++;
  }
  return filled >= 3;
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function applyEffect(effect, piece) {
  switch (effect) {
    case 'bomb': {
      const cx = piece.x + 1, cy = piece.y + 1;
      for (let r = cy - 1; r <= cy + 1; r++)
        for (let c = cx - 1; c <= cx + 1; c++)
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
      break;
    }
    case 'lightning': {
      for (const r of [piece.y, piece.y + 1])
        if (r >= 0 && r < ROWS) board[r].fill(0);
      for (const c of [piece.x, piece.x + 1])
        if (c >= 0 && c < COLS)
          for (let r = 0; r < ROWS; r++) board[r][c] = 0;
      break;
    }
    case 'tint': {
      const counts = {};
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const v = board[r][c];
          if (v > 0) counts[v] = (counts[v] || 0) + 1;
        }
      const colors = Object.keys(counts);
      if (!colors.length) break;
      let target = +colors[0];
      for (const k of colors) if (counts[k] > counts[target]) target = +k;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (board[r][c] === target) board[r][c] = -target;
      break;
    }
    case 'gravity': {
      for (let c = 0; c < COLS; c++) {
        const cells = [];
        for (let r = 0; r < ROWS; r++)
          if (board[r][c]) cells.push(board[r][c]);
        for (let r = 0; r < ROWS; r++) board[r][c] = 0;
        for (let i = 0; i < cells.length; i++)
          board[ROWS - cells.length + i][c] = cells[i];
      }
      const cascaded = clearLines();
      if (cascaded) score += (LINE_SCORES[cascaded] || 0) * level;
      break;
    }
    case 'freeze':
      freezeUntil = performance.now() + 5000;
      break;
  }
}

// Mecánica pura de limpieza de líneas: actualiza tablero/lines/level/dropInterval/
// comodines y retorna cuántas líneas se limpiaron. La puntuación por jugada hábil
// (combo/T-Spin/B2B/Perfect Clear) vive en handleLineClear, no acá — así la cascada
// de Gravedad puede reusar esta mecánica sin disparar bonus que no corresponden.
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared === 4) justGotTetris = true;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c] < 0) board[r][c] = 0;
    updateHUD();
  }
  return cleared;
}

// Orquesta los bonus de puntuación por jugada hábil sobre una limpieza ya
// confirmada (cleared > 0): T-Spin -> Back-to-Back Tetris -> Combo -> Perfect Clear.
// Dispara el feedback visual (texto flotante) y sonoro de cada evento detectado.
function handleLineClear(cleared, tspin) {
  const table = tspin ? TSPIN_LINE_SCORES : LINE_SCORES;
  let gained = (table[cleared] || 0) * level;

  const isTetris = cleared === 4;
  if (isTetris && b2bActive) {
    gained = Math.round(gained * B2B_MULTIPLIER);
    showFloatingText('BACK-TO-BACK!', FX_COLORS.b2b);
    playB2BSound();
  }
  b2bActive = isTetris;

  combo++;
  if (combo > 1) {
    gained = Math.round(gained * combo);
    showFloatingText(`COMBO x${combo}`, FX_COLORS.combo);
    playComboSound(combo);
  }

  score += gained;

  if (tspin) {
    showFloatingText('T-SPIN!', FX_COLORS.tspin);
    playTSpinSound();
  }

  if (board.every(row => row.every(v => v === 0))) {
    score += (PERFECT_CLEAR_BONUS[cleared] || 0) * level;
    showFloatingText('PERFECT CLEAR!', FX_COLORS.perfect);
    playPerfectClearSound();
  }

  updateHUD();
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastActionWasRotation = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  const special = SPECIAL_EFFECTS[current.type];
  const tspin = isTSpin(); // se evalúa antes de mezclar: las diagonales de la T nunca son parte de su propia forma
  if (special) applyEffect(special.effect, current);
  else merge();
  const cleared = clearLines();
  if (cleared) handleLineClear(cleared, tspin);
  else combo = 0;
  spawn();
}

function spawn() {
  current = next;
  next = nextPiece();
  lastActionWasRotation = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[Math.abs(colorIndex)];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = themeColors.blockHighlight;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (colorIndex < 0) {
    // comodín: aspa blanca semitransparente
    context.strokeStyle = 'rgba(255,255,255,0.6)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x * size + 4, y * size + 4);
    context.lineTo((x + 1) * size - 4, (y + 1) * size - 4);
    context.moveTo((x + 1) * size - 4, y * size + 4);
    context.lineTo(x * size + 4, (y + 1) * size - 4);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawIcon(context, x, y, type, size) {
  const special = SPECIAL_EFFECTS[type];
  if (!special) return;
  context.font = `${Math.floor(size * 0.6)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(special.icon, x * size + size / 2, y * size + size / 2 + 1);
}

// Cola de mensajes flotantes (COMBO, T-SPIN!, BACK-TO-BACK!, PERFECT CLEAR!)
// dibujados sobre el tablero con fade-out y desplazamiento hacia arriba.
function showFloatingText(text, color) {
  floatingTexts.push({ text, color, start: performance.now(), duration: 1200 });
  if (floatingTexts.length > 4) floatingTexts.shift();
}

function drawFloatingTexts() {
  const now = performance.now();
  floatingTexts = floatingTexts.filter(ft => now - ft.start < ft.duration);
  floatingTexts.forEach((ft, i) => {
    const progress = (now - ft.start) / ft.duration;
    const alpha = progress < 0.7 ? 1 : Math.max(0, 1 - (progress - 0.7) / 0.3);
    const yOffset = -progress * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ft.text, canvas.width / 2, canvas.height / 2 - 60 + i * 28 + yOffset);
    ctx.restore();
  });
}

// Sonido sintetizado vía Web Audio API — sin archivos externos, respeta el
// "sin dependencias" del proyecto. El AudioContext se crea/reanuda perezosamente
// en el primer keydown (los navegadores exigen un gesto del usuario).
function getAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration = 0.15, type = 'sine', startDelay = 0, gain = 0.12) {
  const ac = getAudioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gainNode = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gainNode);
  gainNode.connect(ac.destination);
  const t0 = ac.currentTime + startDelay;
  gainNode.gain.setValueAtTime(gain, t0);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration);
}

function playComboSound(combo) {
  playTone(440 + Math.min(combo, 8) * 60, 0.12, 'square', 0, 0.08);
}

function playTSpinSound() {
  playTone(523, 0.12, 'triangle', 0, 0.12);
  playTone(659, 0.16, 'triangle', 0.08, 0.12);
}

function playB2BSound() {
  playTone(660, 0.1, 'sawtooth', 0, 0.08);
  playTone(880, 0.18, 'sawtooth', 0.07, 0.1);
}

function playPerfectClearSound() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.22, 'triangle', i * 0.09, 0.12));
}

function drawGrid() {
  ctx.strokeStyle = themeColors.gridLine;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
        drawIcon(ctx, current.x + c, current.y + r, current.type, BLOCK);
      }

  drawFloatingTexts();
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
        drawIcon(nextCtx, offX + c, offY + r, next.type, NB);
      }
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (ts < freezeUntil) {
    dropAccum = 0;
  } else if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastActionWasRotation = false;
    } else {
      lockPiece();
      if (gameOver) return;
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  nextSpecialAt = 10;
  freezeUntil = 0;
  justGotTetris = false;
  combo = 0;
  b2bActive = false;
  lastActionWasRotation = false;
  floatingTexts = [];
  lastTime = performance.now();
  next = nextPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  getAudioCtx(); // primer gesto del usuario: desbloquea el AudioContext
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        lastActionWasRotation = false;
      }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        lastActionWasRotation = false;
      }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

initTheme();
init();
