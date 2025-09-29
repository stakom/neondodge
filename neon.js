(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const restartBtn = document.getElementById('restartBtn');

  // === БЛОКИРОВКА СВАЙПОВ ДЛЯ TELEGRAM ===
  function isTelegramWebView() {
    return /Telegram|Twitter|Facebook/.test(navigator.userAgent) || 
           window.TelegramWebviewProxy !== undefined;
  }

  function preventDefaultSwipe(e) {
    if (e.target === canvas || canvas.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  // Блокируем свайпы только в Telegram WebView
  if (isTelegramWebView()) {
    document.addEventListener('touchstart', preventDefaultSwipe, { passive: false });
    document.addEventListener('touchmove', preventDefaultSwipe, { passive: false });
    document.addEventListener('touchend', preventDefaultSwipe, { passive: false });
    
    console.log('Telegram WebView detected: swipe gestures blocked');
  }
  // === КОНЕЦ БЛОКИРОВКИ СВАЙПОВ ===

  const SIZE = 4;
  let CELL_SIZE = 100;
  const GAP = 10;
  const DPR = window.devicePixelRatio || 1;
  let board = [];
  let score = 0;
  let best = localStorage.getItem('2048-best') || 0;
  bestEl.textContent = best;

  // --- Web Audio (мягкие звуки) ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playClick() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 180;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }
  function playMerge() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  }
  function playSpawn() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 300;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  }

  class Tile {
    constructor(x, y, value, isNew = false) {
      this.x = x;
      this.y = y;
      this.value = value;
      this.prevX = x;
      this.prevY = y;
      this.scale = isNew ? 0.5 : 1; // поп-ап эффект
      this.moving = false;
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const maxWidth = Math.min(rect.width, window.innerWidth - 24);
    CELL_SIZE = Math.floor((maxWidth - (SIZE - 1) * GAP) / SIZE);
    const logicalWidth = SIZE * (CELL_SIZE + GAP) - GAP;
    canvas.width = logicalWidth * DPR;
    canvas.height = logicalWidth * DPR;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalWidth}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw();
  }

  function init() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    score = 0;
    scoreEl.textContent = 0;
    addTile();
    addTile();
    resizeCanvas();
    draw();
  }

  function getEmptyPositions() {
    const empty = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (!board[y][x]) empty.push({ x, y });
      }
    }
    return empty;
  }

  function addTile() {
    const empty = getEmptyPositions();
    if (empty.length === 0) return;
    const { x, y } = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const t = new Tile(x, y, value, true);
    board[y][x] = t;
    playSpawn();
  }

  function getColor(val) {
    const colors = {
      2: { bg: '#eee4da', text: '#776e65' },
      4: { bg: '#ede0c8', text: '#776e65' },
      8: { bg: '#f2b179', text: '#f9f6f2' },
      16: { bg: '#f59563', text: '#f9f6f2' },
      32: { bg: '#f67c5f', text: '#f9f6f2' },
      64: { bg: '#f65e3b', text: '#f9f6f2' },
      128: { bg: '#edcf72', text: '#f9f6f2' },
      256: { bg: '#edcc61', text: '#f9f6f2' },
      512: { bg: '#edc850', text: '#f9f6f2' },
      1024: { bg: '#edc53f', text: '#f9f6f2' },
      2048: { bg: '#edc22e', text: '#f9f6f2' }
    };
    return colors[val] || { bg: '#3c3a32', text: '#f9f6f2' };
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const tile = board[y][x];
        const drawX = x * (CELL_SIZE + GAP);
        const drawY = y * (CELL_SIZE + GAP);
        ctx.fillStyle = tile ? getColor(tile.value).bg : '#cdc1b4';
        ctx.fillRect(drawX, drawY, CELL_SIZE, CELL_SIZE);

        if (tile) {
          // анимация плавного перемещения
          tile.prevX += (tile.x - tile.prevX) * 0.3;
          tile.prevY += (tile.y - tile.prevY) * 0.3;

          // анимация появления
          if (tile.scale < 1) tile.scale += 0.1;
          if (tile.scale > 1) tile.scale = 1;

          const renderX = tile.prevX * (CELL_SIZE + GAP);
          const renderY = tile.prevY * (CELL_SIZE + GAP);
          const scale = tile.scale;
          const offset = (1 - scale) * CELL_SIZE / 2;

          ctx.fillStyle = getColor(tile.value).bg;
          ctx.fillRect(renderX + offset, renderY + offset, CELL_SIZE * scale, CELL_SIZE * scale);

          ctx.fillStyle = getColor(tile.value).text;
          ctx.font = `${CELL_SIZE / 3}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile.value, renderX + CELL_SIZE / 2, renderY + CELL_SIZE / 2);
        }
      }
    }

    requestAnimationFrame(draw);
  }

  function compress(line) {
    const newLine = line.filter(tile => tile !== null);
    while (newLine.length < SIZE) newLine.push(null);
    return newLine;
  }

  function merge(line) {
    for (let i = 0; i < SIZE - 1; i++) {
      if (line[i] && line[i + 1] && line[i].value === line[i + 1].value) {
        line[i].value *= 2;
        score += line[i].value;
        playMerge();
        line[i + 1] = null;
        i++;
      }
    }
    return compress(line);
  }

  function rotateLeft(mat) {
    return mat[0].map((_, i) => mat.map(row => row[i])).reverse();
  }

  function rotateRight(mat) {
    return mat[0].map((_, i) => mat.map(row => row[i]).reverse());
  }

  function move(direction) {
    let rotated = board;
    if (direction === 'up') rotated = rotateLeft(board);
    if (direction === 'down') rotated = rotateRight(board);
    if (direction === 'right') rotated = board.map(row => row.slice().reverse());

    let moved = false;
    const newBoard = rotated.map((row, y) => {
      const compressed = compress(row);
      const merged = merge(compressed);
      if (JSON.stringify(row) !== JSON.stringify(merged)) moved = true;
      return merged;
    });

    let restored = newBoard;
    if (direction === 'up') restored = rotateRight(newBoard);
    if (direction === 'down') restored = rotateLeft(newBoard);
    if (direction === 'right') restored = newBoard.map(row => row.slice().reverse());

    if (moved) {
      playClick();
      // обновляем позиции
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (restored[y][x]) {
            restored[y][x].x = x;
            restored[y][x].y = y;
          }
        }
      }
      board = restored;
      addTile();
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem('2048-best', best);
      }
      if (isGameOver()) {
        setTimeout(() => alert("Игра окончена! Ваш счёт: " + score), 100);
      }
      if (board.flat().some(t => t && t.value === 2048)) {
        setTimeout(() => alert("Поздравляем! Вы достигли 2048!"), 100);
      }
    }
  }

  function isGameOver() {
    if (getEmptyPositions().length > 0) return false;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE - 1; x++) {
        if (board[y][x] && board[y][x + 1] && board[y][x].value === board[y][x + 1].value) return false;
      }
    }
    for (let x = 0; x < SIZE; x++) {
      for (let y = 0; y < SIZE - 1; y++) {
        if (board[y][x] && board[y + 1][x] && board[y][x].value === board[y + 1][x].value) return false;
      }
    }
    return true;
  }

  // --- Управление ---
  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (["arrowup", "w", "ц"].includes(key)) move('up');
    if (["arrowdown", "s", "ы"].includes(key)) move('down');
    if (["arrowleft", "a", "ф"].includes(key)) move('left');
    if (["arrowright", "d", "в"].includes(key)) move('right');
  });

  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });
  canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx > 0) move('right');
      else move('left');
    } else if (Math.abs(dy) > 30) {
      if (dy > 0) move('down');
      else move('up');
    }
  });

  restartBtn.addEventListener('click', init);
  window.addEventListener('resize', resizeCanvas);

  init();
})();