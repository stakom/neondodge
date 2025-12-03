// menu.js
document.addEventListener('DOMContentLoaded', function() {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Проверяем, является ли устройство сенсорным
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            if (isTouchDevice) {
                e.preventDefault();
                
                // Добавляем класс анимации
                this.classList.add('animate');
                
                // Сохраняем ссылку для перехода
                const href = this.getAttribute('href');
                
                // Ждем завершения анимации и переходим
                setTimeout(() => {
                    window.location.href = href;
                }, 400); // Время анимации + небольшая задержка
            }
            // На десктопах переход происходит сразу (стандартное поведение)
        });
        
        // Убираем класс анимации после её завершения
        card.addEventListener('animationend', function() {
            this.classList.remove('animate');
        });
    });
});