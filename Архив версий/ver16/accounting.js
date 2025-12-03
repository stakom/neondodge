// Игровое состояние
const gameState = {
    money: 150,
    actionPoints: 5,
    maxActionPoints: 5,
    reconciliation: 8,
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
    currentQuests: []
};

// Система уровней
const levelSystem = {
    1: { xpRequired: 100, rewards: ["+1 макс ОД", "Новые карты"] },
    2: { xpRequired: 250, rewards: ["+2 макс ОД", "Редкие карты"] },
    3: { xpRequired: 500, rewards: ["+1 слот для карт", "Эпические карты"] },
    4: { xpRequired: 1000, rewards: ["+3 макс ОД", "Легендарные карты"] },
    5: { xpRequired: 2000, rewards: ["Особая способность", "Все достижения"] }
};

// Достижения
const achievements = {
    firstQuest: { 
        name: "Первый шаг", 
        desc: "Выполните первую задачу", 
        icon: "🎯",
        unlocked: false,
        reward: { xp: 25, money: 25 }
    },
    problemSolver: { 
        name: "Решатель проблем", 
        desc: "Решите 10 проблем", 
        icon: "🔧",
        unlocked: false,
        reward: { xp: 50, money: 50 }
    },
    rich: { 
        name: "Бунчиковый магнат", 
        desc: "Накопите 1000 бунчиков", 
        icon: "💰",
        unlocked: false,
        reward: { xp: 75, money: 100 }
    },
    cardMaster: { 
        name: "Мастер карт", 
        desc: "Разыграйте 50 карт", 
        icon: "🎴",
        unlocked: false,
        reward: { xp: 100, money: 75 }
    },
    speedRunner: { 
        name: "Скоростник", 
        desc: "Завершите 5 ходов подряд без проблем", 
        icon: "⚡",
        unlocked: false,
        reward: { xp: 60, money: 60 }
    }
};

// База данных квестов
const questDatabase = [
    {
        id: 1,
        title: "Знакомство с системой",
        description: "Проведите 3 базовые операции",
        type: "operations",
        target: 3,
        xpReward: 50,
        moneyReward: 25,
        levelRequired: 1
    },
    {
        id: 2,
        title: "Первые проблемы",
        description: "Решите 1 проблему",
        type: "problems",
        target: 1,
        xpReward: 30,
        moneyReward: 15,
        levelRequired: 1
    },
    {
        id: 3,
        title: "Начальный капитал",
        description: "Накопите 200 бунчиков",
        type: "money",
        target: 200,
        xpReward: 40,
        moneyReward: 20,
        levelRequired: 1
    },
    {
        id: 4,
        title: "Финансовый рост",
        description: "Накопите 300 бунчиков",
        type: "money",
        target: 300,
        xpReward: 75,
        moneyReward: 50,
        levelRequired: 2
    },
    {
        id: 5,
        title: "Опытный бухгалтер",
        description: "Проведите 10 операций любого типа",
        type: "operations",
        target: 10,
        xpReward: 100,
        moneyReward: 40,
        levelRequired: 2
    }
];

