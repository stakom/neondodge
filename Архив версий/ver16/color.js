(() => {
    // Game state
    let gameState = {
        isPlaying: false,
        isShowingSequence: false,
        currentLevel: 1,
        currentScore: 0,
        bestScore: parseInt(localStorage.getItem('colorSequence_best') || '0'),
        maxLevel: parseInt(localStorage.getItem('colorSequence_maxLevel') || '1'),
        sequence: [],
        playerInput: [],
        colors: ['red', 'blue', 'green', 'yellow'],
        gameTimeout: null
    };

    // DOM elements
    const lights = document.querySelectorAll('.light');
    const statusText = document.getElementById('statusText');
    const levelElement = document.getElementById('level');
    const sequenceLengthElement = document.getElementById('sequenceLength');
    const currentScoreElement = document.getElementById('currentScore');
    const bestScoreElement = document.getElementById('bestScore');
    const maxLevelElement = document.getElementById('maxLevel');
    const btnStart = document.getElementById('btnStart');
    const btnReset = document.getElementById('btnReset');

    // Sound functions
    function playTone(color, duration = 300) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            const frequencies = {
                red: 329.63,    // E4
                blue: 392.00,   // G4
                green: 493.88,  // B4
                yellow: 587.33  // D5
            };
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequencies[color];
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
        } catch (error) {
            console.log('Audio error:', error);
        }
    }

    function playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio error:', error);
        }
    }

    function playErrorSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio error:', error);
        }
    }

    // Game functions
    function generateSequence() {
        gameState.sequence = [];
        for (let i = 0; i < gameState.currentLevel; i++) {
            const randomColor = gameState.colors[Math.floor(Math.random() * gameState.colors.length)];
            gameState.sequence.push(randomColor);
        }
    }

    async function showSequence() {
        gameState.isShowingSequence = true;
        statusText.textContent = 'Запоминайте последовательность...';
        disableLights();
        disableStartButton();
        
        for (const color of gameState.sequence) {
            await lightUp(color, 800);
            await sleep(300);
        }
        
        gameState.isShowingSequence = false;
        statusText.textContent = 'Ваша очередь! Повторите последовательность';
        enableLights();
    }

    function lightUp(color, duration) {
        return new Promise(resolve => {
            const light = document.querySelector(`.light[data-color="${color}"]`);
            light.classList.add('active');
            playTone(color, duration);
            
            setTimeout(() => {
                light.classList.remove('active');
                setTimeout(resolve, 100);
            }, duration);
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function handleLightClick(color) {
        if (!gameState.isPlaying || gameState.isShowingSequence) return;
        
        gameState.playerInput.push(color);
        lightUp(color, 400);
        
        // Check if the input matches the sequence
        const currentIndex = gameState.playerInput.length - 1;
        
        if (gameState.playerInput[currentIndex] !== gameState.sequence[currentIndex]) {
            gameOver();
            return;
        }
        
        if (gameState.playerInput.length === gameState.sequence.length) {
            levelComplete();
        }
    }

    function levelComplete() {
        gameState.currentScore += gameState.currentLevel * 10;
        gameState.currentLevel++;
        
        if (gameState.currentLevel > gameState.maxLevel) {
            gameState.maxLevel = gameState.currentLevel;
            localStorage.setItem('colorSequence_maxLevel', gameState.maxLevel.toString());
        }
        
        if (gameState.currentScore > gameState.bestScore) {
            gameState.bestScore = gameState.currentScore;
            localStorage.setItem('colorSequence_best', gameState.bestScore.toString());
        }
        
        updateUI();
        playSuccessSound();
        statusText.textContent = 'Правильно! Уровень повышен!';
        
        // Clear any existing timeout
        if (gameState.gameTimeout) {
            clearTimeout(gameState.gameTimeout);
        }
        
        gameState.gameTimeout = setTimeout(() => {
            gameState.playerInput = [];
            generateSequence();
            showSequence();
        }, 1500);
    }

    function gameOver() {
        gameState.isPlaying = false;
        playErrorSound();
        statusText.textContent = `Игра окончена! Ваш счёт: ${gameState.currentScore}`;
        disableLights();
        enableStartButton();
        
        // Clear any existing timeout
        if (gameState.gameTimeout) {
            clearTimeout(gameState.gameTimeout);
        }
        
        // Blink all lights in error pattern
        lights.forEach(light => {
            light.classList.add('active');
        });
        
        gameState.gameTimeout = setTimeout(() => {
            lights.forEach(light => {
                light.classList.remove('active');
            });
        }, 500);
        
        updateUI();
    }

    function startGame() {
        if (gameState.isPlaying) return;
        
        gameState.isPlaying = true;
        gameState.currentLevel = 1;
        gameState.currentScore = 0;
        gameState.playerInput = [];
        
        updateUI();
        generateSequence();
        showSequence();
        
        disableStartButton();
    }

    function resetGame() {
        console.log('Reset button clicked');
        
        // Clear any existing timeout
        if (gameState.gameTimeout) {
            clearTimeout(gameState.gameTimeout);
            gameState.gameTimeout = null;
        }
        
        gameState.isPlaying = false;
        gameState.isShowingSequence = false;
        gameState.playerInput = [];
        
        // Reset all lights
        lights.forEach(light => {
            light.classList.remove('active');
        });
        
        statusText.textContent = 'Нажмите СТАРТ для начала игры';
        disableLights();
        enableStartButton();
        updateUI();
    }

    function disableLights() {
        lights.forEach(light => {
            light.classList.add('disabled');
        });
    }

    function enableLights() {
        lights.forEach(light => {
            light.classList.remove('disabled');
        });
    }

    function disableStartButton() {
        btnStart.disabled = true;
        btnStart.classList.add('disabled');
        btnStart.classList.remove('primary');
    }

    function enableStartButton() {
        btnStart.disabled = false;
        btnStart.classList.remove('disabled');
        btnStart.classList.add('primary');
    }

    function updateUI() {
        levelElement.textContent = gameState.currentLevel;
        sequenceLengthElement.textContent = gameState.currentLevel;
        currentScoreElement.textContent = gameState.currentScore;
        bestScoreElement.textContent = gameState.bestScore;
        maxLevelElement.textContent = gameState.maxLevel;
    }

    // Event listeners
    lights.forEach(light => {
        light.addEventListener('click', () => {
            if (light.classList.contains('disabled')) return;
            const color = light.getAttribute('data-color');
            handleLightClick(color);
        });
        
        light.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (light.classList.contains('disabled')) return;
            const color = light.getAttribute('data-color');
            handleLightClick(color);
        });
    });

    btnStart.addEventListener('click', startGame);

    btnReset.addEventListener('click', resetGame);

    // Touch events for mobile
    btnStart.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!btnStart.disabled) {
            btnStart.click();
        }
    });

    btnReset.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btnReset.click();
    });

    // Initialize
    updateUI();
    disableLights();
    enableStartButton();

    // Prevent zoom on double tap
    document.addEventListener('dblclick', (e) => {
        e.preventDefault();
    });

    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    console.log('Color Sequence game initialized');
})();