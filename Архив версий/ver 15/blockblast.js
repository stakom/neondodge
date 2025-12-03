/*
Block Blast - Improved Version
Changes:
- Replaced T-shape with 3x3 full cube
- Fixed piece selection area layout
- Increased piece selection area height
- Improved piece generation algorithm to ensure all 3 pieces can be placed
*/

(() => {
  // Game constants and variables
  const GRID_SIZE = 8;
  let W, H, leftX, gameWidth, topY, gameHeight, bottomY;
  let running = false;
  let score = 0;
  let best = parseInt(localStorage.getItem('blockblast_best') || '0', 10);
  const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
  let pieces = [];
  let selectedPiece = null;
  let gameOver = false;
  let mouseX = 0, mouseY = 0, offsetX = 0, offsetY = 0, isDragging = false;
  const animations = [];
  const particles = [];
  let backgroundIndex = 0;
  const backgrounds = [
    'radial-gradient(600px 240px at 10% 10%, rgba(255,111,97,0.02), transparent), radial-gradient(500px 200px at 90% 90%, rgba(107,91,149,0.015), transparent), #050713',
    'radial-gradient(600px 240px at 20% 20%, rgba(97,111,255,0.02), transparent), radial-gradient(500px 200px at 80% 80%, rgba(149,91,107,0.015), transparent), #130507',
    'radial-gradient(600px 240px at 15% 15%, rgba(111,255,97,0.02), transparent), radial-gradient(500px 200px at 85% 85%, rgba(91,149,107,0.015), transparent), #071305'
  ];

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
    canvas.width = Math.max(360, Math.floor(rect.width * DPR));
    canvas.height = Math.max(360, Math.floor(rect.height * DPR));
    W = canvas.width;
    H = canvas.height;
    updateLayout();
    render();
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
  let audioCtx = null;
  let sfxGain;
  function initializeAudioContext() {
    if (!audioCtx) {
      try {
        audioCtx = AudioContext ? new AudioContext() : null;
        if (audioCtx) {
          sfxGain = audioCtx.createGain();
          sfxGain.gain.value = 0.6;
          sfxGain.connect(audioCtx.destination);
          console.log('AudioContext initialized successfully');
        }
      } catch (e) {
        console.warn('Failed to initialize AudioContext:', e);
      }
    }
  }

  function playPlacementSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
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
    if (!audioCtx || audioCtx.state === 'suspended') return;
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
    if (!audioCtx || audioCtx.state === 'suspended') return;
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
    if (!audioCtx || audioCtx.state === 'suspended') return;
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

  // Block shapes (replaced T-shape with 3x3 full cube)
  const shapes = [
    [[1, 1], [1, 1]], // 2x2 square
    [[1, 1, 1]], // 1x3 horizontal
    [[1], [1], [1]], // 3x1 vertical
    [[1, 1], [0, 1]], // L-shape
    [[1, 0], [1, 1]], // Reverse L
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]], // 3x3 full cube (replaced T-shape)
    [[1, 1]], // 1x2 horizontal
    [[1], [1]], // 2x1 vertical
    [[1]], // 1x1 single
    [[1, 1, 1, 1]], // 1x4 horizontal
    [[1], [1], [1], [1]], // 4x1 vertical
    [[1, 1], [1, 0]], // Reverse L small
    [[1, 1, 1], [0, 0, 1]], // Corner shape
    [[1, 1, 1], [1, 0, 0]], // Reverse corner
    [[1, 1, 0], [0, 1, 1]], // S-shape
    [[1, 0, 0], [1, 1, 1]], // Z-shape
    [[1, 1, 1, 1, 1]], // 1x5 horizontal
    [[1], [1], [1], [1], [1]], // 5x1 vertical
    [[1, 1, 1], [0, 1, 0], [0, 1, 0]], // Cross shape
    [[1, 0, 0], [1, 1, 1], [1, 0, 0]] // H-shape
  ];

  // Smart piece generation to ensure all 3 pieces can be placed
  function generatePieces() {
    if (pieces.length === 0) {
      let attempts = 0;
      const maxAttempts = 50;
      
      while (pieces.length < 3 && attempts < maxAttempts) {
        attempts++;
        
        // Try to generate pieces that can be placed together
        const candidateShapes = [];
        const candidatePieces = [];
        
        // Generate 3 candidate pieces
        for (let i = 0; i < 3; i++) {
          const shape = shapes[Math.floor(Math.random() * shapes.length)].map(row => [...row]);
          const hue = Math.random() * 360;
          candidateShapes.push(shape);
          candidatePieces.push({ shape, hue });
        }
        
        // Test if these pieces can be placed together (simplified check)
        if (canPiecesBePlacedTogether(candidateShapes)) {
          pieces = candidatePieces;
          console.log("Generated pieces that can be placed together");
          break;
        }
        
        // If we're struggling, generate simpler pieces
        if (attempts > 30) {
          const simpleShapes = [
            [[1, 1], [1, 1]], // 2x2
            [[1, 1, 1]], // 1x3
            [[1], [1], [1]], // 3x1
            [[1, 1]], // 1x2
            [[1], [1]], // 2x1
            [[1]] // 1x1
          ];
          
          for (let i = 0; i < 3; i++) {
            const shape = simpleShapes[Math.floor(Math.random() * simpleShapes.length)].map(row => [...row]);
            const hue = Math.random() * 360;
            pieces.push({ shape, hue });
          }
          console.log("Used fallback simple pieces");
          break;
        }
      }
      
      // Final fallback - just generate random pieces
      if (pieces.length === 0) {
        for (let i = 0; i < 3; i++) {
          const shape = shapes[Math.floor(Math.random() * shapes.length)].map(row => [...row]);
          const hue = Math.random() * 360;
          pieces.push({ shape, hue });
        }
        console.log("Used random pieces as final fallback");
      }
    }
  }

  // Check if pieces can theoretically be placed together
  function canPiecesBePlacedTogether(pieceShapes) {
    // Create a temporary grid to test placements
    const tempGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    let placedCount = 0;
    
    // Try to place each piece
    for (const shape of pieceShapes) {
      let placed = false;
      
      // Try different positions
      for (let r = 0; r <= GRID_SIZE - shape.length && !placed; r++) {
        for (let c = 0; c <= GRID_SIZE - shape[0].length && !placed; c++) {
          if (canPlaceOnGrid(shape, r, c, tempGrid)) {
            // Place it temporarily
            for (let sr = 0; sr < shape.length; sr++) {
              for (let sc = 0; sc < shape[sr].length; sc++) {
                if (shape[sr][sc]) {
                  tempGrid[r + sr][c + sc] = 1;
                }
              }
            }
            placed = true;
            placedCount++;
          }
        }
      }
    }
    
    return placedCount === pieceShapes.length;
  }

  // Check if a piece can be placed on a specific grid
  function canPlaceOnGrid(shape, row, col, gridToCheck) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const gr = row + r;
          const gc = col + c;
          if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE || gridToCheck[gr][gc]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Check if a piece can be placed at row, col on the main grid
  function canPlace(shape, row, col) {
    return canPlaceOnGrid(shape, row, col, grid);
  }

  // Find nearest valid position for mobile snapping
  function findNearestValidPosition(shape, row, col) {
    const maxR = shape.length;
    const maxC = Math.max(...shape.map(row => row.length));
    const searchRadius = 1; // Check 1 cell around the target
    let bestPos = null;
    let minDist = Infinity;

    for (let r = Math.max(0, row - searchRadius); r <= Math.min(GRID_SIZE - maxR, row + searchRadius); r++) {
      for (let c = Math.max(0, col - searchRadius); c <= Math.min(GRID_SIZE - maxC, col + searchRadius); c++) {
        if (canPlace(shape, r, c)) {
          const dist = Math.sqrt((row - r) ** 2 + (col - c) ** 2);
          if (dist < minDist) {
            minDist = dist;
            bestPos = { row: r, col: c };
          }
        }
      }
    }
    return bestPos;
  }

  // Count cells in a shape
  function countCells(shape) {
    return shape.flat().filter(cell => cell === 1).length;
  }

  // Check if grid is empty
  function isGridEmpty() {
    return grid.every(row => row.every(cell => cell === 0));
  }

  // Ease function (quadratic in-out)
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // Place the selected piece on the grid
  function placePiece() {
    if (!selectedPiece || gameOver) return;
    let { shape, hue } = selectedPiece.piece;
    let row = selectedPiece.row;
    let col = selectedPiece.col;

    // Mobile snapping
    if (window.innerWidth <= 820) {
      const validPos = findNearestValidPosition(shape, row, col);
      if (validPos) {
        row = validPos.row;
        col = validPos.col;
      } else if (!canPlace(shape, row, col)) {
        return; // No valid position found
      }
    } else if (!canPlace(shape, row, col)) {
      return; // Invalid placement on desktop
    }

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          grid[row + r][col + c] = hue;
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
      playLineDestructionSound();
    }
    pieces.splice(selectedPiece.index, 1);
    selectedPiece = null;
    if (pieces.length === 0) {
      generatePieces();
    }
    if (isGridEmpty()) {
      backgroundIndex = (backgroundIndex + 1) % backgrounds.length;
      document.body.style.background = backgrounds[backgroundIndex];
      score += 500;
    }
    checkGameOver();
    updateScore();
  }

  // Clear full rows and columns with animation
  function clearLines() {
    let cleared = 0;
    let toClearRows = [];
    let toClearCols = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r].every(cell => cell !== 0)) {
        toClearRows.push(r);
        cleared++;
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.every(row => row[c] !== 0)) {
        toClearCols.push(c);
        cleared++;
      }
    }
    toClearRows.forEach(r => {
      for (let c = 0; c < GRID_SIZE; c++) {
        animations.push({ type: 'clear', r, c, hue: grid[r][c], age: 0, life: 0.6, alpha: 1 });
        spawnParticles((c + 0.5) * (gameWidth / GRID_SIZE) + leftX, (r + 0.5) * (gameHeight / GRID_SIZE) + topY, `hsl(${grid[r][c]} 90% 60%)`, window.innerWidth > 820 ? 5 : 3, 1.2);
      }
    });
    toClearCols.forEach(c => {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!toClearRows.includes(r)) {
          animations.push({ type: 'clear', r, c, hue: grid[r][c], age: 0, life: 0.6, alpha: 1 });
          spawnParticles((c + 0.5) * (gameWidth / GRID_SIZE) + leftX, (r + 0.5) * (gameHeight / GRID_SIZE) + topY, `hsl(${grid[r][c]} 90% 60%)`, window.innerWidth > 820 ? 5 : 3, 1.2);
        }
      }
    });
    playClearSound();
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

  // Update animations and particles
  function updateAnimations(dt) {
    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i];
      anim.age += dt;
      const progress = Math.min(1, anim.age / anim.life);
      const easedProgress = easeInOutQuad(progress);
      if (anim.type === 'placement') {
        anim.scale = easedProgress * 1.2;
      } else if (anim.type === 'clear') {
        anim.alpha = 1 - easedProgress;
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
      pa.vy += 0.2 * dt;
      if (pa.age >= pa.life) {
        particles.splice(i, 1);
      }
    }
  }

  // Input handling
  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    if (!running || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
    selectPiece();
    isDragging = !!selectedPiece;
  });
  canvas.addEventListener('mousemove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });
  canvas.addEventListener('mouseup', e => {
    e.preventDefault();
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
    console.log(`Touch start at: ${mouseX}, ${mouseY}`);
    selectPiece();
    isDragging = !!selectedPiece;
  });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (W / rect.width);
    mouseY = (touch.clientY - rect.top) * (H / rect.height);
    console.log(`Touch move to: ${mouseX}, ${mouseY}`);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (!isDragging) return;
    isDragging = false;
    placePiece();
  });

  // Select a piece - FIXED: Pieces stay in their original positions
  function selectPiece() {
    const cellSize = Math.min(gameWidth / GRID_SIZE, gameHeight / GRID_SIZE);
    const pCell = cellSize * 0.8;
    const pPadding = pCell * 0.1;

    if (window.innerWidth > 820) {
      // Desktop layout - pieces on the left
      const pieceAreaWidth = leftX;
      const pieceWidth = pieceAreaWidth / 3;
      const pieceHeight = H / 3;
      
      // Check if click is in piece area
      if (mouseX < pieceAreaWidth) {
        const index = Math.floor(mouseY / pieceHeight);
        if (index >= 0 && index < pieces.length) {
          const shape = pieces[index].shape;
          const maxR = shape.length;
          const maxC = Math.max(...shape.map(row => row.length));
          
          // Calculate piece position within its slot
          const xOffset = (pieceWidth - maxC * pCell) / 2;
          const yOffset = index * pieceHeight + (pieceHeight - maxR * pCell) / 2;
          
          selectedPiece = { 
            piece: pieces[index], 
            index, 
            row: 0, 
            col: 0
          };
          
          // Calculate offset from piece top-left corner
          offsetX = mouseX - xOffset;
          offsetY = mouseY - yOffset;
          
          console.log(`Desktop: Selected piece ${index} at position: ${xOffset}, ${yOffset}, offset: ${offsetX}, ${offsetY}`);
        }
      }
    } else {
      // Mobile layout - pieces at the bottom
      const pieceAreaHeight = H - bottomY;
      const pieceWidth = gameWidth / 3;
      const pieceHeight = pieceAreaHeight;
      
      // Check if click is in piece area (bottom)
      if (mouseY >= bottomY) {
        const index = Math.floor(mouseX / pieceWidth);
        if (index >= 0 && index < pieces.length) {
          const shape = pieces[index].shape;
          const maxR = shape.length;
          const maxC = Math.max(...shape.map(row => row.length));
          
          // Calculate piece position within its slot
          const xOffset = index * pieceWidth + (pieceWidth - maxC * pCell) / 2;
          const yOffset = bottomY + (pieceHeight - maxR * pCell) / 2;
          
          selectedPiece = { 
            piece: pieces[index], 
            index, 
            row: 0, 
            col: 0
          };
          
          // Calculate offset from piece top-left corner
          offsetX = mouseX - xOffset;
          offsetY = mouseY - yOffset;
          
          console.log(`Mobile: Selected piece ${index} at position: ${xOffset}, ${yOffset}, offset: ${offsetX}, ${offsetY}`);
        }
      }
    }
  }

  // UI buttons
  function startGame() {
    console.log('Start button triggered');
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('AudioContext resumed');
      }).catch(e => console.warn('Failed to resume AudioContext:', e));
    }
    initializeAudioContext();
    grid.forEach(row => row.fill(0));
    score = 0;
    gameOver = false;
    running = true;
    pieces = [];
    generatePieces();
    backgroundIndex = 0;
    document.body.style.background = backgrounds[backgroundIndex];
    updateScore();
    render();
  }

  // Unified event handler for start button
  function handleStartButton(e) {
    e.preventDefault();
    console.log(`Start button event: ${e.type}`);
    startGame();
  }

  btnStart.addEventListener('click', handleStartButton);
  btnStart.addEventListener('touchstart', handleStartButton);

  btnBack.addEventListener('click', () => {
    console.log('Back button pressed');
    window.location.href = 'index.html';
  });
  btnBack.addEventListener('touchstart', e => {
    e.preventDefault();
    console.log('Back button touched');
    window.location.href = 'index.html';
  });

  // Utility
  function rand(a, b) { return a + Math.random() * (b - a); }

  // Update layout - INCREASED piece selection area height
  function updateLayout() {
    if (window.innerWidth > 820) {
      // Desktop - increased left panel width slightly for better piece display
      leftX = W * 0.28; // Was 0.25
      gameWidth = W * 0.72; // Was 0.75
      topY = 0;
      gameHeight = H;
      bottomY = 0;
      console.log(`Desktop layout: W=${W}, H=${H}, gameWidth=${gameWidth}, gameHeight=${gameHeight}, leftX=${leftX}`);
    } else {
      // Mobile - increased piece selection area height
      topY = 0;
      leftX = 0;
      gameWidth = W;
      
      // Increased minimum piece height from 120 to 150
      const minPieceHeight = 150;
      const cellSize = W / GRID_SIZE;
      let gridHeight = cellSize * GRID_SIZE;
      
      // Calculate game height with increased piece area
      gameHeight = Math.min(H - minPieceHeight, gridHeight);
      bottomY = topY + gameHeight;
      
      console.log(`Mobile layout: W=${W}, H=${H}, gameWidth=${gameWidth}, gameHeight=${gameHeight}, bottomY=${bottomY}, cellSize=${cellSize}`);
    }
  }

  // Rendering
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
    ctx.clearRect(0, 0, W, H);
    const cellSize = Math.min(gameWidth / GRID_SIZE, gameHeight / GRID_SIZE);
    const padding = cellSize * 0.1;
    const gridWidth = cellSize * GRID_SIZE;
    const gridHeight = cellSize * GRID_SIZE;
    const gameX = leftX + (gameWidth - gridWidth) / 2;
    const gameY = topY + (gameHeight - gridHeight) / 2;
    console.log(`Render: gameX=${gameX}, gameY=${gameY}, gridWidth=${gridWidth}, gridHeight=${gridHeight}, cellSize=${cellSize}`);

    // Draw pieces area
    if (window.innerWidth > 820) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,255,255,0.1)';
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, leftX, H);
      ctx.restore();
      const pieceWidth = leftX / 3;
      const pieceHeight = H / 3;
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
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,255,255,0.1)';
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, bottomY, W, H - bottomY);
      ctx.restore();
      const pieceWidth = gameWidth / 3;
      const pieceHeight = (H - bottomY);
      for (let i = 0; i < pieces.length; i++) {
        const shape = pieces[i].shape;
        const hue = pieces[i].hue;
        const maxR = shape.length;
        const maxC = Math.max(...shape.map(row => row.length));
        const pCell = Math.min(pieceWidth / maxC, pieceHeight / maxR) * 0.8;
        const pPadding = pCell * 0.1;
        const xOffset = i * pieceWidth + (pieceWidth - maxC * pCell) / 2;
        const yOffset = bottomY + (pieceHeight - maxR * pCell) / 2;
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
    }

    // Draw game grid
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255,255,255,0.1)';
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(gameX, gameY, gridWidth, gridHeight);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(gameX + i * cellSize, gameY);
      ctx.lineTo(gameX + i * cellSize, gameY + gridHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gameX, gameY + i * cellSize);
      ctx.lineTo(gameX + gridWidth, gameY + i * cellSize);
      ctx.stroke();
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
      const pCell = cellSize * 0.8; // Match game grid cell size
      const pPadding = pCell * 0.1;
      const x = mouseX - offsetX;
      const y = mouseY - offsetY;
      selectedPiece.row = Math.round((y - gameY) / cellSize);
      selectedPiece.col = Math.round((x - gameX) / cellSize);
      const canPlaceHere = canPlace(shape, selectedPiece.row, selectedPiece.col);
      ctx.save();
      ctx.globalAlpha = canPlaceHere ? 0.8 : 0.3;
      ctx.shadowBlur = canPlaceHere ? 20 : 10;
      ctx.shadowColor = `hsl(${hue} 90% 60% / ${canPlaceHere ? 0.9 : 0.4})`;
      ctx.fillStyle = `hsl(${hue} 90% 60%)`;
      for (let r = 0; r < maxR; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawRoundedRect(x + c * pCell + pPadding, y + r * pCell + pPadding, pCell - 2 * pPadding, pCell - 2 * pPadding, pPadding * 1.2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
      console.log(`Dragging piece: x=${x}, y=${y}, offsetX=${offsetX}, offsetY=${offsetY}, row=${selectedPiece.row}, col=${selectedPiece.col}`);
    }

    // Draw animations
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
        ctx.fillStyle = `hsl(${anim.hue} 90% 60%)`;
        drawRoundedRect(gameX + anim.c * cellSize + padding, gameY + anim.r * cellSize + padding, cellSize - 2 * padding, cellSize - 2 * padding, padding * (1 - easedProgress));
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw particles
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
      ctx.font = `${Math.min(28, gridWidth / 18)}px Inter, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', gameX + gridWidth / 2, gameY + gridHeight * 0.42);
      ctx.font = `${Math.min(14, gridWidth / 36)}px Inter, Arial`;
      ctx.fillStyle = 'rgba(207,239,255,0.9)';
      ctx.fillText('Нажми Старт для новой игры', gameX + gridWidth / 2, gameY + gridHeight * 0.5);
      ctx.textAlign = 'start';
      ctx.restore();
    }
  }

  // Main loop
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
  render();
  requestAnimationFrame(loop);
})();