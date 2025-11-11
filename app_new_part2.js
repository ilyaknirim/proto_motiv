
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
    showToast(`Таймер "${timer.label}" завершен`, 'success');

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

    // Добавляем анимацию рассвета
    const sunrise = document.createElement('div');
    sunrise.className = 'sunrise animate';
    document.body.appendChild(sunrise);

    // Обработчики кнопок
    const snoozeButton = alarmScreen.querySelector('.snooze-button');
    const stopButton = alarmScreen.querySelector('.stop-button');

    snozeButton.addEventListener('click', () => {
      snoozeAlarm(alarm);
      document.body.removeChild(alarmScreen);
      document.body.removeChild(sunrise);

      // Останавливаем мелодию
      if (melodyGenerator) {
        melodyGenerator.stop();
      } else if (natureSoundsGenerator) {
        natureSoundsGenerator.stop();
      }
    });

    stopButton.addEventListener('click', () => {
      stopAlarm(alarm);
      document.body.removeChild(alarmScreen);
      document.body.removeChild(sunrise);

      // Останавливаем мелодию
      if (melodyGenerator) {
        melodyGenerator.stop();
      } else if (natureSoundsGenerator) {
        natureSoundsGenerator.stop();
      }
    });
  }

  // Функция для отложения будильника
  function snoozeAlarm(alarm) {
    const snoozeMinutes = parseInt(snoozeDuration.value);
    const now = new Date();
    const newTarget = new Date(now.getTime() + snoozeMinutes * 60 * 1000);

    // Планируем новый будильник
    alarm.timerId = setTimeout(() => {
      triggerAlarm(alarm);
    }, snoozeMinutes * 60 * 1000);

    showToast(`Будильник отложен на ${snoozeMinutes} минут`, 'info');

    // Записываем статистику
    recordAlarmEvent(alarm.id, 'snooze');
  }

  // Функция для выключения будильника
  function stopAlarm(alarm) {
    showToast('Будильник выключен', 'success');

    // Записываем статистику
    recordAlarmEvent(alarm.id, 'stopped');

    // Обновляем серию успешных пробуждений
    incrementStreak();
  }

  // Функция для записи события будильника в статистику
  function recordAlarmEvent(alarmId, event) {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Получаем текущую статистику
    const stats = JSON.parse(localStorage.getItem('motiv_stats') || '[]');

    // Находим запись за сегодня
    const todayStats = stats.find(s => s.date === date);

    if (todayStats) {
      // Если запись за сегодня существует, обновляем её
      todayStats[event] = (todayStats[event] || 0) + 1;
    } else {
      // Иначе создаем новую запись
      stats.push({
        date,
        [event]: 1
      });
    }

    // Сохраняем статистику
    localStorage.setItem('motiv_stats', JSON.stringify(stats));

    // Обновляем отображение статистики
    updateStatsDisplay();
  }

  // Функция для увеличения серии успешных пробуждений
  function incrementStreak() {
    const currentStreak = parseInt(localStorage.getItem('motiv_streak') || '0');
    const newStreak = currentStreak + 1;
    localStorage.setItem('motiv_streak', newStreak.toString());

    // Обновляем отображение
    document.getElementById('currentStreak').textContent = newStreak;
  }

  // Функция для обновления отображения статистики
  function updateStatsDisplay() {
    // Обновляем серию
    const streak = localStorage.getItem('motiv_streak') || '0';
    document.getElementById('currentStreak').textContent = streak;

    // Получаем статистику за последние 7 дней
    const stats = JSON.parse(localStorage.getItem('motiv_stats') || '[]');
    const today = new Date();
    const weekStats = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      const dayStats = stats.find(s => s.date === dateStr) || {};
      weekStats.push({
        date: dateStr,
        stopped: dayStats.stopped || 0,
        snooze: dayStats.snooze || 0,
        triggered: dayStats.triggered || 0
      });
    }

    // Вычисляем процент успешности за неделю
    const totalAlarms = weekStats.reduce((sum, day) => sum + day.stopped + day.snooze, 0);
    const successfulAlarms = weekStats.reduce((sum, day) => sum + day.stopped, 0);
    const successRate = totalAlarms > 0 ? Math.round((successfulAlarms / totalAlarms) * 100) : 0;

    document.getElementById('weekSuccess').textContent = `${successRate}%`;

    // Рисуем график
    drawStatsChart(weekStats);
  }

  // Функция для отрисовки графика статистики
  function drawStatsChart(stats) {
    const canvas = document.getElementById('statsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Очищаем холст
    ctx.clearRect(0, 0, width, height);

    // Размеры
    const padding = 20;
    const barWidth = (width - padding * 2) / 7 - 10;
    const maxCount = Math.max(...stats.map(day => day.stopped + day.snooze), 1);

    // Рисуем столбцы для каждого дня
    stats.forEach((day, index) => {
      const x = padding + index * (barWidth + 10);
      const total = day.stopped + day.snooze;
      const barHeight = total > 0 ? (total / maxCount) * (height - padding * 2) : 5;

      // Рисуем общую высоту столбца (полупрозрачная)
      ctx.fillStyle = 'rgba(100, 116, 239, 0.3)';
      ctx.fillRect(x, height - padding - barHeight, barWidth, barHeight);

      // Рисуем успешную часть (зеленая)
      if (day.stopped > 0) {
        const successHeight = (day.stopped / maxCount) * (height - padding * 2);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x, height - padding - successHeight, barWidth, successHeight);
      }

      // Рисуем часть с отложением (желтая)
      if (day.snooze > 0) {
        const snoozeHeight = (day.snooze / maxCount) * (height - padding * 2);
        const yOffset = height - padding - ((day.stopped + day.snooze) / maxCount) * (height - padding * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x, yOffset, barWidth, snoozeHeight);
      }

      // Добавляем подписи дней
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';

      const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const dayIndex = new Date(day.date).getDay();
      const dayName = dayNames[dayIndex === 0 ? 6 : dayIndex - 1]; // В JS воскресенье = 0

      ctx.fillText(dayName, x + barWidth / 2, height - 5);
    });
  }

  // Функция для предпросмотра мелодии
  async function previewMelody() {
    const mood = melodyType.value;
    const fadeIn = parseInt(fadeInTime.value);
    const volume = parseFloat(volumeSlider.value) / 100;

    try {
      if (melodyGenerator) {
        await melodyGenerator.generateAndPlay({
          mood,
          duration: 30,
          fadeInTime: Math.min(fadeIn, 15),
          startVolume: 0.1,
          maxVolume: volume
        });
      } else if (natureSoundsGenerator) {
        const env = mood === 'calm' ? 'morning' : 
                   mood === 'gentle' ? 'forest' : 'ocean';

        await natureSoundsGenerator.generateAndPlay({
          environment: env,
          duration: 30,
          fadeInTime: Math.min(fadeIn, 15)
        });
      }

      showToast('Мелодия воспроизводится', 'success');
    } catch (error) {
      console.error('Ошибка при воспроизведении мелодии:', error);
      showToast('Ошибка воспроизведения мелодии', 'error');
    }
  }

  // Функция для остановки мелодии
  function stopMelody() {
    if (melodyGenerator) {
      melodyGenerator.stop();
    } else if (natureSoundsGenerator) {
      natureSoundsGenerator.stop();
    }

    showToast('Воспроизведение остановлено', 'info');
  }

  // Обработчики событий
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

    // Обновляем статистику при открытии настроек
    updateStatsDisplay();
  });

  addAlarmBtn.addEventListener('click', () => {
    currentAlarmId = null;
    openAlarmModal();
  });

  addTimerBtn.addEventListener('click', () => {
    currentTimerId = null;
    openTimerModal();
  });

  closeAlarmModal.addEventListener('click', () => {
    alarmModal.classList.remove('show');
  });

  closeTimerModal.addEventListener('click', () => {
    timerModal.classList.remove('show');
  });

  saveAlarmBtn.addEventListener('click', saveAlarm);
  saveTimerBtn.addEventListener('click', saveTimer);
  deleteAlarmBtn.addEventListener('click', deleteAlarm);
  deleteTimerBtn.addEventListener('click', deleteTimer);

  // Обработчик для переключателя повторения будильника
  document.getElementById('alarmRepeat').addEventListener('change', (e) => {
    const weekdaysContainer = document.getElementById('weekdays');
    weekdaysContainer.style.display = e.target.checked ? 'flex' : 'none';
  });

  // Обработчики для кнопок дней недели
  document.querySelectorAll('.weekday').forEach(button => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
    });
  });

  // Обработчик для слайдера громкости
  volumeSlider.addEventListener('input', (e) => {
    volumeValue.textContent = `${e.target.value}%`;
  });

  // Обработчики для кнопок предпросмотра мелодии
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

  // Инициализация приложения
  async function init() {
    // Инициализируем генератор мелодий
    await initMelodyGenerator();

    // Отображаем будильники и таймеры
    renderAlarms();
    renderTimers();

    // Планируем все включенные будильники
    alarms.filter(alarm => alarm.enabled).forEach(alarm => {
      scheduleAlarm(alarm);
    });

    // Устанавливаем начальные значения настроек
    volumeValue.textContent = `${volumeSlider.value}%`;

    // Скрываем дни недели, если повторение выключено
    const weekdaysContainer = document.getElementById('weekdays');
    weekdaysContainer.style.display = document.getElementById('alarmRepeat').checked ? 'flex' : 'none';

    // Обновляем статистику
    updateStatsDisplay();
  }

  // Запускаем инициализацию
  init();
});
