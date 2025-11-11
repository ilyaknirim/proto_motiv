
// Motiv Sunrise - объединенное приложение для будильников, таймеров и генератора мелодий

// Глобальные переменные
let manifest = null;
let mediaNodes = new Map(); // filename -> {audio, source, gain}
let alarmTimer = null;
let audioContext = null;
let userInteracted = false;
let countdownInterval = null;
let scheduledTarget = null;
let alarms = [];
let timers = [];
let activeTimers = new Map();

// Функция для отображения уведомлений
function showToast(message, type='info', timeout=3000){
  const root = document.getElementById('toast-root');
  if(!root) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  root.appendChild(el);
  // force reflow
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=> el.remove(), 300); }, timeout);
}

// Замена alert на toast
window._oldAlert = window.alert;
window.alert = function(msg){ showToast(msg, 'info', 3500); };

// Загрузка манифеста аудиофайлов
async function loadManifest(){
  try {
    const res = await fetch('./audio_manifest.json');
    manifest = await res.json();
  } catch(e){
    console.error('Не удалось загрузить manifest:', e);
    manifest = { audio: [] };
  }
}

// Инициализация аудио контекста
function ensureAudioContext(){
  if (audioContext) return audioContext;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioContext = new AC();
  } catch(e){
    console.warn('AudioContext не доступен:', e);
    audioContext = null;
  }
  return audioContext;
}

// Обработка первого взаимодействия пользователя
function onFirstUserGesture(){
  if (userInteracted) return;
  userInteracted = true;
  ensureAudioContext();
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(()=>{});
  }
}

// Создание медиа-узла для аудиофайла
function createMediaNode(filename){
  const audio = new Audio('./audio/' + encodeURIComponent(filename));
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  const info = { audio, source: null, gain: null };
  const ac = ensureAudioContext();
  if (ac){
    try {
      const source = ac.createMediaElementSource(audio);
      const gain = ac.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(ac.destination);
      info.source = source;
      info.gain = gain;
    } catch(e){
      console.warn('Не удалось создать MediaElementSource:', e);
    }
  }
  mediaNodes.set(filename, info);
  return info;
}

// Воспроизведение аудио с эффектом затухания
async function playAudioWithFade(filename, targetVol=0.8, fadeInSec=1.2){
  onFirstUserGesture();
  let info = mediaNodes.get(filename);
  if (!info) info = createMediaNode(filename);
  const audio = info.audio;
  await new Promise(resolve => {
    if (audio.readyState >= 3) return resolve();
    const t = setTimeout(()=> resolve(), 2500);
    audio.addEventListener('canplay', ()=>{ clearTimeout(t); resolve(); }, {once:true});
    audio.addEventListener('error', ()=>{ clearTimeout(t); resolve(); }, {once:true});
  });
  try { audio.pause(); audio.currentTime = 0; } catch(e){}
  if (info.gain && audioContext){
    const now = audioContext.currentTime;
    info.gain.gain.cancelScheduledValues(now);
    try {
      info.gain.gain.setValueAtTime(0.0001, now);
      info.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, targetVol), now + Math.max(0.01, fadeInSec));
    } catch(e){
      // some browsers don't like exponential from 0
      info.gain.gain.linearRampToValueAtTime(targetVol, now + Math.max(0.01, fadeInSec));
    }
  } else {
    try { audio.volume = targetVol; } catch(e){}
  }
  const p = audio.play();
  if (p && p.catch) p.catch(()=>{});
  return audio;
}

// Затухание и остановка аудио
function fadeOutAndPause(info, fadeOutSec=0.6){
  if (!info) return;
  const audio = info.audio;
  if (info.gain && audioContext){
    const now = audioContext.currentTime;
    try {
      info.gain.gain.cancelScheduledValues(now);
      info.gain.gain.setValueAtTime(info.gain.gain.value || 1, now);
      info.gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.01, fadeOutSec));
    } catch(e){
      info.gain.gain.linearRampToValueAtTime(0, now + Math.max(0.01, fadeOutSec));
    }
    setTimeout(()=>{ try{ audio.pause(); audio.currentTime=0; }catch(e){} }, Math.ceil((fadeOutSec+0.05)*1000));
  } else {
    try { audio.pause(); audio.currentTime = 0; } catch(e){}
  }
}

