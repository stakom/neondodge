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
  
  // Игровое поле
  const board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
  
  // Текущая и следующая фигура
  let currentPiece = null;
  let nextPiece = null;
  
  // Время и интервалы
  let dropTime = 0;
  let dropInterval = 1000; // 1 секунда
  let lastTime = 0;
  
  // Анимации и частицы
  const animations = [];
  const particles = [];
  
  // Защита от повторного нажатия мгновенного спуска
  let dropCooldown = false;
  const DROP_COOLDOWN_TIME = 300; // 300ms защита
  
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
  
  // Изменение размера canvas
  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(400, Math.floor(rect.width * DPR));
    canvas.height = Math.max(600, Math.floor(rect.height * DPR));
    W = canvas.width;
    H = canvas.height;
    
    // Также обновляем размер nextCanvas с учетом DPR
    const nextRect = nextCanvas.getBoundingClientRect();
    nextCanvas.width = Math.floor(nextRect.width * DPR);
    nextCanvas.height = Math.floor(nextRect.height * DPR);
    nextCanvas.style.width = '100%';
    nextCanvas.style.height = '120px';
    
    updateLayout();
    render();
  }
  
  canvas.style.width = '100%';
  resize();
  window.addEventListener('resize', resize);
  
  // Обновление макета
  function updateLayout() {
    if (window.innerWidth > 820) {
      // Desktop - увеличенное игровое поле
      leftX = W * 0.02;
      gameWidth = W * 0.7;
      topY = H * 0.02;
      gameHeight = H * 0.96;
    } else {
      // Mobile - максимально используем пространство
      leftX = W * 0.02;
      gameWidth = W * 0.96;
      topY = H * 0.02;
      gameHeight = H * 0.96;
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
          
          // Проверка границ
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          
          // Проверка на другие блоки (кроме верхней границы)
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
            
            // Анимация размещения
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
    
    // Проверка заполненных линий
    const cleared = clearLines();
    if (cleared > 0) {
      // Очки за линии
      const linePoints = [40, 100, 300, 1200];
      score += linePoints[cleared - 1] * level;
      lines += cleared;
      
      // Обновление уровня
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 100);
      
      updateScore();
    }
    
    // Следующая фигура
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    // Проверка на окончание игры
    if (collision(currentPiece, currentPiece.x, currentPiece.y)) {
      gameOver = true;
      running = false;
      btnStart.textContent = '▶ Старт';
      
      // Показываем уведомление с итоговым счётом
      showGameOverNotification();
      
      if (score > best) {
        best = score;
        localStorage.setItem('tetris_best', String(best));
        bestEl.textContent = best;
      }
    }
  }
  
  // Показать уведомление об окончании игры
  function showGameOverNotification() {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'game-over-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h3>Игра окончена!</h3>
        <div class="final-score">Ваш счёт: <span class="score-highlight">${score}</span></div>
        ${score > best ? '<div class="new-record">🎉 Новый рекорд!</div>' : ''}
        <button class="notification-btn" onclick="this.parentElement.parentElement.remove()">OK</button>
      </div>
    `;
    
    // Добавляем стили
    notification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(5, 7, 19, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(10px);
    `;
    
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
      background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(20px);
      max-width: 300px;
      width: 90%;
    `;
    
    content.querySelector('h3').style.cssText = `
      color: #fff;
      margin: 0 0 15px 0;
      font-size: 24px;
    `;
    
    content.querySelector('.final-score').style.cssText = `
      color: var(--muted);
      font-size: 18px;
      margin: 15px 0;
    `;
    
    content.querySelector('.score-highlight').style.cssText = `
      color: var(--accent);
      font-weight: bold;
      font-size: 24px;
    `;
    
    content.querySelector('.new-record').style.cssText = `
      color: #ffcc00;
      font-weight: bold;
      margin: 10px 0;
      font-size: 16px;
    `;
    
    const button = content.querySelector('.notification-btn');
    button.style.cssText = `
      background: var(--neon1);
      color: #021018;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 15px;
      font-size: 16px;
    `;
    
    button.addEventListener('click', () => {
      notification.remove();
    });
    
    document.body.appendChild(notification);
  }
  
  // Очистка заполненных линий
  function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== 0)) {
        // Анимация очистки
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
          
          // Частицы
          spawnParticles(
            leftX + (c + 0.5) * (gameWidth / COLS),
            topY + (r + 0.5) * (gameHeight / ROWS),
            board[r][c],
            window.innerWidth > 820 ? 5 : 3,
            1.2
          );
        }
        
        // Удаление линии
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        linesCleared++;
        r++; // Проверить ту же строку снова
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
        vy: (Math.random() * 2 - 1) * spread,
        life: rand(0.4, 0.8),
        age: 0,
        size: rand(2, 4),
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
      pa.vy += 0.2 * dt;
      if (pa.age >= pa.life) {
        particles.splice(i, 1);
      }
    }
  }
  
  // Управление
  function movePiece(dx, dy) {
    if (!currentPiece || !running || gameOver || paused) return;
    
    if (!collision(currentPiece, currentPiece.x + dx, currentPiece.y + dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
    } else if (dy > 0) {
      // Если движение вниз невозможно, размещаем фигуру
      placePiece();
    }
  }
  
  function rotatePiece() {
    if (!currentPiece || !running || gameOver || paused) return;
    
    const rotated = [];
    const shape = currentPiece.shape;
    
    // Транспонирование матрицы
    for (let c = 0; c < shape[0].length; c++) {
      rotated[c] = [];
      for (let r = 0; r < shape.length; r++) {
        rotated[c][r] = shape[shape.length - 1 - r][c];
      }
    }
    
    // Проверка столкновения после вращения
    if (!collision({ ...currentPiece, shape: rotated }, currentPiece.x, currentPiece.y)) {
      currentPiece.shape = rotated;
    }
  }
  
  function hardDrop() {
    if (!currentPiece || !running || gameOver || paused || dropCooldown) return;
    
    // Активируем защиту от повторного нажатия
    dropCooldown = true;
    
    while (!collision(currentPiece, currentPiece.x, currentPiece.y + 1)) {
      currentPiece.y++;
    }
    placePiece();
    
    // Сбрасываем защиту через заданное время
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
  
  function togglePause() {
    if (!running || gameOver) return;
    
    paused = !paused;
    btnPause.textContent = paused ? '▶ Продолжить' : '⏸ Пауза';
  }
  
  // Запуск игры
  function startGame() {
    // Если игра на паузе, снимаем паузу
    if (paused) {
      togglePause();
      return;
    }
    
    // Если игра уже запущена, перезапускаем
    if (running) {
      // Очистка поля
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          board[r][c] = 0;
        }
      }
      
      // Сброс переменных
      score = 0;
      level = 1;
      lines = 0;
      gameOver = false;
      dropTime = 0;
      dropInterval = 1000;
      dropCooldown = false; // Сбрасываем защиту
      
      // Создание фигур
      currentPiece = createPiece();
      nextPiece = createPiece();
      
      updateScore();
      return;
    }
    
    // Очистка поля
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        board[r][c] = 0;
      }
    }
    
    // Сброс переменных
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    running = true;
    paused = false;
    dropTime = 0;
    dropInterval = 1000;
    dropCooldown = false; // Сбрасываем защиту
    
    // Создание фигур
    currentPiece = createPiece();
    nextPiece = createPiece();
    
    btnStart.textContent = '🔄 Рестарт';
    btnPause.textContent = '⏸ Пауза';
    
    updateScore();
    render();
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
    
    // Центрируем фигуру
    const offsetX = (nextCanvas.width - shape[0].length * cellSize) / 2;
    const offsetY = (nextCanvas.height - shape.length * cellSize) / 2;
    
    nextCtx.save();
    nextCtx.shadowBlur = 10;
    nextCtx.shadowColor = `${nextPiece.color}80`;
    nextCtx.fillStyle = nextPiece.color;
    
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          // Рисуем закругленные блоки как в основной игре
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
    
    // Рисование паузы
    if (paused && running) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,10,0.7)';
      ctx.fillRect(gameX, gameY, gridWidth, gridHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `${Math.min(28, gridWidth / 18)}px Inter, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Пауза', gameX + gridWidth / 2, gameY + gridHeight * 0.45);
      ctx.font = `${Math.min(14, gridWidth / 36)}px Inter, Arial`;
      ctx.fillStyle = 'rgba(207,239,255,0.9)';
      ctx.fillText('Нажми Продолжить', gameX + gridWidth / 2, gameY + gridHeight * 0.55);
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
  render();
  gameLoop();
})();