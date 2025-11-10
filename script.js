// Глобальные переменные
let alarmTimeout;
let timerInterval;
let timerSeconds;
let isPaused = false;
let alarmDays = [];
let alarmAudio;
let scrollEndTimer;

// Настройки звука для будильника и таймера
let alarmSoundSettings = {
    type: 'melody', // 'melody', 'voice', 'both'
    melodyVolume: 0.7,
    voiceVolume: 0.7
};

let timerSoundSettings = {
    type: 'melody', // 'melody', 'voice', 'both'
    melodyVolume: 0.7,
    voiceVolume: 0.7
};

// DOM элементы для настроек звука таймера
const timerSoundTypeRadios = document.querySelectorAll('input[name="timer-sound-type"]');
const timerMelodyVolumeSlider = document.getElementById('timer-melody-volume');
const timerMelodyVolumeValue = document.getElementById('timer-melody-volume-value');
const timerVoiceVolumeSlider = document.getElementById('timer-voice-volume');
const timerVoiceVolumeValue = document.getElementById('timer-voice-volume-value');

// DOM элементы
const alarmTab = document.getElementById('alarm-tab');
const timerTab = document.getElementById('timer-tab');
const alarmPanel = document.getElementById('alarm-panel');
const timerPanel = document.getElementById('timer-panel');
const setAlarmBtn = document.getElementById('set-alarm');
const cancelAlarmBtn = document.getElementById('cancel-alarm');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const notification = document.getElementById('notification');
const stopNotificationBtn = document.getElementById('stop-notification');
const alarmStatusText = document.getElementById('alarm-status-text');
const timerStatusText = document.getElementById('timer-status-text');
const currentTimeDiv = document.getElementById('current-time');
const timerDisplay = document.getElementById('timer-display');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Загрузка сохраненных настроек
    loadSettings();

    // Обработчики событий
    alarmTab.addEventListener('click', () => switchTab('alarm'));
    timerTab.addEventListener('click', () => switchTab('timer'));

    setAlarmBtn.addEventListener('click', setAlarm);
    cancelAlarmBtn.addEventListener('click', cancelAlarm);

    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);

    stopNotificationBtn.addEventListener('click', stopNotification);

    // Обработчики для дней недели
    document.querySelectorAll('.day-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const day = parseInt(checkbox.value);
            if (checkbox.checked) {
                if (!alarmDays.includes(day)) {
                    alarmDays.push(day);
                }
            } else {
                alarmDays = alarmDays.filter(d => d !== day);
            }
            saveSettings();
        });
    });

    // Инициализация колес выбора времени
    initTimePicker('hours-wheel');
    initTimePicker('minutes-wheel');
    initTimePicker('timer-hours-wheel');
    initTimePicker('timer-minutes-wheel');
    initTimePicker('timer-seconds-wheel');

    // Установка начальных позиций для колес
    scrollToSelected('hours-wheel');
    scrollToSelected('minutes-wheel');
    scrollToSelected('timer-hours-wheel');
    scrollToSelected('timer-minutes-wheel');
    scrollToSelected('timer-seconds-wheel');

    // Инициализация отображения таймера
    updateTimerDisplay();

    // Инициализация обработчиков настроек звука
    initSoundControls();
});

// Переключение вкладок
function switchTab(tab) {
    if (tab === 'alarm') {
        alarmTab.classList.add('active');
        timerTab.classList.remove('active');
        alarmPanel.classList.add('active');
        timerPanel.classList.remove('active');
    } else {
        timerTab.classList.add('active');
        alarmTab.classList.remove('active');
        timerPanel.classList.add('active');
        alarmPanel.classList.remove('active');
    }
}

// Обновление текущего времени
function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    currentTimeDiv.textContent = `Текущее время: ${hours}:${minutes}:${seconds}`;
}

