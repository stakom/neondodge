class ChaosGenerator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lines = [];
        this.balls = [];
        this.isDrawing = false;
        this.currentLine = null;
        this.animationId = null;
        this.isRunning = false;
        this.container = {
            x: 0,
            y: 0,
            width: 0,
            height: 25
        };
        this.ballsInContainer = 0;
        this.maxBalls = 1000;
        this.lastSplitTime = 0;
        this.splitCooldown = 500;
        
        this.gameTime = 200;
        this.timeLeft = this.gameTime;
        this.maxBallsInContainer = 150;
        this.gameStarted = false;
        this.gameOver = false;
        this.playerWon = false;
        this.lastBallSpawnTime = 0;
        this.ballSpawnInterval = 200;
        
        // Система чернил - уменьшена в 5 раз
        this.maxInk = 200;
        this.currentInk = this.maxInk;
        this.inkCostPerPixel = 0.5;
        this.inkDepleted = false; // Флаг окончания чернил
        
        this.setupEventListeners();
        this.resizeCanvas();
        this.updateContainerPosition();
        this.setPixelRatio();
        
        this.updateUITimer = setInterval(() => this.updateUI(), 100);
    }

    setPixelRatio() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseleave', this.stopDrawing.bind(this));
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        document.addEventListener('touchstart', (e) => {
            if (e.target === this.canvas) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (e.target === this.canvas) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = Math.min(rect.width * 0.75, window.innerHeight * 0.7) * dpr;
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = Math.min(rect.width * 0.75, window.innerHeight * 0.7) + 'px';
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        this.updateContainerPosition();
        this.render();
    }

    updateContainerPosition() {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.container.width = canvasWidth * 0.33;
        this.container.x = (canvasWidth - this.container.width) / 2;
        this.container.y = canvasHeight - this.container.height - 10;
    }

    startDrawing(e) {
        // Блокировка рисования при окончании чернил
        if (this.gameOver || this.currentInk <= 0 || this.inkDepleted) {
            if (this.currentInk <= 0 && !this.inkDepleted) {
                this.inkDepleted = true;
            }
            return;
        }
        
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.currentLine = {
            points: [pos],
            color: `rgba(255, 255, 255, 0.9)`,
            width: this.isMobile() ? 8 : 6 // Увеличена толщина линий
        };
    }

    draw(e) {
        // Блокировка рисования при окончании чернил
        if (!this.isDrawing || !this.currentLine || this.gameOver || this.currentInk <= 0 || this.inkDepleted) {
            if (this.currentInk <= 0 && !this.inkDepleted) {
                this.inkDepleted = true;
            }
            return;
        }
        
        const pos = this.getMousePos(e);
        const lastPoint = this.currentLine.points[this.currentLine.points.length - 1];
        const distance = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2));
        const inkCost = distance * this.inkCostPerPixel;
        
        if (this.currentInk >= inkCost) {
            this.currentLine.points.push(pos);
            this.currentInk -= inkCost;
            this.updateInkIndicator();
            this.render();
        } else {
            // Чернила закончились во время рисования
            this.currentInk = 0;
            this.inkDepleted = true;
            this.updateInkIndicator();
            this.stopDrawing();
        }
    }

    stopDrawing() {
        if (this.isDrawing && this.currentLine && this.currentLine.points.length > 1) {
            this.lines.push(this.currentLine);
            document.getElementById('lineCount').textContent = this.lines.length;
        }
        this.isDrawing = false;
        this.currentLine = null;
        this.render();
    }

    handleTouchStart(e) {
        if (this.gameOver || this.currentInk <= 0 || this.inkDepleted) {
            if (this.currentInk <= 0 && !this.inkDepleted) {
                this.inkDepleted = true;
            }
            return;
        }
        e.preventDefault();
        this.startDrawing(e.touches[0]);
    }

    handleTouchMove(e) {
        e.preventDefault();
        this.draw(e.touches[0]);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.stopDrawing();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scaleX = (this.canvas.width / dpr) / rect.width;
        const scaleY = (this.canvas.height / dpr) / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    isMobile() {
        return window.innerWidth <= 820 || 'ontouchstart' in window;
    }

    startBalls() {
        if (this.isRunning || this.gameOver) return;
        
        this.isRunning = true;
        this.gameStarted = true;
        this.gameOver = false;
        this.playerWon = false;
        this.ballsInContainer = 0;
        this.timeLeft = this.gameTime;
        this.balls = [];
        // НЕ восстанавливаем чернила при начале игры, только при очистке
        this.inkDepleted = this.currentInk <= 0; // Обновляем флаг окончания чернил
        
        for (let i = 0; i < 15; i++) {
            this.addRandomBall();
        }
        
        this.animate();
    }

    addRandomBall() {
        if (this.balls.length >= this.maxBalls || this.gameOver) return;
        
        const colors = ['#ff6f61', '#6b5b95', '#61ff6f', '#d46bff', '#ffd166', '#06d6a0', '#118ab2', '#ef476f'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const spawnAreaTop = canvasHeight * 0.3;
        const ballRadius = this.isMobile() ? 5 : 6;
        
        // Случайная прыгучесть для каждого шара (от 0.7 до 1.3)
        const bounciness = 0.7 + Math.random() * 0.6;
        
        this.balls.push({
            x: Math.random() * (this.canvas.width / (window.devicePixelRatio || 1)),
            y: Math.random() * spawnAreaTop,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() * 1) + 0.5,
            radius: ballRadius,
            color: color,
            stuck: false,
            stuckTo: null,
            inContainer: false,
            bounciness: bounciness // Добавляем параметр прыгучести
        });
    }

    undoLastLine() {
        if (this.lines.length > 0 && !this.gameOver) {
            // Возвращаем часть чернил при удалении линии
            const removedLine = this.lines.pop();
            let lineLength = 0;
            for (let i = 0; i < removedLine.points.length - 1; i++) {
                const p1 = removedLine.points[i];
                const p2 = removedLine.points[i + 1];
                lineLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            }
            this.currentInk = Math.min(this.maxInk, this.currentInk + lineLength * this.inkCostPerPixel * 0.8);
            this.inkDepleted = false; // Сбрасываем флаг, если чернила вернулись
            this.updateInkIndicator();
            
            document.getElementById('lineCount').textContent = this.lines.length;
            this.render();
        }
    }

    clearAll() {
        this.balls = [];
        this.lines = [];
        this.ballsInContainer = 0;
        this.isRunning = false;
        this.gameStarted = false;
        this.gameOver = false;
        this.timeLeft = this.gameTime;
        this.currentInk = this.maxInk; // Восстанавливаем чернила только при полной очистке
        this.inkDepleted = false; // Сбрасываем флаг окончания чернил
        this.updateInkIndicator();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.updateUI();
        this.render();
    }

    updateInkIndicator() {
        const inkPercent = (this.currentInk / this.maxInk) * 100;
        
        // Обновляем десктопный индикатор
        const inkFill = document.getElementById('inkFill');
        const inkPercentElement = document.getElementById('inkPercent');
        
        if (inkFill) {
            inkFill.style.width = `${inkPercent}%`;
            if (inkPercent < 20) {
                inkFill.classList.add('low');
            } else {
                inkFill.classList.remove('low');
            }
        }
        
        if (inkPercentElement) {
            inkPercentElement.textContent = `${Math.floor(inkPercent)}%`;
        }
        
        // Обновляем мобильный индикатор
        const mobileInkFill = document.getElementById('mobileInkFill');
        const mobileInkPercent = document.getElementById('mobileInkPercent');
        
        if (mobileInkFill) {
            mobileInkFill.style.width = `${inkPercent}%`;
            if (inkPercent < 20) {
                mobileInkFill.classList.add('low');
            } else {
                mobileInkFill.classList.remove('low');
            }
        }
        
        if (mobileInkPercent) {
            mobileInkPercent.textContent = `${Math.floor(inkPercent)}%`;
        }
        
        // Меняем курсор при окончании чернил
        if (this.currentInk <= 0) {
            this.canvas.style.cursor = 'not-allowed';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    updateUI() {
        document.getElementById('ballCount').textContent = this.balls.filter(ball => !ball.inContainer).length;
        document.getElementById('containerCount').textContent = this.ballsInContainer;
        document.getElementById('lineCount').textContent = this.lines.length;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = Math.floor(this.timeLeft % 60);
        const timerElement = document.getElementById('timer') || this.createTimerElement();
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const maxBallsElement = document.getElementById('maxBalls') || this.createMaxBallsElement();
        maxBallsElement.textContent = `${this.ballsInContainer}/${this.maxBallsInContainer}`;
        
        // Обновление отображения чернил
        const inkElement = document.getElementById('inkLevel') || this.createInkElement();
        inkElement.textContent = `${Math.floor(this.currentInk)}/${this.maxInk}`;
        inkElement.style.color = this.currentInk < this.maxInk * 0.2 ? '#ff6f61' : '#00f6ff';
        
        this.updateInkIndicator();
        
        if (this.gameOver) {
            const statusElement = document.getElementById('gameStatus') || this.createStatusElement();
            if (this.playerWon) {
                statusElement.textContent = '🎉 ПОБЕДА!';
                statusElement.style.color = '#61ff6f';
            } else {
                statusElement.textContent = '💥 ПОРАЖЕНИЕ';
                statusElement.style.color = '#ff6f61';
            }
        }
    }

    createTimerElement() {
        const timerElement = document.createElement('div');
        timerElement.id = 'timer';
        timerElement.className = 'score-big';
        timerElement.style.color = '#00f6ff';
        
        const panel = document.querySelector('.panel:nth-child(3)');
        const firstScoreRow = panel.querySelector('.score-row');
        panel.insertBefore(timerElement, firstScoreRow);
        
        return timerElement;
    }

    createMaxBallsElement() {
        const maxBallsElement = document.createElement('div');
        maxBallsElement.id = 'maxBalls';
        maxBallsElement.className = 'score-big';
        maxBallsElement.style.color = '#ffcccb';
        
        const panel = document.querySelector('.panel:nth-child(3)');
        const containerCountRow = panel.querySelector('.score-row:nth-child(2)');
        panel.insertBefore(maxBallsElement, containerCountRow.nextSibling);
        
        return maxBallsElement;
    }

    createInkElement() {
        const inkElement = document.createElement('div');
        inkElement.id = 'inkLevel';
        inkElement.className = 'score-big';
        inkElement.style.color = '#00f6ff';
        
        const panel = document.querySelector('.panel:nth-child(3)');
        const lineCountRow = panel.querySelector('.score-row:nth-child(4)');
        const newRow = document.createElement('div');
        newRow.className = 'score-row ink-mobile';
        newRow.innerHTML = '<span class="muted">Чернила</span>';
        newRow.appendChild(inkElement);
        panel.insertBefore(newRow, lineCountRow.nextSibling);
        
        return inkElement;
    }

    createStatusElement() {
        const statusElement = document.createElement('div');
        statusElement.id = 'gameStatus';
        statusElement.style.textAlign = 'center';
        statusElement.style.fontSize = '20px';
        statusElement.style.fontWeight = 'bold';
        statusElement.style.marginTop = '10px';
        statusElement.style.padding = '10px';
        statusElement.style.borderRadius = '8px';
        statusElement.style.background = 'rgba(255,255,255,0.05)';
        
        const panel = document.querySelector('.panel:nth-child(3)');
        panel.appendChild(statusElement);
        
        return statusElement;
    }

    animate() {
        if (!this.isRunning || this.gameOver) return;

        this.updatePhysics();
        this.render();
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }

    updatePhysics() {
        const currentTime = Date.now();
        
        if (this.isRunning && 
            this.balls.length < this.maxBalls && 
            currentTime - this.lastBallSpawnTime > this.ballSpawnInterval) {
            this.addRandomBall();
            this.lastBallSpawnTime = currentTime;
        }
        
        if (this.gameStarted && !this.gameOver) {
            this.timeLeft -= 1/60;
            
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.endGame(true);
                return;
            }
        }

        let activeBalls = 0;
        
        this.balls.forEach((ball, index) => {
            if (ball.inContainer) {
                return;
            }

            activeBalls++;

            if (ball.stuck) return;

            ball.vy += 0.05;

            const oldX = ball.x;
            const oldY = ball.y;

            ball.x += ball.vx;
            ball.y += ball.vy;

            if (this.checkContainerCollision(ball)) {
                ball.inContainer = true;
                this.ballsInContainer++;
                
                if (this.ballsInContainer >= this.maxBallsInContainer && !this.gameOver) {
                    this.endGame(false);
                    return;
                }
            }

            let collided = false;
            for (const line of this.lines) {
                for (let i = 0; i < line.points.length - 1; i++) {
                    const p1 = line.points[i];
                    const p2 = line.points[i + 1];
                    
                    if (this.lineCircleCollision(p1, p2, ball)) {
                        this.handleCollision(ball, p1, p2);
                        collided = true;
                        this.preventLinePenetration(ball, p1, p2, oldX, oldY);
                    }
                }
                if (collided) break;
            }

            const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
            
            // Используем прыгучесть при отскоках от стен
            if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvasWidth) {
                ball.vx *= -0.8 * ball.bounciness; // Учитываем прыгучесть
                ball.x = Math.max(ball.radius, Math.min(canvasWidth - ball.radius, ball.x));
            }
            
            if (ball.y - ball.radius < 0) {
                ball.vy *= -0.8 * ball.bounciness; // Учитываем прыгучесть
                ball.y = ball.radius;
            }
            
            if (ball.y + ball.radius > canvasHeight && !ball.inContainer) {
                ball.vy *= -0.7 * ball.bounciness; // Учитываем прыгучесть
                ball.y = canvasHeight - ball.radius;
            }
        });
    }

    preventLinePenetration(ball, p1, p2, oldX, oldY) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        const normal = { x: -dy / length, y: dx / length };
        
        const distance = this.pointToLineDistance(ball.x, ball.y, p1.x, p1.y, p2.x, p2.y);
        
        // Увеличиваем зону коллизии с учетом толщины линии
        const collisionBuffer = ball.radius + 3; // +3 пикселя для учета толщины линии
        
        if (distance < collisionBuffer) {
            const pushDistance = collisionBuffer - distance + 0.1;
            ball.x += normal.x * pushDistance;
            ball.y += normal.y * pushDistance;
            
            const newDistance = this.pointToLineDistance(ball.x, ball.y, p1.x, p1.y, p2.x, p2.y);
            if (newDistance < collisionBuffer) {
                ball.x = oldX;
                ball.y = oldY;
            }
        }
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkContainerCollision(ball) {
        return ball.x + ball.radius >= this.container.x &&
               ball.x - ball.radius <= this.container.x + this.container.width &&
               ball.y + ball.radius >= this.container.y &&
               ball.y - ball.radius <= this.container.y + this.container.height;
    }

    lineCircleCollision(p1, p2, circle) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return false;
        
        const dot = (((circle.x - p1.x) * dx) + ((circle.y - p1.y) * dy)) / (length * length);
        
        const closestX = p1.x + (dot * dx);
        const closestY = p1.y + (dot * dy);
        
        if (!this.pointOnLineSegment(p1, p2, {x: closestX, y: closestY})) {
            return false;
        }
        
        const distance = Math.sqrt((circle.x - closestX) ** 2 + (circle.y - closestY) ** 2);
        
        // Увеличиваем зону коллизии для более надежного обнаружения
        return distance <= circle.radius + 4; // +4 пикселя вместо +1
    }

    pointOnLineSegment(p1, p2, point) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const innerProduct = (point.x - p1.x) * dx + (point.y - p1.y) * dy;
        return innerProduct >= 0 && innerProduct <= dx * dx + dy * dy;
    }

    handleCollision(ball, p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const normal = { x: -dy, y: dx };
        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        
        if (length === 0) return;
        
        normal.x /= length;
        normal.y /= length;

        const dot = ball.vx * normal.x + ball.vy * normal.y;
        
        // Учитываем прыгучесть при отскоке от линий
        const bounceFactor = 0.95 * ball.bounciness;
        
        ball.vx = ball.vx - 2 * dot * normal.x;
        ball.vy = ball.vy - 2 * dot * normal.y;
        
        ball.vx *= bounceFactor;
        ball.vy *= bounceFactor;
        
        // Дополнительный толчок от линии для предотвращения залипания
        ball.x += normal.x * 2;
        ball.y += normal.y * 2;
    }

    endGame(playerWon) {
        this.gameOver = true;
        this.playerWon = playerWon;
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.render();
        this.updateUI();
        
        setTimeout(() => {
            if (playerWon) {
                alert('🎉 ПОБЕДА! Вы защитили контейнер!');
            } else {
                alert('💥 ПОРАЖЕНИЕ! В контейнер попало слишком много шаров!');
            }
        }, 100);
    }

    render() {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.fillStyle = 'rgba(5, 7, 19, 0.95)';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const containerColor = this.ballsInContainer > this.maxBallsInContainer * 0.7 ? 
            'rgba(255, 111, 97, 0.3)' : 'rgba(0, 246, 255, 0.15)';
        const borderColor = this.ballsInContainer > this.maxBallsInContainer * 0.7 ? 
            'rgba(255, 111, 97, 0.8)' : 'rgba(0, 246, 255, 0.6)';
            
        this.ctx.fillStyle = containerColor;
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(this.container.x, this.container.y, this.container.width, this.container.height);
        this.ctx.strokeRect(this.container.x, this.container.y, this.container.width, this.container.height);
        
        this.ctx.fillStyle = borderColor;
        this.ctx.font = this.isMobile() ? '10px Inter' : '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            `КОНТЕЙНЕР (${this.ballsInContainer}/${this.maxBallsInContainer})`, 
            this.container.x + this.container.width / 2, 
            this.container.y + this.container.height / 2
        );

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Рисуем линии с увеличенной толщиной
        this.lines.forEach(line => {
            this.ctx.beginPath();
            this.ctx.moveTo(line.points[0].x, line.points[0].y);
            for (let i = 1; i < line.points.length; i++) {
                this.ctx.lineTo(line.points[i].x, line.points[i].y);
            }
            this.ctx.strokeStyle = line.color;
            this.ctx.lineWidth = line.width;
            this.ctx.stroke();
            
            // Добавляем небольшое свечение для лучшей видимости
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
            this.ctx.shadowBlur = 4;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        });

        if (this.currentLine && this.currentLine.points.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentLine.points[0].x, this.currentLine.points[0].y);
            for (let i = 1; i < this.currentLine.points.length; i++) {
                this.ctx.lineTo(this.currentLine.points[i].x, this.currentLine.points[i].y);
            }
            this.ctx.strokeStyle = this.currentLine.color;
            this.ctx.lineWidth = this.currentLine.width;
            this.ctx.stroke();
            
            // Свечение для текущей линии
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
            this.ctx.shadowBlur = 6;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        this.balls.forEach(ball => {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = ball.color;
            
            if (!ball.inContainer) {
                this.ctx.shadowColor = ball.color;
                this.ctx.shadowBlur = 8;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } else {
                this.ctx.fill();
            }
        });

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            this.ctx.fillStyle = this.playerWon ? '#61ff6f' : '#ff6f61';
            this.ctx.font = 'bold 24px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                this.playerWon ? '🎉 ПОБЕДА!' : '💥 ПОРАЖЕНИЕ', 
                canvasWidth / 2, 
                canvasHeight / 2 - 30
            );
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Inter';
            this.ctx.fillText(
                this.playerWon ? 
                    'Вы защитили контейнер!' : 
                    `В контейнер попало ${this.ballsInContainer} шаров`, 
                canvasWidth / 2, 
                canvasHeight / 2 + 10
            );
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '14px Inter';
            this.ctx.fillText(
                'Нажмите "Очистить" для новой игры', 
                canvasWidth / 2, 
                canvasHeight / 2 + 40
            );
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new ChaosGenerator(canvas);
    
    document.getElementById('btnStart').addEventListener('click', () => {
        game.startBalls();
    });
    
    document.getElementById('btnClear').addEventListener('click', () => {
        game.clearAll();
    });
    
    // Добавляем возможность отмены последней линии по Ctrl+Z
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            game.undoLastLine();
        }
    });
    
    game.render();
});