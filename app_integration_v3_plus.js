
// app_integration_v3_plus.js - adds toast notifications and small UX polish
import './app_integration_v3.js';

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

// replace alert calls with toasts where possible by wrapping global alert
window._oldAlert = window.alert;
window.alert = function(msg){ showToast(msg, 'info', 3500); };

document.addEventListener('DOMContentLoaded', ()=>{
  // default to dark theme; body background already dark
  document.body.classList.add('theme-dark');
  showToast('Доброе утро! Motiv Sunrise готов к работе', 'success', 2500);
});