// Установка будильника
function setAlarm() {
    const hours = getSelectedTimeValue('hours-wheel');
    const minutes = getSelectedTimeValue('minutes-wheel');

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        alarmStatusText.textContent = 'Пожалуйста, введите корректное время';
        alarmStatusText.style.color = 'var(--error-color)';
        return;
    }

    // Если не выбраны дни недели, используем текущий день
    if (alarmDays.length === 0) {
        const currentDay = new Date().getDay();
        alarmDays.push(currentDay);
        document.querySelector(`.day-checkbox input[value="${currentDay}"]`).checked = true;
    }

    cancelAlarm(); // Отменяем предыдущий будильник, если он был установлен

    const now = new Date();
    let alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);

    // Если время будильника уже прошло сегодня, устанавливаем на завтра
    if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
    }

    // Находим следующий день недели, когда должен сработать будильник
    let daysUntilAlarm = 0;
    let foundDay = false;

    for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        const dayOfWeek = checkDate.getDay();

        if (alarmDays.includes(dayOfWeek)) {
            // Если это сегодня и время еще не прошло
            if (i === 0 && alarmTime > now) {
                daysUntilAlarm = 0;
                foundDay = true;
                break;
            }
            // Если это завтра или любой другой день
            else if (i > 0) {
                daysUntilAlarm = i;
                alarmTime = new Date(now);
                alarmTime.setDate(now.getDate() + daysUntilAlarm);
                alarmTime.setHours(hours, minutes, 0, 0);
                foundDay = true;
                break;
            }
        }
    }

    if (!foundDay) {
        alarmStatusText.textContent = 'Будильник не может быть установлен на выбранные дни';
        alarmStatusText.style.color = 'var(--error-color)';
        return;
    }

    const timeUntilAlarm = alarmTime.getTime() - now.getTime();

    alarmTimeout = setTimeout(() => {
        triggerAlarm('Будильник');
    }, timeUntilAlarm);

    // Обновляем статус
    const alarmTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const daysStr = alarmDays.length === 7 ? 'каждый день' : 
                  alarmDays.length === 0 ? 'сегодня' :
                  alarmDays.map(day => {
                      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                      return dayNames[day];
                  }).join(', ');

    alarmStatusText.textContent = `Будильник установлен на ${alarmTimeStr}, ${daysStr}`;
    alarmStatusText.style.color = 'var(--success-color)';

    // Сохраняем настройки
    saveSettings();
}

// Отмена будильника
function cancelAlarm() {
    if (alarmTimeout) {
        clearTimeout(alarmTimeout);
        alarmTimeout = null;
    }

    alarmStatusText.textContent = 'Будильник не установлен';
    alarmStatusText.style.color = 'var(--text-secondary)';

    // Сохраняем настройки
    saveSettings();
}

// Запуск таймера
function startTimer() {
    if (isPaused && timerSeconds > 0) {
        // Продолжаем таймер с паузы
        isPaused = false;
    } else {
        // Запускаем новый таймер
        const hours = getSelectedTimeValue('timer-hours-wheel') || 0;
        const minutes = getSelectedTimeValue('timer-minutes-wheel') || 0;
        const seconds = getSelectedTimeValue('timer-seconds-wheel') || 0;

        timerSeconds = hours * 3600 + minutes * 60 + seconds;

        if (timerSeconds <= 0) {
            timerStatusText.textContent = 'Пожалуйста, установите время таймера';
            timerStatusText.style.color = 'var(--error-color)';
            return;
        }
    }

    // Обновляем статус
    timerStatusText.textContent = 'Таймер запущен';
    timerStatusText.style.color = 'var(--success-color)';

    // Запускаем интервал
    timerInterval = setInterval(() => {
        timerSeconds--;

        // Обновляем отображение
        updateTimerDisplayFromSeconds();

        // Проверяем, не истекло ли время
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            triggerTimer();
        }
    }, 1000);
}

// Пауза таймера
function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;

        timerStatusText.textContent = 'Таймер на паузе';
        timerStatusText.style.color = 'var(--warning-color)';
    }
}

