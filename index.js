// functions/index.js
// 양방향 SOS - yj ↔ bc

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendSOSNotification = onDocumentCreated(
  "home_events/{docId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { from, to, latitude, longitude, mapsUrl } = snap.data();
    console.log(`SOS: ${from} → ${to}`, { latitude, longitude });

    try {
      const db = getFirestore();

      // 수신자(to)의 FCM 토큰 조회
      const tokensSnap = await db.collection("receiver_tokens")
        .where("user", "==", to)
        .get();

      if (tokensSnap.empty) {
        console.log(`수신자 ${to}의 등록 토큰 없음`);
        return;
      }

      const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
      const fromLabel = from === "yj" ? "YJ" : "BC";
      const emoji = from === "yj" ? "🤍" : "💛";

      const message = {
        tokens,
        notification: {
          title: `${emoji} ${fromLabel}가 호출했어요!`,
          body: latitude
            ? `위치: ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
            : "긴급 호출이 도착했습니다",
        },
        data: {
          from,
          to,
          latitude: String(latitude ?? ""),
          longitude: String(longitude ?? ""),
          mapsUrl: mapsUrl ?? `https://maps.google.com/?q=${latitude},${longitude}`,
        },
        webpush: {
          notification: {
            icon: "/icon-192.png",
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            actions: [
              { action: "open-map", title: "📍 지도 보기" },
              { action: "dismiss",  title: "확인" },
            ],
          },
          fcmOptions: {
            link: `/${to}.html`,
          },
        },
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`성공: ${response.successCount}, 실패: ${response.failureCount}`);

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
