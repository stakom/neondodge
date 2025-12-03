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
                
                // Для Финансового алхимика - специальный эффект
                if (this.querySelector('.alchemist-icon')) {
                    const icon = this.querySelector('.alchemist-icon');
                    icon.style.animation = 'coinFlip 0.6s ease';
                    setTimeout(() => {
                        icon.style.animation = '';
                    }, 600);
                }
                
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
        
        // Специальный эффект для иконки Финансового алхимика при наведении
        const alchemistIcon = card.querySelector('.alchemist-icon');
        if (alchemistIcon) {
            card.addEventListener('mouseenter', function() {
                alchemistIcon.style.transform = 'scale(1.1) rotate(5deg)';
            });
            
            card.addEventListener('mouseleave', function() {
                alchemistIcon.style.transform = 'scale(1) rotate(0deg)';
            });
        }
    });
    
    // Добавляем эффект монетки для иконки алхимика
    const alchemistCards = document.querySelectorAll('.game-card .alchemist-icon');
    alchemistCards.forEach(icon => {
        // Создаем CSS для анимации переворота монетки
        if (!document.querySelector('#coinFlipAnimation')) {
            const style = document.createElement('style');
            style.id = 'coinFlipAnimation';
            style.textContent = `
                @keyframes coinFlip {
                    0% { transform: rotateY(0) scale(1); }
                    50% { transform: rotateY(180deg) scale(1.2); }
                    100% { transform: rotateY(360deg) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    });
});