/* ============================================================
   Snake — Neon Arcade
   Pure vanilla JS · localStorage persistence
   ============================================================ */

(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────
  const STORAGE_KEY = 'snakeUsers';
  const SESSION_KEY = 'snakeCurrentUser';
  const GRID = 20;       // number of cells per axis
  const BASE_SPEED = 150;      // ms per tick (starting speed)
  const SPEED_INC = 3;        // ms faster per food eaten

  // ─── DOM References ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    login: $('#login-screen'),
    game: $('#game-screen'),
    records: $('#records-screen'),
  };

  const dom = {
    // Auth
    username: $('#login-username'),
    password: $('#login-password'),
    authError: $('#auth-error'),
    btnLogin: $('#btn-login'),
    btnRegister: $('#btn-register'),

    // Game
    canvas: $('#game-canvas'),
    scoreVal: $('#score-value'),
    bestVal: $('#best-value'),
    userBadge: $('#user-badge'),
    overlay: $('#game-overlay'),
    overlayText: $('#overlay-text'),
    overlayScore: $('#overlay-score'),
    btnStart: $('#btn-start'),
    btnPause: $('#btn-pause'),
    btnRecords: $('#btn-records'),
    btnLogout: $('#btn-logout'),

    // Records
    leaderboardTbody: $('#leaderboard-table tbody'),
    historyTbody: $('#history-table tbody'),
    loginsTbody: $('#logins-table tbody'),
    leaderboardEmpty: $('#leaderboard-empty'),
    historyEmpty: $('#history-empty'),
    loginsEmpty: $('#logins-empty'),
    btnBack: $('#btn-back'),
  };

  const ctx = dom.canvas.getContext('2d');

  // ─── Data Layer ──────────────────────────────────────────
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function getCurrentUser() {
    return sessionStorage.getItem(SESSION_KEY);
  }

  function setCurrentUser(name) {
    if (name) sessionStorage.setItem(SESSION_KEY, name);
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function getUserData(username) {
    const users = getUsers();
    return users[username] || null;
  }

  function updateUserData(username, updater) {
    const users = getUsers();
    if (!users[username]) return;
    updater(users[username]);
    saveUsers(users);
  }

  // ─── Auth Module ─────────────────────────────────────────
  function showAuthError(msg) {
    dom.authError.textContent = msg;
  }

  function clearAuthError() {
    dom.authError.textContent = '';
  }

  function handleLogin() {
    clearAuthError();
    const u = dom.username.value.trim();
    const p = dom.password.value;
    if (!u || !p) { showAuthError('Please fill in all fields.'); return; }
    const users = getUsers();
    if (!users[u]) { showAuthError('User not found. Please register.'); return; }
    if (users[u].password !== p) { showAuthError('Incorrect password.'); return; }
    // Record login time
    users[u].loginTimes.push(new Date().toISOString());
    saveUsers(users);
    setCurrentUser(u);
    enterGame(u);
  }

  function handleRegister() {
    clearAuthError();
    const u = dom.username.value.trim();
    const p = dom.password.value;
    if (!u || !p) { showAuthError('Please fill in all fields.'); return; }
    if (u.length < 2) { showAuthError('Username must be at least 2 characters.'); return; }
    if (p.length < 3) { showAuthError('Password must be at least 3 characters.'); return; }
    const users = getUsers();
    if (users[u]) { showAuthError('Username already taken.'); return; }
    users[u] = { password: p, loginTimes: [new Date().toISOString()], games: [] };
    saveUsers(users);
    setCurrentUser(u);
    enterGame(u);
  }

  function handleGuest() {
    clearAuthError();
    setCurrentUser('__guest__');
    enterGame('Guest');
  }

  // ─── Screen Manager ──────────────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function isGuest() {
    return getCurrentUser() === '__guest__';
  }

  function enterGame(displayName) {
    dom.userBadge.textContent = '👤 ' + displayName;
    if (isGuest()) {
      dom.bestVal.textContent = 0;
    } else {
      const data = getUserData(getCurrentUser());
      const best = data && data.games.length
        ? Math.max(...data.games.map((g) => g.score))
        : 0;
      dom.bestVal.textContent = best;
    }
    resetGame();
    showScreen('game');
  }

  // ─── Snake Game Engine ───────────────────────────────────
  let snake, direction, nextDirection, food, score, speed;
  let gameRunning = false;
  let gamePaused = false;
  let lastTick = 0;
  let animFrame = null;

  // Assets
  const assets = {
    head: new Image(),
    mice: new Image(),
    frog: new Image(),
    bird: new Image()
  };
  assets.head.src = 'assets/snake_head.png';
  assets.mice.src = 'assets/food_mouse.png';
  assets.frog.src = 'assets/food_frog.png';
  assets.bird.src = 'assets/food_bird.png';

  const foodTypes = ['mice', 'frog', 'bird'];
  let currentFoodType = 'mice';

  // Derive cell size from canvas intrinsic dimensions
  function cellSize() {
    return dom.canvas.width / GRID;
  }

  function resetGame() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    speed = BASE_SPEED;
    dom.scoreVal.textContent = '0';
    placeFood();
    drawFrame();
    showOverlay('Press Start to Play', '');
    dom.btnStart.textContent = 'Start';
    dom.btnPause.disabled = true;
    dom.btnPause.textContent = 'Pause';
    gameRunning = false;
    gamePaused = false;
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  function placeFood() {
    const occupied = new Set(snake.map((s) => s.x + ',' + s.y));
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (occupied.has(pos.x + ',' + pos.y));
    food = pos;
    currentFoodType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
  }

  function startGame() {
    if (gameRunning && !gamePaused) return;
    if (gamePaused) { resumeGame(); return; }
    gameRunning = true;
    gamePaused = false;
    hideOverlay();
    dom.btnStart.textContent = 'Restart';
    dom.btnPause.disabled = false;
    lastTick = performance.now();
    loop(lastTick);
  }

  function pauseGame() {
    if (!gameRunning || gamePaused) return;
    gamePaused = true;
    dom.btnPause.textContent = 'Resume';
    showOverlay('Paused', '');
  }

  function resumeGame() {
    if (!gamePaused) return;
    gamePaused = false;
    dom.btnPause.textContent = 'Pause';
    hideOverlay();
    lastTick = performance.now();
    loop(lastTick);
  }

  function togglePause() {
    gamePaused ? resumeGame() : pauseGame();
  }

  // Main game loop (requestAnimationFrame with tick throttle)
  function loop(timestamp) {
    if (!gameRunning || gamePaused) return;
    animFrame = requestAnimationFrame(loop);
    if (timestamp - lastTick < speed) return;
    lastTick = timestamp;
    update();
    drawFrame();
  }

  function update() {
    direction = nextDirection;
    const head = { ...snake[0] };
    switch (direction) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      return gameOver();
    }
    // Self collision
    for (const seg of snake) {
      if (seg.x === head.x && seg.y === head.y) return gameOver();
    }

    snake.unshift(head);

    // Eat food?
    if (head.x === food.x && head.y === food.y) {
      score++;
      dom.scoreVal.textContent = score;
      speed = Math.max(50, BASE_SPEED - score * SPEED_INC);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    gameRunning = false;
    if (animFrame) cancelAnimationFrame(animFrame);

    // Screen shake effect on the canvas border
    const wrapper = document.querySelector('.canvas-wrapper');
    wrapper.classList.add('shake');
    wrapper.addEventListener('animationend', () => {
      wrapper.classList.remove('shake');
    }, { once: true });

    // Save score (skip for guests)
    const user = getCurrentUser();
    if (user && !isGuest()) {
      updateUserData(user, (data) => {
        data.games.push({ score, date: new Date().toISOString() });
      });
      // Update best
      const data = getUserData(user);
      const best = Math.max(...data.games.map((g) => g.score));
      dom.bestVal.textContent = best;
    }

    // Delay overlay so the shake effect is visible first
    setTimeout(() => {
      showOverlay('Game Over', score);
    }, 600);
    dom.btnStart.textContent = 'Play Again';
    dom.btnPause.disabled = true;
  }

  // ─── Rendering ───────────────────────────────────────────
  function drawFrame() {
    const cs = cellSize();
    const w = dom.canvas.width;
    const h = dom.canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cs); ctx.lineTo(w, i * cs);
      ctx.stroke();
    }

    // Snake body
    snake.forEach((seg, idx) => {
      const x = seg.x * cs;
      const y = seg.y * cs;
      const r = cs * 0.15;

      // Gradient from cyan (head) to darker teal (tail)
      const ratio = idx / snake.length;
      const g1 = lerpColor([6, 182, 212], [14, 116, 144], ratio);    // cyan → teal
      const g2 = lerpColor([8, 145, 178], [17, 94, 120], ratio);

      const grad = ctx.createLinearGradient(x, y, x + cs, y + cs);
      const alpha = 1.0 - 0.3 * ratio;  // 1.0 at head → 0.7 at tail
      grad.addColorStop(0, `rgba(${g1[0]},${g1[1]},${g1[2]},${alpha})`);
      grad.addColorStop(1, `rgba(${g2[0]},${g2[1]},${g2[2]},${alpha})`);
      ctx.fillStyle = grad;

      roundRect(ctx, x + 1, y + 1, cs - 2, cs - 2, r);
      ctx.fill();

      // Head eyes
      if (idx === 0) {
        // Draw cartoon head
        ctx.save();
        ctx.translate(x + cs / 2, y + cs / 2);
        let angle = 0;
        switch (direction) {
          case 'right': angle = 0; break;
          case 'left': angle = Math.PI; break;
          case 'up': angle = -Math.PI / 2; break;
          case 'down': angle = Math.PI / 2; break;
        }
        ctx.rotate(angle);
        ctx.drawImage(assets.head, -cs * 0.6, -cs * 0.6, cs * 1.2, cs * 1.2);
        ctx.restore();
      }
    });

    // Food (glowing circle)
    const fx = food.x * cs + cs / 2;
    const fy = food.y * cs + cs / 2;
    const fr = cs * 0.38;

    // Glow
    ctx.shadowColor = 'rgba(217, 70, 239, 0.7)';
    ctx.shadowBlur = 14;
    const foodGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    foodGrad.addColorStop(0, '#f0abfc');
    foodGrad.addColorStop(1, '#d946ef');
    ctx.fillStyle = foodGrad;
    // ctx.beginPath();
    // ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    // ctx.fill();

    // Draw animal instead of circle
    const animalImg = assets[currentFoodType];
    ctx.drawImage(animalImg, fx - fr, fy - fr, fr * 2, fr * 2);

    ctx.shadowBlur = 0;
  }

  // Utility: lerp between two [r,g,b] arrays
  function lerpColor(a, b, t) {
    return a.map((v, i) => Math.round(v + (b[i] - v) * t));
  }

  // Utility: rounded rect path
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // Utility: eye positions relative to head direction
  function getEyeOffsets(dir, cs) {
    const s = cs * 0.28;
    const f = cs * 0.65;
    switch (dir) {
      case 'right': return [{ ex: f, ey: s }, { ex: f, ey: cs - s }];
      case 'left': return [{ ex: cs - f, ey: s }, { ex: cs - f, ey: cs - s }];
      case 'up': return [{ ex: s, ey: cs - f }, { ex: cs - s, ey: cs - f }];
      case 'down': return [{ ex: s, ey: f }, { ex: cs - s, ey: f }];
      default: return [{ ex: f, ey: s }, { ex: f, ey: cs - s }];
    }
  }

  // ─── Overlay helpers ─────────────────────────────────────
  function showOverlay(text, scoreDisplay) {
    dom.overlayText.textContent = text;
    dom.overlayScore.textContent = scoreDisplay !== '' && scoreDisplay !== undefined
      ? '🏆 ' + scoreDisplay
      : '';
    dom.overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    dom.overlay.classList.add('hidden');
  }

  // ─── Controls ────────────────────────────────────────────
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  function setDirection(dir) {
    if (OPPOSITE[dir] === direction) return; // prevent 180° turns
    nextDirection = dir;
  }

  function handleKeydown(e) {
    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    };
    if (map[e.key]) {
      e.preventDefault();
      if (gameRunning && !gamePaused) setDirection(map[e.key]);
    }
    // Space → start/pause
    if (e.key === ' ') {
      e.preventDefault();
      if (!gameRunning) startGame();
      else togglePause();
    }
  }

  // Touch swipe detection
  let touchStartX = 0, touchStartY = 0;

  function handleTouchStart(e) {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function handleTouchEnd(e) {
    if (!gameRunning || gamePaused) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return; // too short
    if (absDx > absDy) {
      setDirection(dx > 0 ? 'right' : 'left');
    } else {
      setDirection(dy > 0 ? 'down' : 'up');
    }
  }

  // D-pad buttons
  function initDpad() {
    $$('.dpad-btn[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (gameRunning && !gamePaused) setDirection(btn.dataset.dir);
      });
    });
  }

  // ─── Records Module ──────────────────────────────────────
  function openRecords() {
    renderLeaderboard();
    renderHistory();
    renderLogins();
    showScreen('records');
  }

  function renderLeaderboard() {
    const users = getUsers();
    const entries = [];
    for (const [name, data] of Object.entries(users)) {
      for (const game of data.games) {
        entries.push({ player: name, score: game.score, date: game.date });
      }
    }
    entries.sort((a, b) => b.score - a.score);
    const top = entries.slice(0, 10);

    dom.leaderboardTbody.innerHTML = '';
    dom.leaderboardEmpty.style.display = top.length ? 'none' : 'block';
    top.forEach((e, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(e.player)}</td><td>${e.score}</td><td>${fmtDate(e.date)}</td>`;
      dom.leaderboardTbody.appendChild(tr);
    });
  }

  function renderHistory() {
    const user = getCurrentUser();
    const data = user ? getUserData(user) : null;
    const games = data ? [...data.games].reverse() : [];

    dom.historyTbody.innerHTML = '';
    dom.historyEmpty.style.display = games.length ? 'none' : 'block';
    games.forEach((g, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${g.score}</td><td>${fmtDate(g.date)}</td>`;
      dom.historyTbody.appendChild(tr);
    });
  }

  function renderLogins() {
    const user = getCurrentUser();
    const data = user ? getUserData(user) : null;
    const times = data ? [...data.loginTimes].reverse() : [];

    dom.loginsTbody.innerHTML = '';
    dom.loginsEmpty.style.display = times.length ? 'none' : 'block';
    times.forEach((t, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${fmtDate(t)}</td>`;
      dom.loginsTbody.appendChild(tr);
    });
  }

  // ─── Helpers ─────────────────────────────────────────────
  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function esc(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  // ─── Tab Switching ───────────────────────────────────────
  function initTabs() {
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach((t) => t.classList.remove('active'));
        $$('.tab-content').forEach((tc) => tc.classList.remove('active'));
        tab.classList.add('active');
        $(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  }

  // ─── Logout ──────────────────────────────────────────────
  function logout() {
    if (gameRunning) {
      gameRunning = false;
      if (animFrame) cancelAnimationFrame(animFrame);
    }
    setCurrentUser(null);
    dom.username.value = '';
    dom.password.value = '';
    clearAuthError();
    showScreen('login');
  }

  // ─── Init ────────────────────────────────────────────────
  function init() {
    // Auth buttons
    dom.btnLogin.addEventListener('click', handleLogin);
    dom.btnRegister.addEventListener('click', handleRegister);
    $('#btn-guest').addEventListener('click', handleGuest);
    // Allow Enter to submit login
    dom.password.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    // Game buttons
    dom.btnStart.addEventListener('click', () => {
      if (gameRunning || dom.btnStart.textContent === 'Play Again') {
        // Restart or Play Again: fully reset before starting
        resetGame();
        startGame();
      } else {
        startGame();
      }
    });
    dom.btnPause.addEventListener('click', togglePause);
    dom.btnRecords.addEventListener('click', openRecords);
    dom.btnLogout.addEventListener('click', logout);
    dom.btnBack.addEventListener('click', () => showScreen('game'));

    // Controls
    document.addEventListener('keydown', handleKeydown);
    dom.canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    dom.canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    initDpad();
    initTabs();

    // Auto-login if session active
    const existing = getCurrentUser();
    if (existing && getUserData(existing)) {
      enterGame(existing);
    } else {
      showScreen('login');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
