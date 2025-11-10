/**
 * Интеграция системы генерации мелодий и голосовых уведомлений в основной проект
 */

// Глобальные переменные
let melodyGenerator = null;
let voiceNotifications = null;

// Текущие настройки звука
let soundSettings = {
    type: 'melody', // 'melody', 'voice', 'both'
    melodyVolume: 0.7,
    voiceVolume: 0.7
};

/**
 * Инициализация системы звуков
 */
function initSoundSystem() {
    // Проверяем поддержку Web Audio API
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('Web Audio API не поддерживается в этом браузере');
        return;
    }

    // Инициализируем генератор мелодий
    melodyGenerator = new MelodyGenerator();

    // Инициализируем голосовые уведомления
    voiceNotifications = new VoiceNotifications();

    // Добавляем обработчики для новых элементов управления
    initSoundControls();

    // Заменяем функцию playRandomSound в основном скрипте
    if (typeof window.playRandomSound === 'function') {
        const originalPlayRandomSound = window.playRandomSound;

        window.playRandomSound = async function(type) {
            try {
                // Определяем тип звука
                const soundType = type || soundSettings.type;

                // Определяем настроение в зависимости от времени суток
                const hour = new Date().getHours();
                let mood;
                let voiceMessage;

                if (hour >= 6 && hour < 12) {
                    mood = 'happy'; // Утро - бодрое настроение
                    voiceMessage = 'Доброе утро! Время для новых свершений!';
                } else if (hour >= 12 && hour < 18) {
                    mood = 'energetic'; // День - энергичное настроение
                    voiceMessage = 'Время пришло! Продолжай двигаться к цели!';
                } else {
                    mood = 'calm'; // Вечер и ночь - спокойное настроение
                    voiceMessage = 'Пора отдохнуть и набраться сил для нового дня!';
                }

                // Устанавливаем громкость
                if (melodyGenerator) {
                    melodyGenerator.setVolume(soundSettings.melodyVolume);
                }

                if (voiceNotifications) {
                    voiceNotifications.setVolume(soundSettings.voiceVolume);
                }

                // Воспроизводим звук в зависимости от типа
                if (soundType === 'melody') {
                    if (melodyGenerator) {
                        await melodyGenerator.generateAndPlay({
                            mood: mood,
                            duration: 30, // 30 секунд
                            tempo: 80 + Math.random() * 40 // 80-120 BPM
                        });
                    } else {
                        originalPlayRandomSound();
                    }
                } else if (soundType === 'voice') {
                    if (voiceNotifications) {
                        await voiceNotifications.speak(voiceMessage);
                    } else {
                        originalPlayRandomSound();
                    }
                } else if (soundType === 'both') {
                    // Запускаем одновременно мелодию и голос
                    const promises = [];

                    if (melodyGenerator) {
                        promises.push(melodyGenerator.generateAndPlay({
                            mood: mood,
                            duration: 30,
                            tempo: 80 + Math.random() * 40
                        }));
                    }

                    if (voiceNotifications) {
                        // Небольшая задержка перед голосом, чтобы мелодия началась первой
                        setTimeout(async () => {
                            try {
                                await voiceNotifications.speak(voiceMessage);
                            } catch (error) {
                                console.error('Ошибка при воспроизведении голоса:', error);
                            }
                        }, 2000);
                    }

                    if (promises.length === 0) {
                        originalPlayRandomSound();
                    } else {
                        await Promise.all(promises);
                    }
                }
            } catch (error) {
                console.error('Ошибка при воспроизведении звука:', error);
                // В случае ошибки воспроизводим оригинальный звук
                originalPlayRandomSound();
            }
        };
    }

    // Добавляем функцию для остановки звука
    if (typeof window.stopNotification === 'function') {
        const originalStopNotification = window.stopNotification;

        window.stopNotification = function() {
            // Останавливаем генератор мелодий
            if (melodyGenerator) {
                melodyGenerator.stop();
            }

            // Останавливаем голосовые уведомления
            if (voiceNotifications) {
                voiceNotifications.stop();
            }

            // Вызываем оригинальную функцию
            originalStopNotification();
        };
    }
}

/**
 * Инициализация элементов управления звуком
 */
function initSoundControls() {
    // Обработчики для типа звука
    const soundTypeRadios = document.querySelectorAll('input[name="sound-type"]');
    soundTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            soundSettings.type = e.target.value;
            saveSoundSettings();
        });
    });

    // Обработчики для громкости мелодии
    const melodyVolumeSlider = document.getElementById('melody-volume');
    const melodyVolumeValue = document.getElementById('melody-volume-value');

    if (melodyVolumeSlider) {
        melodyVolumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            soundSettings.melodyVolume = volume;
            melodyVolumeValue.textContent = `${e.target.value}%`;

            if (melodyGenerator) {
                melodyGenerator.setVolume(volume);
            }

            saveSoundSettings();
        });
    }

    // Обработчики для громкости голоса
    const voiceVolumeSlider = document.getElementById('voice-volume');
    const voiceVolumeValue = document.getElementById('voice-volume-value');

    if (voiceVolumeSlider) {
        voiceVolumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            soundSettings.voiceVolume = volume;
            voiceVolumeValue.textContent = `${e.target.value}%`;

            if (voiceNotifications) {
                voiceNotifications.setVolume(volume);
            }

            saveSoundSettings();
        });
    }

    // Загружаем сохраненные настройки
    loadSoundSettings();
}

/**
 * Сохранение настроек звука в localStorage
 */
function saveSoundSettings() {
    localStorage.setItem('soundSettings', JSON.stringify(soundSettings));
}

/**
 * Загрузка настроек звука из localStorage
 */
function loadSoundSettings() {
    const saved = localStorage.getItem('soundSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            soundSettings = { ...soundSettings, ...settings };

            // Обновляем интерфейс
            const soundTypeRadio = document.querySelector(`input[name="sound-type"][value="${soundSettings.type}"]`);
            if (soundTypeRadio) {
                soundTypeRadio.checked = true;
            }

            const melodyVolumeSlider = document.getElementById('melody-volume');
            const melodyVolumeValue = document.getElementById('melody-volume-value');
            if (melodyVolumeSlider && melodyVolumeValue) {
                const melodyVolumePercent = Math.round(soundSettings.melodyVolume * 100);
                melodyVolumeSlider.value = melodyVolumePercent;
                melodyVolumeValue.textContent = `${melodyVolumePercent}%`;
            }

            const voiceVolumeSlider = document.getElementById('voice-volume');
            const voiceVolumeValue = document.getElementById('voice-volume-value');
            if (voiceVolumeSlider && voiceVolumeValue) {
                const voiceVolumePercent = Math.round(soundSettings.voiceVolume * 100);
                voiceVolumeSlider.value = voiceVolumePercent;
                voiceVolumeValue.textContent = `${voiceVolumePercent}%`;
            }

            // Применяем громкость к текущим объектам
            if (melodyGenerator) {
                melodyGenerator.setVolume(soundSettings.melodyVolume);
            }

            if (voiceNotifications) {
                voiceNotifications.setVolume(soundSettings.voiceVolume);
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек звука:', error);
        }
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Задержка для загрузки всех скриптов
    setTimeout(initSoundSystem, 100);
});