// Сброс таймера
function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isPaused = false;
    updateTimerDisplay();

    timerStatusText.textContent = 'Таймер не запущен';
    timerStatusText.style.color = 'var(--text-secondary)';
}

// Обновление отображения таймера
function updateTimerDisplay() {
    const hours = getSelectedTimeValue('timer-hours-wheel') || 0;
    const minutes = getSelectedTimeValue('timer-minutes-wheel') || 0;
    const seconds = getSelectedTimeValue('timer-seconds-wheel') || 0;

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');

    timerDisplay.textContent = `${h}:${m}:${s}`;
}

// Обновление отображения таймера из секунд
function updateTimerDisplayFromSeconds() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');

    timerDisplay.textContent = `${h}:${m}:${s}`;
}

// Инициализация колеса выбора времени
function initTimePicker(wheelId) {
    const wheel = document.getElementById(wheelId);
    let isScrolling = false;
    let startY = 0;
    let startScrollTop = 0;

    // Обработчик клика на элемент
    wheel.addEventListener('click', (e) => {
        if (e.target.classList.contains('time-picker-item')) {
            selectTimeItem(wheelId, e.target);
        }
    });

    // Обработчики для прокрутки
    wheel.addEventListener('scroll', () => {
        if (!isScrolling) {
            // Определяем ближайший к центру элемент при остановке прокрутки
            window.clearTimeout(scrollEndTimer);
            scrollEndTimer = window.setTimeout(() => {
                snapToClosest(wheelId);
            }, 100);
        }
    });

    // Обработчики для свайпа на мобильных устройствах
    wheel.addEventListener('touchstart', (e) => {
        isScrolling = true;
        startY = e.touches[0].clientY;
        startScrollTop = wheel.scrollTop;
    }, { passive: true });

    wheel.addEventListener('touchmove', (e) => {
        if (!isScrolling) return;

        const y = e.touches[0].clientY;
        const walk = (startY - y) * 2;
        wheel.scrollTop = startScrollTop + walk;
    }, { passive: true });

    wheel.addEventListener('touchend', () => {
        isScrolling = false;
        snapToClosest(wheelId);
    });
}

// Выбор элемента времени
function selectTimeItem(wheelId, item) {
    // Удаляем класс selected у всех элементов
    const wheel = document.getElementById(wheelId);
    const items = wheel.querySelectorAll('.time-picker-item');
    items.forEach(el => el.classList.remove('selected'));

    // Добавляем класс selected выбранному элементу
    item.classList.add('selected');

    // Прокручиваем к выбранному элементу
    scrollToItem(wheelId, item);

    // Обновляем отображение таймера, если это таймер
    if (wheelId.includes('timer')) {
        updateTimerDisplay();
    }

    // Сохраняем настройки, если это будильник
    if (wheelId === 'hours-wheel' || wheelId === 'minutes-wheel') {
        saveSettings();
    }
}

// Прокрутка к выбранному элементу
function scrollToItem(wheelId, item) {
    const wheel = document.getElementById(wheelId);
    const wheelRect = wheel.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    // Вычисляем позицию для центрирования элемента
    const itemCenter = itemRect.top + itemRect.height / 2;
    const wheelCenter = wheelRect.top + wheelRect.height / 2;
    const scrollTop = wheel.scrollTop + (itemCenter - wheelCenter);

    wheel.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
    });
}

// Прокрутка к выбранному элементу при инициализации
function scrollToSelected(wheelId) {
    const wheel = document.getElementById(wheelId);
    const selectedItem = wheel.querySelector('.time-picker-item.selected');

    if (selectedItem) {
        // Центрируем выбранный элемент
        const itemHeight = selectedItem.offsetHeight;
        const wheelHeight = wheel.offsetHeight;
        const itemsCount = wheel.querySelectorAll('.time-picker-item').length;
        const selectedIndex = Array.from(wheel.querySelectorAll('.time-picker-item')).indexOf(selectedItem);

        // Вычисляем позицию прокрутки
        const scrollTop = selectedIndex * itemHeight - (wheelHeight / 2) + (itemHeight / 2);

        wheel.scrollTop = scrollTop;
    }
}

