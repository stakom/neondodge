(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const restartBtn = document.getElementById('restartBtn');

  let grid = [];
  let score = 0;
  let best = localStorage.getItem('2048-best') || 0;
  bestEl.textContent = best;
  const SIZE = 4;
  let CELL_SIZE = 100;
  const GAP = 10;
  const DPR = window.devicePixelRatio || 1;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const maxWidth = Math.min(rect.width, window.innerWidth - 24);
    CELL_SIZE = Math.floor((maxWidth - (SIZE - 1) * GAP) / SIZE / DPR);
    canvas.width = SIZE * (CELL_SIZE + GAP) - GAP;
    canvas.height = SIZE * (CELL_SIZE + GAP) - GAP;
    canvas.style.width = `${canvas.width / DPR}px`;
    canvas.style.height = `${canvas.height / DPR}px`;
    draw();
  }

  function init() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    scoreEl.textContent = 0;
    addTile();
    addTile();
    resizeCanvas();
    draw();
  }

  function addTile() {
    const empty = [];
    grid.forEach((row, y) => row.forEach((val, x) => { if (val === 0) empty.push({ x, y }); }));
    if (empty.length === 0) return;
    const { x, y } = empty[Math.floor(Math.random() * empty.length)];
    grid[y][x] = Math.random() < 0.9 ? 2 : 4;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    grid.forEach((row, y) => {
      row.forEach((val, x) => {
        const color = getColor(val);
        ctx.fillStyle = color.bg;
        ctx.fillRect(x * (CELL_SIZE + GAP), y * (CELL_SIZE + GAP), CELL_SIZE, CELL_SIZE);
        if (val > 0) {
          ctx.fillStyle = color.text;
          ctx.font = `${val < 1000 ? 40 : 30}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val, x * (CELL_SIZE + GAP) + CELL_SIZE / 2, y * (CELL_SIZE + GAP) + CELL_SIZE / 2);
        }
      });
    });
  }

  function getColor(val) {
    const colors = {
      0: { bg: 'rgba(255,255,255,0.05)', text: '#fff' },
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
      2048: { bg: '#edc22e', text: '#f9f6f2' },
    };
    return colors[val] || { bg: '#3c3a32', text: '#f9f6f2' };
  }

  function move(dir) {
    let moved = false;
    const copy = grid.map(row => [...row]);
    if (dir === 'left' || dir === 'right') grid = grid.map(row => slide(row, dir === 'right'));
    if (dir === 'up' || dir === 'down') grid = transpose(grid).map(row => slide(row, dir === 'down')).map(transpose);
    if (JSON.stringify(grid) !== JSON.stringify(copy)) {
      moved = true;
      addTile();
    }
    draw();
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('2048-best', best);
    }
    if (isGameOver()) alert('Игра окончена! Ваш счёт: ' + score);
    if (grid.flat().includes(2048)) alert('Поздравляем! Вы достигли 2048!');
    localStorage.setItem('2048-grid', JSON.stringify(grid));
    localStorage.setItem('2048-score', score);
  }

  function slide(row, reverse) {
    if (reverse) row = row.reverse();
    row = row.filter(val => val !== 0);
    for (let i = 0; i < row.length - 1; i++) {
      if (row[i] === row[i + 1]) {
        row[i] *= 2;
        score += row[i];
        row.splice(i + 1, 1);
      }
    }
    while (row.length < SIZE) row.push(0);
    if (reverse) row = row.reverse();
    return row;
  }

  function transpose(g) {
    return g[0].map((_, col) => g.map(row => row[col]));
  }

  function isGameOver() {
    if (grid.flat().includes(0)) return false;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if ((x < SIZE - 1 && grid[y][x] === grid[y][x + 1]) || (y < SIZE - 1 && grid[y][x] === grid[y + 1][x])) return false;
      }
    }
    return true;
  }

  // Keyboard controls
  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') move('up');
    if (key === 'arrowdown' || key === 's') move('down');
    if (key === 'arrowleft' || key === 'a') move('left');
    if (key === 'arrowright' || key === 'd') move('right');
  });

  // Touch controls
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });
  canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) move('right');
      else if (dx < -30) move('left');
    } else {
      if (dy > 30) move('down');
      else if (dy < -30) move('up');
    }
  });

  // Restart
  restartBtn.addEventListener('click', init);

  // Load saved game
  const savedGrid = localStorage.getItem('2048-grid');
  const savedScore = localStorage.getItem('2048-score');
  if (savedGrid) {
    grid = JSON.parse(savedGrid);
    score = parseInt(savedScore) || 0;
    scoreEl.textContent = score;
    resizeCanvas();
    draw();
  } else {
    init();
  }

  // Responsive canvas
  window.addEventListener('resize', resizeCanvas);
})();