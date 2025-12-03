// Игровое состояние
const gameState = {
    money: 100,
    actionPoints: 6,
    maxActionPoints: 6,
    reconciliation: 5,
    level: 1,
    xp: 0,
    turn: 1,
    completedOperations: 0,
    solvedProblems: 0,
    activeProblems: 1,
    completedQuests: 0,
    cardsPlayed: 0,
    turnsWithoutProblems: 0,
    specialActionUsed: false,
    currentQuests: [],
    nextTurnPenalty: 0,
    currentHand: []
};

// Система уровней (увеличены требования)
const levelSystem = {
    1: { xpRequired: 150, rewards: ["+1 макс ОД", "Новые карты"] },
    2: { xpRequired: 350, rewards: ["+2 макс ОД", "Редкие карты"] },
    3: { xpRequired: 700, rewards: ["+1 слот для карт", "Эпические карты"] },
    4: { xpRequired: 1500, rewards: ["+2 макс ОД", "Легендарные карты"] },
    5: { xpRequired: 3000, rewards: ["Особая способность", "Все достижения"] }
};

// Достижения (увеличены требования)
const achievements = {
    firstQuest: { 
        name: "Первый шаг", 
        desc: "Выполните первую задачу", 
        icon: "🎯",
        unlocked: false,
        reward: { xp: 15, money: 15 }
    },
    problemSolver: { 
        name: "Решатель проблем", 
        desc: "Решите 15 проблем", 
        icon: "🔧",
        unlocked: false,
        reward: { xp: 40, money: 40 }
    },
    rich: { 
        name: "Бунчиковый магнат", 
        desc: "Накопите 1500 бунчиков", 
        icon: "💰",
        unlocked: false,
        reward: { xp: 60, money: 80 }
    },
    cardMaster: { 
        name: "Мастер карт", 
        desc: "Разыграйте 75 карт", 
        icon: "🎴",
        unlocked: false,
        reward: { xp: 80, money: 60 }
    },
    speedRunner: { 
        name: "Скоростник", 
        desc: "Завершите 8 ходов подряд без проблем", 
        icon: "⚡",
        unlocked: false,
        reward: { xp: 50, money: 50 }
    }
};

// База данных квестов (увеличены требования, уменьшены награды)
const questDatabase = [
    {
        id: 1,
        title: "Знакомство с системой",
        description: "Проведите 5 базовые операции",
        type: "operations",
        target: 5,
        xpReward: 30,
        moneyReward: 15,
        levelRequired: 1
    },
    {
        id: 2,
        title: "Первые проблемы",
        description: "Решите 2 проблемы",
        type: "problems",
        target: 2,
        xpReward: 25,
        moneyReward: 10,
        levelRequired: 1
    },
    {
        id: 3,
        title: "Начальный капитал",
        description: "Накопите 250 бунчиков",
        type: "money",
        target: 250,
        xpReward: 35,
        moneyReward: 15,
        levelRequired: 1
    },
    {
        id: 4,
        title: "Финансовый рост",
        description: "Накопите 500 бунчиков",
        type: "money",
        target: 500,
        xpReward: 50,
        moneyReward: 30,
        levelRequired: 2
    },
    {
        id: 5,
        title: "Опытный бухгалтер",
        description: "Проведите 15 операций любого типа",
        type: "operations",
        target: 15,
        xpReward: 70,
        moneyReward: 25,
        levelRequired: 2
    },
    {
        id: 6,
        title: "Мастер сверки",
        description: "Накопите 20 очков сверки",
        type: "reconciliation",
        target: 20,
        xpReward: 45,
        moneyReward: 20,
        levelRequired: 2
    },
    {
        id: 7,
        title: "Карточный игрок",
        description: "Разыграйте 10 карт",
        type: "cards",
        target: 10,
        xpReward: 40,
        moneyReward: 25,
        levelRequired: 3
    }
];