// Привязка к ближайшему элементу при остановке прокрутки
function snapToClosest(wheelId) {
    const wheel = document.getElementById(wheelId);
    const itemHeight = wheel.querySelector('.time-picker-item').offsetHeight;
    const scrollTop = wheel.scrollTop;
    const center = scrollTop + wheel.offsetHeight / 2;

    // Находим ближайший к центру элемент
    const items = wheel.querySelectorAll('.time-picker-item');
    let closestItem = null;
    let closestDistance = Infinity;

    items.forEach(item => {
        const itemTop = item.offsetTop;
        const itemCenter = itemTop + itemHeight / 2;
        const distance = Math.abs(center - itemCenter);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });

    if (closestItem) {
        selectTimeItem(wheelId, closestItem);
    }
}

// Получение выбранного значения времени
function getSelectedTimeValue(wheelId) {
    const wheel = document.getElementById(wheelId);
    const selectedItem = wheel.querySelector('.time-picker-item.selected');

    if (selectedItem) {
        return parseInt(selectedItem.dataset.value);
    }

    return 0;
}

// Срабатывание будильника
function triggerAlarm(type) {
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');

    notificationTitle.textContent = type === 'Будильник' ? 'Просыпайся!' : 'Время вышло!';
    notificationMessage.textContent = type === 'Будильник' ?
        'Время для новых свершений!' :
        'Таймер завершен!';

    // Воспроизводим звук в зависимости от типа
    if (type === 'Будильник') {
        playRandomSound(alarmSoundSettings.type);
    } else {
        playRandomSound(timerSoundSettings.type);
    }

    // Показываем уведомление
    notification.classList.remove('hidden');

    // Если это будильник, устанавливаем его на следующий день
    if (type === 'Будильник') {
        setAlarm();
    }
}

// Срабатывание таймера
function triggerTimer() {
    // Используем настройки звука для таймера
    playRandomSound(timerSoundSettings.type);
    resetTimer();
}

// Воспроизведение случайного звука
window.playRandomSound = function playRandomSound(soundType) {
    // Останавливаем предыдущий звук, если он есть
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio = null;
    }

    // Определяем настройки звука в зависимости от типа
    let settings;
    if (soundType === 'alarm') {
        settings = alarmSoundSettings;
    } else if (soundType === 'timer') {
        settings = timerSoundSettings;
    } else {
        // По умолчанию используем настройки будильника
        settings = alarmSoundSettings;
    }

    // Генерируем случайный номер файла от 1 до 200
    const randomNum = Math.floor(Math.random() * 200) + 1;
    const paddedNum = String(randomNum).padStart(3, '0');
    const audioPath = `audio/motivation_${paddedNum}.mp3`;

    // Создаем новый аудио объект
    alarmAudio = new Audio(audioPath);

    // Устанавливаем громкость в зависимости от типа звука
    if (settings.type === 'melody') {
        alarmAudio.volume = settings.melodyVolume;
    } else if (settings.type === 'voice') {
        alarmAudio.volume = settings.voiceVolume;
    } else if (settings.type === 'both') {
        // Для 'both' используем среднее значение
        alarmAudio.volume = (settings.melodyVolume + settings.voiceVolume) / 2;
    } else {
        alarmAudio.volume = 0.7; // Значение по умолчанию
    }

    // Воспроизводим
    alarmAudio.play().catch(error => {
        console.error('Ошибка воспроизведения аудио:', error);
    });

    // Зацикливаем воспроизведение
    alarmAudio.addEventListener('ended', () => {
        if (alarmAudio) {
            alarmAudio.currentTime = 0;
            alarmAudio.play().catch(error => {
                console.error('Ошибка повторного воспроизведения аудио:', error);
            });
        }
    });
}

