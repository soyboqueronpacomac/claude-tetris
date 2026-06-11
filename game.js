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

const ENERGY_PER_LINE = 25;
const MAX_ENERGY = 100;
const SLOW_DURATION = 10000;
const SLOW_DROP_INTERVAL = 3000;
const PEEK_DURATION = 10000;

const SPRINT_LINES   = 40;
const ULTRA_DURATION = 120000;
const DAS = 150; // ms de delay inicial antes del auto-repeat horizontal
const ARR = 30;  // ms entre cada shift automático

const MAX_RECORDS = 5;
const SCORES_KEY  = mode => `tetris-scores-${mode}`;

const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 15;
const START_LEVEL_KEY = 'tetris-start-level';

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
const holdCanvas        = document.getElementById('hold-canvas');
const holdCtx           = holdCanvas.getContext('2d');
const energyFill        = document.getElementById('energy-bar-fill');
const modeSelectOverlay = document.getElementById('mode-select');
const timerSection      = document.getElementById('timer-section');
const timerEl           = document.getElementById('timer');
const pauseMenu         = document.getElementById('pause-menu');
const resumeBtn         = document.getElementById('resume-btn');
const pauseRestartBtn   = document.getElementById('pause-restart-btn');
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const pauseControls     = document.getElementById('pause-controls');
const startLevelSelect  = document.getElementById('start-level-select');

const THEME_KEY = 'tetris-theme';
let themeColors = { gridLine: '#22222e', blockHighlight: 'rgba(255,255,255,0.12)' };
let floatingTexts = [];
let audioCtx = null;
let startLevel = loadStartLevel();

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, nextSpecialAt, freezeUntil, justGotTetris, combo, b2bActive, lastActionWasRotation,
    energy, skillMenuOpen, holdPiece, holdUsed, slowActive, slowUntil, peekQueue, peekUntil, undoSnapshot,
    gameMode, modeStartTime, pausedAt,
    particles, pendingClear, shakeUntil, shakeIntensity, shakeDuration,
    keyHeld, dasAt, lastArr,
    piecesPlaced, clearsByType, tspinsCount, actionsCount;

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
    drawHoldPiece();
  }
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  applyTheme(stored === 'light' ? 'light' : 'dark');
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
});

function loadStartLevel() {
  const stored = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  if (Number.isNaN(stored)) return MIN_START_LEVEL;
  return Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, stored));
}

function initStartLevelSelect() {
  for (let lvl = MIN_START_LEVEL; lvl <= MAX_START_LEVEL; lvl++) {
    const opt = document.createElement('option');
    opt.value = lvl;
    opt.textContent = lvl;
    startLevelSelect.appendChild(opt);
  }
  startLevelSelect.value = startLevel;
}

startLevelSelect.addEventListener('change', () => {
  startLevel = Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, parseInt(startLevelSelect.value, 10)));
  localStorage.setItem(START_LEVEL_KEY, String(startLevel));
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
    if (gameMode === 'sprint' && lines >= SPRINT_LINES) {
      level = startLevel + Math.floor(lines / 10);
      if (!slowActive) dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      updateHUD();
      endSprintGame();
      return cleared;
    }
    const prevLevel = level;
    level = Math.floor(lines / 10) + 1;
    if (!slowActive) dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (level > prevLevel) playLevelUpSound();
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
  clearsByType[cleared] = (clearsByType[cleared] || 0) + 1;
  if (tspin) tspinsCount++;
  playLineClearSound(cleared);
  const table = tspin ? TSPIN_LINE_SCORES : LINE_SCORES;
  let gained = (table[cleared] || 0) * level;

  const isTetris = cleared === 4;
  if (isTetris && b2bActive) {
    gained = Math.round(gained * B2B_MULTIPLIER);
    showFloatingText('BACK-TO-BACK!', FX_COLORS.b2b);
    playB2BSound();
  }
  b2bActive = isTetris;
  if (isTetris) triggerShake(300, 3);

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
    triggerShake(500, 5);
  }

  energy = Math.min(MAX_ENERGY, energy + ENERGY_PER_LINE * cleared);
  updateHUD();
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  playHardDropSound();
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