// Расширенная колода карт (24 карты!) с БАЛАНСИРОВАННЫМИ СТОИМОСТЯМИ
const cardDatabase = [
    // БАЗОВЫЕ КАРТЫ (уровень 1) - 8 карт
    {
        id: 1,
        title: "Оприходовать наличные",
        description: "+5 Бунчика",
        cost: 2, // УВЕЛИЧЕНО с 1
        type: "operation",
        rarity: "common",
        effect: () => { 
            gameState.money += 5;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("💸 Получены наличные: +5 бунчика", "success");
        }
    },
    {
        id: 2,
        title: "Базовая сверка",
        description: "+3 Сверки",
        cost: 2, // УВЕЛИЧЕНО с 1
        type: "resource",
        rarity: "common",
        effect: () => { 
            gameState.reconciliation += 3;
            gameState.cardsPlayed++;
            addNotification("📊 Проведена сверка: +3 очка сверки", "success");
        }
    },
    {
        id: 3,
        title: "Простой отчет",
        description: "+4 Опыта",
        cost: 2, // УВЕЛИЧЕНО с 1
        type: "operation",
        rarity: "common",
        effect: () => { 
            addXP(4);
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("📄 Простой отчет сдан: +4 опыта", "success");
        }
    },
    {
        id: 4,
        title: "Экономия расходов",
        description: "+4 Бунчика",
        cost: 1,
        type: "special",
        rarity: "common",
        effect: () => { 
            gameState.money += 4;
            gameState.cardsPlayed++;
            addNotification("💰 Экономия расходов: +4 бунчика", "success");
        }
    },
    {
        id: 5,
        title: "Консультация",
        description: "+3 Опыта, +2 Бунчика",
        cost: 2, // УВЕЛИЧЕНО с 1
        type: "operation",
        rarity: "common",
        effect: () => { 
            addXP(3);
            gameState.money += 2;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("💡 Консультация: +3 опыта, +2 бунчика", "success");
        }
    },
    {
        id: 6,
        title: "Проверка кассы",
        description: "+2 Бунчика, +2 Сверки",
        cost: 2, // УВЕЛИЧЕНО с 1
        type: "resource",
        rarity: "common",
        effect: () => { 
            gameState.money += 2;
            gameState.reconciliation += 2;
            gameState.cardsPlayed++;
            addNotification("🏦 Проверка кассы: +2 бунчика, +2 сверки", "success");
        }
    },
    {
        id: 7,
        title: "Учет материалов",
        description: "+3 Опыта",
        cost: 2, // УВЕЛИЧЕНО с 1
        type: "operation",
        rarity: "common",
        effect: () => { 
            addXP(3);
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("📦 Учет материалов: +3 опыта", "success");
        }
    },
    {
        id: 8,
        title: "Анализ расходов",
        description: "+2 ОД в этот ход",
        cost: 2, // УВЕЛИЧЕНО с 1
        type: "special",
        rarity: "common",
        effect: () => {
            gameState.actionPoints = Math.min(gameState.maxActionPoints, gameState.actionPoints + 2);
            gameState.cardsPlayed++;
            addNotification("📊 Анализ расходов: +2 ОД", "success");
        }
    },

    // РЕДКИЕ КАРТЫ (уровень 2) - 8 карт
    {
        id: 9,
        title: "Решить проблему",
        description: "Закрыть 1 проблему за 8 Сверки",
        cost: 4, // УВЕЛИЧЕНО с 3
        type: "problem",
        rarity: "rare",
        effect: () => {
            if (gameState.reconciliation >= 8 && gameState.activeProblems > 0) {
                gameState.reconciliation -= 8;
                gameState.activeProblems--;
                gameState.solvedProblems++;
                gameState.cardsPlayed++;
                addNotification("✅ Проблема решена!", "success");
                updateProblemSlots();
            } else {
                addNotification("❌ Недостаточно очков сверки для решения проблемы", "error");
            }
        }
    },
    {
        id: 10,
        title: "Отчет по МСФО",
        description: "+12 Опыта",
        cost: 4, // УВЕЛИЧЕНО с 3
        type: "operation",
        rarity: "rare",
        effect: () => { 
            addXP(12);
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("📈 Отчет МСФО сдан: +12 опыта", "success");
        }
    },
    {
        id: 11,
        title: "Бухгалтерский аудит",
        description: "+8 Сверки, +1 ОД",
        cost: 4, // УВЕЛИЧЕНО с 3
        type: "resource",
        rarity: "rare",
        effect: () => {
            gameState.reconciliation += 8;
            gameState.actionPoints = Math.min(gameState.maxActionPoints, gameState.actionPoints + 1);
            gameState.cardsPlayed++;
            addNotification("🔍 Аудит проведен: +8 сверки, +1 ОД", "success");
        }
    },
    {
        id: 12,
        title: "Налоговая оптимизация",
        description: "+10 Бунчиков, -5 Опыта",
        cost: 3, // УВЕЛИЧЕНО с 2
        type: "resource",
        rarity: "rare",
        effect: () => { 
            gameState.money += 10;
            gameState.cardsPlayed++;
            addXP(-5);
            addNotification("⚖️ Налоговая оптимизация: +10 бунчиков, -5 опыта", "warning");
        }
    },
    {
        id: 13,
        title: "Финансовый анализ",
        description: "+6 Опыта, +4 Бунчика",
        cost: 3, // УВЕЛИЧЕНО с 2
        type: "operation",
        rarity: "rare",
        effect: () => { 
            addXP(6);
            gameState.money += 4;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("📊 Финансовый анализ: +6 опыта, +4 бунчика", "success");
        }
    },
    {
        id: 14,
        title: "Внутренний контроль",
        description: "+6 Сверки, +3 Опыта",
        cost: 3, // УВЕЛИЧЕНО с 2
        type: "resource",
        rarity: "rare",
        effect: () => {
            gameState.reconciliation += 6;
            addXP(3);
            gameState.cardsPlayed++;
            addNotification("🛡️ Внутренний контроль: +6 сверки, +3 опыта", "success");
        }
    },
    {
        id: 15,
        title: "Бюджетирование",
        description: "+8 Бунчиков",
        cost: 3, // УВЕЛИЧЕНО с 2
        type: "operation",
        rarity: "rare",
        effect: () => { 
            gameState.money += 8;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("💰 Бюджетирование: +8 бунчиков", "success");
        }
    },
    {
        id: 16,
        title: "Ревизия",
        description: "+4 Сверки, +2 ОД",
        cost: 3, // УВЕЛИЧЕНО с 2
        type: "resource",
        rarity: "rare",
        effect: () => {
            gameState.reconciliation += 4;
            gameState.actionPoints = Math.min(gameState.maxActionPoints, gameState.actionPoints + 2);
            gameState.cardsPlayed++;
            addNotification("🔎 Ревизия: +4 сверки, +2 ОД", "success");
        }
    },

    // ЭПИЧЕСКИЕ КАРТЫ (уровень 3) - 4 карты
    {
        id: 17,
        title: "Внешний аудит",
        description: "+18 Опыта, -10 Бунчиков",
        cost: 5, // УВЕЛИЧЕНО с 4
        type: "operation",
        rarity: "epic",
        effect: () => { 
            addXP(18);
            gameState.money = Math.max(0, gameState.money - 10);
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("👥 Внешний аудит пройден: +18 опыта, -10 бунчиков", "success");
        }
    },
    {
        id: 18,
        title: "Инвестиции",
        description: "Рискнуть 30 бунчиков для прибыли",
        cost: 4, // УВЕЛИЧЕНО с 3
        type: "special",
        rarity: "epic",
        effect: () => {
            if (gameState.money >= 30) {
                gameState.money -= 30;
                gameState.cardsPlayed++;
                const success = Math.random() > 0.4;
                if (success) {
                    const profit = Math.floor(Math.random() * 40) + 25;
                    gameState.money += profit;
                    addNotification(`📈 Инвестиции успешны! Прибыль: +${profit} бунчиков`, "success");
                } else {
                    addNotification("📉 Инвестиции провалились! Деньги потеряны", "error");
                }
            } else {
                addNotification("❌ Недостаточно бунчиков для инвестиций", "error");
            }
        }
    },
    {
        id: 19,
        title: "Автоматизация",
        description: "+4 ОД в этот ход",
        cost: 3, // УВЕЛИЧЕНО с 2
        type: "special",
        rarity: "epic",
        effect: () => {
            gameState.actionPoints = Math.min(gameState.maxActionPoints, gameState.actionPoints + 4);
            gameState.cardsPlayed++;
            addNotification("🤖 Автоматизация: +4 ОД", "success");
        }
    },
    {
        id: 20,
        title: "Стратегическое планирование",
        description: "+10 Опыта, +6 Бунчиков",
        cost: 4, // УВЕЛИЧЕНО с 3
        type: "operation",
        rarity: "epic",
        effect: () => {
            addXP(10);
            gameState.money += 6;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("🎯 Стратегическое планирование: +10 опыта, +6 бунчиков", "success");
        }
    },

    // ЛЕГЕНДАРНЫЕ КАРТЫ (уровень 4) - 4 карты
    {
        id: 21,
        title: "Финансовая реформа",
        description: "+75% Бунчиков, сброс проблем",
        cost: 7, // УВЕЛИЧЕНО с 6
        type: "special",
        rarity: "legendary",
        effect: () => {
            const bonus = Math.floor(gameState.money * 0.75);
            gameState.money += bonus;
            const problemsSolved = gameState.activeProblems;
            gameState.activeProblems = 0;
            gameState.solvedProblems += problemsSolved;
            gameState.cardsPlayed++;
            addNotification(`💎 Финансовая реформа: +${bonus} бунчиков, все проблемы решены!`, "success");
            updateProblemSlots();
        }
    },
    {
        id: 22,
        title: "Опытный консультант",
        description: "+25 Опыта, +12 Сверки",
        cost: 6, // УВЕЛИЧЕНО с 5
        type: "resource",
        rarity: "legendary",
        effect: () => {
            addXP(25);
            gameState.reconciliation += 12;
            gameState.cardsPlayed++;
            addNotification("🎓 Консультант: +25 опыта, +12 сверки", "success");
        }
    },
    {
        id: 23,
        title: "Корпоративная отчетность",
        description: "+30 Опыта",
        cost: 6, // УВЕЛИЧЕНО с 5
        type: "operation",
        rarity: "legendary",
        effect: () => {
            addXP(30);
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("🏢 Корпоративная отчетность: +30 опыта", "success");
        }
    },
    {
        id: 24,
        title: "Международные стандарты",
        description: "+20 Опыта, +15 Сверки",
        cost: 5, // УВЕЛИЧЕНО с 4
        type: "operation",
        rarity: "legendary",
        effect: () => {
            addXP(20);
            gameState.reconciliation += 15;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("🌍 Международные стандарты: +20 опыта, +15 сверки", "success");
        }
    }
];

