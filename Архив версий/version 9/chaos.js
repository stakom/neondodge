class PlinkoGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.balls = [];
        this.pins = [];
        this.slots = [];
        this.animationId = null;
        this.isRunning = false;
        this.isAutoMode = false;
        this.autoInterval = null;
        this.autoSpeed = 3;
        
        // Game state
        this.balance = 1000;
        this.betAmount = 10;
        this.totalGames = 0;
        this.wins = 0;
        this.biggestWin = 0;
        
        // Multipliers for 9 slots
        this.multipliers = [0, 0.5, 1, 2, 5, 2, 1, 0.5, 0];
        
        this.setupEventListeners();
        this.resizeCanvas();
        this.createPins();
        this.createSlots();
        this.render();
        
        // Update UI
        this.updateUI();
    }

    setupEventListeners() {
        // Game control buttons
        document.getElementById('btnDropBall').addEventListener('click', () => {
            this.dropBall();
        });
        
        document.getElementById('btnAuto').addEventListener('click', () => {
            this.toggleAutoMode();
        });
        
        document.getElementById('btnStopAuto').addEventListener('click', () => {
            this.stopAutoMode();
        });
        
        // Bet controls
        document.getElementById('btnBetUp').addEventListener('click', () => {
            this.changeBet(10);
        });
        
        document.getElementById('btnBetDown').addEventListener('click', () => {
            this.changeBet(-10);
        });
        
        // Bet presets
        document.querySelectorAll('.bet-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bet = parseInt(e.target.dataset.bet);
                this.setBet(bet);
            });
        });
        
        // Auto speed control
        document.getElementById('autoSpeed').addEventListener('input', (e) => {
            this.autoSpeed = parseInt(e.target.value);
            if (this.isAutoMode) {
                this.restartAutoMode();
            }
        });
        
        // Balance controls
        document.getElementById('btnAddMoney').addEventListener('click', () => {
            this.addMoney(500);
        });
        
        document.getElementById('btnReset').addEventListener('click', () => {
            this.resetGame();
        });
        
        // Window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = Math.min(rect.width * 0.75, window.innerHeight * 0.7);
        this.createPins();
        this.createSlots();
        this.render();
    }

    createPins() {
        this.pins = [];
        const rows = 12; // Increased rows for more complex path
        const maxCols = 10; // Maximum pins in the widest row
        const pinRadius = 4;
        const verticalSpacing = (this.canvas.height * 0.7) / (rows + 1);
        
        for (let row = 0; row < rows; row++) {
            const cols = Math.min(row + 3, maxCols); // Tree shape with capped width
            const horizontalSpacing = this.canvas.width / (cols + 2);
            const y = 100 + row * verticalSpacing;
            
            for (let col = 0; col < cols; col++) {
                // Add slight random offset to x for less predictable paths
                const xOffset = (Math.random() - 0.5) * horizontalSpacing * 0.2;
                const x = (col + 1) * horizontalSpacing + xOffset;
                this.pins.push({ x, y, radius: pinRadius });
            }
        }
    }

    createSlots() {
        this.slots = [];
        const slotCount = 9;
        const slotWidth = this.canvas.width / slotCount;
        const slotHeight = 40;
        const slotY = this.canvas.height - slotHeight;
        
        for (let i = 0; i < slotCount; i++) {
            this.slots.push({
                x: i * slotWidth,
                y: slotY,
                width: slotWidth,
                height: slotHeight,
                multiplier: this.multipliers[i]
            });
        }
    }

    dropBall() {
        if (this.balance < this.betAmount) {
            this.showMessage("Недостаточно средств!", "lose");
            return;
        }
        
        // Deduct bet from balance
        this.balance -= this.betAmount;
        this.updateUI();
        
        // Create a new ball
        const ball = {
            x: this.canvas.width / 2,
            y: 50,
            radius: 8,
            vx: 0,
            vy: 0,
            color: this.getRandomBallColor(),
            inPlay: true,
            slot: null
        };
        
        // Increased random horizontal velocity for more spread
        ball.vx = (Math.random() - 0.5) * 1.0;
        ball.vy = 0.5;
        
        this.balls.push(ball);
        this.totalGames++;
        
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    getRandomBallColor() {
        const colors = [
            '#ff6f61', '#6b5b95', '#61ff6f', '#d46bff', 
            '#ffcc00', '#00ccff', '#ff66cc', '#66ff99'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    animate() {
        if (!this.isRunning) return;
        
        this.updatePhysics();
        this.render();
        
        // Check if all balls have settled
        const activeBalls = this.balls.filter(ball => ball.inPlay).length;
        if (activeBalls === 0) {
            this.isRunning = false;
        } else {
            this.animationId = requestAnimationFrame(this.animate.bind(this));
        }
    }

    updatePhysics() {
        const gravity = 0.1;
        const friction = 0.99;
        const bounce = 0.7;
        
        this.balls.forEach(ball => {
            if (!ball.inPlay) return;
            
            // Apply gravity
            ball.vy += gravity;
            
            // Apply friction
            ball.vx *= friction;
            ball.vy *= friction;
            
            // Update position
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // Check pin collisions
            this.pins.forEach(pin => {
                const dx = ball.x - pin.x;
                const dy = ball.y - pin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ball.radius + pin.radius) {
                    // Collision response
                    const angle = Math.atan2(dy, dx);
                    const targetX = pin.x + Math.cos(angle) * (ball.radius + pin.radius);
                    const targetY = pin.y + Math.sin(angle) * (ball.radius + pin.radius);
                    
                    ball.x = targetX;
                    ball.y = targetY;
                    
                    // Bounce with random direction
                    const bounceDirection = Math.random() > 0.5 ? 1 : -1;
                    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    ball.vx = Math.cos(angle + bounceDirection * Math.PI/2) * speed * bounce;
                    ball.vy = Math.sin(angle + bounceDirection * Math.PI/2) * speed * bounce;
                }
            });
            
            // Check wall collisions
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
                ball.vx = Math.abs(ball.vx) * bounce;
            } else if (ball.x + ball.radius > this.canvas.width) {
                ball.x = this.canvas.width - ball.radius;
                ball.vx = -Math.abs(ball.vx) * bounce;
            }
            
            // Check if ball reached a slot
            this.slots.forEach((slot, index) => {
                if (ball.y + ball.radius > slot.y && 
                    ball.x > slot.x && 
                    ball.x < slot.x + slot.width &&
                    !ball.slot) {
                    
                    ball.slot = index;
                    ball.inPlay = false;
                    
                    // Calculate win
                    const multiplier = slot.multiplier;
                    const winAmount = this.betAmount * multiplier;
                    
                    // Update balance
                    this.balance += winAmount;
                    
                    // Update stats
                    if (winAmount > 0) {
                        this.wins++;
                        if (winAmount > this.biggestWin) {
                            this.biggestWin = winAmount;
                        }
                        this.showMessage(`Вы выиграли ${winAmount}₽ (x${multiplier})!`, "win");
                    } else {
                        this.showMessage("Вы проиграли!", "lose");
                    }
                    
                    // Highlight the winning slot
                    this.highlightSlot(index);
                    this.updateUI();
                }
            });
            
            // Remove balls that fall below the canvas
            if (ball.y - ball.radius > this.canvas.height) {
                ball.inPlay = false;
                this.showMessage("Вы проиграли!", "lose");
            }
        });
        
        // Remove balls that are out of play
        this.balls = this.balls.filter(ball => ball.inPlay || ball.slot !== null);
    }

    highlightSlot(index) {
        const slotElements = document.querySelectorAll('.slot');
        slotElements.forEach((slot, i) => {
            if (i === index) {
                slot.classList.add('active');
                setTimeout(() => {
                    slot.classList.remove('active');
                }, 2000);
            }
        });
    }

    showMessage(message, type) {
        const lastResult = document.getElementById('lastResult');
        lastResult.textContent = message;
        lastResult.className = 'last-result ' + type;
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(5, 7, 19, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pins
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.pins.forEach(pin => {
            this.ctx.beginPath();
            this.ctx.arc(pin.x, pin.y, pin.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw slots
        this.slots.forEach((slot, index) => {
            this.ctx.fillStyle = index % 2 === 0 ? 'rgba(0, 246, 255, 0.1)' : 'rgba(255, 111, 97, 0.1)';
            this.ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);
            
            // Draw multiplier text
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = '12px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                `x${slot.multiplier}`, 
                slot.x + slot.width / 2, 
                slot.y + slot.height / 2
            );
        });
        
        // Draw balls
        this.balls.forEach(ball => {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = ball.color;
            
            // Add glow effect
            this.ctx.shadowColor = ball.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
        
        // Draw drop zone
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, 50, 15, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    updateUI() {
        document.getElementById('balanceAmount').textContent = this.balance;
        document.getElementById('betAmount').textContent = this.betAmount;
        document.getElementById('totalGames').textContent = this.totalGames;
        document.getElementById('wins').textContent = this.wins;
        document.getElementById('winRate').textContent = this.totalGames > 0 ? 
            Math.round((this.wins / this.totalGames) * 100) + '%' : '0%';
        document.getElementById('biggestWin').textContent = this.biggestWin;
        
        // Update button states
        document.getElementById('btnDropBall').disabled = this.balance < this.betAmount;
        document.getElementById('btnBetDown').disabled = this.betAmount <= 10;
    }

    changeBet(amount) {
        const newBet = this.betAmount + amount;
        if (newBet >= 10 && newBet <= this.balance) {
            this.betAmount = newBet;
            this.updateUI();
        }
    }

    setBet(amount) {
        if (amount >= 10 && amount <= this.balance) {
            this.betAmount = amount;
            this.updateUI();
        }
    }

    toggleAutoMode() {
        if (this.isAutoMode) {
            this.stopAutoMode();
        } else {
            this.startAutoMode();
        }
    }

    startAutoMode() {
        if (this.balance < this.betAmount) {
            this.showMessage("Недостаточно средств для авто-игры!", "lose");
            return;
        }
        
        this.isAutoMode = true;
        document.getElementById('autoControls').style.display = 'block';
        document.getElementById('btnAuto').textContent = '⏸️ Пауза';
        
        this.autoInterval = setInterval(() => {
            if (this.balance >= this.betAmount && !this.isRunning) {
                this.dropBall();
            } else if (this.balance < this.betAmount) {
                this.stopAutoMode();
                this.showMessage("Авто-игра остановлена: недостаточно средств", "lose");
            }
        }, 1000 / this.autoSpeed);
    }

    stopAutoMode() {
        this.isAutoMode = false;
        document.getElementById('autoControls').style.display = 'none';
        document.getElementById('btnAuto').textContent = '⚡ Авто-игра';
        
        if (this.autoInterval) {
            clearInterval(this.autoInterval);
            this.autoInterval = null;
        }
    }

    restartAutoMode() {
        if (this.isAutoMode) {
            this.stopAutoMode();
            this.startAutoMode();
        }
    }

    addMoney(amount) {
        this.balance += amount;
        this.updateUI();
        this.showMessage(`Баланс пополнен на ${amount}₽`, "win");
    }

    resetGame() {
        this.balance = 1000;
        this.betAmount = 10;
        this.totalGames = 0;
        this.wins = 0;
        this.biggestWin = 0;
        this.balls = [];
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.stopAutoMode();
        this.updateUI();
        this.showMessage("Игра сброшена!", "win");
        this.render();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new PlinkoGame(canvas);
});