// Остановка уведомления
window.stopNotification = function stopNotification() {
    notification.classList.add('hidden');

    // Останавливаем воспроизведение звука
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio = null;
    }
}

// Инициализация обработчиков настроек звука
function initSoundControls() {
    // Обработчики для типа звука таймера
    timerSoundTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            timerSoundSettings.type = e.target.value;
            saveSettings();
        });
    });

    // Обработчики для громкости мелодии таймера
    if (timerMelodyVolumeSlider) {
        timerMelodyVolumeSlider.addEventListener('input', (e) => {
            timerSoundSettings.melodyVolume = e.target.value / 100;
            timerMelodyVolumeValue.textContent = `${e.target.value}%`;
            saveSettings();
        });
    }

    // Обработчики для громкости голоса таймера
    if (timerVoiceVolumeSlider) {
        timerVoiceVolumeSlider.addEventListener('input', (e) => {
            timerSoundSettings.voiceVolume = e.target.value / 100;
            timerVoiceVolumeValue.textContent = `${e.target.value}%`;
            saveSettings();
        });
    }
}

// Сохранение настроек в localStorage
function saveSettings() {
    const settings = {
        alarmHours: document.getElementById('alarm-hours').value,
        alarmMinutes: document.getElementById('alarm-minutes').value,
        alarmDays: alarmDays,
        timerHours: document.getElementById('timer-hours').value,
        timerMinutes: document.getElementById('timer-minutes').value,
        timerSeconds: document.getElementById('timer-seconds').value,
        timerSoundSettings: timerSoundSettings
    };

    localStorage.setItem('alarmTimerSettings', JSON.stringify(settings));
}

// Загрузка настроек из localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('alarmTimerSettings');

    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);

            // Загружаем настройки будильника
            if (settings.alarmHours !== undefined) {
                document.getElementById('alarm-hours').value = settings.alarmHours;
            }
            if (settings.alarmMinutes !== undefined) {
                document.getElementById('alarm-minutes').value = settings.alarmMinutes;
            }
            if (settings.alarmDays !== undefined) {
                alarmDays = settings.alarmDays;
                // Обновляем чекбоксы дней недели
                document.querySelectorAll('.day-checkbox input').forEach(checkbox => {
                    const day = parseInt(checkbox.value);
                    checkbox.checked = alarmDays.includes(day);
                });
            }

            // Загружаем настройки таймера
            if (settings.timerHours !== undefined) {
                document.getElementById('timer-hours').value = settings.timerHours;
            }
            if (settings.timerMinutes !== undefined) {
                document.getElementById('timer-minutes').value = settings.timerMinutes;
            }
            if (settings.timerSeconds !== undefined) {
                document.getElementById('timer-seconds').value = settings.timerSeconds;
            }

            // Загружаем настройки звука таймера
            if (settings.timerSoundSettings !== undefined) {
                timerSoundSettings = { ...timerSoundSettings, ...settings.timerSoundSettings };

                // Обновляем интерфейс настроек звука таймера
                const timerSoundTypeRadio = document.querySelector(`input[name="timer-sound-type"][value="${timerSoundSettings.type}"]`);
                if (timerSoundTypeRadio) {
                    timerSoundTypeRadio.checked = true;
                }

                if (timerMelodyVolumeSlider) {
                    const melodyVolumePercent = Math.round(timerSoundSettings.melodyVolume * 100);
                    timerMelodyVolumeSlider.value = melodyVolumePercent;
                    timerMelodyVolumeValue.textContent = `${melodyVolumePercent}%`;
                }

                if (timerVoiceVolumeSlider) {
                    const voiceVolumePercent = Math.round(timerSoundSettings.voiceVolume * 100);
                    timerVoiceVolumeSlider.value = voiceVolumePercent;
                    timerVoiceVolumeValue.textContent = `${voiceVolumePercent}%`;
                }
            }

            // Обновляем отображение таймера
            updateTimerDisplay();

        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }
}
