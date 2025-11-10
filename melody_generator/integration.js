
/**
 * Интеграция системы генерации мелодий в основной проект
 */

// Глобальная переменная для генератора мелодий
let melodyGenerator = null;

/**
 * Инициализация генератора мелодий
 */
function initMelodyGenerator() {
    // Проверяем поддержку Web Audio API
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('Web Audio API не поддерживается в этом браузере');
        return;
    }

    // Инициализируем генератор мелодий
    melodyGenerator = new MelodyGenerator();

    // Заменяем функцию playRandomSound в основном скрипте
    if (typeof window.playRandomSound === 'function') {
        const originalPlayRandomSound = window.playRandomSound;

        window.playRandomSound = async function() {
            try {
                // С вероятностью 70% генерируем новую мелодию, 
                // в остальных случаях воспроизводим оригинальный звук
                if (Math.random() < 0.7 && melodyGenerator) {
                    // Определяем настроение в зависимости от времени суток
                    const hour = new Date().getHours();
                    let mood;

                    if (hour >= 6 && hour < 12) {
                        mood = 'happy'; // Утро - бодрое настроение
                    } else if (hour >= 12 && hour < 18) {
                        mood = 'energetic'; // День - энергичное настроение
                    } else {
                        mood = 'calm'; // Вечер и ночь - спокойное настроение
                    }

                    // Генерируем и воспроизводим мелодию
                    await melodyGenerator.generateAndPlay({
                        mood: mood,
                        duration: 30, // 30 секунд
                        tempo: 80 + Math.random() * 40 // 80-120 BPM
                    });
                } else {
                    // Воспроизводим оригинальный звук
                    originalPlayRandomSound();
                }
            } catch (error) {
                console.error('Ошибка при генерации мелодии:', error);
                // В случае ошибки воспроизводим оригинальный звук
                originalPlayRandomSound();
            }
        };
    }

    // Добавляем функцию для остановки мелодии
    if (typeof window.stopNotification === 'function') {
        const originalStopNotification = window.stopNotification;

        window.stopNotification = function() {
            // Останавливаем генератор мелодий
            if (melodyGenerator) {
                melodyGenerator.stop();
            }

            // Вызываем оригинальную функцию
            originalStopNotification();
        };
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Задержка для загрузки всех скриптов
    setTimeout(initMelodyGenerator, 100);
});