function takeSnapshot() {
  return {
    board:         board.map(row => [...row]),
    current:       { type: current.type, x: current.x, y: current.y, shape: current.shape.map(r => [...r]) },
    next:          { type: next.type, x: next.x, y: next.y, shape: next.shape.map(r => [...r]) },
    score, lines, level, combo, b2bActive, dropInterval,
    justGotTetris, nextSpecialAt, energy,
  };
}

function lockPiece() {
  undoSnapshot = takeSnapshot();
  piecesPlaced++;
  playLockSound();
  const special = SPECIAL_EFFECTS[current.type];
  const tspin = isTSpin();
  if (special) applyEffect(special.effect, current);
  else merge();

  const fullRows = [];
  for (let r = 0; r < ROWS; r++)
    if (board[r].every(v => v !== 0)) fullRows.push(r);

  if (fullRows.length) {
    pendingClear = { rowIndices: fullRows, startTime: performance.now(), duration: 120, tspin };
  } else {
    combo = 0;
    spawn();
  }
}

function spawn() {
  current = next;
  next = nextPiece();
  lastActionWasRotation = false;
  holdUsed = false;
  peekQueue = null;
  if (collide(current.shape, current.x, current.y)) {
    if (gameMode === 'zen') { zenMercy(); }
    else                    { endGame(); }
  }
  drawNext();
}

