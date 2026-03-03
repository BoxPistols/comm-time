/// <reference lib="webworker" />

/**
 * Comm Time Service Worker
 * - iOS PWA での通知サポート
 * - バックグラウンド復帰時のアラームスケジュール
 */

const SW_VERSION = "1.0.0";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * メインスレッドからのメッセージを受信して通知を表示
 */
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "SHOW_NOTIFICATION") {
    const { title, body, tag } = payload;
    event.waitUntil(
      self.registration.showNotification(title || "Comm Time", {
        body: body || "アラーム！",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: tag || "comm-time-alarm",
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
      })
    );
  }

  if (type === "SCHEDULE_ALARM") {
    // アラーム発火時刻をタイムスタンプで受け取り、時間が来たら通知
    const { fireAt, title, body, tag } = payload;
    const delay = fireAt - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(title || "Comm Time", {
          body: body || "タイムアップ！",
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: tag || "comm-time-scheduled",
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500],
        });
      }, delay);
    }
  }

  if (type === "CANCEL_NOTIFICATIONS") {
    event.waitUntil(
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach((n) => n.close());
      })
    );
  }
});

/**
 * 通知クリック時にアプリにフォーカス
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // 既存のウィンドウがあればフォーカス
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // なければ新しいウィンドウを開く
      return self.clients.openWindow("/");
    })
  );
});
