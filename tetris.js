// ─── CONSTANTS ───────────────────────────────────────────────
const COLS = 10, ROWS = 20;
const BOARD_W_PX = 300; // fixed logical width; canvas will scale
const BOARD_H_PX = 600;
let CS = 30; // cell size, recalculated on resize

const TETROMINOS = {
  I: { shape: [[1,1,1,1]],           color: '#00f5ff' },
  O: { shape: [[1,1],[1,1]],         color: '#ffe600' },
  T: { shape: [[0,1,0],[1,1,1]],     color: '#cc00cc' },
  S: { shape: [[0,1,1],[1,1,0]],     color: '#00ee44' },
  Z: { shape: [[1,1,0],[0,1,1]],     color: '#ff2244' },
  L: { shape: [[1,0,0],[1,1,1]],     color: '#ff8800' },
  J: { shape: [[0,0,1],[1,1,1]],     color: '#2266ff' },
};
const PIECE_KEYS = Object.keys(TETROMINOS);

const DIFFICULTY = { normal: 600, hard: 300, expert: 150 };
const SCORES     = { 1: 100, 2: 300, 3: 500, 4: 800 };

// ─── STATE ───────────────────────────────────────────────────
let grid, score, gameOver, difficulty = 'normal';
let currentPiece, currentColor, currentX, currentY;
let nextPieceKey;
let fallTimer = null;
let gameStarted = false;
let isMobile = false;

// ─── CANVAS SETUP ────────────────────────────────────────────
const boardCanvas = document.getElementById('board');
const ctx         = boardCanvas.getContext('2d');

// Two next-piece canvases: desktop & mobile top-bar
const nextCanvasDesktop = document.getElementById('next-canvas-desktop');
const nCtxDesktop       = nextCanvasDesktop ? nextCanvasDesktop.getContext('2d') : null;
const nextCanvasMobile  = document.getElementById('next-canvas');
const nCtxMobile        = nextCanvasMobile  ? nextCanvasMobile.getContext('2d')  : null;

// ─── RESPONSIVE SIZING ───────────────────────────────────────
function detectMobile() {
  return window.innerWidth <= 600;
}

function resizeBoard() {
  isMobile = detectMobile();
  if (isMobile) {
    // Fit board to screen width
    const maxW = window.innerWidth;
    CS = Math.floor(maxW / COLS);
    // Also constrain by available height
    const topBarH  = document.getElementById('top-bar').offsetHeight  || 44;
    const ctrlH    = document.getElementById('mobile-controls').offsetHeight || 160;
    const availH   = window.innerHeight - topBarH - ctrlH - 4;
    const csFromH  = Math.floor(availH / ROWS);
    CS = Math.min(CS, csFromH);
    CS = Math.max(CS, 18); // minimum readable size
  } else {
    CS = 30;
  }

  boardCanvas.width  = CS * COLS;
  boardCanvas.height = CS * ROWS;
  if (gameStarted) drawBoard();
  else {
    // draw empty board
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  }
}

window.addEventListener('resize', resizeBoard);
// Run after DOM is ready so offsetHeight is available
window.addEventListener('load', resizeBoard);

// ─── LOGIN LOGIC ─────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogin() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  if (u && p) {
    switchScreen('game');
    resizeBoard();
    initBoard();
    drawBoard();
  } else {
    document.getElementById('login-error').textContent = 'Please enter both username and password.';
  }
}

function switchScreen(to) {
  document.getElementById('login-screen').classList.toggle('hidden', to !== 'login');
  document.getElementById('game-screen').classList.toggle('hidden', to !== 'game');
}

// ─── DIFFICULTY ───────────────────────────────────────────────
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.diff;
    // Update ALL diff buttons (both desktop and mobile)
    document.querySelectorAll('.diff-btn').forEach(b => {
      b.className = 'diff-btn';
      if (b.dataset.diff === difficulty) b.classList.add('active-' + difficulty);
    });
    if (gameStarted && !gameOver) resetFallTimer();
  });
});

// ─── ACTION BUTTONS ──────────────────────────────────────────
['btn-start', 'btn-start-desktop'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', startGame);
});
['btn-restart', 'btn-restart-desktop'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', startGame);
});
['btn-logout', 'btn-logout-desktop'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => {
    stopGame();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
    switchScreen('login');
  });
});

// ─── GAME INIT ───────────────────────────────────────────────
function initBoard() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0;
  gameOver = false;
  gameStarted = false;
  nextPieceKey = null;
  currentPiece = null;
  updateScoreDisplay(0);
  document.getElementById('gameover-overlay').classList.remove('visible');
}