function updateEnergyBar() {
  energyFill.style.width = (energy / MAX_ENERGY * 100) + '%';
  energyFill.classList.toggle('energy-full', energy >= MAX_ENERGY);
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = (gameMode === 'sprint')
    ? `${Math.min(lines, SPRINT_LINES)} / ${SPRINT_LINES}`
    : lines;
  levelEl.textContent = level;
  updateEnergyBar();
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

function triggerShake(duration, intensity) {
  shakeUntil     = performance.now() + duration;
  shakeIntensity = intensity;
  shakeDuration  = duration;
}

function spawnRowParticles(y) {
  for (let c = 0; c < COLS; c++) {
    const color = COLORS[Math.abs(board[y][c])] || '#ffffff';
    for (let k = 0; k < 3; k++) {
      particles.push({
        x0:      (c + 0.5) * BLOCK + (Math.random() - 0.5) * BLOCK * 0.8,
        y0:      (y + 0.5) * BLOCK,
        vx:      (Math.random() - 0.5) * 160,
        vy:      -80 - Math.random() * 120,
        color,
        born:    performance.now(),
        dur:     500 + Math.random() * 400,
        size:    2 + Math.random() * 4,
      });
    }
  }
  if (particles.length > 350) particles.splice(0, particles.length - 350);
}

function drawParticles() {
  const now = performance.now();
  particles = particles.filter(p => now - p.born < p.dur);
  if (!particles.length) return;
  ctx.save();
  particles.forEach(p => {
    const t     = (now - p.born) / 1000;
    const alpha = Math.max(0, 1 - (now - p.born) / p.dur);
    const x     = p.x0 + p.vx * t;
    const y     = p.y0 + p.vy * t + 0.5 * 300 * t * t;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
  });
  ctx.restore();
}

function finalizeClear() {
  const { rowIndices, tspin } = pendingClear;
  rowIndices.forEach(y => spawnRowParticles(y));
  pendingClear = null;
  const cleared = clearLines();
  if (gameOver) return;
  if (cleared) handleLineClear(cleared, tspin);
  else combo = 0;
  spawn();
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

function playSkillSound() {
  playTone(440, 0.08, 'square', 0, 0.08);
  playTone(660, 0.12, 'square', 0.06, 0.06);
}

function playLockSound() {
  playTone(140, 0.06, 'square', 0, 0.06);
}

function playHardDropSound() {
  playTone(90, 0.08, 'triangle', 0, 0.14);
}

function playLineClearSound(cleared) {
  const freqs = [330, 415, 523, 659]; // E4, Ab4, C5, E5
  for (let i = 0; i < Math.min(cleared, 4); i++) {
    playTone(freqs[i], 0.12, 'sine', i * 0.045, 0.1);
  }
}

function playLevelUpSound() {
  [392, 523, 659].forEach((f, i) => playTone(f, 0.1, 'triangle', i * 0.055, 0.1));
}

// --- Sistema de habilidades ---

function useSkillPreview() {
  // Usa randomNormalPiece() en las posiciones especulativas para no mutar
  // justGotTetris/nextSpecialAt (efectos secundarios de nextPiece).
  peekQueue = [
    { type: next.type, shape: next.shape.map(r => [...r]) },
    randomNormalPiece(), randomNormalPiece(), randomNormalPiece(), randomNormalPiece(),
  ];
  peekUntil = performance.now() + PEEK_DURATION;
}

function useSkillSwap() {
  current = buildPiece(randomNormalPiece().type);
  lastActionWasRotation = false;
}

function useSkillSlow() {
  slowUntil = performance.now() + SLOW_DURATION;
  if (!slowActive) {
    slowActive = true;
    dropInterval = Math.max(dropInterval, SLOW_DROP_INTERVAL);
  }
}

function useSkillUndo() {
  if (!undoSnapshot) return;
  const s = undoSnapshot;
  board         = s.board;
  current       = s.current;
  next          = s.next;
  score         = s.score;
  lines         = s.lines;
  level         = s.level;
  combo         = s.combo;
  b2bActive     = s.b2bActive;
  dropInterval  = s.dropInterval;
  justGotTetris = s.justGotTetris;
  nextSpecialAt = s.nextSpecialAt;
  energy        = s.energy;
  lastActionWasRotation = false;
  undoSnapshot  = null;
  updateHUD();
  drawNext();
  drawHoldPiece();
}

function useSkillHold() {
  if (holdUsed) return;
  if (!holdPiece) {
    holdPiece = buildPiece(current.type);
    spawn(); // avanza next → current y resetea holdUsed = false en spawn()
  } else {
    const saved = holdPiece;
    holdPiece = buildPiece(current.type);
    current = buildPiece(saved.type); // reset a posición spawn con orientación original
    lastActionWasRotation = false;
  }
  holdUsed = true; // se pone DESPUÉS de spawn() para que spawn no lo deje en false
  drawHoldPiece();
}

function activateSkill(n) {
  const available = [
    true,                      // 1 - preview
    true,                      // 2 - swap
    true,                      // 3 - slow
    undoSnapshot !== null,     // 4 - undo
    !holdUsed,                 // 5 - hold
  ];
  if (!available[n - 1]) return;
  energy = 0;
  skillMenuOpen = false;
  updateEnergyBar();
  playSkillSound();
  switch (n) {
    case 1: useSkillPreview(); break;
    case 2: useSkillSwap();    break;
    case 3: useSkillSlow();    break;
    case 4: useSkillUndo();    break;
    case 5: useSkillHold();    break;
  }
}

function drawSkillMenu() {
  const SKILLS = [
    { name: 'Ver próximas 5 piezas', available: true },
    { name: 'Intercambiar pieza',    available: true },
    { name: 'Ralentizar 10s',        available: true },
    { name: 'Deshacer colocación',   available: undoSnapshot !== null },
    { name: 'Reservar pieza (hold)', available: !holdUsed },
  ];
  const PX = 20, PY = 55, PW = 260, PH = 330;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 28, 0.93)';
  ctx.strokeStyle = '#7aa2f7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PX, PY, PW, PH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffd54f';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HABILIDADES', canvas.width / 2, PY + 22);

  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.fillText(`Energía: ${energy} / ${MAX_ENERGY}   [E / Esc = cerrar]`, canvas.width / 2, PY + 40);

  SKILLS.forEach((sk, i) => {
    const rowY = PY + 64 + i * 50;
    ctx.textAlign = 'left';
    ctx.fillStyle = sk.available ? '#e0e0e0' : '#404055';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`[${i + 1}]  ${sk.name}`, PX + 16, rowY);
    if (!sk.available) {
      ctx.fillStyle = '#555566';
      ctx.font = '11px sans-serif';
      ctx.fillText('No disponible', PX + 16, rowY + 16);
    }
  });
  ctx.restore();
}

