/* ============================================================
   BRICK BREAKER  –  game.js
   ============================================================ */

const canvas   = document.getElementById('gameCanvas');
const ctx      = canvas.getContext('2d');

/* ── Responsive canvas sizing ──────────────────────────── */
function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 32, 648);
  const maxH = Math.min(window.innerHeight - 180, 520);
  canvas.width  = maxW;
  canvas.height = maxH;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); initLevel(); });

/* ── DOM refs ──────────────────────────────────────────── */
const scoreEl       = document.getElementById('score');
const levelEl       = document.getElementById('level');
const heartsEl      = document.querySelectorAll('.heart');
const startOverlay  = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const winOverlay    = document.getElementById('winOverlay');
const finalScoreEl  = document.getElementById('finalScore');
const winScoreEl    = document.getElementById('winScore');
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);

/* ── Colour palette ────────────────────────────────────── */
const PALETTE = [
  ['#ff3e6c','#ff8fa3'],   // row 0 – red
  ['#ff9f1c','#ffc66d'],   // row 1 – orange
  ['#ffe566','#fff2a0'],   // row 2 – yellow
  ['#2ecc71','#7fefb0'],   // row 3 – green
  ['#00d4ff','#80eeff'],   // row 4 – cyan
  ['#a259ff','#d4b0ff'],   // row 5 – purple
];

/* ── Game state ────────────────────────────────────────── */
let score, lives, level, gameRunning, gameStarted, particles;

/* ── Paddle ────────────────────────────────────────────── */
const PAD = { w: 90, h: 10, x: 0, y: 0, speed: 0 };

/* ── Ball ──────────────────────────────────────────────── */
const BALL = { x:0, y:0, r:7, dx:0, dy:0, attached:true, trail:[] };

/* ── Bricks ────────────────────────────────────────────── */
let bricks = [];
const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_PAD  = 5;
const BRICK_TOP  = 48;

/* ──────────────────────────────────────────────────────── */
/*  INIT                                                     */
/* ──────────────────────────────────────────────────────── */
function initLevel() {
  const W = canvas.width, H = canvas.height;

  PAD.w = Math.min(100, W * 0.18);
  PAD.h = 10;
  PAD.y = H - 36;
  PAD.x = (W - PAD.w) / 2;

  BALL.r = 7;
  resetBall();

  buildBricks();
}

function resetBall() {
  BALL.x = PAD.x + PAD.w / 2;
  BALL.y = PAD.y - BALL.r - 2;
  BALL.trail = [];
  BALL.attached = true;

  const speed = 4 + level * 0.5;
  BALL.dx = speed * (Math.random() > .5 ? 1 : -1);
  BALL.dy = -speed;
}

function buildBricks() {
  bricks = [];
  const W   = canvas.width;
  const bW  = (W - BRICK_PAD * (BRICK_COLS + 1)) / BRICK_COLS;
  const bH  = 20;

  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const hp = (level >= 3 && r < 2) ? 2 : 1;
      bricks.push({
        x:      BRICK_PAD + c * (bW + BRICK_PAD),
        y:      BRICK_TOP + r * (bH + BRICK_PAD),
        w:      bW,
        h:      bH,
        hp,
        maxHp:  hp,
        color:  PALETTE[r % PALETTE.length][0],
        hiColor: PALETTE[r % PALETTE.length][1],
        alive:  true,
        flash:  0,
      });
    }
  }
}

/* ──────────────────────────────────────────────────────── */
/*  GAME FLOW                                               */
/* ──────────────────────────────────────────────────────── */
function startGame() {
  score       = 0;
  lives       = 3;
  level       = 1;
  gameRunning = true;
  gameStarted = true;
  particles   = [];
  updateHUD();
  initLevel();
  showOverlay(null);
  requestAnimationFrame(loop);
}

function restartGame() {
  startGame();
}

function nextLevel() {
  level++;
  levelEl.textContent = String(level).padStart(2,'0');
  initLevel();
  showOverlay(null);
}

function loseLife() {
  lives--;
  updateHUD();
  if (lives <= 0) {
    gameRunning = false;
    finalScoreEl.textContent = score;
    showOverlay('gameOver');
  } else {
    resetBall();
  }
}

function checkWin() {
  if (bricks.every(b => !b.alive)) {
    gameRunning = false;
    winScoreEl.textContent = score;
    showOverlay('win');
  }
}

/* ──────────────────────────────────────────────────────── */
/*  HUD                                                     */
/* ──────────────────────────────────────────────────────── */
function updateHUD() {
  scoreEl.textContent = String(score).padStart(3,'0');
  levelEl.textContent = String(level).padStart(2,'0');
  heartsEl.forEach((h, i) => {
    h.classList.toggle('lost', i >= lives);
  });
}

