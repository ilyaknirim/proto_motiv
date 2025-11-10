
import manifest from './audio_manifest.json' assert { type: 'json' };

let audioCache = new Map();
let alarmTimer = null;

function encodePath(name){ return './audio/' + encodeURIComponent(name); }

async function playAudio(name, vol=0.8){
  let audio = audioCache.get(name);
  if (!audio){
    audio = new Audio(encodePath(name));
    audio.preload = 'auto';
    audioCache.set(name, audio);
    await new Promise(resolve => {
      audio.addEventListener('canplay', ()=> resolve(), {once:true});
      setTimeout(()=> resolve(), 2000);
    });
  } else {
    audio.pause();
    audio.currentTime = 0;
  }
  audio.volume = vol;
  audio.play();
  return audio;
}

function stopAllAudio(){
  for(const a of audioCache.values()){
    try{ a.pause(); a.currentTime = 0; }catch(e){}
  }
  if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.stop) {
    try{ natureSoundsGenerator.stop(); }catch(e){}
  }
  if (alarmTimer){ clearTimeout(alarmTimer); alarmTimer = null; }
}

function renderList(){
  const container = document.getElementById('audioList');
  container.innerHTML = '';
  const list = manifest.audio; // show all but cap to 200 cards for layout
  for (let i=0;i<list.length;i++){
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
      await playAudio(name, Number(document.getElementById('volume').value));
      btn.textContent = '❚❚';
    });
    card.appendChild(meta);
    card.appendChild(btn);
    container.appendChild(card);
    if (i>=199) break; // avoid rendering too many DOM nodes
  }
}

async function setWakeUp(timeStr){
  if (alarmTimer){ clearTimeout(alarmTimer); alarmTimer = null; }
  const now = new Date();
  const [hh, mm] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const ms = target - now;
  console.log('Alarm set for', target.toString(), 'in', ms, 'ms');
  alarmTimer = setTimeout(async ()=>{
    // sequence: soft audio -> nature generator -> motivational clip
    try {
      const vol = Number(document.getElementById('volume').value) || 0.8;
      // 1) soft track (choose first in manifest)
      const soft = manifest.audio[0];
      const a = await playAudio(soft, Math.min(0.35, vol*0.45));
      // after 20s start nature generator
      setTimeout(()=>{
        try {
          if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.generateAndPlay){
            natureSoundsGenerator.generateAndPlay({environment: 'morning', duration: 120, fadeInTime: 15});
          }
        } catch(e){ console.error(e); }
      }, 20000);
      // after 40s play motivational clip
      setTimeout(async ()=>{
        const idx = Math.floor(Math.random()*manifest.audio.length);
        const file = manifest.audio[idx];
        await playAudio(file, Math.min(1, vol));
      }, 40000);
    } catch(e){ console.error(e); }
    alarmTimer = null;
  }, ms);
  alert('Будильник установлен на '+ target.toLocaleString());
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // wait for generator initialization
  if (typeof initMelodyGenerator === 'function') {
    try { initMelodyGenerator(); } catch(e){ console.warn(e); }
  }
  renderList();
  document.getElementById('setWake').addEventListener('click', ()=>{
    const t = document.getElementById('wakeTime').value;
    if (!t){ alert('Укажите время'); return; }
    setWakeUp(t);
  });
  document.getElementById('stopAll').addEventListener('click', ()=>{
    stopAllAudio();
  });
  document.getElementById('genPlay').addEventListener('click', ()=>{
    const env = document.getElementById('envSelect').value || 'forest';
    if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.generateAndPlay) {
      natureSoundsGenerator.generateAndPlay({environment: env, duration: 90, fadeInTime: 8});
    } else {
      alert('Генератор недоступен в этом окружении');
    }
  });
  document.getElementById('genStop').addEventListener('click', ()=>{
    if (typeof natureSoundsGenerator !== 'undefined' && natureSoundsGenerator && natureSoundsGenerator.stop) {
      natureSoundsGenerator.stop();
    }
  });
});