function drawPeekOverlay() {
  if (!peekQueue || performance.now() > peekUntil) {
    peekQueue = null;
    return;
  }
  const NB = 20;
  const PX = canvas.width - 78, PY = 4, PW = 74, PH = 5 * (NB * 2 + 8) + 26;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 28, 0.9)';
  ctx.strokeStyle = '#7aa2f7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(PX, PY, PW, PH, 6);
  ctx.fill();
  ctx.stroke();

  const remaining = Math.ceil((peekUntil - performance.now()) / 1000);
  ctx.fillStyle = '#ffd54f';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`NEXT 5  ${remaining}s`, PX + PW / 2, PY + 14);

  peekQueue.forEach((piece, i) => {
    const baseY = PY + 22 + i * (NB * 2 + 8);
    const shape = piece.shape;
    for (let r = 0; r < Math.min(shape.length, 2); r++)
      for (let c = 0; c < Math.min(shape[r].length, 3); c++)
        if (shape[r][c]) {
          ctx.fillStyle = COLORS[Math.abs(shape[r][c])];
          ctx.fillRect(PX + 4 + c * NB + 1, baseY + r * NB + 1, NB - 2, NB - 2);
        }
  });
  ctx.restore();
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

  const nowMs = performance.now();
  const shaking = nowMs < shakeUntil;
  if (shaking) {
    const decay = (shakeUntil - nowMs) / shakeDuration;
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * shakeIntensity * decay * 2,
      (Math.random() - 0.5) * shakeIntensity * decay * 2
    );
  }

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

  if (pendingClear) {
    const progress = (performance.now() - pendingClear.startTime) / pendingClear.duration;
    const alpha = Math.max(0, 0.85 * (1 - progress));
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    pendingClear.rowIndices.forEach(r => ctx.fillRect(0, r * BLOCK, COLS * BLOCK, BLOCK));
    ctx.restore();
  }

  drawParticles();

  if (peekQueue) drawPeekOverlay();
  if (skillMenuOpen) drawSkillMenu();

  if (shaking) ctx.restore();
}

function drawHoldPiece() {
  const NB = 30;
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (!holdPiece) return;
  const shape = holdPiece.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        drawBlock(holdCtx, offX + c, offY + r, shape[r][c], NB);
        drawIcon(holdCtx, offX + c, offY + r, holdPiece.type, NB);
      }
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

function loadScores(mode) {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY(mode))) || []; }
  catch { return []; }
}

function saveScore(mode, scoreVal, time) {
  const records = loadScores(mode);
  const entry = { score: scoreVal, date: new Date().toLocaleDateString('es-AR') };
  if (mode === 'sprint') entry.time = time;
  entry.stats = { pieces: piecesPlaced, clears: [...clearsByType], tspins: tspinsCount };
  records.push(entry);
  records.sort(mode === 'sprint'
    ? (a, b) => a.time - b.time
    : (a, b) => b.score - a.score);
  const rank = records.indexOf(entry);
  records.splice(MAX_RECORDS);
  if (rank < MAX_RECORDS)
    localStorage.setItem(SCORES_KEY(mode), JSON.stringify(records));
  return rank < MAX_RECORDS ? rank : -1;
}

function renderScores(mode, newRank) {
  const records = loadScores(mode);
  if (!records.length) return '';
  const title = mode === 'sprint' ? 'MEJORES TIEMPOS' : 'MEJORES PUNTUACIONES';
  const rows = records.map((r, i) => {
    const isNew  = i === newRank;
    const pts    = r.score.toLocaleString();
    const detail = mode === 'sprint' ? `${formatTime(r.time)} — ${pts} pts` : pts;
    return `<li class="${isNew ? 'score-new' : ''}">${i + 1}. ${detail}${isNew ? ' ★' : ''}</li>`;
  });
  return `<div class="score-table"><p class="score-table-title">${title}</p><ul>${rows.join('')}</ul></div>`;
}

function renderStats(elapsedMs) {
  const min = elapsedMs / 60000;
  const apm = min > 0.01 ? Math.round(actionsCount / min) : 0;
  const rows = [
    ['Piezas',  piecesPlaced],
    ['Singles', clearsByType[1] || 0],
    ['Dobles',  clearsByType[2] || 0],
    ['Triples', clearsByType[3] || 0],
    ['Tetris',  clearsByType[4] || 0],
    ...(tspinsCount ? [['T-Spins', tspinsCount]] : []),
    ['APM',     apm],
  ];
  const cells = rows.map(([k, v]) =>
    `<span class="stat-key">${k}</span><span class="stat-val">${v}</span>`
  ).join('');
  return `<div class="stats-grid">${cells}</div>`;
}

