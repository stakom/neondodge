(() => {
  // Константы и переменные игры
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;
  let W, H, gameWidth, gameHeight, leftX, topY;
  let running = false;
  let paused = false;
  let score = 0;
  let level = 1;
  let lines = 0;
  let best = parseInt(localStorage.getItem('tetris_best') || '0', 10);
  let gameOver = false;
  let soundEnabled = true;
  
  // Игровое поле
  const board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
  
  // Текущая и следующая фигура
  let currentPiece = null;
  let nextPiece = null;

  // Время и интервалы
  let dropTime = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  
  // Анимации и частицы
  const animations = [];
  const particles = [];
  
  // Защита от повторного нажатия мгновенного спуска
  let dropCooldown = false;
  const DROP_COOLDOWN_TIME = 800;
  
  // Анимация мгновенного падения
  let hardDropAnimation = null;
  
  // Настройка canvas
  const canvas = document.getElementById('canvas');
  const nextCanvas = document.getElementById('nextCanvas');
  if (!canvas || !nextCanvas) {
    console.error('Canvas elements not found!');
    return;
  }
  const ctx = canvas.getContext('2d', { alpha: true });
  const nextCtx = nextCanvas.getContext('2d', { alpha: true });
  const DPR = window.devicePixelRatio || 1;
  
  // UI элементы
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnBack = document.getElementById('btnBack');
  const btnSound = document.getElementById('btnSound');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const bestEl = document.getElementById('best');
  
  // Кнопки мобильного управления
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnDown = document.getElementById('btnDown');
  const btnDrop = document.getElementById('btnDrop');
  const btnRotate = document.getElementById('btnRotate');
  
  // Мобильные кнопки управления игрой
  const mobileBtnStart = document.getElementById('mobileBtnStart');
  const mobileBtnPause = document.getElementById('mobileBtnPause');
  const mobileBtnMenu = document.getElementById('mobileBtnMenu');
  
  if (!btnStart || !btnPause || !btnBack || !scoreEl || !levelEl || !linesEl || !bestEl) {
    console.error('One or more UI elements not found!');
    return;
  }
  bestEl.textContent = best;
  
  // Фигуры Тетриса
  const SHAPES = [
    // I
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    // J
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    // L
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    // O
    [
      [1, 1],
      [1, 1]
    ],
    // S
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    // T
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    // Z
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  ];
  
  // Цвета фигур
  const COLORS = [
    '#00f6ff', // I - голубой
    '#0066ff', // J - синий
    '#ff9900', // L - оранжевый
    '#ffff00', // O - желтый
    '#00ff00', // S - зеленый
    '#9900ff', // T - фиолетовый
    '#ff0000'  // Z - красный
  ];
  
  // Инициализация звуков
  function initSounds() {
    try {
      // Создаем простые бипы для звуков
      createBeepSound(523.25, 0.1); // Вращение
      createBeepSound(392.00, 0.05); // Движение
      createBeepSound(261.63, 0.2); // Падение
      createBeepSound(659.25, 0.3); // Линия
      createBeepSound(220.00, 0.5); // Game Over
      
    } catch (e) {
      console.log('Web Audio API не поддерживается, звуки отключены');
      soundEnabled = false;
      if (btnSound) btnSound.textContent = '🔇 Выкл';
    }
  }
  
  // Создание простого звука
  function createBeepSound(frequency, duration) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      // Игнорируем ошибки создания звуков
    }
  }
  
  // Воспроизведение звука
  function playSound(frequency, duration) {
    if (!soundEnabled) return;
    
    try {
      createBeepSound(frequency, duration);
    } catch (e) {
      console.log('Ошибка воспроизведения звука');
    }
  }
  
  // Изменение размера canvas
  function resize() {
    const rect = canvas.getBoundingClientRect();
    
    if (window.innerWidth <= 820) {
      const mobileHeight = Math.max(400, Math.floor(rect.width * 1.3 * DPR));
      canvas.width = Math.max(400, Math.floor(rect.width * DPR));
      canvas.height = mobileHeight;
    } else {
      canvas.width = Math.max(400, Math.floor(rect.width * DPR));
      canvas.height = Math.max(600, Math.floor(rect.height * DPR));
    }
    
    W = canvas.width;
    H = canvas.height;
    
    const nextRect = nextCanvas.getBoundingClientRect();
    nextCanvas.width = Math.floor(nextRect.width * DPR);
    nextCanvas.height = Math.floor(nextRect.height * DPR);
    nextCanvas.style.width = '100%';
    nextCanvas.style.height = '120px';
    
    updateLayout();
    render();
  }
  
  canvas.style.width = '100%';
  
  if (window.innerWidth <= 820) {
    canvas.style.height = '65vh';
  } else {
    canvas.style.height = '70vh';
  }
  
  resize();
  window.addEventListener('resize', resize);
  
  // Обновление макета
  function updateLayout() {
    if (window.innerWidth > 820) {
      leftX = W * 0.005;
      gameWidth = W * 0.84;
      topY = H * 0.02;
      gameHeight = H * 0.96;
    } else {
      leftX = W * 0.005;
      gameWidth = W * 0.99;
      topY = H * 0.02;
      gameHeight = H * 0.90;
    }
  }
  
  // Создание новой фигуры
  function createPiece() {
    const typeId = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[typeId];
    return {
      shape,
      color: COLORS[typeId],
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
      typeId
    };
  }
  
  // Проверка столкновений
  function collision(piece, x, y) {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0) {
          const newX = x + c;
          const newY = y + r;
          
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          
          if (newY >= 0 && board[newY][newX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  // Помещение фигуры на поле
  function placePiece() {
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c] !== 0) {
          const boardY = currentPiece.y + r;
          if (boardY >= 0) {
            board[boardY][currentPiece.x + c] = currentPiece.color;
            
            animations.push({
              type: 'placement',
              x: currentPiece.x + c,
              y: boardY,
              color: currentPiece.color,
              age: 0,
              life: 0.4,
              scale: 0
            });
          }
        }
      }
    }
    
    const cleared = clearLines();
    if (cleared > 0) {
      playSound(659.25, 0.3);
      const linePoints = [40, 100, 300, 1200];
      score += linePoints[cleared - 1] * level;
      lines += cleared;
      
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 100);
      
      updateScore();
    }
    
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    if (collision(currentPiece, currentPiece.x, currentPiece.y)) {
      gameOver = true;
      running = false;
      btnStart.textContent = '▶ Старт';
      if (mobileBtnStart) mobileBtnStart.textContent = '▶ Старт';
      
      playSound(220.00, 0.5);
      
      if (score > best) {
        best = score;
        localStorage.setItem('tetris_best', String(best));
        bestEl.textContent = best;
      }
    }
  }
  
  // Очистка заполненных линий
  function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== 0)) {
        for (let c = 0; c < COLS; c++) {
          animations.push({
            type: 'clear',
            x: c,
            y: r,
            color: board[r][c],
            age: 0,
            life: 0.6,
            alpha: 1
          });
          
          spawnParticles(
            leftX + (c + 0.5) * (gameWidth / COLS),
            topY + (r + 0.5) * (gameHeight / ROWS),
            board[r][c],
            window.innerWidth > 820 ? 8 : 5,
            2.0
          );
        }
        
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        linesCleared++;
        r++;
      }
    }
    return linesCleared;
  }
  
  // Создание частиц
  function spawnParticles(x, y, color, count = 5, spread = 1.2) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() * 2 - 1) * spread,
        vy: (Math.random() * 2 - 1.5) * spread,
        life: rand(0.6, 1.2),
        age: 0,
        size: rand(3, 6),
        color
      });
    }
  }
  
  // Обновление счета
  function updateScore() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
  }
  
  // Обновление анимаций
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
      pa.vy += 0.3 * dt;
      if (pa.age >= pa.life) {
        particles.splice(i, 1);
      }
    }
    
    if (hardDropAnimation) {
      hardDropAnimation.age += dt;
      if (hardDropAnimation.age >= hardDropAnimation.duration) {
        hardDropAnimation = null;
      }
    }
  }
  
  // Управление
  function movePiece(dx, dy) {
    if (!currentPiece || !running || gameOver || paused) return;
    
    if (!collision(currentPiece, currentPiece.x + dx, currentPiece.y + dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      if (dx !== 0) playSound(392.00, 0.05);
    } else if (dy > 0) {
      playSound(261.63, 0.2);
      placePiece();
    }
  }
  
  function rotatePiece() {
    if (!currentPiece || !running || gameOver || paused) return;
    
    const rotated = [];
    const shape = currentPiece.shape;
    
    for (let c = 0; c < shape[0].length; c++) {
      rotated[c] = [];
      for (let r = 0; r < shape.length; r++) {
        rotated[c][r] = shape[shape.length - 1 - r][c];
      }
    }
    
    if (!collision({ ...currentPiece, shape: rotated }, currentPiece.x, currentPiece.y)) {
      currentPiece.shape = rotated;
      playSound(523.25, 0.1);
    }
  }
  
  function hardDrop() {
    if (!currentPiece || !running || gameOver || paused || dropCooldown) return;
    
    dropCooldown = true;
    
    hardDropAnimation = {
      age: 0,
      duration: 0.3
    };
    
    let dropDistance = 0;
    while (!collision(currentPiece, currentPiece.x, currentPiece.y + 1)) {
      currentPiece.y++;
      dropDistance++;
    }
    
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c] !== 0) {
          spawnParticles(
            leftX + (currentPiece.x + c + 0.5) * (gameWidth / COLS),
            topY + (currentPiece.y + r + 0.5) * (gameHeight / ROWS),
            currentPiece.color,
            3,
            1.5
          );
        }
      }
    }
    
    playSound(261.63, 0.2);
    placePiece();
    
    setTimeout(() => {
      dropCooldown = false;
    }, DROP_COOLDOWN_TIME);
  }
  
  // Обработчики для мобильных кнопок
  function setupMobileControls() {
    if (btnLeft) {
      btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        movePiece(-1, 0);
      });
      btnLeft.addEventListener('mousedown', (e) => {
        e.preventDefault();
        movePiece(-1, 0);
      });
    }
    
    if (btnRight) {
      btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        movePiece(1, 0);
      });
      btnRight.addEventListener('mousedown', (e) => {
        e.preventDefault();
        movePiece(1, 0);
      });
    }
    
    if (btnDown) {
      btnDown.addEventListener('touchstart', (e) => {
        e.preventDefault();
        movePiece(0, 1);
      });
      btnDown.addEventListener('mousedown', (e) => {
        e.preventDefault();
        movePiece(0, 1);
      });
    }
    
    if (btnDrop) {
      btnDrop.addEventListener('touchstart', (e) => {
        e.preventDefault();
        hardDrop();
      });
      btnDrop.addEventListener('mousedown', (e) => {
        e.preventDefault();
        hardDrop();
      });
    }
    
    if (btnRotate) {
      btnRotate.addEventListener('touchstart', (e) => {
        e.preventDefault();
        rotatePiece();
      });
      btnRotate.addEventListener('mousedown', (e) => {
        e.preventDefault();
        rotatePiece();
      });
    }
    
    if (mobileBtnStart) {
      mobileBtnStart.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
      });
      mobileBtnStart.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startGame();
      });
    }
    
    if (mobileBtnPause) {
      mobileBtnPause.addEventListener('touchstart', (e) => {
        e.preventDefault();
        togglePause();
      });
      mobileBtnPause.addEventListener('mousedown', (e) => {
        e.preventDefault();
        togglePause();
      });
    }
    
    if (mobileBtnMenu) {
      mobileBtnMenu.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.location.href = 'index.html';
      });
      mobileBtnMenu.addEventListener('mousedown', (e) => {
        e.preventDefault();
        window.location.href = 'index.html';
      });
    }
  }
  
  // Обработчики событий клавиатуры
  document.addEventListener('keydown', e => {
    if (!running || gameOver) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        movePiece(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        movePiece(1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        movePiece(0, 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        rotatePiece();
        break;
      case ' ':
        e.preventDefault();
        if (!paused && !dropCooldown) {
          hardDrop();
        }
        break;
      case 'p':
      case 'P':
      case 'Pause':
      case 'Escape':
        e.preventDefault();
        togglePause();
        break;
    }
  });
  
  // Кнопки управления
  btnStart.addEventListener('click', startGame);
  
  btnPause.addEventListener('click', togglePause);
  
  btnBack.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      btnSound.textContent = soundEnabled ? '🔊 Вкл' : '🔇 Выкл';
    });
  }
  
  function togglePause() {
    if (!running || gameOver) return;
    
    paused = !paused;
    btnPause.textContent = paused ? '▶ Продолжить' : '⏸ Пауза';
    if (mobileBtnPause) {
      mobileBtnPause.textContent = paused ? '▶ Продолж' : '⏸ Пауза';
    }
  }
  
  // Запуск игры
  function startGame() {
    if (paused) {
      togglePause();
      return;
    }
    
    if (running) {
      resetGame();
      return;
    }
    
    resetGame();
    running = true;
    paused = false;
    
    btnStart.textContent = '🔄 Рестарт';
    btnPause.textContent = '⏸ Пауза';
    if (mobileBtnStart) mobileBtnStart.textContent = '🔄 Рестарт';
    if (mobileBtnPause) mobileBtnPause.textContent = '⏸ Пауза';
    
    updateScore();
    render();
  }
  
  // Сброс игры
  function resetGame() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        board[r][c] = 0;
      }
    }
    
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    running = true;
    paused = false;
    dropTime = 0;
    dropInterval = 1000;
    dropCooldown = false;
    
    animations.length = 0;
    particles.length = 0;
    hardDropAnimation = null;
    
    nextPiece = createPiece();
    currentPiece = createPiece();
    
    updateScore();
  }
  
  // Рисование закругленного прямоугольника
  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  
  // Рисование следующей фигуры
  function renderNextPiece() {
    if (!nextPiece) return;
    
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const cellSize = Math.min(20, nextCanvas.width / 6);
    const padding = cellSize * 0.1;
    const shape = nextPiece.shape;
    
    const offsetX = (nextCanvas.width - shape[0].length * cellSize) / 2;
    const offsetY = (nextCanvas.height - shape.length * cellSize) / 2;
    
    nextCtx.save();
    nextCtx.shadowBlur = 10;
    nextCtx.shadowColor = `${nextPiece.color}80`;
    nextCtx.fillStyle = nextPiece.color;
    
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          nextCtx.beginPath();
          nextCtx.moveTo(offsetX + c * cellSize + padding + padding, offsetY + r * cellSize + padding);
          nextCtx.arcTo(offsetX + (c + 1) * cellSize - padding, offsetY + r * cellSize + padding, 
                       offsetX + (c + 1) * cellSize - padding, offsetY + (r + 1) * cellSize - padding, padding);
          nextCtx.arcTo(offsetX + (c + 1) * cellSize - padding, offsetY + (r + 1) * cellSize - padding, 
                       offsetX + c * cellSize + padding, offsetY + (r + 1) * cellSize - padding, padding);
          nextCtx.arcTo(offsetX + c * cellSize + padding, offsetY + (r + 1) * cellSize - padding, 
                       offsetX + c * cellSize + padding, offsetY + r * cellSize + padding, padding);
          nextCtx.arcTo(offsetX + c * cellSize + padding, offsetY + r * cellSize + padding, 
                       offsetX + (c + 1) * cellSize - padding, offsetY + r * cellSize + padding, padding);
          nextCtx.closePath();
          nextCtx.fill();
        }
      }
    }
    nextCtx.restore();
  }
  
  // Рендеринг
  function render() {
    ctx.clearRect(0, 0, W, H);
    
    const cellSize = Math.min(gameWidth / COLS, gameHeight / ROWS);
    const padding = cellSize * 0.1;
    const gridWidth = cellSize * COLS;
    const gridHeight = cellSize * ROWS;
    const gameX = leftX + (gameWidth - gridWidth) / 2;
    const gameY = topY + (gameHeight - gridHeight) / 2;
    
    // Рисование игрового поля
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255,255,255,0.1)';
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(gameX, gameY, gridWidth, gridHeight);
    ctx.restore();
    
    // Сетка
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(gameX + i * cellSize, gameY);
      ctx.lineTo(gameX + i * cellSize, gameY + gridHeight);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(gameX, gameY + i * cellSize);
      ctx.lineTo(gameX + gridWidth, gameY + i * cellSize);
      ctx.stroke();
    }
    
    // Рисование блоков на поле
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          ctx.save();
          ctx.shadowBlur = 16;
          ctx.shadowColor = `${board[r][c]}80`;
          ctx.fillStyle = board[r][c];
          drawRoundedRect(
            gameX + c * cellSize + padding,
            gameY + r * cellSize + padding,
            cellSize - 2 * padding,
            cellSize - 2 * padding,
            padding * 1.2
          );
          ctx.fill();
          ctx.restore();
        }
      }
    }
    
    // Рисование текущей фигуры
    if (currentPiece && running && !paused) {
      if (hardDropAnimation) {
        const progress = hardDropAnimation.age / hardDropAnimation.duration;
        const alpha = 0.7 + 0.3 * Math.sin(progress * Math.PI * 4);
        ctx.globalAlpha = alpha;
      }
      
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = `${currentPiece.color}80`;
      ctx.fillStyle = currentPiece.color;
      
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c] !== 0) {
            const x = currentPiece.x + c;
            const y = currentPiece.y + r;
            
            if (y >= 0) {
              drawRoundedRect(
                gameX + x * cellSize + padding,
                gameY + y * cellSize + padding,
                cellSize - 2 * padding,
                cellSize - 2 * padding,
                padding * 1.2
              );
              ctx.fill();
            }
          }
        }
      }
      ctx.restore();
      
      if (hardDropAnimation) {
        ctx.globalAlpha = 1;
      }
    }
    
    // Рисование следующей фигуры (только на десктопе)
    if (window.innerWidth > 820) {
      renderNextPiece();
    }
    
    // Рисование анимаций
    animations.forEach(anim => {
      ctx.save();
      const progress = Math.min(1, anim.age / anim.life);
      const easedProgress = easeInOutQuad(progress);
      
      if (anim.type === 'placement') {
        const scale = anim.scale * (1 - easedProgress) + easedProgress;
        ctx.translate(
          gameX + (anim.x + 0.5) * cellSize,
          gameY + (anim.y + 0.5) * cellSize
        );
        ctx.scale(scale, scale);
        ctx.translate(
          -gameX - (anim.x + 0.5) * cellSize,
          -gameY - (anim.y + 0.5) * cellSize
        );
        ctx.shadowBlur = 16 * (1 - easedProgress);
        ctx.shadowColor = `${anim.color}${Math.floor((1 - easedProgress) * 255).toString(16).padStart(2, '0')}`;
        ctx.fillStyle = anim.color;
        drawRoundedRect(
          gameX + anim.x * cellSize + padding,
          gameY + anim.y * cellSize + padding,
          cellSize - 2 * padding,
          cellSize - 2 * padding,
          padding
        );
        ctx.fill();
      } else if (anim.type === 'clear') {
        ctx.globalAlpha = anim.alpha * (1 - easedProgress);
        ctx.shadowBlur = 16 * easedProgress;
        ctx.shadowColor = `${anim.color}${Math.floor((1 - easedProgress) * 255).toString(16).padStart(2, '0')}`;
        ctx.fillStyle = anim.color;
        drawRoundedRect(
          gameX + anim.x * cellSize + padding,
          gameY + anim.y * cellSize + padding,
          cellSize - 2 * padding,
          cellSize - 2 * padding,
          padding * (1 - easedProgress)
        );
        ctx.fill();
      }
      ctx.restore();
    });
    
    // Рисование частиц
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
    
    // Рисование Game Over
    if (gameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,10,0.8)';
      ctx.fillRect(gameX, gameY, gridWidth, gridHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `bold ${Math.min(32, gridWidth / 15)}px Inter, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('ИГРА ОКОНЧЕНА', gameX + gridWidth / 2, gameY + gridHeight * 0.4);
      
      ctx.font = `${Math.min(24, gridWidth / 20)}px Inter, Arial`;
      ctx.fillStyle = 'rgba(207,239,255,0.9)';
      ctx.fillText(`Счёт: ${score}`, gameX + gridWidth / 2, gameY + gridHeight * 0.5);
      
      if (score > best) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = `bold ${Math.min(20, gridWidth / 25)}px Inter, Arial`;
        ctx.fillText('🎉 НОВЫЙ РЕКОРД!', gameX + gridWidth / 2, gameY + gridHeight * 0.6);
      }
      
      ctx.fillStyle = 'rgba(207,239,255,0.7)';
      ctx.font = `${Math.min(16, gridWidth / 30)}px Inter, Arial`;
      ctx.fillText('Нажми СТАРТ для новой игры', gameX + gridWidth / 2, gameY + gridHeight * 0.75);
      ctx.textAlign = 'start';
      ctx.restore();
    }
    
    // Рисование паузы
    if (paused && running) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,10,0.7)';
      ctx.fillRect(gameX, gameY, gridWidth, gridHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `${Math.min(28, gridWidth / 18)}px Inter, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('ПАУЗА', gameX + gridWidth / 2, gameY + gridHeight * 0.45);
      ctx.font = `${Math.min(14, gridWidth / 36)}px Inter, Arial`;
      ctx.fillStyle = 'rgba(207,239,255,0.9)';
      ctx.fillText('Нажми ПРОДОЛЖИТЬ', gameX + gridWidth / 2, gameY + gridHeight * 0.55);
      ctx.textAlign = 'start';
      ctx.restore();
    }
  }
  
  // Игровой цикл
  function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (running && !gameOver && !paused) {
      dropTime += deltaTime;
      if (dropTime > dropInterval) {
        movePiece(0, 1);
        dropTime = 0;
      }
    }
    
    updateAnimations(deltaTime / 1000);
    render();
    requestAnimationFrame(gameLoop);
  }
  
  // Утилиты
  function rand(a, b) { return a + Math.random() * (b - a); }
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  // Инициализация
  updateLayout();
  setupMobileControls();
  initSounds();
  render();
  gameLoop();
})();