function updateScoreDisplay(val) {
  const sv = document.getElementById('score-val');
  const svd = document.getElementById('score-val-desktop');
  if (sv)  sv.textContent  = val;
  if (svd) svd.textContent = val;
}

function startGame() {
  stopGame();
  resizeBoard();
  initBoard();
  gameStarted = true;
  spawnPiece();
  spawnPiece();
  drawBoard();
  drawNext();
  resetFallTimer();
}

function stopGame() {
  if (fallTimer) { clearInterval(fallTimer); fallTimer = null; }
}

function resetFallTimer() {
  stopGame();
  fallTimer = setInterval(stepFall, DIFFICULTY[difficulty]);
}

function stepFall() {
  if (!gameOver) moveDown();
}

// ─── PIECE MANAGEMENT ────────────────────────────────────────
function randomKey() {
  return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
}

function spawnPiece() {
  if (!nextPieceKey) nextPieceKey = randomKey();
  const key      = nextPieceKey;
  currentPiece   = TETROMINOS[key].shape.map(r => [...r]);
  currentColor   = TETROMINOS[key].color;
  nextPieceKey   = randomKey();
  currentX       = Math.floor(COLS / 2) - Math.floor(currentPiece[0].length / 2);
  currentY       = 0;
  if (collision(currentPiece, currentX, currentY)) triggerGameOver();
  drawNext();
}

// ─── COLLISION ───────────────────────────────────────────────
function collision(shape, ox, oy) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nx = ox + x, ny = oy + y;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return true;
      if (grid[ny][nx]) return true;
    }
  }
  return false;
}

// ─── MOVES ───────────────────────────────────────────────────
function moveLeft() {
  if (!collision(currentPiece, currentX - 1, currentY)) { currentX--; drawBoard(); }
}
function moveRight() {
  if (!collision(currentPiece, currentX + 1, currentY)) { currentX++; drawBoard(); }
}
function moveDown() {
  if (!collision(currentPiece, currentX, currentY + 1)) { currentY++; drawBoard(); }
  else lockPiece();
}
function rotatePiece() {
  const rotated = currentPiece[0].map((_, i) =>
    currentPiece.map(row => row[i]).reverse()
  );
  if (!collision(rotated, currentX, currentY)) { currentPiece = rotated; drawBoard(); }
}
function hardDrop() {
  while (!collision(currentPiece, currentX, currentY + 1)) currentY++;
  lockPiece();
}

// ─── LOCK & CLEAR ────────────────────────────────────────────
function lockPiece() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x]) {
        const gy = currentY + y, gx = currentX + x;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS)
          grid[gy][gx] = currentColor;
      }
    }
  }
  clearLines();
  if (!gameOver) spawnPiece();
  drawBoard();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (grid[y].every(c => c !== 0)) {
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
  }
  if (cleared > 0) {
    score += SCORES[cleared] || 0;
    updateScoreDisplay(score);
  }
}

// ─── GAME OVER ───────────────────────────────────────────────
function triggerGameOver() {
  gameOver = true;
  stopGame();
  document.getElementById('gameover-overlay').classList.add('visible');
}

// ─── DRAW ────────────────────────────────────────────────────
function drawCell(c, x, y, color) {
  c.fillStyle = color;
  c.fillRect(x * CS, y * CS, CS - 1, CS - 1);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(x * CS, y * CS, CS - 1, 3);
  c.fillRect(x * CS, y * CS, 3, CS - 1);
}

function drawBoard() {
  const W = boardCanvas.width, H = boardCanvas.height;
  ctx.fillStyle = '#080810';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x*CS, 0); ctx.lineTo(x*CS, H); ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y*CS); ctx.lineTo(W, y*CS); ctx.stroke();
  }

  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (grid[y][x]) drawCell(ctx, x, y, grid[y][x]);

  if (currentPiece && !gameOver) {
    // Ghost
    let ghostY = currentY;
    while (!collision(currentPiece, currentX, ghostY + 1)) ghostY++;
    if (ghostY !== currentY) {
      ctx.globalAlpha = 0.15;
      for (let y = 0; y < currentPiece.length; y++)
        for (let x = 0; x < currentPiece[y].length; x++)
          if (currentPiece[y][x]) {
            ctx.fillStyle = currentColor;
            ctx.fillRect((currentX+x)*CS, (ghostY+y)*CS, CS-1, CS-1);
          }
      ctx.globalAlpha = 1;
    }
    // Active piece
    for (let y = 0; y < currentPiece.length; y++)
      for (let x = 0; x < currentPiece[y].length; x++)
        if (currentPiece[y][x]) drawCell(ctx, currentX+x, currentY+y, currentColor);
  }
}