// Проблемы
const problems = [
    { 
        name: "Кассовый разрыв", 
        effect: "-3 Бунчика/ход",
        description: "Нехватка наличных средств в кассе предприятия",
        penalty: () => { gameState.money = Math.max(0, gameState.money - 3); }
    },
    { 
        name: "Несогласованный счет", 
        effect: "-5 Опыта/ход",
        description: "Счет требует подтверждения от контрагента",
        penalty: () => { addXP(-5); }
    },
    { 
        name: "Просроченный платеж", 
        effect: "-10 Бунчиков",
        description: "Задолженность по обязательным платежам",
        penalty: () => { gameState.money = Math.max(0, gameState.money - 10); }
    }
];

// Инициализация игры
function initGame() {
    checkMobile();
    generateNewQuests();
    generateNewHand();
    updateUI();
    setupEventListeners();
    renderAchievements();
    updateProblemSlots();
    
    addNotification("🎮 Добро пожаловать в Accounting!", "success");
    addNotification("💰 Теперь валюта - Бунчики!", "info");
    
    // Показываем обучение при первом запуске
    if (!localStorage.getItem('tutorial_shown')) {
        showTutorial();
        localStorage.setItem('tutorial_shown', 'true');
    }
}

// Генерация новой руки (12 карт!)
function generateNewHand() {
    const availableCards = cardDatabase.filter(card => {
        switch (card.rarity) {
            case 'common': return true;
            case 'rare': return gameState.level >= 2;
            case 'epic': return gameState.level >= 3;
            case 'legendary': return gameState.level >= 4;
            default: return false;
        }
    });
    
    // Перемешиваем карты
    const shuffledCards = [...availableCards].sort(() => Math.random() - 0.5);
    
    // Берем 12 карт для руки
    gameState.currentHand = shuffledCards.slice(0, 12);
    
    renderHand();
}