// Остановка всего аудио
function stopAllAudio(fadeOutSec=0.6){
  for (const info of mediaNodes.values()){
    try { fadeOutAndPause(info, fadeOutSec); } catch(e){}
  }
  if (typeof melodyGenerator !== 'undefined' && melodyGenerator && melodyGenerator.stop) {
    try{ melodyGenerator.stop(); }catch(e){}
  }
  if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.stop) {
    try{ natureSoundsGenerator.stop(); }catch(e){}
  }
  if (alarmTimer){ clearTimeout(alarmTimer); alarmTimer = null; scheduledTarget = null; updateCountdownDisplay(); }
}

// Отображение списка аудиофайлов
function renderList(){
  const container = document.getElementById('audioList');
  container.innerHTML = '';
  const list = manifest && manifest.audio ? manifest.audio : [];
  for (let i=0;i<list.length && i<200;i++){
    const name = list[i];
    const card = document.createElement('div');
    card.className = 'card';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div>${name}</div><div class="small">Нажмите ▶ чтобы проиграть</div>`;
    const btn = document.createElement('button');
    btn.textContent = '▶';
    btn.addEventListener('click', async ()=>{
      btn.textContent = '...';
      try {
        await playAudioWithFade(name, Number(document.getElementById('volume').value || 0.8), 0.8);
        btn.textContent = '❚❚';
      } catch(e){
        console.error(e);
        btn.textContent = '⚠';
        setTimeout(()=> btn.textContent = '▶', 800);
      }
    });
    card.appendChild(meta);
    card.appendChild(btn);
    container.appendChild(card);
  }
}

// Форматирование оставшегося времени
function formatTimeLeft(ms){
  if (!ms || ms <= 0) return '00:00:00';
  const s = Math.floor(ms/1000);
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return hh+':'+mm+':'+ss;
}

// Обновление отображения обратного отсчета
function updateCountdownDisplay(){
  const el = document.getElementById('countdown');
  if (!scheduledTarget) { el.textContent = 'Будильник не установлен'; document.getElementById('snooze').disabled = true; return; }
  const now = new Date();
  const ms = scheduledTarget - now;
  if (ms <= 0) {
    el.textContent = 'Будильник сработил';
    document.getElementById('snooze').disabled = false;
    return;
  }
  el.textContent = 'До будильника: ' + formatTimeLeft(ms);
  document.getElementById('snooze').disabled = false;
}

// Запуск обратного отсчета
function scheduleCountdown(){
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdownDisplay, 1000);
  updateCountdownDisplay();
}

// Функции для работы с сериями дней
function getStreak(){ return Number(localStorage.getItem('motiv_streak') || 0); }
function setStreak(n){ localStorage.setItem('motiv_streak', String(n)); document.getElementById('streakCount').textContent = String(n); }
function incrementStreak(){ setStreak(getStreak()+1); }

// Функции для работы со статистикой
function getStats(){
  try { return JSON.parse(localStorage.getItem('motiv_stats') || '[]'); } catch(e){ return []; }
}
function saveStats(arr){ localStorage.setItem('motiv_stats', JSON.stringify(arr)); }
function addStat(dateStr, status){
  const arr = getStats();
  arr.push({date: dateStr, status});
  // keep only last 30 for safety, we'll display last 7
  while(arr.length > 60) arr.shift();
  saveStats(arr);
  renderStats();
}

// Отображение статистики за последние 7 дней
function renderStats(){
  const canvas = document.getElementById('statsCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const stats = getStats();
  // build map for last 7 days
  const days = [];
  const today = new Date();
  for(let i=6;i>=0;i--){
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate()-i);
    const key = d.toISOString().slice(0,10);
    days.push({key, label: d.toLocaleDateString(undefined, {weekday:'short', day:'numeric'}) , status: 'none'});
  }
  for(const s of stats){
    const idx = days.findIndex(x=>x.key===s.date);
    if(idx>=0) days[idx].status = s.status;
  }
  // draw
  const W = canvas.width = canvas.clientWidth * devicePixelRatio;
  const H = canvas.height = 120 * devicePixelRatio;
  ctx.clearRect(0,0,W,H);
  const pad = 12 * devicePixelRatio;
  const barW = (W - pad*2) / 7 - 10*devicePixelRatio;
  for(let i=0;i<7;i++){
    const x = pad + i*(barW + 10*devicePixelRatio);
    const y = H - pad;
    const st = days[i].status;
    let color = '#334155'; // none/dim
    if(st === 'on-time') color = '#10b981'; // green
    else if(st === 'snooze') color = '#f59e0b'; // yellow
    else if(st === 'miss') color = '#ef4444'; // red
    const h = (st === 'none') ? 10*devicePixelRatio : (50 + (i%3)*10) * devicePixelRatio;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - h, barW, h);
    // label
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10*devicePixelRatio}px sans-serif`;
    ctx.fillText(days[i].label, x, y + 14*devicePixelRatio);
  }
}