function drawNextOn(nCtx, canvas, cellSize) {
  if (!nCtx) return;
  nCtx.fillStyle = '#080810';
  nCtx.fillRect(0, 0, canvas.width, canvas.height);
  if (!nextPieceKey) return;
  const t  = TETROMINOS[nextPieceKey];
  const pw = t.shape[0].length * cellSize;
  const ph = t.shape.length    * cellSize;
  const sx = (canvas.width  - pw) / 2;
  const sy = (canvas.height - ph) / 2;
  for (let y = 0; y < t.shape.length; y++) {
    for (let x = 0; x < t.shape[y].length; x++) {
      if (t.shape[y][x]) {
        nCtx.fillStyle = t.color;
        nCtx.fillRect(sx+x*cellSize, sy+y*cellSize, cellSize-1, cellSize-1);
        nCtx.fillStyle = 'rgba(255,255,255,0.18)';
        nCtx.fillRect(sx+x*cellSize, sy+y*cellSize, cellSize-1, 3);
        nCtx.fillRect(sx+x*cellSize, sy+y*cellSize, 3, cellSize-1);
      }
    }
  }
}

function drawNext() {
  // Desktop: 20px cell in 120×80 canvas
  drawNextOn(nCtxDesktop, nextCanvasDesktop, 20);
  // Mobile top-bar: 10px cell in 60×40 canvas
  drawNextOn(nCtxMobile,  nextCanvasMobile,  10);
}

// ─── KEYBOARD ────────────────────────────────────────────────
const keyRepeat = {};
const KEY_DELAY = 100;

document.addEventListener('keydown', e => {
  if (!gameStarted || gameOver) return;
  if (keyRepeat[e.code]) return;
  switch (e.code) {
    case 'ArrowLeft':  moveLeft();    startRepeat('ArrowLeft',  moveLeft);  break;
    case 'ArrowRight': moveRight();   startRepeat('ArrowRight', moveRight); break;
    case 'ArrowDown':  moveDown();    startRepeat('ArrowDown',  moveDown);  break;
    case 'ArrowUp':    rotatePiece(); break;
    case 'Space':      e.preventDefault(); hardDrop(); break;
  }
});
document.addEventListener('keyup', e => stopRepeat(e.code));

function startRepeat(code, fn) { keyRepeat[code] = setInterval(fn, KEY_DELAY); }
function stopRepeat(code)      { if (keyRepeat[code]) { clearInterval(keyRepeat[code]); delete keyRepeat[code]; } }

// ─── TOUCH / MOBILE D-PAD ────────────────────────────────────
function bindDpadBtn(id, action, isRepeat = false) {
  const el = document.getElementById(id);
  if (!el) return;

  let repeatTimer = null;

  function press() {
    if (!gameStarted || gameOver) return;
    action();
    if (isRepeat) {
      repeatTimer = setInterval(() => {
        if (!gameStarted || gameOver) clearInterval(repeatTimer);
        else action();
      }, KEY_DELAY);
    }
  }
  function release() { if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; } }

  el.addEventListener('touchstart', e => { e.preventDefault(); press(); },   { passive: false });
  el.addEventListener('touchend',   e => { e.preventDefault(); release(); }, { passive: false });
  el.addEventListener('touchcancel',e => { e.preventDefault(); release(); }, { passive: false });
  // also support mouse for testing on desktop
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup',   release);
  el.addEventListener('mouseleave',release);
}

bindDpadBtn('btn-left',   moveLeft,    true);
bindDpadBtn('btn-right',  moveRight,   true);
bindDpadBtn('btn-down',   moveDown,    true);
bindDpadBtn('btn-rotate', rotatePiece, false);
bindDpadBtn('btn-drop',   hardDrop,    false);

// ─── SWIPE GESTURE ON BOARD ───────────────────────────────────
let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
let lastSwipeX = 0;
const SWIPE_THRESHOLD = 20;

boardCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchStartTime = Date.now();
  lastSwipeX = t.clientX;
}, { passive: false });

boardCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!gameStarted || gameOver) return;
  const t = e.touches[0];
  const dx = t.clientX - lastSwipeX;
  if (Math.abs(dx) >= CS) {
    if (dx > 0) moveRight(); else moveLeft();
    lastSwipeX = t.clientX;
  }
}, { passive: false });

boardCanvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (!gameStarted || gameOver) return;
  const dt = Date.now() - touchStartTime;
  const touch = e.changedTouches[0];
  const dy = touch.clientY - touchStartY;
  const dx = touch.clientX - touchStartX;

  if (dt < 250 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    // Tap on board = rotate
    rotatePiece();
  } else if (dy > 60 && Math.abs(dx) < 40) {
    // Swipe down = hard drop
    hardDrop();
  }
}, { passive: false });

// Initial draw
drawBoard();
