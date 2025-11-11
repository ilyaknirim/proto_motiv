
// Motiv Sunrise v2.0 - Оптимизированное приложение для будильников, таймеров и генератора мелодий

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
