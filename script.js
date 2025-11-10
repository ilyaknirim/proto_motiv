// Глобальные переменные
let alarmTimeout;
let timerInterval;
let timerSeconds;
let isPaused = false;
let alarmDays = [];
let alarmAudio;

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

    // Обработчики для ввода времени
    document.getElementById('alarm-hours').addEventListener('change', saveSettings);
    document.getElementById('alarm-minutes').addEventListener('change', saveSettings);
    document.getElementById('timer-hours').addEventListener('change', updateTimerDisplay);
    document.getElementById('timer-minutes').addEventListener('change', updateTimerDisplay);
    document.getElementById('timer-seconds').addEventListener('change', updateTimerDisplay);

    // Инициализация отображения таймера
    updateTimerDisplay();
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
    const hours = parseInt(document.getElementById('alarm-hours').value);
    const minutes = parseInt(document.getElementById('alarm-minutes').value);

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
        const hours = parseInt(document.getElementById('timer-hours').value) || 0;
        const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;

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
    const hours = parseInt(document.getElementById('timer-hours').value) || 0;
    const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
    const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;

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

// Срабатывание будильника
function triggerAlarm(type) {
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');

    notificationTitle.textContent = type === 'Будильник' ? 'Просыпайся!' : 'Время вышло!';
    notificationMessage.textContent = type === 'Будильник' ? 
        'Время для новых свершений!' : 
        'Таймер завершен!';

    // Воспроизводим случайную мелодию
    playRandomSound();

    // Показываем уведомление
    notification.classList.remove('hidden');

    // Если это будильник, устанавливаем его на следующий день
    if (type === 'Будильник') {
        setAlarm();
    }
}

// Срабатывание таймера
function triggerTimer() {
    triggerAlarm('Таймер');
    resetTimer();
}

// Воспроизведение случайного звука
function playRandomSound() {
    // Останавливаем предыдущий звук, если он есть
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio = null;
    }

    // Генерируем случайный номер файла от 1 до 200
    const randomNum = Math.floor(Math.random() * 200) + 1;
    const paddedNum = String(randomNum).padStart(3, '0');
    const audioPath = `audio/motivation_${paddedNum}.mp3`;

    // Создаем новый аудио объект
    alarmAudio = new Audio(audioPath);

    // Устанавливаем громкость и воспроизводим
    alarmAudio.volume = 0.7;
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
function stopNotification() {
    notification.classList.add('hidden');

    // Останавливаем воспроизведение звука
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio = null;
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
        timerSeconds: document.getElementById('timer-seconds').value
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

            // Обновляем отображение таймера
            updateTimerDisplay();

        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }
}