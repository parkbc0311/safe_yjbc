// functions/index.js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendHomeNotification = onDocumentCreated(
  "home_events/{docId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { from, to, latitude, longitude, mapsUrl, message } = snap.data();
    console.log(`🏠 귀가 알림: ${from} → ${to}`);

    const NOTIF_TITLES = {
      yj: ["🏃‍♀️ YJ가 집에 간대요!", "🏠 YJ 퇴근 완료!", "💨 YJ가 출발했어요!"],
      bc: ["🏃‍♂️ BC가 집에 간대요!", "🏠 BC 퇴근 완료!", "💨 BC가 출발했어요!"],
    };

    const titles = NOTIF_TITLES[from] || [`${from}가 집에 간대요!`];
    const title = titles[Math.floor(Math.random() * titles.length)];

    try {
      const db = getFirestore();
      const tokensSnap = await db.collection("receiver_tokens")
        .where("user", "==", to)
        .get();

      if (tokensSnap.empty) {
        console.log(`${to}의 FCM 토큰 없음`);
        return;
      }

      const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);

      const fcmMessage = {
        tokens,
        notification: {
          title,
          body: message || (latitude
            ? `📍 ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
            : "지금 출발했대요!"),
        },
        data: {
          from, to,
          latitude: String(latitude ?? ""),
          longitude: String(longitude ?? ""),
          mapsUrl: mapsUrl ?? `https://maps.google.com/?q=${latitude},${longitude}`,
          message: message ?? "",
        },
        webpush: {
          notification: {
            icon: "/icon-192.png",
            requireInteraction: false,
            vibrate: [200, 80, 200],
            actions: [
              { action: "open-map", title: "📍 위치 보기" },
              { action: "dismiss",  title: "확인 ✓" },
            ],
          },
          fcmOptions: { link: `/${to}.html` },
        },
      };

      const response = await getMessaging().sendEachForMulticast(fcmMessage);
      console.log(`성공: ${response.successCount} / 실패: ${response.failureCount}`);

      // 만료 토큰 정리
      const batch = db.batch();
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (code === "messaging/invalid-registration-token" ||
              code === "messaging/registration-token-not-registered") {
            batch.delete(tokensSnap.docs[idx].ref);
          }
        }
      });
      await batch.commit();
      await snap.ref.update({ status: "notified", notifiedAt: new Date() });

    } catch (err) {
      console.error("FCM 전송 오류:", err);
    }
  }
);