// Установка будильника
function setWakeUp(timeStr){
  if (alarmTimer){ clearTimeout(alarmTimer); alarmTimer = null; scheduledTarget = null; }
  const now = new Date();
  const [hh, mm] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const ms = target - now;
  scheduledTarget = target;
  scheduleCountdown();
  alarmTimer = setTimeout(async ()=>{
    try {
      const vol = Number(document.getElementById('volume').value) || 0.8;
      // 1) soft track
      const soft = (manifest && manifest.audio && manifest.audio.length) ? manifest.audio[0] : null;
      if (soft) await playAudioWithFade(soft, Math.min(0.35, vol*0.45), 2.8);
      // 2) after 18s start nature generator (if available)
      setTimeout(()=>{
        try {
          if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.generateAndPlay){
            natureSoundsGenerator.generateAndPlay({environment: 'morning', duration: 120, fadeInTime: 12});
          }
        } catch(e){ console.error(e); }
      }, 18000);
      // 3) before playing motivational clip, fade out generator smoothly
      setTimeout(async ()=>{
        try {
          if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.fadeOutAndStop){
            // if generator provides fadeOutAndStop API
            try { natureSoundsGenerator.fadeOutAndStop(2.0); } catch(e){ natureSoundsGenerator.stop(); }
          } else if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.stop){
            // best-effort stop with slight delay
            try { natureSoundsGenerator.stop(); } catch(e) {}
          }
        } catch(e){ console.error(e); }
      }, 32000);
      // 4) after 35s play motivational clip
      setTimeout(async ()=>{
        const idx = Math.floor(Math.random()*(manifest && manifest.audio ? manifest.audio.length : 1));
        const file = manifest.audio[idx];
        await playAudioWithFade(file, Math.min(1, vol), 1.2);
      }, 35000);
      // mark scheduledTarget as fired
      scheduledTarget = null;
      updateCountdownDisplay();
    } catch(e){ console.error(e); }
    alarmTimer = null;
  }, ms);
  showToast('Будильник установлен на '+ target.toLocaleString(), 'success');
  scheduleCountdown();
}

// Функция отложить будильник
function snoozeFive(){
  if (!scheduledTarget && !alarmTimer) {
    showToast('Будильник не установлен', 'warn');
    return;
  }
  // cancel current audio and generator
  stopAllAudio(0.6);
  const now = new Date();
  const newTarget = new Date(now.getTime() + 5*60*1000);
  const hh = String(newTarget.getHours()).padStart(2,'0');
  const mm = String(newTarget.getMinutes()).padStart(2,'0');
  setWakeUp(hh + ':' + mm);
  showToast('Будильник отложен на 5 минут', 'info');
}

// Функция "Я проснулся"
function imAwake(){
  stopAllAudio(0.6);
  incrementStreak();
  const key = new Date().toISOString().slice(0,10);
  addStat(key, 'on-time');
  showToast('Отлично! Серия увеличена.', 'success');
}