// Рендер руки игрока
function renderHand() {
    const hand = document.getElementById('playerHand');
    if (!hand) return;
    
    hand.innerHTML = '';
    
    gameState.currentHand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.rarity}`;
        cardElement.innerHTML = `
            <div class="card-cost">${card.cost} ОД</div>
            <div class="card-title">${card.title}</div>
            <div class="card-description">${card.description}</div>
        `;
        
        cardElement.addEventListener('click', () => playCard(card, index));
        
        hand.appendChild(cardElement);
    });
}

// Генерация новых квестов
function generateNewQuests() {
    gameState.currentQuests = [];
    const availableQuests = questDatabase.filter(quest => quest.levelRequired <= gameState.level);
    
    // Выбираем 3 случайных квеста
    for (let i = 0; i < Math.min(3, availableQuests.length); i++) {
        const randomIndex = Math.floor(Math.random() * availableQuests.length);
        const quest = availableQuests[randomIndex];
        if (!gameState.currentQuests.find(q => q.id === quest.id)) {
            gameState.currentQuests.push(quest);
            availableQuests.splice(randomIndex, 1);
        }
    }
    
    renderQuests();
}

// Рендер квестов
function renderQuests() {
    const questsList = document.getElementById('questsList');
    if (!questsList) return;
    
    questsList.innerHTML = '';
    
    gameState.currentQuests.forEach(quest => {
        const progress = getQuestProgress(quest);
        const percent = Math.min((progress / quest.target) * 100, 100);
        
        const questElement = document.createElement('div');
        questElement.className = 'quest-item';
        questElement.innerHTML = `
            <div class="quest-header">
                <div class="quest-title">${quest.title}</div>
                <div class="quest-reward">${quest.xpReward} XP</div>
            </div>
            <div class="quest-description">${quest.description}</div>
            <div class="quest-progress-bar">
                <div class="quest-progress-fill" style="width: ${percent}%"></div>
            </div>
            <div class="quest-progress-text">${progress}/${quest.target}</div>
        `;
        
        questElement.onclick = () => showQuestInfo(quest);
        questsList.appendChild(questElement);
    });
}

// Получение прогресса по квесту
function getQuestProgress(quest) {
    switch (quest.type) {
        case 'operations': return gameState.completedOperations;
        case 'problems': return gameState.solvedProblems;
        case 'money': return gameState.money;
        case 'reconciliation': return gameState.reconciliation;
        case 'cards': return gameState.cardsPlayed;
        default: return 0;
    }
}

// Проверка выполнения квестов
function checkQuests() {
    let questsCompleted = false;
    
    gameState.currentQuests.forEach((quest, index) => {
        const progress = getQuestProgress(quest);
        if (progress >= quest.target) {
            // Награда за выполнение
            addXP(quest.xpReward);
            gameState.money += quest.moneyReward;
            gameState.completedQuests++;
            questsCompleted = true;
            
            addNotification(`🎉 Задача "${quest.title}" выполнена! +${quest.xpReward} XP, +${quest.moneyReward} бунчиков`, "success");
            
            // Удаляем выполненный квест и добавляем новый
            gameState.currentQuests.splice(index, 1);
            generateNewQuests();
            
            // Проверяем достижения
            checkAchievements();
        }
    });
    
    return questsCompleted;
}

// Добавление опыта
function addXP(amount) {
    const oldLevel = gameState.level;
    
    gameState.xp += amount;
    if (gameState.xp < 0) gameState.xp = 0;
    
    const nextLevelXP = levelSystem[gameState.level]?.xpRequired || 9999;
    
    // Проверяем повышение уровня
    while (gameState.xp >= nextLevelXP && gameState.level < 5) {
        gameState.level++;
        gameState.xp -= nextLevelXP;
        
        // Применяем бонусы уровня
        applyLevelBonuses(gameState.level);
        
        addNotification(`🎊 Уровень повышен! Теперь вы уровень ${gameState.level}`, "success");
        
        // Разблокируем новые карты
        generateNewHand();
    }
    
    updateLevelUI();
    
    // Анимация изменения XP
    if (amount > 0) {
        addNotification(`📈 +${amount} опыта`, "success");
    } else if (amount < 0) {
        addNotification(`📉 ${amount} опыта`, "error");
    }
}

// Применение бонусов уровня
function applyLevelBonuses(level) {
    switch(level) {
        case 2:
            gameState.maxActionPoints += 2;
            addNotification("🎁 Бонус уровня: +2 максимальных ОД", "info");
            break;
        case 3:
            addNotification("🎁 Бонус уровня: открыты эпические карты", "info");
            break;
        case 4:
            gameState.maxActionPoints += 2;
            addNotification("🎁 Бонус уровня: +2 максимальных ОД", "info");
            break;
        case 5:
            gameState.maxActionPoints += 2;
            addNotification("🎁 Бонус уровня: +2 максимальных ОД", "info");
            break;
    }
}

// Обновление интерфейса уровня
function updateLevelUI() {
    document.getElementById('currentLevel').textContent = gameState.level;
    document.getElementById('currentXP').textContent = gameState.xp;
    
    const nextLevelXP = levelSystem[gameState.level]?.xpRequired || 9999;
    document.getElementById('nextLevelXP').textContent = nextLevelXP;
    
    const progressPercent = (gameState.xp / nextLevelXP) * 100;
    document.getElementById('levelFill').style.width = `${progressPercent}%`;
}

// Рендер достижений
function renderAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    if (!achievementsList) return;
    
    achievementsList.innerHTML = '';
    
    Object.entries(achievements).forEach(([key, achievement]) => {
        const achievementElement = document.createElement('div');
        achievementElement.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
        achievementElement.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.unlocked ? achievement.name : '???'}</div>
                <div class="achievement-desc">${achievement.unlocked ? achievement.desc : 'Разблокируйте чтобы узнать'}</div>
            </div>
        `;
        
        achievementElement.onclick = () => showAchievementInfo(key);
        achievementsList.appendChild(achievementElement);
    });
    
    // Обновляем счетчик достижений
    const unlockedCount = Object.values(achievements).filter(a => a.unlocked).length;
    document.getElementById('unlockedAchievements').textContent = unlockedCount;
}

