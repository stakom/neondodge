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
            height: 30
        };
        this.ballsInContainer = 0;
        this.maxBalls = 100;
        this.lastSplitTime = 0;
        this.splitCooldown = 500; // 500ms cooldown between splits
        
        this.setupEventListeners();
        this.resizeCanvas();
        this.updateContainerPosition();
        
        // Устанавливаем плотность пикселей для четкой графики
        this.setPixelRatio();
    }

    setPixelRatio() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // Устанавливаем реальный размер canvas
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Масштабируем контекст
        this.ctx.scale(dpr, dpr);
        
        // Устанавливаем CSS размер
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseleave', this.stopDrawing.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Mobile control buttons
        document.getElementById('btnAddBall')?.addEventListener('click', () => {
            this.addRandomBall();
        });

        document.getElementById('btnUndo')?.addEventListener('click', () => {
            this.undoLastLine();
        });

        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Prevent default touch behaviors
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
        
        // Устанавливаем реальный размер
        this.canvas.width = rect.width * dpr;
        this.canvas.height = Math.min(rect.width * 0.75, window.innerHeight * 0.7) * dpr;
        
        // Устанавливаем CSS размер
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = Math.min(rect.width * 0.75, window.innerHeight * 0.7) + 'px';
        
        // Сбрасываем трансформацию и устанавливаем новую
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        this.updateContainerPosition();
        this.render();
    }

    updateContainerPosition() {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.container.width = canvasWidth * 0.5;
        this.container.x = (canvasWidth - this.container.width) / 2;
        this.container.y = canvasHeight - this.container.height - 10;
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.currentLine = {
            points: [pos],
            color: `rgba(255, 255, 255, 0.9)`,
            width: this.isMobile() ? 4 : 3
        };
    }

    draw(e) {
        if (!this.isDrawing || !this.currentLine) return;
        
        const pos = this.getMousePos(e);
        this.currentLine.points.push(pos);
        this.render();
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
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Create initial balls in the top area (above drawn lines)
        for (let i = 0; i < 8; i++) {
            this.addRandomBall();
        }
        
        this.animate();
    }

    addRandomBall() {
        if (this.balls.length >= this.maxBalls) return;
        
        const types = [
            { color: '#ff6f61', behavior: 'bounce' },
            { color: '#6b5b95', behavior: 'stick' },
            { color: '#61ff6f', behavior: 'split' },
            { color: '#d46bff', behavior: 'accelerate' }
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Spawn balls in the top 30% of the canvas to avoid initial collisions
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const spawnAreaTop = canvasHeight * 0.3;
        const ballRadius = this.isMobile() ? 5 : 6;
        
        this.balls.push({
            x: Math.random() * (this.canvas.width / (window.devicePixelRatio || 1)),
            y: Math.random() * spawnAreaTop,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() * 1) + 0.5,
            radius: ballRadius,
            color: type.color,
            behavior: type.behavior,
            stuck: false,
            stuckTo: null,
            inContainer: false,
            lastSplit: 0 // Время последнего разделения
        });

        if (this.isRunning) {
            document.getElementById('ballCount').textContent = this.balls.filter(ball => !ball.inContainer).length;
        }
    }

    undoLastLine() {
        if (this.lines.length > 0) {
            this.lines.pop();
            document.getElementById('lineCount').textContent = this.lines.length;
            this.render();
        }
    }

    clearAll() {
        this.balls = [];
        this.lines = [];
        this.ballsInContainer = 0;
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        document.getElementById('ballCount').textContent = '0';
        document.getElementById('containerCount').textContent = '0';
        document.getElementById('lineCount').textContent = '0';
        this.render();
    }

    animate() {
        if (!this.isRunning) return;

        this.updatePhysics();
        this.render();
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }

    updatePhysics() {
        let activeBalls = 0;
        const currentTime = Date.now();
        
        this.balls.forEach((ball, index) => {
            if (ball.inContainer) {
                return;
            }

            activeBalls++;

            if (ball.stuck) return;

            // Apply gravity
            ball.vy += 0.05;

            // Update position
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Check container collision
            if (this.checkContainerCollision(ball)) {
                ball.inContainer = true;
                this.ballsInContainer++;
                document.getElementById('containerCount').textContent = this.ballsInContainer;
                return;
            }

            // Line collisions
            this.lines.forEach(line => {
                for (let i = 0; i < line.points.length - 1; i++) {
                    const p1 = line.points[i];
                    const p2 = line.points[i + 1];
                    
                    if (this.lineCircleCollision(p1, p2, ball)) {
                        this.handleCollision(ball, p1, p2, currentTime);
                    }
                }
            });

            // Wall collisions
            const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
            if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvasWidth) {
                ball.vx *= -0.8;
                ball.x = Math.max(ball.radius, Math.min(canvasWidth - ball.radius, ball.x));
            }
            
            if (ball.y - ball.radius < 0) {
                ball.vy *= -0.8;
                ball.y = ball.radius;
            }

            // Behavior-specific logic
            this.applyBehavior(ball, index);
        });

        // Add new balls occasionally if we have space
        if (this.isRunning && this.balls.length < this.maxBalls && Math.random() < 0.02) {
            this.addRandomBall();
        }

        document.getElementById('ballCount').textContent = activeBalls;
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
        
        return distance <= circle.radius;
    }

    pointOnLineSegment(p1, p2, point) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const innerProduct = (point.x - p1.x) * dx + (point.y - p1.y) * dy;
        return innerProduct >= 0 && innerProduct <= dx * dx + dy * dy;
    }

    handleCollision(ball, p1, p2, currentTime) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const normal = { x: -dy, y: dx };
        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        
        if (length === 0) return;
        
        normal.x /= length;
        normal.y /= length;

        const dot = ball.vx * normal.x + ball.vy * normal.y;
        
        switch(ball.behavior) {
            case 'bounce':
                ball.vx = ball.vx - 2 * dot * normal.x;
                ball.vy = ball.vy - 2 * dot * normal.y;
                break;
            case 'stick':
                if (!ball.stuck) {
                    ball.vx = 0;
                    ball.vy = 0;
                    ball.stuck = true;
                    ball.stuckTo = { p1, p2 };
                }
                break;
            case 'split':
                ball.vx = ball.vx - 2 * dot * normal.x;
                ball.vy = ball.vy - 2 * dot * normal.y;
                
                // Добавляем кулдаун на разделение (максимум 1 разделение в 500ms)
                if (this.balls.length < this.maxBalls && currentTime - ball.lastSplit > this.splitCooldown) {
                    ball.lastSplit = currentTime;
                    this.balls.push({
                        ...ball,
                        x: ball.x + normal.x * 15,
                        y: ball.y + normal.y * 15,
                        vx: -ball.vx * 0.7,
                        vy: -ball.vy * 0.7,
                        radius: Math.max(3, ball.radius * 0.8),
                        lastSplit: currentTime // Новый шар тоже получает кулдаун
                    });
                }
                break;
            case 'accelerate':
                ball.vx = ball.vx - 2 * dot * normal.x + normal.x * 1.5;
                ball.vy = ball.vy - 2 * dot * normal.y + normal.y * 1.5;
                break;
        }
    }

    applyBehavior(ball, index) {
        if (ball.behavior === 'accelerate' && Math.random() < 0.02) {
            ball.vx += (Math.random() - 0.5) * 0.3;
            ball.vy += (Math.random() - 0.5) * 0.3;
        }
    }

    render() {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        this.ctx.fillStyle = 'rgba(5, 7, 19, 0.95)';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw container
        this.ctx.fillStyle = 'rgba(0, 246, 255, 0.15)';
        this.ctx.strokeStyle = 'rgba(0, 246, 255, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(this.container.x, this.container.y, this.container.width, this.container.height);
        this.ctx.strokeRect(this.container.x, this.container.y, this.container.width, this.container.height);
        
        // Draw container label
        this.ctx.fillStyle = 'rgba(0, 246, 255, 0.8)';
        this.ctx.font = this.isMobile() ? '10px Inter' : '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            'КОНТЕЙНЕР', 
            this.container.x + this.container.width / 2, 
            this.container.y + this.container.height / 2
        );

        // Draw lines
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.lines.forEach(line => {
            this.ctx.beginPath();
            this.ctx.moveTo(line.points[0].x, line.points[0].y);
            for (let i = 1; i < line.points.length; i++) {
                this.ctx.lineTo(line.points[i].x, line.points[i].y);
            }
            this.ctx.strokeStyle = line.color;
            this.ctx.lineWidth = line.width;
            this.ctx.stroke();
        });

        // Draw current line being drawn
        if (this.currentLine && this.currentLine.points.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentLine.points[0].x, this.currentLine.points[0].y);
            for (let i = 1; i < this.currentLine.points.length; i++) {
                this.ctx.lineTo(this.currentLine.points[i].x, this.currentLine.points[i].y);
            }
            this.ctx.strokeStyle = this.currentLine.color;
            this.ctx.lineWidth = this.currentLine.width;
            this.ctx.stroke();
        }

        // Draw balls (оригинальный простой стиль)
        this.balls.forEach(ball => {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = ball.color;
            
            // Add glow effect for active balls
            if (!ball.inContainer) {
                this.ctx.shadowColor = ball.color;
                this.ctx.shadowBlur = 8;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } else {
                this.ctx.fill();
            }
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new ChaosGenerator(canvas);
    
    document.getElementById('btnStart').addEventListener('click', () => {
        game.startBalls();
    });
    
    document.getElementById('btnClear').addEventListener('click', () => {
        game.clearAll();
    });
    
    game.render();
});