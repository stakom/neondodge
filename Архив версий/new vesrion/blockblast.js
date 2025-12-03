/*
Block Blast
Features:
- 8x8 grid to place tetromino-like blocks
- 3 selectable blocks at the left (desktop) or bottom (mobile), drag or click to place (mouse/touch)
- Clear full rows/columns to score points (10 per cell placed, 100 per line cleared, bonus for multiple lines)
- Game over when no valid moves remain for any of the 3 blocks
- Persistent high score (localStorage)
- Neon visuals with animations (scale in on placement, explode and fade on clear)
- Web Audio sound effects for placement, line destruction, clear, and game over
- Smoother animations with easing
*/

(() => {
  // Game constants and variables
  const GRID_SIZE = 8;
  let W, H, leftX, gameWidth, topY, gameHeight;
  let running = false;
  let score = 0;
  let best = parseInt(localStorage.getItem('blockblast_best') || '0', 10);
  const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
  let pieces = [];
  let selectedPiece = null;
  let gameOver = false;
  let mouseX = 0, mouseY = 0, offsetX = 0, offsetY = 0, isDragging = false;
  const animations = []; // For placement and clear animations
  const particles = []; // For clear explosions

  // Canvas setup
  const canvas = document.getElementById('canvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  const ctx = canvas.getContext('2d', { alpha: true });
  const DPR = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(400, Math.floor(rect.width * DPR));
    canvas.height = Math.max(400, Math.floor(rect.height * DPR));
    W = canvas.width; H = canvas.height;
    updateLayout(); // Recalculate layout on resize
    render(); // Re-render on resize to maintain visibility
  }
  canvas.style.width = '100%';
  resize();
  window.addEventListener('resize', resize);

  // UI elements
  const btnStart = document.getElementById('btnStart');
  const btnBack = document.getElementById('btnBack');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  if (!btnStart || !btnBack || !scoreEl || !bestEl) {
    console.error('One or more UI elements not found!');
    return;
  }
  bestEl.textContent = best;

  // Audio setup
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioContext ? new AudioContext() : null;
  let sfxGain;
  if (audioCtx) {
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(audioCtx.destination);
  }

  function playPlacementSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(440, audioCtx.currentTime);
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    o.connect(g);
    g.connect(sfxGain);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    o.stop(audioCtx.currentTime + 0.25);
  }

  function playLineDestructionSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    g.gain.setValueAtTime(0.25, audioCtx.currentTime);
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(1200, audioCtx.currentTime);
    o.connect(filt);
    filt.connect(g);
    g.connect(sfxGain);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    o.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
    o.stop(audioCtx.currentTime + 0.3);
  }

  function playClearSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(660, audioCtx.currentTime);
    g.gain.setValueAtTime(0.2, audioCtx.currentTime);
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(800, audioCtx.currentTime);
    o.connect(filt);
    filt.connect(g);
    g.connect(sfxGain);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    o.stop(audioCtx.currentTime + 0.35);
  }

  function playGameOverSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, audioCtx.currentTime);
    g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    o.connect(g);
    g.connect(sfxGain);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
    o.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 1.0);
    o.stop(audioCtx.currentTime + 1.1);
  }

  // Block shapes
  const shapes = [
    [[1, 1], [1, 1]],
    [[1, 1, 1]],
    [[1], [1], [1]],
    [[1, 1], [0, 1]],
    [[1, 0], [1, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1]],
    [[1], [1]],
    [[1]],
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1], [1, 0]],
    [[1, 1, 1], [0, 0, 1]]
  ];

  // Generate 3 pieces
  function generatePieces() {
    pieces = [];
    for (let i = 0; i < 3; i++) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)].map(row => [...row]);
      const hue = Math.random() * 360;
      pieces.push({ shape, hue });
    }
  }

  // Check if a piece can be placed at row, col
  function canPlace(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const gr = row + r;
          const gc = col + c;
          if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE || grid[gr][gc]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Count cells in a shape
  function countCells(shape) {
    return shape.flat().filter(cell => cell === 1).length;
  }

  // Ease function (quadratic in-out)
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // Place the selected piece on the grid
  function placePiece() {
    if (!selectedPiece || gameOver) return;
    const { shape, hue } = selectedPiece.piece;
    const row = selectedPiece.row;
    const col = selectedPiece.col;
    if (!canPlace(shape, row, col)) return;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          grid[row + r][col + c] = hue;
          // Add placement animation with easing
          animations.push({ type: 'placement', r: row + r, c: col + c, hue, age: 0, life: 0.4, scale: 0 });
        }
      }
    }
    playPlacementSound();
    score += countCells(shape) * 10;
    const cleared = clearLines();
    if (cleared > 0) {
      score += cleared * 100;
      if (cleared > 1) score += (cleared - 1) * 50;
      playLineDestructionSound(); // Sound for line destruction
    }
    pieces.splice(selectedPiece.index, 1);
    generatePieces(); // Generate new set of 3 pieces
    selectedPiece = null;
    checkGameOver();
    updateScore();
  }

  // Clear full rows and columns with animation
  function clearLines() {
    let cleared = 0;
    let toClearRows = [];
    let toClearCols = [];
    // Identify full rows
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r].every(cell => cell !== 0)) {
        toClearRows.push(r);
        cleared++;
      }
    }
    // Identify full columns
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.every(row => row[c] !== 0)) {
        toClearCols.push(c);
        cleared++;
      }
    }
    // Add clear animations and particles with easing
    toClearRows.forEach(r => {
      for (let c = 0; c < GRID_SIZE; c++) {
        animations.push({ type: 'clear', r, c, hue: grid[r][c], age: 0, life: 0.6, alpha: 1 });
        spawnParticles((c + 0.5) * (gameWidth / GRID_SIZE) + leftX, (r + 0.5) * (gameHeight / GRID_SIZE) + topY, `hsl(${grid[r][c]} 90% 60%)`, 5, 1.2);
      }
    });
    toClearCols.forEach(c => {
      for (let r = 0; r < GRID_SIZE; r++) {
        animations.push({ type: 'clear', r, c, hue: grid[r][c], age: 0, life: 0.6, alpha: 1 });
        spawnParticles((c + 0.5) * (gameWidth / GRID_SIZE) + leftX, (r + 0.5) * (gameHeight / GRID_SIZE) + topY, `hsl(${grid[r][c]} 90% 60%)`, 5, 1.2);
      }
    });
    playClearSound();
    // Clear the grid after animation setup
    toClearRows.forEach(r => grid[r].fill(0));
    toClearCols.forEach(c => {
      for (let r = 0; r < GRID_SIZE; r++) {
        grid[r][c] = 0;
      }
    });
    return cleared;
  }

  // Spawn particles for clears
  function spawnParticles(x, y, color, count = 5, spread = 1.2) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() * 2 - 1) * spread,
        vy: (Math.random() * 2 - 1) * spread,
        life: rand(0.4, 0.8),
        age: 0,
        size: rand(2, 4),
        color
      });
    }
  }

  // Check for game over
  function checkGameOver() {
    let canPlaceAny = false;
    for (let piece of pieces) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlace(piece.shape, r, c)) {
            canPlaceAny = true;
            break;
          }
        }
        if (canPlaceAny) break;
      }
      if (canPlaceAny) break;
    }
    if (!canPlaceAny) {
      gameOver = true;
      running = false;
      playGameOverSound();
      if (score > best) {
        best = score;
        localStorage.setItem('blockblast_best', String(best));
        bestEl.textContent = best;
      }
    }
  }

  // Update score display
  function updateScore() {
    scoreEl.textContent = score;
  }

  // Update animations and particles with easing
  function updateAnimations(dt) {
    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i];
      anim.age += dt;
      const progress = Math.min(1, anim.age / anim.life);
      const easedProgress = easeInOutQuad(progress);
      if (anim.type === 'placement') {
        anim.scale = easedProgress * 1.2; // Scale in smoothly
      } else if (anim.type === 'clear') {
        anim.alpha = 1 - easedProgress; // Fade out smoothly
      }
      if (anim.age >= anim.life) {
        animations.splice(i, 1);
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const pa = particles[i];
      pa.age += dt;
      pa.x += pa.vx;
      pa.y += pa.vy;
      pa.vy += 0.2 * dt; // Gravity with time scaling
      if (pa.age >= pa.life) {
        particles.splice(i, 1);
      }
    }
  }

  // Input handling for dragging
  canvas.addEventListener('mousedown', e => {
    if (!running || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
    selectPiece();
    isDragging = !!selectedPiece;
  });
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });
  canvas.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;
    placePiece();
  });
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!running || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (W / rect.width);
    mouseY = (touch.clientY - rect.top) * (H / rect.height);
    selectPiece();
    isDragging = !!selectedPiece;
  });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (W / rect.width);
    mouseY = (touch.clientY - rect.top) * (H / rect.height);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (!isDragging) return;
    isDragging = false;
    placePiece();
  });

  // Select a piece from the left (desktop) or bottom (mobile) area
  function selectPiece() {
    if (window.innerWidth > 820) {
      // Desktop: left area
      if (mouseX > leftX) return;
      const pieceWidth = leftX / 3;
      const pieceHeight = gameHeight / 3;
      const index = Math.floor(mouseY / pieceHeight);
      if (index < 0 || index >= pieces.length) return;
      selectedPiece = { piece: pieces[index], index, row: 0, col: 0 };
      const shape = pieces[index].shape;
      const maxC = Math.max(...shape.map(row => row.length));
      const maxR = shape.length;
      const pCell = Math.min(pieceWidth / maxC, pieceHeight / maxR) * 0.8;
      offsetX = mouseX - ((pieceWidth - maxC * pCell) / 2 + (maxC * pCell) / 2);
      offsetY = mouseY - (index * pieceHeight + (pieceHeight - maxR * pCell) / 2 + (maxR * pCell) / 2);
    } else {
      // Mobile: bottom area
      if (mouseY < bottomY) return;
      const pieceWidth = gameWidth / 3;
      const pieceHeight = (H - bottomY) / 1; // Full bottom area height
      const index = Math.floor(mouseX / pieceWidth);
      if (index < 0 || index >= pieces.length) return;
      selectedPiece = { piece: pieces[index], index, row: 0, col: 0 };
      const shape = pieces[index].shape;
      const maxC = Math.max(...shape.map(row => row.length));
      const maxR = shape.length;
      const pCell = Math.min(pieceWidth / maxC, pieceHeight / maxR) * 0.8;
      offsetX = mouseX - (index * pieceWidth + (pieceWidth - maxC * pCell) / 2 + (maxC * pCell) / 2);
      offsetY = mouseY - ((pieceHeight - maxR * pCell) / 2 + (maxR * pCell) / 2);
    }
  }

  // UI buttons
  btnStart.addEventListener('click', () => {
    console.log('Start button clicked'); // Debug log
    grid.forEach(row => row.fill(0));
    score = 0;
    gameOver = false;
    running = true;
    generatePieces();
    updateScore();
    render(); // Force render to reflect new state
  });

  btnBack.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Utility
  function rand(a, b) { return a + Math.random() * (b - a); }

  // Update layout
  function updateLayout() {
    if (window.innerWidth > 820) {
      // Desktop layout
      leftX = W * 0.25; // 25% of width for piece selection
      gameWidth = W * 0.75; // 75% of width for game grid
      topY = 0;
      gameHeight = H;
      bottomY = 0; // Not used on desktop
    } else {
      // Mobile layout: pieces at bottom
      topY = 0;
      gameWidth = W;
      gameHeight = H * 0.7; // 70% of height for game grid to ensure full visibility
      leftX = 0;
      bottomY = H * 0.7; // 30% of height for piece selection at bottom
    }
  }

  // Rendering
  let bottomY;
  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function render() {
    ctx.clearRect(0, 0, W, H); // Full clear to prevent overlap
    const cellSize = Math.min(gameWidth / GRID_SIZE, gameHeight / GRID_SIZE); // Ensure square cells
    const padding = cellSize * 0.1;
    const gridWidth = cellSize * GRID_SIZE;
    const gridHeight = cellSize * GRID_SIZE;

    // Adjust game area to fit 8x8 grid
    const gameX = leftX + (gameWidth - gridWidth) / 2;
    const gameY = topY + (gameHeight - gridHeight) / 2;

    // Draw pieces area (left for desktop, bottom for mobile)
    if (window.innerWidth > 820) {
      // Desktop: left area
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,255,255,0.1)';
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, leftX, H);
      ctx.restore();
      const pieceWidth = leftX / 3;
      const pieceHeight = gameHeight / 3;
      for (let i = 0; i < pieces.length; i++) {
        const shape = pieces[i].shape;
        const hue = pieces[i].hue;
        const maxR = shape.length;
        const maxC = Math.max(...shape.map(row => row.length));
        const pCell = Math.min(pieceWidth / maxC, pieceHeight / maxR) * 0.8;
        const pPadding = pCell * 0.1;
        const xOffset = (pieceWidth - maxC * pCell) / 2;
        const yOffset = i * pieceHeight + (pieceHeight - maxR * pCell) / 2;
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = `hsl(${hue} 90% 60% / 0.8)`;
        ctx.fillStyle = `hsl(${hue} 90% 60%)`;
        for (let r = 0; r < maxR; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              drawRoundedRect(xOffset + c * pCell + pPadding, yOffset + r * pCell + pPadding, pCell - 2 * pPadding, pCell - 2 * pPadding, pPadding * 1.2);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }
    } else {
      // Mobile: bottom area
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,255,255,0.1)';
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, bottomY, W, H - bottomY);
      ctx.restore();
      const pieceWidth = gameWidth / 3;
      const pieceHeight = (H - bottomY) / 1; // Full bottom area height
      for (let i = 0; i < pieces.length; i++) {
        const shape = pieces[i].shape;
        const hue = pieces[i].hue;
        const maxR = shape.length;
        const maxC = Math.max(...shape.map(row => row.length));
        const pCell = Math.min(pieceWidth / maxC, pieceHeight / maxR) * 0.8;
        const pPadding = pCell * 0.1;
        const xOffset = i * pieceWidth + (pieceWidth - maxC * pCell) / 2;
        const yOffset = (pieceHeight - maxR * pCell) / 2;
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = `hsl(${hue} 90% 60% / 0.8)`;
        ctx.fillStyle = `hsl(${hue} 90% 60%)`;
        for (let r = 0; r < maxR; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              drawRoundedRect(xOffset + c * pCell + pPadding, bottomY + yOffset + r * pCell + pPadding, pCell - 2 * pPadding, pCell - 2 * pPadding, pPadding * 1.2);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }
    }

    // Draw game grid background with glow
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255,255,255,0.1)';
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(gameX, gameY, gridWidth, gridHeight); // Game grid area
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const yPos = gameY + i * cellSize;
      if (yPos < gameY + gridHeight) { // Limit vertical lines
        ctx.beginPath();
        ctx.moveTo(gameX + i * cellSize, gameY);
        ctx.lineTo(gameX + i * cellSize, gameY + gridHeight);
        ctx.stroke();
      }
      const xPos = gameX + i * cellSize;
      if (xPos < gameX + gridWidth) { // Limit horizontal lines
        ctx.beginPath();
        ctx.moveTo(gameX, gameY + i * cellSize);
        ctx.lineTo(gameX + gridWidth, gameY + i * cellSize);
        ctx.stroke();
      }
    }

    // Draw placed blocks
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c]) {
          ctx.save();
          ctx.shadowBlur = 16;
          ctx.shadowColor = `hsl(${grid[r][c]} 90% 60% / 0.8)`;
          ctx.fillStyle = `hsl(${grid[r][c]} 90% 60%)`;
          drawRoundedRect(gameX + c * cellSize + padding, gameY + r * cellSize + padding, cellSize - 2 * padding, cellSize - 2 * padding, padding * 1.2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Draw dragged piece
    if (isDragging && selectedPiece) {
      const { shape, hue } = selectedPiece.piece;
      const maxR = shape.length;
      const maxC = Math.max(...shape.map(row => row.length));
      const pCell = cellSize;
      const pPadding = padding;
      const x = mouseX - offsetX;
      const y = mouseY - offsetY;
      selectedPiece.row = Math.round((y - maxR * pCell / 2 - gameY) / cellSize);
      selectedPiece.col = Math.round((x - maxC * pCell / 2 - gameX) / cellSize);
      const canPlaceHere = canPlace(shape, selectedPiece.row, selectedPiece.col);
      ctx.save();
      ctx.globalAlpha = canPlaceHere ? 0.8 : 0.3;
      ctx.shadowBlur = canPlaceHere ? 20 : 10;
      ctx.shadowColor = `hsl(${hue} 90% 60% / ${canPlaceHere ? 0.9 : 0.4})`;
      ctx.fillStyle = `hsl(${hue} 90% 60%)`;
      for (let r = 0; r < maxR; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawRoundedRect(x + c * pCell - maxC * pCell / 2 + pPadding, y + r * pCell - maxR * pCell / 2 + pPadding, pCell - 2 * pPadding, pCell - 2 * pPadding, pPadding * 1.2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // Draw animations with easing
    animations.forEach(anim => {
      ctx.save();
      const progress = Math.min(1, anim.age / anim.life);
      const easedProgress = easeInOutQuad(progress);
      if (anim.type === 'placement') {
        const scale = anim.scale * (1 - easedProgress) + easedProgress;
        ctx.translate(gameX + (anim.c + 0.5) * cellSize, gameY + (anim.r + 0.5) * cellSize);
        ctx.scale(scale, scale);
        ctx.translate(-gameX - (anim.c + 0.5) * cellSize, -gameY - (anim.r + 0.5) * cellSize);
        ctx.shadowBlur = 16 * (1 - easedProgress);
        ctx.shadowColor = `hsl(${anim.hue} 90% 60% / ${1 - easedProgress})`;
        ctx.fillStyle = `hsl(${anim.hue} 90% 60%)`;
        drawRoundedRect(gameX + anim.c * cellSize + padding, gameY + anim.r * cellSize + padding, cellSize - 2 * padding, cellSize - 2 * padding, padding);
        ctx.fill();
      } else if (anim.type === 'clear') {
        ctx.globalAlpha = anim.alpha * (1 - easedProgress);
        ctx.shadowBlur = 16 * easedProgress;
        ctx.shadowColor = `hsl(${anim.hue} 90% 60% / ${1 - easedProgress})`;
        ctx.fillStyle = `hsl${anim.hue} 90% 60%)`;
        drawRoundedRect(gameX + anim.c * cellSize + padding, gameY + anim.r * cellSize + padding, cellSize - 2 * padding, cellSize - 2 * padding, padding * (1 - easedProgress));
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw particles with boundary check
    particles.forEach(pa => {
      ctx.save();
      const progress = pa.age / pa.life;
      ctx.globalAlpha = 1 - easeInOutQuad(progress);
      ctx.fillStyle = pa.color;
      if (pa.x >= gameX && pa.x <= gameX + gridWidth && pa.y >= gameY && pa.y <= gameY + gridHeight) {
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, pa.size * (1 - progress), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw game over
    if (gameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,10,0.6)';
      ctx.fillRect(gameX, gameY, gridWidth, gridHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `${28 * (gridWidth / 600)}px Inter, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', gameX + gridWidth / 2, gameY + gridHeight * 0.42);
      ctx.font = `${14 * (gridWidth / 600)}px Inter, Arial`;
      ctx.fillStyle = 'rgba(207,239,255,0.9)';
      ctx.fillText('Нажми Старт для новой игры', gameX + gridWidth / 2, gameY + gridHeight * 0.5);
      ctx.textAlign = 'start';
      ctx.restore();
    }
  }

  // Main loop with delta time
  let lastTS = performance.now();
  function loop(ts) {
    const dt = Math.min(0.1, (ts - lastTS) / 1000);
    lastTS = ts;
    updateAnimations(dt);
    render();
    requestAnimationFrame(loop);
  }

  // Initialize
  updateLayout();
  render(); // Initial render to show empty grid
  loop();
})();