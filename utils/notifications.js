import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 設定通知處理方式
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 請求通知權限
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('❌ Notification permissions not granted');
    return false;
  }
  
  console.log('✅ Notification permissions granted');
  return true;
}

// 排程每日提醒通知
export async function scheduleReminders(times = ['09:00', '14:00', '20:00']) {
  // 先取消所有現有的排程通知
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  const messages = [
    '早安！該記錄你現在的心情了 ☀️',
    '午安！來記錄一下你的心情狀態吧 🌤️',
    '晚安！別忘了記錄今天的心情 🌙'
  ];
  
  for (let i = 0; i < times.length; i++) {
    const [hours, minutes] = times[i].split(':').map(Number);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'EmoGo 情緒記錄提醒',
        body: messages[i] || '該記錄你的心情了！',
        data: { type: 'reminder' },
        sound: true,
      },
      trigger: {
        type: 'daily',
        hour: hours,
        minute: minutes,
      },
    });
    
    console.log(`✅ Scheduled reminder at ${times[i]}`);
  }
}

// 取消所有排程通知
export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🗑️ All reminders cancelled');
}

// 取得所有排程的通知
export async function getScheduledReminders() {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications;
}

// 發送即時測試通知
export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '測試通知 🎉',
      body: '通知功能運作正常！',
      data: { type: 'test' },
    },
    trigger: null, // 立即發送
  });
}

