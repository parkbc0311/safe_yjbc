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
  const { sender, receiver, latitude, longitude, mapsUrl, body: messageBody } = payload.data || {};

  const TITLES = {
    yj: "🏃‍♀️ YJ가 집에 간대요!",
    bc: "🏃‍♂️ BC가 집에 간대요!",
  };

  const title = TITLES[sender] || "🏠 귀가 알림!";
  const body = messageBody || (latitude
    ? `📍 ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
    : "지금 출발했대요!");

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    tag: 'home-alert',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 80, 200],
    data: { mapsUrl, receiver },
    actions: [
      { action: 'open-map', title: '📍 위치 보기' },
      { action: 'dismiss',  title: '확인 ✓' }
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
