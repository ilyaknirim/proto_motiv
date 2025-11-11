
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