// Проверка достижений
function checkAchievements() {
    let newAchievements = false;

    // Первый квест
    if (gameState.completedQuests >= 1 && !achievements.firstQuest.unlocked) {
        achievements.firstQuest.unlocked = true;
        unlockAchievement('firstQuest');
        newAchievements = true;
    }
    
    // Решатель проблем
    if (gameState.solvedProblems >= 15 && !achievements.problemSolver.unlocked) {
        achievements.problemSolver.unlocked = true;
        unlockAchievement('problemSolver');
        newAchievements = true;
    }
    
    // Бунчиковый магнат
    if (gameState.money >= 1500 && !achievements.rich.unlocked) {
        achievements.rich.unlocked = true;
        unlockAchievement('rich');
        newAchievements = true;
    }
    
    // Мастер карт
    if (gameState.cardsPlayed >= 75 && !achievements.cardMaster.unlocked) {
        achievements.cardMaster.unlocked = true;
        unlockAchievement('cardMaster');
        newAchievements = true;
    }
    
    // Скоростник
    if (gameState.turnsWithoutProblems >= 8 && !achievements.speedRunner.unlocked) {
        achievements.speedRunner.unlocked = true;
        unlockAchievement('speedRunner');
        newAchievements = true;
    }

    if (newAchievements) {
        renderAchievements();
    }
}