// Функции для работы с будильниками
function saveAlarms() {
  localStorage.setItem('motiv_alarms', JSON.stringify(alarms));
}

function renderAlarms() {
  const alarmsList = document.getElementById('alarmsList');
  alarmsList.innerHTML = '';
  alarms.forEach(alarm => {
    const alarmItem = document.createElement('div');
    alarmItem.className = `alarm-item ${alarm.enabled ? 'active' : ''}`;

    alarmItem.innerHTML = `
      <div class="alarm-left">
        <div class="alarm-switch ${alarm.enabled ? 'active' : ''}" data-id="${alarm.id}"></div>
        <div>
          <div class="alarm-time">${alarm.time}</div>
          <div class="alarm-label">${alarm.label}</div>
        </div>
      </div>
      <div class="alarm-right">
        <button class="alarm-settings" data-id="${alarm.id}">⚙️</button>
        <button class="alarm-delete" data-id="${alarm.id}">🗑️</button>
      </div>
    `;

    alarmsList.appendChild(alarmItem);
  });
}

function addNewAlarm() {
  const newAlarm = {
    id: Date.now(),
    time: '07:00',
    label: 'Новый будильник',
    enabled: true,
    melodyType: 'calm',
    fadeInTime: 60,
    duration: 180,
    startVolume: 0.1,
    maxVolume: 0.8,
    preAlarm: 0
  };
  alarms.push(newAlarm);
  saveAlarms();
  renderAlarms();
  openAlarmSettings(newAlarm.id);
}

function openAlarmSettings(alarmId) {
  const alarm = alarms.find(a => a.id === alarmId);
  if (!alarm) return;

  const modal = document.createElement('div');
  modal.className = 'alarm-modal show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Настройки будильника</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label>Время</label>
          <input type="time" id="alarmTime" value="${alarm.time}">
        </div>
        <div class="modal-field">
          <label>Название</label>
          <input type="text" id="alarmLabel" value="${alarm.label}">
        </div>
        <div class="modal-field">
          <label>Тип мелодии</label>
          <select id="alarmMelodyType">
            <option value="calm" ${alarm.melodyType === 'calm' ? 'selected' : ''}>Спокойная</option>
            <option value="gentle" ${alarm.melodyType === 'gentle' ? 'selected' : ''}>Нежная</option>
            <option value="peaceful" ${alarm.melodyType === 'peaceful' ? 'selected' : ''}>Мирная</option>
            <option value="nature" ${alarm.melodyType === 'nature' ? 'selected' : ''}>Звуки природы</option>
          </select>
        </div>
        <div class="modal-field">
          <label>Длительность нарастания</label>
          <select id="alarmFadeInTime">
            <option value="30" ${alarm.fadeInTime == 30 ? 'selected' : ''}>30 сек</option>
            <option value="60" ${alarm.fadeInTime == 60 ? 'selected' : ''}>1 мин</option>
            <option value="90" ${alarm.fadeInTime == 90 ? 'selected' : ''}>1.5 мин</option>
            <option value="120" ${alarm.fadeInTime == 120 ? 'selected' : ''}>2 мин</option>
          </select>
        </div>
        <div class="modal-field">
          <label>Общая длительность</label>
          <select id="alarmDuration">
            <option value="120" ${alarm.duration == 120 ? 'selected' : ''}>2 мин</option>
            <option value="180" ${alarm.duration == 180 ? 'selected' : ''}>3 мин</option>
            <option value="240" ${alarm.duration == 240 ? 'selected' : ''}>4 мин</option>
            <option value="300" ${alarm.duration == 300 ? 'selected' : ''}>5 мин</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn secondary" id="cancelAlarm">Отмена</button>
        <button class="modal-btn primary" id="saveAlarm">Сохранить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('#cancelAlarm').addEventListener('click', () => modal.remove());
  modal.querySelector('#saveAlarm').addEventListener('click', () => {
    alarm.time = modal.querySelector('#alarmTime').value;
    alarm.label = modal.querySelector('#alarmLabel').value;
    alarm.melodyType = modal.querySelector('#alarmMelodyType').value;
    alarm.fadeInTime = parseInt(modal.querySelector('#alarmFadeInTime').value);
    alarm.duration = parseInt(modal.querySelector('#alarmDuration').value);
    saveAlarms();
    renderAlarms();
    modal.remove();
  });
}

