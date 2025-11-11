
// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  // Глобальные переменные
  let alarms = JSON.parse(localStorage.getItem('motiv_alarms') || '[]');
  let timers = JSON.parse(localStorage.getItem('motiv_timers') || '[]');
  let activeTimers = new Map();
  let currentAlarmId = null;
  let currentTimerId = null;

  // Элементы интерфейса
  const alarmsTab = document.getElementById('alarmsTab');
  const timersTab = document.getElementById('timersTab');
  const settingsTab = document.getElementById('settingsTab');
  const alarmsSection = document.getElementById('alarmsSection');
  const timersSection = document.getElementById('timersSection');
  const settingsSection = document.getElementById('settingsSection');
  const alarmsList = document.getElementById('alarmsList');
  const timersList = document.getElementById('timersList');
  const addAlarmBtn = document.getElementById('addAlarmBtn');
  const addTimerBtn = document.getElementById('addTimerBtn');
  const alarmModal = document.getElementById('alarmModal');
  const timerModal = document.getElementById('timerModal');
  const closeAlarmModal = document.getElementById('closeAlarmModal');
  const closeTimerModal = document.getElementById('closeTimerModal');
  const saveAlarmBtn = document.getElementById('saveAlarmBtn');
  const saveTimerBtn = document.getElementById('saveTimerBtn');
  const deleteAlarmBtn = document.getElementById('deleteAlarmBtn');
  const deleteTimerBtn = document.getElementById('deleteTimerBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const fadeInTime = document.getElementById('fadeInTime');
  const melodyType = document.getElementById('melodyType');
  const snoozeDuration = document.getElementById('snoozeDuration');
  const maxSnoozeCount = document.getElementById('maxSnoozeCount');
  const previewMelodyBtn = document.getElementById('previewMelodyBtn');
  const stopMelodyBtn = document.getElementById('stopMelodyBtn');
  const currentStreak = document.getElementById('currentStreak');
  const weekSuccess = document.getElementById('weekSuccess');
  const statsChart = document.getElementById('statsChart');

  // Инициализация генератора мелодий
  let melodyGenerator = null;
  let natureSoundsGenerator = null;

  // Функция для инициализации генератора мелодий
  async function initMelodyGenerator() {
    try {
      // Проверяем поддержку Web Audio API
      if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('Web Audio API не поддерживается в этом браузере');
        return;
      }

      // Импортируем новый генератор мелодий
      const { MelodyGenerator } = await import('./melody_generator/melody_generator_new.js');
      melodyGenerator = new MelodyGenerator();
    } catch (error) {
      console.warn('Не удалось загрузить новый генератор мелодий:', error);
      // Fallback к старому генератору
      try {
        const { NatureSoundsGenerator } = await import('./melody_generator/nature_sounds_generator.js');
        natureSoundsGenerator = new NatureSoundsGenerator();
      } catch (e) {
        console.error('Не удалось загрузить генераторы звуков:', e);
      }
    }
  }

  // Функция для отображения уведомлений
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    }, 3000);
  }

  // Функция для сохранения будильников в localStorage
  function saveAlarms() {
    localStorage.setItem('motiv_alarms', JSON.stringify(alarms));
  }

  // Функция для сохранения таймеров в localStorage
  function saveTimers() {
    localStorage.setItem('motiv_timers', JSON.stringify(timers));
  }

  // Функция для отображения будильников
  function renderAlarms() {
    alarmsList.innerHTML = '';

    if (alarms.length === 0) {
      alarmsList.innerHTML = '<div class="empty-state">Нет будильников</div>';
      return;
    }

    alarms.forEach(alarm => {
      const alarmItem = document.createElement('div');
      alarmItem.className = 'item-card';
      alarmItem.dataset.id = alarm.id;

      const time = alarm.time.split(':');
      const hours = time[0];
      const minutes = time[1];

      const repeatText = alarm.repeat && alarm.repeat.length > 0 
        ? `Повтор: ${formatRepeatDays(alarm.repeat)}` 
        : 'Без повторения';

      alarmItem.innerHTML = `
        <div class="item-left">
          <div class="item-time">${hours}:${minutes}</div>
          <div class="item-details">
            <div class="item-label">${alarm.label}</div>
            <div class="item-subtitle">${repeatText}</div>
          </div>
        </div>
        <div class="item-right">
          <label class="switch">
            <input type="checkbox" class="alarm-toggle" ${alarm.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `;

      // Добавляем обработчик клика на элемент будильника
      alarmItem.addEventListener('click', (e) => {
        // Если клик не по переключателю, открываем модальное окно
        if (!e.target.classList.contains('alarm-toggle')) {
          openAlarmModal(alarm.id);
        }
      });

      // Добавляем обработчик для переключателя
      const toggle = alarmItem.querySelector('.alarm-toggle');
      toggle.addEventListener('change', (e) => {
        alarm.enabled = e.target.checked;
        saveAlarms();

        if (alarm.enabled) {
          scheduleAlarm(alarm);
          showToast(`Будильник "${alarm.label}" включен`, 'success');
        } else {
          cancelAlarm(alarm.id);
          showToast(`Будильник "${alarm.label}" выключен`, 'info');
        }
      });

      alarmsList.appendChild(alarmItem);
    });
  }

  // Функция для форматирования дней повторения
  function formatRepeatDays(days) {
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return days.map(day => dayNames[day - 1]).join(', ');
  }

  // Функция для отображения таймеров
  function renderTimers() {
    timersList.innerHTML = '';

    if (timers.length === 0) {
      timersList.innerHTML = '<div class="empty-state">Нет таймеров</div>';
      return;
    }

    timers.forEach(timer => {
      const timerItem = document.createElement('div');
      timerItem.className = 'item-card';
      timerItem.dataset.id = timer.id;

      const totalSeconds = timer.duration;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      timerItem.innerHTML = `
        <div class="item-left">
          <div class="item-time">${timeString}</div>
          <div class="item-details">
            <div class="item-label">${timer.label}</div>
            <div class="item-subtitle">Тип мелодии: ${getMelodyTypeName(timer.melodyType)}</div>
          </div>
        </div>
        <div class="item-right">
          <button class="action-button primary timer-start">▶</button>
          <button class="action-button secondary timer-delete">🗑</button>
        </div>
      `;

      // Добавляем обработчики для кнопок
      const startBtn = timerItem.querySelector('.timer-start');
      const deleteBtn = timerItem.querySelector('.timer-delete');

      startBtn.addEventListener('click', () => {
        startTimer(timer.id);
      });

      deleteBtn.addEventListener('click', () => {
        if (confirm(`Удалить таймер "${timer.label}"?`)) {
          timers = timers.filter(t => t.id !== timer.id);
          saveTimers();
          renderTimers();
          showToast('Таймер удален', 'info');
        }
      });

      // Добавляем обработчик клика на элемент таймера
      timerItem.addEventListener('click', (e) => {
        // Если клик не по кнопкам, открываем модальное окно
        if (!e.target.classList.contains('timer-start') && !e.target.classList.contains('timer-delete')) {
          openTimerModal(timer.id);
        }
      });

      timersList.appendChild(timerItem);
    });
  }

  // Функция для получения названия типа мелодии
  function getMelodyTypeName(type) {
    const types = {
      'calm': 'Спокойная',
      'gentle': 'Нежная',
      'peaceful': 'Мирная',
      'nature': 'Звуки природы'
    };
    return types[type] || type;
  }

  // Функция для открытия модального окна будильника
  function openAlarmModal(alarmId) {
    currentAlarmId = alarmId;
    const alarm = alarms.find(a => a.id === alarmId);

    if (alarm) {
      // Заполняем форму данными будильника
      const [hours, minutes] = alarm.time.split(':');
      document.getElementById('alarmHours').value = hours;
      document.getElementById('alarmMinutes').value = minutes;
      document.getElementById('alarmLabel').value = alarm.label;
      document.getElementById('alarmMelody').value = alarm.melodyType || 'calm';
      document.getElementById('alarmFadeIn').value = alarm.fadeInTime || 60;
      document.getElementById('alarmDuration').value = alarm.duration || 180;
      document.getElementById('alarmRepeat').checked = alarm.repeat && alarm.repeat.length > 0;

      // Выделяем дни недели
      const weekdayButtons = document.querySelectorAll('.weekday');
      weekdayButtons.forEach(button => {
        const day = parseInt(button.dataset.day);
        button.classList.toggle('active', alarm.repeat && alarm.repeat.includes(day));
      });
    } else {
      // Сбрасываем форму для нового будильника
      document.getElementById('alarmHours').value = '07';
      document.getElementById('alarmMinutes').value = '00';
      document.getElementById('alarmLabel').value = 'Будильник';
      document.getElementById('alarmMelody').value = 'calm';
      document.getElementById('alarmFadeIn').value = 60;
      document.getElementById('alarmDuration').value = 180;
      document.getElementById('alarmRepeat').checked = false;

      // Сбрасываем выделение дней недели
      const weekdayButtons = document.querySelectorAll('.weekday');
      weekdayButtons.forEach(button => {
        button.classList.remove('active');
      });
    }

    alarmModal.classList.add('show');
  }

  // Функция для открытия модального окна таймера
  function openTimerModal(timerId) {
    currentTimerId = timerId;
    const timer = timers.find(t => t.id === timerId);

    if (timer) {
      // Заполняем форму данными таймера
      const totalSeconds = timer.duration;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      document.getElementById('timerHours').value = hours;
      document.getElementById('timerMinutes').value = minutes;
      document.getElementById('timerSeconds').value = seconds;
      document.getElementById('timerLabel').value = timer.label;
      document.getElementById('timerMelody').value = timer.melodyType || 'calm';
    } else {
      // Сбрасываем форму для нового таймера
      document.getElementById('timerHours').value = 0;
      document.getElementById('timerMinutes').value = 5;
      document.getElementById('timerSeconds').value = 0;
      document.getElementById('timerLabel').value = 'Таймер';
      document.getElementById('timerMelody').value = 'calm';
    }

    timerModal.classList.add('show');
  }

  // Функция для сохранения будильника
  function saveAlarm() {
    const hours = document.getElementById('alarmHours').value.padStart(2, '0');
    const minutes = document.getElementById('alarmMinutes').value.padStart(2, '0');
    const time = `${hours}:${minutes}`;
    const label = document.getElementById('alarmLabel').value || 'Будильник';
    const melodyType = document.getElementById('alarmMelody').value;
    const fadeInTime = parseInt(document.getElementById('alarmFadeIn').value);
    const duration = parseInt(document.getElementById('alarmDuration').value);
    const repeatChecked = document.getElementById('alarmRepeat').checked;

    // Собираем выбранные дни недели
    const repeatDays = [];
    if (repeatChecked) {
      const weekdayButtons = document.querySelectorAll('.weekday.active');
      weekdayButtons.forEach(button => {
        repeatDays.push(parseInt(button.dataset.day));
      });
    }

    if (currentAlarmId) {
      // Обновляем существующий будильник
      const alarmIndex = alarms.findIndex(a => a.id === currentAlarmId);
      if (alarmIndex !== -1) {
        alarms[alarmIndex] = {
          ...alarms[alarmIndex],
          time,
          label,
          melodyType,
          fadeInTime,
          duration,
          repeat: repeatDays
        };

        // Если будильник был включен, перепланируем его
        if (alarms[alarmIndex].enabled) {
          cancelAlarm(currentAlarmId);
          scheduleAlarm(alarms[alarmIndex]);
        }
      }
    } else {
      // Создаем новый будильник
      const newAlarm = {
        id: Date.now(),
        time,
        label,
        melodyType,
        fadeInTime,
        duration,
        repeat: repeatDays,
        enabled: true
      };

      alarms.push(newAlarm);
      scheduleAlarm(newAlarm);
    }

    saveAlarms();
    renderAlarms();
    alarmModal.classList.remove('show');
    showToast('Будильник сохранен', 'success');
  }

  // Функция для сохранения таймера
  function saveTimer() {
    const hours = parseInt(document.getElementById('timerHours').value) || 0;
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
    const duration = hours * 3600 + minutes * 60 + seconds;
    const label = document.getElementById('timerLabel').value || 'Таймер';
    const melodyType = document.getElementById('timerMelody').value;

    if (duration <= 0) {
      showToast('Длительность таймера должна быть больше 0', 'error');
      return;
    }

    if (currentTimerId) {
      // Обновляем существующий таймер
      const timerIndex = timers.findIndex(t => t.id === currentTimerId);
      if (timerIndex !== -1) {
        // Если таймер был активен, останавливаем его
        if (activeTimers.has(currentTimerId)) {
          pauseTimer(currentTimerId);
        }

        timers[timerIndex] = {
          ...timers[timerIndex],
          duration,
          label,
          melodyType
        };
      }
    } else {
      // Создаем новый таймер
      const newTimer = {
        id: Date.now(),
        duration,
        label,
        melodyType
      };

      timers.push(newTimer);
    }

    saveTimers();
    renderTimers();
    timerModal.classList.remove('show');
    showToast('Таймер сохранен', 'success');
  }

  // Функция для удаления будильника
  function deleteAlarm() {
    if (!currentAlarmId) return;

    if (confirm('Удалить этот будильник?')) {
      // Отменяем запланированный будильник
      cancelAlarm(currentAlarmId);

      // Удаляем будильник из массива
      alarms = alarms.filter(a => a.id !== currentAlarmId);
      saveAlarms();
      renderAlarms();
      alarmModal.classList.remove('show');
      showToast('Будильник удален', 'info');
    }
  }

  // Функция для запуска таймера
  function startTimer(timerId) {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;

    // Если таймер уже запущен, не делаем ничего
    if (activeTimers.has(timerId)) return;

    let remainingTime = timer.duration;
    const timerItem = document.querySelector(`[data-id="${timerId}"]`);
    const timeDisplay = timerItem.querySelector('.item-time');
    const startBtn = timerItem.querySelector('.timer-start');

    // Меняем кнопку на паузу
    startBtn.textContent = '⏸';
    startBtn.classList.remove('timer-start');
    startBtn.classList.add('timer-pause');

    // Обновляем обработчик кнопки
    startBtn.removeEventListener('click', () => startTimer(timerId));
    startBtn.addEventListener('click', () => pauseTimer(timerId));

    const interval = setInterval(() => {
      remainingTime--;

      // Обновляем отображение времени
      const hours = Math.floor(remainingTime / 3600);
      const minutes = Math.floor((remainingTime % 3600) / 60);
      const seconds = remainingTime % 60;
      timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      if (remainingTime <= 0) {
        // Таймер истек
        clearInterval(interval);
        activeTimers.delete(timerId);

        // Сбрасываем отображение времени
        const totalSeconds = timer.duration;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        timeDisplay.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        // Возвращаем кнопку в исходное состояние
        startBtn.textContent = '▶';
        startBtn.classList.remove('timer-pause');
        startBtn.classList.add('timer-start');

        // Обновляем обработчик кнопки
        startBtn.removeEventListener('click', () => pauseTimer(timerId));
        startBtn.addEventListener('click', () => startTimer(timerId));

        // Запускаем мелодию
        playTimerMelody(timer);
      }
    }, 1000);

    activeTimers.set(timerId, interval);
    showToast(`Таймер "${timer.label}" запущен`, 'success');
  }

  // Функция для паузы таймера
  function pauseTimer(timerId) {
    const timerData = activeTimers.get(timerId);
    if (!timerData) return;

    clearInterval(timerData);
    activeTimers.delete(timerId);

    const timerItem = document.querySelector(`[data-id="${timerId}"]`);
    const startBtn = timerItem.querySelector('.timer-pause');

    // Меняем кнопку на старт
    startBtn.textContent = '▶';
    startBtn.classList.remove('timer-pause');
    startBtn.classList.add('timer-start');

    // Обновляем обработчик кнопки
    startBtn.removeEventListener('click', () => pauseTimer(timerId));
    startBtn.addEventListener('click', () => startTimer(timerId));

    const timer = timers.find(t => t.id === timerId);
    showToast(`Таймер "${timer.label}" приостановлен`, 'info');
  }

  // Функция для воспроизведения мелодии таймера
  async function playTimerMelody(timer) {
    try {
      if (melodyGenerator) {
        await melodyGenerator.generateAndPlay({
          mood: timer.melodyType,
          duration: 60,
          fadeInTime: 10
        });
      } else if (natureSoundsGenerator) {
        const env = timer.melodyType === 'calm' ? 'morning' : 
                  timer.melodyType === 'gentle' ? 'forest' : 'ocean';

        await natureSoundsGenerator.generateAndPlay({
          environment: env,
          duration: 60,
          fadeInTime: 10
        });
      } else {
        showToast('Генератор мелодий недоступен', 'error');
      }
    } catch (error) {
      console.error('Ошибка при воспроизведении мелодии:', error);
      showToast('Ошибка при воспроизведении мелодии', 'error');
    }
  }

  // Функция для планирования будильника
  function scheduleAlarm(alarm) {
    // Отменяем предыдущий таймер для этого будильника, если есть
    cancelAlarm(alarm.id);

    const now = new Date();
    const [hours, minutes] = alarm.time.split(':').map(Number);

    // Определяем дату срабатывания будильника
    let alarmDate = new Date(now);
    alarmDate.setHours(hours, minutes, 0, 0);

    // Если время уже прошло сегодня, переносим на завтра
    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }

    // Если есть повторение, находим ближайший подходящий день
    if (alarm.repeat && alarm.repeat.length > 0) {
      const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // В JS воскресенье = 0, а у нас 7
      let daysUntilAlarm = 7; // Максимальное значение - на следующей неделе

      for (let day of alarm.repeat) {
        let daysUntil = day - currentDay;
        if (daysUntil <= 0) {
          daysUntil += 7; // Если день уже прошел на этой неделе, берем на следующей
        }

        if (daysUntil < daysUntilAlarm) {
          daysUntilAlarm = daysUntil;
        }
      }

      // Устанавливаем дату срабатывания
      alarmDate = new Date(now);
      alarmDate.setDate(now.getDate() + daysUntilAlarm);
      alarmDate.setHours(hours, minutes, 0, 0);
    }

    const msUntilAlarm = alarmDate - now;

    // Устанавливаем таймер
    const timerId = setTimeout(() => {
      triggerAlarm(alarm);

      // Если есть повторение, планируем следующий
      if (alarm.repeat && alarm.repeat.length > 0) {
        scheduleAlarm(alarm);
      } else {
        // Иначе выключаем будильник
        alarm.enabled = false;
        saveAlarms();
        renderAlarms();
      }
    }, msUntilAlarm);

    // Сохраняем ID таймера
    alarm.timerId = timerId;
  }

  // Функция для отмены будильника
  function cancelAlarm(alarmId) {
    const alarm = alarms.find(a => a.id === alarmId);
    if (alarm && alarm.timerId) {
      clearTimeout(alarm.timerId);
      alarm.timerId = null;
    }
  }

  // Функция для срабатывания будильника
  function triggerAlarm(alarm) {
    // Создаем экран будильника
    const alarmScreen = document.createElement('div');
    alarmScreen.className = 'alarm-screen';

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    alarmScreen.innerHTML = `
      <div class="alarm-time">${timeString}</div>
      <div class="alarm-label">${alarm.label}</div>
      <div class="alarm-actions">
        <button class="alarm-action-button snooze-button">Отложить</button>
        <button class="alarm-action-button stop-button">Выключить</button>
      </div>
    `;

    document.body.appendChild(alarmScreen);

    // Запускаем анимацию рассвета
    const sunrise = document.getElementById('sunrise');
    if (sunrise) {
      sunrise.classList.remove('animate');
      void sunrise.offsetWidth; // Force reflow
      sunrise.classList.add('animate');
    }

    // Запускаем мелодию
    playAlarmMelody(alarm);

    // Добавляем обработчики для кнопок
    const snoozeBtn = alarmScreen.querySelector('.snooze-button');
    const stopBtn = alarmScreen.querySelector('.stop-button');

    snoozeBtn.addEventListener('click', () => {
      // Откладываем будильник
      const snoozeMinutes = parseInt(snoozeDuration.value);
      const snoozeTime = new Date(Date.now() + snoozeMinutes * 60 * 1000);

      // Удаляем экран будильника
      document.body.removeChild(alarmScreen);

      // Останавливаем мелодию
      stopMelody();

      // Планируем новый будильник через указанное время
      const snoozeTimerId = setTimeout(() => {
        triggerAlarm(alarm);
      }, snoozeMinutes * 60 * 1000);

      alarm.timerId = snoozeTimerId;

      showToast(`Будильник отложен на ${snoozeMinutes} минут`, 'info');

      // Обновляем статистику
      updateStats('snooze');
    });

    stopBtn.addEventListener('click', () => {
      // Выключаем будильник
      document.body.removeChild(alarmScreen);

      // Останавливаем мелодию
      stopMelody();

      // Обновляем статистику
      updateStats('on-time');

      // Увеличиваем счетчик дней подряд
      const streak = parseInt(localStorage.getItem('motiv_streak') || '0');
      localStorage.setItem('motiv_streak', String(streak + 1));
      updateStreakDisplay();
    });
  }

  // Функция для воспроизведения мелодии будильника
  async function playAlarmMelody(alarm) {
    try {
      if (melodyGenerator) {
        await melodyGenerator.generateAndPlay({
          mood: alarm.melodyType,
          duration: alarm.duration,
          fadeInTime: alarm.fadeInTime
        });
      } else if (natureSoundsGenerator) {
        const env = alarm.melodyType === 'calm' ? 'morning' : 
                  alarm.melodyType === 'gentle' ? 'forest' : 'ocean';

        await natureSoundsGenerator.generateAndPlay({
          environment: env,
          duration: alarm.duration,
          fadeInTime: alarm.fadeInTime
        });
      } else {
        showToast('Генератор мелодий недоступен', 'error');
      }
    } catch (error) {
      console.error('Ошибка при воспроизведении мелодии:', error);
      showToast('Ошибка при воспроизведении мелодии', 'error');
    }
  }

  // Функция для остановки мелодии
  function stopMelody() {
    if (melodyGenerator && melodyGenerator.stop) {
      try { melodyGenerator.stop(); } catch(e) {}
    }

    if (natureSoundsGenerator && natureSoundsGenerator.stop) {
      try { natureSoundsGenerator.stop(); } catch(e) {}
    }
  }

  // Функция для обновления статистики
  function updateStats(status) {
    const today = new Date().toISOString().slice(0, 10);

    try {
      const stats = JSON.parse(localStorage.getItem('motiv_stats') || '[]');

      // Проверяем, есть ли уже запись для сегодня
      const todayIndex = stats.findIndex(s => s.date === today);

      if (todayIndex !== -1) {
        // Обновляем существующую запись
        stats[todayIndex].status = status;
      } else {
        // Добавляем новую запись
        stats.push({ date: today, status });

        // Оставляем только последние 30 записей
        if (stats.length > 30) {
          stats.shift();
        }
      }

      localStorage.setItem('motiv_stats', JSON.stringify(stats));

      // Обновляем отображение статистики
      updateStatsDisplay();
    } catch (error) {
      console.error('Ошибка при обновлении статистики:', error);
    }
  }

  // Функция для обновления отображения статистики
  function updateStatsDisplay() {
    try {
      const stats = JSON.parse(localStorage.getItem('motiv_stats') || '[]');

      // Вычисляем успешность за последнюю неделю
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekStats = stats.filter(s => {
        const statDate = new Date(s.date);
        return statDate >= weekAgo && statDate <= today;
      });

      const onTimeCount = weekStats.filter(s => s.status === 'on-time').length;
      const successRate = weekStats.length > 0 ? Math.round((onTimeCount / weekStats.length) * 100) : 0;

      // Обновляем отображение
      weekSuccess.textContent = `${successRate}%`;

      // Рисуем график
      drawStatsChart(weekStats);
    } catch (error) {
      console.error('Ошибка при обновлении отображения статистики:', error);
    }
  }

  // Функция для рисования графика статистики
  function drawStatsChart(stats) {
    const canvas = document.getElementById('statsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);

    if (stats.length === 0) return;

    // Подготавливаем данные за последние 7 дней
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      const dayData = stats.find(s => s.date === dateStr);
      days.push({
        date: dateStr,
        status: dayData ? dayData.status : 'none'
      });
    }

    // Рисуем график
    const barWidth = width / 7 - 10;
    const spacing = (width - barWidth * 7) / 8;

    days.forEach((day, index) => {
      const x = spacing + index * (barWidth + spacing);
      const barHeight = day.status === 'none' ? 10 : height * 0.6;

      // Определяем цвет в зависимости от статуса
      let color;
      if (day.status === 'on-time') {
        color = '#10b981'; // Зеленый
      } else if (day.status === 'snooze') {
        color = '#f59e0b'; // Желтый
      } else if (day.status === 'miss') {
        color = '#ef4444'; // Красный
      } else {
        color = '#334155'; // Серый
      }

      // Рисуем столбец
      ctx.fillStyle = color;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      // Добавляем подпись дня недели
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const dayName = dayNames[new Date(day.date).getDay()];

      ctx.textAlign = 'center';
      ctx.fillText(dayName, x + barWidth / 2, height - 5);
    });
  }

  // Функция для обновления отображения счетчика дней подряд
  function updateStreakDisplay() {
    const streak = parseInt(localStorage.getItem('motiv_streak') || '0');
    currentStreak.textContent = streak;
  }

  // Функция для сохранения настроек
  function saveSettings() {
    const settings = {
      volume: volumeSlider.value,
      fadeInTime: fadeInTime.value,
      melodyType: melodyType.value,
      snoozeDuration: snoozeDuration.value,
      maxSnoozeCount: maxSnoozeCount.value
    };

    localStorage.setItem('motiv_settings', JSON.stringify(settings));
    showToast('Настройки сохранены', 'success');
  }

  // Функция для загрузки настроек
  function loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('motiv_settings') || '{}');

      volumeSlider.value = settings.volume || 70;
      volumeValue.textContent = `${volumeSlider.value}%`;
      fadeInTime.value = settings.fadeInTime || 60;
      melodyType.value = settings.melodyType || 'calm';
      snoozeDuration.value = settings.snoozeDuration || 10;
      maxSnoozeCount.value = settings.maxSnoozeCount || 3;
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error);
    }
  }

  // Функция для предварительного прослушивания мелодии
  async function previewMelody() {
    try {
      const mood = melodyType.value;

      if (melodyGenerator) {
        await melodyGenerator.generateAndPlay({
          mood: mood,
          duration: 30,
          fadeInTime: 5
        });
      } else if (natureSoundsGenerator) {
        const env = mood === 'calm' ? 'morning' : 
                  mood === 'gentle' ? 'forest' : 'ocean';

        await natureSoundsGenerator.generateAndPlay({
          environment: env,
          duration: 30,
          fadeInTime: 5
        });
      } else {
        showToast('Генератор мелодий недоступен', 'error');
      }

      showToast('Мелодия воспроизводится', 'success');
    } catch (error) {
      console.error('Ошибка при воспроизведении мелодии:', error);
      showToast('Ошибка при воспроизведении мелодии', 'error');
    }
  }

  // Функция для остановки предварительного прослушивания
  function stopPreviewMelody() {
    stopMelody();
    showToast('Воспроизведение остановлено', 'info');
  }

  // Функция для переключения вкладок
  function switchTab(tabName) {
    // Убираем активный класс у всех вкладок и секций
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });

    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });

    // Добавляем активный класс выбранной вкладке и секции
    switch (tabName) {
      case 'alarms':
        alarmsTab.classList.add('active');
        alarmsSection.classList.add('active');
        break;
      case 'timers':
        timersTab.classList.add('active');
        timersSection.classList.add('active');
        break;
      case 'settings':
        settingsTab.classList.add('active');
        settingsSection.classList.add('active');
        updateStatsDisplay();
        break;
    }
  }

  // Функция для добавления обработчиков событий
  function addEventListeners() {
    // Переключение вкладок
    alarmsTab.addEventListener('click', () => switchTab('alarms'));
    timersTab.addEventListener('click', () => switchTab('timers'));
    settingsTab.addEventListener('click', () => switchTab('settings'));

    // Кнопки добавления
    addAlarmBtn.addEventListener('click', () => openAlarmModal(null));
    addTimerBtn.addEventListener('click', () => openTimerModal(null));

    // Модальные окна
    closeAlarmModal.addEventListener('click', () => {
      alarmModal.classList.remove('show');
    });

    closeTimerModal.addEventListener('click', () => {
      timerModal.classList.remove('show');
    });

    saveAlarmBtn.addEventListener('click', saveAlarm);
    saveTimerBtn.addEventListener('click', saveTimer);
    deleteAlarmBtn.addEventListener('click', deleteAlarm);

    // Настройки
    volumeSlider.addEventListener('input', () => {
      volumeValue.textContent = `${volumeSlider.value}%`;
    });

    volumeSlider.addEventListener('change', saveSettings);
    fadeInTime.addEventListener('change', saveSettings);
    melodyType.addEventListener('change', saveSettings);
    snoozeDuration.addEventListener('change', saveSettings);
    maxSnoozeCount.addEventListener('change', saveSettings);

    // Предварительный просмотр мелодии
    previewMelodyBtn.addEventListener('click', previewMelody);
    stopMelodyBtn.addEventListener('click', stopPreviewMelody);

    // Дни недели в модальном окне будильника
    document.querySelectorAll('.weekday').forEach(button => {
      button.addEventListener('click', () => {
        button.classList.toggle('active');
      });
    });

    // Закрытие модальных окон по клику вне их
    window.addEventListener('click', (e) => {
      if (e.target === alarmModal) {
        alarmModal.classList.remove('show');
      }

      if (e.target === timerModal) {
        timerModal.classList.remove('show');
      }
    });
  }

  // Функция для инициализации приложения
  async function init() {
    // Добавляем обработчики событий
    addEventListeners();

    // Загружаем настройки
    loadSettings();

    // Инициализируем генератор мелодий
    await initMelodyGenerator();

    // Отображаем будильники и таймеры
    renderAlarms();
    renderTimers();

    // Обновляем отображение счетчика дней подряд
    updateStreakDisplay();

    // Планируем все включенные будильники
    alarms.filter(alarm => alarm.enabled).forEach(alarm => {
      scheduleAlarm(alarm);
    });

    // Устанавливаем текущую вкладку
    switchTab('alarms');

    showToast('Motiv Sunrise готов к работе', 'success');
  }

  // Запускаем инициализацию
  init();
});