// Разблокировка достижения
function unlockAchievement(achievementKey) {
    const achievement = achievements[achievementKey];
    const reward = achievement.reward;
    
    addXP(reward.xp);
    gameState.money += reward.money;
    
    addNotification(`🏆 Достижение разблокировано: ${achievement.name}! +${reward.xp} XP, +${reward.money} бунчиков`, "success");
}

// Розыгрыш карты
function playCard(card, cardIndex) {
    if (gameState.actionPoints < card.cost) {
        addNotification(`❌ Недостаточно очков действий! Нужно: ${card.cost}`, "error");
        return;
    }

    gameState.actionPoints -= card.cost;
    
    // Удаляем карту из руки
    gameState.currentHand.splice(cardIndex, 1);
    
    // Применяем эффект карты
    card.effect();
    
    // Перерисовываем руку
    renderHand();
    updateUI();
    checkQuests();
}

// Функция для создания уведомлений с изображениями
function addNotificationWithImage(message, type = 'info', imageName = null) {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type} ${imageName ? 'with-image' : ''}`;
    
    if (imageName) {
        notification.innerHTML = `
            <img src="images/${imageName}.jpg" alt="${message}" class="notification-image" onerror="this.style.display='none'">
            <div class="notification-content">${message}</div>
        `;
    } else {
        notification.textContent = message;
    }
    
    notification.onclick = () => notification.remove();
    
    panel.appendChild(notification);
    
    // Автоудаление через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Исследование офиса
function exploreOffice() {
    if (gameState.actionPoints < 2) {
        addNotification("❌ Недостаточно очков действий", "error");
        return;
    }

    gameState.actionPoints -= 2;
    
    const events = [
        {
            probability: 0.4,
            effect: () => {
                const foundMoney = Math.floor(Math.random() * 15) + 5;
                gameState.money += foundMoney;
                addNotificationWithImage(`🕵️ Вы нашли потерянные документы! +${foundMoney} бунчиков`, "success", "office1");
            }
        },
        {
            probability: 0.3,
            effect: () => {
                const foundXP = Math.floor(Math.random() * 10) + 3;
                addXP(foundXP);
                addNotificationWithImage(`📚 Изучили новые методики! +${foundXP} опыта`, "success", "office2");
            }
        },
        {
            probability: 0.2,
            effect: () => {
                gameState.reconciliation += 3;
                addNotificationWithImage(`🔍 Нашли неучтенные сверки! +3 сверки`, "success", "office3");
            }
        },
        {
            probability: 0.1,
            effect: () => {
                gameState.activeProblems++;
                addNotificationWithImage(`⚠️ Обнаружена скрытая проблема!`, "warning", "office4");
                updateProblemSlots();
            }
        }
    ];

    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const event of events) {
        cumulativeProbability += event.probability;
        if (random <= cumulativeProbability) {
            event.effect();
            break;
        }
    }
    
    updateUI();
}

// Разговор с директором
function talkToBoss() {
    if (gameState.actionPoints < 1) {
        addNotification("❌ Недостаточно очков действий", "error");
        return;
    }

    gameState.actionPoints -= 1;
    
    const outcomes = [
        {
            message: "👔 Директор доволен вашей работой!",
            effect: () => {
                const repGain = Math.floor(Math.random() * 5) + 3;
                addXP(repGain);
            },
            image: "dir1"
        },
        {
            message: "👔 Директор дает ценный совет!",
            effect: () => {
                gameState.actionPoints = Math.min(gameState.maxActionPoints, gameState.actionPoints + 1);
            },
            image: "dir2"
        },
        {
            message: "👔 Директор делится контактами!",
            effect: () => {
                gameState.reconciliation += 2;
            },
            image: "dir3"
        },
        {
            message: "👔 Директор повышает зарплату!",
            effect: () => {
                const bonus = Math.floor(Math.random() * 20) + 10;
                gameState.money += bonus;
            },
            image: "dir4"
        },
        {
            message: "👔 Директор рекомендует курс повышения квалификации!",
            effect: () => {
                const xpBonus = Math.floor(Math.random() * 8) + 5;
                addXP(xpBonus);
            },
            image: "dir5"
        }
    ];

    const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    randomOutcome.effect();
    
    // Используем новую функцию с изображением
    addNotificationWithImage(randomOutcome.message, "success", randomOutcome.image);
    
    updateUI();
}

// Специальное действие
function useSpecialAction() {
    if (gameState.actionPoints < 3) {
        addNotification("❌ Недостаточно очков действий", "error");
        return;
    }

    if (gameState.specialActionUsed) {
        addNotification("❌ Спец-действие можно использовать только раз за ход", "error");
        return;
    }

    gameState.actionPoints -= 3;
    gameState.specialActionUsed = true;

    const actions = [
        () => {
            gameState.money += 30;
            addNotificationWithImage("✨ Спец-действие: Экспресс-доход +30 бунчиков", "success", "special1");
        },
        () => {
            gameState.reconciliation += 8;
            addNotificationWithImage("✨ Спец-действие: Сверх-сверка +8 сверки", "success", "special2");
        },
        () => {
            addXP(25);
            addNotificationWithImage("✨ Спец-действие: Опытный совет +25 XP", "success", "special3");
        },
        () => {
            gameState.activeProblems = Math.max(0, gameState.activeProblems - 1);
            addNotificationWithImage("✨ Спец-действие: Быстрое решение проблемы", "success", "special4");
            updateProblemSlots();
        }
    ];
    
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    randomAction();
    updateUI();
}

// Завершение хода
function endTurn() {
    gameState.turn++;
    
    // Восстанавливаем ОД
    gameState.actionPoints = gameState.maxActionPoints;
    gameState.specialActionUsed = false;

    // Генерируем новую руку
    generateNewHand();

    // Применяем штрафы проблем
    let hadProblems = false;
    for (let i = 0; i < gameState.activeProblems; i++) {
        const problem = problems[i % problems.length];
        problem.penalty();
        hadProblems = true;
        
        if (i === 0) {
            addNotification(`⚠️ ${problem.name}: ${problem.effect}`, "error");
        }
    }

    // Обновляем счетчик ходов без проблем
    if (hadProblems) {
        gameState.turnsWithoutProblems = 0;
    } else {
        gameState.turnsWithoutProblems++;
        if (gameState.turnsWithoutProblems > 0) {
            addNotification(`⚡ ${gameState.turnsWithoutProblems} ход без проблем!`, "success");
        }
    }

    // Добавление случайных проблем
    if (Math.random() > 0.7 && gameState.activeProblems < 2) {
        gameState.activeProblems++;
        const randomProblem = problems[Math.floor(Math.random() * problems.length)];
        addNotification(`⚠️ Новая проблема: ${randomProblem.name}`, "warning");
    }

    updateProblemSlots();
    updateUI();
    checkQuests();
    addNotification(`🔄 Ход ${gameState.turn} начат! Новая рука сгенерирована`, "success");
}

// Обновление слотов проблем
function updateProblemSlots() {
    const slots = ['slot1', 'slot2'];
    
    slots.forEach((slotId, index) => {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        if (index < gameState.activeProblems) {
            slot.className = 'problem-slot';
            const problem = problems[index % problems.length];
            slot.innerHTML = `
                <div class="problem-icon">⚠️</div>
                <div class="problem-info">
                    <div class="problem-title">${problem.name}</div>
                    <div class="problem-effect">${problem.effect}</div>
                </div>
            `;
            
            slot.onclick = () => showProblemInfo(problem);
        } else {
            slot.className = 'problem-slot empty';
            slot.innerHTML = `
                <div class="problem-icon">📊</div>
                <div class="problem-info">
                    <div class="problem-title">Нет проблем</div>
                </div>
            `;
            slot.onclick = null;
        }
    });
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('moneyValue').textContent = gameState.money;
    document.getElementById('apValue').textContent = `${gameState.actionPoints}/${gameState.maxActionPoints}`;
    document.getElementById('reconciliationValue').textContent = gameState.reconciliation;
    document.getElementById('levelValue').textContent = gameState.level;
    document.getElementById('turnValue').textContent = gameState.turn;
    
    // Обновляем статистику
    document.getElementById('statOperations').textContent = gameState.completedOperations;
    document.getElementById('statProblems').textContent = gameState.solvedProblems;
    document.getElementById('statCards').textContent = gameState.cardsPlayed;
    document.getElementById('statQuests').textContent = gameState.completedQuests;
}

// Переключение вкладок
function switchTab(tabName) {
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Добавляем активный класс текущей кнопке
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Показываем нужную вкладку
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// Показ информации о квесте
function showQuestInfo(quest) {
    const progress = getQuestProgress(quest);
    const percent = Math.min((progress / quest.target) * 100, 100);
    
    showModal(quest.title, `
        <p><strong>Описание:</strong> ${quest.description}</p>
        <p><strong>Прогресс:</strong> ${progress}/${quest.target}</p>
        <div class="quest-progress-bar">
            <div class="quest-progress-fill" style="width: ${percent}%"></div>
        </div>
        <p><strong>Награда:</strong></p>
        <ul>
            <li>${quest.xpReward} опыта</li>
            <li>${quest.moneyReward} бунчиков</li>
        </ul>
    `);
}

// Показ информации о достижении
function showAchievementInfo(achievementKey) {
    const achievement = achievements[achievementKey];
    showModal(achievement.unlocked ? achievement.name : "???", `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div style="font-size: 2rem;">${achievement.icon}</div>
            <div>
                <div style="font-weight: bold; font-size: 1.1rem;">${achievement.unlocked ? achievement.name : 'Секретное достижение'}</div>
                <div style="color: var(--text-muted);">${achievement.unlocked ? achievement.desc : 'Разблокируйте чтобы узнать'}</div>
            </div>
        </div>
        ${achievement.unlocked ? 
            `<p style="color: var(--accent-green); margin: 10px 0;">✅ Достижение разблокировано!</p>
             <p><strong>Награда:</strong> ${achievement.reward.xp} XP, ${achievement.reward.money} бунчиков</p>` : 
            '<p style="color: var(--text-muted);">🔒 Скрытое достижение</p>'
        }
    `);
}

// Показ информации о проблеме
function showProblemInfo(problem) {
    showModal(problem.name, `
        <p><strong>Эффект:</strong> ${problem.effect}</p>
        <p><strong>Описание:</strong> ${problem.description}</p>
        <p><em>Для решения проблемы используйте карту "Решить проблему" или наберите достаточно очков сверки.</em></p>
    `);
}

// Информация о ресурсах
function showResourceInfo(resource) {
    const info = {
        money: "💸 <strong>Бунчики</strong><br>Основной ресурс для проведения операций и оплаты расходов.",
        ap: "⚡ <strong>Очки Действий</strong><br>Тратятся на розыгрыш карт и специальные действия. Восстанавливаются каждый ход.",
        reconciliation: "📊 <strong>Сверка</strong><br>Специальный ресурс для решения проблем и устранения несоответствий.",
        level: "⭐ <strong>Уровень</strong><br>Повышается за получение опыта. Открывает новые карты и возможности."
    };
    
    showModal('Информация о ресурсе', info[resource] || "Информация о ресурсе недоступна.");
}

// Проверка мобильного устройства
function checkMobile() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        document.body.classList.add('mobile');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    window.addEventListener('resize', checkMobile);
    
    // Закрытие модального окна
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') {
            closeModal();
        }
    });
}

// Модальные окна
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// Добавление уведомления
function addNotification(message, type = 'info') {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.onclick = () => notification.remove();
    
    panel.appendChild(notification);
    
    // Автоудаление через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Обучение
let currentTutorialStep = 1;

function showTutorial() {
    document.getElementById('tutorialOverlay').style.display = 'flex';
    updateTutorialStep();
}

function nextTutorialStep() {
    if (currentTutorialStep < 3) {
        currentTutorialStep++;
        updateTutorialStep();
    } else {
        skipTutorial();
    }
}

function previousTutorialStep() {
    if (currentTutorialStep > 1) {
        currentTutorialStep--;
        updateTutorialStep();
    }
}

function updateTutorialStep() {
    document.querySelectorAll('.tutorial-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step${currentTutorialStep}`).classList.add('active');
    document.getElementById('tutorialProgress').textContent = `${currentTutorialStep}/3`;
}