// Функции для работы с таймерами
function saveTimers() {
  localStorage.setItem('motiv_timers', JSON.stringify(timers));
}

function renderTimers() {
  const timersList = document.getElementById('timersList');
  timersList.innerHTML = '';
  timers.forEach(timer => {
    const timerItem = document.createElement('div');
    timerItem.className = 'timer-item';

    const minutes = Math.floor(timer.duration / 60);
    const seconds = timer.duration % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    timerItem.innerHTML = `
      <div class="timer-left">
        <div class="timer-display">${timeDisplay}</div>
        <div class="timer-label">${timer.label}</div>
      </div>
      <div class="timer-controls">
        <button class="timer-play" data-id="${timer.id}">▶️</button>
        <button class="timer-pause" data-id="${timer.id}" style="display:none">⏸️</button>
        <button class="timer-reset" data-id="${timer.id}">🔄</button>
      </div>
      <div class="timer-right">
        <button class="timer-settings" data-id="${timer.id}">⚙️</button>
        <button class="timer-delete" data-id="${timer.id}">🗑️</button>
      </div>
    `;

    timersList.appendChild(timerItem);
  });
}

function addNewTimer() {
  const newTimer = {
    id: Date.now(),
    duration: 300,
    label: 'Новый таймер',
    melodyType: 'gentle',
    fadeInTime: 30,
    startVolume: 0.2,
    maxVolume: 0.9
  };
  timers.push(newTimer);
  saveTimers();
  renderTimers();
  openTimerSettings(newTimer.id);
}

function openTimerSettings(timerId) {
  const timer = timers.find(t => t.id === timerId);
  if (!timer) return;

  const modal = document.createElement('div');
  modal.className = 'timer-modal show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Настройки таймера</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label>Длительность (минуты)</label>
          <input type="number" id="timerDuration" value="${Math.floor(timer.duration / 60)}" min="1" max="60">
        </div>
        <div class="modal-field">
          <label>Название</label>
          <input type="text" id="timerLabel" value="${timer.label}">
        </div>
        <div class="modal-field">
          <label>Тип мелодии</label>
          <select id="timerMelodyType">
            <option value="calm" ${timer.melodyType === 'calm' ? 'selected' : ''}>Спокойная</option>
            <option value="gentle" ${timer.melodyType === 'gentle' ? 'selected' : ''}>Нежная</option>
            <option value="peaceful" ${timer.melodyType === 'peaceful' ? 'selected' : ''}>Мирная</option>
            <option value="nature" ${timer.melodyType === 'nature' ? 'selected' : ''}>Звуки природы</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn secondary" id="cancelTimer">Отмена</button>
        <button class="modal-btn primary" id="saveTimer">Сохранить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('#cancelTimer').addEventListener('click', () => modal.remove());
  modal.querySelector('#saveTimer').addEventListener('click', () => {
    timer.duration = parseInt(modal.querySelector('#timerDuration').value) * 60;
    timer.label = modal.querySelector('#timerLabel').value;
    timer.melodyType = modal.querySelector('#timerMelodyType').value;
    saveTimers();
    renderTimers();
    modal.remove();
  });
}

function startTimer(timerId) {
  const timer = timers.find(t => t.id === timerId);
  if (!timer) return;

  let remainingTime = timer.duration;
  const timerItem = document.querySelector(`[data-id="${timerId}"].timer-item`);
  const display = timerItem.querySelector('.timer-display');
  const playBtn = timerItem.querySelector('.timer-play');
  const pauseBtn = timerItem.querySelector('.timer-pause');

  playBtn.style.display = 'none';
  pauseBtn.style.display = 'flex';

  const interval = setInterval(() => {
    remainingTime--;
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (remainingTime <= 0) {
      clearInterval(interval);
      activeTimers.delete(timerId);
      // Trigger alarm sound
      if (typeof melodyGenerator !== 'undefined' && melodyGenerator.generateAndPlay) {
        melodyGenerator.generateAndPlay({
          mood: timer.melodyType,
          duration: 60,
          fadeInTime: 10,
          startVolume: timer.startVolume,
          maxVolume: timer.maxVolume
        });
      }
      resetTimer(timerId);
    }
  }, 1000);

  activeTimers.set(timerId, { interval, remainingTime });
}

