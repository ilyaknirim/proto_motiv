
// Enhanced app_integration.js - snooze, countdown, streaks, fade controls, PWA friendly

let manifest = null;
let mediaNodes = new Map(); // filename -> {audio, source, gain}
let alarmTimer = null;
let audioContext = null;
let userInteracted = false;
let countdownInterval = null;
let scheduledTarget = null;

async function loadManifest(){
  try {
    const res = await fetch('./audio_manifest.json');
    manifest = await res.json();
  } catch(e){
    console.error('Не удалось загрузить manifest:', e);
    manifest = { audio: [] };
  }
}

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

function onFirstUserGesture(){
  if (userInteracted) return;
  userInteracted = true;
  ensureAudioContext();
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(()=>{});
  }
}

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

// countdown / UI helpers
function formatTimeLeft(ms){
  if (!ms || ms <= 0) return '00:00:00';
  const s = Math.floor(ms/1000);
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return hh+':'+mm+':'+ss;
}
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

function scheduleCountdown(){
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdownDisplay, 1000);
  updateCountdownDisplay();
}

// streaks using localStorage
function getStreak(){ return Number(localStorage.getItem('motiv_streak') || 0); }
function setStreak(n){ localStorage.setItem('motiv_streak', String(n)); document.getElementById('streakCount').textContent = String(n); }
function incrementStreak(){ setStreak(getStreak()+1); }

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
  alert('Будильник установлен на '+ target.toLocaleString());
  scheduleCountdown();
}

// snooze +5 minutes
function snoozeFive(){
  if (!scheduledTarget && !alarmTimer) {
    alert('Будильник не установлен');
    return;
  }
  // cancel current audio and generator
  stopAllAudio(0.6);
  const now = new Date();
  const newTarget = new Date(now.getTime() + 5*60*1000);
  const hh = String(newTarget.getHours()).padStart(2,'0');
  const mm = String(newTarget.getMinutes()).padStart(2,'0');
  setWakeUp(hh + ':' + mm);
  alert('Будильник отложен на 5 минут');
}

// I'm awake button: stop everything and increment streak
function imAwake(){
  stopAllAudio(0.6);
  incrementStreak();
  alert('Отлично! Серия увеличена.');
}

// register UI events and init
document.addEventListener('DOMContentLoaded', async ()=>{
  ['click','keydown','touchstart'].forEach(evt => document.addEventListener(evt, onFirstUserGesture, {once:true}));
  await loadManifest();
  renderList();
  // init streak display
  document.getElementById('streakCount').textContent = String(getStreak());

  try {
    if (typeof initMelodyGenerator === 'function') {
      initMelodyGenerator();
    }
  } catch(e){ console.warn('initMelodyGenerator error', e); }

  document.getElementById('setWake').addEventListener('click', ()=>{
    const t = document.getElementById('wakeTime').value;
    if (!t){ alert('Укажите время'); return; }
    setWakeUp(t);
  });
  document.getElementById('stopAll').addEventListener('click', ()=>{
    stopAllAudio();
  });
  document.getElementById('genPlay').addEventListener('click', ()=>{
    const mood = document.getElementById('moodSelect').value || 'calm';
    if (typeof melodyGenerator !== 'undefined' && melodyGenerator && melodyGenerator.generateAndPlay) {
      melodyGenerator.generateAndPlay({mood: mood, duration: 180, fadeInTime: 60});
    } else if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.generateAndPlay) {
      // Fallback к старому генератору
      const env = mood === 'calm' ? 'morning' : mood === 'gentle' ? 'forest' : 'ocean';
      natureSoundsGenerator.generateAndPlay({environment: env, duration: 90, fadeInTime: 8});
    } else {
      alert('Генератор недоступен в этом окружении');
    }
  });
  document.getElementById('genStop').addEventListener('click', ()=>{
    if (typeof melodyGenerator !== 'undefined' && melodyGenerator && melodyGenerator.stop) {
      try { melodyGenerator.stop(); } catch(e){}
    } else if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.stop) {
      try { natureSoundsGenerator.stop(); } catch(e){}
    }
  });
  document.getElementById('snooze').addEventListener('click', snoozeFive);
  document.getElementById('imAwake').addEventListener('click', imAwake);
});
