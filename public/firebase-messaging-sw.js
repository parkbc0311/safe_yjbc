// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

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

// ✅ onBackgroundMessage는 등록하지 않음
// Cloud Function의 webpush.notification이 알림을 직접 표시하므로
// 여기서 showNotification을 추가로 호출하면 이중 알림 발생

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { mapsUrl, receiver } = event.notification.data || {};
  if (event.action === 'open-map' && mapsUrl) {
    event.waitUntil(clients.openWindow(mapsUrl));
  } else {
    // 알림 탭 시 해당 유저 페이지 열기
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) {
          if (c.url.includes('.html') && 'focus' in c) return c.focus();
        }
        if (receiver) return clients.openWindow(`/${receiver}.html`);
      })
    );
  }
});
