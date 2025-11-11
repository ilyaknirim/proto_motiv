
// app_integration_v3.js - adds snooze options, stats, sunrise animation
import './app_integration.js'; // ensure previous logic available (note: actual functions are global in app_integration.js)

// We'll interact with global functions defined in app_integration.js: setWakeUp, stopAllAudio, etc.
// For safety, reimplement small helpers here if not present.

// Stats: store last7 entries in localStorage as array of objects {date: 'YYYY-MM-DD', status: 'on-time'|'snooze'|'miss'}
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

// render last 7 days histogram
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

// attach snooze behavior: call existing setWakeUp with new target
document.addEventListener('DOMContentLoaded', ()=>{
  renderStats();
  // hook snooze button
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
    alert('Будильник отложен на ' + minutes + ' минут');
  });

  // imAwake should stop audio and increment streak and stats
  const imBtn = document.getElementById('imAwake');
  imBtn.addEventListener('click', ()=>{
    if(typeof stopAllAudio === 'function') stopAllAudio(0.6);
    if(typeof incrementStreak === 'function') incrementStreak();
    // record on-time for today
    const key = new Date().toISOString().slice(0,10);
    addStat(key, 'on-time');
    alert('Отлично! Серия увеличена.');
  });

  // when alarm is scheduled/fired we need to mark miss if expired without action - this is complex;
  // as a simple heuristic: when the page loads, mark previous days with no entry as 'miss'
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

  // sunrise animation trigger when generator plays: listen to genPlay button and animate sunrise
  const genPlay = document.getElementById('genPlay');
  genPlay.addEventListener('click', ()=>{
    const sun = document.getElementById('sunrise');
    sun.classList.remove('animate');
    // force reflow to restart animation
    void sun.offsetWidth;
    sun.classList.add('animate');
  });
});
