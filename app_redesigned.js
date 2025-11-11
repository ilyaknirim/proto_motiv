
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
    const repeatEnabled = document.getElementById('alarmRepeat').checked;

    // Собираем выбранные дни недели
    const repeat = [];
    if (repeatEnabled) {
      const weekdayButtons = document.querySelectorAll('.weekday.active');
      weekdayButtons.forEach(button => {
        repeat.push(parseInt(button.dataset.day));
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
          repeat
        };
      }
    } else {
      // Создаем новый будильник
      const newAlarm = {
        id: Date.now(),
        time,
        label,
        enabled: true,
        melodyType,
        fadeInTime,
        duration,
        repeat
      };
      alarms.push(newAlarm);
    }

    saveAlarms();
    renderAlarms();
    alarmModal.classList.remove('show');

    if (currentAlarmId) {
      showToast('Будильник обновлен', 'success');
    } else {
      showToast('Будильник добавлен', 'success');
    }

    // Планируем будильник, если он включен
    const alarm = alarms.find(a => a.id === (currentAlarmId || alarms[alarms.length - 1].id));
    if (alarm.enabled) {
      scheduleAlarm(alarm);
    }
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
      showToast('Укажите корректную длительность таймера', 'error');
      return;
    }

    if (currentTimerId) {
      // Обновляем существующий таймер
      const timerIndex = timers.findIndex(t => t.id === currentTimerId);
      if (timerIndex !== -1) {
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

    if (currentTimerId) {
      showToast('Таймер обновлен', 'success');
    } else {
      showToast('Таймер добавлен', 'success');
    }
  }

  // Функция для удаления будильника
  function deleteAlarm() {
    if (!currentAlarmId) return;

    const alarm = alarms.find(a => a.id === currentAlarmId);
    if (!alarm) return;

    if (confirm(`Удалить будильник "${alarm.label}"?`)) {
      // Отменяем запланированный будильник
      cancelAlarm(currentAlarmId);

      // Удаляем из массива
      alarms = alarms.filter(a => a.id !== currentAlarmId);
      saveAlarms();
      renderAlarms();
      alarmModal.classList.remove('show');
      showToast('Будильник удален', 'info');
    }
  }

  // Функция для удаления таймера
  function deleteTimer() {
    if (!currentTimerId) return;

    const timer = timers.find(t => t.id === currentTimerId);
    if (!timer) return;

    if (confirm(`Удалить таймер "${timer.label}"?`)) {
      // Останавливаем таймер, если он активен
      if (activeTimers.has(currentTimerId)) {
        clearInterval(activeTimers.get(currentTimerId).interval);
        activeTimers.delete(currentTimerId);
      }

      // Удаляем из массива
      timers = timers.filter(t => t.id !== currentTimerId);
      saveTimers();
      renderTimers();
      timerModal.classList.remove('show');
      showToast('Таймер удален', 'info');
    }
  }

  // Функция для планирования будильника
  function scheduleAlarm(alarm) {
    // Отменяем предыдущий таймер для этого будильника
    cancelAlarm(alarm.id);

    const now = new Date();
    const [hours, minutes] = alarm.time.split(':').map(Number);
    let targetDate = new Date(now);
    targetDate.setHours(hours, minutes, 0, 0);

    // Если время уже прошло сегодня, переносим на завтра
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Проверяем дни повторения
    if (alarm.repeat && alarm.repeat.length > 0) {
      const today = now.getDay() === 0 ? 7 : now.getDay(); // В JS воскресенье = 0, в нашей системе = 7
      let daysToAdd = 0;

      // Ищем ближайший день повторения
      for (let i = 0; i < 7; i++) {
        const checkDay = (today + i - 1) % 7 + 1; // Преобразуем в нашу систему (Пн=1...Вс=7)
        if (alarm.repeat.includes(checkDay)) {
          daysToAdd = i;
          break;
        }
      }

      // Если сегодня уже прошло время для повторения, ищем следующий день
      if (daysToAdd === 0 && targetDate <= now) {
        for (let i = 1; i < 7; i++) {
          const checkDay = (today + i - 1) % 7 + 1;
          if (alarm.repeat.includes(checkDay)) {
            daysToAdd = i;
            break;
          }
        }
      }

      targetDate.setDate(now.getDate() + daysToAdd);
    }

    const msUntilAlarm = targetDate - now;

    // Сохраняем ID таймера
    alarm.timerId = setTimeout(() => {
      triggerAlarm(alarm);

      // Если есть повторение, планируем следующий
      if (alarm.repeat && alarm.repeat.length > 0) {
        scheduleAlarm(alarm);
      }
    }, msUntilAlarm);

    // Обновляем отображение времени до срабатывания
    updateCountdown(alarm, targetDate);
  }

  // Функция для отмены будильника
  function cancelAlarm(alarmId) {
    const alarm = alarms.find(a => a.id === alarmId);
    if (alarm && alarm.timerId) {
      clearTimeout(alarm.timerId);
      alarm.timerId = null;
    }
  }

  // Функция для обновления обратного отсчета
  function updateCountdown(alarm, targetDate) {
    const updateCountdownInterval = setInterval(() => {
      const now = new Date();
      const msRemaining = targetDate - now;

      if (msRemaining <= 0) {
        clearInterval(updateCountdownInterval);
        return;
      }

      const hours = Math.floor(msRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

      // Обновляем отображение в UI (если нужно)
      const alarmElement = document.querySelector(`.item-card[data-id="${alarm.id}"]`);
      if (alarmElement) {
        const subtitleElement = alarmElement.querySelector('.item-subtitle');
        const repeatText = alarm.repeat && alarm.repeat.length > 0 
          ? `Повтор: ${formatRepeatDays(alarm.repeat)}` 
          : 'Без повторения';

        subtitleElement.textContent = `${repeatText} • Сработает через ${hours}ч ${minutes}м`;
      }
    }, 60000); // Обновляем каждую минуту
  }

  // Функция для запуска таймера
  function startTimer(timerId) {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;

    // Если таймер уже запущен, не делаем ничего
    if (activeTimers.has(timerId)) return;

    let remainingTime = timer.duration;

    const timerElement = document.querySelector(`.item-card[data-id="${timerId}"]`);
    const startButton = timerElement.querySelector('.timer-start');
    const timeElement = timerElement.querySelector('.item-time');

    startButton.textContent = '⏸';
    startButton.classList.remove('primary');
    startButton.classList.add('secondary');

    const interval = setInterval(() => {
      remainingTime--;

      const hours = Math.floor(remainingTime / 3600);
      const minutes = Math.floor((remainingTime % 3600) / 60);
      const seconds = remainingTime % 60;

      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      timeElement.textContent = timeString;

      if (remainingTime <= 0) {
        clearInterval(interval);
        activeTimers.delete(timerId);

        // Возвращаем кнопку в исходное состояние
        startButton.textContent = '▶';
        startButton.classList.remove('secondary');
        startButton.classList.add('primary');

        // Возвращаем исходное время
        const originalHours = Math.floor(timer.duration / 3600);
        const originalMinutes = Math.floor((timer.duration % 3600) / 60);
        const originalSeconds = timer.duration % 60;
        const originalTimeString = `${originalHours.toString().padStart(2, '0')}:${originalMinutes.toString().padStart(2, '0')}:${originalSeconds.toString().padStart(2, '0')}`;
        timeElement.textContent = originalTimeString;

        // Запускаем мелодию
        triggerTimer(timer);
      }
    }, 1000);

    activeTimers.set(timerId, { interval, remainingTime });

    // Добавляем обработчик для паузы
    startButton.onclick = () => pauseTimer(timerId);
  }

  // Функция для паузы таймера
  function pauseTimer(timerId) {
    const timerData = activeTimers.get(timerId);
    if (!timerData) return;

    clearInterval(timerData.interval);
    activeTimers.delete(timerId);

    const timerElement = document.querySelector(`.item-card[data-id="${timerId}"]`);
    const startButton = timerElement.querySelector('.timer-start');

    startButton.textContent = '▶';
    startButton.classList.remove('secondary');
    startButton.classList.add('primary');

    // Добавляем обработчик для запуска
    startButton.onclick = () => startTimer(timerId);
  }

  // Функция для срабатывания будильника
  async function triggerAlarm(alarm) {
    // Показываем экран будильника
    showAlarmScreen(alarm);

    // Запускаем мелодию
    try {
      if (melodyGenerator) {
        await melodyGenerator.generateAndPlay({
          mood: alarm.melodyType,
          duration: alarm.duration,
          fadeInTime: alarm.fadeInTime,
          startVolume: 0.1,
          maxVolume: parseFloat(volumeSlider.value) / 100
        });
      } else if (natureSoundsGenerator) {
        const env = alarm.melodyType === 'calm' ? 'morning' : 
                   alarm.melodyType === 'gentle' ? 'forest' : 'ocean';

        await natureSoundsGenerator.generateAndPlay({
          environment: env,
          duration: alarm.duration,
          fadeInTime: alarm.fadeInTime
        });
      }
    } catch (error) {
      console.error('Ошибка при воспроизведении мелодии:', error);
      showToast('Ошибка воспроизведения мелодии', 'error');
    }

    // Записываем статистику
    recordAlarmEvent(alarm.id, 'triggered');
  }

  // Функция для срабатывания таймера
  async function triggerTimer(timer) {
    // Показываем уведомление
    showToast(`Таймер "${timer.label}" завершился`, 'success');

    // Запускаем мелодию
    try {
      if (melodyGenerator) {
        await melodyGenerator.generateAndPlay({
          mood: timer.melodyType,
          duration: 60,
          fadeInTime: 10,
          startVolume: 0.2,
          maxVolume: parseFloat(volumeSlider.value) / 100
        });
      } else if (natureSoundsGenerator) {
        const env = timer.melodyType === 'calm' ? 'morning' : 
                   timer.melodyType === 'gentle' ? 'forest' : 'ocean';

        await natureSoundsGenerator.generateAndPlay({
          environment: env,
          duration: 60,
          fadeInTime: 10
        });
      }
    } catch (error) {
      console.error('Ошибка при воспроизведении мелодии:', error);
      showToast('Ошибка воспроизведения мелодии', 'error');
    }
  }

  // Функция для отображения экрана будильника
  function showAlarmScreen(alarm) {
    const alarmScreen = document.createElement('div');
    alarmScreen.className = 'alarm-screen';
    alarmScreen.innerHTML = `
      <div class="alarm-time">${alarm.time}</div>
      <div class="alarm-label">${alarm.label}</div>
      <div class="alarm-actions">
        <button class="alarm-action-button snooze-button">Отложить</button>
        <button class="alarm-action-button stop-button">Выключить</button>
      </div>
    `;

    document.body.appendChild(alarmScreen);

    // Анимация рассвета
    const sunrise = document.createElement('div');
    sunrise.className = 'sunrise animate';
    document.body.appendChild(sunrise);

    // Обработчики кнопок
    const snoozeButton = alarmScreen.querySelector('.snooze-button');
    const stopButton = alarmScreen.querySelector('.stop-button');

    snozeButton.addEventListener('click', () => {
      // Откладываем будильник
      snoozeAlarm(alarm);

      // Удаляем экран будильника
      document.body.removeChild(alarmScreen);
      document.body.removeChild(sunrise);

      // Останавливаем мелодию
      stopMelody();
    });

    stopButton.addEventListener('click', () => {
      // Останавливаем будильник
      stopAlarm(alarm);

      // Удаляем экран будильника
      document.body.removeChild(alarmScreen);
      document.body.removeChild(sunrise);

      // Останавливаем мелодию
      stopMelody();
    });
  }

  // Функция для откладывания будильника
  function snoozeAlarm(alarm) {
    const snoozeMinutes = parseInt(snoozeDuration.value);
    const now = new Date();
    const snoozeTime = new Date(now.getTime() + snoozeMinutes * 60 * 1000);

    // Планируем новый будильник
    const snoozeTimerId = setTimeout(() => {
      triggerAlarm(alarm);
    }, snoozeMinutes * 60 * 1000);

    // Сохраняем ID таймера отложения
    alarm.snoozeTimerId = snoozeTimerId;

    // Записываем статистику
    recordAlarmEvent(alarm.id, 'snoozed');

    showToast(`Будильник отложен на ${snoozeMinutes} минут`, 'info');
  }

  // Функция для остановки будильника
  function stopAlarm(alarm) {
    // Отменяем таймер отложения, если есть
    if (alarm.snoozeTimerId) {
      clearTimeout(alarm.snoozeTimerId);
      alarm.snoozeTimerId = null;
    }

    // Если есть повторение, планируем следующий будильник
    if (alarm.repeat && alarm.repeat.length > 0) {
      scheduleAlarm(alarm);
    }

    // Записываем статистику
    recordAlarmEvent(alarm.id, 'stopped');

    // Обновляем счетчик дней подряд
    incrementStreak();

    showToast('Будильник выключен', 'success');
  }

  // Функция для остановки мелодии
  function stopMelody() {
    if (melodyGenerator) {
      try {
        melodyGenerator.stop();
      } catch (e) {
        console.error('Ошибка при остановке мелодии:', e);
      }
    }

    if (natureSoundsGenerator) {
      try {
        natureSoundsGenerator.stop();
      } catch (e) {
        console.error('Ошибка при остановке звуков природы:', e);
      }
    }
  }

  // Функция для записи события будильника
  function recordAlarmEvent(alarmId, eventType) {
    const today = new Date().toISOString().slice(0, 10);
    const events = JSON.parse(localStorage.getItem('motiv_alarm_events') || '{}');

    if (!events[today]) {
      events[today] = {};
    }

    if (!events[today][alarmId]) {
      events[today][alarmId] = [];
    }

    events[today][alarmId].push({
      type: eventType,
      timestamp: Date.now()
    });

    localStorage.setItem('motiv_alarm_events', JSON.stringify(events));

    // Обновляем статистику
    updateStats();
  }

  // Функция для получения и увеличения счетчика дней подряд
  function incrementStreak() {
    let streak = parseInt(localStorage.getItem('motiv_streak') || '0');
    const lastSuccess = localStorage.getItem('motiv_last_success');
    const today = new Date().toISOString().slice(0, 10);

    // Если последний успех был вчера, увеличиваем счетчик
    if (lastSuccess === getYesterdayString()) {
      streak++;
    } 
    // Если последний успех был сегодня, не делаем ничего
    else if (lastSuccess === today) {
      // Ничего не делаем
    } 
    // В остальных случаях сбрасываем счетчик
    else {
      streak = 1;
    }

    localStorage.setItem('motiv_streak', String(streak));
    localStorage.setItem('motiv_last_success', today);

    currentStreak.textContent = streak;
  }

  // Функция для получения вчерашней даты в формате YYYY-MM-DD
  function getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }

  // Функция для обновления статистики
  function updateStats() {
    // Обновляем счетчик дней подряд
    currentStreak.textContent = localStorage.getItem('motiv_streak') || '0';

    // Получаем события за последние 7 дней
    const events = JSON.parse(localStorage.getItem('motiv_alarm_events') || '{}');
    const today = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().slice(0, 10);
      last7Days.push(dateString);
    }

    // Считаем успешность за неделю
    let successCount = 0;
    let totalCount = 0;

    last7Days.forEach(dateString => {
      const dayEvents = events[dateString];
      if (dayEvents) {
        Object.values(dayEvents).forEach(alarmEvents => {
          totalCount++;
          if (alarmEvents.some(e => e.type === 'stopped')) {
            successCount++;
          }
        });
      }
    });

    const successPercentage = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
    weekSuccess.textContent = `${successPercentage}%`;

    // Рисуем график
    drawStatsChart(last7Days, events);
  }

  // Функция для отрисовки графика статистики
  function drawStatsChart(dates, events) {
    const ctx = statsChart.getContext('2d');
    const width = statsChart.width;
    const height = statsChart.height;

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);

    // Размеры графика
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / dates.length * 0.7;
    const barSpacing = chartWidth / dates.length * 0.3;

    // Рисуем столбцы
    dates.forEach((dateString, index) => {
      const dayEvents = events[dateString];
      let status = 'none'; // none, snoozed, stopped, missed

      if (dayEvents) {
        Object.values(dayEvents).forEach(alarmEvents => {
          if (alarmEvents.some(e => e.type === 'stopped')) {
            status = 'stopped';
          } else if (alarmEvents.some(e => e.type === 'snoozed') && status !== 'stopped') {
            status = 'snoozed';
          } else if (alarmEvents.some(e => e.type === 'triggered') && status === 'none') {
            status = 'missed';
          }
        });
      }

      // Определяем цвет
      let color;
      switch (status) {
        case 'stopped':
          color = '#10b981'; // Зеленый
          break;
        case 'snoozed':
          color = '#f59e0b'; // Желтый
          break;
        case 'missed':
          color = '#ef4444'; // Красный
          break;
        default:
          color = '#334155'; // Серый
      }

      // Рисуем столбец
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const barHeight = status === 'none' ? 10 : chartHeight * 0.7;
      const y = height - padding - barHeight;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Добавляем подпись дня недели
      const date = new Date(dateString);
      const dayName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()];

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dayName, x + barWidth / 2, height - 5);
    });
  }

  // Функция для предпросмотра мелодии
  async function previewMelody() {
    const mood = melodyType.value;

    try {
      if (melodyGenerator) {
        await melodyGenerator.generateAndPlay({
          mood: mood,
          duration: 30,
          fadeInTime: 5,
          startVolume: 0.1,
          maxVolume: parseFloat(volumeSlider.value) / 100
        });
      } else if (natureSoundsGenerator) {
        const env = mood === 'calm' ? 'morning' : 
                   mood === 'gentle' ? 'forest' : 'ocean';

        await natureSoundsGenerator.generateAndPlay({
          environment: env,
          duration: 30,
          fadeInTime: 5
        });
      }

      showToast('Мелодия воспроизводится', 'success');
    } catch (error) {
      console.error('Ошибка при воспроизведении мелодии:', error);
      showToast('Ошибка воспроизведения мелодии', 'error');
    }
  }

  // Инициализация обработчиков событий
  function initEventListeners() {
    // Переключение вкладок
    alarmsTab.addEventListener('click', () => {
      alarmsTab.classList.add('active');
      timersTab.classList.remove('active');
      settingsTab.classList.remove('active');

      alarmsSection.classList.add('active');
      timersSection.classList.remove('active');
      settingsSection.classList.remove('active');
    });

    timersTab.addEventListener('click', () => {
      alarmsTab.classList.remove('active');
      timersTab.classList.add('active');
      settingsTab.classList.remove('active');

      alarmsSection.classList.remove('active');
      timersSection.classList.add('active');
      settingsSection.classList.remove('active');
    });

    settingsTab.addEventListener('click', () => {
      alarmsTab.classList.remove('active');
      timersTab.classList.remove('active');
      settingsTab.classList.add('active');

      alarmsSection.classList.remove('active');
      timersSection.classList.remove('active');
      settingsSection.classList.add('active');
    });

    // Кнопки добавления
    addAlarmBtn.addEventListener('click', () => {
      openAlarmModal();
    });

    addTimerBtn.addEventListener('click', () => {
      openTimerModal();
    });

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

    // Дни недели
    document.querySelectorAll('.weekday').forEach(button => {
      button.addEventListener('click', () => {
        button.classList.toggle('active');
      });
    });

    // Настройки
    volumeSlider.addEventListener('input', () => {
      volumeValue.textContent = `${volumeSlider.value}%`;
    });

    previewMelodyBtn.addEventListener('click', previewMelody);
    stopMelodyBtn.addEventListener('click', stopMelody);

    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', (e) => {
      if (e.target === alarmModal) {
        alarmModal.classList.remove('show');
      }
      if (e.target === timerModal) {
        timerModal.classList.remove('show');
      }
    });
  }

  // Инициализация приложения
  async function initApp() {
    // Инициализируем генератор мелодий
    await initMelodyGenerator();

    // Устанавливаем значения по умолчанию для настроек
    volumeValue.textContent = `${volumeSlider.value}%`;

    // Отображаем будильники и таймеры
    renderAlarms();
    renderTimers();

    // Обновляем статистику
    updateStats();

    // Планируем все включенные будильники
    alarms.filter(alarm => alarm.enabled).forEach(alarm => {
      scheduleAlarm(alarm);
    });

    // Инициализируем обработчики событий
    initEventListeners();

    // Показываем приветственное сообщение
    showToast('Motiv Sunrise готов к работе', 'success');

    // Устанавливаем темную тему по умолчанию
    document.body.classList.add('theme-dark');
  }

  // Запускаем приложение
  initApp();

  // Экспортируем функции для использования в других скриптах
  window.appNew = {
    showToast,
    renderAlarms,
    renderTimers,
    updateStats,
    stopMelody,
    scheduleAlarm,
    cancelAlarm
  };