function skipTutorial() {
    document.getElementById('tutorialOverlay').style.display = 'none';
    currentTutorialStep = 1;
}

// Сохранение игры
function saveGame() {
    const saveData = {
        state: gameState,
        achievements: achievements,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem('accounting_save', JSON.stringify(saveData));
        addNotification("💾 Игра сохранена!", "success");
    } catch (e) {
        addNotification("❌ Ошибка сохранения: " + e.message, "error");
    }
}

function loadGame() {
    const saveData = localStorage.getItem('accounting_save');
    if (saveData) {
        try {
            const data = JSON.parse(saveData);
            
            // Восстанавливаем состояние игры
            Object.keys(gameState).forEach(key => {
                if (data.state[key] !== undefined) {
                    gameState[key] = data.state[key];
                }
            });
            
            // Восстанавливаем достижения
            Object.keys(achievements).forEach(key => {
                if (data.achievements[key]) {
                    achievements[key].unlocked = data.achievements[key].unlocked;
                }
            });
            
            // Обновляем интерфейс
            updateUI();
            updateLevelUI();
            updateProblemSlots();
            renderHand();
            renderQuests();
            renderAchievements();
            
            addNotification("🔄 Игра загружена!", "success");
        } catch (e) {
            console.error("Ошибка загрузки:", e);
            addNotification("❌ Ошибка загрузки сохранения", "error");
        }
    } else {
        addNotification("❌ Сохранение не найдено", "error");
    }
}

function resetGame() {
    if (confirm("Вы уверены, что хотите начать новую игру? Все прогресс будет потерян.")) {
        localStorage.removeItem('accounting_save');
        localStorage.removeItem('tutorial_shown');
        location.reload();
    }
}

// Запуск игры
window.onload = initGame;