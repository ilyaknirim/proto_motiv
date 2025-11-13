
/**
 * Интеграция системы генерации мелодий в основной проект
 */

// Глобальные переменные для генераторов
let natureSoundsGenerator = null;
let melodyGenerator = null;

/**
 * Инициализация генераторов мелодий
 */
async function initMelodyGenerator() {
    // Проверяем поддержку Web Audio API
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('Web Audio API не поддерживается в этом браузере');
        return;
    }

    try {
        // Импортируем новый генератор мелодий
        const { MelodyGenerator } = await import('./melody_generator_new.js');
        melodyGenerator = new MelodyGenerator();
    } catch (error) {
        console.warn('Не удалось загрузить новый генератор мелодий, используем старый:', error);
        // Fallback к старому генератору - импортируем из основного скрипта
        if (typeof window.NatureSoundsGenerator !== 'undefined') {
            natureSoundsGenerator = new window.NatureSoundsGenerator();
        } else {
            console.error('NatureSoundsGenerator не найден');
        }
    }

    // Заменяем функцию playRandomSound в основном скрипте
    if (typeof window.playRandomSound === 'function') {
        const originalPlayRandomSound = window.playRandomSound;

        window.playRandomSound = async function() {
            try {
                // Приоритет новому генератору мелодий
                if (melodyGenerator) {
                    // Генерируем спокойную мелодию для пробуждения
                    await melodyGenerator.generateAndPlay({
                        mood: 'calm',
                        duration: 180, // 3 минуты
                        fadeInTime: 60 // 1 минута на нарастание
                    });
                } else if (natureSoundsGenerator && Math.random() > 0.3) {
                    // Fallback к звукам природы
                    const hour = new Date().getHours();
                    let environment;

                    if (hour >= 5 && hour < 9) {
                        environment = 'morning';
                    } else if (hour >= 9 && hour < 17) {
                        environment = 'forest';
                    } else if (hour >= 17 && hour < 21) {
                        environment = 'ocean';
                    } else {
                        environment = 'rain';
                    }

                    await natureSoundsGenerator.generateAndPlay({
                        environment: environment,
                        duration: 120,
                        fadeInTime: 30
                    });
                } else {
                    // Оригинальный звук
                    originalPlayRandomSound();
                }
            } catch (error) {
                console.error('Ошибка при воспроизведении:', error);
                originalPlayRandomSound();
            }
        };
    }

    // Добавляем функцию для остановки звуков
    if (typeof window.stopNotification === 'function') {
        const originalStopNotification = window.stopNotification;

        window.stopNotification = function() {
            // Останавливаем генераторы
            if (melodyGenerator) {
                melodyGenerator.stop();
            }
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