// Расширенная колода карт
const cardDatabase = [
    {
        id: 1,
        title: "Оприходовать наличные",
        description: "+8 Бунчиков",
        cost: 2,
        type: "operation",
        rarity: "common",
        effect: () => { 
            gameState.money += 8;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("💸 Получены наличные: +8 бунчиков", "success");
        }
    },
    {
        id: 2,
        title: "Сверка с контрагентом",
        description: "+4 Сверки",
        cost: 3,
        type: "resource",
        rarity: "common",
        effect: () => { 
            gameState.reconciliation += 4;
            gameState.cardsPlayed++;
            addNotification("📊 Проведена сверка: +4 очка сверки", "success");
        }
    },
    {
        id: 3,
        title: "Налоговая оптимизация",
        description: "+12 Бунчиков, -10 Опыта",
        cost: 1,
        type: "resource",
        rarity: "common",
        effect: () => { 
            gameState.money += 12;
            gameState.cardsPlayed++;
            addXP(-10);
            addNotification("⚖️ Налоговая оптимизация: +12 бунчиков, -10 опыта", "warning");
        }
    },
    {
        id: 4,
        title: "Базовый отчет",
        description: "+5 Опыта",
        cost: 2,
        type: "operation",
        rarity: "common",
        effect: () => { 
            addXP(5);
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("📄 Базовый отчет сдан: +5 опыта", "success");
        }
    },
    {
        id: 5,
        title: "Решить проблему",
        description: "Закрыть 1 проблему за 4 Сверки",
        cost: 2,
        type: "problem",
        rarity: "rare",
        effect: () => {
            if (gameState.reconciliation >= 4 && gameState.activeProblems > 0) {
                gameState.reconciliation -= 4;
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
        id: 6,
        title: "Отчет по МСФО",
        description: "+15 Опыта",
        cost: 4,
        type: "operation",
        rarity: "rare",
        effect: () => { 
            addXP(15);
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("📈 Отчет сдан: +15 опыта", "success");
        }
    },
    {
        id: 7,
        title: "Бухгалтерский аудит",
        description: "+8 Сверки, +3 ОД",
        cost: 3,
        type: "resource",
        rarity: "rare",
        effect: () => {
            gameState.reconciliation += 8;
            gameState.actionPoints = Math.min(gameState.maxActionPoints, gameState.actionPoints + 3);
            gameState.cardsPlayed++;
            addNotification("🔍 Аудит проведен: +8 сверки, +3 ОД", "success");
        }
    },
    {
        id: 8,
        title: "Внешний аудит",
        description: "+20 Опыта, -5 Бунчиков",
        cost: 3,
        type: "operation",
        rarity: "epic",
        effect: () => { 
            addXP(20);
            gameState.money -= 5;
            gameState.completedOperations++;
            gameState.cardsPlayed++;
            addNotification("👥 Аудит пройден: +20 опыта, -5 бунчиков", "success");
        }
    },
    {
        id: 9,
        title: "Инвестиции",
        description: "Рискнуть 20 бунчиков для возможной прибыли",
        cost: 2,
        type: "special",
        rarity: "epic",
        effect: () => {
            if (gameState.money >= 20) {
                gameState.money -= 20;
                gameState.cardsPlayed++;
                const success = Math.random() > 0.3;
                if (success) {
                    const profit = Math.floor(Math.random() * 50) + 30;
                    gameState.money += profit;
                    addNotification(`📈 Инвестиции успешны! Прибыль: +${profit} бунчиков`, "success");
                } else {
                    addNotification("📉 Инвестиции провалились! Деньги потеряны", "error");
                }
            } else {
                addNotification("❌ Недостаточно бунчиков для инвестиций", "error");
            }
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
    renderHand();
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
        renderHand();
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
            gameState.maxActionPoints += 3;
            addNotification("🎁 Бонус уровня: +3 максимальных ОД", "info");
            break;
        case 5:
            addNotification("🎁 Бонус уровня: вы достигли максимума!", "info");
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

// Рендер руки игрока с учетом уровня
function renderHand() {
    const hand = document.getElementById('playerHand');
    if (!hand) return;
    
    hand.innerHTML = '';
    
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
    
    // Берем только 5 карт для руки
    const handCards = shuffledCards.slice(0, 5);
    
    handCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.rarity}`;
        cardElement.innerHTML = `
            <div class="card-cost">${card.cost} ОД</div>
            <div class="card-title">${card.title}</div>
            <div class="card-description">${card.description}</div>
        `;
        
        cardElement.addEventListener('click', () => playCard(card));
        
        hand.appendChild(cardElement);
    });
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
    if (gameState.solvedProblems >= 10 && !achievements.problemSolver.unlocked) {
        achievements.problemSolver.unlocked = true;
        unlockAchievement('problemSolver');
        newAchievements = true;
    }
    
    // Бунчиковый магнат
    if (gameState.money >= 1000 && !achievements.rich.unlocked) {
        achievements.rich.unlocked = true;
        unlockAchievement('rich');
        newAchievements = true;
    }
    
    // Мастер карт
    if (gameState.cardsPlayed >= 50 && !achievements.cardMaster.unlocked) {
        achievements.cardMaster.unlocked = true;
        unlockAchievement('cardMaster');
        newAchievements = true;
    }
    
    // Скоростник
    if (gameState.turnsWithoutProblems >= 5 && !achievements.speedRunner.unlocked) {
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
function playCard(card) {
    if (gameState.actionPoints < card.cost) {
        addNotification(`❌ Недостаточно очков действий! Нужно: ${card.cost}`, "error");
        return;
    }

    gameState.actionPoints -= card.cost;
    card.effect();
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
                const foundMoney = Math.floor(Math.random() * 20) + 10;
                gameState.money += foundMoney;
                addNotificationWithImage(`🕵️ Вы нашли потерянные документы! +${foundMoney} бунчиков`, "success", "office1");
            }
        },
        {
            probability: 0.3,
            effect: () => {
                const foundXP = Math.floor(Math.random() * 15) + 5;
                addXP(foundXP);
                addNotificationWithImage(`📚 Изучили новые методики! +${foundXP} опыта`, "success", "office2");
            }
        },
        {
            probability: 0.2,
            effect: () => {
                gameState.reconciliation += 5;
                addNotificationWithImage(`🔍 Нашли неучтенные сверки! +5 сверки`, "success", "office3");
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
                const repGain = Math.floor(Math.random() * 8) + 5;
                addXP(repGain);
            },
            image: "dir1"
        },
        {
            message: "👔 Директор дает ценный совет!",
            effect: () => {
                gameState.actionPoints = Math.min(gameState.maxActionPoints, gameState.actionPoints + 2);
            },
            image: "dir2"
        },
        {
            message: "👔 Директор делится контактами!",
            effect: () => {
                gameState.reconciliation += 3;
            },
            image: "dir3"
        },
        {
            message: "👔 Директор повышает зарплату!",
            effect: () => {
                const bonus = Math.floor(Math.random() * 30) + 20;
                gameState.money += bonus;
            },
            image: "dir4"
        },
        {
            message: "👔 Директор рекомендует курс повышения квалификации!",
            effect: () => {
                const xpBonus = Math.floor(Math.random() * 15) + 10;
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
            gameState.money += 50;
            addNotificationWithImage("✨ Спец-действие: Экспресс-доход +50 бунчиков", "success", "special1");
        },
        () => {
            gameState.reconciliation += 12;
            addNotificationWithImage("✨ Спец-действие: Сверх-сверка +12 сверки", "success", "special2");
        },
        () => {
            addXP(40);
            addNotificationWithImage("✨ Спец-действие: Опытный совет +40 XP", "success", "special3");
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
    gameState.actionPoints = gameState.maxActionPoints;
    gameState.specialActionUsed = false;

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

    // Перерисовываем руку каждые 3 хода
    if (gameState.turn % 3 === 0) {
        renderHand();
        addNotification("🔄 Рука обновлена!", "info");
    }

    updateProblemSlots();
    updateUI();
    checkQuests();
    addNotification(`🔄 Ход ${gameState.turn} начат! ОД восстановлены`, "success");
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
    localStorage.setItem('accounting_save', JSON.stringify(saveData));
    addNotification("💾 Игра сохранена!", "success");
}

function loadGame() {
    const saveData = localStorage.getItem('accounting_save');
    if (saveData) {
        try {
            const data = JSON.parse(saveData);
            Object.assign(gameState, data.state);
            Object.assign(achievements, data.achievements);
            
            updateUI();
            updateLevelUI();
            updateProblemSlots();
            renderHand();
            renderQuests();
            renderAchievements();
            
            addNotification("🔄 Игра загружена!", "success");
        } catch (e) {
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