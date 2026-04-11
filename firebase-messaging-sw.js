// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ✅ Firebase 설정
firebase.initializeApp({
  apiKey: "AIzaSyALUxNcmy9qUxSpVXalATZwqVBKBimziQc",
  authDomain: "safe-yj.firebaseapp.com",
  projectId: "safe-yj",
  storageBucket: "safe-yj.firebasestorage.app",
  messagingSenderId: "431566844297",
  appId: "1:431566844297:web:7736c329a53969a96cb158",
  measurementId: "G-D4VT257P6K"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const {
    sender, receiver, latitude, longitude,
    mapsUrl, title: dataTitle, body: dataBody, emergency
  } = payload.data || {};

  const isEmergency = emergency === 'true';

  // iOS 알림은 색상 커스텀 불가 → 이모지로 긴급 표현
  const title = isEmergency
    ? (sender === 'yj'
        ? '🚨🚨 긴급!! 연주에게 무슨 일이 생겼나봐요!!'
        : '🚨🚨 긴급!! 병철이에게 무슨 일이 생겼나봐요!!')
    : (dataTitle || (sender === 'yj'
        ? '🏃\u200d♀️ 연주가 집에 간대요!'
        : '🏃\u200d♂️ 병철이가 집에 간대요!'));

  const body = isEmergency
    ? `얼른 전화해보세요!! 📍 ${dataBody || ''}`
    : (dataBody || (latitude
        ? `📍 ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
        : '지금 출발했대요!'));

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    // 긴급은 별도 tag로 일반 알림과 구분 (기존 알림 안 덮어씀)
    tag: isEmergency ? 'emergency-alert' : 'home-alert',
    renotify: true,
    requireInteraction: isEmergency,  // 긴급은 직접 닫기 전까지 유지
    vibrate: isEmergency
      ? [400, 100, 400, 100, 400, 100, 400]  // 긴급: 강한 진동
      : [200, 80, 200],
    data: { mapsUrl, receiver },
    actions: [
      { action: 'open-map', title: '📍 위치 보기' },
      { action: 'dismiss',  title: isEmergency ? '📞 확인함' : '확인 ✓' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { mapsUrl, receiver } = event.notification.data || {};
  if (event.action === 'open-map' && mapsUrl) {
    event.waitUntil(clients.openWindow(mapsUrl));
  } else {
    event.waitUntil(clients.openWindow(`/${receiver}.html`));
  }
});