/* ──────────────────────────────────────────────────────── */
/*  OVERLAYS                                                 */
/* ──────────────────────────────────────────────────────── */
function showOverlay(which) {
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
  if (which === 'gameOver') gameOverOverlay.classList.remove('hidden');
  if (which === 'win')      winOverlay.classList.remove('hidden');
  if (which === 'start')    startOverlay.classList.remove('hidden');
}

/* ──────────────────────────────────────────────────────── */
/*  INPUT                                                    */
/* ──────────────────────────────────────────────────────── */
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  movePaddle(e.clientX - rect.left);
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  movePaddle(e.touches[0].clientX - rect.left);
}, { passive: false });

canvas.addEventListener('click', () => {
  if (gameRunning && BALL.attached) launchBall();
});
canvas.addEventListener('touchend', () => {
  if (gameRunning && BALL.attached) launchBall();
});

function movePaddle(mx) {
  PAD.x = Math.max(0, Math.min(canvas.width - PAD.w, mx - PAD.w / 2));
  if (BALL.attached) {
    BALL.x = PAD.x + PAD.w / 2;
    BALL.y = PAD.y - BALL.r - 2;
  }
}

function launchBall() {
  BALL.attached = false;
}

/* ──────────────────────────────────────────────────────── */
/*  PARTICLES                                               */
/* ──────────────────────────────────────────────────────── */
function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      r: Math.random() * 3 + 1,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.08;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/* ──────────────────────────────────────────────────────── */
/*  PHYSICS / COLLISION                                     */
/* ──────────────────────────────────────────────────────── */
function update() {
  const W = canvas.width, H = canvas.height;

  /* trail */
  BALL.trail.push({ x: BALL.x, y: BALL.y });
  if (BALL.trail.length > 12) BALL.trail.shift();

  if (BALL.attached) return;

  BALL.x += BALL.dx;
  BALL.y += BALL.dy;

  /* wall bounces */
  if (BALL.x - BALL.r < 0)  { BALL.x = BALL.r;     BALL.dx *= -1; }
  if (BALL.x + BALL.r > W)  { BALL.x = W - BALL.r; BALL.dx *= -1; }
  if (BALL.y - BALL.r < 0)  { BALL.y = BALL.r;     BALL.dy *= -1; }

  /* ball lost */
  if (BALL.y - BALL.r > H) { loseLife(); return; }

  /* paddle collision */
  if (
    BALL.dy > 0 &&
    BALL.x > PAD.x && BALL.x < PAD.x + PAD.w &&
    BALL.y + BALL.r >= PAD.y && BALL.y + BALL.r <= PAD.y + PAD.h + 6
  ) {
    BALL.dy = -Math.abs(BALL.dy);
    /* angle based on hit position */
    const rel   = (BALL.x - (PAD.x + PAD.w / 2)) / (PAD.w / 2);
    const speed = Math.sqrt(BALL.dx * BALL.dx + BALL.dy * BALL.dy);
    BALL.dx = rel * speed * 1.2;
    /* clamp dx so ball doesn't go totally sideways */
    const maxDx = speed * 0.92;
    BALL.dx = Math.max(-maxDx, Math.min(maxDx, BALL.dx));
    /* recalc dy to keep speed constant */
    BALL.dy = -Math.sqrt(speed * speed - BALL.dx * BALL.dx);
    spawnParticles(BALL.x, PAD.y, '#00f0ff', 6);
  }

  /* brick collision */
  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i];
    if (!b.alive) continue;

    if (
      BALL.x + BALL.r > b.x &&
      BALL.x - BALL.r < b.x + b.w &&
      BALL.y + BALL.r > b.y &&
      BALL.y - BALL.r < b.y + b.h
    ) {
      b.hp--;
      b.flash = 8;

      /* determine bounce axis */
      const overlapL = (BALL.x + BALL.r) - b.x;
      const overlapR = (b.x + b.w) - (BALL.x - BALL.r);
      const overlapT = (BALL.y + BALL.r) - b.y;
      const overlapB = (b.y + b.h) - (BALL.y - BALL.r);
      const minH = Math.min(overlapL, overlapR);
      const minV = Math.min(overlapT, overlapB);
      if (minH < minV) BALL.dx *= -1;
      else             BALL.dy *= -1;

      if (b.hp <= 0) {
        b.alive = false;
        score += 10 * level;
        updateHUD();
        spawnParticles(b.x + b.w/2, b.y + b.h/2, b.color, 14);
        checkWin();
      } else {
        score += 5 * level;
        updateHUD();
        spawnParticles(b.x + b.w/2, b.y + b.h/2, b.hiColor, 6);
      }
      break;
    }
  }

  updateParticles();

  /* decrement flash timers */
  bricks.forEach(b => { if (b.flash > 0) b.flash--; });
}

