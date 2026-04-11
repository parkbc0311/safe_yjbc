// functions/index.js
// 양방향 SOS - yj ↔ bc

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendSOSNotification = onDocumentCreated(
  "home_events/{docId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { from, to, latitude, longitude, mapsUrl, emergency } = snap.data();
    const isEmergency = emergency === true;
    console.log(`${isEmergency ? '🚨 긴급' : '🏠 귀가'}: ${from} → ${to}`);

    try {
      const db = getFirestore();

      const tokensSnap = await db.collection("receiver_tokens")
        .where("user", "==", to)
        .get();

      if (tokensSnap.empty) {
        console.log(`수신자 ${to}의 등록 토큰 없음`);
        return;
      }

      const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
      const fromLabel = from === "yj" ? "연주" : "병철이";
      const addressText = snap.data().address
        ? `${snap.data().address} 근처`
        : (latitude ? `위치: ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}` : "집에 가는 중이에요");

      // 긴급 vs 일반 제목/내용 분기
      const notifTitle = isEmergency
        ? `🚨🚨 긴급!! ${fromLabel}에게 무슨 일이 생겼나봐요!!`
        : (from === "yj" ? `🏃‍♀️ 연주가 집에 간대요!` : `🏃‍♂️ 병철이가 집에 간대요!`);
      const notifBody = isEmergency
        ? `얼른 전화해보세요!! 📍 ${addressText}`
        : addressText;

      const message = {
        tokens,
        data: {
          sender: from,
          receiver: to,
          latitude: String(latitude ?? ""),
          longitude: String(longitude ?? ""),
          mapsUrl: mapsUrl ?? `https://maps.google.com/?q=${latitude},${longitude}`,
          address: snap.data().address ?? "",
          emergency: String(isEmergency),   // ← 서비스워커로 전달
          title: notifTitle,
          body: notifBody,
        },
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`성공: ${response.successCount}, 실패: ${response.failureCount}`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error("FCM 실패", {
            token: tokens[idx],
            code: resp.error?.code,
            message: resp.error?.message,
          });
        }
      });

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
      await snap.ref.update({
        status: "notified",
        notifiedAt: new Date(),
        expireAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

    } catch (err) {
      console.error("FCM 전송 오류:", err);
    }
  }
);

exports.cleanupExpiredHomeEvents = onSchedule("every 1 hours", async (event) => {
  const db = getFirestore();
  const now = new Date();
  const q = db.collection("home_events")
    .where("timestamp", "<=", new Date(Date.now() - 12 * 60 * 60 * 1000))
    .limit(100);

  let snapshot = await q.get();
  let deleted = 0;
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.docs.length;
    snapshot = await q.get();
  }

  console.log(`cleanupExpiredHomeEvents: deleted ${deleted} expired home_events docs`);
});