function updateModeSelectRecord(mode) {
  const records = loadScores(mode);
  const el = document.querySelector(`.mode-btn[data-mode="${mode}"] .mode-desc`);
  if (!el || !records.length) return;
  const best = records[0];
  el.textContent = mode === 'sprint'
    ? `Mejor: ${formatTime(best.time)}`
    : `Mejor: ${best.score.toLocaleString()}`;
}

function startGame(mode) {
  gameMode = mode;
  modeSelectOverlay.classList.add('hidden');
  init();
}

function formatTime(ms) {
  const s  = Math.max(0, ms) / 1000;
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const t  = Math.floor((s % 1) * 10);
  return `${m}:${ss.toString().padStart(2, '0')}.${t}`;
}

function updateTimer() {
  if (gameMode === 'sprint') {
    timerEl.textContent = formatTime(performance.now() - modeStartTime);
  } else if (gameMode === 'ultra') {
    timerEl.textContent = formatTime(ULTRA_DURATION - (performance.now() - modeStartTime));
  }
}

function endSprintGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  const elapsed = performance.now() - modeStartTime;
  const rank = saveScore('sprint', score, elapsed);
  overlayTitle.textContent = 'SPRINT';
  overlayScore.innerHTML = `Tiempo: ${formatTime(elapsed)} &nbsp;|&nbsp; Puntuación: ${score.toLocaleString()}`
    + renderScores('sprint', rank)
    + renderStats(elapsed);
  overlay.classList.remove('hidden');
  updateModeSelectRecord('sprint');
}

function endUltraGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  timerEl.textContent = '0:00.0';
  const rank = saveScore('ultra', score);
  const elapsed = Math.min(ULTRA_DURATION, performance.now() - modeStartTime);
  overlayTitle.textContent = 'TIEMPO AGOTADO';
  overlayScore.innerHTML = `Puntuación: ${score.toLocaleString()}`
    + renderScores('ultra', rank)
    + renderStats(elapsed);
  overlay.classList.remove('hidden');
  updateModeSelectRecord('ultra');
}

function zenMercy() {
  board.splice(0, 4);
  for (let i = 0; i < 4; i++) board.unshift(new Array(COLS).fill(0));
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  const rank = (gameMode === 'classic') ? saveScore('classic', score) : -1;
  const elapsed = performance.now() - modeStartTime;
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.innerHTML = `Puntuación: ${score.toLocaleString()}`
    + (gameMode === 'classic' ? renderScores('classic', rank) : '')
    + renderStats(elapsed);
  overlay.classList.remove('hidden');
  if (gameMode === 'classic') updateModeSelectRecord('classic');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    pausedAt = performance.now();
    cancelAnimationFrame(animId);
    startLevelSelect.value = startLevel;
    pauseControls.classList.add('hidden');
    toggleControlsBtn.textContent = 'Ver controles';
    pauseMenu.classList.remove('hidden');
  } else {
    if (gameMode === 'sprint' || gameMode === 'ultra') {
      modeStartTime += performance.now() - pausedAt;
    }
    pauseMenu.classList.add('hidden');
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }
}

