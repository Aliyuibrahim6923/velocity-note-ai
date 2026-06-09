import { dbService } from './db';

let alarmInterval = null;

export function initializeAlarms() {
  if (alarmInterval) clearInterval(alarmInterval);

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Poll every 10 seconds
  alarmInterval = setInterval(async () => {
    try {
      const items = await dbService.queryItems({ limit: 1000 });
      const now = Date.now();
      
      for (const item of items) {
        if (item.category === 'ACTION_ITEM' || item.category === 'CALENDAR_EVENT') {
          let meta = {};
          try { meta = JSON.parse(item.metadata_json); } catch { continue; }
          
          if (meta && meta.due_date && !item.notified) {
            const dueDate = new Date(meta.due_date).getTime();
            
            // If the item is due (or past due) and not yet notified
            if (dueDate > 0 && dueDate <= now) {
              triggerAlarm(item.raw_text);
              
              // Mark as notified so we don't spam
              item.notified = true;
              await dbService.saveItem(item);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Alarm polling error:", e);
    }
  }, 10000); 
}

function triggerAlarm(text) {
  // 1. Show Web Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Blitz Reminder', {
      body: text,
      icon: '/vite.svg'
    });
  }
  
  // 2. Play Audio Alarm Tone (subtle beep)
  try {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.volume = 0.5;
    audio.play().catch(e => console.warn('Audio play failed (maybe require user interaction first):', e));
  } catch { /* ignore */ }
}
