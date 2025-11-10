
/**
 * Интеграция системы генерации звуков природы в основной проект
 */

// Глобальная переменная для генератора звуков природы
let natureSoundsGenerator = null;

/**
 * Инициализация генератора звуков природы
 */
function initMelodyGenerator() {
    // Проверяем поддержку Web Audio API
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('Web Audio API не поддерживается в этом браузере');
        return;
    }

    // Инициализируем генератор звуков природы
    natureSoundsGenerator = new NatureSoundsGenerator();

    // Заменяем функцию playRandomSound в основном скрипте
    if (typeof window.playRandomSound === 'function') {
        const originalPlayRandomSound = window.playRandomSound;

        window.playRandomSound = async function() {
            try {
                // С вероятностью 70% воспроизводим звуки природы
                if (natureSoundsGenerator && Math.random() > 0.3) {
                    // Определяем тип среды в зависимости от времени суток
                    const hour = new Date().getHours();
                    let environment;

                    if (hour >= 5 && hour < 9) {
                        environment = 'morning'; // Раннее утро - звуки пробуждения природы
                    } else if (hour >= 9 && hour < 17) {
                        environment = 'forest'; // День - звуки леса
                    } else if (hour >= 17 && hour < 21) {
                        environment = 'ocean'; // Вечер - звуки океана
                    } else {
                        environment = 'rain'; // Ночь - звуки дождя
                    }

                    // Генерируем и воспроизводим звуки природы (на фоне)
                    natureSoundsGenerator.generateAndPlay({
                        environment: environment,
                        duration: 120, // 2 минуты
                        fadeInTime: 30 // 30 секунд на нарастание
                    }).catch(error => {
                        console.error('Ошибка при генерации звуков природы:', error);
                    });
                } else {
                    // В остальных случаях воспроизводим оригинальный звук
                    originalPlayRandomSound();
                }
            } catch (error) {
                console.error('Ошибка при воспроизведении:', error);
                // В случае ошибки воспроизводим оригинальный звук
                originalPlayRandomSound();
            }
        };
    }

    // Добавляем функцию для остановки звуков
    if (typeof window.stopNotification === 'function') {
        const originalStopNotification = window.stopNotification;

        window.stopNotification = function() {
            // Останавливаем генератор звуков природы
            if (natureSoundsGenerator) {
                natureSoundsGenerator.stop();
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