function loop(ts) {
  if (skillMenuOpen) {
    lastTime = ts; // congela el acumulador de caída mientras el menú está abierto
    draw();
    animId = requestAnimationFrame(loop);
    return;
  }
  if (pendingClear) {
    lastTime = ts; // evita salto de dt cuando termina el flash
    if (performance.now() - pendingClear.startTime >= pendingClear.duration) {
      finalizeClear();
    }
    if (!gameOver) {
      draw();
      animId = requestAnimationFrame(loop);
    }
    return;
  }
  if (gameMode === 'ultra' && performance.now() - modeStartTime >= ULTRA_DURATION) {
    endUltraGame();
    return;
  }
  updateTimer();
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (slowActive && performance.now() > slowUntil) {
    slowActive = false;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  }
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
  // DAS/ARR — movimiento continuo al sostener ← o →
  if (!pendingClear && !skillMenuOpen) {
    const now = performance.now();
    for (const [dir, dx] of [['left', -1], ['right', 1]]) {
      if (keyHeld[dir] && now >= dasAt[dir]) {
        if (!lastArr[dir] || now - lastArr[dir] >= ARR) {
          if (!collide(current.shape, current.x + dx, current.y)) {
            current.x += dx;
            lastActionWasRotation = false;
          }
          lastArr[dir] = now;
        }
      }
    }
  }

  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  modeStartTime = performance.now();
  pausedAt = 0;
  timerSection.style.display = (gameMode === 'sprint' || gameMode === 'ultra') ? 'flex' : 'none';
  if (gameMode === 'sprint') timerEl.textContent = '0:00.0';
  if (gameMode === 'ultra')  timerEl.textContent = '2:00.0';
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (startLevel - 1) * 90);
  dropAccum = 0;
  nextSpecialAt = 10;
  freezeUntil = 0;
  justGotTetris = false;
  combo = 0;
  b2bActive = false;
  lastActionWasRotation = false;
  floatingTexts = [];
  energy = 0;
  skillMenuOpen = false;
  holdPiece = null;
  holdUsed = false;
  slowActive = false;
  slowUntil = 0;
  peekQueue = null;
  peekUntil = 0;
  undoSnapshot = null;
  particles     = [];
  pendingClear  = null;
  shakeUntil    = 0;
  shakeIntensity = 0;
  shakeDuration  = 1;
  keyHeld = { left: false, right: false };
  dasAt   = { left: 0,     right: 0     };
  lastArr = { left: 0,     right: 0     };
  piecesPlaced = 0;
  clearsByType = [0, 0, 0, 0, 0];
  tspinsCount  = 0;
  actionsCount = 0;
  lastTime = performance.now();
  next = nextPiece();
  spawn();
  updateHUD();
  drawHoldPiece();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  getAudioCtx(); // primer gesto del usuario: desbloquea el AudioContext
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'Escape') {
    if (skillMenuOpen) { skillMenuOpen = false; return; }
    togglePause();
    return;
  }
  if (paused || gameOver) return;

  if (e.code === 'KeyE') {
    if (skillMenuOpen) { skillMenuOpen = false; return; }
    if (energy >= MAX_ENERGY && !pendingClear) { skillMenuOpen = true; return; }
    return;
  }
  if (skillMenuOpen) {
    const digit = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5 }[e.code];
    if (digit) activateSkill(digit);
    e.preventDefault();
    return;
  }

  switch (e.code) {
    case 'ArrowLeft':
      if (!e.repeat) {
        actionsCount++;
        if (!collide(current.shape, current.x - 1, current.y)) {
          current.x--;
          lastActionWasRotation = false;
        }
        keyHeld.left = true;
        dasAt.left   = performance.now() + DAS;
        lastArr.left = 0;
      }
      break;
    case 'ArrowRight':
      if (!e.repeat) {
        actionsCount++;
        if (!collide(current.shape, current.x + 1, current.y)) {
          current.x++;
          lastActionWasRotation = false;
        }
        keyHeld.right = true;
        dasAt.right   = performance.now() + DAS;
        lastArr.right = 0;
      }
      break;
    case 'ArrowDown':
      if (!e.repeat) actionsCount++;
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      actionsCount++;
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      actionsCount++;
      hardDrop();
      break;
  }
  updateHUD();
});

document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft')  keyHeld.left  = false;
  if (e.code === 'ArrowRight') keyHeld.right = false;
});

document.querySelectorAll('.mode-btn').forEach(btn =>
  btn.addEventListener('click', () => startGame(btn.dataset.mode))
);

restartBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  init();
});

document.getElementById('mode-change-btn').addEventListener('click', () => {
  cancelAnimationFrame(animId);
  gameOver = false;
  overlay.classList.add('hidden');
  modeSelectOverlay.classList.remove('hidden');
});

resumeBtn.addEventListener('click', () => togglePause());

pauseRestartBtn.addEventListener('click', () => {
  paused = false;
  pauseMenu.classList.add('hidden');
  init();
});

toggleControlsBtn.addEventListener('click', () => {
  const hidden = pauseControls.classList.toggle('hidden');
  toggleControlsBtn.textContent = hidden ? 'Ver controles' : 'Ocultar controles';
});

initTheme();
initStartLevelSelect();
['classic', 'sprint', 'ultra'].forEach(updateModeSelectRecord);