/* ──────────────────────────────────────────────────────── */
/*  DRAW                                                     */
/* ──────────────────────────────────────────────────────── */
function draw() {
  const W = canvas.width, H = canvas.height;

  /* clear */
  ctx.clearRect(0, 0, W, H);

  /* subtle scanlines */
  ctx.fillStyle = 'rgba(0,0,0,.06)';
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }

  /* bricks */
  bricks.forEach(b => {
    if (!b.alive) return;
    const flash = b.flash > 0;
    const fill  = flash ? '#ffffff' : b.color;

    /* shadow glow */
    ctx.shadowBlur  = flash ? 16 : 6;
    ctx.shadowColor = b.color;
    ctx.fillStyle   = fill;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    /* top highlight */
    ctx.shadowBlur = 0;
    ctx.fillStyle  = b.hiColor + '55';
    ctx.fillRect(b.x, b.y, b.w, 4);

    /* HP indicator for 2-hp bricks */
    if (b.maxHp > 1 && b.hp === 1) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(b.x + 6, b.y + b.h/2);
      ctx.lineTo(b.x + b.w - 6, b.y + b.h/2);
      ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;

  /* ball trail */
  BALL.trail.forEach((t, i) => {
    const a = (i / BALL.trail.length) * 0.35;
    const r = BALL.r * (i / BALL.trail.length) * 0.8;
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#00f0ff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  /* ball */
  const grd = ctx.createRadialGradient(BALL.x - 2, BALL.y - 2, 1, BALL.x, BALL.y, BALL.r);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, '#00f0ff');
  ctx.shadowBlur  = 18;
  ctx.shadowColor = '#00f0ff';
  ctx.fillStyle   = grd;
  ctx.beginPath();
  ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  /* paddle */
  const padGrd = ctx.createLinearGradient(PAD.x, PAD.y, PAD.x, PAD.y + PAD.h);
  padGrd.addColorStop(0, '#00f0ff');
  padGrd.addColorStop(1, '#005f6b');
  ctx.shadowBlur  = 14;
  ctx.shadowColor = '#00f0ff';
  ctx.fillStyle   = padGrd;
  const r = 5;
  ctx.beginPath();
  ctx.moveTo(PAD.x + r, PAD.y);
  ctx.lineTo(PAD.x + PAD.w - r, PAD.y);
  ctx.quadraticCurveTo(PAD.x + PAD.w, PAD.y, PAD.x + PAD.w, PAD.y + r);
  ctx.lineTo(PAD.x + PAD.w, PAD.y + PAD.h - r);
  ctx.quadraticCurveTo(PAD.x + PAD.w, PAD.y + PAD.h, PAD.x + PAD.w - r, PAD.y + PAD.h);
  ctx.lineTo(PAD.x + r, PAD.y + PAD.h);
  ctx.quadraticCurveTo(PAD.x, PAD.y + PAD.h, PAD.x, PAD.y + PAD.h - r);
  ctx.lineTo(PAD.x, PAD.y + r);
  ctx.quadraticCurveTo(PAD.x, PAD.y, PAD.x + r, PAD.y);
  ctx.closePath();
  ctx.fill();

  /* paddle shine */
  ctx.shadowBlur = 0;
  ctx.fillStyle  = 'rgba(255,255,255,.25)';
  ctx.fillRect(PAD.x + 8, PAD.y + 2, PAD.w - 16, 3);

  /* "click to launch" pulse on attached */
  if (BALL.attached && gameStarted) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#00f0ff';
    ctx.font        = `bold ${Math.floor(canvas.width * 0.025)}px "Courier New"`;
    ctx.textAlign   = 'center';
    ctx.fillText('CLICK / TAP TO LAUNCH', W / 2, H - 10);
    ctx.globalAlpha = 1;
  }

  /* particles */
  drawParticles();
}

/* ──────────────────────────────────────────────────────── */
/*  MAIN LOOP                                               */
/* ──────────────────────────────────────────────────────── */
function loop() {
  if (!gameRunning) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ── Bootstrap ─────────────────────────────────────────── */
// Show start screen, draw an idle frame
score = 0; lives = 3; level = 1; particles = []; gameRunning = false; gameStarted = false;
resizeCanvas();
initLevel();
/* draw a static preview */
draw();
