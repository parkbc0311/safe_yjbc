// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ✅ Firebase 설정
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { from, to, latitude, longitude, mapsUrl, message } = payload.data || {};

  const TITLES = {
    yj: "🏃‍♀️ YJ가 집에 간대요!",
    bc: "🏃‍♂️ BC가 집에 간대요!",
  };

  const title = TITLES[from] || "🏠 귀가 알림!";
  const body = message || (latitude
    ? `📍 ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
    : "지금 출발했대요!");

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    tag: 'home-alert',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 80, 200],
    data: { mapsUrl, to },
    actions: [
      { action: 'open-map', title: '📍 위치 보기' },
      { action: 'dismiss',  title: '확인 ✓' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { mapsUrl, to } = event.notification.data || {};
  if (event.action === 'open-map' && mapsUrl) {
    event.waitUntil(clients.openWindow(mapsUrl));
  } else {
    event.waitUntil(clients.openWindow(`/${to}.html`));
  }
});