function pauseTimer(timerId) {
  const timerData = activeTimers.get(timerId);
  if (timerData) {
    clearInterval(timerData.interval);
    activeTimers.delete(timerId);

    const timerItem = document.querySelector(`[data-id="${timerId}"].timer-item`);
    const playBtn = timerItem.querySelector('.timer-play');
    const pauseBtn = timerItem.querySelector('.timer-pause');

    playBtn.style.display = 'flex';
    pauseBtn.style.display = 'none';
  }
}

function resetTimer(timerId) {
  const timer = timers.find(t => t.id === timerId);
  if (!timer) return;

  const timerData = activeTimers.get(timerId);
  if (timerData) {
    clearInterval(timerData.interval);
    activeTimers.delete(timerId);
  }

  const timerItem = document.querySelector(`[data-id="${timerId}"].timer-item`);
  const display = timerItem.querySelector('.timer-display');
  const playBtn = timerItem.querySelector('.timer-play');
  const pauseBtn = timerItem.querySelector('.timer-pause');

  const minutes = Math.floor(timer.duration / 60);
  const seconds = timer.duration % 60;
  display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  playBtn.style.display = 'flex';
  pauseBtn.style.display = 'none';
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async ()=>{
  // Установка темной темы
  document.body.classList.add('theme-dark');
  showToast('Доброе утро! Motiv Sunrise готов к работе', 'success', 2500);

  // Инициализация обработчиков жестов
  ['click','keydown','touchstart'].forEach(evt => document.addEventListener(evt, onFirstUserGesture, {once:true}));

  // Загрузка манифеста и отображение списка аудио
  await loadManifest();
  renderList();

  // Инициализация счетчика серий
  document.getElementById('streakCount').textContent = String(getStreak());

  // Инициализация генератора мелодий
  try {
    if (typeof initMelodyGenerator === 'function') {
      initMelodyGenerator();
    }
  } catch(e){ console.warn('initMelodyGenerator error', e); }

  // Загрузка сохраненных будильников и таймеров
  alarms = JSON.parse(localStorage.getItem('motiv_alarms') || '[]');
  timers = JSON.parse(localStorage.getItem('motiv_timers') || '[]');

  // Создание будильника по умолчанию
  if (alarms.length === 0) {
    alarms.push({
      id: Date.now(),
      time: '07:00',
      label: 'Будильник',
      enabled: true,
      melodyType: 'calm',
      fadeInTime: 60,
      duration: 180,
      startVolume: 0.1,
      maxVolume: 0.8,
      preAlarm: 0
    });
    saveAlarms();
  }

  // Создание таймера по умолчанию
  if (timers.length === 0) {
    timers.push({
      id: Date.now(),
      duration: 300, // 5 минут
      label: 'Таймер',
      melodyType: 'gentle',
      fadeInTime: 30,
      startVolume: 0.2,
      maxVolume: 0.9
    });
    saveTimers();
  }

  // Отображение будильников и таймеров
  renderAlarms();
  renderTimers();
  renderStats();

  // Заполнение пропущенных дней статистики
  const stats = getStats();
  const todayKey = new Date().toISOString().slice(0,10);
  // ensure only one miss per previous day: fill up last 7 days
  const now = new Date();
  for(let i=1;i<=7;i++){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
    const key = d.toISOString().slice(0,10);
    if(!stats.find(s=>s.date===key)){
      // mark as miss
      stats.push({date:key, status:'miss'});
    }
  }
  saveStats(stats);
  renderStats();

  // Обработчики событий
  document.addEventListener('click', (e) => {
    // Обработка переключателей будильников
    if (e.target.classList.contains('alarm-switch')) {
      const id = parseInt(e.target.dataset.id);
      const alarm = alarms.find(a => a.id === id);
      if (alarm) {
        alarm.enabled = !alarm.enabled;
        saveAlarms();
        renderAlarms();
      }
    }

    // Обработка кнопок настроек и удаления будильников
    if (e.target.classList.contains('alarm-settings')) {
      const id = parseInt(e.target.dataset.id);
      openAlarmSettings(id);
    }

    if (e.target.classList.contains('alarm-delete')) {
      const id = parseInt(e.target.dataset.id);
      alarms = alarms.filter(a => a.id !== id);
      saveAlarms();
      renderAlarms();
    }

    if (e.target.id === 'addAlarmBtn') {
      addNewAlarm();
    }

    // Обработка кнопок таймеров
    if (e.target.classList.contains('timer-play')) {
      const id = parseInt(e.target.dataset.id);
      startTimer(id);
    }

    if (e.target.classList.contains('timer-pause')) {
      const id = parseInt(e.target.dataset.id);
      pauseTimer(id);
    }

    if (e.target.classList.contains('timer-reset')) {
      const id = parseInt(e.target.dataset.id);
      resetTimer(id);
    }

    if (e.target.classList.contains('timer-settings')) {
      const id = parseInt(e.target.dataset.id);
      openTimerSettings(id);
    }

    if (e.target.classList.contains('timer-delete')) {
      const id = parseInt(e.target.dataset.id);
      timers = timers.filter(t => t.id !== id);
      saveTimers();
      renderTimers();
    }

    if (e.target.id === 'addTimerBtn') {
      addNewTimer();
    }

    if (e.target.id === 'stopAll') {
      stopAllAudio();
    }
  });

  // Обработчик кнопки "Отложить"
  const snoozeBtn = document.getElementById('snooze');
  const snoozeSel = document.getElementById('snoozeSelect');
  snoozeBtn.addEventListener('click', ()=>{
    const minutes = Number(snoozeSel.value) || 5;
    // compute new target +minutes from now
    const now = new Date();
    const newTarget = new Date(now.getTime() + minutes*60*1000);
    const hh = String(newTarget.getHours()).padStart(2,'0');
    const mm = String(newTarget.getMinutes()).padStart(2,'0');
    // stop current audio, then set new wakeup
    if(typeof stopAllAudio === 'function') stopAllAudio(0.6);
    if(typeof setWakeUp === 'function') setWakeUp(hh + ':' + mm);
    // record stat as snooze for today
    const key = now.toISOString().slice(0,10);
    addStat(key, 'snooze');
    showToast('Будильник отложен на ' + minutes + ' минут', 'info');
  });

  // Обработчик кнопки "Я проснулся"
  const imBtn = document.getElementById('imAwake');
  imBtn.addEventListener('click', imAwake);

  // Обработчики генератора мелодий
  document.getElementById('genPlay').addEventListener('click', ()=>{
    const mood = document.getElementById('moodSelect').value || 'calm';
    if (typeof melodyGenerator !== 'undefined' && melodyGenerator && melodyGenerator.generateAndPlay) {
      melodyGenerator.generateAndPlay({mood: mood, duration: 180, fadeInTime: 60});
    } else if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.generateAndPlay) {
      // Fallback к старому генератору
      const env = mood === 'calm' ? 'morning' : mood === 'gentle' ? 'forest' : 'ocean';
      natureSoundsGenerator.generateAndPlay({environment: env, duration: 90, fadeInTime: 8});
    } else {
      showToast('Генератор недоступен в этом окружении', 'warn');
    }

    // Анимация восхода
    const sun = document.getElementById('sunrise');
    sun.classList.remove('animate');
    // force reflow to restart animation
    void sun.offsetWidth;
    sun.classList.add('animate');
  });

  document.getElementById('genStop').addEventListener('click', ()=>{
    if (typeof melodyGenerator !== 'undefined' && melodyGenerator && melodyGenerator.stop) {
      try { melodyGenerator.stop(); } catch(e){}
    } else if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.stop) {
      try { natureSoundsGenerator.stop(); } catch(e){}
    }
  });
});
