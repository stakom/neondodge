/*
Neon Arena — Ultimate Edition
Features:
- main menu (single / dual)
- perspective neon grid background + particles
- two players with neon glow and vertical movement
- obstacles: blocks, bars, lasers (even slower movement/appearance)
- particle effects & explosions
- WebAudio: cyber-rock loop with distortion + SFX
- persistent best scores (localStorage)
- Russian keyboard layout support for Player 1
- Mobile touch controls
*/

(() => {
  // Canvas setup
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let W = canvas.width, H = canvas.height;
  const DPR = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(600, Math.floor(rect.width * DPR));
    canvas.height = Math.max(400, Math.floor(rect.width * 0.75 * DPR));
    W = canvas.width; H = canvas.height;
  }
  canvas.style.width = '100%';
  resize();
  window.addEventListener('resize', resize);

  // UI elements
  const menuOverlay = document.getElementById('menuOverlay');
  const menuSingle = document.getElementById('menuSingle');
  const menuDual = document.getElementById('menuDual');
  const btnStart = document.getElementById('btnStart');
  const btnRestart = document.getElementById('btnRestart');
  const btnPause = document.getElementById('btnPause');
  const btnMode = document.getElementById('btnMode');
  const modeLabel = document.getElementById('modeLabel');
  const muteBtn = document.getElementById('muteBtn');
  const sfxBtn = document.getElementById('sfxBtn');
  const score1El = document.getElementById('score1');
  const score2El = document.getElementById('score2');
  const best1El = document.getElementById('best1');
  const best2El = document.getElementById('best2');
  const p1Controls = document.getElementById('p1Controls');
  const p2Controls = document.getElementById('p2Controls');

  // Audio setup
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioContext ? new AudioContext() : null;
  let masterGain, musicGain, sfxGain, distortionNode;
  let musicPlaying = false;
  let musicPatternId = null;
  let soundOn = true, sfxOn = true;

  if (audioCtx) {
    masterGain = audioCtx.createGain(); masterGain.gain.value = 0.8;
    musicGain = audioCtx.createGain(); musicGain.gain.value = 0.5;
    sfxGain = audioCtx.createGain(); sfxGain.gain.value = 0.8;
    distortionNode = audioCtx.createWaveShaper();
    distortionNode.curve = new Float32Array(44100).map((_, i) => {
      const x = (i * 2) / 44100 - 1;
      return Math.sign(x) * Math.pow(Math.abs(x), 0.5);
    });
    distortionNode.oversample = '4x';
    musicGain.connect(distortionNode);
    distortionNode.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }

  function ensureAudioResume() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  // WebAudio sounds
  function playHit() {
    if (!audioCtx || !soundOn || !sfxOn) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(100, audioCtx.currentTime);
    g.gain.setValueAtTime(0.2, audioCtx.currentTime);
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(200, audioCtx.currentTime);
    o.connect(filt);
    filt.connect(g);
    g.connect(distortionNode);
    distortionNode.connect(sfxGain);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
    o.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
    o.stop(audioCtx.currentTime + 0.25);
  }

  function playStart() {
    if (!audioCtx || !soundOn || !sfxOn) return;
    const notes = [440, 660, 880];
    notes.forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
      g.gain.setValueAtTime(0.1, audioCtx.currentTime + i * 0.1);
      o.connect(g);
      g.connect(sfxGain);
      o.start(audioCtx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + i * 0.1 + 0.1);
      o.stop(audioCtx.currentTime + i * 0.1 + 0.12);
    });
  }

  function playLaserWarn() {
    if (!audioCtx || !soundOn || !sfxOn) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(600, audioCtx.currentTime);
    g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    o.connect(g);
    g.connect(sfxGain);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    o.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
    o.stop(audioCtx.currentTime + 0.12);
  }

  function startMusic() {
    if (!audioCtx || musicPlaying) return;
    musicPlaying = true;
    const baseTime = audioCtx.currentTime + 0.05;
    function schedulePattern(start) {
      if (!musicPlaying) return;
      const bpm = 112;
      const beat = 60 / bpm;
      const chords = [[0, 4, 7], [0, 3, 7], [2, 5, 9], [0, 4, 7]];
      chords.forEach((chord, i) => {
        const t = start + i * beat * 2;
        chord.forEach(n => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.value = 220 * Math.pow(2, n / 12);
          g.gain.setValueAtTime(0.12, t);
          const filt = audioCtx.createBiquadFilter();
          filt.type = 'lowpass';
          filt.frequency.value = 1200;
          o.connect(filt);
          filt.connect(g);
          g.connect(distortionNode);
          o.start(t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.5);
          o.stop(t + beat * 1.6);
        });
      });
      for (let i = 0; i < 4; i++) {
        const t = start + i * beat;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'square';
        o.frequency.value = 55;
        g.gain.setValueAtTime(0.18, t);
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 150;
        o.connect(filt);
        filt.connect(g);
        g.connect(distortionNode);
        o.start(t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.4);
        o.stop(t + beat * 0.5);
      }
      for (let i = 0; i < 8; i++) {
        const t = start + i * beat * 0.5;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < data.length; j++) data[j] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.06, t);
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'highpass';
        filt.frequency.value = 5000;
        noise.connect(filt);
        filt.connect(g);
        g.connect(distortionNode);
        noise.start(t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        noise.stop(t + 0.1);
      }
      musicPatternId = setTimeout(() => schedulePattern(start + beat * 8), (beat * 8) * 1000 - 100);
    }
    schedulePattern(baseTime);
  }

  function stopMusic() {
    if (!musicPlaying) return;
    musicPlaying = false;
    if (musicPatternId) clearTimeout(musicPatternId);
  }

  // Game variables
  let running = false, paused = false;
  let mode = 'Survival';
  modeLabel.textContent = mode;
  btnMode.addEventListener('click', () => { mode = (mode === 'Survival') ? 'Duel' : 'Survival'; modeLabel.textContent = mode; });

  // Players
  function makePlayer(id, color, x) {
    return { id, x, y: 0.82, w: 0.06, h: 0.045, vx: 0, vy: 0, speed: 0.5, color, alive: true, score: 0, shield: 0 };
  }
  let p1 = makePlayer('p1', '#00e9ff', 0.26);
  let p2 = makePlayer('p2', '#ff2ab2', 0.74);
  let players = [p1, p2];

  // Save/load bests
  p1.best = parseInt(localStorage.getItem('neon_best_p1') || '0', 10);
  p2.best = parseInt(localStorage.getItem('neon_best_p2') || '0', 10);
  best1El.textContent = p1.best; best2El.textContent = p2.best;

  // Obstacles & particles
  const obstacles = [];
  const particles = [];

  // Input
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.key] = true; if (!running && e.key === ' ') startFromMenu(); });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  // Touch controls
  const touchState = { p1: {}, p2: {} };
  function setupTouchControls(playerId, controlsEl) {
    const buttons = controlsEl.querySelectorAll('.touch-btn');
    buttons.forEach(btn => {
      const dir = btn.dataset.dir;
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        touchState[playerId][dir] = true;
      });
      btn.addEventListener('touchend', e => {
        e.preventDefault();
        touchState[playerId][dir] = false;
      });
    });
  }
  if (p1Controls) setupTouchControls('p1', p1Controls);
  if (p2Controls) setupTouchControls('p2', p2Controls);

  // UI buttons
  btnStart.addEventListener('click', () => { if (!running) startFromMenu(); else { paused = false; } });
  btnRestart.addEventListener('click', () => { startGame(true); });
  btnPause.addEventListener('click', () => { if (!running) return; paused = !paused; btnPause.textContent = paused ? '▶ Возобновить' : '⏸ Пауза'; });
  menuSingle.addEventListener('click', () => { selectedMode = 'single'; startFromMenu(); });
  menuDual.addEventListener('click', () => { selectedMode = 'dual'; startFromMenu(); });

  let selectedMode = 'dual';

  // Sound toggles
  muteBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    muteBtn.textContent = soundOn ? '🔊 Вкл' : '🔈 Выкл';
    if (audioCtx) { if (!soundOn) audioCtx.suspend(); else audioCtx.resume(); }
  });
  sfxBtn.addEventListener('click', () => { sfxOn = !sfxOn; sfxBtn.textContent = sfxOn ? 'SFX: Вкл' : 'SFX: Выкл'; });

  // Utility
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rectOverlap(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  // Spawning
  let spawnTimer = 0, difficulty = 0;
  function spawnBlock() {
    obstacles.push({
      type: 'block',
      x: rand(0.08, 0.92),
      y: -0.12,
      w: rand(0.06, 0.14),
      h: rand(0.04, 0.08),
      speed: 0.04 + difficulty * 0.01,
      vx: rand(-0.02, 0.02),
      hue: rand(0, 360)
    });
  }
  function spawnBar() {
    const wide = rand(0.24, 0.46);
    obstacles.push({
      type: 'bar',
      x: rand(wide / 2, 1 - wide / 2),
      y: -0.12,
      w: wide,
      h: 0.05,
      speed: 0.04 + difficulty * 0.01,
      vx: rand(-0.3, 0.3),
      hue: rand(0, 360)
    });
  }
  function spawnLaser() {
    obstacles.push({
      type: 'laser',
      x: 0.5,
      y: rand(0.18, 0.75),
      state: 'warn',
      timer: 0,
      warnDur: 1.8 - Math.min(0.8, difficulty * 0.015),
      fireDur: 1.2 + difficulty * 0.01,
      hue: rand(0, 360)
    });
    playLaserWarn();
  }

  // Particles
  function spawnParticles(x, y, color, count = 18, spread = 1.6) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() * 2 - 1) * 0.8 * spread,
        vy: (Math.random() * 2 - 1) * 0.8 * spread,
        life: rand(0.4, 1.2),
        age: 0,
        size: rand(1, 3),
        color
      });
    }
  }

  // Explosion effect
  function explodeAt(px, py, color) {
    spawnParticles(px, py, color, 26, 2.6);
    playHit();
  }

  // Game lifecycle
  function resetGame(full = false) {
    obstacles.length = 0;
    particles.length = 0;
    difficulty = 0;
    spawnTimer = 0;
    p1 = makePlayer('p1', '#00e9ff', 0.26);
    p2 = makePlayer('p2', '#ff2ab2', 0.74);
    players = (selectedMode === 'single') ? [p1] : [p1, p2];
    if (full) {
      p1.best = parseInt(localStorage.getItem('neon_best_p1') || '0', 10);
      p2.best = parseInt(localStorage.getItem('neon_best_p2') || '0', 10);
    }
  }

  function startFromMenu() {
    ensureAudioResume();
    resetGame(true);
    running = true;
    paused = false;
    menuOverlay.style.display = 'none';
    if (audioCtx && soundOn) startMusic();
    playStart();
    lastTS = performance.now();
    loop(lastTS);
  }

  function startGame(force = false) {
    if (!running || force) {
      resetGame(true);
      running = true;
      paused = false;
      menuOverlay.style.display = 'none';
      if (audioCtx && soundOn) startMusic();
      playStart();
      lastTS = performance.now();
      loop(lastTS);
    }
  }

  function endGame() {
    running = false;
    players.forEach(pl => {
      if (Math.floor(pl.score) > pl.best) {
        pl.best = Math.floor(pl.score);
        localStorage.setItem('neon_best_' + pl.id, String(pl.best));
      }
    });
    best1El.textContent = p1.best;
    best2El.textContent = p2.best;
    stopMusic();
    setTimeout(() => menuOverlay.style.display = 'flex', 900);
  }

  // Update logic
  function update(dt) {
    if (!running || paused) return;
    difficulty += dt * 0.05;
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const r = Math.random();
      if (mode === 'Survival') {
        if (r < 0.45 + difficulty * 0.02) spawnBlock();
        else if (r < 0.75) spawnBar();
        else if (r < 0.92) spawnLaser();
      } else {
        if (r < 0.35 + difficulty * 0.03) spawnBlock();
        else if (r < 0.6) spawnBar();
        else spawnLaser();
      }
      spawnTimer = rand(0.5, 1.2) - Math.min(0.4, difficulty * 0.02);
    }

    // Handle input and movement
    players.forEach(pl => {
      if (!pl.alive) return;
      let moveX = 0, moveY = 0;
      if (pl.id === 'p1') {
        moveX += (keys['a'] || keys['ф'] || keys['A'] || keys['Ф'] || touchState.p1.left) ? -1 : 0;
        moveX += (keys['d'] || keys['в'] || keys['D'] || keys['В'] || touchState.p1.right) ? 1 : 0;
        moveY += (keys['w'] || keys['ц'] || keys['W'] || keys['Ц'] || touchState.p1.up) ? -1 : 0;
        moveY += (keys['s'] || keys['ы'] || keys['S'] || keys['Ы'] || touchState.p1.down) ? 1 : 0;
      } else {
        moveX += (keys['ArrowLeft'] || touchState.p2.left) ? -1 : 0;
        moveX += (keys['ArrowRight'] || touchState.p2.right) ? 1 : 0;
        moveY += (keys['ArrowUp'] || touchState.p2.up) ? -1 : 0;
        moveY += (keys['ArrowDown'] || touchState.p2.down) ? 1 : 0;
      }
      const targetVx = moveX * pl.speed;
      const targetVy = moveY * pl.speed;
      pl.vx += (targetVx - pl.vx) * Math.min(1, dt * 12);
      pl.vy += (targetVy - pl.vy) * Math.min(1, dt * 12);
      pl.x += pl.vx * dt * 0.62;
      pl.y += pl.vy * dt * 0.62;
      pl.x = clamp(pl.x, pl.w / 2, 1 - pl.w / 2);
      pl.y = clamp(pl.y, pl.h / 2, 1 - pl.h / 2);
      if (pl.alive) pl.score += dt * (1 + difficulty * 0.6);
    });

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o.type === 'block' || o.type === 'bar') {
        o.y += o.speed * dt * (1 + difficulty * 0.12);
        o.x += o.vx * dt;
        if (o.x - o.w / 2 < 0) { o.x = o.w / 2; o.vx = Math.abs(o.vx); }
        if (o.x + o.w / 2 > 1) { o.x = 1 - o.w / 2; o.vx = -Math.abs(o.vx); }
        if (o.y > 1.2) obstacles.splice(i, 1);
      } else if (o.type === 'laser') {
        o.timer += dt;
        if (o.state === 'warn' && o.timer >= o.warnDur) { o.state = 'fire'; o.timer = 0; }
        else if (o.state === 'fire' && o.timer >= o.fireDur) { o.state = 'done'; }
        else if (o.state === 'done') { obstacles.splice(i, 1); }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pa = particles[i];
      pa.age += dt;
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
      pa.vy += 0.9 * dt;
      if (pa.age >= pa.life) particles.splice(i, 1);
    }

    // Collisions
    players.forEach(pl => {
      if (!pl.alive) return;
      const pr = { x: pl.x - pl.w / 2, y: pl.y - pl.h / 2, w: pl.w, h: pl.h };
      for (let o of obstacles) {
        if (o.type === 'laser') {
          if (o.state === 'fire') {
            const lr = { x: 0, y: o.y - 0.01, w: 1, h: 0.02 };
            if (rectOverlap(pr, lr)) {
              if (pl.shield) { pl.shield = 0; }
              else { pl.alive = false; explodeAt(pl.x * W, pl.y * H, pl.color); }
            }
          }
        } else {
          const or = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
          if (rectOverlap(pr, or)) {
            if (pl.shield) { pl.shield = 0; }
            else { pl.alive = false; explodeAt(pl.x * W, pl.y * H, pl.color); }
          }
        }
      }
    });

    // Mode end check
    if (mode === 'Duel') {
      const alive = players.filter(p => p.alive).length;
      if (alive <= 1) { endGame(); }
    } else {
      if (players.every(p => !p.alive)) endGame();
    }
  }

  // Rendering
  function renderBackground() {
    ctx.clearRect(0, 0, W, H);
    const vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(255,255,255,0.01)');
    vg.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    const time = (Date.now() / 1000);
    for (let i = 0; i < 40; i++) {
      const sx = (i * 73 + (time * 20 % W)) % W;
      const sy = (i * 53 + 40 + Math.sin(time + i) * 6) % H;
      ctx.fillStyle = `rgba(255,255,255,${0.02 + 0.02 * Math.abs(Math.sin(time * 0.7 + i))})`;
      ctx.fillRect(sx, sy, 1, 1);
    }

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    const spacing = Math.max(24, W / 20);
    for (let x = 0; x < W; x += spacing) {
      ctx.moveTo(x, H);
      ctx.lineTo(x - W * 0.18, H * 0.46);
    }
    for (let y = H * 0.6; y < H; y += spacing / 2) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y - H * 0.25);
    }
    ctx.strokeStyle = 'rgba(120,190,255,0.035)';
    ctx.stroke();
    ctx.restore();
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderScene() {
    renderBackground();

    obstacles.forEach(o => {
      if (o.type === 'block' || o.type === 'bar') {
        const ox = o.x * W - o.w * W / 2, oy = o.y * H - o.h * H / 2, ow = o.w * W, oh = o.h * H;
        ctx.save();
        ctx.shadowBlur = (o.type === 'bar') ? 30 : 16;
        ctx.shadowColor = `hsl(${o.hue} 90% 60% / 0.7)`;
        ctx.fillStyle = `hsl(${o.hue} 95% 58%)`;
        drawRoundedRect(ox, oy, ow, oh, Math.min(14, oh / 2));
        ctx.fill();
        ctx.restore();
        if (o.type === 'block' && Math.random() < 0.02) {
          particles.push({ x: o.x * W + (Math.random() - 0.5) * ow * 0.5, y: (o.y - 0.02) * H, vx: (Math.random() - 0.5) * 0.04, vy: 0.02, life: 0.6, age: 0, size: 1.5, color: `hsl(${o.hue} 90% 60%)` });
        }
      } else if (o.type === 'laser') {
        const ly = o.y * H;
        if (o.state === 'warn') {
          const alpha = 0.25 + 0.35 * Math.abs(Math.sin(o.timer * 6));
          ctx.fillStyle = `rgba(255,120,120,${alpha})`;
          ctx.fillRect(0, ly - 3, W, 6);
        } else if (o.state === 'fire') {
          ctx.save();
          ctx.shadowBlur = 60;
          ctx.shadowColor = `hsl(${o.hue} 100% 60% / 0.9)`;
          ctx.fillStyle = `hsl(${o.hue} 95% 58%)`;
          ctx.fillRect(0, ly - 10, W, 20);
          ctx.restore();
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.fillRect(W * 0.01, ly - 2, W * 0.98, 4);
        }
      }
    });

    particles.forEach(pa => {
      ctx.save();
      ctx.globalAlpha = 1 - (pa.age / pa.life);
      ctx.fillStyle = pa.color || 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, pa.size + (1 - pa.age / pa.life) * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    players.forEach((pl, idx) => {
      const px = pl.x * W - pl.w * W / 2, py = pl.y * H - pl.h * H / 2, pw = pl.w * W, ph = pl.h * H;
      ctx.save();
      ctx.shadowBlur = pl.alive ? 30 : 6;
      ctx.shadowColor = pl.color;
      ctx.globalAlpha = pl.alive ? 1 : 0.55;
      drawRoundedRect(px, py, pw, ph, ph * 0.6);
      ctx.fillStyle = pl.color;
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(px + pw * 0.12, py + ph * 0.22, pw * 0.72, ph * 0.18);
      if (pl.shield) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pl.x * W, pl.y * H, Math.max(pw, ph) * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 5;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${10 * (W / 800)}px Inter, Arial`;
      ctx.fillText('P' + (idx + 1), px + 8, py - 8);
    });

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(12, 10, 220, 48);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `${12 * (W / 800)}px Inter, Arial`;
    ctx.fillText('Mode: ' + mode, 24, 30);
    ctx.fillText('Diff: ' + Math.floor(difficulty), 24, 46);
    ctx.restore();

    if (!running) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,10,0.6)';
      ctx.fillRect(0, H * 0.18, W, H * 0.64);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `${28 * (W / 800)}px Inter, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Neon Arena', W / 2, H * 0.42);
      ctx.font = `${14 * (W / 800)}px Inter, Arial`;
      ctx.fillStyle = 'rgba(207,239,255,0.9)';
      ctx.fillText('Выбери режим в меню и нажми Старт (или пробел)', W / 2, H * 0.5);
      ctx.textAlign = 'start';
      ctx.restore();
    }

    score1El.textContent = Math.floor(p1.score);
    score2El.textContent = Math.floor(p2.score);
  }

  // Main loop
  let lastTS = performance.now();
  function loop(ts) {
    if (!running) { renderScene(); return; }
    if (paused) { renderScene(); requestAnimationFrame(loop); return; }
    const dt = Math.min(0.04, (ts - lastTS) / 1000 || 0.016);
    lastTS = ts;
    update(dt);
    renderScene();
    requestAnimationFrame(loop);
  }

  // Helper: explosion trigger
  function explodeAt(sx, sy, color) {
    spawnParticles(sx, sy, color, 28, 2.8);
    playHit();
  }

  // Initial menu visible
  menuOverlay.style.display = 'flex';
  document.body.addEventListener('pointerdown', () => { ensureAudioResume(); }, { once: true });

  // Initialize mode toggles
  menuSingle.addEventListener('click', () => { selectedMode = 'single'; });
  menuDual.addEventListener('click', () => { selectedMode = 'dual'; });

  menuSingle.onclick = () => { selectedMode = 'single'; startFromMenu(); };
  menuDual.onclick = () => { selectedMode = 'dual'; startFromMenu(); };

  // Debug helpers
  window._neon = {
    spawnBlock: spawnBlock,
    spawnBar: spawnBar,
    spawnLaser: spawnLaser,
    players: players,
    obstacles: obstacles
  };

  window._neon.start = () => startGame(true);
  window._neon.end = () => endGame();

  // Render initial
  renderScene();

  // Menu shortcut (M)
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'm') { menuOverlay.style.display = 'flex'; running = false; stopMusic(); }
    if (e.key === ' ' && menuOverlay.style.display === 'flex') { startFromMenu(); }
  });
})();