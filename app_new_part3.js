
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
      localStorage.setItem('motiv_volume', volumeSlider.value);
    });

    // Загрузка сохраненных настроек
    const savedVolume = localStorage.getItem('motiv_volume');
    if (savedVolume) {
      volumeSlider.value = savedVolume;
      volumeValue.textContent = `${savedVolume}%`;
    }

    const savedFadeInTime = localStorage.getItem('motiv_fadeInTime');
    if (savedFadeInTime) {
      fadeInTime.value = savedFadeInTime;
    }

    const savedMelodyType = localStorage.getItem('motiv_melodyType');
    if (savedMelodyType) {
      melodyType.value = savedMelodyType;
    }

    const savedSnoozeDuration = localStorage.getItem('motiv_snoozeDuration');
    if (savedSnoozeDuration) {
      snoozeDuration.value = savedSnoozeDuration;
    }

    const savedMaxSnoozeCount = localStorage.getItem('motiv_maxSnoozeCount');
    if (savedMaxSnoozeCount) {
      maxSnoozeCount.value = savedMaxSnoozeCount;
    }

    // Сохранение настроек при изменении
    fadeInTime.addEventListener('change', () => {
      localStorage.setItem('motiv_fadeInTime', fadeInTime.value);
    });

    melodyType.addEventListener('change', () => {
      localStorage.setItem('motiv_melodyType', melodyType.value);
    });

    snoozeDuration.addEventListener('change', () => {
      localStorage.setItem('motiv_snoozeDuration', snoozeDuration.value);
    });

    maxSnoozeCount.addEventListener('change', () => {
      localStorage.setItem('motiv_maxSnoozeCount', maxSnoozeCount.value);
    });

    // Предпросмотр мелодии
    previewMelodyBtn.addEventListener('click', previewMelody);

    stopMelodyBtn.addEventListener('click', () => {
      stopMelody();
      showToast('Воспроизведение остановлено', 'info');
    });

    // Закрытие модальных окон при клике вне их
    alarmModal.addEventListener('click', (e) => {
      if (e.target === alarmModal) {
        alarmModal.classList.remove('show');
      }
    });

    timerModal.addEventListener('click', (e) => {
      if (e.target === timerModal) {
        timerModal.classList.remove('show');
      }
    });
  }

  // Инициализация приложения
  async function initApp() {
    // Инициализируем генератор мелодий
    await initMelodyGenerator();

    // Инициализируем обработчики событий
    initEventListeners();

    // Отображаем будильники и таймеры
    renderAlarms();
    renderTimers();

    // Планируем все включенные будильники
    alarms.filter(alarm => alarm.enabled).forEach(alarm => {
      scheduleAlarm(alarm);
    });

    // Обновляем статистику
    updateStats();

    // Показываем приветственное уведомление
    showToast('Доброе утро! Motiv Sunrise готов к работе', 'success');
  }

  // Запускаем приложение
  initApp();
